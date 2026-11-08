import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
try{const env=await readFile(path.join(root,'.env'),'utf8');for(const line of env.split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}catch{}
const PORT=Number(process.env.PORT||4173);
const DATA_KEY=process.env.DATA_GO_KR_SERVICE_KEY;
const REB_KEY=process.env.REB_API_KEY;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(Buffer.isBuffer(body)?body:(typeof body==='string'?body:JSON.stringify(body)))}
function tag(xml,key){const re=new RegExp(`<${key}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${key}>`,'i');const hit=xml.match(re);return hit?hit[1].replace(/^<!\[CDATA\[|\]\]>$/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim():''}
function parseItems(xml){return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>{const o={};for(const k of ['dealAmount','buildingArea','landArea','floor','dealYear','dealMonth','dealDay','umdNm','jibun','houseType','buildYear','dealType'])o[k]=tag(m[1],k);return o})}
function jsonRows(json){for(const value of Object.values(json||{})){if(!Array.isArray(value))continue;for(const group of value){if(group&&Array.isArray(group.row))return group.row;if(group&&Array.isArray(group.data))return group.data}}return []}
function monthsBack(count){const result=[];const now=new Date();for(let i=0;i<count;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);result.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`)}return result.reverse()}
async function fetchHouseMonth(month){
  const base='https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade';
  const params=new URLSearchParams({serviceKey:DATA_KEY,LAWD_CD:'41192',DEAL_YMD:month,pageNo:'1',numOfRows:'1000'});
  const response=await fetch(`${base}?${params}`,{signal:AbortSignal.timeout(15000)});
  const xml=await response.text();if(!response.ok)throw new Error(`국토부 API 응답 오류 (${response.status})`);
  if(/<resultCode>[^0]/.test(xml))throw new Error(`국토부 API 응답: ${tag(xml,'resultCode')} ${tag(xml,'resultMsg')}`);
  return parseItems(xml).filter(x=>['춘의동','도당동','원미동'].includes(x.umdNm)).map(x=>({...x,month}));
}
async function houseSales(url,res){
  if(!DATA_KEY){send(res,503,{error:'DATA_GO_KR_SERVICE_KEY가 .env에 설정되지 않았습니다.'});return}
  const count=Math.max(1,Math.min(24,Number(url.searchParams.get('months')||12)));
  const periods=monthsBack(count);let items=[];let failures=0;
  const chunks=[];for(let i=0;i<periods.length;i+=4)chunks.push(periods.slice(i,i+4));
  try{for(const chunk of chunks){const settled=await Promise.allSettled(chunk.map(fetchHouseMonth));for(const item of settled){if(item.status==='fulfilled')items.push(...item.value);else failures++}}}
  catch{send(res,502,{error:'국토교통부 단독·다가구 실거래 API에 연결할 수 없습니다.'});return}
  items.sort((a,b)=>(b.dealYear+b.dealMonth+b.dealDay).localeCompare(a.dealYear+a.dealMonth+a.dealDay));
  send(res,200,{items,fromMonth:periods[0],toMonth:periods.at(-1),months:count,source:'국토교통부 단독·다가구 매매 실거래',partial:failures>0,failedMonths:failures});
}
async function rebCatalog(res){
  const endpoint='https://www.reb.or.kr/r-one/openapi/SttsApiTbl.do';
  const params=new URLSearchParams({Type:'json',pIndex:'1',pSize:'1000'});if(REB_KEY)params.set('KEY',REB_KEY);
  let response;try{response=await fetch(`${endpoint}?${params}`,{signal:AbortSignal.timeout(15000)})}catch{send(res,502,{error:'한국부동산원 R-ONE에 연결할 수 없습니다.'});return}
  if(!response.ok){send(res,502,{error:`R-ONE API 응답 오류 (${response.status})`});return}
  let json;try{json=await response.json()}catch{send(res,502,{error:'R-ONE API 응답을 읽을 수 없습니다.'});return}
  const rootData=Object.values(json||{}).find(Array.isArray)||[];
  const head=rootData.find(x=>x&&Array.isArray(x.head))?.head||[];
  const rows=jsonRows(json);
  const result=head.find(x=>x.RESULT)?.RESULT;
  if(result&&result.CODE!=='INFO-000'){send(res,502,{error:`R-ONE API: ${result.CODE} ${result.MESSAGE}`});return}
  const total=head.find(x=>x.list_total_count)?.list_total_count||rows.length;
  const tables=rows.filter(x=>/지가변동률|임대동향|상업용부동산/.test(x.STATBL_NM||''));
  let landRows=[];
  try{
    const dataParams=new URLSearchParams({STATBL_ID:'A_2024_00903',DTACYCLE_CD:'MM',ITM_ID:'100001',START_WRTTIME:String(new Date().getFullYear()-1),pIndex:'1',pSize:'10000',Type:'json'});if(REB_KEY)dataParams.set('KEY',REB_KEY);
    const dataResponse=await fetch(`https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do?${dataParams}`,{signal:AbortSignal.timeout(15000)});
    if(dataResponse.ok){const dataJson=await dataResponse.json();landRows=jsonRows(dataJson).filter(x=>/부천/.test(`${x.CLS_NM||''} ${x.CLS_FULLNM||''}`));}
  }catch{}
  send(res,200,{tables,total,landRows,authenticated:Boolean(REB_KEY),source:'한국부동산원 R-ONE Open API',asOf:new Date().toISOString()});
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/house-sales'&&req.method==='GET'){await houseSales(url,res);return}
  if(url.pathname==='/api/reb/catalog'&&req.method==='GET'){await rebCatalog(res);return}
  if(url.pathname.startsWith('/api/')){send(res,404,{error:'지원하지 않는 API입니다.'});return}
  let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';
  const resolved=path.resolve(root,`.${pathname}`);if(!resolved.startsWith(root+path.sep)){send(res,403,{error:'허용되지 않은 경로입니다.'});return}
  try{const data=await readFile(resolved);send(res,200,data,MIME[path.extname(resolved)]||'application/octet-stream')}catch{send(res,404,'Not found','text/plain; charset=utf-8')}
});
server.listen(PORT,()=>console.log(`Wonmi low-rise investment briefing ready at http://localhost:${PORT}`));


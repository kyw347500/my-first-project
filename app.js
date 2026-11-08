const $ = s => document.querySelector(s);
const locations = [
  {name:'춘의역 · 7호선',lat:37.5037,lng:126.7872,type:'transit',icon:'7'},
  {name:'부천종합운동장역 · 7호선',lat:37.5056,lng:126.7972,type:'transit',icon:'7'},
  {name:'부천역 · 1호선 환승',lat:37.4844,lng:126.7827,type:'transit',icon:'1'},
  {name:'광명역 · KTX (원거리 환승)',lat:37.4163,lng:126.8841,type:'ktx',icon:'K'},
  {name:'부천북초등학교',lat:37.4950,lng:126.7818,type:'school',icon:'초'},
  {name:'도당초등학교',lat:37.5187,lng:126.7884,type:'school',icon:'초'},
  {name:'도당중학교',lat:37.5200,lng:126.7860,type:'school',icon:'중'},
  {name:'도당고등학교',lat:37.5192,lng:126.7922,type:'school',icon:'고'},
  {name:'원미중학교',lat:37.4941,lng:126.7871,type:'school',icon:'중'},
  {name:'부천북고등학교',lat:37.5220,lng:126.7865,type:'school',icon:'고'},
  {name:'춘의테크노파크 1·2차',lat:37.5091,lng:126.7877,type:'industrial',icon:'산'},
  {name:'춘의테크노타워 · 원미동',lat:37.4973,lng:126.7895,type:'industrial',icon:'산'},
  {name:'도당동 제조·조명 산업권',lat:37.5190,lng:126.7990,type:'industrial',icon:'산'},
  {name:'원미구청',lat:37.4936,lng:126.7824,type:'public',icon:'공'},
  {name:'춘의동 행정복지센터',lat:37.5020,lng:126.7860,type:'public',icon:'공'},
  {name:'도당동 행정복지센터',lat:37.5208,lng:126.7861,type:'public',icon:'공'},
  {name:'부천종합운동장',lat:37.5059,lng:126.7978,type:'public',icon:'공'},
  {name:'도당시장·근린상권',lat:37.5160,lng:126.7890,type:'commerce',icon:'상'},
  {name:'원미종합시장',lat:37.4938,lng:126.7838,type:'commerce',icon:'상'},
  {name:'현대백화점 중동점',lat:37.5045,lng:126.7621,type:'commerce',icon:'백'},
  {name:'이마트 중동점',lat:37.5032,lng:126.7658,type:'commerce',icon:'M'},
  {name:'춘의역 음식점·카페 상권',lat:37.5033,lng:126.7846,type:'commerce',icon:'C'},
  {name:'원미동 노후 저층주거 밀집권(개략)',lat:37.4926,lng:126.7861,type:'old'},
  {name:'춘의동 노후 저층주거 밀집권(개략)',lat:37.5062,lng:126.7795,type:'old'},
  {name:'도당동 노후 저층주거 밀집권(개략)',lat:37.5149,lng:126.7842,type:'old'}
];
let map;
function makeIcon(item){return L.divIcon({className:'',html:`<span class="custom-map-icon ${item.type}">${item.icon||''}</span>`,iconSize:[24,24],iconAnchor:[12,12]})}
function initMap(){
  if(!window.L){$('#map').innerHTML='<div class="map-unavailable">지도를 불러오지 못했습니다.<br>인터넷 연결을 확인해 주세요.</div>';return}
  map=L.map('map',{scrollWheelZoom:false,preferCanvas:true,zoomControl:true}).setView([37.5063,126.7868],14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri — Sources: Esri, TomTom, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community'}).addTo(map);
  L.polyline([[37.5037,126.7872],[37.5056,126.7972]],{color:'#3977b8',weight:6,opacity:.9,lineCap:'round'}).addTo(map);
  L.circleMarker([37.5037,126.7872],{radius:6,color:'#fff',weight:2,fillColor:'#3977b8',fillOpacity:1}).addTo(map);
  L.circleMarker([37.5056,126.7972],{radius:6,color:'#fff',weight:2,fillColor:'#3977b8',fillOpacity:1}).addTo(map);
  const zones=[
    [[37.4908,126.7811],[37.4907,126.7886],[37.4953,126.7893],[37.4962,126.7842],[37.4941,126.7793]],
    [[37.5027,126.7770],[37.5028,126.7818],[37.5094,126.7822],[37.5102,126.7782],[37.5073,126.7757]],
    [[37.5120,126.7822],[37.5121,126.7872],[37.5185,126.7888],[37.5201,126.7841],[37.5162,126.7813]]
  ];
  const zoneNames=['원미동 저층주거권역','춘의동 저층주거권역','도당동 저층주거권역'];
  const zoneCenters=[[37.4933,126.7842],[37.5064,126.7794],[37.5157,126.7849]];
  zones.forEach((coords,i)=>L.polygon(coords,{color:'#bd8b43',weight:2,opacity:.85,fillColor:'#d0a259',fillOpacity:.24,dashArray:'5 4'}).addTo(map));
  zoneNames.forEach((name,i)=>L.marker(zoneCenters[i],{interactive:false,icon:L.divIcon({className:'area-label-wrap',html:`<span class="area-label">${name}<small>개략</small></span>`,iconSize:[145,34],iconAnchor:[72,17]})}).addTo(map));
  locations.forEach(item=>{
    if(item.type==='old')return;
    const marker=L.marker([item.lat,item.lng],{icon:makeIcon(item),keyboard:false}).addTo(map);
    marker.bindTooltip(item.name,{sticky:true,direction:'top',offset:[0,-8],className:'poi-label',opacity:.95});
  });
  const localLocations=locations.filter(x=>x.type!=='ktx');
  const allCoordinates=[...localLocations.map(x=>[x.lat,x.lng]),...zones.flat()];
  map.fitBounds(L.latLngBounds(allCoordinates).pad(.08),{maxZoom:14});
  // KTX is deliberately not used to set the map extent; it is shown in the regional transport inventory outside this local map scale.
  map.whenReady(()=>setTimeout(()=>map.invalidateSize(),120));
}
function setDate(){const now=new Date();const date=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(now);$('#todayLabel').textContent=date;$('#asOfDate').textContent=date;}
function parseRows(json){
  const candidate=Object.values(json||{}).find(v=>Array.isArray(v));
  if(!candidate)return [];
  for(const entry of candidate){if(entry&&Array.isArray(entry.row))return entry.row;if(entry&&Array.isArray(entry.data))return entry.data;}
  return [];
}
async function loadHouseTrades(){
  const status=$('#houseApiStatus'),summary=$('#houseTradeSummary');
  try{
    const response=await fetch('/api/house-sales?months=12');const data=await response.json();
    if(!response.ok)throw new Error(data.error||'공공데이터 조회 실패');
    const rows=data.items||[];status.textContent=rows.length?'실거래 API 연결':'연결 · 거래자료 없음';
    const byDong={};for(const row of rows){const d=row.umdNm||'기타';byDong[d]=(byDong[d]||0)+1}
    const breakdown=Object.entries(byDong).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}건`).join(' · ');
    summary.textContent=rows.length?`최근 12개월 단독·다가구 매매 ${rows.length}건${breakdown?' · '+breakdown:''}`:`최근 12개월 해당 동 단독·다가구 거래자료 없음`;
    $('#houseApiInfo').textContent=`조회 기준월 ${data.fromMonth||''}~${data.toMonth||''}. 국토교통부 단독·다가구 매매 실거래 자료입니다. 아파트 거래는 제외했습니다.`;
  }catch(error){status.textContent='연결 확인 필요';summary.textContent=error.message||'API 응답을 확인할 수 없습니다.';}
}
async function loadReb(){
  const status=$('#rebApiStatus'),summary=$('#rebStatsSummary');
  try{
    const response=await fetch('/api/reb/catalog');const data=await response.json();
    if(!response.ok)throw new Error(data.error||'R-ONE 조회 실패');
    const tables=data.tables||[];status.textContent=data.authenticated?'인증 API 연결':'공개 샘플 모드';
    const useful=tables.filter(t=>/지가변동률|임대동향|상업용부동산/.test(t.STATBL_NM||''));
    const land=(data.landRows||[]).sort((a,b)=>String(b.WRTTIME_IDTFR_ID||'').localeCompare(String(a.WRTTIME_IDTFR_ID||'')))[0];
    const landLine=land?`${land.CLS_NM||land.CLS_FULLNM} 지가변동률 최신 ${land.DTA_VAL}${land.UI_NM||'%'} · ${land.WRTTIME_DESC||land.WRTTIME_IDTFR_ID}`:'부천시 지역 행 미제공 · 시군구 코드/공표범위 확인 필요';
    summary.textContent=`${landLine}${useful.length?` · 통계표 ${useful.slice(0,2).map(t=>t.STATBL_NM).join(' / ')}`:''}`;
    $('#rebApiInfo').textContent='한국부동산원 R-ONE 통계 카탈로그 연결됨. 지가변동률은 시·도/시군구 공표단위, 상업용 임대동향은 조사 상권 단위라 춘의·도당·원미 개별 골목의 직접 임대료로 해석할 수 없습니다.';
  }catch(error){status.textContent='연결 확인 필요';summary.textContent=error.message||'R-ONE API 응답을 확인할 수 없습니다.';}
}
function updateStatus(){
  Promise.allSettled([loadHouseTrades(),loadReb()]).then(()=>{
    const ok=[...document.querySelectorAll('.api-title span')].filter(x=>/연결/.test(x.textContent)).length;
    $('#dataStatus').textContent=ok?'공공 통계 연결 상태 확인됨':'자료 연결 확인 필요';
    $('#syncLabel').textContent=`국토부·한국부동산원 ${ok}/2 연결`;
    $('#apiBadge').textContent=`API ${ok}/2 연결`;
  });
}
function setup(){setDate();initMap();updateStatus();$('#printBriefing').addEventListener('click',()=>window.print());document.querySelectorAll('.side-nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.side-nav a').forEach(n=>n.classList.remove('active'));a.classList.add('active')}));}
document.addEventListener('DOMContentLoaded',setup);


const API_BASE = "https://www.tua.es/rest/estimaciones/";
const REFRESH_MS = 20000;
let catalog, selectedStop = null, refreshTimer = null, deferredPrompt = null;

const $ = (id) => document.getElementById(id);
const lineSelect = $("lineSelect"), directionSelect = $("directionSelect");
const stopSearch = $("stopSearch"), stopList = $("stopList");
const coverageNote = $("coverageNote"), results = $("results");
const busList = $("busList");

async function init(){
  try {
    const response = await fetch("./data/stops.json");
    if(!response.ok) throw new Error("No se pudo cargar el catálogo");
    catalog = await response.json();
    catalog.lines.forEach(line => {
      const option = document.createElement("option");
      option.value = line.code;
      option.textContent = `${line.code} · ${line.name}`;
      lineSelect.append(option);
    });
  } catch(error) {
    showToast("No se pudo cargar el catálogo de líneas.");
  }
  lineSelect.addEventListener("change", onLineChange);
  directionSelect.addEventListener("change", renderStops);
  stopSearch.addEventListener("input", renderStops);
  $("refreshBtn").addEventListener("click", () => selectedStop && loadEstimates(true));
  if("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
function onLineChange(){
  stopSearch.value = "";
  selectedStop = null;
  results.hidden = true;
  clearInterval(refreshTimer);
  const line = catalog.lines.find(item => item.code === lineSelect.value);
  directionSelect.innerHTML = '<option value="">Selecciona un sentido</option>';
  if(!line){ directionSelect.disabled = true; stopSearch.disabled = true; renderStops(); return; }
  line.directions.forEach(dir => {
    const option = document.createElement("option");
    option.value = dir.code;
    option.textContent = `${dir.code} · ${dir.label}`;
    directionSelect.append(option);
  });
  directionSelect.disabled = false;
  stopSearch.disabled = true;
  stopList.innerHTML = '<p class="hint">Selecciona el sentido para ver las paradas.</p>';
  coverageNote.hidden = true;
}
function renderStops(){
  const line = catalog.lines.find(item => item.code === lineSelect.value);
  const dir = line?.directions.find(item => item.code === directionSelect.value);
  stopList.innerHTML = "";
  if(!dir){ stopSearch.disabled = true; stopList.innerHTML = '<p class="hint">Selecciona una línea y un sentido para ver sus paradas.</p>'; coverageNote.hidden = true; return; }
  stopSearch.disabled = false;
  coverageNote.hidden = dir.complete;
  coverageNote.textContent = "Recorrido parcialmente cargado: pueden faltar paradas. Las que aparecen están identificadas en la ficha de TUA.";
  const query = stopSearch.value.trim().toLocaleLowerCase("es");
  const stops = dir.stops.filter(([id,name]) => String(id).includes(query) || name.toLocaleLowerCase("es").includes(query));
  if(!stops.length){
    stopList.innerHTML = `<p class="hint">${dir.stops.length ? "No hay coincidencias." : "Este sentido todavía no tiene paradas incorporadas al catálogo. Está pendiente de completar."}</p>`;
    return;
  }
  stops.forEach(([id,name]) => {
    const button = document.createElement("button");
    button.className = "stop-option" + (selectedStop?.id === id ? " active" : "");
    button.innerHTML = `<span class="stop-id">${id}</span><span class="stop-name"></span>`;
    button.querySelector(".stop-name").textContent = name;
    button.addEventListener("click", () => selectStop(id,name,dir.code));
    stopList.append(button);
  });
}
function selectStop(id,name,direction){
  selectedStop = {id,name,direction};
  $("selectedStopName").textContent = name;
  $("selectedStopMeta").textContent = `Parada ${id} · Línea ${direction}`;
  results.hidden = false;
  renderStops();
  loadEstimates();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => loadEstimates(), REFRESH_MS);
  results.scrollIntoView({behavior:"smooth",block:"start"});
}
async function loadEstimates(manual=false){
  if(!selectedStop) return;
  busList.innerHTML = '<div class="loading">Consultando estimaciones…</div>';
  try{
    const response = await fetch(API_BASE + encodeURIComponent(selectedStop.id), {cache:"no-store"});
    if(!response.ok) throw new Error(`Respuesta HTTP ${response.status}`);
    const payload = await response.json();
    const items = extractEstimates(payload);
    renderEstimates(items);
    $("lastUpdate").textContent = `Actualizado a las ${new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} · actualización automática cada 20 s`;
  }catch(error){
    busList.innerHTML = `<div class="empty-state"><strong>No se han podido consultar los tiempos.</strong><br>${escapeHtml(error.message)}<br><br>Puede que TUA esté temporalmente inaccesible o que su servidor no permita consultas directas desde esta web (CORS). En ese caso habrá que conectar un pequeño servicio intermedio.</div>`;
    $("lastUpdate").textContent = "Consulta no disponible";
  }
}
function extractEstimates(payload){
  let data = payload?.estimaciones?.value ?? payload?.estimaciones ?? payload?.value ?? payload;
  if(data && !Array.isArray(data) && typeof data === "object") data = Object.values(data);
  if(!Array.isArray(data)) return [];
  const out = [];
  data.forEach(item => {
    if(!item || typeof item !== "object") return;
    ["vh_first","vh_second","vh_third"].forEach(key => {
      const vh = item[key];
      if(vh && (Number.isFinite(Number(vh.seconds)) || vh.destino)){
        out.push({line:item.line || "", destination:vh.destino || "Destino no disponible", seconds:Number(vh.seconds), meters:Number(vh.meters)});
      }
    });
    if(item.seconds !== undefined) out.push({line:item.line || "",destination:item.destino || item.destination || "Destino no disponible",seconds:Number(item.seconds),meters:Number(item.meters)});
  });
  return out.sort((a,b)=>(Number.isFinite(a.seconds)?a.seconds:Infinity)-(Number.isFinite(b.seconds)?b.seconds:Infinity));
}
function renderEstimates(items){
  if(!items.length){
    busList.innerHTML = '<div class="empty-state">No hay estimaciones disponibles para esta parada en este momento. Puede que no haya vehículos próximos o que TUA no esté devolviendo datos.</div>';
    return;
  }
  busList.innerHTML = "";
  items.forEach(bus => {
    const minutes = Number.isFinite(bus.seconds) ? Math.max(0,Math.ceil(bus.seconds/60)) : null;
    const card = document.createElement("article");
    card.className = "bus-card";
    const left = document.createElement("div");
    const route = document.createElement("div"); route.className="bus-route"; route.textContent = bus.line ? `LÍNEA ${bus.line}` : "AUTOBÚS";
    const dest = document.createElement("div"); dest.className="bus-dest"; dest.textContent = bus.destination;
    left.append(route,dest);
    const right = document.createElement("div"); right.className="bus-time";
    const strong = document.createElement("strong"); strong.textContent = minutes === null ? "—" : (minutes === 0 ? "<1" : minutes);
    const label = document.createElement("span"); label.textContent = "minutos";
    right.append(strong,label);
    if(Number.isFinite(bus.meters)){const distance=document.createElement("div");distance.className="bus-distance";distance.textContent=`${Math.max(0,Math.round(bus.meters))} m`;right.append(distance);}
    card.append(left,right); busList.append(card);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showToast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}
window.addEventListener("beforeinstallprompt", event => {event.preventDefault();deferredPrompt=event;$("installBtn").hidden=false;});
$("installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").hidden=true;});
init();

/* ============================================================
   GPS EN VIVO: mide distancia, tiempo, ritmo y desnivel con el
   GPS del teléfono y al terminar deja el deporte listo para guardar.
   Funciona con la app ABIERTA y la pantalla encendida (los navegadores
   pausan el GPS de las páginas web con la pantalla apagada).
   ============================================================ */
const GPS_KEY = 'entreno_gps';
// deportes que se pueden medir con GPS (al aire libre)
const GPS_DEPS = [
  { dep: 'running', sub: null, n: 'Running / trote', ico: '👟', tope: 30 },
  { dep: 'trekking', sub: null, n: 'Trekking / cerro', ico: '🥾', tope: 15 },
  { dep: 'atletismo', sub: 'fondo', n: 'Atletismo · fondo', ico: '🏃', tope: 30 },
  { dep: 'atletismo', sub: 'marcha', n: 'Atletismo · marcha', ico: '🚶', tope: 18 },
  { dep: 'ciclismo', sub: 'ruta', n: 'Ciclismo · ruta', ico: '🚴', tope: 80 },
  { dep: 'ciclismo', sub: 'mtb', n: 'Ciclismo · MTB', ico: '🚵', tope: 60 },
  { dep: 'remo', sub: 'kayak', n: 'Kayak / bote', ico: '🚣', tope: 20 },
];
const gpsDepDe = (dep, sub) => GPS_DEPS.find((g) => g.dep === dep && (g.sub || null) === (sub || null)) || GPS_DEPS[0];
const gpsPuede = (dep, sub) => GPS_DEPS.some((g) => g.dep === dep && (g.sub || null) === (sub || null));

let GPS = null; // actividad en curso
let gpsWatch = null, gpsTick = null, gpsWake = null, gpsElige = { i: 0, meta: null, voz: true };

/* ---------- geometría ---------- */
function haversine(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const gpsMovido = () => (GPS ? (GPS.pausado ? GPS.pausadoDesde : Date.now()) - GPS.tIni - GPS.pausas : 0); // ms en movimiento
function gpsRitmoActual() {
  // últimos ~30 s de puntos aceptados
  const P = GPS.pts, n = P.length;
  if (n < 2) return null;
  const fin = P[n - 1];
  let i = n - 2;
  while (i > 0 && fin.t - P[i].t < 30000) i--;
  let d = 0;
  for (let k = i + 1; k < n; k++) d += P[k].d || 0;
  const s = (fin.t - P[i].t) / 1000;
  return d > 5 && s > 0 ? { v: (d / s) * 3.6, pace: s / (d / 1000) } : null;
}

/* ---------- voz y vibración ---------- */
function gpsHablar(txt) {
  try { navigator.vibrate?.([120, 80, 120]); } catch (e) { /* sin vibración */ }
  if (!GPS?.voz || !('speechSynthesis' in window)) return;
  try { const u = new SpeechSynthesisUtterance(txt); u.lang = 'es-CL'; u.rate = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* sin voz */ }
}
const ritmoHablado = (s) => { const m = Math.floor(s / 60), ss = Math.round(s % 60); return `${m} minutos${ss ? ` ${ss} segundos` : ''}`; };

/* ---------- pantalla encendida ---------- */
async function gpsDespierto(on) {
  try {
    if (on && 'wakeLock' in navigator && !gpsWake) { gpsWake = await navigator.wakeLock.request('screen'); gpsWake.addEventListener('release', () => (gpsWake = null)); }
    else if (!on && gpsWake) { await gpsWake.release(); gpsWake = null; }
  } catch (e) { /* no soportado */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && GPS && !GPS.pausado) gpsDespierto(true); });

/* ---------- guardar el estado (por si se recarga la app) ---------- */
function gpsGuardar() {
  if (!GPS) { try { localStorage.removeItem(GPS_KEY); } catch (e) { /* */ } return; }
  try {
    // ruta liviana: un punto cada ~10 m
    const ruta = [];
    for (const p of GPS.pts) { const u = ruta[ruta.length - 1]; if (!u || haversine(u, p) >= 10) ruta.push({ lat: p.lat, lon: p.lon, t: p.t }); }
    localStorage.setItem(GPS_KEY, JSON.stringify({ ...GPS, pts: GPS.pts.slice(-40), ruta: [...(GPS.rutaVieja || []), ...ruta].slice(-1500) }));
  } catch (e) { /* almacenamiento lleno */ }
}
function gpsPendiente() {
  try {
    const g = JSON.parse(localStorage.getItem(GPS_KEY) || 'null');
    return g && Date.now() - g.tIni < 12 * 3600 * 1000 ? g : null;
  } catch (e) { return null; }
}

/* ---------- ciclo de medición ---------- */
function gpsOnPos(pos) {
  if (!GPS || GPS.pausado) return;
  const c = pos.coords, p = { lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude, altAcc: c.altitudeAccuracy, t: pos.timestamp || Date.now() };
  GPS.acc = Math.round(c.accuracy);
  GPS.error = null; // la señal volvió
  if (c.accuracy > 30) { gpsPintar(); return; } // señal débil: se ignora el punto
  const u = GPS.pts[GPS.pts.length - 1];
  if (!u) { GPS.pts.push({ ...p, d: 0 }); GPS.listo = true; gpsPintar(); return; }
  const d = haversine(u, p), dt = (p.t - u.t) / 1000;
  if (d < Math.max(3, c.accuracy * 0.5)) return; // ruido del GPS parado
  if (dt > 0 && (d / dt) * 3.6 > gpsDepDe(GPS.dep, GPS.sub).tope) return; // salto imposible
  GPS.pts.push({ ...p, d });
  if (GPS.pts.length > 4000) { GPS.rutaVieja = [...(GPS.rutaVieja || []), ...GPS.pts.splice(0, 2000).filter((_, i) => i % 5 === 0)]; }
  GPS.dist += d;
  // desnivel positivo: altitud suavizada y umbral de 3 m (la altitud GPS es ruidosa)
  if (p.alt != null && (p.altAcc == null || p.altAcc <= 20)) {
    GPS.altS = GPS.altS == null ? p.alt : GPS.altS + 0.2 * (p.alt - GPS.altS);
    if (GPS.altBase == null) GPS.altBase = GPS.altS;
    if (GPS.altS - GPS.altBase > 3) { GPS.desn += GPS.altS - GPS.altBase; GPS.altBase = GPS.altS; } else if (GPS.altS < GPS.altBase) GPS.altBase = GPS.altS;
  }
  // parciales por kilómetro y aviso de meta
  const km = Math.floor(GPS.dist / 1000);
  if (km > GPS.splits.length) {
    const tAhora = gpsMovido(), tPrev = GPS.splits.reduce((a, s) => a + s, 0);
    GPS.splits.push(tAhora - tPrev);
    const esBici = GPS.dep === 'ciclismo';
    gpsHablar(`Kilómetro ${km}. ${esBici ? `Velocidad ${Math.round(3600000 / (tAhora - tPrev))} kilómetros por hora` : `Ritmo ${ritmoHablado((tAhora - tPrev) / 1000)}`}.`);
  }
  if (GPS.meta && !GPS.metaOk && GPS.dist >= GPS.meta * 1000) { GPS.metaOk = true; gpsHablar(`¡Llegaste a tu meta de ${String(GPS.meta).replace('.', ',')} kilómetros! Puedes terminar o seguir.`); }
  gpsPintar();
}
function gpsOnErr(err) {
  if (!GPS || (err.code === 3 && GPS.listo)) return; // demora momentánea: el GPS sigue escuchando
  GPS.error = err.code === 1 ? 'La app no tiene permiso para usar tu ubicación. Actívalo en los ajustes del navegador o del teléfono.' : 'No se pudo leer el GPS. Sal a un lugar abierto y espera unos segundos.';
  gpsPintar();
}
function gpsEscuchar() {
  if (gpsWatch != null) navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch = navigator.geolocation.watchPosition(gpsOnPos, gpsOnErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  clearInterval(gpsTick);
  let n = 0;
  gpsTick = setInterval(() => { gpsPintar(); if (++n % 5 === 0) gpsGuardar(); }, 1000);
  gpsDespierto(true);
}
function gpsParar() {
  if (gpsWatch != null) navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch = null; clearInterval(gpsTick); gpsTick = null;
  gpsDespierto(false);
}

/* ---------- vista ---------- */
function rutaSVG(pts, w = 320, h = 170) {
  if (!pts || pts.length < 2) return '';
  const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length, kx = Math.cos((lat0 * Math.PI) / 180);
  const xs = pts.map((p) => p.lon * kx), ys = pts.map((p) => -p.lat);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((w - 20) / Math.max(1e-9, x1 - x0), (h - 20) / Math.max(1e-9, y1 - y0));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const P = xs.map((x, i) => `${((x - x0) * s + ox).toFixed(1)} ${((ys[i] - y0) * s + oy).toFixed(1)}`);
  const [a, b] = [P[0].split(' '), P[P.length - 1].split(' ')];
  return `<svg class="ruta" viewBox="0 0 ${w} ${h}" aria-label="Recorrido"><path d="M${P.join(' L')}" fill="none" stroke="var(--acc)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${a[0]}" cy="${a[1]}" r="5" fill="var(--good, #2e9d00)"/><circle cx="${b[0]}" cy="${b[1]}" r="5" fill="var(--acc)" stroke="var(--bg2)" stroke-width="2"/></svg>`;
}
function vGps() {
  if (!('geolocation' in navigator)) return `${header('GPS en vivo', '#/hoy')}<section class="wrap"><div class="card"><p>Este navegador no permite usar el GPS. Registra el deporte a mano desde Hoy.</p></div></section>`;
  if (!GPS) {
    const pend = gpsPendiente();
    const g = GPS_DEPS[gpsElige.i];
    return `${header('GPS en vivo', '#/hoy')}<section class="wrap">
      ${pend ? `<div class="card warnc"><b>Tienes una actividad sin terminar</b><p class="small">${esc(gpsDepDe(pend.dep, pend.sub).n)} · ${fmtN(pend.dist / 1000, 2)} km · iniciada ${new Date(pend.tIni).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
        <div class="btns"><button class="btn small-btn primary" data-act="gpsretomar">Continuar</button><button class="btn small-btn" data-act="gpsfinpend">Terminar y guardar</button><button class="btn small-btn ghost" data-act="gpsdescartar">Descartar</button></div></div>` : ''}
      <div class="card"><h3>¿Qué vas a hacer?</h3><div class="dep-grid">${GPS_DEPS.map((d, i) => `<button class="dep-b ${i === gpsElige.i ? 'on' : ''}" data-act="gpsdep" data-i="${i}"><span>${d.ico}</span>${esc(d.n)}</button>`).join('')}</div>
        <span class="lbl">Meta de distancia (opcional)</span>
        <div class="chips dep-subs">${[null, 1, 3, 5, 10, 21.1].map((m) => `<button class="tab ${gpsElige.meta === m ? 'on' : ''}" data-act="gpsmeta" data-v="${m ?? ''}">${m == null ? 'Sin meta' : `${String(m).replace('.', ',')} km`}</button>`).join('')}</div>
        <label class="chkl"><input type="checkbox" id="gpsvoz" ${gpsElige.voz ? 'checked' : ''}> Avisos por voz en cada kilómetro y al llegar a la meta</label>
        <button class="btn primary big" data-act="gpsini">▶ Iniciar ${esc(g.n.toLowerCase())}</button>
        <div class="hint">📱 <b>Deja la app abierta y la pantalla encendida</b> durante la actividad (la app evita que se apague sola). Si bloqueas el teléfono o cambias de app, el navegador pausa el GPS y esa parte del recorrido se mide en línea recta. Con audífonos escuchas los avisos.</div>
        <p class="small muted">Precisión típica del GPS: 3-10 m. Bajo árboles densos, túneles o entre edificios altos puede medir de menos. Tu ubicación se usa solo en este teléfono: no se envía a ningún servidor.</p></div>
    </section>`;
  }
  return `${header('GPS en vivo')}<section class="wrap gps"><div id="gpsbox">${gpsPanel()}</div></section>`;
}
function gpsPanel() {
  const g = gpsDepDe(GPS.dep, GPS.sub), ms = gpsMovido(), km = GPS.dist / 1000, esBici = GPS.dep === 'ciclismo' || GPS.dep === 'remo';
  const ra = gpsRitmoActual(), prom = km > 0.02 ? ms / 1000 / km : null;
  const ritmoTxt = (pace, v) => (esBici ? (v ? `${fmtN(v, 1)}` : '—') : pace ? fmtTiempo(pace) : '—');
  const pct = GPS.meta ? Math.min(100, (km / GPS.meta) * 100) : null;
  const senal = GPS.error ? `<div class="hint warn">${GPS.error}</div>` : !GPS.listo ? '<div class="hint">📡 Buscando señal GPS… sal a un lugar abierto.</div>' : '';
  return `${senal}
    <div class="gps-top"><span>${g.ico} ${esc(g.n)}</span><span class="gps-acc ${GPS.acc > 20 ? 'mala' : ''}">${GPS.pausado ? '⏸ En pausa' : GPS.listo ? `📡 ±${GPS.acc || '?'} m` : '📡 …'}</span></div>
    <div class="gps-big"><b>${fmtTiempo(ms / 1000)}</b><span>tiempo</span></div>
    <div class="gps-grid">
      <div><b>${fmtN(km, 2)}</b><span>km</span></div>
      <div><b>${ritmoTxt(ra?.pace, ra?.v)}</b><span>${esBici ? 'km/h actual' : 'ritmo actual /km'}</span></div>
      <div><b>${esBici ? (prom ? fmtN(3600 / prom, 1) : '—') : prom ? fmtTiempo(prom) : '—'}</b><span>${esBici ? 'km/h promedio' : 'ritmo prom. /km'}</span></div>
      <div><b>${Math.round(GPS.desn)}</b><span>m de subida</span></div>
    </div>
    ${pct != null ? `<div class="gps-meta"><span class="small">Meta ${String(GPS.meta).replace('.', ',')} km · faltan ${fmtN(Math.max(0, GPS.meta - km), 2)} km</span><div class="pbar"><i style="width:${pct}%"></i></div></div>` : ''}
    <div class="btns gps-btns">${GPS.pausado ? '<button class="btn primary big" data-act="gpsreanudar">▶ Reanudar</button>' : '<button class="btn big" data-act="gpspausa">⏸ Pausar</button>'}<button class="btn danger big" data-act="gpsfin">■ Terminar</button></div>
    ${rutaSVG([...(GPS.rutaVieja || []), ...GPS.pts])}
    ${GPS.splits.length ? `<h4>Parciales</h4><ul class="plist">${GPS.splits.map((s, i) => `<li><span>Km ${i + 1}</span><b>${esBici ? `${fmtN(3600000 / s, 1)} km/h` : `${fmtTiempo(s / 1000)} /km`}</b></li>`).join('')}</ul>` : ''}
    <p class="small muted center">Mantén la pantalla encendida y la app abierta.</p>`;
}
function gpsPintar() {
  const box = document.getElementById('gpsbox');
  if (box && GPS) box.innerHTML = gpsPanel();
  const ban = document.getElementById('gpsbanner');
  if (ban && GPS) ban.querySelector('b').textContent = `${fmtN(GPS.dist / 1000, 2)} km · ${fmtTiempo(gpsMovido() / 1000)}`;
}
// aviso flotante si se navega a otra pantalla durante la actividad
function gpsBannerHTML() {
  return GPS ? `<a id="gpsbanner" class="gps-banner" href="#/gps">🔴 Actividad en curso · <b>${fmtN(GPS.dist / 1000, 2)} km · ${fmtTiempo(gpsMovido() / 1000)}</b> ›</a>` : '';
}
// tarjeta en Hoy si quedó una actividad sin terminar (app recargada)
function gpsPendienteHTML() {
  if (GPS) return '';
  const p = gpsPendiente();
  return p ? `<a class="card row-link nuevo" href="#/gps"><span>📍</span><div class="grow"><b>Actividad GPS sin terminar</b><span class="small muted">${esc(gpsDepDe(p.dep, p.sub).n)} · ${fmtN(p.dist / 1000, 2)} km: continúa o guárdala</span></div>›</a>` : '';
}

/* ---------- terminar: deja el registro listo para confirmar ---------- */
function gpsTerminar(g) {
  const ms = (g.pausado ? g.pausadoDesde : g.ultimo || Date.now()) - g.tIni - g.pausas;
  const pts = [...(g.ruta || g.rutaVieja || []), ...(g.ruta ? [] : g.pts)];
  const ruta = [];
  const paso = Math.max(1, Math.ceil(pts.length / 300));
  for (let i = 0; i < pts.length; i += paso) ruta.push([+pts[i].lat.toFixed(5), +pts[i].lon.toFixed(5)]);
  const sp = depSpec({ dep: g.dep, sub: g.sub });
  depDraft = {
    dep: g.dep, sub: g.sub, int: 2, fecha: iso(new Date(g.tIni)), dolor: {}, nota: 'Medido con GPS', estilo: null, prueba: null,
    km: sp.unidad === 'm' ? '' : String(Math.round(g.dist / 10) / 100).replace('.', ','), m: sp.unidad === 'm' ? String(Math.round(g.dist)) : '',
    tiempo: fmtTiempo(Math.max(0, ms) / 1000), desn: g.desn >= 5 ? String(Math.round(g.desn)) : '', ruta, gps: true,
  };
  GPS = null; gpsGuardar();
  location.hash = '#/hoy';
  setTimeout(() => { renderDeporte(); toast('Revisa los datos, marca cómo te sentiste y guarda'); }, 150);
}
const accionesGps = {
  gpsabrir() { location.hash = '#/gps'; },
  gpsdep(btn) { gpsElige.i = +btn.dataset.i; rerender(); },
  gpsmeta(btn) { gpsElige.meta = btn.dataset.v ? +btn.dataset.v : null; rerender(); },
  gpsini() {
    gpsElige.voz = !!$('#gpsvoz')?.checked;
    const g = GPS_DEPS[gpsElige.i];
    GPS = { dep: g.dep, sub: g.sub, meta: gpsElige.meta, voz: gpsElige.voz, tIni: Date.now(), pausas: 0, pausado: false, pts: [], dist: 0, desn: 0, splits: [], acc: null, listo: false };
    gpsHablar(`Comenzamos. ${g.n}.`);
    gpsEscuchar();
    rerender();
  },
  gpspausa() { if (!GPS) return; GPS.pausado = true; GPS.pausadoDesde = Date.now(); gpsDespierto(false); gpsGuardar(); gpsPintar(); },
  gpsreanudar() {
    if (!GPS) return;
    GPS.pausas += Date.now() - GPS.pausadoDesde; GPS.pausado = false;
    const u = GPS.pts[GPS.pts.length - 1]; if (u) u.t = Date.now(); // no contar el tramo en pausa
    gpsDespierto(true); gpsPintar();
  },
  gpsfin() {
    if (!GPS) return;
    if (GPS.dist < 50 && !confirm('Llevas menos de 50 m. ¿Terminar igual?')) return;
    if (!confirm('¿Terminar la actividad?')) return;
    gpsParar();
    GPS.ultimo = Date.now();
    gpsHablar(`Terminaste. ${fmtN(GPS.dist / 1000, 2).replace(',', ' coma ')} kilómetros.`);
    gpsTerminar(GPS);
  },
  gpsretomar() {
    const p = gpsPendiente();
    if (!p) return;
    const ult = p.pts[p.pts.length - 1];
    GPS = { ...p, rutaVieja: p.ruta || [], pts: ult ? [{ ...ult, t: Date.now() }] : [], pausado: false };
    // el tiempo con la app cerrada cuenta como pausa
    GPS.pausas += Date.now() - (ult?.t || (p.pausadoDesde || Date.now()));
    delete GPS.ruta;
    gpsEscuchar(); rerender();
  },
  gpsfinpend() { const p = gpsPendiente(); if (p) { p.ultimo = p.pts[p.pts.length - 1]?.t || Date.now(); gpsTerminar(p); } },
  gpsdescartar() { if (confirm('¿Descartar esta actividad?')) { localStorage.removeItem(GPS_KEY); rerender(); } },
};

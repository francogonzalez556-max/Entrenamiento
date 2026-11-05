/* ============================================================
   App de entrenamiento — lógica principal
   ============================================================ */
const KEY = 'entreno_v1';
const DOW_SID = { 2: 'A', 3: 'B', 4: 'C', 5: 'D' };
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ---------- Estado ---------- */
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [], ...s };
  } catch (e) { /* sin almacenamiento */ }
  return { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [] };
}
let S = load();
let saveT;
function save(now) {
  clearTimeout(saveT);
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar (almacenamiento lleno o bloqueado)'); } };
  now ? w() : (saveT = setTimeout(w, 300));
}

/* ---------- Fechas ---------- */
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => iso(new Date());
const fmt = (s, withDay) => { const d = parse(s); return `${withDay ? DIAS[d.getDay()] + ' ' : ''}${d.getDate()} ${MESES[d.getMonth()]}`; };
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);

function weekStart() { return iso(mondayOf(parse(S.perfil.inicio))); }
function weekInfo(dateStr) {
  const days = dayDiff(weekStart(), dateStr);
  const week = Math.max(1, Math.floor(days / 7) + 1);
  const wk = ((week - 1) % 12) + 1;
  const ciclo = Math.floor((week - 1) / 12) + 1;
  const phase = wk <= 4 ? 1 : wk <= 8 ? 2 : 3;
  return { week, wk, ciclo, phase, deload: wk === 4 || wk === 8, antes: days < 0 };
}
function dateOf(week, dow) { return iso(addDays(parse(weekStart()), (week - 1) * 7 + ((dow + 6) % 7))); }

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => {
  if (v === '' || v == null) return null;
  const n = +String(v).trim().replace(',', '.');
  return isNaN(n) ? null : n;
};
const fmtN = (n, dec = 1) => (n == null ? '' : Number(n).toLocaleString('es-CL', { maximumFractionDigits: dec }));
const fmtMin = (m) => {
  if (!m) return '0 min';
  const mm = Math.floor(m), ss = Math.round((m - mm) * 60);
  return ss ? `${mm} min ${ss} s` : `${mm} min`;
};
const r1 = (n) => Math.round(n * 10) / 10;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function rango(reps) {
  const m = String(reps).match(/(\d+)\s*-\s*(\d+)/);
  if (m) return [+m[1], +m[2]];
  const n = String(reps).match(/(\d+)/);
  return n ? [+n[1], +n[1]] : [0, 0];
}
const usaPeso = (ex) => !!ex.step;
const esTiempo = (ex) => ex.tipo === 'tiempo';

function pesoActual() {
  const p = [...S.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return p.length ? p[p.length - 1].kg : S.perfil.peso;
}
function fcZonas() {
  const max = Math.round(208 - 0.7 * S.perfil.edad);
  return { max, z2: [Math.round(max * 0.6), Math.round(max * 0.7)], fuerte: [Math.round(max * 0.8), Math.round(max * 0.88)] };
}
function objetivos() {
  const p = S.perfil, kg = pesoActual();
  const bmr = 10 * kg + 6.25 * p.estatura - 5 * p.edad + (p.sexo === 'M' ? 5 : -161);
  const tdee = bmr * 1.4;
  const kcal = Math.max(Math.round((tdee * 0.8) / 50) * 50, p.sexo === 'M' ? 1800 : 1400);
  const meta = (p.metaMin + p.metaMax) / 2;
  const prot = Math.round((meta * 1.8) / 5) * 5;
  const grasa = Math.round((meta * 0.7) / 5) * 5;
  const carb = Math.round((kcal - prot * 4 - grasa * 9) / 4 / 5) * 5;
  return { kg, bmr: Math.round(bmr), tdee: Math.round(tdee / 10) * 10, kcal, prot, grasa, carb, agua: Math.min(3.5, r1(kg * 0.03)) };
}

/* ---------- Caminatas ---------- */
const sumar = (arr, k) => arr.reduce((a, c) => a + (num(c[k]) || 0), 0);
function addCaminata(d) {
  S.caminatas.push({ id: Date.now(), fecha: d.fecha || today(), km: num(d.km), pasos: num(d.pasos) });
  save(true);
}
// Minutos estimados (para el total de cardio): a ~5 km/h son 12 min por km, o ~100 pasos por minuto
const minCaminata = (c) => num(c.min) || (num(c.km) ? Math.round(c.km * 12) : Math.round((num(c.pasos) || 0) / 100));
const minCaminatas = (arr) => arr.reduce((a, c) => a + minCaminata(c), 0);
function resumenCam(arr) {
  const km = r1(sumar(arr, 'km')), pasos = sumar(arr, 'pasos');
  return [pasos ? `${pasos.toLocaleString('es-CL')} pasos` : '', km ? `${String(km).replace('.', ',')} km` : ''].filter(Boolean).join(' · ');
}

/* ---------- Ejercicios propios y rutinas ---------- */
function getEj(id) {
  if (EJERCICIOS[id]) return EJERCICIOS[id];
  const x = S.ejPropios.find((e) => e.id === id);
  if (!x) return { nombre: 'Ejercicio eliminado', musculos: '', equipo: '', tipo: 'fuerza', step: 0, pasos: [], errores: [], rodilla: '', yt: '', propio: true };
  return { nombre: x.nombre, musculos: 'Ejercicio propio', equipo: '', tipo: x.tiempo ? 'tiempo' : 'fuerza', step: x.peso ? 2 : 0, pasos: [], errores: [], rodilla: '', yt: x.nombre + ' técnica', propio: true };
}
const getRutina = (sid) => (sid && sid.startsWith('R-') ? S.rutinas.find((r) => 'R-' + r.id === sid) : null);
function getSes(sid) {
  if (SESIONES[sid]) return SESIONES[sid];
  const r = getRutina(sid);
  return r ? { nombre: r.nombre, foco: 'Rutina personalizada', dur: '', rutina: r } : null;
}
const nombreSes = (l) => getSes(l.sid)?.nombre || l.nombre || 'Sesión';

/* ---------- Sesiones ---------- */
function itemsDe(sid, wi) {
  const out = [];
  const rut = getRutina(sid);
  if (rut) {
    if (rut.calent) out.push({ k: 'warm', corto: false });
    for (const e of rut.ejercicios) {
      const reps = String(e.reps || '10').trim();
      out.push({ k: 'ex', id: e.id, sets: Math.max(1, num(e.sets) || 3), reps: esTiempo(getEj(e.id)) && /^\d+(\s*-\s*\d+)?$/.test(reps) ? reps + ' s' : reps, rest: num(e.rest) || 60 });
    }
    if (num(rut.cardio)) out.push({ k: 'cardio', key: 'libre', rx: { titulo: `Elíptica · ${num(rut.cardio)} min`, min: num(rut.cardio), detalle: 'Ritmo a elección (zona 2 recomendada).', zona: 'z2' } });
    return out;
  }
  for (const b of SESIONES[sid].bloques) {
    if (b.tipo === 'calentamiento') out.push({ k: 'warm', corto: !!b.corto });
    else if (b.tipo === 'ej') {
      const r = b.rx[wi.phase - 1];
      if (r) out.push({ k: 'ex', id: b.id, sets: wi.deload ? Math.max(2, r[0] - 1) : r[0], reps: r[1], rest: r[2] });
    } else if (b.tipo === 'cardio') out.push({ k: 'cardio', key: b.kind, rx: cardioRx(b.kind, wi.wk) });
    else if (b.tipo === 'circuito') {
      const i = wi.phase - 1;
      const rondas = wi.deload ? b.rondas[i] - 1 : b.rondas[i];
      out.push({ k: 'circ', rondas, trabajo: b.trabajo[i], pausa: b.pausa[i], entre: b.entreRondas[i] });
      for (const e of b.ejercicios) {
        if (e.fases.includes(wi.phase)) out.push({ k: 'ex', id: e.id, sets: rondas, reps: b.trabajo[i], rest: b.pausa[i], circ: true });
      }
    }
  }
  return out;
}
const logKey = (date, sid) => `${date}|${sid}`;
function getLog(date, sid, create) {
  const k = logKey(date, sid);
  if (!S.logs[k] && create) {
    const wi = weekInfo(date);
    S.logs[k] = { sid, nombre: getSes(sid)?.nombre, fecha: date, week: wi.week, phase: wi.phase, ex: {}, cardio: {}, warm: false, rpe: 6, rodilla: 0, notas: '', done: false };
  }
  return S.logs[k];
}
const logsOrdenados = () => Object.values(S.logs).sort((a, b) => a.fecha.localeCompare(b.fecha));
function ultimaVez(id, antesDe) {
  const L = logsOrdenados().filter((l) => l.fecha < antesDe && l.ex[id] && l.ex[id].sets.some((s) => s.ok));
  return L.length ? { fecha: L[L.length - 1].fecha, sets: L[L.length - 1].ex[id].sets.filter((s) => s.ok) } : null;
}
function sugerencia(id, it, last) {
  const ex = getEj(id);
  const [lo, hi] = rango(it.reps);
  if (!last) {
    return { w: null, txt: usaPeso(ex) ? 'Primera vez: elige un peso con el que podrías hacer 2-3 repeticiones más al terminar.' : 'Primera vez: concéntrate en la técnica.' };
  }
  const w = Math.max(0, ...last.sets.map((s) => num(s.w) || 0)) || null;
  const todas = last.sets.length >= Math.min(it.sets, 2) && last.sets.every((s) => (num(s.r) || 0) >= hi);
  if (todas) {
    if (usaPeso(ex) && w) {
      const nw = w + ex.step;
      return { w: nw, txt: `¡Completaste todo la última vez! Prueba con ${nw} kg.${ex.nota ? ' ' + ex.nota : ''}`, up: true };
    }
    return { w, txt: ex.nota || (esTiempo(ex) ? 'Completaste todo: suma 5-10 s.' : 'Completaste todo: suma 1-2 reps o hazlo más lento.'), up: true };
  }
  if (last.sets.some((s) => (num(s.r) || 0) < lo)) return { w, txt: 'Mantén el peso y busca completar el rango.' };
  return { w, txt: esTiempo(ex) ? 'Mismo peso: intenta sumar unos segundos.' : 'Mismo peso: intenta sumar 1 rep por serie.' };
}
function doneEnSemana(week, sid) {
  return Object.values(S.logs).some((l) => l.sid === sid && l.done && l.week === week);
}

/* ---------- Temporizador de descanso ---------- */
const timer = { end: 0, iv: null };
let audioCtx;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((d) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d + 0.2);
      o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 0.22);
    });
  } catch (e) { /* sin audio */ }
}
function startTimer(sec) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch (e) { /* sin audio */ }
  timer.end = Date.now() + sec * 1000;
  timer.total = sec;
  $('#timer').classList.add('show');
  clearInterval(timer.iv);
  tick();
  timer.iv = setInterval(tick, 250);
}
function tick() {
  const left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  $('#timer-t').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
  $('#timer-bar').style.width = `${(left / timer.total) * 100}%`;
  if (left <= 0) {
    clearInterval(timer.iv);
    $('#timer-t').textContent = '¡Vamos!';
    navigator.vibrate?.([200, 100, 200]);
    beep();
    setTimeout(() => $('#timer').classList.remove('show'), 1800);
  }
}
function stopTimer() { clearInterval(timer.iv); $('#timer').classList.remove('show'); }

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* no soportado */ }
}

/* ---------- Gráficos SVG ---------- */
function chartLine(pts, o = {}) {
  if (pts.length < 1) return `<p class="muted small">Aún no hay datos. ${o.vacio || ''}</p>`;
  const W = 340, H = o.h || 170, P = { l: 34, r: 10, t: 12, b: 24 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let y0 = Math.min(...ys, ...(o.band || [])), y1 = Math.max(...ys, ...(o.band || []));
  if (o.yMin !== undefined) y0 = o.yMin;
  if (o.yMax !== undefined) y1 = o.yMax;
  if (y1 - y0 < 1) { y0 -= 1; y1 += 1; }
  const pad_ = (y1 - y0) * 0.08;
  if (o.yMin === undefined) y0 -= pad_;
  if (o.yMax === undefined) y1 += pad_;
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x1 === x0) { x0 -= 864e5 * 3; x1 += 864e5 * 3; }
  const X = (x) => P.l + ((x - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (y) => H - P.b - ((y - y0) / (y1 - y0)) * (H - P.t - P.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.label || 'gráfico')}">`;
  for (let i = 0; i <= 3; i++) {
    const v = y0 + ((y1 - y0) * i) / 3, y = Y(v);
    s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/><text x="${P.l - 5}" y="${y + 3.5}" class="axis" text-anchor="end">${o.dec ? r1(v) : Math.round(v)}</text>`;
  }
  if (o.band) s += `<rect x="${P.l}" width="${W - P.l - P.r}" y="${Y(o.band[1])}" height="${Y(o.band[0]) - Y(o.band[1])}" class="band"/>`;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  s += `<path d="${d}" class="line"/>`;
  pts.forEach((p) => (s += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.2" class="dot"><title>${esc(p.t || '')} ${p.y}</title></circle>`));
  const dl = (x) => { const d_ = new Date(x); return `${d_.getDate()} ${MESES[d_.getMonth()]}`; };
  s += `<text x="${P.l}" y="${H - 6}" class="axis">${dl(x0)}</text><text x="${W - P.r}" y="${H - 6}" class="axis" text-anchor="end">${dl(x1)}</text>`;
  return s + '</svg>';
}
function chartBars(labels, vals, o = {}) {
  const W = 340, H = o.h || 150, P = { l: 30, r: 6, t: 14, b: 22 };
  const tot = vals.map((v, i) => v + ((o.stack && o.stack[i]) || 0));
  const mx = Math.max(o.min || 1, ...tot);
  const bw = (W - P.l - P.r) / vals.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.label || 'gráfico')}">`;
  for (let i = 0; i <= 2; i++) {
    const v = (mx * i) / 2, y = H - P.b - (v / mx) * (H - P.t - P.b);
    s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/><text x="${P.l - 4}" y="${y + 3.5}" class="axis" text-anchor="end">${Math.round(v)}</text>`;
  }
  if (o.goal) { const gy = H - P.b - (o.goal / mx) * (H - P.t - P.b); s += `<line x1="${P.l}" x2="${W - P.r}" y1="${gy}" y2="${gy}" class="goal"/>`; }
  vals.forEach((v, i) => {
    const h = (v / mx) * (H - P.t - P.b), x = P.l + i * bw + bw * 0.18, y = H - P.b - h;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="3" class="${o.hl === i ? 'bar hl' : 'bar'}"/>`;
    const v2 = (o.stack && o.stack[i]) || 0, h2 = (v2 / mx) * (H - P.t - P.b);
    if (v2) s += `<rect x="${x.toFixed(1)}" y="${(y - h2).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${h2.toFixed(1)}" rx="3" class="bar2"/>`;
    if (tot[i] && !o.noVal) s += `<text x="${(x + bw * 0.32).toFixed(1)}" y="${(y - h2 - 3).toFixed(1)}" class="axis" text-anchor="middle">${o.dec ? r1(tot[i]) : Math.round(tot[i])}</text>`;
    s += `<text x="${(x + bw * 0.32).toFixed(1)}" y="${H - 7}" class="axis" text-anchor="middle">${labels[i]}</text>`;
  });
  return s + '</svg>';
}

/* ============================================================
   VISTAS
   ============================================================ */
let stops = [];
let planOffset = 0;
let ejSel = null;

function header(title, back) {
  return `<header class="top">${back ? `<a href="${back}" class="back" aria-label="Volver">‹</a>` : ''}<h1>${title}</h1></header>`;
}

/* ---- Onboarding / perfil ---- */
function vPerfil(first) {
  const p = S.perfil || {};
  let inicio = p.inicio;
  if (!inicio) {
    const d = new Date();
    const add = (2 - d.getDay() + 7) % 7; // próximo martes (o hoy si es martes)
    inicio = iso(add > 3 ? d : addDays(d, add));
  }
  return `${first ? '' : header('Mi perfil', '#/mas')}
  <section class="wrap">
    ${first ? `<div class="hero"><div class="hero-ico">💪</div><h1>Tu plan de entrenamiento</h1><p>Completa tus datos para calcular calorías, zonas de pulso y armar tu calendario. Todo queda guardado solo en este teléfono.</p></div>` : ''}
    <form id="fperfil" class="card form">
      <div class="row2">
        <label>Edad<input name="edad" type="number" inputmode="numeric" required min="14" max="99" value="${p.edad ?? ''}"></label>
        <label>Sexo<select name="sexo"><option value="M" ${p.sexo !== 'F' ? 'selected' : ''}>Hombre</option><option value="F" ${p.sexo === 'F' ? 'selected' : ''}>Mujer</option></select></label>
      </div>
      <div class="row2">
        <label>Estatura (cm)<input name="estatura" type="number" inputmode="numeric" required min="120" max="230" value="${p.estatura ?? ''}"></label>
        <label>Peso inicial (kg)<input name="peso" type="text" inputmode="decimal" required min="35" max="300" value="${p.peso ?? ''}"></label>
      </div>
      <div class="row2">
        <label>Meta desde (kg)<input name="metaMin" type="text" inputmode="decimal" required value="${p.metaMin ?? ''}"></label>
        <label>Meta hasta (kg)<input name="metaMax" type="text" inputmode="decimal" required value="${p.metaMax ?? ''}"></label>
      </div>
      <label>Fecha de inicio del plan<input name="inicio" type="date" required value="${inicio}"></label>
      <p class="muted small">La semana 1 empieza el lunes de la semana de inicio. Entrenas martes, miércoles, jueves y viernes.</p>
      <button class="btn primary big" type="submit">${first ? 'Crear mi plan' : 'Guardar'}</button>
    </form>
  </section>`;
}

/* ---- HOY ---- */
function vHoy() {
  const t = today(), wi = weekInfo(t), dow = new Date().getDay();
  const sid = DOW_SID[dow];
  const fz = fcZonas();
  const kg = pesoActual(), p = S.perfil;
  const perd = r1(p.peso - kg);
  const totalDone = Object.values(S.logs).filter((l) => l.done).length;
  const ultPeso = [...S.pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const pedirPeso = !ultPeso || dayDiff(ultPeso.fecha, t) >= 7;
  const semana = wi.antes ? 1 : wi.week;
  const camHoy = S.caminatas.filter((c) => c.fecha === t);
  const totHoy = totales(diaComidas(t));
  const diasResp = S.ultimoRespaldo ? dayDiff(S.ultimoRespaldo, t) : null;
  const pedirResp = Object.keys(S.logs).length + Object.keys(S.comidas).length > 0 && (diasResp === null || diasResp >= 7);

  let main;
  if (wi.antes) {
    main = `<div class="card accent"><h2>Tu plan empieza el ${fmt(p.inicio, true)}</h2><p>Mientras tanto: camina 20-30 min en plano y revisa la técnica de los ejercicios en <a href="#/mas">Más → Ejercicios</a>.</p></div>`;
  } else if (sid) {
    const ses = SESIONES[sid], lg = getLog(t, sid);
    const st = lg?.done ? 'done' : lg ? 'prog' : 'new';
    main = `<div class="card today ${st}">
      <div class="tag">${st === 'done' ? '✓ Completada' : st === 'prog' ? 'En curso' : 'Hoy toca'}</div>
      <h2>${ses.nombre}</h2><p class="muted">${ses.foco} · ${ses.dur}</p>
      <a class="btn primary big" href="#/sesion/${t}/${sid}">${st === 'done' ? 'Ver sesión' : st === 'prog' ? 'Continuar' : 'Empezar entrenamiento'}</a>
    </div>`;
  } else {
    const next = [2, 3, 4, 5].map((d) => (d - dow + 7) % 7 || 7).sort((a, b) => a - b)[0];
    const nd = addDays(new Date(), next);
    main = `<div class="card rest"><div class="tag">Descanso</div><h2>Hoy recuperas 😌</h2>
      <p>El músculo se construye descansando. Opcional: <b>caminata de 20-40 min en plano</b> o movilidad suave.</p>
      <p class="muted">Próxima sesión: <b>${DIAS[nd.getDay()]}</b> · ${SESIONES[DOW_SID[nd.getDay()]].nombre}</p></div>`;
  }

  const dots = ['A', 'B', 'C', 'D'].map((s) => {
    const d = dateOf(semana, SESIONES[s].dow);
    const ok = doneEnSemana(semana, s);
    return `<a class="wd ${ok ? 'ok' : ''} ${d === t ? 'now' : ''}" href="#/sesion/${d <= t ? t : d}/${s}"><b>${DIAS[SESIONES[s].dow].slice(0, 3)}</b><span>${ok ? '✓' : SESIONES[s].nombre.split(' ')[0]}</span></a>`;
  }).join('');

  return `${header(`Hola 👋`)}
  <section class="wrap">
    <div class="weekline"><span class="pill">Semana ${wi.antes ? 0 : wi.wk}${wi.ciclo > 1 ? ` · ciclo ${wi.ciclo}` : ''} de 12</span><span class="pill soft">Fase ${wi.phase}: ${FASES[wi.phase - 1].nombre}</span>${wi.deload ? '<span class="pill warn">Semana de descarga</span>' : ''}</div>
    ${main}
    <div class="card"><h3>Esta semana</h3><div class="weekdots">${dots}</div>
      <p class="muted small">¿Te saltaste una? Tócala para hacerla hoy.</p></div>
    ${S.rutinas.length ? `<div class="card"><h3>🧩 Mis rutinas</h3>${S.rutinas.map((r) => `<a class="rrow" href="#/sesion/${t}/R-${r.id}"><div class="grow"><b>${esc(r.nombre)}</b><span class="small muted">${r.ejercicios.length} ejercicios${num(r.cardio) ? ` · elíptica ${num(r.cardio)} min` : ''}${getLog(t, 'R-' + r.id)?.done ? ' · ✓ hecha hoy' : ''}</span></div><span class="btn small-btn">Empezar</span></a>`).join('')}</div>` : ''}
    ${pedirResp ? `<div class="card warnc"><b>💾 Respalda tus datos</b><p class="small">${diasResp === null ? 'Aún no has exportado un respaldo.' : `Tu último respaldo fue hace ${diasResp} días.`} Guárdalo en iCloud o WhatsApp por si cambias o pierdes el teléfono.</p><button class="btn small-btn" data-act="export">Exportar ahora</button></div>` : ''}
    <div class="card"><h3>🚶 Caminata</h3>
      ${camHoy.length ? `<p class="small good"><b>Hoy:</b> ${resumenCam(camHoy)}</p>` : ''}
      <form id="fcamina" class="inline"><input name="pasos" type="number" inputmode="numeric" placeholder="pasos" aria-label="Pasos"><input name="km" type="text" inputmode="decimal" placeholder="km" aria-label="Distancia en km"><button class="btn primary" aria-label="Guardar caminata">+</button></form>
      <p class="small muted">Copia los datos de la app Fitness o Salud del iPhone. Esta semana: ${resumenCam(S.caminatas.filter((c) => weekInfo(c.fecha).week === semana)) || 'sin caminatas aún'}.</p></div>
    <a class="card row-link" href="#/comida"><span>🍽️</span><div class="grow"><b>Comida de hoy</b><span class="small muted">${Math.round(totHoy.k).toLocaleString('es-CL')} de ${objetivos().kcal.toLocaleString('es-CL')} kcal · ${Math.round(totHoy.pr)} g proteína</span></div>›</a>
    ${pedirPeso && !wi.antes ? `<div class="card"><h3>⚖️ Registro semanal de peso</h3><form id="fpesoHoy" class="inline"><input name="kg" type="text" inputmode="decimal" placeholder="kg en ayunas" required><input name="cintura" type="text" inputmode="decimal" placeholder="cintura cm"><button class="btn primary">Guardar</button></form></div>` : ''}
    <div class="stats">
      <div><b>${fmtN(kg)}</b><span>kg actual</span></div>
      <div><b class="${perd > 0 ? 'good' : ''}">${perd > 0 ? '−' : ''}${fmtN(Math.abs(perd))}</b><span>kg ${perd >= 0 ? 'perdidos' : 'ganados'}</span></div>
      <div><b>${totalDone}</b><span>sesiones</span></div>
    </div>
    <div class="card small-card"><h3>❤️ Tus zonas de pulso</h3>
      <p><b>Zona 2 (suave):</b> ${fz.z2[0]}–${fz.z2[1]} lpm · puedes hablar en frases.<br><b>Fuerte (intervalos):</b> ${fz.fuerte[0]}–${fz.fuerte[1]} lpm · hablar cuesta.<br><span class="muted small">FC máx. estimada: ${fz.max} lpm. Si la elíptica no mide pulso, guíate por la conversación.</span></p></div>
  </section>`;
}

/* ---- SESIÓN ---- */
function vSesion(date, sid) {
  const ses = getSes(sid);
  if (!ses) return vHoy();
  const wi = weekInfo(date);
  const items = itemsDe(sid, wi);
  const lg = getLog(date, sid, false);
  const fz = fcZonas();
  let html = `${header(ses.nombre, '#/hoy')}<section class="wrap ses">
    <p class="muted center">${fmt(date, true)} · Semana ${wi.wk} · Fase ${wi.phase}${wi.deload ? ' · <b>descarga</b> (1 serie menos, pesos cómodos)' : ''}</p>
    <div class="hint">Toca <b>✓</b> al terminar cada serie: se guarda y parte el descanso. Si dejas el peso/reps vacíos se usan los sugeridos.</div>`;

  for (const it of items) {
    if (it.k === 'warm') {
      const list = CALENTAMIENTO[it.corto ? 'corto' : 'normal'];
      html += `<div class="card blk ${lg?.warm ? 'done' : ''}" id="warm"><div class="blk-h"><h3>🔥 Calentamiento</h3><button class="chk ${lg?.warm ? 'on' : ''}" data-act="warm" aria-label="Marcar calentamiento">✓</button></div><ul class="ticks">${list.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
    } else if (it.k === 'circ') {
      html += `<div class="card circ"><h3>⚡ Circuito · ${it.rondas} rondas</h3><p>Haz los ejercicios <b>seguidos</b>: ${it.trabajo} de trabajo y ${it.pausa} s de pausa entre ejercicios. Descansa <b>${it.entre} s</b> al terminar cada ronda. Anota el peso y las reps (o segundos) que lograste en cada ronda.</p></div>`;
    } else if (it.k === 'cardio') {
      const c = lg?.cardio?.[it.key] || {};
      const zona = it.rx.zona === 'int' ? `Suave: ${fz.z2[0]}–${fz.z2[1]} lpm · Fuerte: ${fz.fuerte[0]}–${fz.fuerte[1]} lpm` : `Zona 2: ${fz.z2[0]}–${fz.z2[1]} lpm`;
      html += `<div class="card blk cardio ${c.ok ? 'done' : ''}" data-ck="${it.key}">
        <div class="blk-h"><div class="thumb" data-act="tech" data-id="eliptica">${Fig.still(ANIMS.eliptica, 0)}</div><div class="grow"><h3>${it.rx.titulo}</h3><p class="small">${it.rx.detalle}</p><p class="small zona">${zona}</p></div>
        <button class="chk ${c.ok ? 'on' : ''}" data-act="cardiook" data-key="${it.key}" aria-label="Marcar cardio">✓</button></div>
        <div class="tech" id="tech-eliptica-${it.key}"></div>
        <div class="cgrid">
          <label>Minutos<input type="text" inputmode="numeric" data-c="tmin" data-key="${it.key}" value="${c.min != null ? Math.floor(c.min) : ''}" placeholder="${it.rx.min}"></label>
          <label>Segundos<input type="text" inputmode="numeric" data-c="tseg" data-key="${it.key}" value="${c.min != null ? Math.round((c.min - Math.floor(c.min)) * 60) || '' : ''}" placeholder="00"></label>
          <label>Nivel<input type="number" inputmode="numeric" data-c="nivel" data-key="${it.key}" value="${c.nivel ?? ''}" placeholder="resist."></label>
          <label>RPM prom.<input type="number" inputmode="numeric" data-c="rpm" data-key="${it.key}" value="${c.rpm ?? ''}" placeholder="60"></label>
          <label>Pulso prom.<input type="number" inputmode="numeric" data-c="fc" data-key="${it.key}" value="${c.fc ?? ''}" placeholder="lpm"></label>
          <label>Distancia<input type="text" inputmode="decimal" data-c="km" data-key="${it.key}" value="${c.km ?? ''}" placeholder="km"></label>
          <label>Calorías<input type="number" inputmode="numeric" data-c="kcal" data-key="${it.key}" value="${c.kcal ?? ''}" placeholder="kcal"></label>
        </div></div>`;
    } else {
      const ex = getEj(it.id);
      const last = ultimaVez(it.id, date);
      const sug = sugerencia(it.id, it, last);
      const sets = lg?.ex?.[it.id]?.sets || [];
      const n = Math.max(it.sets, sets.length);
      const [, hi] = rango(it.reps);
      const allOk = sets.length >= it.sets && sets.slice(0, it.sets).every((s) => s.ok);
      const lastTxt = last ? `Última vez (${fmt(last.fecha)}): ${last.sets.map((s) => (num(s.w) ? `${s.w}kg×` : '') + (s.r || '?')).join(' · ')}` : '';
      let rows = '';
      for (let i = 0; i < n; i++) {
        const s = sets[i] || {};
        rows += `<div class="set ${s.ok ? 'ok' : ''}" data-ex="${it.id}" data-i="${i}" data-rest="${it.rest}">
          <span class="sn">${i + 1}</span>
          ${usaPeso(ex) ? `<input type="text" inputmode="decimal" data-f="w" value="${s.w ?? ''}" placeholder="${sug.w ?? '–'}" aria-label="kg serie ${i + 1}"><span class="u">kg</span>` : ''}
          <input type="number" inputmode="numeric" data-f="r" value="${s.r ?? ''}" placeholder="${hi || ''}" aria-label="${esTiempo(ex) ? 'segundos' : 'reps'} serie ${i + 1}"><span class="u">${esTiempo(ex) ? 's' : 'reps'}</span>
          <button class="chk ${s.ok ? 'on' : ''}" data-act="setok" aria-label="Serie ${i + 1} lista">✓</button>
        </div>`;
      }
      html += `<div class="card blk ex ${allOk ? 'done' : ''} ${it.circ ? 'incirc' : ''}" data-exc="${it.id}" data-sets="${it.sets}">
        <div class="blk-h"><div class="thumb" data-act="tech" data-id="${it.id}">${Fig.still(ANIMS[it.id]) || '<div class="noanim">🏋️</div>'}</div>
          <div class="grow"><h3>${esc(ex.nombre)}</h3><p class="rx">${it.circ ? `${it.sets} rondas × ${it.reps}` : `${it.sets} × ${it.reps}${ex.porLado ? ' por lado' : ''} · descanso ${it.rest} s`}</p>
          <button class="link" data-act="tech" data-id="${it.id}">▶ Ver técnica</button></div></div>
        <div class="tech" id="tech-${it.id}"></div>
        ${lastTxt ? `<p class="last">${esc(lastTxt)}</p>` : ''}
        <p class="sug ${sug.up ? 'up' : ''}">${sug.up ? '⬆️ ' : '💡 '}${sug.txt}</p>
        <div class="sets">${rows}</div>
        <button class="link small" data-act="addset" data-id="${it.id}">+ agregar serie</button>
      </div>`;
    }
  }
  const rpeTxt = ['', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Algo duro', 'Duro', 'Muy duro', 'Durísimo', 'Máximo'];
  html += `<div class="card fin">
    <h3>Cierre de la sesión</h3>
    <label>¿Qué tan duro fue? <b id="rpeV">${lg?.rpe ?? 6} · ${rpeTxt[lg?.rpe ?? 6]}</b><input type="range" min="1" max="10" data-fin="rpe" value="${lg?.rpe ?? 6}"></label>
    <label>Dolor de rodilla (0 = nada, 10 = máximo) <b id="rodV">${lg?.rodilla ?? 0}</b><input type="range" min="0" max="10" data-fin="rodilla" value="${lg?.rodilla ?? 0}"></label>
    <p class="small muted">Regla: hasta 3/10 durante el ejercicio es aceptable si al día siguiente no está peor. Si pasa de 3, reduce rango o peso.</p>
    <label>Notas<textarea data-fin="notas" rows="2" placeholder="¿Cómo te sentiste? ¿Algo molestó?">${esc(lg?.notas || '')}</textarea></label>
    <button class="btn primary big" data-act="finish">${lg?.done ? 'Guardar cambios' : 'Terminar sesión ✓'}</button>
  </div></section>`;
  return html;
}

/* ---- PLAN ---- */
function vPlan() {
  const t = today(), wiT = weekInfo(t);
  const cur = wiT.antes ? 1 : wiT.week;
  const week = Math.max(1, cur + planOffset);
  const wi = weekInfo(dateOf(week, 1));
  const fases = FASES.map((f) => `<div class="fase ${f.n === wi.phase ? 'on' : ''}"><b>Fase ${f.n} · ${f.nombre}</b><span class="muted small">Semanas ${f.semanas}</span><p class="small">${f.desc}</p></div>`).join('');
  const dias = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const d = dateOf(week, dow), sid = DOW_SID[dow];
    if (!sid) {
      return `<div class="pday rest ${d === t ? 'now' : ''}"><div class="pd"><b>${DIAS[dow].slice(0, 3)}</b><span>${fmt(d)}</span></div><div class="grow muted small">${dow === 1 ? 'Descanso total' : 'Descanso activo: caminata 20-40 min en plano (regístrala en Hoy)'}</div></div>`;
    }
    const ses = SESIONES[sid], ok = doneEnSemana(week, sid);
    const its = itemsDe(sid, wi);
    const cardio = its.filter((x) => x.k === 'cardio').map((x) => x.rx.titulo).join(' + ');
    const nEj = its.filter((x) => x.k === 'ex').length;
    return `<a class="pday ${ok ? 'ok' : ''} ${d === t ? 'now' : ''}" href="#/sesion/${d}/${sid}"><div class="pd"><b>${DIAS[dow].slice(0, 3)}</b><span>${fmt(d)}</span></div>
      <div class="grow"><b>${ses.nombre}</b><span class="small muted">${nEj} ejercicios · ${cardio}</span></div><span class="st">${ok ? '✓' : '›'}</span></a>`;
  }).join('');
  return `${header('Plan')}<section class="wrap">
    <div class="weeknav"><button class="btn ghost" data-act="pw" data-d="-1" ${week <= 1 ? 'disabled' : ''}>‹</button><div><b>Semana ${wi.wk}</b>${wi.ciclo > 1 ? ` <span class="small">(ciclo ${wi.ciclo})</span>` : ''}<span class="small muted">${fmt(dateOf(week, 1))} – ${fmt(dateOf(week, 0))}${week === cur ? ' · actual' : ''}</span></div><button class="btn ghost" data-act="pw" data-d="1">›</button></div>
    ${wi.deload ? '<div class="hint warn">Semana de descarga: 1 serie menos por ejercicio y pesos cómodos. Recupera para volver más fuerte.</div>' : ''}
    <div class="card pweek">${dias}</div>
    <h2 class="sec">Las 3 fases</h2>${fases}
    <a class="card row-link" href="#/rutinas"><span>🧩</span><div class="grow"><b>Rutinas personalizadas</b><span class="small muted">Crea las tuyas y hazlas cualquier día</span></div>›</a>
    <div class="card small-card"><h3>Cómo progresar</h3><p class="small">Usa <b>doble progresión</b>: cuando completes todas las series en el máximo del rango (ej. 3×15), sube el peso en la próxima sesión y vuelve al mínimo del rango. La app te avisa con ⬆️. En la elíptica, los minutos suben automáticamente cada semana.</p></div>
  </section>`;
}

/* ---- PROGRESO ---- */
function vProgreso() {
  const p = S.perfil, t = today();
  const pesos = [...S.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const kg = pesoActual();
  const perd = r1(p.peso - kg);
  const faltan = r1(kg - p.metaMax);
  const imc = r1(kg / Math.pow(p.estatura / 100, 2));
  let ritmo = '';
  const rec = pesos.filter((x) => dayDiff(x.fecha, t) <= 35);
  if (rec.length >= 2) {
    const d = dayDiff(rec[0].fecha, rec[rec.length - 1].fecha);
    if (d >= 7) ritmo = r1(((rec[rec.length - 1].kg - rec[0].kg) / d) * 7);
  }
  const ptsPeso = pesos.map((x) => ({ x: +parse(x.fecha), y: x.kg, t: fmt(x.fecha) }));
  const ptsCint = pesos.filter((x) => x.cintura).map((x) => ({ x: +parse(x.fecha), y: x.cintura, t: fmt(x.fecha) }));

  const wi = weekInfo(t), cur = wi.antes ? 1 : wi.week;
  const desde = Math.max(1, cur - 9);
  const semanas = [], minutos = [], minCam = [], kmCam = [], pasosCam = [];
  for (let w = desde; w <= cur; w++) {
    semanas.push('S' + (((w - 1) % 12) + 1));
    minutos.push(Object.values(S.logs).filter((l) => l.week === w).reduce((s, l) => s + Object.values(l.cardio || {}).reduce((a, c) => a + (num(c.min) || 0), 0), 0));
    const cw = S.caminatas.filter((c) => weekInfo(c.fecha).week === w);
    minCam.push(minCaminatas(cw));
    kmCam.push(r1(sumar(cw, 'km')));
    pasosCam.push(sumar(cw, 'pasos'));
  }
  let grid = '';
  for (let w = Math.max(1, cur - 11); w <= cur; w++) {
    grid += `<div class="grow-row"><span class="small muted">S${((w - 1) % 12) + 1}</span>${['A', 'B', 'C', 'D'].map((s) => `<i class="${doneEnSemana(w, s) ? 'on' : dateOf(w, SESIONES[s].dow) < t ? 'miss' : ''}" title="${SESIONES[s].nombre}"></i>`).join('')}</div>`;
  }
  const L = logsOrdenados();
  const conEj = [...Object.keys(EJERCICIOS), ...S.ejPropios.map((e) => e.id)].filter((id) => L.some((l) => l.ex[id]?.sets.some((s) => s.ok)));
  if (!ejSel || !conEj.includes(ejSel)) ejSel = conEj[0] || null;
  let ejChart = '<p class="muted small">Cuando registres series aparecerá aquí tu progreso por ejercicio.</p>';
  if (ejSel) {
    const ex = getEj(ejSel);
    const conPeso = usaPeso(ex) && L.some((l) => l.ex[ejSel]?.sets.some((s) => s.ok && num(s.w)));
    const pts = L.filter((l) => l.ex[ejSel]?.sets.some((s) => s.ok)).map((l) => {
      const ok = l.ex[ejSel].sets.filter((s) => s.ok);
      return { x: +parse(l.fecha), y: conPeso ? Math.max(...ok.map((s) => num(s.w) || 0)) : Math.max(...ok.map((s) => num(s.r) || 0)), t: fmt(l.fecha) };
    });
    const best = Math.max(...pts.map((x) => x.y));
    ejChart = `<select data-act-change="ejsel">${conEj.map((id) => `<option value="${id}" ${id === ejSel ? 'selected' : ''}>${esc(getEj(id).nombre)}</option>`).join('')}</select>
      <p class="small muted">${conPeso ? 'Peso máximo por sesión (kg)' : esTiempo(ex) ? 'Mejor tiempo (s)' : 'Máximo de reps'} · récord: <b>${best}</b></p>${chartLine(pts, { label: 'progreso ejercicio', dec: true })}`;
  }
  const rod = L.filter((l) => l.done).map((l) => ({ x: +parse(l.fecha), y: l.rodilla || 0, t: fmt(l.fecha) }));
  const totalMin = Object.values(S.logs).reduce((s, l) => s + Object.values(l.cardio || {}).reduce((a, c) => a + (num(c.min) || 0), 0), 0) + minCaminatas(S.caminatas);
  const cams = [...S.caminatas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const vol = Object.values(S.logs).reduce((s, l) => s + Object.values(l.ex || {}).reduce((a, e) => a + e.sets.filter((x) => x.ok).reduce((b, x) => b + (num(x.w) || 0) * (num(x.r) || 0), 0), 0), 0);

  return `${header('Progreso')}<section class="wrap">
    <div class="stats">
      <div><b class="${perd > 0 ? 'good' : ''}">${perd > 0 ? '−' : ''}${fmtN(Math.abs(perd))}</b><span>kg desde el inicio</span></div>
      <div><b>${faltan > 0 ? fmtN(faltan) : '🎯'}</b><span>${faltan > 0 ? `kg para ${p.metaMax}` : '¡meta lograda!'}</span></div>
      <div><b>${ritmo === '' ? '—' : fmtN(ritmo)}</b><span>kg/semana (últ. 5 sem)</span></div>
    </div>
    <div class="card"><h3>⚖️ Peso corporal</h3>
      <form id="fpeso" class="inline"><input name="fecha" type="date" value="${t}" required><input name="kg" type="text" inputmode="decimal" placeholder="kg" required><input name="cintura" type="text" inputmode="decimal" placeholder="cintura"><button class="btn primary">+</button></form>
      ${chartLine(ptsPeso, { band: [p.metaMin, p.metaMax], label: 'peso', dec: true, vacio: 'Registra tu peso semanal.' })}
      <p class="small muted">Franja verde = tu meta (${p.metaMin}–${p.metaMax} kg). IMC actual: ${fmtN(imc)}. Ritmo saludable: −0,5 a −1 kg por semana.</p>
      ${ptsCint.length ? `<h4>Cintura (cm)</h4>${chartLine(ptsCint, { label: 'cintura', dec: true, h: 130 })}` : ''}
      <details><summary class="small">Ver registros</summary><ul class="plist">${[...pesos].reverse().map((x) => `<li><span>${fmt(x.fecha)}</span><b>${fmtN(x.kg)} kg</b><span class="muted">${x.cintura ? fmtN(x.cintura) + ' cm' : ''}</span><button class="link danger" data-act="delpeso" data-f="${x.fecha}" aria-label="Eliminar">✕</button></li>`).join('')}</ul></details>
    </div>
    <div class="card"><h3>📅 Constancia</h3><div class="cgrid2"><div class="grow-row head"><span></span><b>Ma</b><b>Mi</b><b>Ju</b><b>Vi</b></div>${grid}</div></div>
    <div class="card"><h3>🫀 Minutos de cardio por semana</h3>${chartBars(semanas, minutos, { min: 30, stack: minCam, label: 'minutos cardio' })}<p class="legend small"><i class="lg1"></i>Elíptica <i class="lg2"></i>Caminata (estimado: 12 min por km)</p><p class="small muted">Total acumulado: <b>${Math.round(totalMin)} min</b>. Recomendación de salud: 150+ min/semana.</p></div>
    <div class="card"><h3>🚶 Caminatas</h3>
      <form id="fcamina2" class="inline"><input name="fecha" type="date" value="${t}" required><input name="pasos" type="number" inputmode="numeric" placeholder="pasos" aria-label="Pasos"><input name="km" type="text" inputmode="decimal" placeholder="km" aria-label="Distancia en km"><button class="btn primary" aria-label="Guardar caminata">+</button></form>
      <p class="small muted">Pasos por semana</p>${chartBars(semanas, pasosCam, { min: 10000, label: 'pasos por semana' })}<p class="small muted">Km por semana</p>${chartBars(semanas, kmCam, { min: 5, label: 'km caminados', dec: true })}
      <p class="small muted">Total: <b>${cams.length}</b> caminatas · <b>${fmtN(sumar(cams, 'km'))} km</b> · <b>${sumar(cams, 'pasos').toLocaleString('es-CL')}</b> pasos</p>
      ${cams.length ? `<details><summary class="small">Ver registros</summary><ul class="plist">${cams.map((c) => `<li><span>${fmt(c.fecha)}</span><b>${resumenCam([c])}</b><button class="link danger" data-act="delcam" data-id="${c.id}" aria-label="Eliminar">✕</button></li>`).join('')}</ul></details>` : ''}
    </div>
    <div class="card"><h3>🏋️ Fuerza</h3>${ejChart}<p class="small muted">Volumen total levantado: <b>${Math.round(vol).toLocaleString('es-CL')} kg</b></p></div>
    <div class="card"><h3>🦵 Dolor de rodilla</h3>${chartLine(rod, { yMin: 0, yMax: 10, label: 'dolor rodilla', vacio: 'Se registra al terminar cada sesión.', h: 130 })}<p class="small muted">Lo ideal es que la tendencia baje con las semanas. Si sube o pasa de 5, consulta a un kinesiólogo.</p></div>
  </section>`;
}

/* ---- COMIDA (diario) ---- */
let comidaDia = null;
const sheet = { open: false, m: null, food: null, q: 1, custom: false, q_: '', mode: 'u', gr: 100 };
const normal = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const diaComidas = (d) => S.comidas[d] || [];
function totales(items) {
  return items.reduce((a, it) => {
    a.k += it.f.k * it.q; a.pr += it.f.pr * it.q; a.c += (it.f.c || 0) * it.q; a.g += (it.f.g || 0) * it.q;
    return a;
  }, { k: 0, pr: 0, c: 0, g: 0 });
}
const fmtQ = (q) => (q === 1 ? '' : `${fmtN(q, 2)} × `);
const todosAlimentos = () => [...S.propios, ...ALIMENTOS];
function recientes() {
  const seen = new Set(), out = [];
  for (const d of Object.keys(S.comidas).sort().reverse()) {
    for (const it of [...S.comidas[d]].reverse()) {
      if (!seen.has(it.f.n)) { seen.add(it.f.n); out.push(it.f); }
      if (out.length >= 12) return out;
    }
  }
  return out;
}
function buscar(q) {
  const w = normal(q).split(/\s+/).filter(Boolean);
  if (!w.length) return null;
  // cada palabra acepta también sus sinónimos (ej. "cafe" → capuchino, latte)
  const alts = w.map((x) => [x, ...(SINONIMOS[x] || []).map(normal)]);
  const qn = w.join(' ');
  return todosAlimentos()
    .map((a) => ({ a, t: normal(a.n + ' ' + a.cat), n: normal(a.n) }))
    .filter(({ t }) => alts.every((opts) => opts.some((o) => t.includes(o))))
    .sort((x, y) => (y.n.startsWith(qn) - x.n.startsWith(qn)) || (y.n.includes(qn) - x.n.includes(qn)))
    .slice(0, 60)
    .map(({ a }) => a);
}
const foodBtn = (a) => `<button class="fres-i" data-act="pickfood" data-id="${esc(a.id)}"><b>${esc(a.n)}</b><span>${esc(a.p)} · ${a.k} kcal · ${a.pr} g prot.</span></button>`;
function resultadosHTML(q) {
  const r = buscar(q);
  if (r) return r.length ? r.map(foodBtn).join('') : `<p class="muted small">No encontré "${esc(q)}". Prueba con otra palabra o créalo abajo.</p>`;
  const rec = recientes();
  let h = rec.length ? `<p class="fres-h">Recientes</p>${rec.map(foodBtn).join('')}` : '';
  if (S.propios.length) h += `<p class="fres-h">Mis alimentos</p>${S.propios.map(foodBtn).join('')}`;
  return h || '<p class="muted small">Escribe para buscar: marraqueta, huevo, cazuela, completo…</p>';
}
/* ---- Alimentos propios y escáner de código de barras ---- */
function formAlimentoHTML(dr, o) {
  const v = (x) => esc(x ?? '');
  const aviso = dr.off
    ? `<div class="okbanner">✓ Encontrado en Open Food Facts (código ${esc(dr.bc)}). <b>Revisa que coincida con la etiqueta</b> antes de guardar${dr.incompleto ? '; faltan las calorías, cópialas del envase' : ''}.</div>`
    : dr.bc && !dr.id
      ? `<div class="infobanner">No encontré el código ${esc(dr.bc)}${dr.offline ? ' (sin conexión a internet)' : ' en la base pública'}. Copia los datos de la etiqueta: quedará guardado y la próxima vez que lo escanees aparecerá de inmediato.</div>`
      : '<p class="small muted">Copia los datos de la etiqueta del producto (por porción).</p>';
  return `<form id="${o.id}" class="form">${aviso}
    <input type="hidden" name="editId" value="${v(dr.id)}"><input type="hidden" name="bc" value="${v(dr.bc)}"><input type="hidden" name="u" value="${v(dr.u || 'g')}">
    ${dr.per100 ? `<input type="hidden" name="k100" value="${v(dr.per100.k)}"><input type="hidden" name="pr100" value="${v(dr.per100.pr)}"><input type="hidden" name="c100" value="${v(dr.per100.c)}"><input type="hidden" name="g100" value="${v(dr.per100.g)}">
    <p class="small muted">💡 Si cambias los gramos de la porción, las calorías y macros se recalculan solos.</p>` : ''}
    <label>Nombre<input name="n" required value="${v(dr.n)}" placeholder="ej: Yogurt protein frutilla"></label>
    <label>Porción<input name="p" required value="${v(dr.p)}" placeholder="ej: 1 unidad (155 g)"></label>
    <div class="row2"><label>Calorías (kcal)<input name="k" type="text" inputmode="decimal" required value="${v(dr.k)}"></label><label>Proteína (g)<input name="pr" type="text" inputmode="decimal" value="${v(dr.pr ?? 0)}"></label></div>
    <div class="row2"><label>Carbohidratos (g)<input name="c" type="text" inputmode="decimal" value="${v(dr.c ?? 0)}"></label><label>Grasas (g)<input name="g" type="text" inputmode="decimal" value="${v(dr.g ?? 0)}"></label></div>
    <label>Gramos o ml de esa porción (para poder ingresar por peso)<input name="gp" type="text" inputmode="decimal" value="${v(dr.gp)}" placeholder="ej: 155"></label>
    ${dr.bc ? `<p class="small muted">🏷️ Código de barras: ${esc(dr.bc)}</p>` : ''}
    <button class="btn primary big">${o.boton}</button>
    ${o.volver}</form>`;
}
function guardarAlimento(d) {
  const a = { n: d.n.trim(), p: d.p.trim(), k: num(d.k) || 0, pr: num(d.pr) || 0, c: num(d.c) || 0, g: num(d.g) || 0, gp: num(d.gp) || null, u: d.u || 'g', cat: 'Mis alimentos', ...(d.bc ? { bc: d.bc } : {}) };
  const i = d.editId ? S.propios.findIndex((x) => x.id === d.editId) : -1;
  if (i >= 0) { a.id = d.editId; S.propios[i] = a; } else { a.id = 'u' + Date.now(); S.propios.push(a); }
  save(true);
  return a;
}
// Convierte un producto de Open Food Facts (valores por 100 g) a una porción de la app
function desdeOFF(code, p) {
  const n = p.nutriments || {};
  const k100 = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  const sq = num(p.serving_quantity);
  const base = sq && sq > 0 && sq < 1000 ? sq : 100;
  const f = base / 100;
  const ml = /\d\s*(ml|cl|l)\b/i.test(`${p.quantity || ''} ${p.serving_size || ''}`);
  const u = ml ? 'ml' : 'g';
  const r = (x) => (x == null || x === '' ? '' : Math.round(x * f * 10) / 10);
  const marca = p.brands ? p.brands.split(',')[0].trim() : '';
  const base_n = p.product_name_es || p.product_name || p.generic_name || 'Producto';
  const nombre = marca && !normal(base_n).includes(normal(marca)) ? `${base_n} · ${marca}` : base_n;
  return { bc: code, n: nombre, p: base === 100 ? `100 ${u}` : `1 porción (${fmtN(base)} ${u})`, k: k100 == null ? '' : Math.round(k100 * f), pr: r(n.proteins_100g), c: r(n.carbohydrates_100g), g: r(n.fat_100g), gp: base, u, off: true, incompleto: k100 == null,
    per100: { k: k100 == null ? '' : Math.round(k100), pr: n.proteins_100g ?? '', c: n.carbohydrates_100g ?? '', g: n.fat_100g ?? '' } };
}
// Lector: BarcodeDetector nativo si existe; si no (iPhone), ZXing en WebAssembly guardado en js/vendor
let scanStream = null, scanTimer = null, scanBusy = false, detector = null;
const FORMATOS_CB = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
const setScanMsg = (t) => { const el = $('#scanmsg'); if (el) el.textContent = t; };
function cargarLectorCB() {
  if (window.BarcodeDetectionAPI) return Promise.resolve();
  return new Promise((ok, err) => {
    const sc = document.createElement('script');
    sc.src = 'js/vendor/barcode-detector.js';
    sc.onload = () => {
      try {
        window.BarcodeDetectionAPI.setZXingModuleOverrides({
          locateFile: (p, pre) => (p.endsWith('.wasm') ? new URL('js/vendor/' + p, location.href).href : pre + p),
        });
      } catch (e) { /* usa la ruta por defecto */ }
      ok();
    };
    sc.onerror = err;
    document.head.appendChild(sc);
  });
}
async function getDetector() {
  if (detector) return detector;
  if ('BarcodeDetector' in window) {
    try {
      const f = await window.BarcodeDetector.getSupportedFormats();
      if (f.includes('ean_13')) return (detector = new window.BarcodeDetector({ formats: FORMATOS_CB }));
    } catch (e) { /* sigue con ZXing */ }
  }
  await cargarLectorCB();
  return (detector = new window.BarcodeDetectionAPI.BarcodeDetector({ formats: FORMATOS_CB }));
}
const codigoDe = (res) => (res || []).map((x) => String(x.rawValue || '').replace(/\D/g, '')).find((c) => c.length >= 8 && c.length <= 14);
function stopScanner() {
  clearTimeout(scanTimer);
  scanTimer = null;
  if (scanStream) { scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; }
  return Promise.resolve();
}
async function startScanner() {
  stopScanner();
  const video = $('#reader video');
  if (!video) return;
  scanBusy = false;
  try {
    const det = getDetector(); // carga el lector mientras se abre la cámara
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    if (!sheet.open || !sheet.scan || !document.body.contains(video)) { stream.getTracks().forEach((t) => t.stop()); return; }
    scanStream = stream;
    video.srcObject = stream;
    await video.play().catch(() => {});
    try {
      const tr = stream.getVideoTracks()[0], cap = tr.getCapabilities ? tr.getCapabilities() : {};
      if (cap.focusMode && cap.focusMode.includes('continuous')) await tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
    } catch (e) { /* sin control de enfoque */ }
    const d = await det;
    setScanMsg('Ubica el código dentro del recuadro y acerca el teléfono hasta que se vea nítido.');
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    const loop = async () => {
      if (!scanStream || scanBusy) return;
      try {
        const vw = video.videoWidth, vh = video.videoHeight;
        if (vw && vh) {
          // analiza el centro del cuadro (90% ancho x 60% alto), reducido a máx. 1280 px
          const sw = vw * 0.9, sh = vh * 0.6, k = Math.min(1, 1280 / sw);
          cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
          ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
          const code = codigoDe(await d.detect(cv));
          if (code && !scanBusy) { scanBusy = true; navigator.vibrate?.(80); buscarCodigo(code); return; }
        }
      } catch (e) { /* cuadro no listo */ }
      scanTimer = setTimeout(loop, 120);
    };
    loop();
  } catch (e) {
    stopScanner();
    setScanMsg(e && e.name === 'NotAllowedError'
      ? 'La app no tiene permiso para usar la cámara. Actívalo en Ajustes del iPhone, o lee el código desde una foto o escríbelo.'
      : 'No se pudo abrir la cámara. Puedes leer el código desde una foto o escribirlo.');
  }
}
async function buscarCodigo(raw) {
  const code = String(raw || '').replace(/\D/g, '');
  if (code.length < 8) { setScanMsg('Ese código no parece válido (deben ser 8 a 14 números).'); scanBusy = false; return; }
  await stopScanner();
  if (!sheet.open) return;
  const ya = S.propios.find((a) => a.bc === code);
  if (ya) {
    Object.assign(sheet, { scan: false, custom: false, draft: null, food: ya, q: 1, mode: 'u', gr: ya.gp || 100 });
    renderSheet();
    toast('Ya lo tenías en Mis alimentos');
    return;
  }
  setScanMsg(`Código ${code} leído. Buscando el producto…`);
  let draft;
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_es,generic_name,brands,quantity,serving_size,serving_quantity,nutriments`);
    const j = await r.json();
    draft = j.status === 1 && j.product ? desdeOFF(code, j.product) : { bc: code, p: '100 g', gp: 100 };
  } catch (e) {
    draft = { bc: code, p: '100 g', gp: 100, offline: true };
  }
  if (!sheet.open) return;
  Object.assign(sheet, { scan: false, custom: true, draft });
  renderSheet();
}
async function imagenDeArchivo(file) {
  try { return await createImageBitmap(file); } catch (e) { /* formato no soportado: usa <img> */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  } finally { URL.revokeObjectURL(url); }
}
async function leerFoto(file) {
  setScanMsg('Leyendo la foto…');
  try {
    await stopScanner();
    const d = await getDetector();
    const code = codigoDe(await d.detect(await imagenDeArchivo(file)));
    if (!code) throw new Error('sin código');
    buscarCodigo(code);
  } catch (e) {
    setScanMsg('No encontré un código en la foto. Prueba con una más cercana, nítida y con el código derecho, o escribe los números.');
  }
}
const scanHTML = () => `<div id="reader" class="reader"><video playsinline muted autoplay></video><div class="aim"><i></i></div></div>
  <p class="small muted center" id="scanmsg">Apunta la cámara al código de barras del envase.</p>
  <div class="inline"><input id="bcmanual" type="text" inputmode="numeric" placeholder="o escribe el código" aria-label="Código de barras"><button class="btn" data-act="bcbuscar">Buscar</button></div>
  <label class="btn wide">📸 Leer desde una foto<input type="file" accept="image/*" id="bcfoto" hidden></label>
  <button class="btn ghost big" data-act="scanclose">Volver</button>`;

const prevTxt = (f, q) => `${Math.round(f.k * q)} kcal · ${r1(f.pr * q)} g proteína`;
function sheetHTML() {
  if (!sheet.open) return '';
  const meal = COMIDAS_DIA.find((m) => m[0] === sheet.m);
  let body;
  if (sheet.food) {
    const f = sheet.food, q = sheet.q, u = f.u || 'g', porPeso = f.gp && sheet.mode === 'g';
    const modo = f.gp ? `<div class="seg"><button class="${porPeso ? '' : 'on'}" data-act="fmode" data-m="u">Por porción</button><button class="${porPeso ? 'on' : ''}" data-act="fmode" data-m="g">Por ${u === 'ml' ? 'ml' : 'gramos'}</button></div>` : '';
    const ctrl = porPeso
      ? `<div class="qty"><button class="btn" data-act="gstep" data-d="-10" aria-label="Menos">−</button><input id="fg" type="text" inputmode="decimal" value="${fmtN(sheet.gr)}" aria-label="Cantidad en ${u}"><span class="qu">${u}</span><button class="btn" data-act="gstep" data-d="10" aria-label="Más">+</button></div>
        <div class="chips">${[50, 100, 150, 200, 250, 300].map((x) => `<button class="tab ${x === sheet.gr ? 'on' : ''}" data-act="gset" data-g="${x}">${x}</button>`).join('')}</div>
        <p class="prev" id="fprev">${prevTxt(f, sheet.gr / f.gp)}</p>`
      : `<div class="qty"><button class="btn" data-act="qty" data-d="-0.5" aria-label="Menos">−</button><input id="fq" type="text" inputmode="decimal" value="${fmtN(q, 2)}" aria-label="Cantidad de porciones"><button class="btn" data-act="qty" data-d="0.5" aria-label="Más">+</button></div>
        <div class="chips">${[0.5, 1, 1.5, 2, 3].map((x) => `<button class="tab ${x === q ? 'on' : ''}" data-act="qset" data-q="${x}">${String(x).replace('.', ',')}</button>`).join('')}</div>
        <p class="prev" id="fprev">${prevTxt(f, q)}</p>`;
    body = `<div class="pick"><b class="pick-n">${esc(f.n)}</b><span class="muted small">Porción: ${esc(f.p)} = ${f.k} kcal${f.gp ? ` · ${fmtN(f.gp)} ${u}` : ''}</span>
      ${modo}${ctrl}
      <button class="btn primary big" data-act="addfood">${sheet.editItem ? 'Guardar cambios' : `Agregar a ${meal[1]}`}</button>
      ${sheet.editItem ? '<button class="btn ghost big" data-act="closesheet">Cancelar</button>' : '<button class="btn ghost big" data-act="backfood">Elegir otro</button>'}</div>`;
  } else if (sheet.scan) {
    body = scanHTML();
  } else if (sheet.custom) {
    body = formAlimentoHTML(sheet.draft || {}, { id: 'fcustom', boton: 'Guardar y elegir cantidad', volver: '<button type="button" class="btn ghost big" data-act="backfood">Volver</button>' });
  } else {
    body = `<input id="fsearch" type="search" placeholder="Buscar alimento…" autocomplete="off" value="${esc(sheet.q_)}">
      <button class="btn scanbtn" data-act="scanopen">📷 Escanear código de barras</button>
      <div id="fres" class="fres">${resultadosHTML(sheet.q_)}</div>
      <button class="link" data-act="customfood">+ Crear alimento propio</button>`;
  }
  return `<div class="sheet-bg" data-act="closesheet"></div><div class="sheet-p" role="dialog" aria-label="Agregar alimento">
    <div class="sheet-h"><h3>${meal[2]} ${meal[1]}</h3><button class="link" data-act="closesheet" aria-label="Cerrar">✕</button></div>${body}</div>`;
}
function renderSheet() {
  const el = $('#sheet');
  if (!el) return;
  stopScanner();
  el.innerHTML = sheetHTML();
  el.classList.toggle('open', sheet.open);
  document.body.classList.toggle('sheet-open', sheet.open);
  if (sheet.open && sheet.scan) startScanner();
}

function vComida() {
  const t = today();
  if (!comidaDia) comidaDia = t;
  const d = comidaDia, o = objetivos();
  const items = diaComidas(d), tot = totales(items);
  const rest = Math.round(o.kcal - tot.k);
  const pct = Math.min(100, (tot.k / o.kcal) * 100), pctP = Math.min(100, (tot.pr / o.prot) * 100);
  const ayer = iso(addDays(parse(d), -1));
  const meals = COMIDAS_DIA.map(([m, nom, ico]) => {
    const its = items.filter((x) => x.m === m), tt = totales(its);
    const prev = diaComidas(ayer).filter((x) => x.m === m);
    return `<div class="card meal-c"><div class="mh"><h3>${ico} ${nom}</h3><b>${Math.round(tt.k)} kcal</b></div>
      ${its.map((x) => `<div class="fi"><div class="grow tap" data-act="editfood" data-id="${x.id}"><b>${x.gr ? '' : fmtQ(x.q)}${esc(x.f.n)}</b><span class="small muted">${x.gr ? `${fmtN(x.gr)} ${x.f.u || 'g'}` : esc(x.f.p)} · ${Math.round(x.f.pr * x.q)} g prot.</span></div><span>${Math.round(x.f.k * x.q)}</span><button class="link danger" data-act="delfood" data-id="${x.id}" aria-label="Quitar">✕</button></div>`).join('')}
      <div class="btns"><button class="btn small-btn" data-act="opensheet" data-m="${m}">+ Agregar</button>${!its.length && prev.length ? `<button class="btn ghost small-btn" data-act="repetir" data-m="${m}">↺ Repetir de ayer (${Math.round(totales(prev).k)} kcal)</button>` : ''}</div></div>`;
  }).join('');
  const labs = [], vals = [];
  for (let i = 13; i >= 0; i--) {
    const dd = iso(addDays(parse(t), -i));
    labs.push(parse(dd).getDate());
    vals.push(Math.round(totales(diaComidas(dd)).k));
  }
  const prev7 = vals.slice(6, 13).filter(Boolean);
  const prom = prev7.length ? Math.round(prev7.reduce((a, b) => a + b, 0) / prev7.length) : null;
  const nomDia = d === t ? 'Hoy' : d === iso(addDays(parse(t), -1)) ? 'Ayer' : DIAS[parse(d).getDay()];
  return `${header('Comida')}<section class="wrap">
    <div class="weeknav"><button class="btn ghost" data-act="cday" data-d="-1" aria-label="Día anterior">‹</button><div><b>${nomDia}</b><span class="small muted">${fmt(d)}</span></div><button class="btn ghost" data-act="cday" data-d="1" ${d >= t ? 'disabled' : ''} aria-label="Día siguiente">›</button></div>
    <div class="card accent sumc">
      <div class="kc"><b>${Math.round(tot.k).toLocaleString('es-CL')}</b><span>de ${o.kcal.toLocaleString('es-CL')} kcal</span></div>
      <div class="pbar"><i style="width:${pct}%" class="${tot.k > o.kcal ? 'over' : ''}"></i></div>
      <p class="small">${rest >= 0 ? `Te quedan <b>${rest.toLocaleString('es-CL')} kcal</b> para hoy` : `Te pasaste por <b>${(-rest).toLocaleString('es-CL')} kcal</b>`}</p>
      <div class="macros macros3"><div><b>${Math.round(tot.pr)} / ${o.prot} g</b><span>Proteína</span></div><div><b>${Math.round(tot.c)} / ${o.carb} g</b><span>Carbohidratos</span></div><div><b>${Math.round(tot.g)} / ${o.grasa} g</b><span>Grasas</span></div></div>
      <div class="pbar thin"><i style="width:${pctP}%" class="prot"></i></div><p class="small muted">Proteína: ${Math.round(pctP)}% de tu meta</p>
    </div>
    ${meals}
    <div class="card"><h3>📊 Últimos 14 días</h3>${chartBars(labs, vals, { min: o.kcal, hl: 13, goal: o.kcal, noVal: true, label: 'calorías por día' })}
      <p class="small muted">${prom ? `Promedio de los últimos 7 días con registro: <b>${prom.toLocaleString('es-CL')} kcal</b>. ` : ''}La línea punteada es tu meta (${o.kcal.toLocaleString('es-CL')} kcal).</p></div>
    <details class="card acc"><summary>¿Cómo se calcula tu meta?</summary><p>Gasto estimado: ~${o.tdee.toLocaleString('es-CL')} kcal/día (metabolismo basal ${o.bmr} kcal × actividad). Tu meta tiene un déficit de ~20% para bajar 0,5–0,8 kg por semana y se recalcula sola con tu último peso. Agua recomendada: ${o.agua} L/día.</p></details>
    <a class="card row-link" href="#/alimentos"><span>🥫</span><div class="grow"><b>Mis alimentos</b><span class="small muted">Edita o borra los productos que creaste o escaneaste</span></div>›</a>
    <h2 class="sec">Claves</h2>
    ${CONSEJOS_COMIDA.map(([ti, de]) => `<details class="card acc"><summary>${ti}</summary><p>${de}</p></details>`).join('')}
    <p class="small muted center">Las calorías son aproximadas (porciones caseras). Para productos envasados, crea el alimento con los datos de la etiqueta.</p>
  </section><div id="sheet" class="sheet"></div>`;
}

/* ---- RUTINAS PROPIAS ---- */
let rDraft = null;
function vRutinas() {
  const t = today();
  return `${header('Mis rutinas', '#/mas')}<section class="wrap">
    <p class="small muted">Crea tus propias rutinas con los ejercicios de la app o con ejercicios tuyos. Puedes hacerlas cualquier día y quedan registradas igual que las del plan (progreso, historial y sugerencias de peso).</p>
    ${S.rutinas.map((r) => `<div class="card"><h3>${esc(r.nombre)}</h3><p class="small muted">${r.ejercicios.map((e) => esc(getEj(e.id).nombre)).join(' · ') || 'Sin ejercicios'}${num(r.cardio) ? ` · Elíptica ${num(r.cardio)} min` : ''}</p>
      <div class="btns"><a class="btn primary small-btn" href="#/sesion/${t}/R-${r.id}">Empezar hoy</a><a class="btn small-btn" href="#/rutina/${r.id}">Editar</a></div></div>`).join('')}
    <a class="btn primary big" href="#/rutina/nueva">+ Nueva rutina</a>
    <h2 class="sec">Mis ejercicios</h2>
    <div class="card"><p class="small muted">Agrega ejercicios que no estén en la lista. No tienen animación, pero sí registro y progreso.</p>
      ${S.ejPropios.map((e) => `<div class="fi"><div class="grow"><b>${esc(e.nombre)}</b><span class="small muted">${e.peso ? 'Con peso' : 'Sin peso'} · ${e.tiempo ? 'se mide en segundos' : 'se mide en repeticiones'}</span></div><button class="link danger" data-act="delejp" data-id="${e.id}" aria-label="Eliminar">✕</button></div>`).join('')}
      <form id="fejp" class="form mt"><label>Nombre<input name="nombre" required placeholder="ej: Remo con banda"></label>
        <label class="chkl"><input type="checkbox" name="peso" checked> Usa peso (kg)</label>
        <label class="chkl"><input type="checkbox" name="tiempo"> Se mide en segundos (no en repeticiones)</label>
        <button class="btn">+ Agregar ejercicio</button></form></div>
  </section>`;
}
function vRutina(id) {
  if (!rDraft || rDraft._for !== id) {
    const r = S.rutinas.find((x) => x.id === id);
    rDraft = r ? structuredClone(r) : { id: null, nombre: '', calent: true, cardio: '', ejercicios: [] };
    rDraft._for = id;
  }
  const d = rDraft;
  const plan = Object.keys(EJERCICIOS).filter((x) => EJERCICIOS[x].tipo !== 'cardio');
  const opts = `<optgroup label="Ejercicios de la app">${plan.map((x) => `<option value="${x}">${esc(EJERCICIOS[x].nombre)}</option>`).join('')}</optgroup>` +
    (S.ejPropios.length ? `<optgroup label="Mis ejercicios">${S.ejPropios.map((e) => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('')}</optgroup>` : '');
  const rows = d.ejercicios.map((e, i) => {
    const ex = getEj(e.id);
    return `<div class="card rex"><div class="mh"><b>${i + 1}. ${esc(ex.nombre)}</b><div class="rbtn">
        <button class="link" data-act="rmove" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button class="link" data-act="rmove" data-i="${i}" data-d="1" ${i === d.ejercicios.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
        <button class="link danger" data-act="rdel" data-i="${i}" aria-label="Quitar">✕</button></div></div>
      <div class="cgrid"><label>Series<input type="text" inputmode="numeric" data-rf="sets" data-i="${i}" value="${esc(e.sets)}"></label>
        <label>${esTiempo(ex) ? 'Segundos' : 'Reps'}<input type="text" data-rf="reps" data-i="${i}" value="${esc(e.reps)}" placeholder="${esTiempo(ex) ? '30' : '10-12'}"></label>
        <label>Descanso (s)<input type="text" inputmode="numeric" data-rf="rest" data-i="${i}" value="${esc(e.rest)}"></label></div></div>`;
  }).join('');
  return `${header(id === 'nueva' ? 'Nueva rutina' : 'Editar rutina', '#/rutinas')}<section class="wrap">
    <div class="card form">
      <label>Nombre de la rutina<input data-rf="nombre" value="${esc(d.nombre)}" placeholder="ej: Full body corto"></label>
      <label class="chkl"><input type="checkbox" data-rf="calent" ${d.calent ? 'checked' : ''}> Incluir calentamiento</label>
      <label>Elíptica al final (minutos, opcional)<input type="text" inputmode="numeric" data-rf="cardio" value="${esc(d.cardio ?? '')}" placeholder="0"></label>
    </div>
    <h2 class="sec">Ejercicios</h2>
    ${rows || '<p class="muted small">Aún no agregas ejercicios.</p>'}
    <div class="card"><label class="small muted" for="radd">Agregar ejercicio</label><select id="radd">${opts}</select>
      <button class="btn wide" data-act="radd">+ Agregar a la rutina</button>
      <p class="small muted">Las reps aceptan rangos (ej. 8-12). ¿No está el ejercicio? Créalo en <a href="#/rutinas">Mis rutinas → Mis ejercicios</a>.</p></div>
    <button class="btn primary big" data-act="rsave">Guardar rutina</button>
    ${id !== 'nueva' ? '<button class="btn danger ghost" data-act="rborrar">Eliminar rutina</button>' : ''}
  </section>`;
}

/* ---- MIS ALIMENTOS ---- */
function vAlimentos() {
  const L = [...S.propios].sort((a, b) => a.n.localeCompare(b.n));
  return `${header('Mis alimentos', '#/mas')}<section class="wrap">
    <p class="small muted">Productos que creaste o escaneaste. Puedes corregir sus valores o eliminarlos; lo que ya registraste en días anteriores no cambia.</p>
    ${L.length ? `<div class="card">${L.map((a) => `<div class="fi"><div class="grow"><b>${esc(a.n)}</b><span class="small muted">${esc(a.p)} · ${a.k} kcal · ${a.pr} g prot.${a.bc ? ' · 🏷️ ' + esc(a.bc) : ''}</span></div><a class="btn small-btn" href="#/alimento/${a.id}">Editar</a><button class="link danger" data-act="delpropio" data-id="${a.id}" aria-label="Eliminar">✕</button></div>`).join('')}</div>`
      : '<div class="card"><p class="muted">Aún no tienes alimentos propios. Créalos o escanéalos desde Comida → + Agregar.</p></div>'}
  </section>`;
}
function vAlimento(id) {
  const a = S.propios.find((x) => x.id === id);
  if (!a) return vAlimentos();
  return `${header('Editar alimento', '#/alimentos')}<section class="wrap"><div class="card">${formAlimentoHTML(a, { id: 'fpropio', boton: 'Guardar cambios', volver: '<a class="btn ghost big" href="#/alimentos">Cancelar</a>' })}</div></section>`;
}

/* ---- MÁS ---- */
function vMas() {
  return `${header('Más')}<section class="wrap">
    <a class="card row-link" href="#/biblioteca"><span>📚</span><div class="grow"><b>Ejercicios</b><span class="small muted">Técnica, animación y videos</span></div>›</a>
    <a class="card row-link" href="#/rutinas"><span>🧩</span><div class="grow"><b>Mis rutinas</b><span class="small muted">Crea rutinas y ejercicios propios</span></div>›</a>
    <a class="card row-link" href="#/alimentos"><span>🥫</span><div class="grow"><b>Mis alimentos</b><span class="small muted">Productos creados o escaneados: editar o borrar</span></div>›</a>
    <a class="card row-link" href="#/perfil"><span>👤</span><div class="grow"><b>Mi perfil</b><span class="small muted">Edad, peso, meta, fecha de inicio</span></div>›</a>
    <div class="card"><h3>💾 Respaldo de datos</h3>
      <p class="small muted">Tus datos se guardan solo en este teléfono. Exporta un respaldo cada cierto tiempo (por ejemplo a Google Drive o WhatsApp).</p>
      <div class="btns"><button class="btn" data-act="export">Exportar respaldo</button><label class="btn">Importar<input type="file" accept="application/json,.json" id="fimport" hidden></label><button class="btn" data-act="share">Compartir resumen</button></div>
    </div>
    <div class="card"><h3>📲 Instalar en el celular</h3>
      ${window._installEvt ? '<button class="btn primary" data-act="install">Instalar app</button>' : ''}
      <p class="small"><b>Android (Chrome):</b> menú ⋮ → <i>Instalar aplicación</i> o <i>Agregar a pantalla principal</i>.<br><b>iPhone (Safari):</b> botón Compartir ⬆️ → <i>Agregar a inicio</i>.<br>Una vez instalada funciona sin internet (los videos sí requieren conexión).</p></div>
    <div class="card small-card"><h3>⚠️ Precauciones</h3><p class="small">Antes de empezar, idealmente hazte un chequeo médico general (presión, ECG si tienes antecedentes). Detén el ejercicio si sientes dolor en el pecho, mareo intenso o falta de aire desproporcionada. Dolor articular punzante = detente y ajusta.</p></div>
    <button class="btn danger ghost" data-act="reset">Borrar todos los datos</button>
    <p class="small muted center">v1.3.1 · Plan de 12 semanas${S.ultimoRespaldo ? ` · último respaldo: ${fmt(S.ultimoRespaldo)}` : ''}</p>
  </section>`;
}

function vBiblioteca() {
  const grupos = { 'Fuerza': [], 'Core y rodillas': [], 'Cardio': [] };
  for (const [id, e] of Object.entries(EJERCICIOS)) {
    const g = e.tipo === 'cardio' ? 'Cardio' : ['plancha', 'dead_bug', 'bird_dog', 'abduccion_cadera', 'elevacion_talones', 'sentadilla_pared'].includes(id) ? 'Core y rodillas' : 'Fuerza';
    grupos[g].push([id, e]);
  }
  return `${header('Ejercicios', '#/mas')}<section class="wrap">${Object.entries(grupos).map(([g, arr]) => `<h2 class="sec">${g}</h2><div class="lib">${arr.map(([id, e]) => `<a class="libi" href="#/ej/${id}">${Fig.still(ANIMS[id])}<b>${e.nombre}</b><span class="small muted">${e.musculos}</span></a>`).join('')}</div>`).join('')}</section>`;
}

function techHTML(id) {
  const e = getEj(id);
  if (e.propio) return `<p class="small muted">Ejercicio propio (sin animación).</p><a class="btn yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.yt)}" target="_blank" rel="noopener">▶ Buscar videos en YouTube</a>`;
  return `<div class="anim-wrap"><svg class="fig big" data-anim="${id}"></svg></div>
    <p class="small"><b>Músculos:</b> ${e.musculos}<br><b>Equipo:</b> ${e.equipo}</p>
    <h4>Paso a paso</h4><ol>${e.pasos.map((x) => `<li>${x}</li>`).join('')}</ol>
    <h4>Errores comunes</h4><ul class="x">${e.errores.map((x) => `<li>${x}</li>`).join('')}</ul>
    ${e.rodilla && e.rodilla !== '—' ? `<div class="knee"><b>🦵 Tus rodillas:</b> ${e.rodilla}</div>` : ''}
    <a class="btn yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.yt)}" target="_blank" rel="noopener">▶ Ver videos en YouTube</a>`;
}

function vEjercicio(id) {
  const e = getEj(id);
  if (!e) return vBiblioteca();
  const hist = logsOrdenados().filter((l) => l.ex[id]?.sets.some((s) => s.ok)).reverse().slice(0, 8);
  return `${header(e.nombre, '#/biblioteca')}<section class="wrap"><div class="card">${techHTML(id)}</div>
    ${hist.length ? `<div class="card"><h3>Tu historial</h3><ul class="plist">${hist.map((l) => `<li><span>${fmt(l.fecha)}</span><span>${l.ex[id].sets.filter((s) => s.ok).map((s) => (num(s.w) ? s.w + 'kg×' : '') + s.r).join(' · ')}</span></li>`).join('')}</ul></div>` : ''}
  </section>`;
}

/* ============================================================
   ROUTER Y EVENTOS
   ============================================================ */
let ctx = {};
function route() {
  stops.forEach((f) => f()); stops = [];
  stopScanner();
  const main = $('#main');
  const h = location.hash.replace(/^#\/?/, '').split('/');
  let v = h[0] || 'hoy';
  if (!S.perfil) v = 'onboarding';
  let html;
  ctx = {};
  switch (v) {
    case 'onboarding': html = vPerfil(true); break;
    case 'perfil': html = vPerfil(false); break;
    case 'sesion': ctx = { date: h[1], sid: h[2] }; html = vSesion(h[1], h[2]); break;
    case 'plan': html = vPlan(); break;
    case 'progreso': html = vProgreso(); break;
    case 'comida': html = vComida(); break;
    case 'mas': html = vMas(); break;
    case 'biblioteca': html = vBiblioteca(); break;
    case 'ej': html = vEjercicio(h[1]); break;
    case 'rutinas': html = vRutinas(); break;
    case 'alimentos': html = vAlimentos(); break;
    case 'alimento': html = vAlimento(h[1]); break;
    case 'rutina': html = vRutina(h[1]); break;
    default: v = 'hoy'; html = vHoy();
  }
  main.innerHTML = html;
  if (v !== 'comida') comidaDia = null;
  if (v !== 'rutina') rDraft = null;
  sheet.open = false;
  document.body.classList.remove('sheet-open');
  document.body.classList.toggle('no-nav', v === 'onboarding');
  const navKey = { sesion: 'hoy', perfil: 'mas', biblioteca: 'mas', ej: 'mas', rutinas: 'mas', rutina: 'mas', alimentos: 'mas', alimento: 'mas' }[v] || v;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === navKey));
  main.querySelectorAll('svg[data-anim]').forEach((s) => stops.push(Fig.mount(s, ANIMS[s.dataset.anim])));
  keepAwake(v === 'sesion');
  if (v !== 'sesion') stopTimer();
  window.scrollTo(0, 0);
}

function setData(el) {
  const row = el.closest('.set');
  const id = row.dataset.ex, i = +row.dataset.i;
  const lg = getLog(ctx.date, ctx.sid, true);
  lg.ex[id] = lg.ex[id] || { sets: [] };
  while (lg.ex[id].sets.length <= i) lg.ex[id].sets.push({ w: '', r: '', ok: false });
  return { row, id, i, s: lg.ex[id].sets[i], lg };
}
function refreshExDone(id) {
  const card = document.querySelector(`[data-exc="${id}"]`);
  const lg = getLog(ctx.date, ctx.sid);
  const n = +card.dataset.sets;
  const sets = lg?.ex[id]?.sets || [];
  card.classList.toggle('done', sets.length >= n && sets.slice(0, n).every((s) => s.ok));
}

const actions = {
  setok(btn) {
    const { row, id, s } = setData(btn);
    s.ok = !s.ok;
    if (s.ok) {
      const wi = row.querySelector('[data-f="w"]'), ri = row.querySelector('[data-f="r"]');
      if (wi && !wi.value && wi.placeholder && num(wi.placeholder) != null) { wi.value = wi.placeholder; s.w = wi.value; }
      if (ri && !ri.value && ri.placeholder) { ri.value = ri.placeholder; s.r = ri.value; }
      startTimer(+row.dataset.rest || 60);
      // propagar peso a la siguiente serie
      const next = row.nextElementSibling?.querySelector('[data-f="w"]');
      if (next && !next.value && s.w) next.placeholder = s.w;
    }
    row.classList.toggle('ok', s.ok);
    btn.classList.toggle('on', s.ok);
    refreshExDone(id);
    save();
  },
  addset(btn) {
    const id = btn.dataset.id;
    const lg = getLog(ctx.date, ctx.sid, true);
    const card = document.querySelector(`[data-exc="${id}"]`);
    const n = card.querySelectorAll('.set').length;
    lg.ex[id] = lg.ex[id] || { sets: [] };
    while (lg.ex[id].sets.length < n + 1) lg.ex[id].sets.push({ w: '', r: '', ok: false });
    save(true); rerender();
  },
  warm(btn) {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.warm = !lg.warm;
    btn.classList.toggle('on', lg.warm);
    $('#warm').classList.toggle('done', lg.warm);
    save();
  },
  cardiook(btn) {
    const lg = getLog(ctx.date, ctx.sid, true), k = btn.dataset.key;
    const c = (lg.cardio[k] = lg.cardio[k] || {});
    c.ok = !c.ok;
    const card = btn.closest('.cardio');
    if (c.ok && c.min == null) {
      const inp = card.querySelector('[data-c="tmin"]');
      if (!inp.value) { inp.value = inp.placeholder; c.min = +inp.placeholder; }
    }
    btn.classList.toggle('on', c.ok);
    card.classList.toggle('done', c.ok);
    save();
  },
  tech(el) {
    const id = el.dataset.id;
    const card = el.closest('.blk');
    const box = card.querySelector('.tech');
    const open = !box.classList.contains('open');
    document.querySelectorAll('.tech.open').forEach((b) => { b.classList.remove('open'); b.innerHTML = ''; });
    stops.forEach((f) => f()); stops = [];
    if (open) {
      box.innerHTML = techHTML(id);
      box.classList.add('open');
      stops.push(Fig.mount(box.querySelector('svg'), ANIMS[id]));
    }
  },
  finish() {
    const lg = getLog(ctx.date, ctx.sid, true);
    const was = lg.done;
    lg.done = true;
    lg.fin = new Date().toISOString();
    save(true);
    stopTimer();
    const sets = Object.values(lg.ex).reduce((a, e) => a + e.sets.filter((s) => s.ok).length, 0);
    const min = Object.values(lg.cardio).reduce((a, c) => a + (num(c.min) || 0), 0);
    toast(was ? 'Cambios guardados' : `¡Sesión completada! 💪 ${sets} series · ${fmtMin(min)} de cardio`);
    location.hash = '#/hoy';
  },
  pw(btn) { planOffset += +btn.dataset.d; rerender(); },
  delpeso(btn) {
    if (!confirm('¿Eliminar este registro de peso?')) return;
    S.pesos = S.pesos.filter((x) => x.fecha !== btn.dataset.f);
    save(true); rerender();
  },
  delcam(btn) {
    if (!confirm('¿Eliminar esta caminata?')) return;
    S.caminatas = S.caminatas.filter((c) => String(c.id) !== btn.dataset.id);
    save(true); rerender();
  },
  cday(btn) {
    const nd = iso(addDays(parse(comidaDia), +btn.dataset.d));
    comidaDia = nd > today() ? today() : nd;
    rerender();
  },
  opensheet(btn) {
    Object.assign(sheet, { open: true, m: btn.dataset.m, food: null, q: 1, custom: false, scan: false, draft: null, editItem: null, q_: '' });
    renderSheet();
  },
  closesheet() { sheet.open = false; renderSheet(); },
  pickfood(btn) {
    const id = btn.dataset.id;
    sheet.food = todosAlimentos().find((a) => a.id === id) || recientes().find((a) => a.id === id);
    sheet.q = 1;
    sheet.mode = 'u';
    sheet.gr = sheet.food.gp || 100;
    renderSheet();
  },
  qty(btn) { sheet.q = Math.max(0.25, Math.round((sheet.q + +btn.dataset.d) * 4) / 4); renderSheet(); },
  qset(btn) { sheet.q = +btn.dataset.q; renderSheet(); },
  fmode(btn) { sheet.mode = btn.dataset.m; renderSheet(); },
  gstep(btn) { sheet.gr = Math.max(5, Math.round((sheet.gr + +btn.dataset.d) / 5) * 5); renderSheet(); },
  gset(btn) { sheet.gr = +btn.dataset.g; renderSheet(); },
  backfood() { Object.assign(sheet, { food: null, custom: false, scan: false, draft: null }); renderSheet(); },
  customfood() { Object.assign(sheet, { custom: true, draft: null }); renderSheet(); },
  scanopen() { Object.assign(sheet, { scan: true, custom: false, food: null }); renderSheet(); },
  scanclose() { sheet.scan = false; renderSheet(); },
  bcbuscar() { buscarCodigo($('#bcmanual').value); },
  editfood(el) {
    const it = diaComidas(comidaDia).find((x) => x.id === el.dataset.id);
    if (!it) return;
    Object.assign(sheet, { open: true, m: it.m, food: it.f, q: it.q, mode: it.gr ? 'g' : 'u', gr: it.gr || it.f.gp || 100, custom: false, scan: false, draft: null, editItem: it.id, q_: '' });
    renderSheet();
  },
  delpropio(btn) {
    if (!confirm('¿Eliminar este alimento de Mis alimentos? Lo que ya registraste en días anteriores no cambia.')) return;
    S.propios = S.propios.filter((a) => a.id !== btn.dataset.id);
    save(true); rerender();
  },
  addfood() {
    const { id, n, p, k, pr, c, g, gp, u } = sheet.food;
    const porPeso = gp && sheet.mode === 'g';
    const gr = porPeso ? num($('#fg').value) : null;
    if (porPeso && !gr) { toast('Ingresa la cantidad'); return; }
    const q = porPeso ? gr / gp : num($('#fq').value) || sheet.q;
    if (sheet.editItem) {
      const it = diaComidas(comidaDia).find((x) => x.id === sheet.editItem);
      if (it) { it.q = q; if (porPeso) it.gr = gr; else delete it.gr; }
      save(true);
      sheet.open = false;
      toast(`Cantidad actualizada · ${Math.round(k * q)} kcal`);
      rerender();
      return;
    }
    (S.comidas[comidaDia] = S.comidas[comidaDia] || []).push({ id: Date.now() + '' + Math.floor(Math.random() * 1000), m: sheet.m, q, ...(porPeso ? { gr } : {}), f: { id, n, p, k, pr, c, g, gp: gp || null, u: u || 'g' } });
    save(true);
    sheet.open = false;
    toast(`+${Math.round(k * q)} kcal · ${n}`);
    rerender();
  },
  delfood(btn) {
    S.comidas[comidaDia] = diaComidas(comidaDia).filter((x) => x.id !== btn.dataset.id);
    save(true); rerender();
  },
  repetir(btn) {
    const m = btn.dataset.m, ayer = iso(addDays(parse(comidaDia), -1));
    const prev = diaComidas(ayer).filter((x) => x.m === m);
    S.comidas[comidaDia] = [...diaComidas(comidaDia), ...prev.map((x, i) => ({ ...x, id: Date.now() + '' + i }))];
    save(true); toast('Comida copiada de ayer'); rerender();
  },
  radd() {
    const id = $('#radd').value;
    if (rDraft.ejercicios.some((e) => e.id === id)) { toast('Ese ejercicio ya está en la rutina'); return; }
    rDraft.ejercicios.push({ id, sets: '3', reps: esTiempo(getEj(id)) ? '30' : '10-12', rest: '60' });
    rerender();
  },
  rmove(btn) {
    const i = +btn.dataset.i, j = i + +btn.dataset.d, a = rDraft.ejercicios;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    rerender();
  },
  rdel(btn) { rDraft.ejercicios.splice(+btn.dataset.i, 1); rerender(); },
  rsave() {
    const d = rDraft;
    if (!d.nombre.trim()) { toast('Ponle un nombre a la rutina'); return; }
    if (!d.ejercicios.length && !num(d.cardio)) { toast('Agrega al menos un ejercicio'); return; }
    const r = { id: d.id || Date.now().toString(36), nombre: d.nombre.trim(), calent: !!d.calent, cardio: num(d.cardio), ejercicios: d.ejercicios.map((e) => ({ id: e.id, sets: e.sets, reps: e.reps, rest: e.rest })) };
    const i = S.rutinas.findIndex((x) => x.id === r.id);
    if (i >= 0) S.rutinas[i] = r; else S.rutinas.push(r);
    save(true);
    rDraft = null;
    toast('Rutina guardada ✓');
    location.hash = '#/rutinas';
  },
  rborrar() {
    if (!confirm('¿Eliminar esta rutina? Las sesiones que ya hiciste quedan en tu historial.')) return;
    S.rutinas = S.rutinas.filter((x) => x.id !== rDraft.id);
    save(true);
    rDraft = null;
    location.hash = '#/rutinas';
  },
  delejp(btn) {
    if (!confirm('¿Eliminar este ejercicio? Su historial se conserva.')) return;
    S.ejPropios = S.ejPropios.filter((e) => e.id !== btn.dataset.id);
    S.rutinas.forEach((r) => (r.ejercicios = r.ejercicios.filter((e) => e.id !== btn.dataset.id)));
    save(true); rerender();
  },
  export() {
    S.ultimoRespaldo = today();
    save(true);
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `entrenamiento-respaldo-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (location.hash.startsWith('#/hoy') || location.hash === '' || location.hash.startsWith('#/mas')) setTimeout(rerender, 500);
  },
  async share() {
    const txt = resumenTexto();
    try {
      if (navigator.share) await navigator.share({ title: 'Mi progreso', text: txt });
      else { await navigator.clipboard.writeText(txt); toast('Resumen copiado al portapapeles'); }
    } catch (e) { /* cancelado */ }
  },
  async install() {
    const e = window._installEvt;
    if (!e) return;
    e.prompt();
    await e.userChoice;
    window._installEvt = null;
    rerender();
  },
  reset() {
    if (!confirm('Esto borra TODO tu historial y perfil. ¿Seguro? (Exporta un respaldo antes)')) return;
    if (!confirm('Última confirmación: ¿borrar todo?')) return;
    S = { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [] };
    save(true); location.hash = '#/hoy'; route();
  },
};

function rerender() {
  const y = window.scrollY;
  route();
  window.scrollTo(0, y);
}

function resumenTexto() {
  const p = S.perfil, pesos = [...S.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const L = logsOrdenados().filter((l) => l.done).slice(-12);
  let t = `RESUMEN ENTRENAMIENTO (${fmt(today())})\nPerfil: ${p.edad} años, ${p.estatura} cm, inicio ${p.peso} kg, meta ${p.metaMin}-${p.metaMax} kg\n`;
  t += `Peso: ${pesos.slice(-8).map((x) => `${fmt(x.fecha)} ${x.kg}kg${x.cintura ? ` (${x.cintura}cm)` : ''}`).join(' | ') || 'sin registros'}\n\nÚltimas sesiones:\n`;
  for (const l of L) {
    t += `- ${fmt(l.fecha, true)} ${nombreSes(l)} · RPE ${l.rpe} · rodilla ${l.rodilla}/10\n`;
    for (const [id, e] of Object.entries(l.ex)) {
      const ok = e.sets.filter((s) => s.ok);
      if (ok.length) t += `   ${getEj(id).nombre}: ${ok.map((s) => (num(s.w) ? s.w + 'kg×' : '') + s.r).join(', ')}\n`;
    }
    for (const c of Object.values(l.cardio)) if (c.min) t += `   Elíptica: ${fmtMin(c.min)}${c.km ? ` ${fmtN(c.km, 2)} km` : ''}${c.nivel ? ` niv ${c.nivel}` : ''}${c.rpm ? ` ${c.rpm} rpm` : ''}${c.fc ? ` ${c.fc} lpm` : ''}\n`;
    if (l.notas) t += `   Notas: ${l.notas}\n`;
  }
  const dk = [];
  for (let i = 7; i >= 1; i--) { const dd = iso(addDays(new Date(), -i)); const tt = totales(diaComidas(dd)); if (tt.k) dk.push(`${fmt(dd)}: ${Math.round(tt.k)} kcal / ${Math.round(tt.pr)} g prot`); }
  if (dk.length) t += `\nComida (meta ${objetivos().kcal} kcal):\n${dk.join('\n')}\n`;
  const cam = S.caminatas.filter((c) => dayDiff(c.fecha, today()) <= 28).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (cam.length) t += `\nCaminatas (últimas 4 semanas):\n${cam.map((c) => `- ${fmt(c.fecha, true)}: ${resumenCam([c])}`).join('\n')}\n`;
  return t;
}

function addPeso(fecha, kg, cintura) {
  S.pesos = S.pesos.filter((x) => x.fecha !== fecha);
  S.pesos.push({ fecha, kg: num(kg), ...(num(cintura) ? { cintura: num(cintura) } : {}) });
  save(true);
}

function init() {
  const main = $('#main');
  main.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && actions[a.dataset.act]) { e.preventDefault(); actions[a.dataset.act](a, e); }
  });
  main.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'fsearch') {
      sheet.q_ = el.value;
      $('#fres').innerHTML = resultadosHTML(el.value);
    } else if (el.name === 'gp' && el.form && el.form.elements.k100) {
      // producto escaneado: recalcula la porción a partir de los valores por 100 g
      const F = el.form.elements, gp = num(el.value);
      if (gp > 0) {
        const r = (x) => (num(x) == null ? '' : String(Math.round((num(x) * gp) / 100 * 10) / 10).replace('.', ','));
        if (num(F.k100.value) != null) F.k.value = Math.round((num(F.k100.value) * gp) / 100);
        F.pr.value = r(F.pr100.value); F.c.value = r(F.c100.value); F.g.value = r(F.g100.value);
        F.p.value = `1 porción (${fmtN(gp)} ${F.u.value || 'g'})`;
      }
    } else if (el.id === 'fg') {
      sheet.gr = num(el.value) || 0;
      $('#fprev').textContent = prevTxt(sheet.food, sheet.gr / sheet.food.gp);
    } else if (el.id === 'fq') {
      sheet.q = num(el.value) || 1;
      $('#fprev').textContent = prevTxt(sheet.food, sheet.q);
    } else if (el.dataset.rf && rDraft) {
      const f = el.dataset.rf;
      if (el.dataset.i !== undefined) rDraft.ejercicios[+el.dataset.i][f] = el.value;
      else rDraft[f] = el.type === 'checkbox' ? el.checked : el.value;
    } else if (el.dataset.f) {
      const { s } = setData(el);
      s[el.dataset.f] = el.value;
      save();
    } else if (el.dataset.c) {
      const lg = getLog(ctx.date, ctx.sid, true), k = el.dataset.key;
      lg.cardio[k] = lg.cardio[k] || {};
      if (el.dataset.c === 'tmin' || el.dataset.c === 'tseg') {
        const card = el.closest('.cardio');
        const mm = num(card.querySelector('[data-c="tmin"]').value), ss = num(card.querySelector('[data-c="tseg"]').value);
        lg.cardio[k].min = mm == null && ss == null ? null : (mm || 0) + Math.min(59, ss || 0) / 60;
      } else lg.cardio[k][el.dataset.c] = num(el.value);
      save();
    } else if (el.dataset.fin) {
      const lg = getLog(ctx.date, ctx.sid, true), f = el.dataset.fin;
      lg[f] = f === 'notas' ? el.value : +el.value;
      if (f === 'rpe') $('#rpeV').textContent = `${el.value} · ${['', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Algo duro', 'Duro', 'Muy duro', 'Durísimo', 'Máximo'][el.value]}`;
      if (f === 'rodilla') $('#rodV').textContent = el.value;
      save();
    }
  });
  main.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.actChange === 'ejsel') { ejSel = el.value; rerender(); }
    if (el.dataset.rf === 'calent' && rDraft) rDraft.calent = el.checked;
    if (el.id === 'bcfoto' && el.files[0]) leerFoto(el.files[0]);
    if (el.id === 'fimport' && el.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!d.perfil || !d.logs) throw new Error('formato');
          if (!confirm('Esto reemplaza tus datos actuales por los del respaldo. ¿Continuar?')) return;
          S = { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [], ...d };
          save(true); toast('Respaldo importado'); rerender();
        } catch (err) { toast('Archivo no válido'); }
      };
      r.readAsText(el.files[0]);
    }
  });
  main.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'fperfil') {
      const first = !S.perfil;
      const perfil = { edad: num(d.edad), sexo: d.sexo, estatura: num(d.estatura), peso: num(d.peso), metaMin: Math.min(num(d.metaMin), num(d.metaMax)), metaMax: Math.max(num(d.metaMin), num(d.metaMax)), inicio: d.inicio };
      S.perfil = perfil;
      if (first) addPeso(today() < d.inicio ? today() : d.inicio, d.peso);
      save(true);
      toast(first ? '¡Plan creado! 💪' : 'Perfil guardado');
      location.hash = '#/hoy';
      if (first) route();
    } else if (f.id === 'fcustom') {
      const a = guardarAlimento(d);
      toast(d.bc ? 'Producto guardado en Mis alimentos ✓' : 'Alimento guardado ✓');
      Object.assign(sheet, { custom: false, draft: null, food: a, q: 1, mode: 'u', gr: a.gp || 100 });
      renderSheet();
    } else if (f.id === 'fpropio') {
      guardarAlimento(d);
      toast('Alimento actualizado ✓');
      location.hash = '#/alimentos';
    } else if (f.id === 'fejp') {
      S.ejPropios.push({ id: 'x' + Date.now().toString(36), nombre: d.nombre.trim(), peso: !!d.peso, tiempo: !!d.tiempo });
      save(true);
      toast('Ejercicio agregado');
      rerender();
    } else if (f.id === 'fcamina' || f.id === 'fcamina2') {
      if (!num(d.pasos) && !num(d.km)) { toast('Ingresa los pasos o la distancia'); return; }
      addCaminata(d);
      toast('Caminata registrada 🚶');
      rerender();
    } else if (f.id === 'fpeso' || f.id === 'fpesoHoy') {
      addPeso(d.fecha || today(), d.kg, d.cintura);
      toast('Peso registrado');
      rerender();
    }
  });
  $('#timer-skip').onclick = stopTimer;
  $('#timer-add').onclick = () => { timer.end += 15000; timer.total += 15; };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ctx.date) keepAwake(true); });
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installEvt = e; });
  navigator.storage?.persist?.().catch(() => {});
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // Si llega una versión nueva mientras la app está abierta, recarga una vez para mostrarla
    const habia = !!navigator.serviceWorker.controller;
    let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (habia && !recargado) { recargado = true; save(true); location.reload(); }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', init);

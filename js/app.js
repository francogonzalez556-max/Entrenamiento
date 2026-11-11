/* ============================================================
   App de entrenamiento — lógica principal
   ============================================================ */
const KEY = 'entreno_v1';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ---------- Estado ---------- */
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') return { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [], reemplazos: [], descargas: {}, medidas: [], ajustes: {}, ...s };
  } catch (e) { /* sin almacenamiento */ }
  return { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [], reemplazos: [], descargas: {}, medidas: [], ajustes: {} };
}
let S = load();
// Perfiles creados antes del perfilamiento (v1) corresponden al plan original: se completan con esos valores
function migrarPerfil() {
  const p = S.perfil;
  if (!p || p.v >= 2) return;
  Object.assign(p, { v: 2, nombre: p.nombre || '', objetivo: 'bajar', actividad: 'ligero', nivel: 'intermedio_bajo', lugar: 'casa', equipo: ['mancuernas', 'barra', 'eliptica'], mancMax: 30, dias: [2, 3, 4, 5], dur: 45, limit: ['rodillas'], revisar: true });
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ }
}
migrarPerfil();
if (!S.acceso && S.perfil) { S.acceso = { tipo: 'total', desde: 'existente' }; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
const _planes = {};
const cicloHoy = () => (S.perfil?.inicio ? weekInfo(today()).ciclo : 1);
// cada ciclo de 12 semanas rota los ejercicios (ciclo 1 = plan base)
function PLAN(ciclo = cicloHoy()) {
  const p = S.perfil || {};
  const enf = p.inicio ? enfoqueActivo(p) : null;
  const k = JSON.stringify([p.objetivo, p.dias, p.lugar, p.equipo, p.nivel, p.dur, p.limit, ciclo, enf?.areas || null, !!p.autoVol, p.asignacion || null]);
  if (!_planes[k]) {
    let pl = generarPlan(p, ciclo);
    if (enf || p.autoVol) pl = ajustarVolumen(pl, p, enf?.areas || []);
    if (p.asignacion) pl = aplicarAsignacion(structuredClone(pl), p.asignacion);
    _planes[k] = pl;
  }
  return _planes[k];
}
// Cambios permanentes de día: { sid: díaSemana }
function aplicarAsignacion(pl, asg) {
  for (const [sid, d] of Object.entries(asg)) if (pl.ses[sid]) pl.ses[sid].dow = +d;
  const lun = (d) => (d + 6) % 7;
  pl.orden.sort((a, b) => lun(pl.ses[a].dow) - lun(pl.ses[b].dow));
  pl.dowSid = {};
  for (const sid of pl.orden) pl.dowSid[pl.ses[sid].dow] = sid;
  pl.dias = pl.orden.map((sid) => pl.ses[sid].dow);
  return pl;
}
// Día de una sesión en una semana concreta (incluye cambios "solo esta semana")
const diaDe = (sid, week) => (S.movidas?.[week]?.[sid] ?? PLAN().ses[sid]?.dow);
const sidDelDia = (dow, week) => PLAN().orden.find((sid) => diaDe(sid, week) === dow);
const ordenSemana = (week) => [...PLAN().orden].sort((a, b) => ((diaDe(a, week) + 6) % 7) - ((diaDe(b, week) + 6) % 7));
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
function objetivos(p = S.perfil, kg = pesoActual()) {
  const menor = p.edad < 18;
  // adultos: Mifflin-St Jeor · menores de 18: Schofield (validada para 10-18 años)
  const bmr = menor ? (p.sexo === 'M' ? 17.686 * kg + 658.2 : 13.384 * kg + 692.6) : 10 * kg + 6.25 * p.estatura - 5 * p.edad + (p.sexo === 'M' ? 5 : -161);
  const act = { sedentario: 1.25, ligero: 1.4, activo: 1.55, muy: 1.7 }[p.actividad] || 1.4;
  const metF = { lento: 0.93, rapido: 1.07 }[p.metabolismo] || 1;
  const tdeeForm = bmr * act * metF;
  // con suficientes registros de peso y comida se usa el gasto real (60%) mezclado con la fórmula (40%)
  const real = p === S.perfil && p.calibrar !== false ? metabolismoReal(bmr * act, tdeeForm) : null;
  const tdee = real?.tdee ? real.tdee * 0.6 + tdeeForm * 0.4 : tdeeForm;
  const m2 = Math.pow(p.estatura / 100, 2), imc = kg / m2;
  const embarazo = p.parq?.embarazo === true, bajoPeso = imc < 18.5;
  let adj = { bajar: imc < 22 ? -0.1 : -0.2, musculo: 0.1, tonificar: 0, cardio: imc > 25 ? -0.1 : 0, salud: imc > 25 ? -0.1 : 0 }[p.objetivo] ?? -0.2;
  // sin déficit: menores (crecimiento), embarazo o posparto, y bajo peso (IMC < 18,5)
  if (menor || embarazo || bajoPeso) adj = Math.max(0, adj);
  let kcal = Math.max(Math.round((tdee * (1 + adj)) / 50) * 50, menor ? Math.round(tdee / 50) * 50 : p.sexo === 'M' ? 1800 : 1400);
  // el déficit total nunca supera el 25% del gasto (el metabolismo "lento" declarado no se suma sin límite)
  if (adj < 0) kcal = Math.max(kcal, Math.ceil(((real?.tdee && !real.fuera ? tdee : bmr * act) * 0.75) / 50) * 50);
  const meta = p.metaMin && p.metaMax ? (p.metaMin + p.metaMax) / 2 : null;
  // peso de referencia para proteína: la meta al bajar, o un peso razonable si hay sobrepeso
  const ref = p.objetivo === 'bajar' && meta ? meta : Math.min(kg, 27.5 * m2);
  const pf = menor ? 1.3 : { musculo: 2.0, bajar: 1.8 }[p.objetivo] || 1.6;
  const prot = Math.round((ref * pf) / 5) * 5;
  const grasa = Math.round(Math.max(ref * 0.7, (kcal * 0.25) / 9) / 5) * 5;
  const carb = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4 / 5) * 5);
  return { kg, bmr: Math.round(bmr), tdee: Math.round(tdee / 10) * 10, tdeeForm: Math.round(tdeeForm / 10) * 10, metF, real, kcal, prot, grasa, carb, agua: Math.min(3.5, r1(kg * 0.03)), adj, menor, embarazo, bajoPeso, imc };
}
/* Gasto real = lo que comiste en promedio − lo que cambió tu peso (7.700 kcal ≈ 1 kg).
   Requiere ≥14 días entre pesajes (últimas 5 semanas) y comida anotada en ≥80% de esos días. */
function metabolismoReal(tdeePromedio, tdeeForm) {
  const hoy = today();
  const ps = [...(S.pesos || [])].filter((x) => dayDiff(x.fecha, hoy) <= 35).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (ps.length < 2) return { faltan: 'pesos' };
  const span = dayDiff(ps[0].fecha, ps[ps.length - 1].fecha);
  if (span < 14) return { faltan: 'dias', span };
  let n = 0, suma = 0, bajos = 0;
  for (let i = 0; i <= span; i++) {
    const k = totales(diaComidas(iso(addDays(parse(ps[0].fecha), i)))).k;
    if (k >= 800) { n++; suma += k; } else if (k > 0) bajos++;
  }
  if (n / (span + 1) < 0.8) return { faltan: 'comidas', n, span, bajos };
  const xs = ps.map((x) => dayDiff(ps[0].fecha, x.fecha)), ys = ps.map((x) => x.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const pend = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const ingesta = suma / n, tdee = ingesta - pend * 7700;
  if (tdee < tdeeForm * 0.7 || tdee > tdeeForm * 1.35) return { fuera: true, n, ingesta, tdee, bajos };
  const ratio = tdee / tdeePromedio;
  return { tdee, n, ingesta, ritmoSem: pend * 7, clase: ratio < 0.93 ? 'más lento' : ratio > 1.07 ? 'más rápido' : 'normal', ratio, bajos };
}
function textoMetabolismo(o) {
  const p = S.perfil, m = PERFIL_OPC.metabolismo.find((x) => x[0] === (p.metabolismo || 'normal'));
  const r = o.real || {};
  let t = `<p><b>Metabolismo declarado:</b> ${m[1]} ${m[2]}${o.metF !== 1 ? ` (${o.metF > 1 ? '+' : '−'}${Math.round(Math.abs(o.metF - 1) * 100)}% sobre la fórmula)` : ''}. Cámbialo en Mi perfil y objetivos.</p>`;
  if (p.calibrar === false) t += '<p class="small muted">La calibración con tus registros está desactivada.</p>';
  else if (r.tdee && !r.fuera) t += `<p><b>Gasto real según tus registros:</b> ~${Math.round(r.tdee / 10) * 10} kcal/día. Comiste en promedio ${Math.round(r.ingesta)} kcal en ${r.n} días anotados y tu peso cambió ${fmtN(r.ritmoSem, 2)} kg/semana. Tu metabolismo parece <b>${r.clase}</b> que el promedio para tu tamaño y actividad. Tu meta combina 60% este dato real + 40% la fórmula.</p>`;
  else if (r.fuera) t += '<p class="small muted">Tus registros dan un gasto muy distinto al esperado, probablemente por comidas sin anotar o pesajes en distinta condición. Por ahora se usa la fórmula.</p>';
  else t += `<p class="small muted">Para calcular tu gasto real necesito ${r.faltan === 'pesos' ? 'al menos 2 pesajes' : r.faltan === 'dias' ? 'pesajes separados por al menos 2 semanas' : `tus comidas anotadas en al menos 80% de los días (llevas ${r.n} de ${r.span + 1})`}. Anota todo lo que comes, incluidas bebidas y salsas.</p>`;
  if (p.calibrar !== false && r.bajos >= 3) t += `<p class="small warn-t">Hay ${r.bajos} días con menos de 800 kcal anotadas: no se usan para calibrar. Si fueron registros incompletos, complétalos; si comiste así de poco, revisa los avisos de tu alimentación.</p>`;
  return t + `<button class="btn small-btn" data-act="calibrar">${p.calibrar === false ? 'Usar mis registros para calibrar' : 'No usar mis registros'}</button>`;
}
const textoMeta = (o) => (o.menor
  ? 'Como eres menor de 18, tu meta es de mantención (sin déficit): en crecimiento lo importante es comer bien y moverse.'
  : o.embarazo ? 'Durante el embarazo y los 6 meses después del parto tu meta es de mantención (sin déficit). Tu matrona, médico o nutricionista te indicará cuánto ajustar.'
  : o.bajoPeso ? `Tu IMC (${fmtN(o.imc)}) está bajo 18,5, así que la app no aplica déficit. Si quieres cambiar tu cuerpo, el foco es ganar fuerza; te recomendamos consultar a un nutricionista.`
  : o.adj < 0 ? `Tu meta tiene un déficit de ~${Math.round((1 - o.kcal / o.tdee) * 100)}% para bajar de forma sostenible (unos 0,5–0,8 kg por semana, sin pasar del 1% de tu peso).`
    : o.adj > 0 ? 'Tu meta tiene un superávit de ~10% para ganar músculo sin acumular mucha grasa.'
      : 'Tu meta es de mantención: comer lo mismo que gastas.') + ' Se recalcula sola con tu último peso.';
const tieneLimit = (x) => (S.perfil?.limit || []).includes(x);
function puedoHacer(id, p = S.perfil) {
  if (!p) return true;
  const eq = equipoDe(p);
  if (META[id]) return disponible(id, p, eq);
  if (['eliptica', 'bicicleta', 'trotadora'].includes(id)) return eq.has(id);
  return true;
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
  const ps = S.perfil && PLAN().ses[sid];
  if (ps) return ps;
  const r = getRutina(sid);
  return r ? { nombre: r.nombre, foco: 'Rutina personalizada', dur: '', rutina: r } : null;
}
const nombreSes = (l) => getSes(l.sid)?.nombre || l.nombre || 'Sesión';

/* ---------- Sesiones ---------- */
const reemplazoDe = (id, date) => (S.reemplazos || []).find((r) => r.de === id && date >= r.desde)?.a;
function itemsDe(sid, wi, date) {
  const out = [];
  const rut = getRutina(sid);
  if (rut) {
    if (rut.calent) out.push({ k: 'warm', corto: false });
    for (const e of rut.ejercicios) {
      const reps = String(e.reps || '10').trim();
      out.push({ k: 'ex', id: e.id, sets: Math.max(1, num(e.sets) || 3), reps: esTiempo(getEj(e.id)) && /^\d+(\s*-\s*\d+)?$/.test(reps) ? reps + ' s' : reps, rest: num(e.rest) || 60 });
    }
    if (num(rut.cardio)) out.push({ k: 'cardio', key: 'libre', rx: { titulo: `${PLAN().cardio.label} · ${num(rut.cardio)} min`, min: num(rut.cardio), detalle: 'Ritmo a elección (zona 2 recomendada).', zona: 'z2' } });
  } else {
    const PL = PLAN(wi.ciclo), ses = PL.ses[sid];
    if (!ses) return out;
    const aj = date ? ajusteSesion(date, sid) : { menos: 0 };
    const desc = wi.deload || !!(S.descargas || {})[wi.week];
    const prec = !!S.perfil?.precaucion;
    const expres = !!(date && S.logs[`${date}|${sid}`]?.expres);
    // descarga: ~40-50% menos series (mín. 2) y sin intervalos intensos
    const seriesDesc = (n) => (desc ? Math.max(2, Math.round(n * 0.6)) : n);
    for (const b of ses.bloques) {
      if (b.tipo === 'calentamiento') out.push({ k: 'warm', corto: !!b.corto });
      else if (b.tipo === 'ej') {
        const r = b.rx[wi.phase - 1];
        if (r) out.push({ k: 'ex', id: b.id, sets: Math.max(1, seriesDesc(r[0]) - aj.menos - (expres && r[0] > 2 ? 1 : 0)), reps: r[1], rest: r[2], enf: b.aj, ss: b.ss });
      } else if (b.tipo === 'cardio') {
        const kind = (prec || desc) && b.kind === 'intervalos' ? 'z2' : b.kind;
        const rx = cardioRx(kind, wi.wk, PL.cardio, PL.cardioF);
        if (expres && b.kind === 'final') { rx.min = Math.max(5, Math.round(rx.min / 2)); rx.titulo = `${PL.cardio.label} final · ${rx.min} min (exprés)`; }
        out.push({ k: 'cardio', key: b.kind, rx });
      } else if (b.tipo === 'circuito') {
        const i = wi.phase - 1;
        const rondas = Math.max(1, seriesDesc(b.rondas[i]) - aj.menos);
        const ejs = b.ejercicios.filter((e) => e.fases.includes(wi.phase));
        // modo precaución: pausas dobles en el circuito
        const pausa = prec ? b.pausa[i] * 2 : b.pausa[i], entre = prec ? b.entreRondas[i] + 30 : b.entreRondas[i];
        out.push({ k: 'circ', rondas, trabajo: b.trabajo[i], pausa, entre, nEj: ejs.length, prec });
        for (const e of ejs) out.push({ k: 'ex', id: e.id, sets: rondas, reps: b.trabajo[i], rest: pausa, circ: true });
      }
    }
    // dolor en rojo: los ejercicios que cargan esa zona se cambian por uno isométrico o sin dolor
    if (date && aj.zonas && !S.logs[`${date}|${sid}`]?.dolorOk) {
      const enSesion = new Set(out.filter((x) => x.k === 'ex').map((x) => x.id));
      for (const it of out) {
        if (it.k !== 'ex' || it.circ) continue;
        const z = zonasDeEj(it.id).find((x) => aj.zonas[x] === 'rojo');
        if (!z || PATRON[it.id] === 'rodilla') continue;
        const alt = (ISO_ZONA[z] || []).find((x) => META[x] && !enSesion.has(x) && disponible(x, S.perfil, equipoDe(S.perfil)));
        if (!alt) { it.avisoDolor = z; continue; }
        enSesion.add(alt);
        it.orig = it.id; it.id = alt; it.autoDolor = z;
        const enSeg = /s\s*$/.test(String(it.reps));
        if (esTiempo(getEj(alt)) && !enSeg) it.reps = '30 s';
        else if (!esTiempo(getEj(alt)) && enSeg) it.reps = '10-12';
      }
    }
  }
  // cambios de ejercicio: los de esta sesión y los "usar siempre"
  if (date) {
    const lg = S.logs[`${date}|${sid}`];
    for (const it of out) {
      if (it.k !== 'ex' || it.autoDolor) continue;
      const a2 = lg?.subs?.[it.id] || reemplazoDe(it.id, date);
      if (a2 && a2 !== it.id && (EJERCICIOS[a2] || S.ejPropios.some((e) => e.id === a2))) {
        it.orig = it.id; it.id = a2;
        // si cambia de repeticiones a tiempo (o al revés), usa una prescripción acorde
        const enSeg = /s\s*$/.test(String(it.reps));
        if (esTiempo(getEj(a2)) && !enSeg) it.reps = '30 s';
        else if (!esTiempo(getEj(a2)) && enSeg && !it.circ) it.reps = '10-12';
      }
    }
  }
  return out;
}
// Ajuste automático según la última sesión, días sin entrenar y esfuerzo acumulado
function ajusteSesion(date, sid) {
  // factor = ajuste de peso para todos; zonaFactor = solo para los ejercicios de una zona con dolor
  const res = { menos: 0, factor: 1, msgs: [], sugDescarga: false, zonas: null, zonaFactor: {} };
  const prev = logsOrdenados().filter((l) => l.done && l.fecha < date);
  const b = bienestarDe(date);
  // sueño y estrés del día (chequeo de bienestar)
  if (b?.sueno != null && b.sueno < 6) { res.menos = 1; res.msgs.push('Dormiste menos de 6 horas: hoy 1 serie menos por ejercicio y deja 2-3 repeticiones en reserva. Entrenar cansado aumenta el riesgo de lesión.'); }
  const ayerD = iso(addDays(parse(date), -1));
  const depFuerte = (S.deportes || []).filter((e) => (e.fecha === ayerD || e.fecha === date) && e.int === 3 && e.min >= 45 && depInfo(e).impacto >= 1);
  if (depFuerte.length) {
    const e = depFuerte[0];
    res.menos = Math.max(res.menos, 1);
    res.msgs.push(`${e.fecha === date ? 'Hoy' : 'Ayer'} hiciste ${depInfo(e).corto.toLowerCase()} intenso (${e.min} min): hoy 1 serie menos por ejercicio para recuperar. Si te sientes muy cargado, cambia la sesión por cardio suave.`);
  }
  if (b?.estres === 3) res.msgs.push('Estrés alto hoy: está bien hacer una sesión más liviana. Moverte igual ayuda a bajarlo.');
  if (!prev.length) return res;
  const dias = dayDiff(prev[prev.length - 1].fecha, date);
  const mismo = [...prev].reverse().find((l) => l.sid === sid);
  if (dias >= 10) {
    res.menos = 1; res.factor = 0.9;
    res.msgs.push(`Vuelves después de ${dias} días: hoy 1 serie menos y ~10% menos peso para retomar con menos riesgo.`);
  } else if (mismo && mismo.rpe >= 9) {
    res.factor = 0.9;
    res.msgs.push('La última vez esta sesión fue muy dura (esfuerzo 9-10): hoy baja ~10% el peso.');
  } else if (mismo && mismo.rpe <= 4) {
    res.msgs.push('La última vez fue fácil: si completas las series, sube el peso sin miedo.');
  }
  // semáforo de dolor por zona (sesiones de cualquier tipo de las últimas 3 semanas)
  let dolorAlza = false;
  for (const z of zonasUsuario()) {
    const s = semaforoDolor(z, date);
    if (s.nivel === 'verde') continue;
    dolorAlza = true;
    res.zonas = res.zonas || {};
    res.zonas[z] = s.nivel;
    const nom = ZONAS[z].toLowerCase();
    if (s.nivel === 'amarillo') {
      if (z === 'general') res.factor = Math.min(res.factor, 0.9); else res.zonaFactor[z] = 0.9;
      res.msgs.push(`🟡 ${s.peor ? `Tu ${nom} amaneció peor después de la última sesión` : `Tu molestia de ${nom} está en ${s.v}/10 o subiendo`}: en los ejercicios que la cargan baja ~10% el peso y acorta el rango donde moleste; prioriza los isométricos.`);
    } else {
      res.msgs.push(`🔴 Tu ${nom} marcó ${s.v}/10: hoy cambiamos los ejercicios que la cargan por versiones isométricas o sin dolor. Si no mejora en 1-2 semanas, consulta a un kinesiólogo.`);
    }
  }
  // descarga: RPE muy alto sostenido, o 2 señales de fatiga (esfuerzo, sueño, dolor en alza)
  const wi = weekInfo(date);
  const rec = prev.filter((l) => dayDiff(l.fecha, date) <= 14);
  const rpeProm = rec.length ? rec.reduce((x, l) => x + (l.rpe || 6), 0) / rec.length : 0;
  const senales = [rec.length >= 3 && rpeProm >= 8, nochesCortas(date) >= 3, dolorAlza].filter(Boolean).length;
  if (((rec.length >= 4 && rpeProm >= 8.5) || senales >= 2) && !wi.deload && !(S.descargas || {})[wi.week]) res.sugDescarga = true;
  return res;
}
const e1rm = (w, r) => (r <= 1 ? w : w * (1 + Math.min(r, 12) / 30));
function esRecord(id, set) {
  const w = num(set.w), r = num(set.r);
  if (!r) return null;
  const ex = getEj(id);
  let best = 0;
  for (const l of Object.values(S.logs)) {
    for (const x of l.ex[id]?.sets || []) {
      if (x === set || !x.ok) continue;
      best = Math.max(best, usaPeso(ex) && w ? (num(x.w) ? e1rm(num(x.w), num(x.r) || 0) : 0) : num(x.r) || 0);
    }
  }
  if (!best) return null;
  if (usaPeso(ex) && w) {
    const e = e1rm(w, r);
    return e > best + 0.05 ? `🏆 ¡Récord en ${ex.nombre}! Fuerza estimada (1RM): ${fmtN(e)} kg` : null;
  }
  return r > best ? `🏆 ¡Récord de ${esTiempo(ex) ? 'tiempo' : 'repeticiones'} en ${ex.nombre}!` : null;
}
const logKey = (date, sid) => `${date}|${sid}`;
function getLog(date, sid, create) {
  const k = logKey(date, sid);
  if (!S.logs[k] && create) {
    const wi = weekInfo(date);
    S.logs[k] = { sid, nombre: getSes(sid)?.nombre, fecha: date, week: wi.week, phase: wi.phase, ex: {}, cardio: {}, warm: false, rpe: 6, rodilla: 0, dolor: Object.fromEntries(zonasUsuario().map((z) => [z, 0])), notas: '', done: false };
  }
  return S.logs[k];
}
const logsOrdenados = () => Object.values(S.logs).sort((a, b) => a.fecha.localeCompare(b.fecha));
function ultimaVez(id, antesDe) {
  const L = logsOrdenados().filter((l) => l.fecha < antesDe && l.ex[id] && l.ex[id].sets.some((s) => s.ok));
  return L.length ? { fecha: L[L.length - 1].fecha, sets: L[L.length - 1].ex[id].sets.filter((s) => s.ok), rir: L[L.length - 1].ex[id].rir } : null;
}
// tren superior: saltos de carga más chicos (≤10%); tren inferior ≤15%
const PATRON_SUP = ['empujeH', 'empujeV', 'hombroL', 'tironH', 'tironV', 'biceps', 'triceps'];
// tope de peso del implemento (mancuernas del perfil)
function topePeso(ex) {
  const m = num(S.perfil?.mancMax);
  return m && S.perfil?.lugar === 'casa' && /mancuerna/i.test(ex.equipo || '') && !/barra/i.test(ex.equipo || '') ? m : null;
}
function sugerencia(id, it, last, rir) {
  const ex = getEj(id);
  let [lo, hi] = rango(it.reps);
  // reps fijas (ej. "12") se leen como rango (10-12) para la doble progresión
  if (lo === hi && !/s\s*$/.test(String(it.reps)) && hi > 4) lo = hi - 2;
  if (!last) {
    return { w: null, txt: usaPeso(ex) ? 'Primera vez: elige un peso con el que podrías hacer 2-3 repeticiones más al terminar.' : 'Primera vez: concéntrate en la técnica.' };
  }
  const w = Math.max(0, ...last.sets.map((s) => num(s.w) || 0)) || null;
  // para subir hay que completar TODAS las series prescritas en el tope del rango
  const todas = last.sets.length >= it.sets && last.sets.every((s) => (num(s.r) || 0) >= hi);
  if (todas) {
    if (usaPeso(ex) && w) {
      if (rir != null && rir < 2) return { w, txt: `Completaste todo, pero con poca reserva (${rir} en reserva). Repite ${fmtN(w)} kg hasta que te queden 2 o más repeticiones.` };
      const nw = w + ex.step, tope = topePeso(ex);
      if (tope && nw > tope) return { w, txt: `Llegaste al tope de tus mancuernas (${fmtN(tope)} kg). Progresa sumando 1-2 repeticiones, una pausa de 2 s abajo o bajando en 3 s.`, up: true };
      const salto = ex.step / w, lim = PATRON_SUP.includes(PATRON[id]) ? 0.1 : 0.15;
      const superado = last.sets.every((s) => (num(s.r) || 0) >= hi + 2);
      if (salto > lim && !superado) return { w, txt: `¡Completaste todo! El siguiente salto (+${fmtN(ex.step)} kg) es grande (+${Math.round(salto * 100)}%): antes suma 1-2 repeticiones por serie (hasta ${hi + 2}) o baja en 3 s. Cuando lo logres, sube a ${fmtN(nw)} kg.`, up: true };
      return { w: nw, txt: `¡Completaste todo la última vez! Prueba con ${fmtN(nw)} kg.${ex.nota ? ' ' + ex.nota : ''}`, up: true };
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

/* ---- Perfilamiento (asistente) ---- */
let wz = null, wzPaso = 0;
const WZ_PASOS = ['Tus datos', 'Objetivo', 'Dónde', 'Tiempo', 'Cuidados', 'Salud', 'Tu plan'];
function wzInit() {
  const p = S.perfil || {};
  wz = {
    nombre: p.nombre || '', edad: p.edad ?? '', sexo: p.sexo || 'M', estatura: p.estatura ?? '', peso: S.perfil ? pesoActual() : '',
    metaMin: p.metaMin ?? '', metaMax: p.metaMax ?? '', objetivo: p.objetivo || '', actividad: p.actividad || 'ligero', metabolismo: p.metabolismo || 'normal',
    nivel: p.nivel || '', lugar: p.lugar || '', equipo: [...(p.equipo || [])], mancMax: p.mancMax ?? '',
    dias: [...(p.dias || [])], dur: p.dur || 45, limit: [...(p.limit || [])], inicio: p.inicio || today(),
    parq: p.parq?.resp ? [...p.parq.resp] : PARQ.map(() => null), embarazo: p.parq?.embarazo ?? null,
  };
  wzPaso = 0;
}
function perfilDesdeWz() {
  const w = wz, old = S.perfil || {};
  const m1 = num(w.metaMin), m2 = num(w.metaMax);
  const conMeta = ['bajar', 'musculo'].includes(w.objetivo) && m1 && m2 && num(w.edad) >= 18;
  return {
    v: 2, nombre: String(w.nombre || '').trim(), edad: num(w.edad), sexo: w.sexo, estatura: num(w.estatura),
    peso: old.peso ?? num(w.peso), metaMin: conMeta ? Math.min(m1, m2) : null, metaMax: conMeta ? Math.max(m1, m2) : null,
    objetivo: w.objetivo, actividad: w.actividad, metabolismo: w.metabolismo, calibrar: old.calibrar, nivel: w.nivel, lugar: w.lugar,
    equipo: w.lugar === 'casa' ? w.equipo : [], mancMax: num(w.mancMax),
    dias: [...w.dias].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)), dur: w.dur, limit: w.limit, inicio: w.inicio || today(),
    asignacion: JSON.stringify([...w.dias].sort()) === JSON.stringify([...(old.dias || [])].sort()) ? old.asignacion : undefined,
    parq: { resp: w.parq, embarazo: necesitaEmbarazo(w) ? w.embarazo : null, fecha: today() },
    precaucion: w.parq.some((x) => x === true) || (necesitaEmbarazo(w) && w.embarazo === true),
  };
}
function wzValidar() {
  const w = wz;
  if (wzPaso === 0) {
    if (!(num(w.edad) >= 10 && num(w.edad) <= 99)) return 'Ingresa tu edad';
    if (!(num(w.estatura) >= 120 && num(w.estatura) <= 230)) return 'Ingresa tu estatura en cm (ej: 175)';
    if (!(num(w.peso) >= 30 && num(w.peso) <= 300)) return 'Ingresa tu peso en kg';
  }
  if (wzPaso === 1 && !w.objetivo) return 'Elige tu objetivo';
  if (wzPaso === 1 && num(w.edad) >= 18 && ['bajar', 'musculo'].includes(w.objetivo)) {
    // el peso meta no puede quedar bajo un peso saludable (IMC 18,5; 20 desde los 65 años)
    const m = Math.min(...[num(w.metaMin), num(w.metaMax)].filter((x) => x > 0)), est = num(w.estatura) / 100;
    const imcMin = num(w.edad) >= 65 ? 20 : 18.5, kgMin = Math.ceil(imcMin * est * est);
    if (isFinite(m) && m < kgMin) return `Tu peso meta queda bajo un peso saludable para tu estatura: elige al menos ${kgMin} kg`;
  }
  if (wzPaso === 2 && !w.lugar) return 'Elige dónde entrenas';
  if (wzPaso === 5) return parqCompleto(w);
  if (wzPaso === 3) {
    if (!w.nivel) return 'Elige tu nivel';
    if (w.dias.length < 2 || w.dias.length > 6) return 'Elige entre 2 y 6 días';
  }
  return null;
}
function vWizard(first) {
  if (!wz) wzInit();
  const w = wz, paso = wzPaso;
  const chip = (f, v, label, multi) => {
    const on = multi ? w[f].includes(v) : w[f] === v;
    return `<button type="button" class="chip ${on ? 'on' : ''}" data-act="wzset" data-f="${f}" data-v="${v}"${multi ? ' data-multi="1"' : ''}>${label}</button>`;
  };
  const card = (f, v, ico, t, d) => `<button type="button" class="opt ${w[f] === v ? 'on' : ''}" data-act="wzset" data-f="${f}" data-v="${v}">${ico ? `<span class="opt-i">${ico}</span>` : ''}<span class="opt-t"><b>${t}</b><small>${d}</small></span></button>`;
  const inp = (f, label, mode = 'decimal', ph = '') => `<label>${label}<input data-wz="${f}" type="text" inputmode="${mode}" value="${esc(w[f])}" placeholder="${ph}"></label>`;
  let body = '';
  if (paso === 0) {
    body = `<h2>¿Quién eres?</h2><p class="muted small">Con esto calculamos tus calorías y zonas de pulso. Todo queda solo en este teléfono.</p>
      <label>Nombre (opcional)<input data-wz="nombre" value="${esc(w.nombre)}" placeholder="¿Cómo te llamas?"></label>
      <div class="row2">${inp('edad', 'Edad', 'numeric')}<div><span class="lbl">Sexo</span><div class="chips2">${chip('sexo', 'M', 'Hombre')}${chip('sexo', 'F', 'Mujer')}</div></div></div>
      <div class="row2">${inp('estatura', 'Estatura (cm)', 'numeric', 'ej: 175')}${inp('peso', 'Peso actual (kg)', 'decimal', 'ej: 80,5')}</div>`;
  } else if (paso === 1) {
    body = `<h2>¿Qué quieres lograr?</h2><div class="opts">${PERFIL_OPC.objetivos.map((o) => card('objetivo', ...o)).join('')}</div>
      ${['bajar', 'musculo'].includes(w.objetivo) && num(w.edad) >= 18 ? `<h3 class="mt">Peso meta (opcional)</h3><div class="row2">${inp('metaMin', 'Desde (kg)')}${inp('metaMax', 'Hasta (kg)')}</div>` : ''}
      ${num(w.edad) < 18 && w.objetivo === 'bajar' ? '<div class="infobanner mt">En crecimiento no fijamos un peso meta: el plan se enfoca en fuerza, cardio y buenos hábitos, sin déficit de calorías.</div>' : ''}
      <h3 class="mt">Tu día a día (sin contar el entrenamiento)</h3><div class="opts compact">${PERFIL_OPC.actividad.map((o) => card('actividad', o[0], '', o[1], o[2])).join('')}</div>
      <h3 class="mt">¿Cómo es tu metabolismo?</h3><p class="small muted">Según tu experiencia. Si no lo sabes, la app lo calculará con tus registros de peso y comida.</p>
      <div class="opts compact">${PERFIL_OPC.metabolismo.map((o) => card('metabolismo', ...o)).join('')}</div>`;
  } else if (paso === 2) {
    body = `<h2>¿Dónde entrenas?</h2><div class="opts two">${card('lugar', 'casa', '🏠', 'En casa', 'Con lo que tengas')}${card('lugar', 'gimnasio', '🏋️', 'Gimnasio', 'Máquinas, poleas y pesas')}</div>
      ${w.lugar === 'casa' ? `<h3 class="mt">¿Qué tienes en casa?</h3><p class="small muted">Marca todo lo que tengas. Si no tienes nada, igual armamos tu plan con peso corporal.</p>
        <div class="chips">${PERFIL_OPC.equipo.map(([v, i, l]) => chip('equipo', v, `${i} ${l}`, true)).join('')}</div>
        ${w.equipo.includes('mancuernas') ? inp('mancMax', 'Peso máximo de tus mancuernas (kg cada una)', 'decimal', 'ej: 20') : ''}` : ''}
      ${w.lugar === 'gimnasio' ? '<p class="small muted mt">Usaremos máquinas, poleas, barras, mancuernas y las máquinas de cardio del gimnasio.</p>' : ''}`;
  } else if (paso === 3) {
    body = `<h2>Tu nivel y tu tiempo</h2><div class="opts compact">${PERFIL_OPC.niveles.map((o) => card('nivel', o[0], '', o[1], o[2])).join('')}</div>
      <h3 class="mt">¿Qué días vas a entrenar?</h3><p class="small muted">Elige entre 2 y 6 días (${w.dias.length} elegidos).</p>
      <div class="chips days">${[1, 2, 3, 4, 5, 6, 0].map((d) => chip('dias', d, DIAS[d].slice(0, 3), true)).join('')}</div>
      <h3 class="mt">Minutos por sesión</h3><div class="chips2">${[[30, '30 min'], [45, '45 min'], [60, '60 min']].map(([v, l]) => chip('dur', v, l)).join('')}</div>`;
  } else if (paso === 4) {
    body = `<h2>Cuidados</h2><p class="small muted">¿Tienes molestias o lesiones? Evitaremos los ejercicios que las empeoran y sumaremos los que ayudan.</p>
      <p class="small muted">💡 ¿Te duele la rodilla al subir o bajar escaleras, o al ponerte de pie después de estar sentado? Marca <b>Rodillas</b>.</p>
      <div class="chips">${PERFIL_OPC.limitaciones.map(([v, l]) => chip('limit', v, l, true)).join('')}<button type="button" class="chip ${w.limit.length ? '' : 'on'}" data-act="wzset" data-f="limit" data-v="__none">${ICO.ok} Ninguna</button></div>
      <label class="mt">Fecha de inicio del plan<input data-wz="inicio" type="date" value="${esc(w.inicio)}"></label>
      ${num(w.edad) < 18 ? '<div class="infobanner mt">Como eres menor de 18, la app no aplicará déficit de calorías: en crecimiento lo importante es comer bien y moverse. Ante dudas, consulta a un médico o nutricionista.</div>' : ''}
      <p class="small muted">Si tienes alguna condición médica (corazón, presión, diabetes), consulta a tu médico antes de empezar.</p>`;
  } else if (paso === 5) {
    body = parqBody(w);
  } else {
    const tp = perfilDesdeWz(), pl = generarPlan(tp), o = objetivos(tp, num(w.peso));
    const obj = PERFIL_OPC.objetivos.find((x) => x[0] === tp.objetivo);
    body = `<h2>Tu plan está listo</h2>
      <div class="card accent"><div class="tag">${obj[1]} ${obj[2]}</div><h3>${pl.orden.length} días · ${tp.dur} min</h3>
        <p class="small">${tp.lugar === 'gimnasio' ? 'En el gimnasio' : 'En casa'} · cardio en ${pl.cardio.label.toLowerCase()}</p>
        <div class="macros macros3"><div><b>${o.kcal.toLocaleString('es-CL')}</b><span>kcal/día</span></div><div><b>${o.prot} g</b><span>proteína</span></div><div><b>${o.agua} L</b><span>agua</span></div></div></div>
      <div class="card pweek">${pl.orden.map((sid) => {
        const se = pl.ses[sid], n = se.bloques.reduce((a, b) => a + (b.tipo === 'ej' ? 1 : b.tipo === 'circuito' ? b.ejercicios.filter((e) => e.fases.includes(1)).length : 0), 0);
        return `<div class="pday"><div class="pd"><b>${DIAS[se.dow].slice(0, 3)}</b></div><div class="grow"><b>${se.nombre}</b><span class="small muted">${se.foco} · ${n} ejercicios</span></div></div>`;
      }).join('')}</div>
      <p class="small muted">${textoMeta(o)}</p>
      ${S.perfil ? '<p class="small muted">Tu historial se mantiene. Si cambian las sesiones, las nuevas partirán desde la próxima vez que entrenes.</p>' : ''}`;
  }
  const prog = WZ_PASOS.map((n, i) => `<i class="${i <= paso ? 'on' : ''}"></i>`).join('');
  return `${first ? '' : header('Mi perfil y objetivos', '#/mas')}<section class="wrap wz">
    ${first && paso === 0 ? '<div class="hero"><div class="hero-ico">💪</div><h1>Armemos tu plan</h1><p>6 pasos rápidos para crear un plan a tu medida.</p></div>' : ''}
    ${first && paso === 0 && !esStandalone() && S.acceso?.codigo ? `<div class="card infobanner"><b>📲 Primero instala la app</b><p class="small">iPhone (Safari): Compartir ⬆️ → <i>Agregar a inicio</i>. Android (Chrome): menú ⋮ → <i>Instalar aplicación</i>. Luego ábrela desde el ícono; si te pide código, pega este:</p><p><b class="invcode">${S.acceso.codigo}</b> <button class="link" data-act="invcopiarmio">Copiar</button></p><p class="small muted">${S.acceso.vence ? `Tu acceso es válido hasta el ${fmt(S.acceso.vence)}.` : ''}</p></div>` : ''}
    <div class="wz-prog">${prog}</div><p class="small muted center">Paso ${paso + 1} de ${WZ_PASOS.length} · ${WZ_PASOS[paso]}</p>
    <div class="card form">${body}</div>
    <div class="wz-nav">${paso > 0 ? '<button class="btn" data-act="wzback">‹ Atrás</button>' : '<span></span>'}
      ${paso < WZ_PASOS.length - 1 ? '<button class="btn primary" data-act="wznext">Siguiente ›</button>' : `<button class="btn primary" data-act="wzsave">${first ? 'Crear mi plan 🔥' : 'Guardar cambios'}</button>`}</div>
  </section>`;
}

/* ---- HOY ---- */
function vHoy() {
  const t = today(), wi = weekInfo(t), dow = new Date().getDay();
  const PL = PLAN(), sid = sidDelDia(dow, wi.antes ? 1 : wi.week);
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
  // ¿cómo amaneció la molestia? (sesión de ayer o anteayer con dolor > 0)
  const conDolor = logsOrdenados().filter((l) => l.done && l.fecha < t && dayDiff(l.fecha, t) <= 2 && maxDolor(l) > 0 && !l.manana).pop();
  const bandera = banderaActiva();
  const alNut = alertasNutricion();
  const rch = wi.antes ? null : racha();
  const rachasV = wi.antes ? null : rachas();

  let main;
  if (wi.antes) {
    main = `<div class="card accent"><h2>Tu plan empieza el ${fmt(p.inicio, true)}</h2><p>Mientras tanto: camina 20-30 min en plano y revisa la técnica de los ejercicios en <a href="#/mas">Más → Ejercicios</a>.</p></div>`;
  } else if (sid) {
    const ses = PL.ses[sid], lg = getLog(t, sid);
    const st = lg?.done ? 'done' : lg ? 'prog' : 'new';
    main = `<div class="card today ${st}">
      <div class="tag">${st === 'done' ? '✓ Completada' : st === 'prog' ? 'En curso' : 'Hoy toca'}</div>
      <h2>${ses.nombre}</h2><p class="muted">${ses.foco} · ≈ ${duracionEstimada(itemsDe(sid, wi, t))} min</p>
      <a class="btn primary big" href="#/sesion/${t}/${sid}">${st === 'done' ? 'Ver sesión' : st === 'prog' ? 'Continuar' : 'Empezar entrenamiento'}</a>
    </div>`;
  } else {
    let prox = null;
    for (let i = 1; i <= 14 && !prox; i++) {
      const nd = addDays(new Date(), i), ns = sidDelDia(nd.getDay(), weekInfo(iso(nd)).week);
      if (ns) prox = { nd, ns };
    }
    main = `<div class="card rest"><div class="tag">Descanso</div><h2>Hoy recuperas 😌</h2>
      <p>El músculo se construye descansando. Opcional: <b>caminata de 20-40 min en plano</b> o movilidad suave.</p>
      ${prox ? `<p class="muted">Próxima sesión: <b>${DIAS[prox.nd.getDay()]}</b> · ${PL.ses[prox.ns].nombre}</p>` : ''}</div>`;
  }

  const dots = ordenSemana(semana).map((s) => {
    const d = dateOf(semana, diaDe(s, semana));
    const ok = doneEnSemana(semana, s);
    return `<a class="wd ${ok ? 'ok' : ''} ${d === t ? 'now' : ''}" href="#/sesion/${d <= t ? t : d}/${s}"><b>${DIAS[diaDe(s, semana)].slice(0, 3)}</b><span>${ok ? '✓' : PL.ses[s].nombre.split(' ')[0]}</span></a>`;
  }).join('');

  return `${header(p.nombre ? `¡A darle, ${esc(p.nombre.split(' ')[0])}! 🔥` : '¡A darle! 🔥')}
  <section class="wrap">
    <div class="weekline"><span class="pill">Semana ${wi.antes ? 0 : wi.wk}${wi.ciclo > 1 ? ` · ciclo ${wi.ciclo}` : ''} de 12</span><span class="pill soft">Fase ${wi.phase}: ${FASES[wi.phase - 1].nombre}</span>${wi.deload ? '<span class="pill warn">Semana de descarga</span>' : ''}</div>
    ${enfoqueActivo(p) ? `<a class="card row-link enfoque" href="#/enfoque"><span>🎯</span><div class="grow"><b>Enfoque: ${nombresEnf(enfoqueActivo(p).areas)}</b><span class="small muted">Hasta el ${fmt(enfoqueActivo(p).hasta)} · quedan ${dayDiff(t, enfoqueActivo(p).hasta) + 1} días</span></div>›</a>`
      : p.enfoques && !p.enfoques.avisado ? '<a class="card row-link nuevo" href="#/enfoque"><span>🎯</span><div class="grow"><b>Tu enfoque terminó</b><span class="small muted">Tu plan volvió a la normalidad. ¿Elegir otro?</span></div>›</a>' : ''}
    ${S.acceso?.tipo === 'invitado' && dayDiff(t, S.acceso.vence) <= 5 ? `<div class="card warnc"><b>🔑 Tu acceso vence ${dayDiff(t, S.acceso.vence) === 0 ? 'hoy' : `en ${dayDiff(t, S.acceso.vence)} días`}</b><p class="small">Exporta un respaldo y pide un link nuevo a quien te invitó para continuar.</p></div>` : ''}
    ${!p.parq ? '<a class="card row-link nuevo" href="#/salud"><span>🩺</span><div class="grow"><b>Completa tu cuestionario de salud</b><span class="small muted">7 preguntas, 1 minuto. Para entrenar seguro.</span></div>›</a>' : ''}
    ${p.precaucion ? '<a class="card row-link" href="#/salud"><span>🩺</span><div class="grow"><b>Modo precaución activo</b><span class="small muted">Consulta a tu médico antes de subir la intensidad.</span></div>›</a>' : ''}
    ${p.revisar ? '<a class="card row-link nuevo" href="#/perfil"><span>✨</span><div class="grow"><b>Nuevo: personaliza tu plan</b><span class="small muted">Objetivo, dónde entrenas, equipo y días. Si no cambias nada, tu plan sigue igual.</span></div>›</a>' : ''}
    ${gpsPendienteHTML()}
    ${bandera ? `<div class="card alerta alto"><b>🚩 Marcaste una señal de alerta el ${fmt(bandera.fecha)}</b><p class="small">${banderaMsg(bandera.alertas)}</p><button class="btn small-btn" data-act="alertaok" data-k="${logKey(bandera.fecha, bandera.sid)}">Ya lo revisé con un profesional</button></div>` : ''}
    ${conDolor ? `<div class="card"><h3>🦵 ¿Cómo amaneció tu ${zonasUsuario().length === 1 && zonasUsuario()[0] !== 'general' ? ZONAS[zonasUsuario()[0]].toLowerCase() : 'molestia'}?</h3><p class="small muted">Después de ${esc(nombreSes(conDolor))} (${fmt(conDolor.fecha, true)}) marcaste ${maxDolor(conDolor)}/10. Es la clave para saber si la carga fue la adecuada.</p>
      <div class="btns"><button class="btn small-btn" data-act="manana" data-k="${logKey(conDolor.fecha, conDolor.sid)}" data-v="igual">Igual o mejor</button><button class="btn small-btn" data-act="manana" data-k="${logKey(conDolor.fecha, conDolor.sid)}" data-v="peor">Peor</button></div></div>` : ''}
    ${!wi.antes ? bienestarHTML(t) : ''}
    ${animoBajoDias(t) >= 3 ? ayudaHTML('Marcaste ánimo bajo varios días esta semana. Si te sientes así seguido, no tienes que pasarlo solo/a.') : ''}
    ${alertasHTML(alNut, true)}
    ${main}
    ${!wi.antes ? premioHTML(premioEstado(t)) : ''}
    ${rachasV ? rachasHTML(rachasV) : ''}
    <div class="card"><h3>Esta semana</h3><div class="weekdots" style="grid-template-columns:repeat(${PL.orden.length},1fr)">${dots}</div>
      <p class="muted small">¿Te saltaste una? Tócala para hacerla hoy.</p></div>
    ${S.rutinas.length ? `<div class="card"><h3>🧩 Mis rutinas</h3>${S.rutinas.map((r) => `<a class="rrow" href="#/sesion/${t}/R-${r.id}"><div class="grow"><b>${esc(r.nombre)}</b><span class="small muted">${r.ejercicios.length} ejercicios${num(r.cardio) ? ` · cardio ${num(r.cardio)} min` : ''}${getLog(t, 'R-' + r.id)?.done ? ' · ✓ hecha hoy' : ''}</span></div><span class="btn small-btn">Empezar</span></a>`).join('')}</div>` : ''}
    ${pedirResp ? `<div class="card warnc"><b>💾 Respalda tus datos</b><p class="small">${diasResp === null ? 'Aún no has exportado un respaldo.' : `Tu último respaldo fue hace ${diasResp} días.`} Guárdalo en iCloud o WhatsApp por si cambias o pierdes el teléfono.</p><button class="btn small-btn" data-act="export">Exportar ahora</button></div>` : ''}
    <div class="card"><h3>🚶 Caminata</h3>
      ${camHoy.length ? `<p class="small good"><b>Hoy:</b> ${resumenCam(camHoy)}</p>` : ''}
      <form id="fcamina" class="inline"><input name="pasos" type="number" inputmode="numeric" placeholder="pasos" aria-label="Pasos"><input name="km" type="text" inputmode="decimal" placeholder="km" aria-label="Distancia en km"><button class="btn primary" aria-label="Guardar caminata">+</button></form>
      <p class="small muted">Copia los datos de la app Fitness o Salud del iPhone. Esta semana: ${resumenCam(S.caminatas.filter((c) => weekInfo(c.fecha).week === semana)) || 'sin caminatas aún'}.</p></div>
    ${deportesHoyHTML(t, semana)}
    ${!wi.antes ? cardioSemanaHTML(wi) : ''}
    <a class="card row-link" href="#/comida"><span>🍽️</span><div class="grow"><b>Comida de hoy</b><span class="small muted">${p.ocultarKcal ? '' : `${Math.round(totHoy.k).toLocaleString('es-CL')} de ${objetivos().kcal.toLocaleString('es-CL')} kcal · `}${Math.round(totHoy.pr)} g proteína · ${(S.agua || {})[t] || 0} vasos de agua</span></div>›</a>
    ${pedirPeso && !wi.antes ? `<div class="card"><h3>⚖️ Registro semanal de peso</h3><form id="fpesoHoy" class="inline"><input name="kg" type="text" inputmode="decimal" placeholder="kg en ayunas" required><input name="cintura" type="text" inputmode="decimal" placeholder="cintura cm"><button class="btn primary">Guardar</button></form></div>` : ''}
    <div class="stats">
      <div><b>${fmtN(kg)}</b><span>kg actual</span></div>
      <div><b>${rch ? rch.actual : 0}</b><span>semanas activas seguidas</span></div>
      <div><b>${totalDone}</b><span>sesiones</span></div>
    </div>
    <p class="small muted center">Una semana cuenta como activa con todas tus sesiones menos una: un día de gracia por semana.</p>
    <div class="card small-card"><h3>❤️ Tus zonas de pulso</h3>
      <p><b>Zona 2 (suave):</b> ${fz.z2[0]}–${fz.z2[1]} lpm · puedes hablar en frases.<br><b>Fuerte (intervalos):</b> ${fz.fuerte[0]}–${fz.fuerte[1]} lpm · hablar cuesta.<br><span class="muted small">FC máx. estimada: ${fz.max} lpm. Si tu máquina o reloj no mide pulso, guíate por la conversación.</span></p></div>
  </section><div id="modal" class="sheet"></div>`;
}

/* ---- SESIÓN ---- */
function vSesion(date, sid) {
  const ses = getSes(sid);
  if (!ses) return vHoy();
  const wi = weekInfo(date);
  const items = itemsDe(sid, wi, date);
  const lg = getLog(date, sid, false);
  const fz = fcZonas();
  const aj = getRutina(sid) ? { msgs: [], factor: 1, zonaFactor: {} } : ajusteSesion(date, sid);
  const desc = wi.deload || !!(S.descargas || {})[wi.week];
  const durEst = duracionEstimada(items), durMax = S.perfil?.dur || 45;
  const autoDolor = items.some((x) => x.autoDolor);
  const bandera = banderaActiva();
  ctx.items = items;
  let html = `<header class="top ses-top"><a href="#/hoy" class="back" aria-label="Volver">‹</a><h1>${esc(ses.nombre)}</h1><div class="sesprog" id="sesprog">${progresoHTML()}</div></header><section class="wrap ses">
    <p class="muted center">${fmt(date, true)} · Semana ${wi.wk} · Fase ${wi.phase}${wi.ciclo > 1 ? ` · Ciclo ${wi.ciclo}` : ''} · ≈ ${durEst} min${desc ? ' · <b>descarga</b> (menos series, mismos pesos, sin intervalos)' : ''}</p>
    ${bandera ? `<div class="card alerta alto"><b>🚩 Marcaste una señal de alerta el ${fmt(bandera.fecha)}</b><p class="small">${banderaMsg(bandera.alertas)}</p></div>` : ''}
    ${aj.msgs.map((m) => `<div class="hint ajuste">🧠 ${m}</div>`).join('')}
    ${autoDolor ? `<div class="hint">Si hoy te sientes bien, puedes <button class="link" data-act="dolorok">usar los ejercicios originales</button>.</div>` : ''}
    ${aj.sugDescarga ? `<div class="hint warn">Hay señales de fatiga acumulada (esfuerzo alto, poco sueño o dolor en alza). Una semana de descarga ayuda a recuperar y seguir progresando. <button class="link" data-act="descarga" data-w="${wi.week}">Activar descarga esta semana</button></div>` : ''}
    ${S.perfil?.precaucion ? '<div class="hint warn">🩺 Modo precaución (cuestionario de salud): los intervalos intensos se cambian por cardio suave y el circuito tiene pausas más largas. Consulta a tu médico.</div>' : ''}
    ${!getRutina(sid) && durEst > durMax + 10 && !lg?.expres && !lg?.done ? `<div class="hint warn">⏱ Esta sesión puede durar ~${durEst} min y tú tienes ${durMax}. <button class="link" data-act="expres">Modo exprés</button>: 1 serie menos por ejercicio y la mitad del cardio final (completa el resto con una caminata otro día).</div>` : ''}
    ${lg?.expres ? '<div class="hint">⏱ Modo exprés activo. <button class="link" data-act="expres">Volver a la sesión completa</button></div>' : ''}
    <div class="hint">Toca <b>✓</b> al terminar cada serie: se guarda y parte el descanso. Si dejas el peso/reps vacíos se usan los sugeridos. En los ejercicios de tiempo usa <b>⏱</b> para cronometrar cuánto resistes. Meta de esfuerzo: termina cada serie con <b>${wi.phase === 1 ? '2-3' : '1-2'} repeticiones en reserva</b>. Ritmo: <b>${TEMPO[wi.phase]}</b>.</div>`;

  items.forEach((it, idx) => { it.idx = idx; });
  for (const it of items) {
    if (it.k === 'warm') {
      const list = CALENTAMIENTO[it.corto ? 'corto' : 'normal'].map((x) => x.replace('cardio', PLAN().cardio.label.toLowerCase()));
      // series de aproximación antes del primer ejercicio con peso
      const prim = !it.corto && items.find((x) => x.k === 'ex' && !x.circ && usaPeso(getEj(x.id)));
      if (prim) {
        const lv = ultimaVez(prim.id, date), w = sugerencia(prim.id, prim, lv, lv?.rir).w, st = getEj(prim.id).step || 1;
        const r = (f) => fmtN(Math.max(st, Math.round((w * f) / st) * st));
        list.push(`Series de aproximación en <b>${esc(getEj(prim.id).nombre)}</b>: 8 reps con ~50% del peso de trabajo${w ? ` (${r(0.5)} kg)` : ''} y 4 reps con ~75%${w ? ` (${r(0.75)} kg)` : ''}. No cuentan como series.`);
      }
      html += `<div class="card blk ${lg?.warm ? 'done' : ''}" id="warm" data-blk="${it.idx}"><div class="blk-h"><h3>🔥 Calentamiento</h3><button class="chk ${lg?.warm ? 'on' : ''}" data-act="warm" aria-label="Marcar calentamiento">✓</button></div><ul class="ticks">${list.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
    } else if (it.k === 'circ') {
      html += `<div class="card circ"><h3>⚡ Circuito · ${it.rondas} rondas</h3><p>Haz los ejercicios <b>seguidos</b>: ${it.trabajo} de trabajo y ${it.pausa} s de pausa entre ejercicios. Descansa <b>${it.entre} s</b> al terminar cada ronda. Anota el peso y las reps (o segundos) que lograste en cada ronda.</p>
        <a class="btn small-btn" href="#/timer/c/${rango(it.trabajo)[0]}/${it.pausa}/${it.rondas * it.nEj}">⏱ Abrir temporizador del circuito</a></div>`;
    } else if (it.k === 'cardio') {
      const c = lg?.cardio?.[it.key] || {};
      const zona = it.rx.zona === 'int' ? `Suave: ${fz.z2[0]}–${fz.z2[1]} lpm · Fuerte: ${fz.fuerte[0]}–${fz.fuerte[1]} lpm` : `Zona 2: ${fz.z2[0]}–${fz.z2[1]} lpm`;
      html += `<div class="card blk cardio ${c.ok ? 'done' : ''}" data-ck="${it.key}" data-blk="${it.idx}">
        <div class="blk-h"><div class="thumb" data-act="tech" data-id="${PLAN().cardio.ex}">${Fig.still(ANIMS[PLAN().cardio.anim], 0)}</div><div class="grow"><h3>${it.rx.titulo}</h3><p class="small">${it.rx.detalle}</p><p class="small zona">${zona}</p></div>
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
      let sug = sugerencia(it.id, it, last, last?.rir);
      // descarga: se repite el peso, sin subir
      if (desc && sug.up && last) {
        const w0 = Math.max(0, ...last.sets.map((s) => num(s.w) || 0)) || null;
        sug = { w: w0, txt: 'Semana de descarga: repite el peso de la última vez, sin subir. Termina cada serie con 3 repeticiones en reserva.' };
      }
      const fZona = Math.min(aj.factor, ...zonasDeEj(it.id).map((z) => aj.zonaFactor?.[z] || 1));
      if (fZona < 1 && sug.w && usaPeso(ex)) {
        const st = ex.step || 0.5, w2 = Math.max(st, Math.round((sug.w * fZona) / st) * st);
        sug = { w: w2, txt: `Ajuste de hoy: ${fmtN(w2)} kg (~−10%).` };
      }
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
          ${esTiempo(ex) ? `<button class="crono" data-act="crono" data-meta="${hi || 0}" aria-label="Cronómetro serie ${i + 1}">⏱</button>` : ''}
          <button class="chk ${s.ok ? 'on' : ''}" data-act="setok" aria-label="Serie ${i + 1} lista">✓</button>
        </div>`;
      }
      html += `<div class="card blk ex ${allOk ? 'done' : ''} ${it.circ ? 'incirc' : ''}" data-exc="${it.id}" data-sets="${it.sets}" data-blk="${it.idx}">
        <div class="blk-h"><div class="thumb" data-act="tech" data-id="${it.id}">${Fig.still(ANIMS[it.id], 1, musculosDe(it.id)) || '<div class="noanim">🏋️</div>'}</div>
          <div class="grow"><h3>${esc(ex.nombre)}</h3><p class="rx">${it.circ ? `${it.sets} rondas × ${it.reps}` : `${it.sets} × ${it.reps}${ex.porLado ? ' por lado' : ''} · descanso ${it.rest} s`}${it.enf ? ` <span class="tag-enf" title="Ajuste de volumen">🎯 ${it.enf === 'nuevo' ? 'extra' : it.enf}</span>` : ''}</p>
          <div class="exlinks"><button class="link" data-act="tech" data-id="${it.id}">▶ Ver técnica</button><button class="link" data-act="subopen" data-id="${it.id}" data-orig="${it.orig || it.id}">↔ Cambiar</button></div>
          ${it.autoDolor ? `<p class="small muted">🔴 En lugar de ${esc(getEj(it.orig).nombre)}, por tu molestia de ${ZONAS[it.autoDolor].toLowerCase()}.</p>`
            : it.orig ? `<p class="small muted">En lugar de ${esc(getEj(it.orig).nombre)} · <button class="link small" data-act="subundo" data-orig="${it.orig}">volver al original</button></p>` : ''}
          ${it.ss ? `<p class="small">🔁 <b>Superserie</b> con ${esc(getEj(it.ss).nombre)}: alterna una serie de cada uno y descansa ${it.rest} s después de cada par.</p>` : ''}
          ${it.avisoDolor ? `<p class="small warn-t">🔴 Carga tu ${ZONAS[it.avisoDolor].toLowerCase()}: hazlo solo si no duele más de 3/10, o cámbialo (↔).</p>` : ''}</div></div>
        <div class="tech" id="tech-${it.id}"></div>
        ${lastTxt ? `<p class="last">${esc(lastTxt)}</p>` : ''}
        <p class="sug ${sug.up ? 'up' : ''}">${sug.up ? '⬆️ ' : '💡 '}${sug.txt}</p>
        <div class="sets">${rows}</div>
        <button class="link small" data-act="addset" data-id="${it.id}">+ agregar serie</button>
        ${!esTiempo(ex) && !it.circ ? `<div class="rirrow"><span class="small muted">Repeticiones en reserva en la última serie:</span><div class="chips">${[[0, '0'], [1, '1'], [2, '2'], [3, '3+']].map(([v, l]) => `<button class="tab ${lg?.ex?.[it.id]?.rir === v ? 'on' : ''}" data-act="rir" data-id="${it.id}" data-v="${v}">${l}</button>`).join('')}</div></div>` : ''}
      </div>`;
    }
  }
  if (items.some((x) => x.k === 'ex')) html += `<div class="card blk calma"><h3>🧘 Vuelta a la calma · 3-5 min</h3><ul class="ticks">${VUELTA_CALMA.map((x) => `<li>${x}</li>`).join('')}</ul><p class="small muted">Estira suave, sin rebotes y sin dolor.${zonasUsuario().includes('rodillas') ? ' Evita los estiramientos de cuádriceps de rodillas en el suelo.' : ''}</p></div>`;
  const rpeTxt = ['', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Algo duro', 'Duro', 'Muy duro', 'Durísimo', 'Máximo'];
  html += `<div class="card fin">
    <h3>Cierre de la sesión</h3>
    <label>¿Qué tan duro fue? <b id="rpeV">${lg?.rpe ?? 6} · ${rpeTxt[lg?.rpe ?? 6]}</b><input type="range" min="1" max="10" data-fin="rpe" value="${lg?.rpe ?? 6}"></label>
    ${zonasUsuario().map((z) => { const v = lg ? dolorDe(lg, z) ?? 0 : 0; return `<label>${z === 'general' ? 'Dolor o molestia articular' : `Dolor de ${ZONAS[z].toLowerCase()}`} (0 = nada, 10 = máximo) <b id="dolV-${z}">${v}</b><input type="range" min="0" max="10" data-dolor="${z}" value="${v}"></label>`; }).join('')}
    <p class="small muted">Regla: hasta 3/10 durante el ejercicio es aceptable si al día siguiente no está peor. Si pasa de 3, reduce rango o peso. Mañana te preguntaremos cómo amaneciste.</p>
    <details class="banderas" ${(lg?.alertas || []).length ? 'open' : ''}><summary class="small"><b>🚩 ¿Notaste alguna señal de alerta?</b></summary>
      ${BANDERAS.map(([id, txt]) => `<label class="chkl"><input type="checkbox" data-bandera="${id}" ${(lg?.alertas || []).includes(id) ? 'checked' : ''}> ${txt}</label>`).join('')}
      <div id="bandmsg">${(lg?.alertas || []).length ? `<div class="infobanner">${banderaMsg(lg.alertas)}</div>` : ''}</div></details>
    <label>Notas<textarea data-fin="notas" rows="2" placeholder="¿Cómo te sentiste? ¿Algo molestó?">${esc(lg?.notas || '')}</textarea></label>
    <button class="btn primary big" data-act="finish">${lg?.done ? 'Guardar cambios' : 'Terminar sesión ✓'}</button>
  </div></section><div id="modal" class="sheet"></div>`;
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
    const d = dateOf(week, dow), sid = sidDelDia(dow, week);
    if (!sid) {
      return `<div class="pday rest ${d === t ? 'now' : ''}"><div class="pd"><b>${DIAS[dow].slice(0, 3)}</b><span>${fmt(d)}</span></div><div class="grow muted small">${depDiaTxt(d) ? `Descanso · ${depDiaTxt(d)}` : 'Descanso · opcional: caminata 20-40 min o tu deporte (regístralo en Hoy)'}</div></div>`;
    }
    const movida = S.movidas?.[week]?.[sid] !== undefined && S.movidas[week][sid] !== PLAN().ses[sid].dow;
    const ses = PLAN().ses[sid], ok = doneEnSemana(week, sid);
    const its = itemsDe(sid, wi, d);
    const cardio = its.filter((x) => x.k === 'cardio').map((x) => x.rx.titulo).join(' + ');
    const nEj = its.filter((x) => x.k === 'ex').length;
    return `<div class="pday ${ok ? 'ok' : ''} ${d === t ? 'now' : ''}"><a class="pday-l" href="#/sesion/${d}/${sid}"><div class="pd"><b>${DIAS[dow].slice(0, 3)}</b><span>${fmt(d)}</span></div>
      <div class="grow"><b>${ses.nombre}${movida ? ' <span class="movida">↪ movida</span>' : ''}</b><span class="small muted">${nEj} ejercicios · ${cardio}${depDiaTxt(d) ? ` · ${depDiaTxt(d)}` : ''}</span></div><span class="st">${ok ? '✓' : '›'}</span></a>
      ${ok ? '' : `<button class="mover" data-act="moveropen" data-sid="${sid}" data-w="${week}" aria-label="Mover ${esc(ses.nombre)}">⇄</button>`}</div>`;
  }).join('');
  return `${header('Plan')}<section class="wrap">
    <div class="weeknav"><button class="btn ghost" data-act="pw" data-d="-1" ${week <= 1 ? 'disabled' : ''}>‹</button><div><b>Semana ${wi.wk}</b>${wi.ciclo > 1 ? ` <span class="small">(ciclo ${wi.ciclo})</span>` : ''}<span class="small muted">${fmt(dateOf(week, 1))} – ${fmt(dateOf(week, 0))}${week === cur ? ' · actual' : ''}</span></div><button class="btn ghost" data-act="pw" data-d="1">›</button></div>
    ${wi.deload ? '<div class="hint warn">Semana de descarga: ~40% menos series, mismos pesos y cardio suave en vez de intervalos. Recupera para volver más fuerte.</div>' : ''}
    <div class="card pweek">${dias}</div>
    <p class="small muted">Toca <b>⇄</b> para mover una sesión a otro día o intercambiarla con otra.${S.movidas?.[week] && Object.keys(S.movidas[week]).length ? ` <button class="link small" data-act="resetsemana" data-w="${week}">Restablecer los días de esta semana</button>` : ''}</p>
    <h2 class="sec">Las 3 fases</h2>${fases}
    <a class="card row-link" href="#/enfoque"><span>🎯</span><div class="grow"><b>${enfoqueActivo() ? `Enfoque: ${nombresEnf(enfoqueActivo().areas)}` : 'Elegir un enfoque'}</b><span class="small muted">${enfoqueActivo() ? `Hasta el ${fmt(enfoqueActivo().hasta)}` : 'Prioriza zonas por unas semanas'}</span></div>›</a>
    <a class="card row-link" href="#/ficha"><span>📋</span><div class="grow"><b>Ficha técnica del plan</b><span class="small muted">Todo tu programa en un documento para que lo revise un profesional</span></div>›</a>
    <a class="card row-link" href="#/series"><span>📊</span><div class="grow"><b>Calculadora de series</b><span class="small muted">Volumen semanal por músculo</span></div>›</a>
    <a class="card row-link" href="#/equipo"><span>🧰</span><div class="grow"><b>¿Tienes equipo nuevo?</b><span class="small muted">Agrégalo y actualiza tu plan</span></div>›</a>
    <a class="card row-link" href="#/rutinas"><span>🧩</span><div class="grow"><b>Rutinas personalizadas</b><span class="small muted">Crea las tuyas y hazlas cualquier día</span></div>›</a>
    ${alertaVolumenHTML()}
    <div class="card small-card"><h3>Cómo progresar</h3><p class="small">Usa <b>doble progresión</b>: cuando completes todas las series en el máximo del rango (ej. 3×15) dejando 2 o más repeticiones en reserva, sube el peso en la próxima sesión y vuelve al mínimo del rango. Si el salto de peso es grande (más de 10-15%), primero suma repeticiones o baja más lento. La app te avisa con ⬆️. En el cardio, los minutos suben automáticamente cada semana; apunta a 150+ min semanales sumando caminatas.</p></div>
  </section><div id="modal" class="sheet"></div>`;
}

/* ---- PROGRESO ---- */
function vProgreso() {
  const p = S.perfil, t = today();
  const pesos = [...S.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const kg = pesoActual();
  const perd = r1(p.peso - kg);
  const menor = p.edad < 18;
  // menores: sin peso meta ni ritmo de bajada (el foco es fuerza, energía y hábito)
  const tieneMeta = !menor && p.metaMin && p.metaMax;
  const faltan = !tieneMeta ? null : kg > p.metaMax ? r1(kg - p.metaMax) : kg < p.metaMin ? r1(p.metaMin - kg) : 0;
  const PL = PLAN();
  const rch = weekInfo(t).antes ? { actual: 0, mejor: 0 } : racha();
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
    minCam.push(minCaminatas(cw) + deportesSemana(w).reduce((a, e) => a + minEquivCardio(e), 0));
    kmCam.push(r1(sumar(cw, 'km')));
    pasosCam.push(sumar(cw, 'pasos'));
  }
  let grid = '';
  for (let w = Math.max(1, cur - 11); w <= cur; w++) {
    grid += `<div class="grow-row" style="grid-template-columns:40px repeat(${PL.orden.length},1fr)"><span class="small muted">S${((w - 1) % 12) + 1}</span>${PL.orden.map((s) => `<i class="${doneEnSemana(w, s) ? 'on' : dateOf(w, diaDe(s, w)) < t ? 'miss' : ''}" title="${PL.ses[s].nombre}"></i>`).join('')}</div>`;
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
      return { x: +parse(l.fecha), y: conPeso ? (progModo === '1rm' ? r1(Math.max(...ok.map((s) => e1rm(num(s.w) || 0, num(s.r) || 0)))) : Math.max(...ok.map((s) => num(s.w) || 0))) : Math.max(...ok.map((s) => num(s.r) || 0)), t: fmt(l.fecha) };
    });
    const best = Math.max(...pts.map((x) => x.y));
    ejChart = `<select data-act-change="ejsel">${conEj.map((id) => `<option value="${id}" ${id === ejSel ? 'selected' : ''}>${esc(getEj(id).nombre)}</option>`).join('')}</select>
      ${conPeso ? `<div class="seg"><button class="${progModo === '1rm' ? '' : 'on'}" data-act="pmodo" data-v="peso">Peso máximo</button><button class="${progModo === '1rm' ? 'on' : ''}" data-act="pmodo" data-v="1rm">Fuerza estimada (1RM)</button></div>` : ''}
      <p class="small muted">${conPeso ? (progModo === '1rm' ? '1RM estimado por sesión (kg): lo máximo que podrías levantar 1 vez' : 'Peso máximo por sesión (kg)') : esTiempo(ex) ? 'Mejor tiempo (s)' : 'Máximo de reps'} · récord: <b>${fmtN(best)}</b></p>${chartLine(pts, { label: 'progreso ejercicio', dec: true })}`;
  }
  const dolorCharts = zonasUsuario().map((z) => {
    const pts = [...L.filter((l) => l.done && dolorDe(l, z) != null).map((l) => ({ x: +parse(l.fecha), y: dolorDe(l, z), t: fmt(l.fecha) })),
      ...(S.deportes || []).filter((e) => e.dolor?.[z] != null).map((e) => ({ x: +parse(e.fecha), y: e.dolor[z], t: `${fmt(e.fecha)} · ${depInfo(e).corto}` }))].sort((a, b) => a.x - b.x);
    const s = semaforoDolor(z, iso(addDays(new Date(), 1)));
    return `<h4>${z === 'general' ? 'Molestias articulares' : ZONAS[z]} <span class="sema ${s.nivel}">${s.nivel === 'verde' ? '🟢 estable' : s.nivel === 'amarillo' ? '🟡 vigilar' : '🔴 alto'}</span></h4>${chartLine(pts, { yMin: 0, yMax: 10, label: 'dolor ' + z, vacio: 'Se registra al terminar cada sesión o deporte.', h: 130 })}`;
  }).join('');
  const totalMin = Object.values(S.logs).reduce((s, l) => s + Object.values(l.cardio || {}).reduce((a, c) => a + (num(c.min) || 0), 0), 0) + minCaminatas(S.caminatas);
  const cams = [...S.caminatas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const vol = Object.values(S.logs).reduce((s, l) => s + Object.values(l.ex || {}).reduce((a, e) => a + e.sets.filter((x) => x.ok).reduce((b, x) => b + (num(x.w) || 0) * (num(x.r) || 0), 0), 0), 0);

  return `${header('Progreso')}<section class="wrap">
    <div class="stats">
      <div><b>${rch.actual}</b><span>semanas activas seguidas</span></div>
      <div><b>${rch.mejor}</b><span>mejor racha</span></div>
      <div><b>${Object.values(S.logs).filter((l) => l.done).length}</b><span>sesiones</span></div>
    </div>
    <div class="card"><h3>⚖️ Peso corporal</h3>
      <div class="stats inner">
        <div><b>${perd > 0 ? '−' : perd < 0 ? '+' : ''}${fmtN(Math.abs(perd))}</b><span>kg desde el inicio</span></div>
        ${tieneMeta ? `<div><b>${faltan > 0 ? fmtN(faltan) : '🎯'}</b><span>${faltan > 0 ? 'kg para tu meta' : '¡en tu meta!'}</span></div>` : `<div><b>${fmtN(imc)}</b><span>IMC actual</span></div>`}
        ${menor ? '' : `<div><b>${ritmo === '' ? '—' : fmtN(ritmo)}</b><span>kg/semana (últ. 5 sem)</span></div>`}
      </div>
      <form id="fpeso" class="inline"><input name="fecha" type="date" value="${t}" required><input name="kg" type="text" inputmode="decimal" placeholder="kg" required><input name="cintura" type="text" inputmode="decimal" placeholder="cintura"><button class="btn primary">+</button></form>
      ${chartLine(ptsPeso, { band: tieneMeta ? [p.metaMin, p.metaMax] : null, label: 'peso', dec: true, vacio: 'Registra tu peso semanal.' })}
      <p class="small muted">${tieneMeta ? `Franja verde = tu meta (${fmtN(p.metaMin)}–${fmtN(p.metaMax)} kg). ` : ''}IMC actual: ${fmtN(imc)}.${p.objetivo === 'bajar' && !menor ? ` Ritmo saludable: 0,5 a 0,8 kg por semana, sin pasar del 1% de tu peso (~${fmtN(Math.min(1.2, kg * 0.01))} kg).` : ''} El peso varía 0,5–2 kg de un día a otro por agua y sal: mira la tendencia de 2–4 semanas.${menor ? ' En crecimiento lo que cuenta es tu fuerza, tu energía y moverte seguido.' : ''}</p>
      ${ptsCint.length ? `<h4>Cintura (cm)</h4>${chartLine(ptsCint, { label: 'cintura', dec: true, h: 130 })}` : ''}
      <details><summary class="small">Ver registros</summary><ul class="plist">${[...pesos].reverse().map((x) => `<li><span>${fmt(x.fecha)}</span><b>${fmtN(x.kg)} kg</b><span class="muted">${x.cintura ? fmtN(x.cintura) + ' cm' : ''}</span><button class="link danger" data-act="delpeso" data-f="${x.fecha}" aria-label="Eliminar">✕</button></li>`).join('')}</ul></details>
    </div>
    <div class="card"><h3>📅 Constancia</h3><div class="cgrid2"><div class="grow-row head" style="grid-template-columns:40px repeat(${PL.orden.length},1fr)"><span></span>${PL.orden.map((s) => `<b>${DIAS[PL.ses[s].dow].slice(0, 2)}</b>`).join('')}</div>${grid}</div></div>
    <div class="card"><h3>🫀 Minutos de cardio por semana</h3>${chartBars(semanas, minutos, { min: 30, stack: minCam, label: 'minutos cardio' })}<p class="legend small"><i class="lg1"></i>${PL.cardio.label} <i class="lg2"></i>Caminata y deportes (caminata: 12 min por km; deporte intenso: cada minuto vale por 2)</p><p class="small muted">Total acumulado: <b>${Math.round(totalMin)} min</b>. Recomendación de salud: 150+ min/semana.</p></div>
    <div class="card"><h3>🚶 Caminatas</h3>
      <form id="fcamina2" class="inline"><input name="fecha" type="date" value="${t}" required><input name="pasos" type="number" inputmode="numeric" placeholder="pasos" aria-label="Pasos"><input name="km" type="text" inputmode="decimal" placeholder="km" aria-label="Distancia en km"><button class="btn primary" aria-label="Guardar caminata">+</button></form>
      <p class="small muted">Pasos por semana</p>${chartBars(semanas, pasosCam, { min: 10000, label: 'pasos por semana' })}<p class="small muted">Km por semana</p>${chartBars(semanas, kmCam, { min: 5, label: 'km caminados', dec: true })}
      <p class="small muted">Total: <b>${cams.length}</b> caminatas · <b>${fmtN(sumar(cams, 'km'))} km</b> · <b>${sumar(cams, 'pasos').toLocaleString('es-CL')}</b> pasos</p>
      ${cams.length ? `<details><summary class="small">Ver registros</summary><ul class="plist">${cams.map((c) => `<li><span>${fmt(c.fecha)}</span><b>${resumenCam([c])}</b><button class="link danger" data-act="delcam" data-id="${c.id}" aria-label="Eliminar">✕</button></li>`).join('')}</ul></details>` : ''}
    </div>
    ${deportesProgresoHTML()}
    <div class="card"><h3>🏋️ Fuerza</h3>${ejChart}${recordsHTML(L)}<p class="small muted">Volumen total levantado: <b>${Math.round(vol).toLocaleString('es-CL')} kg</b></p></div>
    ${volumenHTML(L, cur)}
    ${medidasHTML(t)}
    ${menor ? '' : `<div class="card"><h3>📸 Fotos de progreso</h3>
      <div class="inline"><select id="fpose" aria-label="Pose"><option>Frente</option><option>Lado</option><option>Espalda</option></select><label class="btn primary">+ Foto<input type="file" accept="image/*" id="ffoto" hidden></label></div>
      <div id="fotos" class="fotos"><p class="small muted">Cargando…</p></div>
      <p class="small muted">Las fotos quedan solo en este teléfono y <b>no se incluyen en el respaldo</b>. Para guardarlas aparte, ábrelas y usa "Compartir".</p></div>`}
    <div class="card"><h3>🦵 Dolor y molestias</h3>${dolorCharts}<p class="small muted">Lo ideal es que la tendencia baje con las semanas. 🟡 = la app baja la carga de esa zona; 🔴 = cambia los ejercicios que la cargan. Si sigue en 🔴 o no mejora en 2-3 semanas, consulta a un kinesiólogo.</p></div>
  </section><div id="modal" class="sheet"></div>`;
}
let progModo = 'peso', medSel = 'cadera';
function recordsHTML(L) {
  const rec = {};
  for (const l of L) for (const [id, e] of Object.entries(l.ex || {})) for (const s of e.sets) {
    if (!s.ok || !num(s.r)) continue;
    const ex = getEj(id), w = num(s.w);
    const val = usaPeso(ex) && w ? e1rm(w, num(s.r)) : num(s.r);
    if (!rec[id] || val > rec[id].val) rec[id] = { val, w, r: num(s.r), fecha: l.fecha, peso: usaPeso(ex) && w };
  }
  const arr = Object.entries(rec).sort((a, b) => b[1].fecha.localeCompare(a[1].fecha)).slice(0, 10);
  if (!arr.length) return '';
  return `<h4>🏆 Récords personales</h4><ul class="plist recs">${arr.map(([id, x]) => `<li><span>${fmt(x.fecha)}</span><b>${esc(getEj(id).nombre)}</b><span>${x.peso ? `${fmtN(x.w)} kg × ${x.r} · <i>1RM ≈ ${fmtN(Math.round(x.val))}</i>` : `${x.r} ${esTiempo(getEj(id)) ? 's' : 'reps'}`}</span></li>`).join('')}</ul>`;
}
function volumenHTML(L, week) {
  const g = {};
  for (const l of L) {
    if (l.week !== week) continue;
    for (const [id, e] of Object.entries(l.ex || {})) {
      const grupo = GRUPO_DE_PATRON[PATRON[id]];
      if (grupo) g[grupo] = (g[grupo] || 0) + e.sets.filter((s) => s.ok).length;
    }
  }
  const grupos = ['Piernas', 'Glúteos e isquios', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core'];
  const meta = S.perfil?.objetivo === 'musculo' ? [10, 20] : [6, 12];
  const max = Math.max(meta[1], ...Object.values(g));
  return `<div class="card"><h3>💪 Series por grupo muscular</h3><p class="small muted">Esta semana. Recomendado para tu objetivo: ${meta[0]}–${meta[1]} series por grupo. <a href="#/series">Ver calculadora detallada ›</a></p>
    ${grupos.map((x) => { const n = g[x] || 0; return `<div class="vrow"><span>${x}</span><div class="vbar"><i class="${n >= meta[0] ? 'ok' : ''}" style="width:${(n / max) * 100}%"></i><em style="left:${(meta[0] / max) * 100}%"></em></div><b>${n}</b></div>`; }).join('')}</div>`;
}
const MEDIDAS = [['cadera', 'Cadera'], ['pecho', 'Pecho'], ['brazo', 'Brazo'], ['muslo', 'Muslo'], ['grasa', '% grasa']];
function medidasHTML(t) {
  const M = [...(S.medidas || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pts = M.filter((x) => num(x[medSel])).map((x) => ({ x: +parse(x.fecha), y: num(x[medSel]), t: fmt(x.fecha) }));
  return `<div class="card"><h3>📏 Medidas corporales</h3>
    <form id="fmedida" class="form"><label>Fecha<input name="fecha" type="date" value="${t}" required></label>
      <div class="cgrid">${MEDIDAS.map(([k, l]) => `<label>${l}${k === 'grasa' ? '' : ' (cm)'}<input name="${k}" type="text" inputmode="decimal"></label>`).join('')}</div>
      <button class="btn">+ Guardar medidas</button></form>
    ${M.length ? `<div class="tabs mt">${MEDIDAS.map(([k, l]) => `<button class="tab ${medSel === k ? 'on' : ''}" data-act="medsel" data-k="${k}">${l}</button>`).join('')}</div>
      ${chartLine(pts, { label: 'medida', dec: true, h: 130, vacio: 'Sin registros de esta medida.' })}
      <details><summary class="small">Ver registros</summary><ul class="plist">${[...M].reverse().map((x) => `<li><span>${fmt(x.fecha)}</span><span class="small">${MEDIDAS.filter(([k]) => num(x[k])).map(([k, l]) => `${l} ${fmtN(x[k])}`).join(' · ')}</span><button class="link danger" data-act="delmedida" data-f="${x.fecha}" aria-label="Eliminar">✕</button></li>`).join('')}</ul></details>` : '<p class="small muted">La cintura se registra junto con tu peso.</p>'}
  </div>`;
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
/* ---- Varios alimentos de una vez: "pan con jamón, tomate y mostaza" ---- */
const NUM_TXT = { un: 1, una: 1, uno: 1, medio: 0.5, media: 0.5, cuarto: 0.25, 'un cuarto': 0.25, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, doble: 2 };
// medidas caseras que se ignoran al buscar ("2 tazas de arroz" → 2 porciones de arroz)
const UNID_RX = /^(?:unidad(?:es)?|u|tazas?|vasos?|platos?|porcion(?:es)?|rebanadas?|laminas?|trozos?|cucharadas?|cdas?|cucharaditas?|cdtas?|punados?|latas?|scoops?|piezas?|presas?)\b\s*/;
const NUM_RX = '(\\d+(?:[.,]\\d+)?|\\d+\\/\\d+|un cuarto|una|uno|un|medio|media|cuarto|dos|tres|cuatro|cinco|seis|doble)';
const valNum = (t) => (NUM_TXT[t] != null ? NUM_TXT[t] : t.includes('/') ? t.split('/').reduce((a, b) => a / b) : +t.replace(',', '.'));
function partesTexto(q) {
  const n = normal(q).replace(/\s+/g, ' ').trim();
  if (!n) return [];
  const out = [];
  for (const sg of n.split(/\s*(?:,|;|\+|\n|\by\b|\be\b|\bmas\b)\s*/).filter(Boolean)) {
    if (/\bcon\b/.test(sg)) {
      const r = buscar(sg); // ¿existe como un solo alimento? (ej. "café con leche")
      if (r && r.length) { out.push(sg); continue; }
      out.push(...sg.split(/\s*\bcon\b\s*/).filter(Boolean));
    } else out.push(sg);
  }
  return out.filter((x) => x.replace(/\b(de|del|la|el|los|las)\b/g, '').trim().length >= 2);
}
function cantidadDe(sg) {
  let t = sg.trim().replace(/½/g, '1/2 ').replace(/¼/g, '1/4 ').replace(/\s+/g, ' ').trim(), q = null, gr = null;
  // al inicio: "2 huevos", "150 g arroz", "media palta", "1/2 taza de leche"
  let m = t.match(new RegExp('^' + NUM_RX + '\\s*(kg|g|gr|grs|gramos|ml|cc)?(?=\\s|$)\\s*'));
  if (m) {
    const v = valNum(m[1]);
    if (m[2]) gr = m[2] === 'kg' ? v * 1000 : v; else q = v;
    t = t.slice(m[0].length);
  } else {
    // al final: "huevos x2", "arroz 150 g", "pan 2"
    m = t.match(/\s+x?\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grs|gramos|ml|cc)?$/);
    if (m) { const v = valNum(m[1]); if (m[2]) gr = m[2] === 'kg' ? v * 1000 : v; else q = v; t = t.slice(0, m.index); }
  }
  let unidad = null;
  const um = q != null ? t.match(UNID_RX) : null;
  if (um) { unidad = um[0].trim().replace(/(es|s)$/, ''); t = t.slice(um[0].length); }
  t = t.replace(/^(de|del)\s+/, '').trim();
  if (q == null && gr == null) return { q: 1, resto: t, sinCant: true };
  return gr != null ? { gr, resto: t } : { q, resto: t, unidad };
}
// alimento por defecto para palabras sueltas comunes (lo que ya comiste antes tiene prioridad)
const PREF_ALIM = {
  arroz: 'Arroz blanco cocido', huevo: 'Huevo cocido o revuelto', pan: 'Marraqueta', marraqueta: 'Marraqueta', leche: 'Leche semidescremada',
  palta: 'Palta', pollo: 'Pechuga de pollo a la plancha', pechuga: 'Pechuga de pollo a la plancha', carne: 'Carne de vacuno magra (posta, lomo)',
  papa: 'Papa cocida', fideo: 'Fideos / tallarines cocidos', tallarin: 'Fideos / tallarines cocidos', te: 'Café o té sin azúcar', cafe: 'Café o té sin azúcar',
  queso: 'Queso mantecoso / gauda', jamon: 'Jamón de pavo', tomate: 'Tomate', lechuga: 'Lechuga', azucar: 'Azúcar', aceite: 'Aceite (oliva o vegetal)',
  yogurt: 'Yogurt batido / normal', avena: 'Avena', platano: 'Plátano', manzana: 'Manzana', naranja: 'Naranja', atun: 'Atún al agua',
  ensalada: 'Ensalada de lechuga y tomate', lenteja: 'Lentejas guisadas', poroto: 'Porotos cocidos (blancos, tórtola)', mantequilla: 'Mantequilla / margarina',
  agua: 'Agua / agua mineral', bebida: 'Bebida azucarada', jugo: 'Jugo natural de frutas (sin azúcar)', salmon: 'Salmón', pescado: 'Merluza / reineta al horno',
};
function matchAlimento(term) {
  const limpio = term.replace(/\b(de|del|la|el|los|las|un|una)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const prueba = (q) => { const r = q ? buscar(q) : null; return r && r.length ? r : null; };
  const sing = (w) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w);
  const sg = limpio.split(' ').map(sing).join(' ');
  // une singular y plural ("huevos" también encuentra "Huevo cocido")
  const unir = (a, b) => (a || b ? [...new Map([...(a || []), ...(b || [])].map((x) => [x.id, x])).values()] : null);
  let r = unir(prueba(limpio), prueba(sg));
  if (!r) for (const w of limpio.split(' ').filter((x) => x.length >= 3).sort((a, b) => b.length - a.length)) { r = unir(prueba(w), prueba(sing(w))); if (r) break; }
  if (!r) return [];
  // orden: lo que ya has comido antes, luego el nombre que empieza igual y el más simple (más corto)
  const rec = new Set(recientes().map((a) => a.n)), pref = PREF_ALIM[sg] || PREF_ALIM[limpio];
  const pun = (a) => (rec.has(a.n) ? 200 : 0) + (pref && a.n === pref ? 100 : 0) + (normal(a.n).startsWith(sg) ? 50 : 0) - a.n.length;
  return [...r].sort((a, b) => pun(b) - pun(a));
}
const snapFood = (food) => ({ id: food.id, n: food.n, p: food.p, k: food.k, pr: food.pr, c: food.c || 0, g: food.g || 0, gp: food.gp || null, u: food.u || 'g', cat: food.cat });
// "media palta" con porción "¼ unidad" → 2 porciones · "1/2 taza de avena" con porción "½ taza" → 1 porción
function porcionesDe(food, c) {
  if (c.gr != null || c.sinCant) return c.q;
  const pm = normal(food.p).match(/^(½|¼|\d+(?:[.,]\d+)?)\s+([a-zñ]+)/);
  if (!pm) return c.q;
  const frac = pm[1] === '½' ? 0.5 : pm[1] === '¼' ? 0.25 : +pm[1].replace(',', '.');
  const pu = pm[2].replace(/(es|s)$/, ''), cu = c.unidad;
  const mismaMedida = cu ? pu.slice(0, 4) === cu.slice(0, 4) : pu.startsWith('unidad') || pu === 'de';
  return frac > 0 && mismaMedida ? Math.round((c.q / frac) * 4) / 4 : c.q;
}
function ingDesde(food, c, alts, term) {
  const snap = snapFood(food), porG = c.gr != null && food.gp;
  const ri = { food: snap, marca: 'prom', modo: porG ? 'g' : 'u', q: porG || c.gr != null ? 1 : porcionesDe(food, c), gr: porG ? c.gr : Math.round(food.gp || 100), ug: food.gp || null };
  const x = calcIng(ri);
  return { food: snap, n: snap.n, u: snap.u, marca: x.marca, mv: 'prom', modo: ri.modo, q: ri.q, ug: ri.ug, gr: x.gr == null ? null : r1(x.gr), k: x.k, pr: x.pr, c: x.c, g: x.g, alts, term };
}
// recalcula calorías y macros de un ingrediente tras cambiar cantidad o modo
function recalcIng(it) {
  const x = calcIng({ food: it.food, marca: it.mv || 'prom', modo: it.modo, q: it.q, gr: it.gr, ug: it.ug || it.food.gp });
  Object.assign(it, { k: x.k, pr: x.pr, c: x.c, g: x.g, gr: it.modo === 'g' ? it.gr : x.gr == null ? null : r1(x.gr) });
}
function platoDesdeTexto(txt) {
  const ings = [], noEnc = [];
  for (const parte of partesTexto(txt)) {
    const c = cantidadDe(parte), r = matchAlimento(c.resto);
    if (!r.length) { noEnc.push(c.resto); continue; }
    ings.push(ingDesde(r[0], c, r.slice(1, 4).map((a) => a.id), c.resto));
  }
  return { ings, noEnc };
}
function multiBtnHTML(q) {
  const partes = q ? partesTexto(q) : [];
  if (!(partes.length >= 2 || (partes.length === 1 && !cantidadDe(partes[0]).sinCant))) return '';
  return `<button class="btn primary wide multi" data-act="multitxt">🍽️ ${sheet.rec ? 'Agregar como ingredientes' : 'Agregar todo junto'} (${partes.length}): ${partes.map(esc).join(' · ')}</button>`;
}
const foodBtn = (a) => `<button class="fres-i" data-act="pickfood" data-id="${esc(a.id)}"><b>${esc(a.n)}</b><span>${esc(a.p)} · ${a.k} kcal · ${a.pr} g prot.</span></button>`;
function resultadosHTML(q) {
  const r = buscar(q), multi = multiBtnHTML(q);
  if (r) return multi + (r.length ? r.map(foodBtn).join('') : multi ? '' : `<p class="muted small">No encontré "${esc(q)}". Prueba con otra palabra o créalo abajo.</p>`);
  const rec = recientes();
  let h = rec.length ? `<p class="fres-h">Recientes</p>${rec.map(foodBtn).join('')}` : '';
  const preps = S.propios.filter((a) => a.rec), mios = S.propios.filter((a) => !a.rec);
  if (preps.length) h += `<p class="fres-h">Mis preparaciones</p>${preps.map(foodBtn).join('')}`;
  if (mios.length) h += `<p class="fres-h">Mis alimentos</p>${mios.map(foodBtn).join('')}`;
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
      ${f.rec && !sheet.editItem ? `<button class="btn wide" data-act="recedit">🍳 Ver / editar ingredientes (${f.rec.ings.length})</button>` : ''}
      ${sheet.editItem ? '<button class="btn ghost big" data-act="closesheet">Cancelar</button>' : '<button class="btn ghost big" data-act="backfood">Elegir otro</button>'}</div>`;
  } else if (sheet.scan) {
    body = scanHTML();
  } else if (sheet.custom) {
    body = formAlimentoHTML(sheet.draft || {}, { id: 'fcustom', boton: 'Guardar y elegir cantidad', volver: '<button type="button" class="btn ghost big" data-act="backfood">Volver</button>' });
  } else if (sheet.rec) {
    body = recHTML();
  } else {
    body = `<input id="fsearch" type="search" placeholder="Busca o escribe todo: pan con jamón y tomate" autocomplete="off" value="${esc(sheet.q_)}">
      <details class="small muted ayuda-cant"><summary>💡 Escribe varios de una vez, con su cantidad</summary>
        <p>Separa con comas o "y", y pon la cantidad antes de cada alimento:</p>
        <ul><li><b>2 huevos</b>, <b>1 marraqueta</b> y <b>café con leche</b> → porciones</li><li><b>150 g de arroz</b>, <b>200 ml de leche</b> → gramos o ml</li><li><b>media palta</b>, <b>1/2 taza de avena</b>, <b>un cuarto de pollo</b></li><li>También al final: <b>pan x2</b>, <b>arroz 150 g</b></li></ul>
        <p>Si no pones cantidad se usa 1 porción. Después ajustas cada una con − y +.</p></details>
      <button class="btn scanbtn" data-act="scanopen">📷 Escanear código de barras</button>
      <div id="fres" class="fres">${resultadosHTML(sheet.q_)}</div>
      <button class="btn recbtn" data-act="recnew">🍳 Preparación con ingredientes</button>
      <button class="link" data-act="customfood">+ Crear alimento propio</button>`;
  }
  return `<div class="sheet-bg" data-act="closesheet"></div><div class="sheet-p" role="dialog" aria-label="Agregar alimento">
    <div class="sheet-h"><h3>${meal[2]} ${meal[1]}</h3><button class="link" data-act="closesheet" aria-label="Cerrar">✕</button></div>${body}</div>`;
}
/* ---- Preparaciones: ingredientes con marca y cantidad, totales automáticos ---- */
// valores por 100 g/ml del alimento o de la marca elegida (null si no se conoce el peso)
function per100(food, op) {
  if (op && op.per) return op.per;
  if (!food.gp) return null;
  const f = 100 / food.gp;
  return { k: food.k * f, pr: food.pr * f, c: (food.c || 0) * f, g: (food.g || 0) * f };
}
function opcionesMarca(food) {
  const gr = grupoMarcas(food);
  if (!gr) return null;
  const ops = gr[3].map(([m, k, pr, c, g]) => ({ v: 'm:' + m, n: m, per: { k, pr, c, g } }));
  // productos propios o escaneados del mismo tipo (ej. "Vienesa · PF") también son marcas
  for (const p of S.propios) {
    if (p.rec || !p.gp || p.id === food.id) continue;
    const n = normal(p.n);
    if (gr[1].some((k) => n.includes(k))) ops.push({ v: 'p:' + p.id, n: p.n, mio: true, ug: p.gp, per: { k: (p.k * 100) / p.gp, pr: (p.pr * 100) / p.gp, c: ((p.c || 0) * 100) / p.gp, g: ((p.g || 0) * 100) / p.gp } });
  }
  return { grupo: gr[0], ops };
}
const opDe = (ri) => (ri.marca && ri.marca !== 'prom' ? (opcionesMarca(ri.food)?.ops || []).find((o) => o.v === ri.marca) : null);
function calcIng(ri) {
  const op = opDe(ri), per = per100(ri.food, op), ug = ri.ug || ri.food.gp;
  if (per && (ri.modo === 'g' || ug)) {
    const gr = ri.modo === 'g' ? ri.gr || 0 : (ri.q || 0) * ug, f = gr / 100;
    return { gr, k: per.k * f, pr: per.pr * f, c: per.c * f, g: per.g * f, marca: op ? op.n : null };
  }
  const q = ri.q || 0, fd = ri.food;
  return { gr: null, k: fd.k * q, pr: fd.pr * q, c: (fd.c || 0) * q, g: (fd.g || 0) * q, marca: op ? op.n : null };
}
function totRec(R) {
  return R.ings.reduce((a, x) => { a.k += x.k; a.pr += x.pr; a.c += x.c; a.g += x.g; if (x.gr != null) a.gr += x.gr; else a.sinPeso = true; return a; }, { k: 0, pr: 0, c: 0, g: 0, gr: 0, sinPeso: false });
}
function abrirIng(food) {
  const snap = snapFood(food);
  sheet.recIng = { food: snap, marca: 'prom', modo: 'u', q: 1, gr: Math.round(food.gp || 100), ug: food.gp || null, idx: null };
  sheet.recFase = 'ing';
}
const prevIng = (x, u) => `${Math.round(x.k)} kcal · ${fmtN(x.pr)} g prot.${x.gr ? ` · ${fmtN(x.gr)} ${u}` : ''}`;
function recPrevTxt() {
  const R = sheet.rec, t = totRec(R), porc = num(R.porc) || 1, comi = num(R.comi) || 1;
  if (!R.ings.length) return 'Agrega los ingredientes';
  return `1 porción = ${Math.round(t.k / porc)} kcal · agregas ${Math.round((t.k / porc) * comi)} kcal`;
}
function recHTML() {
  const R = sheet.rec;
  if (sheet.recFase === 'buscar') {
    return `<p class="small muted">Ingrediente para <b>${esc(R.n || 'tu preparación')}</b></p>
      <input id="fsearch" type="search" placeholder="Busca o escribe varios: tomate, palta y mayo" autocomplete="off" value="${esc(sheet.q_)}">
      <button class="btn scanbtn" data-act="scanopen">📷 Escanear el envase (valor exacto)</button>
      <div id="fres" class="fres">${resultadosHTML(sheet.q_)}</div>
      <button class="link" data-act="customfood">+ Crear ingrediente propio</button>
      <button class="btn ghost big" data-act="recfase" data-v="edit">Volver a la preparación</button>`;
  }
  if (sheet.recFase === 'ing' && sheet.recIng) {
    const ri = sheet.recIng, fd = ri.food, u = fd.u || 'g', mo = opcionesMarca(fd), op = opDe(ri);
    const puedeG = !!per100(fd, op), x = calcIng(ri);
    const marcas = mo ? `<span class="lbl">¿Qué marca?</span><div class="chips marcas">${[{ v: 'prom', n: 'No sé · promedio' }, ...mo.ops].map((o) => `<button class="tab ${ri.marca === o.v ? 'on' : ''}" data-act="recmarca" data-v="${esc(o.v)}">${o.mio ? '🏷️ ' : ''}${esc(o.n)}</button>`).join('')}</div>
      <p class="small muted">${ri.marca === 'prom' ? 'Sin marca se usa un valor estándar.' : op?.mio ? 'Valores de tu producto escaneado.' : 'Valor aproximado de la etiqueta de esa marca.'}</p>` : '';
    const porG = puedeG && ri.modo === 'g';
    const modo = puedeG ? `<div class="seg"><button class="${porG ? '' : 'on'}" data-act="rimodo" data-v="u">Cantidad</button><button class="${porG ? 'on' : ''}" data-act="rimodo" data-v="g">Por ${u === 'ml' ? 'ml' : 'peso (g)'}</button></div>` : '';
    const ctrl = porG
      ? `<div class="qty"><button class="btn" data-act="rig" data-d="-5" aria-label="Menos">−</button><input id="ri_g" type="text" inputmode="decimal" value="${fmtN(ri.gr)}" aria-label="Cantidad en ${u}"><span class="qu">${u}</span><button class="btn" data-act="rig" data-d="5" aria-label="Más">+</button></div>
        <div class="chips">${[5, 10, 15, 30, 50, 100, 150].map((v) => `<button class="tab ${v === ri.gr ? 'on' : ''}" data-act="rigset" data-v="${v}">${v}</button>`).join('')}</div>`
      : `<div class="qty"><button class="btn" data-act="riq" data-d="-0.5" aria-label="Menos">−</button><input id="ri_q" type="text" inputmode="decimal" value="${fmtN(ri.q, 2)}" aria-label="Cantidad"><button class="btn" data-act="riq" data-d="0.5" aria-label="Más">+</button></div>
        <div class="chips">${[0.5, 1, 2, 3].map((v) => `<button class="tab ${v === ri.q ? 'on' : ''}" data-act="riqset" data-v="${v}">${String(v).replace('.', ',')}</button>`).join('')}</div>
        <p class="small muted center">Cada una: ${esc(fd.p)}</p>${puedeG ? `<label class="inl small">Peso de cada una (${u})<input id="ri_ug" type="text" inputmode="decimal" value="${fmtN(ri.ug || fd.gp)}"></label>` : ''}`;
    return `<div class="pick"><b class="pick-n">${esc(fd.n)}</b>${marcas}${modo}${ctrl}
      <p class="prev" id="riprev">${prevIng(x, u)}</p>
      <button class="btn primary big" data-act="ringok">${ri.idx != null ? 'Guardar ingrediente' : 'Agregar ingrediente'}</button>
      <button class="btn ghost big" data-act="recfase" data-v="${ri.idx != null ? 'edit' : 'buscar'}">${ri.idx != null ? 'Cancelar' : 'Elegir otro'}</button></div>`;
  }
  const t = totRec(R), meal = COMIDAS_DIA.find((m) => m[0] === sheet.m);
  const altsDe = (it, i) => {
    const fs = (it.alts || []).map((id) => todosAlimentos().find((a) => a.id === id)).filter(Boolean);
    return fs.length ? `<div class="alts"><span class="small muted">¿Era otro?</span>${fs.map((a) => `<button class="tab" data-act="recalt" data-i="${i}" data-id="${esc(a.id)}">${esc(a.n)}</button>`).join('')}</div>` : '';
  };
  const qCtl = (it, i) => {
    const g = it.modo === 'g', u = it.u || 'g', puedeG = !!per100(it.food, opDe({ food: it.food, marca: it.mv || 'prom' }));
    return `<div class="ing-q"><button class="btn qb" data-act="ingq" data-i="${i}" data-d="-1" aria-label="Menos">−</button>
      <span class="ing-v"><b>${g ? `${fmtN(it.gr)} ${u}` : fmtN(it.q, 2)}</b>${g ? '' : `<span class="small muted"> × ${esc(it.food.p)}</span>`}</span>
      <button class="btn qb" data-act="ingq" data-i="${i}" data-d="1" aria-label="Más">+</button>
      ${puedeG ? `<button class="link small" data-act="ingmodo" data-i="${i}">${g ? 'en porciones' : `en ${u === 'ml' ? 'ml' : 'gramos'}`}</button>` : ''}</div>`;
  };
  const rows = R.ings.map((it, i) => `<div class="fi-w"><div class="fi"><div class="grow tap" data-act="recingedit" data-i="${i}"><b>${esc(it.n)}${it.marca ? ` · ${esc(it.marca)}` : ''}</b><span class="small muted">${Math.round(it.k)} kcal · ${fmtN(it.pr)} g prot.${it.term ? ` · escribiste "${esc(it.term)}"` : ''}</span></div><button class="link danger" data-act="recdel" data-i="${i}" aria-label="Quitar">✕</button></div>${qCtl(it, i)}${altsDe(it, i)}</div>`).join('')
    + ((R.noEnc || []).length ? `<p class="small warn-t">No encontré: ${R.noEnc.map(esc).join(', ')}. Agrégalos con "+ Agregar ingrediente" o créalos.</p>` : '');
  return `<div class="form">
    <label>${R.rapido ? 'Nombre del plato' : 'Nombre de la preparación'}<input id="rnom" value="${esc(R.n)}" placeholder="ej: Completo en marraqueta" autocomplete="off"></label>
    ${R.ings.length ? '<p class="small muted">Ajusta la cantidad de cada alimento con <b>−</b> y <b>+</b> (o cámbiala a gramos). Toca el nombre para elegir marca o peso exacto.</p>' : ''}
    <div class="recings">${rows || '<p class="small muted">Agrega los ingredientes con su cantidad o peso, o escríbelos todos juntos en el buscador. Si tiene marca te la pregunto; si no la sabes, uso un valor promedio.</p>'}</div>
    <button class="btn wide" data-act="recfase" data-v="buscar">+ Agregar ingrediente</button>
    ${R.ings.length ? `<div class="rectot"><b>Total: ${Math.round(t.k)} kcal</b><span>${fmtN(t.pr)} g prot. · ${fmtN(t.c, 0)} g carb. · ${fmtN(t.g, 0)} g grasa${t.gr && !t.sinPeso ? ` · ${fmtN(t.gr)} g` : ''}</span></div>` : ''}
    <div class="row2"><label>Rinde (porciones)<input id="rporc" type="text" inputmode="decimal" value="${fmtN(num(R.porc) || 1, 2)}"></label><label>Comiste (porciones)<input id="rcomi" type="text" inputmode="decimal" value="${fmtN(num(R.comi) || 1, 2)}"></label></div>
    <p class="prev" id="rprev">${recPrevTxt()}</p>
    <label class="chkl"><input type="checkbox" id="rguardar" ${R.guardar ? 'checked' : ''}> Guardar en Mis preparaciones para repetirla</label>
    <button class="btn primary big" data-act="recok">${R.id ? 'Guardar y agregar' : `Agregar a ${meal[1]}`}</button>
    <button class="btn ghost big" data-act="recsalir">Cancelar</button></div>`;
}

const MSG_PERDER = '¿Salir sin guardar? Se perderá lo que anotaste.';
function hojaSucia() {
  if (!sheet.open) return false;
  const R = sheet.rec;
  if (R && (JSON.stringify(R.ings) !== (R.ings0 ?? '[]') || (R.n || '') !== (R.n0 ?? R.n ?? ''))) return true;
  if (R && sheet.recIng && sheet.recIng.idx == null) return true;
  if (sheet.custom) {
    const fm = $('#fcustom');
    if (fm && ['n', 'p', 'k'].some((k) => (fm.elements[k]?.value || '').trim())) return true;
  }
  return false;
}
let popIgnorar = false;
function abrirHistHoja() { if (!history.state?.hoja) history.pushState({ hoja: 1 }, ''); }
function soltarHoja() { if (history.state?.hoja) { popIgnorar = true; history.back(); } }
window.addEventListener('popstate', () => {
  if (popIgnorar) { popIgnorar = false; return; }
  if (!sheet.open) return;
  const rearmar = () => history.pushState({ hoja: 1 }, '');
  // retrocede un paso dentro de la hoja en vez de cerrarla
  if (sheet.rec && sheet.recFase !== 'edit') { sheet.recFase = 'edit'; sheet.recIng = null; rearmar(); renderSheet(); return; }
  if (!sheet.rec && ((sheet.food && !sheet.editItem) || sheet.scan || sheet.custom)) {
    if (sheet.custom && hojaSucia() && !confirm(MSG_PERDER)) { rearmar(); return; }
    Object.assign(sheet, { food: null, custom: false, scan: false, draft: null }); rearmar(); renderSheet(); return;
  }
  if (hojaSucia() && !confirm(MSG_PERDER)) { rearmar(); return; }
  sheet.open = false; sheet.rec = null; renderSheet();
});
function renderSheet() {
  if (!sheet.open) soltarHoja();
  const el = $('#sheet');
  if (!el) return;
  stopScanner();
  // dentro de una preparación, el alimento elegido (buscado, escaneado o creado) pasa a ser un ingrediente
  if (sheet.rec && sheet.food) { abrirIng(sheet.food); sheet.food = null; }
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
  const oc = !!S.perfil.ocultarKcal;
  const premioHoy = esDiaPremio(d);
  const pasadoBajo = d < t && diaCompleto(d) && tot.k < o.kcal * 0.6;
  const alNut = alertasNutricion();
  const pct = Math.min(100, (tot.k / o.kcal) * 100), pctP = Math.min(100, (tot.pr / o.prot) * 100);
  const ayer = iso(addDays(parse(d), -1));
  const meals = COMIDAS_DIA.map(([m, nom, ico]) => {
    const its = items.filter((x) => x.m === m), tt = totales(its);
    const prev = diaComidas(ayer).filter((x) => x.m === m);
    return `<div class="card meal-c"><div class="mh"><h3>${ico} ${nom}</h3><b>${oc ? `${Math.round(tt.pr)} g prot.` : `${Math.round(tt.k)} kcal`}</b></div>
      ${its.map((x) => `<div class="fi"><div class="grow tap" data-act="editfood" data-id="${x.id}"><b>${x.gr ? '' : fmtQ(x.q)}${esc(x.f.n)}</b><span class="small muted">${x.gr ? `${fmtN(x.gr)} ${x.f.u || 'g'}` : esc(x.f.p)} · ${Math.round(x.f.pr * x.q)} g prot.</span></div><span>${oc ? '' : Math.round(x.f.k * x.q)}</span><button class="link danger" data-act="delfood" data-id="${x.id}" aria-label="Quitar">✕</button></div>`).join('')}
      <div class="btns"><button class="btn small-btn" data-act="opensheet" data-m="${m}">+ Agregar</button>${!its.length && prev.length ? `<button class="btn ghost small-btn" data-act="repetir" data-m="${m}">↺ Repetir de ayer${oc ? '' : ` (${Math.round(totales(prev).k)} kcal)`}</button>` : ''}</div></div>`;
  }).join('');
  const labs = [], vals = [];
  for (let i = 13; i >= 0; i--) {
    const dd = iso(addDays(parse(t), -i));
    labs.push(parse(dd).getDate());
    vals.push(Math.round(totales(diaComidas(dd)).k));
  }
  // promedio solo con días completos (≥2 comidas principales): un olvido de registro no cuenta como comer poco
  const prev7 = [];
  for (let i = 7; i >= 1; i--) { const dd = iso(addDays(parse(t), -i)); if (diaCompleto(dd)) prev7.push(totales(diaComidas(dd)).k); }
  const prom = prev7.length ? Math.round(prev7.reduce((a, b) => a + b, 0) / prev7.length) : null;
  const nomDia = d === t ? 'Hoy' : d === iso(addDays(parse(t), -1)) ? 'Ayer' : DIAS[parse(d).getDay()];
  return `${header('Comida')}<section class="wrap">
    <div class="weeknav"><button class="btn ghost" data-act="cday" data-d="-1" aria-label="Día anterior">‹</button><div><b>${nomDia}</b><span class="small muted">${fmt(d)}</span></div><button class="btn ghost" data-act="cday" data-d="1" ${d >= t ? 'disabled' : ''} aria-label="Día siguiente">›</button></div>
    ${premioHoy ? '<div class="card premio hoy"><div class="premio-i">🎉</div><div class="grow"><b>Día de premio</b><p class="small">Te lo ganaste con tu constancia. Anota si quieres, pero sin culpa: este día cuenta como bueno en tu racha.</p></div></div>' : ''}
    <div class="card accent sumc">
      ${oc ? `<div class="kc"><b>${Math.round(tot.pr)} g</b><span>de ${o.prot} g de proteína</span></div>
      <div class="pbar"><i style="width:${pctP}%" class="prot"></i></div>
      <p class="small">Modo sin calorías: enfócate en proteína, frutas y verduras, y agua. <button class="link small" data-act="ocultarkcal">Mostrar calorías</button></p>`
      : `<div class="kc"><b>${Math.round(tot.k).toLocaleString('es-CL')}</b><span>de ${o.kcal.toLocaleString('es-CL')} kcal</span></div>
      <div class="pbar"><i style="width:${pct}%" class="${tot.k > o.kcal && !premioHoy ? 'over' : pasadoBajo ? 'bajo' : ''}"></i></div>
      <p class="small">${pasadoBajo ? 'Este día quedó muy bajo. Si no lo anotaste completo, no pasa nada; si comiste así de poco, intenta no repetirlo: comer muy poco frena tu energía y tu fuerza.'
        : rest >= 0 ? `Te quedan <b>${rest.toLocaleString('es-CL')} kcal</b> para ${d === t ? 'hoy' : 'ese día'}`
        : premioHoy ? '🎉 Día de premio: disfrútalo sin culpa. Mañana sigues normal, sin compensar.'
        : `${d === t ? 'Hoy vas' : 'Ese día fuiste'} <b>${(-rest).toLocaleString('es-CL')} kcal</b> sobre tu referencia. Un día así no cambia tu semana: sigue normal en la próxima comida, sin compensar.`}</p>
      <div class="macros macros3"><div><b>${Math.round(tot.pr)} / ${o.prot} g</b><span>Proteína</span></div><div><b>${Math.round(tot.c)} / ${o.carb} g</b><span>Carbohidratos</span></div><div><b>${Math.round(tot.g)} / ${o.grasa} g</b><span>Grasas</span></div></div>
      <div class="pbar thin"><i style="width:${pctP}%" class="prot"></i></div><p class="small muted">Proteína: ${Math.round(pctP)}% de tu meta${o.real?.tdee && !o.real.fuera ? ' · ⚙️ meta calibrada con tus registros' : ''}</p>`}
    </div>
    ${alertasHTML(alNut)}
    ${deporteComidaHTML(d)}
    ${!alNut.suficiente ? `<p class="small muted center">Los avisos de alimentación se activan con 5 días completos (2 o más comidas anotadas) en las últimas 2 semanas. Llevas ${alNut.completos}.</p>` : ''}
    ${meals}
    ${calidadHTML(d)}
    ${aguaHTML(d)}
    ${oc ? '' : `<div class="card"><h3>📊 Últimos 14 días</h3>${chartBars(labs, vals, { min: o.kcal, hl: 13, goal: o.kcal, noVal: true, label: 'calorías por día' })}
      <p class="small muted">${prom ? `Promedio de los últimos 7 días completos: <b>${prom.toLocaleString('es-CL')} kcal</b>. ` : ''}La línea punteada es tu meta (${o.kcal.toLocaleString('es-CL')} kcal).</p>
      <button class="link small" data-act="ocultarkcal">Ocultar las calorías por un tiempo</button></div>`}
    <details class="card acc"><summary>¿Cómo se calcula tu meta?</summary><p>Gasto estimado: ~${o.tdee.toLocaleString('es-CL')} kcal/día (metabolismo basal ${o.bmr} kcal × actividad${o.real?.tdee && !o.real.fuera ? ', calibrado con tus registros' : ''}). ${textoMeta(o)} Agua recomendada: ${o.agua} L/día.</p>${textoMetabolismo(o)}</details>
    <a class="card row-link" href="#/alimentos"><span>🥫</span><div class="grow"><b>Mis alimentos</b><span class="small muted">Edita o borra los productos que creaste o escaneaste</span></div>›</a>
    <h2 class="sec">Claves</h2>
    ${consejosComida(o).map(([ti, de]) => `<details class="card acc"><summary>${ti}</summary><p>${de}</p></details>`).join('')}
    <p class="small muted center">Las calorías son aproximadas (porciones caseras). Para productos envasados, crea el alimento con los datos de la etiqueta. Esta app orienta y educa; no reemplaza la evaluación de un nutricionista.</p>
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
  const conEq = plan.filter((x) => puedoHacer(x)), sinEq = plan.filter((x) => !puedoHacer(x));
  const opts = `<optgroup label="Con tu equipo">${conEq.map((x) => `<option value="${x}">${esc(EJERCICIOS[x].nombre)}</option>`).join('')}</optgroup>` +
    (sinEq.length ? `<optgroup label="Requieren otro equipo (o tienen restricción)">${sinEq.map((x) => `<option value="${x}">${esc(EJERCICIOS[x].nombre)}</option>`).join('')}</optgroup>` : '') +
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
    <p class="small muted">Productos que creaste o escaneaste y tus preparaciones 🍳. Puedes corregir sus valores o eliminarlos; lo que ya registraste en días anteriores no cambia. Las preparaciones se editan desde Comida → + Agregar → elígela → «Ver / editar ingredientes».</p>
    ${L.length ? `<div class="card">${L.map((a) => `<div class="fi"><div class="grow"><b>${a.rec ? '🍳 ' : ''}${esc(a.n)}</b><span class="small muted">${esc(a.p)} · ${a.k} kcal · ${a.pr} g prot.${a.bc ? ' · 🏷️ ' + esc(a.bc) : ''}${a.rec ? ` · ${a.rec.ings.map((i) => esc(i.n + (i.marca ? ' ' + i.marca : ''))).join(', ')}` : ''}</span></div>${a.rec ? '' : `<a class="btn small-btn" href="#/alimento/${a.id}">Editar</a>`}<button class="link danger" data-act="delpropio" data-id="${a.id}" aria-label="Eliminar">✕</button></div>`).join('')}</div>`
      : '<div class="card"><p class="muted">Aún no tienes alimentos propios. Créalos o escanéalos desde Comida → + Agregar.</p></div>'}
  </section>`;
}
function vAlimento(id) {
  const a = S.propios.find((x) => x.id === id);
  if (!a) return vAlimentos();
  return `${header('Editar alimento', '#/alimentos')}<section class="wrap"><div class="card">${formAlimentoHTML(a, { id: 'fpropio', boton: 'Guardar cambios', volver: '<a class="btn ghost big" href="#/alimentos">Cancelar</a>' })}</div></section>`;
}

/* ---- MI EQUIPAMIENTO ---- */
let eqDraft = null;
function diffPlanes(a, b) {
  const nombre = (id) => EJERCICIOS[id]?.nombre || id;
  const ejs = (se) => se ? se.bloques.flatMap((x) => (x.tipo === 'ej' ? [x.id] : x.tipo === 'circuito' ? x.ejercicios.map((e) => e.id) : [])) : [];
  const out = [];
  for (const sid of new Set([...a.orden, ...b.orden])) {
    const A = ejs(a.ses[sid]), B = ejs(b.ses[sid]);
    const sale = A.filter((x) => !B.includes(x)), entra = B.filter((x) => !A.includes(x));
    if (sale.length || entra.length || (a.ses[sid]?.nombre !== b.ses[sid]?.nombre)) {
      out.push({ nombre: (b.ses[sid] || a.ses[sid]).nombre, sale: sale.map(nombre), entra: entra.map(nombre) });
    }
  }
  if (a.cardio.label !== b.cardio.label) out.push({ nombre: 'Cardio', sale: [a.cardio.label], entra: [b.cardio.label] });
  return out;
}
function vEquipo() {
  const p = S.perfil;
  if (!eqDraft) eqDraft = { lugar: p.lugar || 'casa', equipo: [...(p.equipo || [])], mancMax: p.mancMax ?? '' };
  const d = eqDraft;
  const nuevo = { ...p, lugar: d.lugar, equipo: d.lugar === 'casa' ? d.equipo : [], mancMax: num(d.mancMax) };
  const cambios = diffPlanes(PLAN(), generarPlan(nuevo));
  const todos = Object.keys(META);
  const ganados = todos.filter((id) => puedoHacer(id, nuevo) && !puedoHacer(id, p)).map((id) => EJERCICIOS[id].nombre);
  const perdidos = todos.filter((id) => !puedoHacer(id, nuevo) && puedoHacer(id, p)).map((id) => EJERCICIOS[id].nombre);
  // ejercicios que el equipo nuevo permitiría, pero que el nivel o las molestias descartan
  const eqN = equipoDe(nuevo), eqP = equipoDe(p);
  const bloqueados = todos.filter((id) => cumpleEq(META[id].eq, eqN) && !cumpleEq(META[id].eq, eqP) && !puedoHacer(id, nuevo)).map((id) => {
    const lv = META[id].lvl || 0;
    const porNivel = lv > (NIVEL_N[p.nivel] ?? 1);
    return `${EJERCICIOS[id].nombre} (${porNivel ? `requiere nivel ${PERFIL_OPC.niveles[lv][1].toLowerCase()}` : 'no recomendado por tus molestias'})`;
  });
  const hayCambio = JSON.stringify([p.lugar, p.equipo || [], p.mancMax ?? null]) !== JSON.stringify([nuevo.lugar, nuevo.equipo, nuevo.mancMax ?? null]);
  const chip = (v, label) => `<button type="button" class="chip ${d.equipo.includes(v) ? 'on' : ''}" data-act="eqset" data-v="${v}">${label}</button>`;
  return `${header('Mi equipamiento', '#/mas')}<section class="wrap">
    <p class="small muted">Marca lo que tienes. Antes de guardar verás qué ejercicios se suman y cómo cambia tu plan.</p>
    <div class="opts two">
      <button type="button" class="opt ${d.lugar === 'casa' ? 'on' : ''}" data-act="eqlugar" data-v="casa"><span class="opt-i">🏠</span><span class="opt-t"><b>En casa</b><small>Con lo que tengas</small></span></button>
      <button type="button" class="opt ${d.lugar === 'gimnasio' ? 'on' : ''}" data-act="eqlugar" data-v="gimnasio"><span class="opt-i">🏋️</span><span class="opt-t"><b>Gimnasio</b><small>Equipo completo</small></span></button>
    </div>
    ${d.lugar === 'casa' ? `<div class="card"><h3>Tu equipo en casa</h3><div class="chips">${PERFIL_OPC.equipo.map(([v, i, l]) => chip(v, `${i} ${l}`)).join('')}</div>
      ${d.equipo.includes('mancuernas') ? `<label class="mt">Peso máximo de tus mancuernas (kg cada una)<input data-eq="mancMax" type="text" inputmode="decimal" value="${esc(d.mancMax)}" placeholder="ej: 20"></label>` : ''}</div>` : '<div class="card"><p class="small">En el gimnasio usamos máquinas, poleas, barras, mancuernas, TRX y máquinas de cardio.</p></div>'}
    <div class="card ${hayCambio ? 'accent-b' : ''}"><h3>${hayCambio ? 'Así cambiaría tu plan' : 'Sin cambios todavía'}</h3>
      ${!hayCambio ? '<p class="small muted">Marca o desmarca equipo para ver el efecto.</p>' : `
      ${ganados.length ? `<p class="small"><b class="good">+ ${ganados.length} ejercicios disponibles:</b> ${ganados.map(esc).join(', ')}</p>` : ''}
      ${perdidos.length ? `<p class="small"><b style="color:var(--bad)">− ${perdidos.length} ya no disponibles:</b> ${perdidos.map(esc).join(', ')}</p>` : ''}
      ${bloqueados.length ? `<p class="small muted">🔒 ${bloqueados.map(esc).join(', ')}. Cuando subas de nivel, cámbialo en Mi perfil y objetivos.</p>` : ''}
      ${cambios.length ? cambios.map((c) => `<div class="diff"><b>${esc(c.nombre)}</b>${c.sale.map((x) => `<span class="sale">− ${esc(x)}</span>`).join('')}${c.entra.map((x) => `<span class="entra">+ ${esc(x)}</span>`).join('')}</div>`).join('')
        : '<p class="small muted">Las sesiones de tu plan no cambian (los ejercicios nuevos quedan disponibles para tus rutinas y la biblioteca).</p>'}`}
    </div>
    <button class="btn primary big" data-act="eqsave" ${hayCambio ? '' : 'disabled'}>${cambios.length ? 'Actualizar mi plan' : 'Guardar equipamiento'}</button>
    <p class="small muted center">Tu historial no se pierde. Las sesiones nuevas aplican desde tu próximo entrenamiento.</p>
    <a class="card row-link" href="#/rutinas"><span>🧩</span><div class="grow"><b>Mis rutinas</b><span class="small muted">Suma los ejercicios nuevos a tus rutinas propias</span></div>›</a>
  </section>`;
}

/* ---- INVITACIONES CON VENCIMIENTO ----
   Código: AAAAMMDD-XXXX-FIRMA (00000000 = sin vencimiento). La firma evita que se invente una fecha a mano.
   Sin servidor es un candado "suave": suficiente para compartir con conocidos. */
const INV_CLAVE = 'mE-entreno-9f2c71b8';
const INV_ALF = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function hash53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function firmaInv(base) {
  let n = hash53(INV_CLAVE + base, 7), m = hash53(base + INV_CLAVE, 13), out = '';
  for (let i = 0; i < 8; i++) { const x = i < 4 ? n : m; out += INV_ALF[x % INV_ALF.length]; if (i < 4) n = Math.floor(n / INV_ALF.length); else m = Math.floor(m / INV_ALF.length); }
  return out;
}
function crearCodigoInv(dias) {
  const vence = dias ? iso(addDays(new Date(), dias - 1)).replace(/-/g, '') : '00000000';
  let r = '';
  for (let i = 0; i < 4; i++) r += INV_ALF[Math.floor(Math.random() * INV_ALF.length)];
  const base = `${vence}-${r}`;
  return `${base}-${firmaInv(base)}`;
}
function leerCodigoInv(txt) {
  const m = String(txt || '').toUpperCase().match(/(\d{8})-([A-Z0-9]{4})-([A-Z0-9]{8})/);
  if (!m || firmaInv(`${m[1]}-${m[2]}`) !== m[3]) return null;
  if (m[1] === '00000000') return { tipo: 'total', codigo: m[0] };
  return { tipo: 'invitado', vence: `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6)}`, codigo: m[0] };
}
const linkInv = (codigo) => `${location.origin}${location.pathname}?inv=${codigo}`;
function aplicarInvitacion(inv) {
  const a = S.acceso;
  if (a?.tipo === 'total') return 'ya';
  if (inv.tipo === 'total') S.acceso = { tipo: 'total', codigo: inv.codigo };
  else S.acceso = { tipo: 'invitado', vence: a?.vence && a.vence > inv.vence ? a.vence : inv.vence, codigo: inv.codigo, visto: a?.visto };
  save(true);
  return 'ok';
}
function accesoEstado() {
  const a = S.acceso;
  if (!a) return 'ninguno';
  if (a.tipo === 'total') return 'ok';
  const hoy = a.visto && a.visto > today() ? a.visto : today(); // si se atrasa la fecha del teléfono, se usa la última vista
  return hoy <= a.vence ? 'ok' : 'vencido';
}
const esStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
function vBloqueo(estado) {
  return `<section class="wrap bloqueo"><div class="hero"><div class="hero-ico">🔒</div>
    <h1>${estado === 'vencido' ? 'Tu acceso terminó' : 'Mi Entrenamiento'}</h1>
    <p>${estado === 'vencido' ? `Tu invitación venció el ${fmt(S.acceso.vence)}. <b>Tus datos siguen guardados</b>: pide un link nuevo a quien te invitó y continúa donde quedaste.` : 'Esta app funciona por invitación. Pide un link a quien te la recomendó.'}</p></div>
    <div class="card form"><label>Pega aquí tu link o código de invitación<input id="invcod" autocomplete="off" placeholder="ej: 20261231-ABCD-…"></label>
      <button class="btn primary big" data-act="invactivar">Activar</button></div>
    <details class="card acc"><summary>¿Ya usabas la app en otro teléfono?</summary><p class="small">Importa tu respaldo (.json) para recuperar tus datos y tu acceso.</p><label class="btn">Importar respaldo<input type="file" accept="application/json,.json" id="fimport" hidden></label></details>
  </section>`;
}
let invDraft = { nombre: '', dias: 30, codigo: null };
function vCompartir() {
  if (S.acceso?.tipo !== 'total') return vMas();
  const d = invDraft, hist = [...(S.invitaciones || [])].reverse().slice(0, 15), t = today();
  const res = d.codigo ? leerCodigoInv(d.codigo) : null;
  return `${header('Compartir la app', '#/mas')}<section class="wrap">
    <div class="card form"><h3>Nueva invitación</h3>
      <label>Nombre de la persona (opcional, para tu registro)<input data-inv="nombre" value="${esc(d.nombre)}" placeholder="ej: Juan"></label>
      <label>Días de acceso<input data-inv="dias" type="text" inputmode="numeric" value="${d.dias || ''}" placeholder="ej: 30"></label>
      <div class="chips2">${[7, 15, 30, 90].map((n) => `<button type="button" class="chip ${d.dias === n ? 'on' : ''}" data-act="invdias" data-v="${n}">${n} días</button>`).join('')}<button type="button" class="chip ${d.dias === 0 ? 'on' : ''}" data-act="invdias" data-v="0">♾️ Sin vencimiento</button></div>
      <p class="small muted">${d.dias ? `Vencerá el <b>${fmt(iso(addDays(new Date(), d.dias - 1)), true)}</b>.` : 'Sin vencimiento: ideal para familia.'}</p>
      <button class="btn primary big" data-act="invgen">Generar link</button></div>
    ${res ? `<div class="card accent-b"><h3>Link listo</h3>
      <p class="small">${res.tipo === 'total' ? 'Acceso sin vencimiento.' : `Válido hasta el <b>${fmt(res.vence, true)}</b>.`}</p>
      <div class="invlink">${esc(linkInv(d.codigo))}</div>
      <p class="small muted">Código: <b>${d.codigo}</b></p>
      <div class="btns"><button class="btn primary" data-act="invshare">Enviar (WhatsApp, etc.)</button><button class="btn" data-act="invcopiar">Copiar</button></div></div>` : ''}
    ${hist.length ? `<div class="card"><h3>Invitaciones enviadas</h3><ul class="plist">${hist.map((x) => `<li><span>${fmt(x.fecha)}</span><b>${esc(x.nombre || 'Sin nombre')}</b><span class="small ${x.vence && x.vence < t ? 'muted' : 'good'}">${x.vence ? (x.vence < t ? `venció ${fmt(x.vence)}` : `hasta ${fmt(x.vence)}`) : 'sin vencimiento'}</span></li>`).join('')}</ul></div>` : ''}
    <p class="small muted">Cada persona tendrá sus propios datos en su teléfono. Una invitación no se puede anular antes de su vencimiento: usa plazos cortos y envía uno nuevo si quieres extenderlo. Es un control simple, pensado para compartir con conocidos.</p>
  </section>`;
}

/* ---- Mover sesiones ---- */
let moverAlcance = 'semana';
function abrirMover(sid, w) {
  const PL = PLAN(), cur = moverAlcance === 'semana' ? diaDe(sid, w) : PL.ses[sid].dow, t = today();
  const opciones = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const otro = moverAlcance === 'semana' ? sidDelDia(d, w) : PL.dowSid[d];
    const fecha = dateOf(w, d);
    const hecha = otro && doneEnSemana(w, otro);
    if (d === cur) return `<div class="fres-i actual"><b>${DIAS[d]}${moverAlcance === 'semana' ? ` ${fmt(fecha)}` : ''}</b><span>Día actual de ${esc(PL.ses[sid].nombre)}</span></div>`;
    return `<button class="fres-i" data-act="moverdia" data-sid="${sid}" data-w="${w}" data-d="${d}" ${hecha ? 'disabled' : ''}><b>${DIAS[d]}${moverAlcance === 'semana' ? ` ${fmt(fecha)}` : ''}${moverAlcance === 'semana' && fecha < t ? ' (ya pasó)' : ''}</b>
      <span>${otro ? (hecha ? `${esc(PL.ses[otro].nombre)} ya está hecha` : `⇄ Intercambiar con ${esc(PL.ses[otro].nombre)}`) : 'Libre: mover aquí'}</span></button>`;
  }).join('');
  openModal(`⇄ Mover ${esc(PL.ses[sid].nombre)}`, `<div class="seg"><button class="${moverAlcance === 'semana' ? 'on' : ''}" data-act="moveralc" data-v="semana" data-sid="${sid}" data-w="${w}">Solo esta semana</button><button class="${moverAlcance === 'siempre' ? 'on' : ''}" data-act="moveralc" data-v="siempre" data-sid="${sid}" data-w="${w}">Todas las semanas</button></div>
    <p class="small muted">${moverAlcance === 'semana' ? 'El cambio aplica solo a esta semana; la siguiente vuelve a tus días habituales.' : 'Cambia tu calendario fijo. También actualiza tus días en el perfil.'}</p>
    <div class="fres">${opciones}</div>`);
}

/* ---- Modal genérico ---- */
function openModal(titulo, body) {
  const el = $('#modal');
  if (!el) return;
  el.innerHTML = `<div class="sheet-bg" data-act="closemodal"></div><div class="sheet-p" role="dialog" aria-label="${esc(titulo)}"><div class="sheet-h"><h3>${titulo}</h3><button class="link" data-act="closemodal" aria-label="Cerrar">✕</button></div>${body}</div>`;
  el.classList.add('open');
  document.body.classList.add('sheet-open');
}
function closeModal() {
  const el = $('#modal');
  if (el) { el.classList.remove('open'); el.innerHTML = ''; }
  document.body.classList.remove('sheet-open');
}

/* ---- CUESTIONARIO DE SALUD (PAR-Q+) ---- */
let saludDraft = null;
const pqTarget = () => wz || saludDraft;
const necesitaEmbarazo = (st) => st.sexo === 'F' && num(st.edad) >= 12 && num(st.edad) <= 55;
function parqBody(st) {
  const q = (i, txt) => `<div class="pq"><p>${i + 1}. ${txt}</p><div class="chips2">
    <button type="button" class="chip ${st.parq[i] === true ? 'on' : ''}" data-act="pqset" data-i="${i}" data-v="1">Sí</button>
    <button type="button" class="chip ${st.parq[i] === false ? 'on' : ''}" data-act="pqset" data-i="${i}" data-v="0">No</button></div></div>`;
  const algunSi = st.parq.some((x) => x === true) || st.embarazo === true;
  return `<h2>Tu salud</h2><p class="small muted">Preguntas generales del cuestionario internacional PAR-Q+. Respóndelas con sinceridad: sirven para cuidarte.</p>
    ${PARQ.map((t, i) => q(i, t)).join('')}
    ${necesitaEmbarazo(st) ? `<div class="pq"><p>${PARQ.length + 1}. ¿Estás embarazada o tuviste un parto en los últimos 6 meses?</p><div class="chips2">
      <button type="button" class="chip ${st.embarazo === true ? 'on' : ''}" data-act="pqset" data-i="emb" data-v="1">Sí</button>
      <button type="button" class="chip ${st.embarazo === false ? 'on' : ''}" data-act="pqset" data-i="emb" data-v="0">No</button></div></div>` : ''}
    ${algunSi ? `<div class="infobanner mt"><b>Te recomendamos consultar a un médico antes de aumentar tu actividad física.</b> Mientras tanto la app activará el modo precaución: cardio suave en vez de intervalos intensos y pausas más largas en el circuito. Empieza despacio y detente ante dolor en el pecho, mareo o falta de aire.${st.embarazo === true ? ' Durante el embarazo o el posparto tu meta de calorías será de mantención (sin déficit).' : ''}</div>`
      : st.parq.every((x) => x === false) ? '<div class="okbanner mt">✓ Puedes empezar a ser más activo. Avanza de forma gradual.</div>' : ''}
    ${st.parq[5] === true ? '<div class="infobanner">Por tu respuesta 6, marca en <b>Cuidados</b> (Mi perfil) la zona que te molesta: así el plan evita los ejercicios que la empeoran.</div>' : ''}`;
}
function parqCompleto(st) {
  if (st.parq.some((x) => x === null || x === undefined)) return 'Responde todas las preguntas de salud';
  if (necesitaEmbarazo(st) && (st.embarazo === null || st.embarazo === undefined)) return 'Responde la pregunta sobre embarazo';
  return null;
}
function vSalud() {
  const p = S.perfil;
  if (!saludDraft) saludDraft = { parq: p.parq?.resp ? [...p.parq.resp] : PARQ.map(() => null), embarazo: p.parq?.embarazo ?? null, sexo: p.sexo, edad: p.edad };
  return `${header('Cuestionario de salud', '#/mas')}<section class="wrap wz"><div class="card form">${parqBody(saludDraft)}</div>
    <button class="btn primary big" data-act="pqsave">Guardar</button>
    <p class="small muted center">Este cuestionario no reemplaza una evaluación médica.</p></section>`;
}

/* ---- TEMPORIZADOR DE INTERVALOS ---- */
const tm = { modo: 'tabata', tr: 40, de: 20, ro: 8, emom: 10, amrap: 12, voz: true };
const tmRun = { seq: [], i: 0, end: 0, pausa: 0, iv: null, ultimo: -1, activo: false };
const mmss = (x) => `${Math.floor(x / 60)}:${pad(Math.max(0, Math.floor(x % 60)))}`;
function hablar(t) {
  if (!tm.voz || !window.speechSynthesis) return;
  try { const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* sin voz */ }
}
function tmSecuencia() {
  const seq = [{ n: 'Prepárate', s: 10, tipo: 'prep' }];
  if (tm.modo === 'tabata' || tm.modo === 'interv') {
    const tr = tm.modo === 'tabata' ? 20 : num(tm.tr) || 30, de = tm.modo === 'tabata' ? 10 : num(tm.de) ?? 15, ro = tm.modo === 'tabata' ? 8 : num(tm.ro) || 8;
    for (let i = 0; i < ro; i++) {
      seq.push({ n: '¡Trabajo!', s: tr, tipo: 'work', r: i + 1, R: ro });
      if (i < ro - 1 && de > 0) seq.push({ n: 'Descanso', s: de, tipo: 'rest', r: i + 1, R: ro });
    }
  } else if (tm.modo === 'emom') {
    const m = num(tm.emom) || 10;
    for (let i = 0; i < m; i++) seq.push({ n: `Minuto ${i + 1}`, s: 60, tipo: 'work', r: i + 1, R: m });
  } else seq.push({ n: 'AMRAP', s: (num(tm.amrap) || 12) * 60, tipo: 'work', r: 1, R: 1, amrap: true });
  return seq;
}
function tmPintar(rest) {
  const f = tmRun.seq[tmRun.i];
  const d = $('#tmdisp');
  if (!d || !f) return;
  d.dataset.tipo = f.tipo;
  $('#tmfase').textContent = f.n;
  $('#tmt').textContent = mmss(rest);
  $('#tmr').textContent = f.R > 1 ? `Ronda ${f.r} de ${f.R}` : f.amrap ? 'Máximas rondas posibles' : '';
  $('#tmbar').style.width = `${(1 - rest / f.s) * 100}%`;
}
function tmTick() {
  const f = tmRun.seq[tmRun.i];
  if (!f) return;
  const rest = Math.max(0, (tmRun.end - Date.now()) / 1000), ent = Math.ceil(rest);
  if (ent !== tmRun.ultimo) {
    tmRun.ultimo = ent;
    if (ent <= 3 && ent > 0) beepCorto();
    if (f.amrap && ent === Math.round(f.s / 2)) hablar('Mitad del tiempo');
    if (f.amrap && ent === 60 && f.s > 120) hablar('Último minuto');
  }
  tmPintar(rest);
  if (rest <= 0) {
    tmRun.i++;
    const nx = tmRun.seq[tmRun.i];
    if (!nx) { tmParar(); $('#tmfase').textContent = '¡Terminado!'; $('#tmt').textContent = '0:00'; hablar('¡Terminado! Buen trabajo'); beep(); navigator.vibrate?.([300, 100, 300]); return; }
    tmRun.end = Date.now() + nx.s * 1000;
    tmRun.ultimo = -1;
    hablar(nx.tipo === 'work' ? (nx.amrap ? 'Comienza' : nx.n.startsWith('Minuto') ? nx.n : 'Trabajo') : 'Descanso');
    beep();
  }
}
function beepCorto() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 660; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.2, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    o.start(); o.stop(audioCtx.currentTime + 0.13);
  } catch (e) { /* sin audio */ }
}
function tmParar() { clearInterval(tmRun.iv); tmRun.iv = null; tmRun.activo = false; const b = $('#tmgo'); if (b) b.textContent = '▶ Iniciar'; }
function vTimer() {
  const cfg = tm.modo === 'interv'
    ? `<div class="cgrid"><label>Trabajo (s)<input data-tm="tr" type="text" inputmode="numeric" value="${tm.tr}"></label><label>Descanso (s)<input data-tm="de" type="text" inputmode="numeric" value="${tm.de}"></label><label>Rondas<input data-tm="ro" type="text" inputmode="numeric" value="${tm.ro}"></label></div>`
    : tm.modo === 'emom' ? `<label>Minutos<input data-tm="emom" type="text" inputmode="numeric" value="${tm.emom}"></label>`
      : tm.modo === 'amrap' ? `<label>Duración (minutos)<input data-tm="amrap" type="text" inputmode="numeric" value="${tm.amrap}"></label>`
        : '<p class="small">Tabata clásico: 20 s de trabajo y 10 s de descanso, 8 rondas (4 minutos).</p>';
  const info = { tabata: 'Máxima intensidad en cada bloque de 20 s.', interv: 'Define tu propio trabajo, descanso y rondas (ideal para circuitos).', emom: 'Al inicio de cada minuto haz las repeticiones indicadas y descansa lo que sobre del minuto.', amrap: 'Haz tantas rondas como puedas del circuito en el tiempo total, sin perder la técnica.' }[tm.modo];
  return `${header('Temporizador', '#/mas')}<section class="wrap">
    <div class="tabs">${[['tabata', 'Tabata'], ['interv', 'Intervalos'], ['emom', 'EMOM'], ['amrap', 'AMRAP']].map(([k, l]) => `<button class="tab ${tm.modo === k ? 'on' : ''}" data-act="tmmodo" data-m="${k}">${l}</button>`).join('')}</div>
    <div class="card tm-disp" id="tmdisp" data-tipo="prep"><div class="tm-fase" id="tmfase">Listo</div><div class="tm-t" id="tmt">${mmss(tmSecuencia().reduce((a, f) => a + f.s, 0))}</div><div class="tm-r" id="tmr">Duración total</div><div class="tm-bar"><i id="tmbar"></i></div></div>
    <div class="tm-btns"><button class="btn primary big" data-act="tmgo" id="tmgo">▶ Iniciar</button><button class="btn big" data-act="tmreset" aria-label="Reiniciar">↺</button></div>
    <div class="card form">${cfg}<label class="chkl"><input type="checkbox" data-tm="voz" ${tm.voz ? 'checked' : ''}> Avisos de voz</label><p class="small muted">${info}</p></div>
  </section>`;
}

/* ---- RECORDATORIOS (calendario del teléfono) ---- */
function recCfg() { return { hora: '19:00', antes: 15, peso: true, pesoDia: 2, pesoHora: '08:00', comida: false, comidaHora: '21:00', respaldo: true, ...((S.ajustes || {}).rec || {}) }; }
function icsRecordatorios() {
  const r = recCfg(), PL = PLAN(), D = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const escI = (t) => String(t).replace(/[\\,;]/g, (m) => '\\' + m);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const url = location.origin + location.pathname;
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mi Entrenamiento//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const prox = (dow) => { const d = new Date(); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); return d; };
  const ev = (uid, titulo, dow, hora, dur, alarma, desc, diario) => {
    const [hh, mm] = hora.split(':');
    L.push('BEGIN:VEVENT', `UID:${uid}-${stamp}@mientrenamiento`, `DTSTAMP:${stamp}`, `DTSTART:${iso(prox(diario ? new Date().getDay() : dow)).replace(/-/g, '')}T${hh}${mm}00`, `DURATION:PT${dur}M`,
      diario ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=WEEKLY;BYDAY=${D[dow]}`, `SUMMARY:${escI(titulo)}`, `DESCRIPTION:${escI(desc)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escI(titulo)}`, `TRIGGER:-PT${alarma}M`, 'END:VALARM', 'END:VEVENT');
  };
  for (const sid of PL.orden) ev('ses' + sid, `🏋️ ${PL.ses[sid].nombre}`, PL.ses[sid].dow, r.hora, S.perfil.dur || 45, r.antes, `Abre Mi Entrenamiento: ${url} · ¿Día difícil? 10 minutos también cuentan.`);
  if (r.peso) ev('peso', '⚖️ Chequeo semanal (peso y cintura, sin presión)', +r.pesoDia, r.pesoHora, 5, 0, 'En ayunas, después de ir al baño. Lo que importa es la tendencia, no un día. Regístralo en Mi Entrenamiento.');
  if (r.comida) ev('comida', '🍽️ Anotar lo que comí hoy', 0, r.comidaHora, 5, 0, 'Diario de comidas en Mi Entrenamiento.', true);
  if (r.respaldo) ev('resp', '💾 Exportar respaldo de Mi Entrenamiento', 0, '20:00', 5, 0, 'Más → Exportar respaldo.');
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
function vRecordatorios() {
  const r = recCfg(), PL = PLAN();
  const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
  return `${header('Recordatorios', '#/mas')}<section class="wrap">
    <div class="card"><p class="small">Las apps web no pueden enviar avisos por sí solas sin un servidor. La forma confiable es <b>agregar tus entrenamientos al Calendario de tu teléfono con alarma</b>: te avisará aunque la app esté cerrada.</p></div>
    <div class="card form"><h3>Entrenamientos</h3>
      <p class="small muted">${PL.orden.map((sid) => `${DIAS[PL.ses[sid].dow]}: ${PL.ses[sid].nombre}`).join(' · ')}</p>
      <div class="row2"><label>Hora<input type="time" data-rec="hora" value="${r.hora}"></label><label>Avisar<select data-rec="antes">${opt(0, 'a la hora', r.antes)}${opt(15, '15 min antes', r.antes)}${opt(30, '30 min antes', r.antes)}${opt(60, '1 hora antes', r.antes)}</select></label></div>
      <h3 class="mt">Otros recordatorios</h3>
      <label class="chkl"><input type="checkbox" data-rec="peso" ${r.peso ? 'checked' : ''}> Pesarme cada semana</label>
      ${r.peso ? `<div class="row2"><label>Día<select data-rec="pesoDia">${[1, 2, 3, 4, 5, 6, 0].map((d) => opt(d, DIAS[d], r.pesoDia)).join('')}</select></label><label>Hora<input type="time" data-rec="pesoHora" value="${r.pesoHora}"></label></div>` : ''}
      <label class="chkl"><input type="checkbox" data-rec="comida" ${r.comida ? 'checked' : ''}> Anotar comidas cada día</label>
      ${r.comida ? `<label>Hora<input type="time" data-rec="comidaHora" value="${r.comidaHora}"></label>` : ''}
      <label class="chkl"><input type="checkbox" data-rec="respaldo" ${r.respaldo ? 'checked' : ''}> Exportar respaldo (domingos 20:00)</label>
    </div>
    <button class="btn primary big" data-act="recics">📅 Agregar a mi calendario</button>
    <p class="small muted">Se descargará un archivo de calendario: tócalo y elige <b>Agregar todo</b>. Si cambias tus días u horario, primero borra los eventos anteriores (abre uno → Eliminar evento → <i>Eliminar todos los futuros</i>) y vuelve a agregarlos.</p>
  </section>`;
}

/* ---- APARIENCIA ---- */
function aplicarAjustes() {
  const a = S.ajustes || {};
  let tema = a.tema || 'oscuro';
  if (tema === 'auto') tema = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = tema;
  document.documentElement.style.fontSize = { normal: '16px', grande: '18px', xl: '20px' }[a.letra || 'normal'];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'claro' ? '#f4f4f6' : '#0a0a0b');
}
function vAjustes() {
  const a = S.ajustes || {}, tema = a.tema || 'oscuro', letra = a.letra || 'normal';
  const op = (k, v, ico, t, d) => `<button type="button" class="opt ${(k === 'tema' ? tema : letra) === v ? 'on' : ''}" data-act="ajset" data-k="${k}" data-v="${v}"><span class="opt-i">${ico}</span><span class="opt-t"><b>${t}</b><small>${d}</small></span></button>`;
  return `${header('Apariencia', '#/mas')}<section class="wrap">
    <h2 class="sec">Tema</h2><div class="opts">${op('tema', 'oscuro', '🔥', 'Oscuro', 'Intenso, ideal para entrenar')}${op('tema', 'claro', '☀️', 'Claro', 'Fondo blanco, más fácil de leer con luz')}${op('tema', 'auto', '🌓', 'Automático', 'Sigue el modo del teléfono')}</div>
    <h2 class="sec">Tamaño de letra</h2><div class="opts">${op('letra', 'normal', 'Aa', 'Normal', 'Tamaño estándar')}${op('letra', 'grande', '<span style="font-size:1.2em">Aa</span>', 'Grande', 'Más cómodo de leer')}${op('letra', 'xl', '<span style="font-size:1.45em">Aa</span>', 'Extra grande', 'Máxima legibilidad')}</div>
  </section>`;
}

/* ---- FOTOS DE PROGRESO (se guardan en el teléfono, IndexedDB) ---- */
const FotosDB = {
  db: null,
  abrir() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((ok, err) => {
      const r = indexedDB.open('entreno_fotos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fotos', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; ok(this.db); };
      r.onerror = () => err(r.error);
    });
  },
  async tx(modo, fn) {
    const db = await this.abrir();
    return new Promise((ok, err) => {
      const t = db.transaction('fotos', modo), st = t.objectStore('fotos');
      const req = fn(st);
      t.oncomplete = () => ok(req?.result);
      t.onerror = () => err(t.error);
    });
  },
  todas() { return this.tx('readonly', (st) => st.getAll()); },
  poner(f) { return this.tx('readwrite', (st) => st.put(f)); },
  borrar(id) { return this.tx('readwrite', (st) => st.delete(id)); },
};
let fotosURL = [];
async function reducirImagen(file) {
  const img = await imagenDeArchivo(file);
  const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight, k = Math.min(1, 1280 / Math.max(w0, h0));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.82));
}
async function cargarFotos() {
  const box = $('#fotos');
  if (!box) return;
  try {
    fotosURL.forEach((u) => URL.revokeObjectURL(u));
    fotosURL = [];
    const fs = (await FotosDB.todas()).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    window._fotos = fs;
    box.innerHTML = fs.length ? fs.map((f) => { const u = URL.createObjectURL(f.blob); fotosURL.push(u); return `<button class="foto" data-act="fotover" data-id="${f.id}"><img src="${u}" alt="Foto ${f.pose} ${f.fecha}"><span>${fmt(f.fecha)} · ${f.pose}</span></button>`; }).join('')
      : '<p class="small muted">Aún no tienes fotos. Sácalas con la misma luz, ropa y pose cada 2-4 semanas para comparar.</p>';
  } catch (e) { box.innerHTML = '<p class="small muted">No se pudieron cargar las fotos en este navegador.</p>'; }
}

/* ---- ENFOQUES ---- */
let enfDraft = null;
const nombresEnf = (areas) => areas.map((a) => ENFOQUES.find((x) => x[0] === a)?.[2] || a).join(', ');
function cambiosAjuste(pl) {
  return pl.orden.flatMap((sid) => pl.ses[sid].bloques.filter((b) => b.aj).map((b) =>
    `<div class="diff"><b>${esc(pl.ses[sid].nombre)}</b><span class="entra">${b.aj === 'nuevo' ? '+ ' : ''}${esc(EJERCICIOS[b.id]?.nombre || b.id)}${b.aj === 'nuevo' ? '' : ` · ${b.aj}`}</span></div>`));
}
function vEnfoque() {
  const p = S.perfil, activo = enfoqueActivo(p);
  if (p.enfoques && !activo && !p.enfoques.avisado) { p.enfoques.avisado = true; save(true); }
  if (!enfDraft) enfDraft = { areas: activo ? [...activo.areas] : [], semanas: p.enfoques?.semanas || 6 };
  const d = enfDraft;
  const prev = d.areas.length ? ajustarVolumen(generarPlan(p, cicloHoy()), p, d.areas) : null;
  const camb = prev ? cambiosAjuste(prev) : [];
  const chip = (v, ico, l) => `<button type="button" class="chip ${d.areas.includes(v) ? 'on' : ''}" data-act="enfset" data-v="${v}">${ico} ${l}</button>`;
  return `${header('Enfoque de entrenamiento', '#/mas')}<section class="wrap">
    ${activo ? `<div class="card accent"><div class="tag">Enfoque activo</div><h3>${nombresEnf(activo.areas)}</h3><p class="small">Desde el ${fmt(activo.desde)} hasta el ${fmt(activo.hasta)} · quedan ${dayDiff(today(), activo.hasta) + 1} días</p></div>` : ''}
    <div class="card"><h3>¿Qué quieres priorizar?</h3><p class="small muted">Elige una o varias zonas. El plan sumará series y, si cabe en tu tiempo de sesión, ejercicios extra para ellas.</p>
      <div class="chips">${ENFOQUES.map(([v, i, l]) => chip(v, i, l)).join('')}</div>
      ${d.areas.length > 3 ? '<div class="infobanner mt">Enfocar muchas zonas a la vez diluye el efecto y alarga las sesiones. Lo ideal son 1 a 3.</div>' : ''}</div>
    <div class="card"><h3>¿Por cuánto tiempo?</h3><div class="chips2">${[4, 6, 8, 12].map((n) => `<button type="button" class="chip ${d.semanas === n ? 'on' : ''}" data-act="enfdur" data-v="${n}">${n} semanas</button>`).join('')}</div>
      <p class="small muted">Al terminar, tu plan vuelve a la normalidad automáticamente.</p></div>
    ${prev ? `<div class="card accent-b"><h3>Así cambiaría tu plan</h3>${camb.length ? camb.join('') : '<p class="small muted">Tus sesiones ya tienen suficiente volumen para estas zonas o no hay espacio en tu tiempo de sesión.</p>'}
      ${d.areas.includes('cardio') ? `<div class="diff"><b>Cardio</b><span class="entra">+30% de minutos</span></div>` : ''}</div>` : ''}
    <button class="btn primary big" data-act="enfsave" ${d.areas.length ? '' : 'disabled'}>${activo ? 'Actualizar enfoque' : 'Activar enfoque'}</button>
    ${activo ? '<button class="btn danger ghost" data-act="enfquitar">Quitar enfoque</button>' : ''}
    <a class="card row-link mt" href="#/series"><span>📊</span><div class="grow"><b>Calculadora de series</b><span class="small muted">Mira el volumen de cada músculo</span></div>›</a>
  </section>`;
}

/* ---- CALCULADORA DE SERIES ---- */
let serModo = 'plan';
function vSeries() {
  const p = S.perfil, t = today(), wi = weekInfo(t);
  const enf = enfoqueActivo(p), fs = sgEnfocados(enf?.areas);
  const fase = wi.phase - 1;
  const v = serModo === 'plan' ? volumenPlan(PLAN(), fase) : volumenHecho(S.logs, wi.antes ? 1 : wi.week);
  const resumen = { bajo: 0, ok: 0, alto: 0 };
  const fila = ([k, n]) => {
    const x = v[k], ef = efectivas(x), r = rangoSeries(p, k, fs);
    const est = ef < r.min ? 'bajo' : ef > r.max ? 'alto' : 'ok';
    resumen[est]++;
    const top = Math.max(r.max * 1.5, ef, 1);
    const notas = r.notas.filter((n) => n !== 'enfoque');
    return `<div class="sg ${est}"><div class="sg-h"><b>${n}${fs.has(k) ? ' 🎯' : ''}</b><span class="sg-st">${est === 'ok' ? 'Óptimo' : est === 'bajo' ? 'Bajo' : 'Alto'}</span></div>
      <div class="sg-bar"><span class="sg-band" style="left:${(r.min / top) * 100}%;width:${((r.max - r.min) / top) * 100}%"></span><i style="width:${Math.min(100, (ef / top) * 100)}%"></i></div>
      <div class="small muted">Directas <b>${fmtN(x.d)}</b> · Indirectas <b>${fmtN(x.i)}</b> · Efectivas <b>${fmtN(ef)}</b> · Rango <b>${r.min}–${r.max}</b>${notas.length ? ` <span class="sg-nota">(ajustado por ${notas.join(', ')})</span>` : ''}</div></div>`;
  };
  const sec = (tren, titulo) => `<div class="card"><h3>${titulo}</h3>${SUBGRUPOS.filter((x) => x[2] === tren).map(fila).join('')}</div>`;
  const cuerpo = sec('sup', '💪 Tren superior') + sec('inf', '🦵 Tren inferior') + sec('core', '🎯 Core');
  const obj = PERFIL_OPC.objetivos.find((o) => o[0] === p.objetivo)?.[2] || p.objetivo;
  const niv = PERFIL_OPC.niveles.find((o) => o[0] === p.nivel)?.[1] || p.nivel;
  const auto = ajustarVolumen(generarPlan(p, cicloHoy()), { ...p, autoVol: true }, enf?.areas || []);
  const cambAuto = cambiosAjuste(auto);
  return `${header('Calculadora de series', '#/mas')}<section class="wrap">
    <div class="seg"><button class="${serModo === 'plan' ? 'on' : ''}" data-act="sermodo" data-v="plan">Plan de la semana</button><button class="${serModo === 'hecho' ? 'on' : ''}" data-act="sermodo" data-v="hecho">Hecho esta semana</button></div>
    <div class="stats mt"><div><b class="good">${resumen.ok}</b><span>óptimos</span></div><div><b style="color:var(--warn)">${resumen.bajo}</b><span>bajos</span></div><div><b style="color:var(--bad)">${resumen.alto}</b><span>altos</span></div></div>
    <div class="card small-card"><p class="small"><b>Directas:</b> el músculo es el motor principal del ejercicio (ej. pectoral en el press de banca). <b>Indirectas:</b> ayuda como secundario (ej. tríceps en el press) y cuenta la mitad. <b>Efectivas</b> = directas + ½ indirectas, por semana.</p>
      <p class="small muted">Tu rango considera: objetivo <b>${esc(obj)}</b>, nivel <b>${esc(niv)}</b>${p.edad >= 60 || p.edad < 16 ? ', edad' : ''}${(p.limit || []).length ? `, molestias (${p.limit.join(', ')})` : ''}${enf ? `, enfoque en ${nombresEnf(enf.areas)}` : ''}. ${serModo === 'plan' ? `Semana tipo de la fase ${wi.phase}.` : 'Solo series marcadas como hechas.'}</p></div>
    ${cuerpo}
    <div class="card ${p.autoVol ? 'accent-b' : ''}"><h3>⚙️ Ajuste automático del plan</h3>
      <p class="small">${p.autoVol ? 'Activado: tu plan suma series o ejercicios donde estás bajo y quita donde sobra, respetando tu tiempo de sesión, tu equipo y tus molestias.' : 'Si lo activas, la app adecuará tu plan a estos rangos, respetando tu tiempo de sesión, tu equipo y tus molestias.'}</p>
      ${!p.autoVol ? (cambAuto.length ? `<p class="small muted">Cambios que haría:</p>${cambAuto.join('')}` : '<p class="small muted">Tu plan ya está dentro de los rangos: no haría cambios.</p>') : ''}
      <button class="btn ${p.autoVol ? '' : 'primary'} big" data-act="autovol">${p.autoVol ? 'Desactivar ajuste automático' : 'Activar ajuste automático'}</button></div>
    <a class="card row-link" href="#/enfoque"><span>🎯</span><div class="grow"><b>Enfoques</b><span class="small muted">Prioriza una zona por unas semanas</span></div>›</a>
    <p class="small muted center">Rangos orientativos basados en la evidencia de volumen semanal por grupo muscular. No reemplazan a un profesional.</p>
  </section>`;
}

/* ---- MÁS ---- */
function vMas() {
  return `${header('Más')}<section class="wrap">
    <a class="card row-link" href="#/biblioteca"><span>📚</span><div class="grow"><b>Ejercicios</b><span class="small muted">Técnica, animación y videos</span></div>›</a>
    ${S.acceso?.tipo === 'total' ? '<a class="card row-link" href="#/compartir"><span>📤</span><div class="grow"><b>Compartir la app</b><span class="small muted">Envía un link con los días de acceso que tú elijas</span></div>›</a>'
      : S.acceso?.vence ? `<div class="card small-card"><p class="small">🔑 Tu acceso es válido hasta el <b>${fmt(S.acceso.vence, true)}</b>.</p></div>` : ''}
    <a class="card row-link" href="#/enfoque"><span>🎯</span><div class="grow"><b>Enfoques</b><span class="small muted">${enfoqueActivo() ? `Activo: ${nombresEnf(enfoqueActivo().areas)}` : 'Prioriza brazos, tren superior, cardio…'}</span></div>›</a>
    <a class="card row-link" href="#/ficha"><span>📋</span><div class="grow"><b>Ficha técnica del plan</b><span class="small muted">Para revisión de un kinesiólogo o preparador físico (imprimir o PDF)</span></div>›</a>
    <a class="card row-link" href="#/series"><span>📊</span><div class="grow"><b>Calculadora de series</b><span class="small muted">Series directas e indirectas por músculo</span></div>›</a>
    <a class="card row-link" href="#/timer"><span>⏱️</span><div class="grow"><b>Temporizador</b><span class="small muted">Tabata, intervalos, EMOM y AMRAP con voz</span></div>›</a>
    <a class="card row-link" href="#/recordatorios"><span>⏰</span><div class="grow"><b>Recordatorios</b><span class="small muted">Agrega tus entrenamientos al calendario</span></div>›</a>
    <a class="card row-link" href="#/salud"><span>🩺</span><div class="grow"><b>Cuestionario de salud</b><span class="small muted">PAR-Q+ · ${S.perfil?.parq ? 'completado' : 'pendiente'}</span></div>›</a>
    <a class="card row-link" href="#/ajustes"><span>🎨</span><div class="grow"><b>Apariencia</b><span class="small muted">Tema claro u oscuro y tamaño de letra</span></div>›</a>
    <a class="card row-link" href="#/equipo"><span>🧰</span><div class="grow"><b>Mi equipamiento</b><span class="small muted">Agrega equipo y actualiza tus ejercicios</span></div>›</a>
    <a class="card row-link" href="#/rutinas"><span>🧩</span><div class="grow"><b>Mis rutinas</b><span class="small muted">Crea rutinas y ejercicios propios</span></div>›</a>
    <a class="card row-link" href="#/alimentos"><span>🥫</span><div class="grow"><b>Mis alimentos</b><span class="small muted">Productos creados o escaneados: editar o borrar</span></div>›</a>
    <a class="card row-link" href="#/perfil"><span>👤</span><div class="grow"><b>Mi perfil y objetivos</b><span class="small muted">Datos, objetivo, lugar, equipo, días y molestias</span></div>›</a>
    <div class="card"><h3>💾 Respaldo de datos</h3>
      <p class="small muted">Tus datos se guardan solo en este teléfono. Exporta un respaldo cada cierto tiempo (por ejemplo a Google Drive o WhatsApp). El respaldo y el resumen contienen datos de salud: guárdalos en un lugar privado.</p>
      <div class="btns"><button class="btn" data-act="export">Exportar respaldo</button><label class="btn">Importar<input type="file" accept="application/json,.json" id="fimport" hidden></label><button class="btn" data-act="share">Compartir resumen</button></div>
    </div>
    <div class="card"><h3>📲 Instalar en el celular</h3>
      ${window._installEvt ? '<button class="btn primary" data-act="install">Instalar app</button>' : ''}
      <p class="small"><b>Android (Chrome):</b> menú ⋮ → <i>Instalar aplicación</i> o <i>Agregar a pantalla principal</i>.<br><b>iPhone (Safari):</b> botón Compartir ⬆️ → <i>Agregar a inicio</i>.<br>Una vez instalada funciona sin internet (los videos sí requieren conexión).</p></div>
    <div class="card small-card"><h3>⚠️ Precauciones</h3><p class="small">Antes de empezar, idealmente hazte un chequeo médico general (presión, ECG si tienes antecedentes).</p>
      <p class="small"><b>Urgencia (SAMU <a href="tel:131">131</a>):</b> dolor u opresión en el pecho, desmayo, falta de aire desproporcionada, adormecimiento en la zona genital o pérdida del control de la orina.</p>
      <p class="small"><b>Consulta en el día:</b> pantorrilla hinchada, caliente y dolorosa; no poder apoyar el peso; chasquido con hinchazón inmediata.</p>
      <p class="small"><b>Pide evaluación (médico o kinesiólogo):</b> hinchazón o calor en una articulación, hormigueo o pérdida de fuerza, dolor que te despierta de noche, dolor que no mejora en 2-3 semanas.</p>
      <p class="small">Dolor articular punzante = detente y ajusta. Hasta 3/10 es aceptable si al día siguiente no estás peor.</p></div>
    ${ayudaHTML('')}
    <div class="card small-card"><h3>ℹ️ Importante</h3><p class="small">Esta app orienta y educa con criterios de entrenamiento, nutrición y kinesiología basados en evidencia, pero <b>no reemplaza la evaluación de un médico, nutricionista, kinesiólogo o psicólogo</b>. Ante dudas sobre tu salud, consulta a un profesional.</p></div>
    <button class="btn danger ghost" data-act="reset">Borrar todos los datos</button>
    <p class="small muted center">v1.23 · Plan de 12 semanas${S.ultimoRespaldo ? ` · último respaldo: ${fmt(S.ultimoRespaldo)}` : ''}</p>
  </section>`;
}

let libMio = false;
function vBiblioteca() {
  const grupos = { 'Piernas': [], 'Glúteos e isquios': [], 'Pecho': [], 'Espalda': [], 'Hombros': [], 'Brazos': [], 'Core': [], 'Rodillas y movilidad': [], 'Cardio y metabólico': [] };
  for (const [id, e] of Object.entries(EJERCICIOS)) {
    if (libMio && !puedoHacer(id)) continue;
    const pt = PATRON[id];
    const g = e.tipo === 'cardio' || pt === 'metabolico' ? 'Cardio y metabólico' : pt === 'rodilla' || pt === 'movilidad' ? 'Rodillas y movilidad' : GRUPO_DE_PATRON[pt] || 'Core';
    grupos[g].push([id, e]);
  }
  return `${header('Ejercicios', '#/mas')}<section class="wrap">
    <div class="seg"><button class="${libMio ? '' : 'on'}" data-act="libf" data-v="0">Todos</button><button class="${libMio ? 'on' : ''}" data-act="libf" data-v="1">Con mi equipo</button></div>
    ${Object.entries(grupos).filter(([, arr]) => arr.length).map(([g, arr]) => `<h2 class="sec">${g}</h2><div class="lib">${arr.map(([id, e]) => `<a class="libi ${puedoHacer(id) ? '' : 'nodisp'}" href="#/ej/${id}">${Fig.still(ANIMS[id], 1, musculosDe(id))}<b>${e.nombre}</b><span class="small muted">${e.musculos}</span></a>`).join('')}</div>`).join('')}</section>`;
}

function techHTML(id) {
  const e = getEj(id);
  if (e.propio) return `<p class="small muted">Ejercicio propio (sin animación).</p><a class="btn yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.yt)}" target="_blank" rel="noopener">▶ Buscar videos en YouTube</a>`;
  return `<div class="anim-wrap a3d" data-a3d="${id}"></div>
    <p class="leyenda-m small"><i class="lm-d"></i> trabaja directo <i class="lm-i"></i> ayuda · usa <b>½×</b> o <b>¼×</b> para ver el movimiento lento</p>
    <p class="small"><b>Músculos:</b> ${e.musculos}<br><b>Equipo:</b> ${e.equipo}</p>
    <h4>Paso a paso</h4><ol>${e.pasos.map((x) => `<li>${x}</li>`).join('')}</ol>
    <h4>Errores comunes</h4><ul class="x">${e.errores.map((x) => `<li>${x}</li>`).join('')}</ul>
    ${e.rodilla && e.rodilla !== '—' && tieneLimit('rodillas') ? `<div class="knee"><b>🦵 Tus rodillas:</b> ${e.rodilla}</div>` : ''}
    ${variantesHTML(id)}
    <a class="btn yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.yt)}" target="_blank" rel="noopener">▶ Ver videos en YouTube</a>`;
}
function variantesHTML(id) {
  if (!S.perfil || !PATRON[id]) return '';
  const v = variantes(id, S.perfil);
  const lst = (arr) => arr.map((x) => `<a href="#/ej/${x.id}">${esc(EJERCICIOS[x.id].nombre)}</a>`).join(' · ');
  if (!v.faciles.length && !v.dificiles.length) return '';
  return `<div class="vars">${v.faciles.length ? `<p class="small"><b>⬇ Más fácil:</b> ${lst(v.faciles)}</p>` : ''}${v.dificiles.length ? `<p class="small"><b>⬆ Más difícil:</b> ${lst(v.dificiles)}</p>` : ''}</div>`;
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
  const acc = accesoEstado();
  if (acc !== 'ok') {
    main.innerHTML = vBloqueo(acc);
    document.body.classList.add('no-nav');
    document.body.dataset.sec = 'hoy';
    return;
  }
  if (S.acceso.tipo === 'invitado' && (!S.acceso.visto || S.acceso.visto < today())) { S.acceso.visto = today(); save(); }
  if (!S.perfil) v = 'onboarding';
  let html;
  ctx = {};
  switch (v) {
    case 'onboarding': html = vWizard(true); break;
    case 'perfil': html = vWizard(false); break;
    case 'sesion': ctx = { date: h[1], sid: h[2] }; html = vSesion(h[1], h[2]); break;
    case 'plan': html = vPlan(); break;
    case 'progreso': html = vProgreso(); break;
    case 'comida': html = vComida(); break;
    case 'mas': html = vMas(); break;
    case 'biblioteca': html = vBiblioteca(); break;
    case 'ej': html = vEjercicio(h[1]); break;
    case 'rutinas': html = vRutinas(); break;
    case 'alimentos': html = vAlimentos(); break;
    case 'equipo': html = vEquipo(); break;
    case 'salud': html = vSalud(); break;
    case 'compartir': html = vCompartir(); break;
    case 'enfoque': html = vEnfoque(); break;
    case 'series': html = vSeries(); break;
    case 'ficha': html = vFicha(); break;
    case 'gps': html = vGps(); break;
    case 'recordatorios': html = vRecordatorios(); break;
    case 'ajustes': html = vAjustes(); break;
    case 'timer':
      if (h[1] === 'c' && !tmRun.activo) Object.assign(tm, { modo: 'interv', tr: +h[2] || 30, de: +h[3] || 0, ro: +h[4] || 8 });
      html = vTimer(); break;
    case 'alimento': html = vAlimento(h[1]); break;
    case 'rutina': html = vRutina(h[1]); break;
    default: v = 'hoy'; html = vHoy();
  }
  main.innerHTML = html;
  if (GPS && v !== 'gps') main.insertAdjacentHTML('afterbegin', gpsBannerHTML());
  if (v !== 'comida') comidaDia = null;
  if (v !== 'rutina') rDraft = null;
  if (v !== 'perfil' && v !== 'onboarding') wz = null;
  if (v !== 'equipo') eqDraft = null;
  if (v !== 'salud') saludDraft = null;
  if (v !== 'enfoque') enfDraft = null;
  if (v !== 'timer' && tmRun.activo) tmParar();
  if (crono.row) cronoStop(true);
  if (v === 'progreso') cargarFotos();
  sheet.open = false;
  document.body.classList.remove('sheet-open');
  document.body.classList.toggle('no-nav', v === 'onboarding');
  const navKey = { sesion: 'hoy', perfil: 'mas', biblioteca: 'mas', ej: 'mas', rutinas: 'mas', rutina: 'mas', alimentos: 'mas', alimento: 'mas', equipo: 'mas', salud: 'mas', recordatorios: 'mas', ajustes: 'mas', timer: 'mas', enfoque: 'mas', series: 'mas', compartir: 'mas' }[v] || v;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === navKey));
  document.body.dataset.sec = navKey;
  main.querySelectorAll('svg[data-anim]').forEach((s) => stops.push(Fig.mount(s, ANIMS[s.dataset.anim])));
  main.querySelectorAll('[data-a3d]').forEach((b) => stops.push(Fig3D.mount(b, ANIMS[b.dataset.a3d], musculosDe(b.dataset.a3d))));
  keepAwake(v === 'sesion' || v === 'timer');
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
/* ---- Progreso de la sesión ---- */
function estadoItems() {
  const lg = getLog(ctx.date, ctx.sid);
  return (ctx.items || []).filter((it) => it.k !== 'circ').map((it) => {
    let estado = 'pend', hechas = 0, total = 0, nombre;
    if (it.k === 'warm') { nombre = 'Calentamiento'; if (lg?.warm) estado = 'ok'; }
    else if (it.k === 'cardio') { nombre = it.rx.titulo.split(' · ')[0]; if (lg?.cardio?.[it.key]?.ok) estado = 'ok'; }
    else {
      nombre = getEj(it.id).nombre;
      const sets = (lg?.ex?.[it.id]?.sets || []).slice(0, it.sets);
      total = it.sets; hechas = sets.filter((x) => x.ok).length;
      estado = hechas >= total ? 'ok' : hechas > 0 ? 'parcial' : 'pend';
    }
    return { idx: it.idx, k: it.k, nombre, estado, hechas, total };
  });
}
function progresoHTML() {
  const st = estadoItems();
  if (!st.length) return '';
  const ex = st.filter((x) => x.k === 'ex');
  const listos = st.filter((x) => x.estado === 'ok').length;
  const series = ex.reduce((a, x) => a + x.hechas, 0), totalS = ex.reduce((a, x) => a + x.total, 0);
  const sig = st.find((x) => x.estado !== 'ok');
  return `<div class="sp-l"><b>${listos} de ${st.length}</b> listos · ${series}/${totalS} series</div>
    <div class="sp-bar"><i style="width:${(listos / st.length) * 100}%"></i></div>
    <div class="sp-chips">${st.map((x, n) => `<button class="sp-c ${x.estado}" data-act="irblk" data-i="${x.idx}" aria-label="${esc(x.nombre)}: ${x.estado === 'ok' ? 'listo' : x.estado === 'parcial' ? `${x.hechas} de ${x.total} series` : 'pendiente'}">${x.estado === 'ok' ? '✓' : n + 1}</button>`).join('')}</div>
    <div class="sp-sig">${sig ? `${sig.estado === 'parcial' ? '⚠️ A medias' : 'Siguiente'}: <button class="link" data-act="irblk" data-i="${sig.idx}">${esc(sig.nombre)}${sig.estado === 'parcial' ? ` (${sig.hechas}/${sig.total})` : ''}</button>` : '🎉 ¡Todo listo! Cierra la sesión abajo.'}</div>`;
}
function refreshProg() {
  const el = $('#sesprog');
  if (el) el.innerHTML = progresoHTML();
}
function irABloque(i) {
  const el = document.querySelector(`[data-blk="${i}"]`);
  if (!el) return;
  const off = ($('.ses-top')?.offsetHeight || 0) + 8;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

/* ---- Cronómetro para ejercicios de tiempo (cuenta hacia arriba) ---- */
const crono = { row: null, btn: null, t0: 0, iv: null, meta: 0, aviso: false, cuenta: 0 };
function cronoStop(guardar) {
  clearInterval(crono.iv);
  const { row, btn } = crono;
  crono.iv = null; crono.row = null; crono.btn = null;
  if (!row) return null;
  row.classList.remove('corriendo', 'previa');
  if (btn) btn.textContent = '⏱';
  if (!guardar || !crono.t0) return null;
  const seg = Math.max(1, Math.round((Date.now() - crono.t0) / 1000));
  const inp = row.querySelector('[data-f="r"]');
  if (inp && document.body.contains(inp)) {
    inp.value = seg;
    const { s } = setData(inp);
    s.r = String(seg);
    save();
  }
  return seg;
}
function cronoTick() {
  const inp = crono.row?.querySelector('[data-f="r"]');
  if (!inp || !document.body.contains(inp)) { cronoStop(false); return; }
  if (!crono.t0) { // cuenta regresiva de preparación
    const quedan = Math.ceil((crono.cuenta - Date.now()) / 1000);
    if (quedan > 0) { if (inp.value !== String(quedan)) { inp.value = quedan; beepCorto(); } return; }
    crono.t0 = Date.now();
    crono.row.classList.remove('previa');
    crono.row.classList.add('corriendo');
    beep(); hablar('¡Ya!');
  }
  const seg = Math.floor((Date.now() - crono.t0) / 1000);
  if (inp.value !== String(seg)) inp.value = seg;
  if (crono.meta && seg >= crono.meta && !crono.aviso) {
    crono.aviso = true;
    beep(); navigator.vibrate?.([200, 80, 200]);
    hablar('¡Meta lograda! Sigue si puedes');
    crono.row.classList.add('meta');
  }
}

function refreshExDone(id) {
  const card = document.querySelector(`[data-exc="${id}"]`);
  const lg = getLog(ctx.date, ctx.sid);
  const n = +card.dataset.sets;
  const sets = lg?.ex[id]?.sets || [];
  card.classList.toggle('done', sets.length >= n && sets.slice(0, n).every((s) => s.ok));
  refreshProg();
}

const actions = {
  ...accionesDeporte,
  ...accionesGps,
  irblk(btn) { closeModal(); irABloque(btn.dataset.i); },
  crono(btn) {
    const row = btn.closest('.set');
    if (crono.row === row) { // detener: anota el tiempo y marca la serie
      const seg = cronoStop(true);
      if (seg != null) {
        const chk = row.querySelector('[data-act="setok"]');
        if (chk && !chk.classList.contains('on')) actions.setok(chk);
        toast(`⏱ Resististe ${mmss(seg)}${crono.meta && seg >= crono.meta ? ' · ¡meta cumplida! 💪' : ''}`);
      }
      return;
    }
    cronoStop(true); // si había otro corriendo, lo guarda
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch (e) { /* sin audio */ }
    stopTimer();
    Object.assign(crono, { row, btn, t0: 0, meta: +btn.dataset.meta || 0, aviso: false, cuenta: Date.now() + 3000 });
    row.classList.remove('meta');
    row.classList.add('previa');
    btn.textContent = '■';
    hablar('Prepárate');
    crono.iv = setInterval(cronoTick, 100);
    cronoTick();
  },
  setok(btn) {
    const { row, id, s } = setData(btn);
    if (crono.row === row) cronoStop(true);
    s.ok = !s.ok;
    if (s.ok) {
      const wi = row.querySelector('[data-f="w"]'), ri = row.querySelector('[data-f="r"]');
      if (wi && !wi.value && wi.placeholder && num(wi.placeholder) != null) { wi.value = wi.placeholder; s.w = wi.value; }
      if (ri && !ri.value && ri.placeholder) { ri.value = ri.placeholder; s.r = ri.value; }
      startTimer(+row.dataset.rest || 60);
      const pr = esRecord(id, s);
      if (pr) { toast(pr); navigator.vibrate?.([60, 40, 60]); }
      // propagar peso a la siguiente serie
      const next = row.nextElementSibling?.querySelector('[data-f="w"]');
      if (next && !next.value && s.w) next.placeholder = s.w;
    }
    row.classList.toggle('ok', s.ok);
    btn.classList.toggle('on', s.ok);
    refreshExDone(id);
    save();
    // al completar un ejercicio, avisa cuál sigue
    const card = row.closest('[data-exc]');
    if (s.ok && card?.classList.contains('done')) {
      const sig = estadoItems().find((x) => x.estado !== 'ok');
      setTimeout(() => toast(sig ? `✓ Listo · Siguiente: ${sig.nombre}` : '🎉 ¡Completaste todos los ejercicios!'), 900);
    }
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
    save(); refreshProg();
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
    save(); refreshProg();
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
      const a3 = box.querySelector('[data-a3d]');
      if (a3) stops.push(Fig3D.mount(a3, ANIMS[id], musculosDe(id)));
    }
  },
  finish(btn, e, forzar) {
    cronoStop(true);
    const lg = getLog(ctx.date, ctx.sid, true);
    const was = lg.done;
    // antes de cerrar, revisa si quedó algo pendiente o a medias
    const falta = estadoItems().filter((x) => x.estado !== 'ok');
    if (!forzar && !was && falta.length) {
      openModal('⚠️ Te faltan ejercicios', `<p class="small">Quedan <b>${falta.length}</b> sin completar. Toca uno para ir a él:</p>
        <div class="fres">${falta.map((x) => `<button class="fres-i" data-act="irblk" data-i="${x.idx}"><b>${esc(x.nombre)}</b><span>${x.estado === 'parcial' ? `A medias: ${x.hechas} de ${x.total} series` : 'Sin hacer'}</span></button>`).join('')}</div>
        <button class="btn primary big" data-act="closemodal">Seguir entrenando</button>
        <button class="btn ghost big" data-act="finishforce">Terminar igual</button>`);
      return;
    }
    closeModal();
    lg.done = true;
    lg.fin = new Date().toISOString();
    save(true);
    stopTimer();
    const sets = Object.values(lg.ex).reduce((a, e) => a + e.sets.filter((s) => s.ok).length, 0);
    const min = Object.values(lg.cardio).reduce((a, c) => a + (num(c.min) || 0), 0);
    toast(was ? 'Cambios guardados' : `¡Sesión completada! 💪 ${sets} series · ${fmtMin(min)} de cardio`);
    location.hash = '#/hoy';
  },
  finishforce(btn, e) { actions.finish(btn, e, true); },
  pw(btn) { planOffset += +btn.dataset.d; rerender(); },
  invdias(btn) { invDraft.dias = +btn.dataset.v; invDraft.codigo = null; rerender(); },
  invgen() {
    const dias = invDraft.dias;
    if (dias !== 0 && !(dias >= 1 && dias <= 3650)) { toast('Indica una cantidad de días válida'); return; }
    invDraft.codigo = crearCodigoInv(dias);
    const r = leerCodigoInv(invDraft.codigo);
    S.invitaciones = S.invitaciones || [];
    S.invitaciones.push({ fecha: today(), nombre: invDraft.nombre.trim(), vence: r.vence || null, codigo: invDraft.codigo });
    save(true); rerender();
  },
  async invshare() {
    const r = leerCodigoInv(invDraft.codigo), url = linkInv(invDraft.codigo);
    const txt = `Te invito a Mi Entrenamiento 💪 ${r.tipo === 'total' ? '' : `(acceso hasta el ${fmt(r.vence)}) `}Abre este link en Safari (iPhone) o Chrome (Android) e instálala en tu pantalla de inicio:`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mi Entrenamiento', text: txt, url });
      else { await navigator.clipboard.writeText(`${txt} ${url}`); toast('Invitación copiada'); }
    } catch (e) { /* cancelado */ }
  },
  async invcopiar() {
    try { await navigator.clipboard.writeText(linkInv(invDraft.codigo)); toast('Link copiado'); } catch (e) { toast('No se pudo copiar: mantén presionado el link'); }
  },
  async invcopiarmio() {
    try { await navigator.clipboard.writeText(S.acceso.codigo); toast('Código copiado'); } catch (e) { toast('No se pudo copiar'); }
  },
  invactivar() {
    const inv = leerCodigoInv($('#invcod')?.value);
    if (!inv) { toast('Código o link no válido'); return; }
    if (inv.tipo === 'invitado' && inv.vence < today()) { toast(`Esa invitación venció el ${fmt(inv.vence)}`); return; }
    aplicarInvitacion(inv);
    toast(inv.tipo === 'total' ? 'Acceso activado ✓' : `Acceso activado hasta el ${fmt(inv.vence)} ✓`);
    location.hash = '#/hoy'; route();
  },
  moveropen(btn) { abrirMover(btn.dataset.sid, +btn.dataset.w); },
  moveralc(btn) { moverAlcance = btn.dataset.v; abrirMover(btn.dataset.sid, +btn.dataset.w); },
  moverdia(btn) {
    const sid = btn.dataset.sid, w = +btn.dataset.w, d = +btn.dataset.d;
    const PL = PLAN(), nombre = PL.ses[sid].nombre;
    if (moverAlcance === 'semana') {
      const cur = diaDe(sid, w), otro = sidDelDia(d, w);
      S.movidas = S.movidas || {};
      const m = (S.movidas[w] = S.movidas[w] || {});
      m[sid] = d;
      if (otro && otro !== sid) m[otro] = cur;
      toast(otro ? `Intercambiadas esta semana: ${nombre} ⇄ ${PL.ses[otro].nombre}` : `${nombre} movida al ${DIAS[d].toLowerCase()} (solo esta semana)`);
    } else {
      const p = S.perfil, cur = PL.ses[sid].dow, otro = PL.dowSid[d];
      const asg = { ...(p.asignacion || {}) };
      for (const x of PL.orden) asg[x] = PL.ses[x].dow;
      asg[sid] = d;
      if (otro && otro !== sid) asg[otro] = cur;
      else p.dias = p.dias.map((x) => (x === cur ? d : x));
      p.asignacion = asg;
      toast(otro ? `Desde ahora: ${nombre} el ${DIAS[d].toLowerCase()} y ${PL.ses[otro].nombre} el ${DIAS[cur].toLowerCase()}` : `Desde ahora ${nombre} es los ${DIAS[d].toLowerCase()}`);
    }
    save(true); closeModal(); rerender();
  },
  resetsemana(btn) { delete S.movidas[btn.dataset.w]; save(true); toast('Días de la semana restablecidos'); rerender(); },
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
    Object.assign(sheet, { open: true, m: btn.dataset.m, food: null, q: 1, custom: false, scan: false, draft: null, editItem: null, q_: '', rec: null, recIng: null });
    abrirHistHoja();
    renderSheet();
  },
  closesheet() {
    if (hojaSucia() && !confirm(MSG_PERDER)) return;
    sheet.open = false; sheet.rec = null; renderSheet();
  },
  multitxt() {
    const txt = ($('#fsearch')?.value || sheet.q_ || '').trim();
    const { ings, noEnc } = platoDesdeTexto(txt);
    if (!ings.length) { toast('No reconocí esos alimentos. Prueba escribiéndolos de otra forma.'); return; }
    if (sheet.rec) { sheet.rec.ings.push(...ings); sheet.rec.noEnc = noEnc; sheet.recFase = 'edit'; }
    else {
      const nom = txt.charAt(0).toUpperCase() + txt.slice(1);
      Object.assign(sheet, { rec: { id: null, n: nom, n0: nom, ings0: '[]', porc: 1, comi: 1, ings, guardar: false, noEnc, rapido: true }, recFase: 'edit', recIng: null, food: null });
    }
    sheet.q_ = '';
    renderSheet();
    toast(`${ings.length} ${ings.length === 1 ? 'alimento' : 'alimentos'} listos: revisa las cantidades`);
  },
  ingq(btn) {
    const it = sheet.rec.ings[+btn.dataset.i], d = +btn.dataset.d;
    if (!it) return;
    if (it.modo === 'g') {
      const g = it.gr || 0, paso = g < 50 || (d < 0 && g <= 50) ? 5 : g < 200 || (d < 0 && g <= 200) ? 10 : 25;
      it.gr = Math.max(5, Math.round((g + d * paso) / paso) * paso);
    } else {
      const q = it.q || 1, paso = q < 1 || (d < 0 && q <= 1) ? 0.25 : 0.5;
      it.q = Math.max(0.25, Math.round((q + d * paso) * 4) / 4);
    }
    recalcIng(it); renderSheet();
  },
  ingmodo(btn) {
    const it = sheet.rec.ings[+btn.dataset.i];
    if (!it) return;
    const ug = it.ug || it.food.gp || 100;
    if (it.modo === 'g') { it.modo = 'u'; it.q = Math.max(0.25, Math.round(((it.gr || ug) / ug) * 4) / 4); }
    else { it.modo = 'g'; it.gr = Math.round(((it.q || 1) * ug) / 5) * 5 || 5; }
    recalcIng(it); renderSheet();
  },
  recalt(btn) {
    const i = +btn.dataset.i, it = sheet.rec.ings[i], f = todosAlimentos().find((a) => a.id === btn.dataset.id);
    if (!it || !f) return;
    const alts = [it.food.id, ...(it.alts || []).filter((x) => x !== f.id)].slice(0, 3);
    sheet.rec.ings[i] = ingDesde(f, it.modo === 'g' ? { gr: it.gr } : { q: it.q }, alts, it.term);
    renderSheet();
  },
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
  backfood() {
    if (sheet.custom && hojaSucia() && !confirm(MSG_PERDER)) return;
    Object.assign(sheet, { food: null, custom: false, scan: false, draft: null }); renderSheet();
  },
  customfood() { Object.assign(sheet, { custom: true, draft: null }); renderSheet(); },
  scanopen() { Object.assign(sheet, { scan: true, custom: false, food: null }); renderSheet(); },
  scanclose() { sheet.scan = false; renderSheet(); },
  bcbuscar() { buscarCodigo($('#bcmanual').value); },
  logrook(btn) { (S.logros = S.logros || {})[btn.dataset.id] = today(); save(true); rerender(); },
  premiook(btn) {
    const e = premioEstado();
    (S.premios = S.premios || {})[e.lun] = { acepta: true, fecha: btn.dataset.f, tipo: btn.dataset.tipo, txt: btn.dataset.txt };
    save(true); toast('🏆 ¡Premio reservado! Disfrútalo, te lo ganaste.'); rerender();
  },
  premiootro() {
    const e = premioEstado(), P = (S.premios = S.premios || {});
    const g = P[e.lun] || {};
    g.otroIdx = g.otro ? (g.otroIdx || 0) + 1 : 0; g.otro = true;
    P[e.lun] = g; save(true); rerender();
  },
  premiono() { const e = premioEstado(); (S.premios = S.premios || {})[e.lun] = { no: true }; save(true); rerender(); },
  editfood(el) {
    const it = diaComidas(comidaDia).find((x) => x.id === el.dataset.id);
    if (!it) return;
    Object.assign(sheet, { open: true, m: it.m, food: it.f, q: it.q, mode: it.gr ? 'g' : 'u', gr: it.gr || it.f.gp || 100, custom: false, scan: false, draft: null, editItem: it.id, q_: '', rec: null, recIng: null });
    abrirHistHoja();
    renderSheet();
  },
  delpropio(btn) {
    if (!confirm('¿Eliminar este alimento de Mis alimentos? Lo que ya registraste en días anteriores no cambia.')) return;
    S.propios = S.propios.filter((a) => a.id !== btn.dataset.id);
    save(true); rerender();
  },
  recnew() {
    Object.assign(sheet, { rec: { id: null, n: sheet.q_ || '', n0: sheet.q_ || '', ings0: '[]', porc: 1, comi: 1, ings: [], guardar: true }, recFase: 'edit', recIng: null, food: null, q_: '' });
    renderSheet();
  },
  recedit() {
    const f = sheet.food;
    Object.assign(sheet, { rec: { id: f.id, n: f.n, n0: f.n, ings0: JSON.stringify(f.rec.ings), porc: f.rec.porc || 1, comi: 1, ings: structuredClone(f.rec.ings), guardar: true }, recFase: 'edit', recIng: null, food: null, q_: '' });
    renderSheet();
  },
  recfase(btn) {
    sheet.recFase = btn.dataset.v;
    if (btn.dataset.v === 'buscar') sheet.q_ = '';
    sheet.recIng = null;
    renderSheet();
  },
  recsalir() {
    if (hojaSucia() && !confirm(MSG_PERDER)) return;
    Object.assign(sheet, { rec: null, recIng: null, q_: '' }); renderSheet();
  },
  recmarca(btn) {
    const ri = sheet.recIng;
    ri.marca = btn.dataset.v;
    const op = opDe(ri);
    ri.ug = op?.ug || ri.food.gp || ri.ug;
    renderSheet();
  },
  rimodo(btn) { const ri = sheet.recIng; ri.modo = btn.dataset.v; renderSheet(); },
  riq(btn) { const ri = sheet.recIng; ri.q = Math.max(0.25, Math.round(((ri.q || 0) + +btn.dataset.d) * 4) / 4); renderSheet(); },
  riqset(btn) { sheet.recIng.q = +btn.dataset.v; renderSheet(); },
  rig(btn) { const ri = sheet.recIng; ri.gr = Math.max(1, Math.round((ri.gr || 0) + +btn.dataset.d)); renderSheet(); },
  rigset(btn) { sheet.recIng.gr = +btn.dataset.v; renderSheet(); },
  ringok() {
    const ri = sheet.recIng, x = calcIng(ri);
    if (ri.modo === 'g' && per100(ri.food, opDe(ri)) ? !(ri.gr > 0) : !(ri.q > 0)) { toast('Ingresa la cantidad'); return; }
    const it = { food: ri.food, n: ri.food.n, u: ri.food.u || 'g', marca: x.marca, mv: ri.marca, modo: ri.modo, q: ri.q, ug: ri.ug, gr: x.gr == null ? null : r1(x.gr), k: x.k, pr: x.pr, c: x.c, g: x.g };
    const edit = ri.idx != null;
    if (edit) sheet.rec.ings[ri.idx] = it; else sheet.rec.ings.push(it);
    Object.assign(sheet, { recIng: null, recFase: 'edit' });
    renderSheet();
    toast(`${edit ? 'Actualizado:' : '+'} ${it.n}${it.marca ? ' · ' + it.marca : ''} · ${Math.round(it.k)} kcal`);
  },
  recingedit(el) {
    const it = sheet.rec.ings[+el.dataset.i];
    sheet.recIng = { food: it.food, marca: it.mv || 'prom', modo: it.modo || 'u', q: it.q || 1, gr: it.gr ?? Math.round(it.food.gp || 100), ug: it.ug || it.food.gp, idx: +el.dataset.i };
    sheet.recFase = 'ing';
    renderSheet();
  },
  recdel(btn) { sheet.rec.ings.splice(+btn.dataset.i, 1); renderSheet(); },
  recok() {
    const R = sheet.rec;
    if (!R.ings.length) { toast('Agrega al menos un ingrediente'); return; }
    const t = totRec(R), porc = num(R.porc) || 1, comi = num(R.comi) || 1;
    const nombre = (R.n || '').trim() || 'Preparación casera';
    const gp = !t.sinPeso && t.gr ? Math.round(t.gr / porc) : null;
    const f = { n: nombre, p: gp ? `1 porción (${fmtN(gp)} g)` : '1 porción', k: Math.round(t.k / porc), pr: r1(t.pr / porc), c: r1(t.c / porc), g: r1(t.g / porc), gp, u: 'g' };
    const guardar = $('#rguardar') ? $('#rguardar').checked : R.guardar;
    if (guardar) {
      const a = { ...f, cat: 'Mis preparaciones', rec: { porc, ings: R.ings } };
      const i = R.id ? S.propios.findIndex((x) => x.id === R.id) : -1;
      if (i >= 0) { a.id = R.id; S.propios[i] = a; } else { a.id = 'u' + Date.now(); S.propios.push(a); }
      f.id = a.id;
    } else f.id = 'r' + Date.now();
    (S.comidas[comidaDia] = S.comidas[comidaDia] || []).push({ id: Date.now() + '' + Math.floor(Math.random() * 1000), m: sheet.m, q: comi, f });
    save(true);
    Object.assign(sheet, { open: false, rec: null, recIng: null });
    toast(`+${Math.round(f.k * comi)} kcal · ${nombre}${guardar ? ' (guardada)' : ''}`);
    rerender();
  },
  addfood() {
    const { id, n, p, k, pr, c, g, gp, u } = sheet.food;
    const porPeso = gp && sheet.mode === 'g';
    const gr = porPeso ? num($('#fg').value) : null;
    if (porPeso && !(gr > 0)) { toast('Ingresa una cantidad mayor que 0'); return; }
    const q = porPeso ? gr / gp : num($('#fq').value) || sheet.q;
    if (!(q > 0)) { toast('Ingresa una cantidad mayor que 0'); return; }
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
  enfset(btn) {
    const v = btn.dataset.v;
    enfDraft.areas = enfDraft.areas.includes(v) ? enfDraft.areas.filter((x) => x !== v) : [...enfDraft.areas, v];
    rerender();
  },
  enfdur(btn) { enfDraft.semanas = +btn.dataset.v; rerender(); },
  enfsave() {
    const d = enfDraft, act = enfoqueActivo();
    const desde = act ? act.desde : today();
    S.perfil.enfoques = { areas: d.areas, semanas: d.semanas, desde, hasta: iso(addDays(parse(desde), d.semanas * 7 - 1)) };
    enfDraft = null;
    save(true);
    toast(`🎯 Enfoque activado por ${d.semanas} semanas`);
    location.hash = '#/plan';
  },
  enfquitar() {
    if (!confirm('¿Quitar el enfoque? Tu plan vuelve a la normalidad.')) return;
    delete S.perfil.enfoques;
    enfDraft = null;
    save(true); toast('Enfoque quitado'); rerender();
  },
  sermodo(btn) { serModo = btn.dataset.v; rerender(); },
  calibrar() {
    S.perfil.calibrar = S.perfil.calibrar === false;
    save(true);
    toast(S.perfil.calibrar ? 'Se usarán tus registros para calibrar' : 'Meta calculada solo con la fórmula');
    rerender();
  },
  autovol() {
    S.perfil.autoVol = !S.perfil.autoVol;
    save(true);
    toast(S.perfil.autoVol ? 'Ajuste automático activado ✓' : 'Ajuste automático desactivado');
    rerender();
  },
  subopen(btn) {
    const orig = btn.dataset.orig, actual = btn.dataset.id;
    const alts = alternativas(orig, S.perfil);
    const lista = [...(actual !== orig ? [{ id: orig, dif: 0, original: true }] : []), ...alts.filter((x) => x.id !== actual)];
    const body = lista.length ? `<div class="fres">${lista.map((x) => `<button class="fres-i" data-act="subpick" data-de="${orig}" data-a="${x.id}"><b>${esc(EJERCICIOS[x.id]?.nombre || getEj(x.id).nombre)}${x.original ? ' (original)' : ''}</b><span>${x.dif < 0 ? '⬇ Más fácil' : x.dif > 0 ? '⬆ Más difícil' : '↔ Similar'} · ${esc(EJERCICIOS[x.id]?.equipo || '')}</span></button>`).join('')}</div>
      <label class="chkl"><input type="checkbox" id="subsiempre"> Usar este cambio también en las próximas sesiones</label>`
      : '<p class="small muted">No hay alternativas para este movimiento con tu equipo. Puedes agregar equipo en Más → Mi equipamiento.</p>';
    openModal(`↔ Cambiar ${esc(getEj(actual).nombre)}`, body);
  },
  subpick(btn) {
    const de = btn.dataset.de, a = btn.dataset.a;
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.subs = lg.subs || {};
    if (a === de) delete lg.subs[de]; else lg.subs[de] = a;
    if ($('#subsiempre')?.checked) {
      S.reemplazos = (S.reemplazos || []).filter((r) => r.de !== de);
      if (a !== de) S.reemplazos.push({ de, a, desde: ctx.date });
    }
    save(true); closeModal();
    toast(a === de ? 'Volviste al ejercicio original' : `Cambiado por ${EJERCICIOS[a]?.nombre || 'otro ejercicio'}`);
    rerender();
  },
  subundo(btn) {
    const de = btn.dataset.orig, lg = getLog(ctx.date, ctx.sid, true);
    if (lg.subs) delete lg.subs[de];
    S.reemplazos = (S.reemplazos || []).filter((r) => r.de !== de);
    save(true); rerender();
  },
  closemodal() { closeModal(); },
  descarga(btn) {
    S.descargas = S.descargas || {};
    S.descargas[btn.dataset.w] = true;
    save(true); toast('Semana de descarga activada'); rerender();
  },
  rir(btn) {
    const lg = getLog(ctx.date, ctx.sid, true), id = btn.dataset.id, v = +btn.dataset.v;
    lg.ex[id] = lg.ex[id] || { sets: [] };
    lg.ex[id].rir = lg.ex[id].rir === v ? undefined : v;
    save();
    btn.parentElement.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', +b.dataset.v === lg.ex[id].rir));
  },
  dolorok() {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.dolorOk = true;
    save(true); toast('Usarás los ejercicios originales. Detente si el dolor pasa de 3/10.'); rerender();
  },
  expres() {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.expres = !lg.expres;
    save(true); rerender();
  },
  agua(btn) {
    const d = comidaDia || today();
    S.agua = S.agua || {};
    S.agua[d] = Math.max(0, (S.agua[d] || 0) + +btn.dataset.d);
    save(); rerender();
  },
  bienestar(btn) {
    const t = today(), k = btn.dataset.k;
    S.bienestar = S.bienestar || {};
    S.bienestar[t] = { ...(S.bienestar[t] || {}), [k]: +btn.dataset.v };
    const b = S.bienestar[t];
    if (b.sueno != null && b.estres != null && b.animo != null) S._editBien = false;
    save(); rerender();
  },
  bienedit() { S._editBien = true; rerender(); },
  manana(btn) {
    const lg = S.logs[btn.dataset.k];
    if (lg) lg.manana = btn.dataset.v;
    save(true);
    toast(btn.dataset.v === 'peor' ? 'Anotado: la próxima sesión bajará la carga de esa zona' : '¡Bien! Sigue así 💪');
    rerender();
  },
  alertaok(btn) {
    S.alertasVistas = S.alertasVistas || {};
    S.alertasVistas[btn.dataset.k] = today();
    save(true); rerender();
  },
  ocultarkcal() {
    S.perfil.ocultarKcal = !S.perfil.ocultarKcal;
    save(true);
    toast(S.perfil.ocultarKcal ? 'Calorías ocultas: verás proteína, calidad y agua' : 'Calorías visibles');
    rerender();
  },
  pqset(btn) {
    const st = pqTarget();
    if (!st) return;
    const v = btn.dataset.v === '1';
    if (btn.dataset.i === 'emb') st.embarazo = v; else st.parq[+btn.dataset.i] = v;
    rerender();
  },
  pqsave() {
    const err = parqCompleto(saludDraft);
    if (err) { toast(err); return; }
    const st = saludDraft;
    S.perfil.parq = { resp: st.parq, embarazo: necesitaEmbarazo(st) ? st.embarazo : null, fecha: today() };
    S.perfil.precaucion = st.parq.some((x) => x === true) || (necesitaEmbarazo(st) && st.embarazo === true);
    saludDraft = null;
    save(true);
    toast(S.perfil.precaucion ? 'Guardado · modo precaución activado' : 'Guardado ✓');
    // problema de huesos o articulaciones (pregunta 6) sin molestias marcadas: que las marque para proteger el plan
    if (st.parq[5] === true && !(S.perfil.limit || []).length) { toast('Marca en "Cuidados" la zona que te molesta para que el plan la proteja'); location.hash = '#/perfil'; return; }
    location.hash = '#/hoy';
  },
  tmmodo(btn) { if (tmRun.activo) tmParar(); tm.modo = btn.dataset.m; rerender(); },
  tmgo() {
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch (e) { /* sin audio */ }
    if (tmRun.activo) { // pausar
      tmRun.pausa = Math.max(0, tmRun.end - Date.now());
      tmParar(); $('#tmgo').textContent = '▶ Seguir';
      return;
    }
    if (!tmRun.seq.length || tmRun.i >= tmRun.seq.length || !tmRun.pausa) {
      tmRun.seq = tmSecuencia(); tmRun.i = 0; tmRun.end = Date.now() + tmRun.seq[0].s * 1000;
      hablar('Prepárate');
    } else tmRun.end = Date.now() + tmRun.pausa;
    tmRun.pausa = 0; tmRun.ultimo = -1; tmRun.activo = true;
    $('#tmgo').textContent = '⏸ Pausa';
    keepAwake(true);
    tmRun.iv = setInterval(tmTick, 200);
    tmTick();
  },
  tmreset() { tmParar(); tmRun.seq = []; tmRun.i = 0; tmRun.pausa = 0; rerender(); },
  recics() {
    const ics = icsRecordatorios();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'mi-entrenamiento.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Abre el archivo y elige "Agregar todo"');
  },
  ajset(btn) {
    S.ajustes = S.ajustes || {};
    S.ajustes[btn.dataset.k] = btn.dataset.v;
    save(true); aplicarAjustes(); rerender();
  },
  pmodo(btn) { progModo = btn.dataset.v; rerender(); },
  medsel(btn) { medSel = btn.dataset.k; rerender(); },
  delmedida(btn) {
    if (!confirm('¿Eliminar estas medidas?')) return;
    S.medidas = (S.medidas || []).filter((x) => x.fecha !== btn.dataset.f);
    save(true); rerender();
  },
  fotover(btn) {
    const id = +btn.dataset.id, fs = window._fotos || [], f = fs.find((x) => x.id === id);
    if (!f) return;
    const primera = [...fs].filter((x) => x.pose === f.pose).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    const u1 = URL.createObjectURL(f.blob), comp = primera && primera.id !== f.id ? URL.createObjectURL(primera.blob) : null;
    fotosURL.push(u1); if (comp) fotosURL.push(comp);
    openModal(`${f.pose} · ${fmt(f.fecha)}`, `${comp ? `<div class="comp"><figure><img src="${comp}" alt=""><figcaption>${fmt(primera.fecha)} (primera)</figcaption></figure><figure><img src="${u1}" alt=""><figcaption>${fmt(f.fecha)}</figcaption></figure></div>` : `<img class="fotogrande" src="${u1}" alt="">`}
      <div class="btns mt"><button class="btn" data-act="fotoshare" data-id="${f.id}">Compartir / guardar</button><button class="btn danger ghost" data-act="fotodel" data-id="${f.id}">Eliminar</button></div>`);
  },
  async fotoshare(btn) {
    const f = (window._fotos || []).find((x) => x.id === +btn.dataset.id);
    if (!f) return;
    const file = new File([f.blob], `progreso-${f.fecha}-${f.pose}.jpg`, { type: 'image/jpeg' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Foto de progreso' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
    } catch (e) { /* cancelado */ }
  },
  async fotodel(btn) {
    if (!confirm('¿Eliminar esta foto?')) return;
    await FotosDB.borrar(+btn.dataset.id);
    closeModal(); cargarFotos();
  },
  eqset(btn) {
    const v = btn.dataset.v;
    eqDraft.equipo = eqDraft.equipo.includes(v) ? eqDraft.equipo.filter((x) => x !== v) : [...eqDraft.equipo, v];
    rerender();
  },
  eqlugar(btn) { eqDraft.lugar = btn.dataset.v; rerender(); },
  eqsave() {
    const d = eqDraft;
    S.perfil = { ...S.perfil, lugar: d.lugar, equipo: d.lugar === 'casa' ? d.equipo : [], mancMax: num(d.mancMax), revisar: false };
    eqDraft = null;
    save(true);
    toast('Equipamiento guardado y plan actualizado ✓');
    location.hash = '#/plan';
  },
  libf(btn) { libMio = btn.dataset.v === '1'; rerender(); },
  wzset(btn) {
    const f = btn.dataset.f;
    let v = btn.dataset.v;
    if (f === 'dias' || f === 'dur') v = +v;
    if (f === 'limit' && v === '__none') wz.limit = [];
    else if (btn.dataset.multi) wz[f] = wz[f].includes(v) ? wz[f].filter((x) => x !== v) : [...wz[f], v];
    else wz[f] = v;
    rerender();
  },
  wznext() {
    const err = wzValidar();
    if (err) { toast(err); return; }
    wzPaso = Math.min(WZ_PASOS.length - 1, wzPaso + 1);
    route();
  },
  wzback() { wzPaso = Math.max(0, wzPaso - 1); route(); },
  wzsave() {
    const first = !S.perfil;
    const p = perfilDesdeWz();
    const pesoNuevo = num(wz.peso);
    S.perfil = p;
    if (first) addPeso(today() < p.inicio ? today() : p.inicio, pesoNuevo);
    else if (pesoNuevo && Math.abs(pesoNuevo - pesoActual()) > 0.05) addPeso(today(), pesoNuevo);
    wz = null;
    save(true);
    toast(first ? '¡Plan creado! 💪' : 'Perfil y plan actualizados ✓');
    location.hash = '#/hoy';
    route();
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
    if (!confirm('El resumen incluye datos de salud (peso, dolor, comidas y notas). ¿Compartirlo?')) return;
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
    const acceso = S.acceso;
    S = { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [], reemplazos: [], descargas: {}, medidas: [], ajustes: {}, acceso };
    save(true); location.hash = '#/hoy'; route();
  },
};

function rerender() {
  if (!sheet.open) soltarHoja();
  const y = window.scrollY;
  route();
  window.scrollTo(0, y);
}

function resumenTexto() {
  const p = S.perfil, pesos = [...S.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const L = logsOrdenados().filter((l) => l.done).slice(-12);
  let t = `RESUMEN ENTRENAMIENTO (${fmt(today())})\nPerfil: ${p.edad} años, ${p.estatura} cm, inicio ${p.peso} kg, objetivo ${p.objetivo}${p.metaMin ? `, meta ${p.metaMin}-${p.metaMax} kg` : ''}, ${p.lugar}, ${(p.dias || []).length} días/sem\n`;
  t += `Peso: ${pesos.slice(-8).map((x) => `${fmt(x.fecha)} ${x.kg}kg${x.cintura ? ` (${x.cintura}cm)` : ''}`).join(' | ') || 'sin registros'}\n\nÚltimas sesiones:\n`;
  for (const l of L) {
    const dz = zonasUsuario().map((z) => [z, dolorDe(l, z)]).filter(([, v]) => v != null).map(([z, v]) => `${ZONAS[z].toLowerCase()} ${v}/10`).join(', ');
    t += `- ${fmt(l.fecha, true)} ${nombreSes(l)} · RPE ${l.rpe}${dz ? ` · dolor ${dz}` : ''}${l.manana ? ` (al día siguiente: ${l.manana})` : ''}${(l.alertas || []).length ? ' · 🚩 señal de alerta' : ''}\n`;
    for (const [id, e] of Object.entries(l.ex)) {
      const ok = e.sets.filter((s) => s.ok);
      if (ok.length) t += `   ${getEj(id).nombre}: ${ok.map((s) => (num(s.w) ? s.w + 'kg×' : '') + s.r).join(', ')}\n`;
    }
    for (const c of Object.values(l.cardio)) if (c.min) t += `   Elíptica: ${fmtMin(c.min)}${c.km ? ` ${fmtN(c.km, 2)} km` : ''}${c.nivel ? ` niv ${c.nivel}` : ''}${c.rpm ? ` ${c.rpm} rpm` : ''}${c.fc ? ` ${c.fc} lpm` : ''}\n`;
    if (l.notas) t += `   Notas: ${l.notas}\n`;
  }
  const dk = [];
  for (let i = 7; i >= 1; i--) { const dd = iso(addDays(new Date(), -i)); const x = infoDia(dd); if (x.k) dk.push(`${fmt(dd)}: ${Math.round(x.k)} kcal / ${Math.round(x.pr)} g prot (${fmtN(x.pr / pesoActual(), 1)} g/kg) · frutas y verduras ${fmtN(x.fv, 1)}${x.alcK ? ` · alcohol ${Math.round(x.alcK)} kcal` : ''}${x.completo ? '' : ' · registro incompleto'}`); }
  if (dk.length) t += `\nComida (meta ${objetivos().kcal} kcal, ${objetivos().prot} g prot):\n${dk.join('\n')}\n`;
  const al = alertasNutricion();
  if (al.alertas.length) t += `Avisos de alimentación: ${al.alertas.map((a) => a.titulo).join('; ')}\n`;
  const bs = Object.entries(S.bienestar || {}).filter(([f]) => dayDiff(f, today()) <= 7).sort();
  if (bs.length) t += `\nBienestar (7 días): ${bs.map(([f, b]) => `${fmt(f)} sueño ${SUENO.find((x) => x[0] === b.sueno)?.[1] || '?'}, estrés ${b.estres ?? '?'}/3, ánimo ${b.animo ?? '?'}/3`).join(' | ')}\n`;
  t += `Cardio esta semana: ${minutosCardio(weekInfo(today()).week)} min\n`;
  const cam = S.caminatas.filter((c) => dayDiff(c.fecha, today()) <= 28).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (cam.length) t += `\nCaminatas (últimas 4 semanas):\n${cam.map((c) => `- ${fmt(c.fecha, true)}: ${resumenCam([c])}`).join('\n')}\n`;
  const deps = (S.deportes || []).filter((e) => dayDiff(e.fecha, today()) <= 28).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (deps.length) t += `\nDeportes (últimas 4 semanas):\n${deps.map((e) => `- ${fmt(e.fecha, true)}: ${depInfo(e).nombre}: ${[depCalc(e).dist, e.seg ? fmtTiempo(e.seg) : e.min + ' min', depCalc(e).ritmo].filter(Boolean).join(', ')} (${INTENSIDAD[e.int - 1][1].toLowerCase()})${e.dolor ? `, dolor ${Object.entries(e.dolor).map(([z, v]) => `${ZONAS[z].toLowerCase()} ${v}/10`).join(', ')}` : ''}`).join('\n')}\n`;
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
    if (el.dataset.depdolor && depDraft) {
      depDraft.dolor[el.dataset.depdolor] = +el.value;
      const o = $(`#depdolV-${el.dataset.depdolor}`); if (o) o.textContent = el.value;
      return;
    }
    if (el.dataset.depf !== undefined && depDraft) { depLeer(); const o = $('#depkcal'); if (o) o.innerHTML = depPrevTxt(); return; }
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
    } else if (el.id === 'rnom' && sheet.rec) {
      sheet.rec.n = el.value;
    } else if ((el.id === 'rporc' || el.id === 'rcomi') && sheet.rec) {
      sheet.rec[el.id === 'rporc' ? 'porc' : 'comi'] = num(el.value) || 1;
      $('#rprev').textContent = recPrevTxt();
    } else if ((el.id === 'ri_q' || el.id === 'ri_g' || el.id === 'ri_ug') && sheet.recIng) {
      const ri = sheet.recIng;
      ri[{ ri_q: 'q', ri_g: 'gr', ri_ug: 'ug' }[el.id]] = num(el.value) || 0;
      $('#riprev').textContent = prevIng(calcIng(ri), ri.food.u || 'g');
    } else if (el.id === 'fg') {
      sheet.gr = num(el.value) || 0;
      $('#fprev').textContent = prevTxt(sheet.food, sheet.gr / sheet.food.gp);
    } else if (el.id === 'fq') {
      sheet.q = num(el.value) || 1;
      $('#fprev').textContent = prevTxt(sheet.food, sheet.q);
    } else if (el.dataset.inv) {
      invDraft[el.dataset.inv] = el.dataset.inv === 'dias' ? (num(el.value) ?? null) : el.value;
      if (el.dataset.inv === 'dias') invDraft.codigo = null;
    } else if (el.dataset.eq && eqDraft) {
      eqDraft[el.dataset.eq] = el.value;
    } else if (el.dataset.wz && wz) {
      wz[el.dataset.wz] = el.value;
    } else if (el.dataset.rf && rDraft) {
      const f = el.dataset.rf;
      if (el.dataset.i !== undefined) rDraft.ejercicios[+el.dataset.i][f] = el.value;
      else rDraft[f] = el.type === 'checkbox' ? el.checked : el.value;
    } else if (el.dataset.f) {
      if (crono.row === el.closest('.set') && e.isTrusted) cronoStop(false);
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
    } else if (el.dataset.dolor) {
      // dolor por zona; "rodilla" se mantiene como el valor de la rodilla (o el máximo) para el historial
      const lg = getLog(ctx.date, ctx.sid, true), z = el.dataset.dolor;
      lg.dolor = lg.dolor || {};
      lg.dolor[z] = +el.value;
      lg.rodilla = lg.dolor.rodillas ?? Math.max(...Object.values(lg.dolor));
      $(`#dolV-${z}`).textContent = el.value;
      save();
    }
  });
  main.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.actChange === 'ejsel') { ejSel = el.value; rerender(); }
    if (el.dataset.bandera) {
      const lg = getLog(ctx.date, ctx.sid, true), id = el.dataset.bandera;
      lg.alertas = (lg.alertas || []).filter((x) => x !== id);
      if (el.checked) lg.alertas.push(id);
      if (S.alertasVistas) delete S.alertasVistas[logKey(ctx.date, ctx.sid)];
      $('#bandmsg').innerHTML = lg.alertas.length ? `<div class="infobanner">${banderaMsg(lg.alertas)}</div>` : '';
      save(true);
    }
    if (el.dataset.rf === 'calent' && rDraft) rDraft.calent = el.checked;
    if (el.id === 'bcfoto' && el.files[0]) leerFoto(el.files[0]);
    if (el.id === 'ffoto' && el.files[0]) {
      const file = el.files[0], pose = $('#fpose')?.value || 'Frente';
      toast('Guardando foto…');
      reducirImagen(file).then((blob) => FotosDB.poner({ id: Date.now(), fecha: today(), pose, blob })).then(() => { toast('Foto guardada 📸'); cargarFotos(); }).catch(() => toast('No se pudo guardar la foto'));
      el.value = '';
    }
    if (el.dataset.tm) { tm[el.dataset.tm] = el.type === 'checkbox' ? el.checked : el.value; if (!tmRun.activo && el.type !== 'checkbox') { const t0 = $('#tmt'); if (t0) t0.textContent = mmss(tmSecuencia().reduce((a, f) => a + f.s, 0)); } }
    if (el.dataset.rec) {
      S.ajustes = S.ajustes || {};
      const r = recCfg();
      r[el.dataset.rec] = el.type === 'checkbox' ? el.checked : el.value;
      S.ajustes.rec = r; save(true);
      if (el.type === 'checkbox') rerender();
    }
    if (el.id === 'fimport' && el.files[0]) {
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!d.perfil || !d.logs) throw new Error('formato');
          if (!confirm('Esto reemplaza tus datos actuales por los del respaldo. ¿Continuar?')) return;
          const accActual = S.acceso, accResp = d.acceso || (d.perfil ? { tipo: 'total', desde: 'respaldo' } : null);
          S = { perfil: null, logs: {}, pesos: [], caminatas: [], comidas: {}, propios: [], rutinas: [], ejPropios: [], reemplazos: [], descargas: {}, medidas: [], ajustes: {}, ...d };
          // se conserva el mejor acceso entre el del teléfono y el del respaldo
          S.acceso = accActual?.tipo === 'total' ? accActual : accResp?.tipo === 'total' ? accResp : (accResp?.vence || '') > (accActual?.vence || '') ? accResp : accActual || accResp;
          save(true); toast('Respaldo importado'); rerender();
        } catch (err) { toast('Archivo no válido'); }
      };
      r.readAsText(el.files[0]);
    }
  });
  main.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'fcustom-x') {
      // (reservado)
    } else if (f.id === 'fcustom') {
      const a = guardarAlimento(d);
      toast(d.bc ? 'Producto guardado en Mis alimentos ✓' : 'Alimento guardado ✓');
      Object.assign(sheet, { custom: false, draft: null, food: a, q: 1, mode: 'u', gr: a.gp || 100 });
      renderSheet();
    } else if (f.id === 'fpropio') {
      guardarAlimento(d);
      toast('Alimento actualizado ✓');
      location.hash = '#/alimentos';
    } else if (f.id === 'fmedida') {
      const m = { fecha: d.fecha };
      for (const [k] of MEDIDAS) if (num(d[k])) m[k] = num(d[k]);
      if (Object.keys(m).length < 2) { toast('Ingresa al menos una medida'); return; }
      S.medidas = (S.medidas || []).filter((x) => x.fecha !== d.fecha);
      S.medidas.push(m);
      save(true); toast('Medidas guardadas'); rerender();
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
  aplicarAjustes();
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', aplicarAjustes);
  const qInv = new URLSearchParams(location.search).get('inv');
  if (qInv) {
    const inv = leerCodigoInv(qInv);
    if (!inv) setTimeout(() => toast('Link de invitación no válido'), 300);
    else if (inv.tipo === 'invitado' && inv.vence < today()) setTimeout(() => toast(`Esa invitación venció el ${fmt(inv.vence)}`), 300);
    else if (aplicarInvitacion(inv) === 'ok') setTimeout(() => toast(inv.tipo === 'total' ? '¡Bienvenido! Acceso activado' : `¡Bienvenido! Acceso hasta el ${fmt(inv.vence)}`), 300);
    history.replaceState(null, '', location.pathname + (location.hash || '#/hoy'));
  }
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

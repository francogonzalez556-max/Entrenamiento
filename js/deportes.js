/* ============================================================
   DEPORTES MEDIBLES: atletismo, running, trekking, ciclismo,
   natación y remo, con distancia y tiempo (o marca).
   Gasto EXTRA sobre el reposo (el reposo ya está en la meta diaria):
   · correr: ecuación ACSM, costo neto 0,2 ml O2/kg/m ≈ 1 kcal/kg/km
             (+0,9 ml/kg por metro de subida)
   · caminar/marcha: 0,1 ml/kg/m ≈ 0,5 kcal/kg/km (+1,8 ml/kg por metro de subida)
   · ciclismo en ruta/MTB: potencia física (rodadura + aire + subida)
     ÷ eficiencia muscular de ~24% (la tabla de METs × peso sobreestima
     mucho a personas pesadas, porque en bici el peso pesa poco en plano)
   · natación, remo, bici estática: METs del Compendio de Actividades
     Físicas según ritmo o intensidad → (MET − 1) × kg × horas
   Minutos equivalentes de cardio (ACSM/OMS): MET promedio 3-6 = 1 a 1,
   ≥6 = cada minuto vale por 2, <3 no suma.
   ============================================================ */
const DEPORTES = [
  { id: 'atletismo', n: 'Atletismo', ico: '🏃', subs: [
    { id: 'fondo', n: 'Fondo / medio fondo', modo: 'dist', calc: 'run', imp: 2, zonas: ['rodillas'] },
    { id: 'velocidad', n: 'Velocidad / series', modo: 'series', calc: 'run', imp: 2, zonas: ['rodillas'] },
    { id: 'vallas', n: 'Vallas', modo: 'series', calc: 'run', imp: 2, zonas: ['rodillas'] },
    { id: 'marcha', n: 'Marcha atlética', modo: 'dist', calc: 'walk', imp: 1, zonas: ['rodillas'] },
    { id: 'saltos', n: 'Saltos', modo: 'marca', pruebas: ['Salto largo', 'Salto alto', 'Salto triple', 'Garrocha'], met: 4.5, imp: 2, zonas: ['rodillas', 'espalda'] },
    { id: 'lanzamientos', n: 'Lanzamientos', modo: 'marca', pruebas: ['Bala', 'Disco', 'Jabalina', 'Martillo'], met: 3.5, imp: 1, zonas: ['hombros', 'espalda'] },
  ] },
  { id: 'running', n: 'Running / trote', ico: '👟', modo: 'dist', calc: 'run', desn: true, imp: 2, zonas: ['rodillas'] },
  { id: 'trekking', n: 'Trekking / cerro', ico: '🥾', modo: 'dist', calc: 'walk', desn: true, imp: 1, zonas: ['rodillas'] },
  { id: 'ciclismo', n: 'Ciclismo', ico: '🚴', subs: [
    { id: 'ruta', n: 'Ruta / ciudad', modo: 'dist', calc: 'bike', desn: true, imp: 0, zonas: [] },
    { id: 'mtb', n: 'MTB / montaña', modo: 'dist', calc: 'mtb', desn: true, imp: 0, zonas: [] },
    { id: 'estatica', n: 'Bici estática / spinning', modo: 'dist', calc: 'estatica', kmOpc: true, imp: 0, zonas: [] },
  ] },
  { id: 'natacion', n: 'Natación', ico: '🏊', modo: 'dist', unidad: 'm', calc: 'swim', estilos: ['Libre', 'Espalda', 'Pecho', 'Mariposa', 'Combinado'], imp: 0, zonas: ['hombros'] },
  { id: 'remo', n: 'Remo / kayak', ico: '🚣', subs: [
    { id: 'ergo', n: 'Remoergómetro', modo: 'dist', unidad: 'm', calc: 'ergo', imp: 0, zonas: ['espalda'] },
    { id: 'kayak', n: 'Kayak / bote', modo: 'dist', calc: 'kayak', imp: 0, zonas: ['hombros'] },
  ] },
  { id: 'otro', n: 'Otro deporte', ico: '🏅', modo: 'min', mets: [4, 6, 8], imp: 1, zonas: [] },
];
const INTENSIDAD = [
  [1, 'Suave', 'Puedes conversar sin problema'],
  [2, 'Moderado', 'Hablas en frases cortas'],
  [3, 'Intenso', 'Casi no puedes hablar · competencia o test'],
];
const depDef = (id) => DEPORTES.find((d) => d.id === id) || DEPORTES[DEPORTES.length - 1];
// definición efectiva (deporte + disciplina)
function depSpec(e) {
  const d = depDef(e.dep), s = d.subs ? d.subs.find((x) => x.id === e.sub) || d.subs[0] : null;
  return { ...d, ...(s || {}), id: d.id, sub: s?.id || null, nDep: d.n, nSub: s?.n || null, subs: d.subs };
}

/* ---------- tiempos ---------- */
function leerTiempo(txt) { // "45:30" → 2730 s · "1:02:15" → 3735 s · "45" → 45 min
  const p = String(txt || '').trim().replace(/[.,]/g, ':').split(':').filter((x) => x !== '').map(Number);
  if (!p.length || p.some((x) => isNaN(x) || x < 0)) return null;
  if (p.length === 1) return p[0] * 60;
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] * 3600 + p[1] * 60 + p[2];
}
function fmtTiempo(s) {
  if (s == null) return '';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}

/* ---------- METs por velocidad o ritmo (Compendio) ---------- */
const tramo = (v, tabla) => { for (const [lim, met] of tabla) if (v < lim) return met; return tabla[tabla.length - 1][1]; };
const MET_NADO = [[105, 9.8], [135, 8.3], [180, 7], [Infinity, 5.8]]; // s por 100 m (menor = más rápido)
const MET_ERGO = [[125, 12], [140, 8.5], [165, 7], [Infinity, 4.8]]; // s por 500 m
const MET_KAYAK = [[6, 5], [8, 7], [Infinity, 9]]; // km/h
const ESTILO_F = { Libre: 1, Espalda: 0.95, Pecho: 1.05, Mariposa: 1.4, Combinado: 1.1 };

/* cálculo central: gasto, MET promedio, ritmo y textos */
function depCalc(e, kg = pesoActual()) {
  const sp = depSpec(e), out = { kcal: 0, met: 1, ritmo: '', dist: '', ritmoV: null, ritmoU: '' };
  const minSes = num(e.min) || 0;
  const h = (e.seg ? e.seg / 3600 : minSes / 60) || 0;
  const neto = (met) => Math.max(0, met - 1) * kg * h;
  const km = num(e.km) || (num(e.m) ? num(e.m) / 1000 : 0);
  if (sp.modo === 'series') {
    const tot = ((num(e.reps) || 0) * (num(e.mRep) || 0)) / 1000;
    out.kcal = 1.3 * kg * tot; // carrera explosiva: +30% por el componente anaeróbico
    out.dist = `${e.reps} × ${e.mRep} m`;
    if (e.tRep && e.mRep) { const v = (e.mRep / e.tRep) * 3.6; out.ritmo = `${fmtN(e.tRep, 1)} s promedio · ${fmtN(v, 1)} km/h`; out.ritmoV = e.tRep; out.ritmoU = `s por ${e.mRep} m`; }
  } else if (sp.modo === 'marca') {
    out.kcal = neto(sp.met + (e.int === 3 ? 1 : e.int === 1 ? -1 : 0));
    if (e.marca) { out.ritmo = `${e.prueba || sp.nSub} · ${fmtN(e.marca, 2)} m`; out.ritmoV = num(e.marca); out.ritmoU = 'm'; }
  } else if (sp.modo === 'min' || sp.calc === 'estatica') {
    // bici estática: los km de la máquina no son comparables; se usa la intensidad
    if (sp.calc === 'estatica' && km && h) { out.dist = `${fmtN(km, 2)} km`; out.ritmo = `${fmtN(km / h, 1)} km/h`; out.ritmoV = km / h; out.ritmoU = 'km/h'; }
    const mets = sp.mets || [5, 7, 8.5];
    out.kcal = neto(mets[(e.int || 2) - 1]);
  } else {
    const v = h ? km / h : 0, desn = num(e.desn) || 0;
    out.dist = sp.unidad === 'm' ? `${Math.round(km * 1000).toLocaleString('es-CL')} m` : `${fmtN(km, 2)} km`;
    if (sp.calc === 'run' || (sp.calc === 'walk' && v > 8)) out.kcal = kg * (1.0 * km + 0.0045 * desn);
    else if (sp.calc === 'walk') out.kcal = kg * (0.5 * km + 0.009 * desn);
    else if (sp.calc === 'bike' || sp.calc === 'mtb') {
      const ms = v / 3.6, masa = kg + 12, crr = sp.calc === 'mtb' ? 0.015 : 0.005, cda = sp.calc === 'mtb' ? 0.45 : 0.4;
      const watts = (crr * masa * 9.81 * ms + 0.5 * 1.2 * cda * ms ** 3) * 1.1; // +10% por viento, semáforos y aceleraciones
      const mecanico = watts * h * 3600 + masa * 9.81 * desn; // julios
      out.kcal = Math.max(0, mecanico / 0.24 / 4184 - kg * h); // menos el reposo (~1 kcal/kg/h)
    }
    else if (sp.calc === 'swim') out.kcal = neto(Math.min(13.8, tramo(km ? e.seg / (km * 10) : 999, MET_NADO) * (ESTILO_F[e.estilo] || 1)));
    else if (sp.calc === 'ergo') out.kcal = neto(tramo(km ? e.seg / (km * 2) : 999, MET_ERGO));
    else if (sp.calc === 'kayak') out.kcal = neto(tramo(v, MET_KAYAK));
    if (e.seg && km) {
      if (['run', 'walk'].includes(sp.calc)) { const pk = e.seg / km; out.ritmo = `${fmtTiempo(pk)} /km · ${fmtN(v, 1)} km/h`; out.ritmoV = pk; out.ritmoU = 'min/km'; }
      else if (sp.calc === 'swim') { const p = e.seg / (km * 10); out.ritmo = `${fmtTiempo(p)} /100 m`; out.ritmoV = p; out.ritmoU = 'min/100 m'; }
      else if (sp.calc === 'ergo') { const p = e.seg / (km * 2); out.ritmo = `${fmtTiempo(p)} /500 m`; out.ritmoV = p; out.ritmoU = 'min/500 m'; }
      else { out.ritmo = `${fmtN(v, 1)} km/h`; out.ritmoV = v; out.ritmoU = 'km/h'; }
    }
  }
  out.kcal = Math.round(out.kcal);
  const hSes = minSes / 60 || h;
  out.met = hSes ? out.kcal / (kg * hSes) + 1 : 1;
  return out;
}
function depInfo(e) {
  const sp = depSpec(e);
  const corto = e.dep === 'otro' && e.nom ? e.nom : sp.id === 'atletismo' && sp.nSub ? `Atletismo (${sp.nSub.split(' /')[0].toLowerCase()})` : sp.nDep;
  return { nombre: e.dep === 'otro' && e.nom ? e.nom : sp.nSub ? `${sp.nDep} · ${sp.nSub}` : sp.nDep, corto, ico: sp.ico, met: depCalc(e).met, impacto: sp.imp ?? 1, zonas: sp.zonas || [] };
}
const kcalDeporte = (e, kg) => depCalc(e, kg).kcal;
function minEquivCardio(e) {
  const met = depCalc(e).met, m = num(e.min) || 0;
  return met < 3 ? 0 : met < 6 ? m : m * 2;
}
const deportesDe = (fecha) => (S.deportes || []).filter((e) => e.fecha === fecha);
const deportesSemana = (week) => (S.deportes || []).filter((e) => weekInfo(e.fecha).week === week);
function depTxt(e) {
  const c = depCalc(e), i = depInfo(e);
  return `${i.ico} ${esc(i.corto)} ${[c.dist, e.seg ? fmtTiempo(e.seg) : `${e.min} min`, c.ritmo].filter(Boolean).join(' · ')}`;
}
// fila de 2 líneas: deporte arriba, datos abajo
function depFila(e, extra = '') {
  const c = depCalc(e), i = depInfo(e);
  const datos = [c.dist, e.seg ? fmtTiempo(e.seg) : `${e.min} min`, c.ritmo, `≈ ${c.kcal.toLocaleString('es-CL')} kcal`].filter(Boolean).join(' · ');
  return `<li class="dep-li"><span class="dep-li-i">${i.ico}</span><div class="grow"><b>${esc(i.corto)}${extra}${e.ruta ? ` <button class="link small" data-act="depruta" data-id="${e.id}">📍 ver ruta</button>` : ''}</b><span class="small muted">${datos}${e.nota ? ` · ${esc(e.nota)}` : ''}</span></div><button class="link danger" data-act="depdel" data-id="${e.id}" aria-label="Eliminar">✕</button></li>`;
}
const depDiaTxt = (fecha) => deportesDe(fecha).map(depTxt).join(' · ');
function resumenDeportes(arr) {
  const por = {};
  for (const e of arr) {
    const i = depInfo(e), c = depCalc(e), n = i.corto;
    por[n] = por[n] || { min: 0, n: 0, k: 0, km: 0, ico: i.ico, m: depSpec(e).unidad === 'm' };
    por[n].min += num(e.min) || 0; por[n].n++; por[n].k += c.kcal;
    por[n].km += num(e.km) || (num(e.m) || 0) / 1000 || ((num(e.reps) || 0) * (num(e.mRep) || 0)) / 1000;
  }
  return Object.entries(por).sort((a, b) => b[1].min - a[1].min);
}
const distTxt = (x) => (x.km ? (x.m ? `${Math.round(x.km * 1000).toLocaleString('es-CL')} m` : `${fmtN(x.km, 1)} km`) : '');

/* ---------- récords personales ---------- */
// se comparan registros del mismo deporte, disciplina, estilo, prueba y distancia de serie
const recKey = (e) => [e.dep, e.sub || '', e.estilo || '', e.prueba || '', e.mRep || ''].join('|');
function recordsDe(arr) {
  const R = {};
  for (const e of arr) {
    const sp = depSpec(e), c = depCalc(e), k = recKey(e), km = num(e.km) || (num(e.m) || 0) / 1000;
    const r = (R[k] = R[k] || { e, nombre: [depInfo(e).nombre, e.estilo, e.prueba, e.mRep ? `${e.mRep} m` : ''].filter(Boolean).join(' · ') });
    if (sp.modo === 'marca' && c.ritmoV) { if (!r.marca || c.ritmoV > r.marca.v) r.marca = { v: c.ritmoV, f: e.fecha, id: e.id }; }
    else if (sp.modo === 'series' && c.ritmoV) { if (!r.serie || c.ritmoV < r.serie.v) r.serie = { v: c.ritmoV, f: e.fecha, id: e.id }; }
    else if (sp.modo === 'dist' && km) {
      if (!r.lejos || km > r.lejos.v) r.lejos = { v: km, f: e.fecha, id: e.id };
      // mejor ritmo solo con distancias que cuentan (evita "récords" en 200 m de trote)
      const minKm = { run: 3, walk: 3, bike: 10, mtb: 10, swim: 0.2, ergo: 1, kayak: 2 }[sp.calc] || 1;
      if (c.ritmoV && km >= minKm) {
        const mejor = c.ritmoU === 'km/h' ? c.ritmoV > (r.ritmo?.v ?? -1) : c.ritmoV < (r.ritmo?.v ?? Infinity);
        if (mejor) r.ritmo = { v: c.ritmoV, f: e.fecha, u: c.ritmoU, id: e.id };
      }
      if (sp.calc === 'run' && e.seg) for (const d of [5, 10, 21.1, 42.2]) if (km >= d) {
        const t = (e.seg / km) * d, kk = 'k' + d;
        if (!r[kk] || t < r[kk].v) r[kk] = { v: t, f: e.fecha, id: e.id };
      }
    }
  }
  return R;
}
function fmtRitmo(v, u) {
  if (u === 'km/h') return `${fmtN(v, 1)} km/h`;
  if (u === 'm') return `${fmtN(v, 2)} m`;
  if (u.startsWith('s por')) return `${fmtN(v, 1)} ${u}`;
  return `${fmtTiempo(v)} ${u.replace('min', '')}`;
}
function recordsTxt(r) {
  const t = [];
  if (r.marca) t.push(`mejor marca ${fmtN(r.marca.v, 2)} m`);
  if (r.serie) t.push(`mejor promedio ${fmtN(r.serie.v, 1)} s`);
  if (r.ritmo) t.push(`mejor ritmo ${fmtRitmo(r.ritmo.v, r.ritmo.u)}`);
  if (r.lejos) t.push(`más lejos ${depSpec(r.e).unidad === 'm' ? `${Math.round(r.lejos.v * 1000).toLocaleString('es-CL')} m` : `${fmtN(r.lejos.v, 1)} km`}`);
  for (const d of [5, 10, 21.1, 42.2]) if (r['k' + d]) t.push(`${d === 21.1 ? '21K' : d === 42.2 ? '42K' : d + 'K'} en ${fmtTiempo(r['k' + d].v)}`);
  return t.join(' · ');
}
// ¿el registro nuevo bate un récord anterior del mismo tipo?
function recordNuevo(e) {
  const antes = recordsDe((S.deportes || []).filter((x) => x.id !== e.id))[recKey(e)];
  const ahora = recordsDe(S.deportes || [])[recKey(e)];
  if (!antes || !ahora) return null;
  for (const k of ['marca', 'serie', 'ritmo', 'lejos', 'k5', 'k10', 'k21.1', 'k42.2']) if (ahora[k]?.id === e.id && antes[k]) return k;
  return null;
}

/* ---------- Registro (hoja modal) ---------- */
let depDraft = null;
function depRecientes() {
  const vistos = [];
  for (const e of [...(S.deportes || [])].reverse()) if (!vistos.includes(e.dep) && DEPORTES.some((d) => d.id === e.dep)) vistos.push(e.dep);
  return vistos;
}
function depFormHTML() {
  const D = depDraft, t = today();
  if (!D.dep) {
    const rec = depRecientes();
    const orden = [...rec.map(depDef), ...DEPORTES.filter((d) => !rec.includes(d.id))];
    return `<div class="dep-grid">${orden.map((d) => `<button class="dep-b" data-act="depsel" data-v="${d.id}"><span>${d.ico}</span>${esc(d.n)}</button>`).join('')}</div>
      <p class="small muted">Registra distancia y tiempo (o tu marca): la app calcula tu ritmo, el gasto real y tus récords.</p>`;
  }
  const sp = depSpec(D), info = depInfo(D);
  const mias = zonasUsuario().filter((z) => z !== 'general');
  const riesgo = info.impacto >= 1 ? mias.filter((z) => info.zonas.includes(z)) : [];
  const zonasDolor = zonasUsuario().filter((z) => z === 'general' || info.zonas.includes(z));
  const inp = (id, label, val, ph, mode = 'decimal') => `<label>${label}<input id="${id}" data-depf type="text" inputmode="${mode}" value="${esc(val ?? '')}" placeholder="${ph}" autocomplete="off"></label>`;
  let campos = '';
  if (sp.modo === 'dist') {
    const u = sp.unidad === 'm' ? 'm' : 'km';
    campos = `<div class="row2">${inp('depdist', `Distancia (${u})${sp.kmOpc ? ' · opcional' : ''}`, u === 'm' ? D.m : D.km, u === 'm' ? 'ej: 1500' : 'ej: 5,2')}${inp('deptiempo', 'Tiempo', D.tiempo, 'ej: 32:15', 'text')}</div>
      <p class="small muted">Tiempo en minutos:segundos (32:15) o horas:minutos:segundos (1:05:00).</p>
      ${sp.desn ? inp('depdesn', 'Desnivel positivo (m) · opcional', D.desn, 'ej: 300', 'numeric') : ''}
      ${sp.estilos ? `<span class="lbl">Estilo</span><div class="chips dep-subs">${sp.estilos.map((x) => `<button class="tab ${D.estilo === x ? 'on' : ''}" data-act="depestilo" data-v="${x}">${x}</button>`).join('')}</div>` : ''}
      ${sp.id === 'natacion' ? '<p class="small muted">Piscina de 25 m: 40 largos = 1.000 m.</p>' : ''}`;
  } else if (sp.modo === 'series') {
    campos = `<div class="row3">${inp('depreps', 'Series', D.reps, 'ej: 8', 'numeric')}${inp('depmrep', 'Metros c/u', D.mRep, 'ej: 200', 'numeric')}${inp('deptrep', 'Tiempo c/u (s)', D.tRep, 'ej: 32,5')}</div>
      ${inp('depmin', 'Duración total de la sesión (min)', D.min, 'con pausas y calentamiento', 'numeric')}`;
  } else if (sp.modo === 'marca') {
    campos = `<span class="lbl">Prueba</span><div class="chips dep-subs">${sp.pruebas.map((x) => `<button class="tab ${(D.prueba || sp.pruebas[0]) === x ? 'on' : ''}" data-act="depprueba" data-v="${x}">${x}</button>`).join('')}</div>
      <div class="row2">${inp('depmarca', 'Mejor marca (m)', D.marca, 'ej: 4,85')}${inp('depmin', 'Duración de la sesión (min)', D.min, 'ej: 60', 'numeric')}</div>`;
  } else {
    campos = `${D.dep === 'otro' ? `<label>¿Qué deporte?<input id="depnom" data-depf value="${esc(D.nom || '')}" placeholder="ej: fútbol, tenis" autocomplete="off"></label>` : ''}${inp('depmin', 'Minutos', D.min, 'ej: 60', 'numeric')}`;
  }
  return `<div class="form">
    <div class="dep-sel"><span class="dep-ico">${sp.ico}</span><b>${esc(sp.nDep)}</b><button class="link small" data-act="depsel" data-v="">Cambiar</button></div>
    ${sp.subs ? `<span class="lbl">Disciplina</span><div class="chips dep-subs">${sp.subs.map((s) => `<button class="tab ${sp.sub === s.id ? 'on' : ''}" data-act="depsub" data-v="${s.id}">${esc(s.n)}</button>`).join('')}</div>` : ''}
    ${D.ruta ? `<div class="dep-gps">📍 Medido con GPS${rutaSVG(D.ruta.map(([lat, lon]) => ({ lat, lon })))}</div>` : sp.modo === 'dist' && gpsPuede(sp.id, sp.sub) && D.fecha === t ? '<button class="btn wide" data-act="depagps">📍 Medirlo en vivo con GPS</button>' : ''}
    ${campos}
    <span class="lbl">¿Cómo te sentiste?</span><div class="seg seg3">${INTENSIDAD.map(([v, n]) => `<button class="${D.int === v ? 'on' : ''}" data-act="depint" data-v="${v}">${n}</button>`).join('')}</div>
    <p class="small muted">${INTENSIDAD[D.int - 1][2]}</p>
    <label>Fecha<input id="depfecha" type="date" value="${D.fecha}" max="${t}"></label>
    <div class="dep-prev" id="depkcal">${depPrevTxt()}</div>
    ${riesgo.length ? `<div class="hint warn">🦵 Impacto ${info.impacto === 2 ? 'alto' : 'medio'} para tu${riesgo.length > 1 ? 's' : ''} ${riesgo.map((z) => ZONAS[z].toLowerCase()).join(' y ')}: calienta 10 min, sube la distancia de a poco (no más de ~10% por semana) y respeta la regla del dolor (hasta 3/10 y que al día siguiente no esté peor).</div>` : ''}
    ${zonasDolor.map((z) => `<label>${z === 'general' ? 'Dolor o molestia articular' : `Dolor de ${ZONAS[z].toLowerCase()}`} después <b id="depdolV-${z}">${D.dolor[z] ?? 0}</b><input type="range" min="0" max="10" data-depdolor="${z}" value="${D.dolor[z] ?? 0}"></label>`).join('')}
    <label>Notas<input id="depnota" value="${esc(D.nota || '')}" placeholder="ej: circuito del parque, piscina municipal" autocomplete="off"></label>
    <button class="btn primary big" data-act="depsave">Guardar</button>
    <p class="small muted">El gasto es el extra sobre el reposo, calculado con tu peso y lo que recorriste. Tu meta diaria de calorías no cambia.</p></div>`;
}
// borrador → registro (sin validar)
function depDesdeDraft() {
  const D = depDraft, sp = depSpec(D), e = { dep: D.dep, sub: sp.sub, int: D.int, fecha: D.fecha };
  if (sp.modo === 'dist') {
    const seg = leerTiempo(D.tiempo), dist = num(sp.unidad === 'm' ? D.m : D.km);
    if (dist) e[sp.unidad === 'm' ? 'm' : 'km'] = dist;
    if (seg) { e.seg = seg; e.min = Math.round(seg / 60); }
    if (num(D.desn)) e.desn = num(D.desn);
    if (sp.estilos) e.estilo = D.estilo || sp.estilos[0];
  } else if (sp.modo === 'series') {
    Object.assign(e, { reps: num(D.reps), mRep: num(D.mRep), tRep: num(D.tRep), min: num(D.min) });
  } else if (sp.modo === 'marca') {
    Object.assign(e, { prueba: D.prueba || sp.pruebas[0], marca: num(D.marca), min: num(D.min) });
  } else {
    e.min = num(D.min);
    if (D.dep === 'otro') e.nom = (D.nom || '').trim();
  }
  return e;
}
function depPrevTxt() {
  if (!depDraft?.dep) return '';
  const e = depDesdeDraft();
  if (!(e.min > 0)) return '<span class="muted">Completa los datos para ver tu ritmo y el gasto.</span>';
  const c = depCalc(e), eq = minEquivCardio(e);
  return `${c.ritmo ? `<b>${c.ritmo}</b><br>` : ''}≈ ${c.kcal.toLocaleString('es-CL')} kcal · ${eq ? `suma ${eq} min a tu cardio semanal${eq > e.min ? ' (vigoroso: cada minuto vale por 2)' : ''}` : 'suave: no suma a la meta de cardio'}`;
}
function abrirDeporte(fecha) {
  depDraft = { dep: null, int: 2, fecha: fecha || today(), dolor: {}, nota: '' };
  renderDeporte();
}
function renderDeporte() { openModal('🏅 Registrar deporte', depFormHTML()); }
function depLeer() {
  const D = depDraft;
  if (!D) return;
  const v = (id) => ($('#' + id) ? $('#' + id).value : undefined);
  if (v('depdist') !== undefined) { if (D.dep && depSpec(D).unidad === 'm') D.m = v('depdist'); else D.km = v('depdist'); }
  for (const [id, k] of [['deptiempo', 'tiempo'], ['depdesn', 'desn'], ['depreps', 'reps'], ['depmrep', 'mRep'], ['deptrep', 'tRep'], ['depmarca', 'marca'], ['depmin', 'min'], ['depnom', 'nom'], ['depnota', 'nota'], ['depfecha', 'fecha']]) if (v(id) !== undefined) D[k] = v(id);
}
const accionesDeporte = {
  depopen(btn) { abrirDeporte(btn.dataset.f); },
  depsel(btn) {
    depLeer();
    const id = btn.dataset.v || null, d = id ? depDef(id) : null;
    Object.assign(depDraft, { dep: id, sub: d?.subs ? d.subs[0].id : null, estilo: d?.estilos ? d.estilos[0] : null, prueba: null, km: '', m: '' });
    renderDeporte();
  },
  depsub(btn) { depLeer(); Object.assign(depDraft, { sub: btn.dataset.v, prueba: null, km: '', m: '' }); renderDeporte(); },
  depestilo(btn) { depLeer(); depDraft.estilo = btn.dataset.v; renderDeporte(); },
  depprueba(btn) { depLeer(); depDraft.prueba = btn.dataset.v; renderDeporte(); },
  depint(btn) { depLeer(); depDraft.int = +btn.dataset.v; renderDeporte(); },
  depsave() {
    depLeer();
    const D = depDraft, sp = depSpec(D), e = depDesdeDraft();
    const mal = (m) => { toast(m); return true; };
    if (D.fecha > today() && mal('La fecha no puede ser futura')) return;
    if (sp.modo === 'dist') {
      if (!e.seg && mal('Ingresa el tiempo (ej: 32:15)')) return;
      if (!sp.kmOpc && !(e.km || e.m) && mal(`Ingresa la distancia en ${sp.unidad === 'm' ? 'metros' : 'km'}`)) return;
      const dist = e.km || (e.m || 0) / 1000, v = dist / (e.seg / 3600);
      const tope = { run: 26, walk: 16, bike: 70, mtb: 50, swim: 8, ergo: 25, kayak: 20 }[sp.calc];
      if (dist && v > tope && !confirm(`${fmtN(v, 1)} km/h parece muy rápido para ${(sp.nSub || sp.nDep).toLowerCase()}. ¿Revisaste distancia y tiempo? Acepta para guardar igual.`)) return;
    } else if (sp.modo === 'series') {
      if (!(e.reps > 0 && e.mRep > 0) && mal('Ingresa las series y los metros de cada una')) return;
      if (!(e.min > 0) && mal('Ingresa la duración total de la sesión')) return;
    } else if (sp.modo === 'marca') {
      if (!(e.min > 0) && mal('Ingresa la duración de la sesión')) return;
    } else {
      if (D.dep === 'otro' && !e.nom && mal('Escribe qué deporte hiciste')) return;
      if (!(e.min > 0 && e.min <= 600) && mal('Ingresa los minutos (entre 1 y 600)')) return;
    }
    if (D.ruta) { e.ruta = D.ruta; e.gps = true; }
    Object.assign(e, { id: 'd' + Date.now(), ...(Object.keys(D.dolor).length ? { dolor: { ...D.dolor } } : {}), ...(D.nota ? { nota: D.nota.trim() } : {}) });
    (S.deportes = S.deportes || []).push(e);
    save(true);
    depDraft = null;
    closeModal();
    const rn = recordNuevo(e);
    toast(rn ? `🏆 ¡Récord personal en ${depInfo(e).corto.toLowerCase()}!` : `${depInfo(e).ico} Registrado · ${depCalc(e).ritmo || `≈ ${kcalDeporte(e)} kcal`}`);
    rerender();
  },
  depdel(btn) {
    if (!confirm('¿Eliminar este registro de deporte?')) return;
    S.deportes = (S.deportes || []).filter((e) => e.id !== btn.dataset.id);
    save(true); rerender();
  },
  depver(btn) { depVer = btn.dataset.v; rerender(); },
  depagps() {
    depLeer();
    const sp = depSpec(depDraft), i = GPS_DEPS.findIndex((g) => g.dep === sp.id && (g.sub || null) === (sp.sub || null));
    if (i >= 0) gpsElige.i = i;
    depDraft = null; closeModal(); location.hash = '#/gps';
  },
  depruta(btn) {
    const e = (S.deportes || []).find((x) => x.id === btn.dataset.id);
    if (e?.ruta) openModal(`📍 ${esc(depInfo(e).corto)} · ${fmt(e.fecha)}`, `${rutaSVG(e.ruta.map(([lat, lon]) => ({ lat, lon })), 340, 260)}<p class="small muted center">${depTxt(e)}</p>`);
  },
};

/* ---------- Tarjetas ---------- */
function deportesHoyHTML(t, semana) {
  const hoy = deportesDe(t), resumen = resumenDeportes(deportesSemana(semana));
  const p = S.perfil;
  const ult4 = (S.deportes || []).filter((e) => dayDiff(e.fecha, t) < 28 && dayDiff(e.fecha, t) >= 0);
  const subir = ult4.reduce((a, e) => a + (num(e.min) || 0), 0) / 4 >= 180 && ['sedentario', 'ligero'].includes(p.actividad);
  return `<div class="card"><h3>🏅 Deportes</h3>
    ${hoy.length ? `<ul class="dep-list">${hoy.map((e) => depFila(e)).join('')}</ul>` : '<p class="small muted">Atletismo, running, trekking, ciclismo, natación o remo: registra distancia y tiempo. Suma a tu cardio y a tus rachas, y la app ajusta tu próxima sesión si fue exigente.</p>'}
    <div class="btns dep-btns"><button class="btn primary" data-act="gpsabrir">📍 Medir en vivo con GPS</button><button class="btn" data-act="depopen" data-f="${t}">+ Registrar a mano</button></div>
    ${resumen.length ? `<p class="small muted">Esta semana: ${resumen.map(([n, x]) => `${x.ico} ${esc(n)} ${distTxt(x) || x.min + ' min'}`).join(' · ')} (≈ ${resumen.reduce((a, [, x]) => a + x.k, 0).toLocaleString('es-CL')} kcal)</p>` : ''}
    ${subir ? '<div class="hint">Haces bastante deporte (3 h o más por semana). Considera subir tu <a href="#/perfil">nivel de actividad</a>: tu meta de calorías se ajustará a tu gasto real.</div>' : ''}</div>`;
}
let depVer = null;
function deportesProgresoHTML() {
  const t = today(), todos = S.deportes || [], arr = [...todos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const res = resumenDeportes(arr.filter((e) => dayDiff(e.fecha, t) < 28));
  // progreso del ritmo (o marca) por tipo de registro
  const R = recordsDe(todos), claves = Object.keys(R).filter((k) => recordsTxt(R[k]));
  if (!depVer || !claves.includes(depVer)) depVer = claves[0] || null;
  let graf = '';
  if (depVer) {
    const pts = todos.filter((e) => recKey(e) === depVer).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((e) => ({ e, c: depCalc(e) })).filter((x) => x.c.ritmoV);
    const u = pts[0]?.c.ritmoU || '', esMin = u.startsWith('min');
    graf = `<h4>Progreso y récords</h4><div class="chips dep-subs">${claves.map((k) => `<button class="tab ${k === depVer ? 'on' : ''}" data-act="depver" data-v="${esc(k)}">${esc(R[k].nombre)}</button>`).join('')}</div>
      <p class="small">🏆 ${recordsTxt(R[depVer])}</p>
      ${pts.length >= 2 ? `${chartLine(pts.map((x) => ({ x: +parse(x.e.fecha), y: esMin ? r1(x.c.ritmoV / 60) : x.c.ritmoV, t: `${fmt(x.e.fecha)} · ${x.c.ritmo}` })), { label: 'progreso deporte', dec: true, h: 140 })}
        <p class="small muted">${esMin ? `Ritmo en ${u} (en decimales: 5,5 = 5:30). Más bajo = más rápido.` : u === 'km/h' ? 'Velocidad promedio: más alto = más rápido.' : u === 'm' ? 'Marca en metros: más alto = mejor.' : `Tiempo promedio por serie (${u}): más bajo = más rápido.`}</p>` : '<p class="small muted">Con 2 o más registros verás aquí tu progreso.</p>'}`;
  }
  return `<div class="card"><h3>🏅 Deportes</h3>
    <button class="btn wide" data-act="depopen" data-f="${t}">+ Registrar deporte</button>
    ${res.length ? `<p class="small muted">Últimas 4 semanas</p><ul class="dep-list">${res.map(([n, x]) => `<li class="dep-li"><span class="dep-li-i">${x.ico}</span><div class="grow"><b>${esc(n)} · ${distTxt(x) || x.min + ' min'}</b><span class="small muted">${x.n} ${x.n === 1 ? 'vez' : 'veces'} · ${x.min} min · ≈ ${x.k.toLocaleString('es-CL')} kcal</span></div></li>`).join('')}</ul>` : '<p class="small muted">Aún no registras deportes.</p>'}
    ${graf}
    ${arr.length ? `<details><summary class="small">Ver registros</summary><ul class="dep-list">${arr.map((e) => depFila(e, ` <span class="muted small">· ${fmt(e.fecha)}</span>`)).join('')}</ul></details>` : ''}</div>`;
}
// sugerencia de alimentación en días con deporte exigente
function deporteComidaHTML(d) {
  const arr = deportesDe(d);
  if (!arr.length) return '';
  const k = arr.reduce((a, e) => a + kcalDeporte(e), 0), min = arr.reduce((a, e) => a + (num(e.min) || 0), 0);
  if (k < 300) return '';
  const obj = S.perfil.objetivo, f = obj === 'bajar' ? 0.4 : obj === 'musculo' ? 0.8 : 0.6;
  const extra = Math.min(600, Math.round((k * f) / 50) * 50), oc = S.perfil.ocultarKcal;
  return `<div class="card small-card"><h3>🏅 Día con deporte</h3><p class="small">${arr.map(depTxt).join(' · ')}${oc ? '' : ` (≈ ${k.toLocaleString('es-CL')} kcal)`}. Si tienes más hambre, suma una colación${oc ? '' : ` de ~${extra} kcal`} con proteína y carbohidrato: yogurt con fruta, pan con huevo o un batido.${min >= 60 ? ' Repón líquido: ~500 ml por hora de deporte.' : ''}</p></div>`;
}

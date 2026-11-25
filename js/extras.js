/* ============================================================
   Ejercicio extra (v1.35): "me siento con ánimo, quiero sumar uno más".
   - Sugiere accesorios de baja fatiga para los músculos que tu plan trabaja
     menos esta semana (según tu rango de series recomendado).
   - En la tanda de la mañana: no toca los músculos de la tarde (llegan frescos)
     y, en modo silencioso, solo propone ejercicios sin ruido.
   - Prescripción prudente: 2 series de 12-15 (o 30 s), 2-3 reps en reserva, 60 s.
   - Máximo 2 extras por sesión. Con señal de alerta no se suma nada; con
     descarga, poco sueño o dolor, solo opciones suaves (core, glúteo medio,
     hombro posterior).
   ============================================================ */

const EXTRA_MAX = 2;
const SG_SUAVES = ['abdomen', 'lumbar', 'gluteos', 'h_post', 'pantorrillas'];
// opciones de baja fatiga primero (el ACC_SG del ajuste de volumen parte por los multiarticulares)
const EXTRA_SG = {
  pecho: ['flexiones_inclinadas', 'press_pecho_banda', 'aperturas_mancuernas', 'flexiones', 'press_suelo', 'press_pecho_maquina'],
  dorsal: ['jalon_banda', 'remo_banda_pie', 'pullover', 'jalon', 'remo_trx', 'remo_mancuerna'],
  media: ['face_pull', 'remo_banda_pie', 'remo_pecho_apoyado', 'remo_mancuerna', 'encogimientos'],
  h_lat: ['elevaciones_laterales', 'elevacion_lateral_polea'],
  h_post: ['face_pull', 'pajaros', 'ytw', 'rotacion_externa_banda'],
  biceps: ['curl_martillo', 'curl_biceps', 'curl_banda', 'curl_polea'],
  triceps: ['extension_triceps_banda', 'extension_triceps_polea', 'patada_triceps', 'extension_triceps'],
  cuad: ['sentadilla_pared', 'extension_terminal_rodilla', 'sentadilla_cajon'],
  isquios: ['puente_isquios', 'curl_femoral_maquina'],
  gluteos: ['abduccion_cadera', 'almeja', 'puente', 'puente_una_pierna', 'patada_gluteo', 'hip_thrust_banco'],
  pantorrillas: ['elevacion_talones', 'talones_sentado', 'talones_una_pierna'],
  abdomen: ['dead_bug', 'pallof', 'plancha_lateral', 'plancha', 'crunch_bicicleta'],
  lumbar: ['bird_dog', 'superman'],
};

const extrasDe = (lg) => lg?.extras || [];
const tagExtra = (id) => ({ k: 'ex', id, extra: true });

// mete los extras en la lista: los de la tanda 1 antes del cierre de la mañana, el resto al final
function conExtras(items, lg) {
  const ex = extrasDe(lg);
  if (!ex.length) return items;
  const ya = new Set(items.filter((x) => x.k === 'ex').map((x) => x.id));
  const out = [...items];
  for (const e of ex) {
    if (ya.has(e.id) || !getEj(e.id)) continue;
    ya.add(e.id);
    const it = { ...tagExtra(e.id), sets: e.sets, reps: e.reps, rest: e.rest };
    const fin = out.findIndex((x) => x.k === 'tandafin');
    if (e.t === 1 && fin >= 0) out.splice(fin, 0, it); else out.push(it);
  }
  return out;
}

function extraCtaHTML(lg, t) {
  if (lg?.done) return '';
  const n = extrasDe(lg).length;
  if (n >= EXTRA_MAX) return '';
  const txt = t === 1 ? '¿Te queda energía en la mañana?' : '¿Terminaste con energía?';
  return `<div class="hint extra-cta">💪 ${txt} <button class="link" data-act="extraopen" data-t="${t}">+ Sumar un ejercicio extra</button></div>`;
}

// series directas que hace hoy cada músculo, en toda la sesión o solo en la tanda indicada
function seriesHoy(items, soloTanda) {
  const v = volVacio();
  let tanda = 0;
  for (const it of items) {
    if (it.k === 'tanda') tanda = it.n;
    if (it.k !== 'ex' || (soloTanda && tanda !== soloTanda)) continue;
    sumarSeries(v, it.id, it.circ ? it.sets * 0.5 : it.sets);
  }
  return v;
}

// estado del día: ¿conviene sumar?
function extraEstado() {
  if (banderaActiva()) return { bloqueo: 'Marcaste una señal de alerta hace poco: hoy no sumes ejercicios. Prioriza recuperarte y que te evalúen.' };
  const wi = weekInfo(ctx.date);
  const aj = getRutina(ctx.sid) ? { menos: 0, zonas: null } : ajusteSesion(ctx.date, ctx.sid);
  const motivos = [];
  if (wi.deload || (S.descargas || {})[wi.week]) motivos.push('estás en semana de descarga');
  if (aj.menos) motivos.push('hoy el plan te bajó una serie por ejercicio');
  if (aj.sugDescarga) motivos.push('hay señales de fatiga acumulada');
  if (aj.zonas) motivos.push('tienes una molestia activa');
  return { suave: motivos.length > 0, motivos, zonas: aj.zonas || {} };
}

function extraSugerencias(t) {
  const lg = getLog(ctx.date, ctx.sid);
  const items = ctx.items || [];
  const enSes = new Set(items.filter((x) => x.k === 'ex').map((x) => x.id));
  const silencio = t === 1 && modoTandas(lg) === 'silencio';
  const est = extraEstado();
  if (est.bloqueo) return { sel: [], est, silencio, ok: () => false };
  const p = S.perfil || {};
  const wi = weekInfo(ctx.date);
  const enf = sgEnfocados(enfoqueActivo()?.areas);
  const plan = getRutina(ctx.sid) ? volVacio() : volumenPlan(PLAN(wi.ciclo), wi.phase - 1);
  const hoy = seriesHoy(items);
  const tarde = t === 1 ? seriesHoy(items, 2) : volVacio();
  const ok = (id) => !enSes.has(id) && puedoHacer(id) && EJERCICIOS[id] && EJERCICIOS[id].tipo !== 'cardio'
    && (!silencio || ruidoDe(id) === 0) && !zonasDeEj(id).some((z) => est.zonas[z])
    && musculosDe(id).d.every((m) => !(tarde[m]?.d > 0) && !(hoy[m]?.d >= 6));
  const cands = [];
  for (const sg of Object.keys(EXTRA_SG)) {
    if (est.suave && !SG_SUAVES.includes(sg)) continue;
    if (tarde[sg].d > 0) continue; // ese músculo trabaja en la tarde: que llegue fresco
    if (hoy[sg].d >= 6) continue; // ya tiene bastante hoy
    const r = rangoSeries(p, sg, enf);
    const tiene = efectivas(plan[sg]);
    const id = EXTRA_SG[sg].find(ok);
    if (!id) continue;
    cands.push({ sg, id, tiene, min: r.min, cob: tiene / r.min, enf: enf.has(sg) });
  }
  cands.sort((a, b) => (b.enf - a.enf) || (a.cob - b.cob));
  const sel = [];
  for (const c of cands) if (sel.length < 3 && !sel.some((x) => x.id === c.id)) sel.push(c);
  // siempre una opción de cuidado (core o glúteo medio): protege rodillas y espalda
  if (!sel.some((x) => ['abdomen', 'lumbar', 'gluteos'].includes(x.sg))) {
    const c = cands.find((x) => ['abdomen', 'gluteos', 'lumbar'].includes(x.sg) && !sel.some((y) => y.id === x.id));
    if (c) sel.push(c);
  }
  return { sel, est, silencio, ok };
}

function porQueExtra(c) {
  if (c.enf) return `🎯 Es parte de tu enfoque (${NOMBRE_SG[c.sg].toLowerCase()})`;
  if (c.cob < 1) return `Tu plan le da ~${fmtN(Math.floor(c.tiene * 2) / 2)} series a la semana y te recomendamos ${c.min}+`;
  if (['abdomen', 'lumbar', 'gluteos'].includes(c.sg)) return 'Cuidado: un core y glúteos fuertes protegen rodillas y espalda';
  return `Suma volumen a ${NOMBRE_SG[c.sg].toLowerCase()} sin cansar lo que viene`;
}

function extraRx(id) {
  return esTiempo(getEj(id)) ? { sets: 2, reps: '30 s', rest: 60 } : { sets: 2, reps: '12-15', rest: 60 };
}

Object.assign(actions, {
  extraopen(btn) {
    const t = +btn.dataset.t;
    const { sel, est, silencio, ok } = extraSugerencias(t);
    if (est.bloqueo) { openModal('💪 Ejercicio extra', `<p class="small">🚩 ${est.bloqueo}</p><button class="btn wide" data-act="closemodal">Entendido</button>`); return; }
    const aviso = est.suave
      ? `<div class="hint warn small">Ojo: ${est.motivos.join(', ')}. Te mostramos solo opciones suaves y deja 3 repeticiones en reserva.</div>`
      : '';
    const lista = sel.length
      ? `<div class="fres">${sel.map((c) => `<button class="fres-i" data-act="extrapick" data-id="${c.id}" data-t="${t}"><b>${esc(getEj(c.id).nombre)}</b><span>${NOMBRE_SG[c.sg]} · ${porQueExtra(c)}</span></button>`).join('')}</div>`
      : '<p class="small muted">No encontramos un buen extra con tu equipo para este momento.</p>';
    // todos los demás, por grupo
    const grupos = {};
    for (const id of Object.keys(EJERCICIOS)) {
      if (!ok(id) || (est.suave && !SG_SUAVES.some((sg) => musculosDe(id).d.includes(sg)))) continue;
      const g = GRUPO_DE_PATRON[PATRON[id]] || 'Otros';
      (grupos[g] = grupos[g] || []).push(id);
    }
    const opts = Object.entries(grupos).map(([g, ids]) => `<optgroup label="${esc(g)}">${ids.sort((a, b) => EJERCICIOS[a].nombre.localeCompare(EJERCICIOS[b].nombre)).map((id) => `<option value="${id}">${esc(EJERCICIOS[id].nombre)}</option>`).join('')}</optgroup>`).join('');
    openModal('💪 Sumar un ejercicio extra', `${aviso}
      <p class="small muted">Sugerencias para ${t === 1 ? 'esta tanda' : 'cerrar la sesión'}${silencio ? ' (sin ruido)' : ''}${t === 1 ? ', sin tocar los músculos de la tarde' : ''}:</p>
      ${lista}
      ${opts ? `<details class="mt"><summary class="small">Elegir otro ejercicio</summary><select id="extrasel" class="mt">${opts}</select><button class="btn wide mt" data-act="extrapick" data-t="${t}">+ Sumar</button></details>` : ''}
      <p class="small muted mt">Se agrega con <b>2 series de 12-15</b> (o 30 s), dejando <b>2-3 repeticiones en reserva</b> y 60 s de descanso. Si te sobra, usa "+ agregar serie". Máximo ${EXTRA_MAX} extras por sesión: más volumen no siempre es mejor, la recuperación también cuenta.</p>`);
  },
  extrapick(btn) {
    const id = btn.dataset.id || $('#extrasel')?.value;
    if (!id) return;
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.extras = lg.extras || [];
    if (lg.extras.length >= EXTRA_MAX) { closeModal(); toast(`Ya sumaste ${EXTRA_MAX} extras hoy`); return; }
    if ((ctx.items || []).some((x) => x.k === 'ex' && x.id === id)) { toast('Ese ejercicio ya está en la sesión'); return; }
    lg.extras.push({ id, t: +btn.dataset.t, ...extraRx(id) });
    save(true); closeModal();
    toast(`💪 ${getEj(id).nombre} agregado`);
    rerender();
    setTimeout(() => document.querySelector(`[data-exc="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  },
  extraquitar(btn) {
    const lg = getLog(ctx.date, ctx.sid, true), id = btn.dataset.id;
    lg.extras = extrasDe(lg).filter((e) => e.id !== id);
    if (lg.ex?.[id] && !lg.ex[id].sets.some((s) => s.ok)) delete lg.ex[id];
    save(true); toast('Extra quitado'); rerender();
  },
});

/* ============================================================
   MOTIVACIÓN: rachas (días y semanas), logros y premio semanal
   Criterio (psicologia-recuperacion): rachas que perdonan
   (1 comodín por semana), sin culpa y sin compensar.
   ============================================================ */
const lunesDe = (d) => iso(mondayOf(parse(d)));
let _objC = null;
const objC = () => { const n = Date.now(); if (!_objC || n - _objC.t > 1500) _objC = { t: n, o: objetivos() }; return _objC.o; };

/* ---------- ¿El día cuenta? (true = sí, false = falló, null = neutro/pendiente) ---------- */
function diaEntrenoOk(d) {
  const t = today();
  const hecho = Object.values(S.logs).some((l) => l.done && l.fecha === d) || S.caminatas.some((c) => c.fecha === d);
  if (hecho) return true;
  const wi = weekInfo(d);
  if (wi.antes) return null;
  const tocaba = !!sidDelDia(parse(d).getDay(), wi.week);
  if (!tocaba) return 'descanso'; // día de descanso: no corta la racha
  return d === t ? null : false; // hoy todavía está a tiempo
}
function diaComidaOk(d) {
  if (esDiaPremio(d)) return true;
  if (!diaCompleto(d)) return d === today() ? null : false;
  const o = objC(), t = totales(diaComidas(d));
  const mus = S.perfil.objetivo === 'musculo';
  const [lo, hi, pmin] = mus ? [0.9, 1.15, 0.9] : [0.8, 1.1, 0.8];
  const ok = t.k >= o.kcal * lo && t.k <= o.kcal * hi && t.pr >= o.prot * pmin;
  return ok ? true : d === today() ? null : false;
}

/* racha de días hacia atrás con 1 comodín por semana (lunes a domingo) */
function rachaDias(fn) {
  const t = today(), ini = S.perfil?.inicio || t;
  let n = 0, d = t;
  const comodines = {};
  for (let i = 0; i < 400; i++) {
    if (d < ini) break;
    const v = fn(d);
    if (v === true) n++;
    else if (v === false) {
      const w = lunesDe(d);
      if (comodines[w]) break;
      comodines[w] = true; // un día fallado por semana no corta la racha
    }
    d = iso(addDays(parse(d), -1));
  }
  return n;
}
function semanaComidaOk(w) {
  let buenos = 0;
  const lun = parse(dateOf(w, 1));
  for (let i = 0; i < 7; i++) if (diaComidaOk(iso(addDays(lun, i))) === true) buenos++;
  return buenos >= 5;
}
function rachaSemanasComida() {
  const wi = weekInfo(today());
  if (wi.antes) return 0;
  let n = 0;
  for (let w = wi.week; w >= 1; w--) {
    if (semanaComidaOk(w)) n++;
    else if (w < wi.week) break; // la semana actual aún está en curso
  }
  return n;
}
function rachas() {
  const r = { entreno: rachaDias(diaEntrenoOk), comida: rachaDias(diaComidaOk), semanas: racha().actual, semanasCom: rachaSemanasComida() };
  // récords personales
  const m = (S.mejores = S.mejores || {});
  let cambio = false;
  for (const k of Object.keys(r)) if ((m[k] || 0) < r[k]) { m[k] = r[k]; cambio = true; }
  if (cambio) save();
  return r;
}

/* ---------- Logros ---------- */
const HITOS = { entreno: [3, 7, 14, 21, 30, 60, 100], comida: [3, 7, 14, 21, 30, 60, 100], semanas: [2, 4, 8, 12, 26, 52], semanasCom: [2, 4, 8, 12, 26, 52] };
const NOM_RACHA = {
  entreno: ['🔥', 'días seguidos moviéndote', 'entrenando o caminando'],
  comida: ['🥗', 'días seguidos comiendo bien', 'cerca de tu meta y con proteína'],
  semanas: ['📅', 'semanas activas seguidas', 'todas tus sesiones menos una'],
  semanasCom: ['🍽️', 'semanas de buena alimentación', '5 o más días buenos'],
};
function logroNuevo(r) {
  const L = (S.logros = S.logros || {});
  for (const k of Object.keys(HITOS)) {
    const h = HITOS[k].filter((x) => x <= r[k]).pop();
    if (h && !L[`${k}${h}`]) return { k, h, id: `${k}${h}` };
  }
  return null;
}
const proximoHito = (k, v) => HITOS[k].find((x) => x > v);

function rachasHTML(r) {
  const nuevo = logroNuevo(r);
  const tile = (k) => {
    const [ico, nom] = NOM_RACHA[k], v = r[k], prox = proximoHito(k, v), mej = S.mejores?.[k] || v;
    return `<div class="rt ${v ? 'on' : ''}"><span class="rt-i">${ico}</span><b>${v}</b><span class="small">${nom}</span>
      <span class="small muted">${prox ? `faltan ${prox - v} para 🏅 ${prox}` : '¡leyenda!'}${mej > v ? ` · récord ${mej}` : ''}</span></div>`;
  };
  return `${nuevo ? `<div class="card logro"><div class="logro-i">🏅</div><div class="grow"><b>¡Nuevo logro!</b><p>${nuevo.h} ${NOM_RACHA[nuevo.k][1]}. ${frasesLogro[nuevo.h % frasesLogro.length]}</p></div>
      <button class="btn small-btn" data-act="logrook" data-id="${nuevo.id}">¡Vamos! 💪</button></div>` : ''}
    <div class="card"><h3>Tus rachas</h3><div class="rachas">${Object.keys(NOM_RACHA).map(tile).join('')}</div>
      <p class="small muted">Tienes 1 comodín por semana: un día fallado no corta tu racha. Y si se corta, no pasa nada: lo que cuenta es lo que haces la mayoría de los días.</p></div>`;
}
const frasesLogro = ['La constancia le gana al talento.', 'Así se construyen los hábitos: un día a la vez.', 'Tu yo del futuro te lo agradece.', 'Esto ya no es suerte, es disciplina.', 'Cada día suma, aunque no se note todavía.'];

/* ---------- Premio semanal ---------- */
function esDiaPremio(d) {
  const p = (S.premios || {})[lunesDe(d)];
  return !!(p && p.acepta && p.fecha === d && p.tipo === 'comida');
}
function premioEstado(d = today()) {
  const wi = weekInfo(d);
  if (wi.antes || !S.perfil) return null;
  const lun = lunesDe(d), o = objC(), PL = PLAN();
  const metaSes = PL.orden.length, minSes = Math.max(1, metaSes - 1);
  const sesiones = Object.values(S.logs).filter((l) => l.done && l.week === wi.week).length;
  let buenos = 0, completos = 0, margen = 0;
  for (let x = parse(lun); iso(x) <= d; x = addDays(x, 1)) {
    const dd = iso(x);
    if (diaComidaOk(dd) === true) buenos++;
    if (diaCompleto(dd) && dd < d) { completos++; margen += o.kcal - totales(diaComidas(dd)).k; }
  }
  const dow = (parse(d).getDay() + 6) % 7; // 0 = lunes
  const ganado = dow >= 3 && sesiones >= minSes && buenos >= 4;
  // con señales de alimentación desordenada (o menores de edad) el premio no es comida
  const riesgo = (alertasNutricion().alertas || []).some((a) => ['restriccion_atracon', 'compensacion', 'ingesta_muy_baja'].includes(a.id));
  const soloNoComida = riesgo || S.perfil.edad < 18;
  return { lun, sesiones, metaSes, minSes, buenos, completos, margen: Math.round(margen), ganado, dow, soloNoComida, guardado: (S.premios || {})[lun] };
}
const PREMIOS_COMIDA = {
  bajar: 'sal y disfruta de una pizza 🍕 (2-3 trozos), un completo o tu antojo favorito en una comida del fin de semana',
  musculo: 'date el gusto con tu comida favorita: una hamburguesa, un sushi o una pizza 🍔',
  tonificar: 'disfruta de una comida libre el fin de semana: pizza, sushi o lo que más te guste 🍣',
  cardio: 'disfruta de una comida libre el fin de semana: pizza, sushi o lo que más te guste 🍕',
  salud: 'disfruta de una comida libre el fin de semana con quien quieras 🍽️',
};
const PREMIOS_OTROS = ['una salida o panorama que te guste', 'ropa o zapatillas deportivas nuevas', 'una película o serie sin culpa', 'un masaje o una tarde de descanso total'];

function premioHTML(e) {
  if (!e) return '';
  const g = e.guardado, t = today(), oc = S.perfil.ocultarKcal;
  // premio aceptado
  if (g?.acepta) {
    if (g.fecha === t) return `<div class="card premio hoy"><div class="premio-i">🎉</div><div class="grow"><b>¡Hoy es tu premio!</b><p>${g.tipo === 'comida' ? 'Disfruta tu comida libre con calma y sin culpa. No hace falta compensar mañana: sigue normal en la próxima comida.' : `Disfruta: ${esc(g.txt)}. Te lo ganaste.`}</p></div></div>`;
    if (g.fecha > t) return `<div class="card premio"><div class="premio-i">🏆</div><div class="grow"><b>Premio reservado para el ${fmt(g.fecha, true)}</b><p class="small">${g.tipo === 'comida' ? 'Tu comida libre te espera. Mantén el ritmo hasta entonces.' : esc(g.txt)}</p></div></div>`;
    return '';
  }
  if (g?.no) return '';
  const metaB = 4;
  if (!e.ganado) {
    // progreso hacia el premio de la semana
    const fs = Math.min(1, e.sesiones / e.minSes), fb = Math.min(1, e.buenos / metaB);
    return `<div class="card premio prog"><div class="grow"><b>🏆 Premio de la semana</b>
      <p class="small">Complétalo antes del fin de semana: <b>${e.minSes} sesiones</b> y <b>${metaB} días de buena comida</b>.</p>
      <div class="pm-row"><span class="small">Sesiones ${Math.min(e.sesiones, e.minSes)}/${e.minSes}</span><div class="pbar thin"><i style="width:${fs * 100}%"></i></div></div>
      <div class="pm-row"><span class="small">Buena comida ${Math.min(e.buenos, metaB)}/${metaB}</span><div class="pbar thin"><i style="width:${fb * 100}%" class="prot"></i></div></div>
      ${e.sesiones >= e.minSes && e.buenos >= metaB ? '<p class="small good">¡Listo! El jueves se desbloquea tu premio.</p>' : e.dow >= 4 && (e.sesiones < e.minSes - 1 || e.buenos < metaB - 2) ? '<p class="small muted">Esta semana no alcanza, y está bien: el lunes parte una nueva oportunidad.</p>' : ''}</div></div>`;
  }
  // ganado: ofrecer premio (sábado próximo, o hoy si ya es fin de semana)
  const sab = iso(addDays(parse(e.lun), 5)), dom = iso(addDays(parse(e.lun), 6));
  const dias = [sab, dom].filter((x) => x >= t);
  const comida = !e.soloNoComida && !g?.otro;
  const txtCom = PREMIOS_COMIDA[S.perfil.objetivo] || PREMIOS_COMIDA.salud;
  const margen = !oc && comida && e.margen > 150 ? ` Además llevas ~${Math.round(e.margen / 50) * 50} kcal bajo tu meta esta semana: tu gusto cabe sin salirte del plan.` : '';
  const otro = PREMIOS_OTROS[(weekInfo(t).week + (g?.otroIdx || 0)) % PREMIOS_OTROS.length];
  return `<div class="card premio ganado"><div class="premio-i">🏆</div><div class="grow"><b>¡Esta semana vas increíble!</b>
    <p>Llevas ${e.sesiones} de ${e.metaSes} sesiones y ${e.buenos} días de buena comida. Te ganaste un premio: ${comida ? `este fin de semana ${txtCom}.${margen} Disfrútalo sin culpa y vuelve al plan en la comida siguiente.` : `date ${otro} este fin de semana. 🎁`}</p>
    ${e.soloNoComida && !g?.otro ? '<p class="small muted">Esta semana te proponemos un premio que no sea comida: ayuda a que la comida no sea un "premio o castigo".</p>' : ''}
    <div class="btns">${dias.map((x) => `<button class="btn small-btn primary" data-act="premiook" data-f="${x}" data-tipo="${comida ? 'comida' : 'otro'}" data-txt="${esc(comida ? txtCom : otro)}">${x === t ? '¡Hoy!' : `El ${DIAS[parse(x).getDay()].toLowerCase()}`}</button>`).join('')}
      ${comida ? '<button class="btn small-btn ghost" data-act="premiootro">Prefiero otro premio</button>' : `<button class="btn small-btn ghost" data-act="premiootro">Otra idea</button>`}
      <button class="link small" data-act="premiono">Ahora no</button></div></div></div>`;
}

/* ============================================================
   Sesión en 2 tandas (v1.32-v1.34): dos modos
   - 'silencio' (muy temprano): mañana silenciosa + tarde con impacto y cardio.
   - 'eq' (equilibrada, v1.34): separa tren inferior y superior en tandas distintas,
     aleja el cardio de las piernas (menos interferencia fuerza-cardio) y usa el core
     para cuadrar los tiempos. Respeta el orden original (multiarticulares primero).
   - La mañana lleva solo ejercicios sin impacto ni golpes (la casa duerme),
     hasta los minutos que tengas; el resto, el impacto y el cardio van a la tarde.
   - Cada tanda tiene su calentamiento. Las series de la semana no cambian:
     dividir la sesión rinde prácticamente lo mismo que hacerla de una vez.
   ============================================================ */

// 2 = impacto o golpes (saltos, trote, swing, barra al suelo); 1 = algo de ruido (pasos, rack, barra de dominadas, máquinas)
const RUIDO = {
  saltar_cuerda: 2, saltos_tijera: 2, skipping: 2, burpees: 2, trotadora: 2, swing: 2, swing_una_mano: 2, thruster: 2,
  peso_muerto: 2, marcha_lugar: 2, remo_ergometro: 2,
  escaladores: 1, boxeo_sombra: 1, paseo_granjero: 1, paseo_maleta: 1, paseo_arriba: 1, subida_cajon: 1, zancada_frontal: 1,
  peso_muerto_rumano: 1, remo_barra: 1, sentadilla_barra: 1, sentadilla_frontal: 1, press_banca: 1, press_inclinado_barra: 1,
  press_militar_barra: 1, buenos_dias: 1, peso_muerto_sumo: 1, remo_t: 1, curl_barra: 1, encogimientos: 1,
  dominadas: 1, dominadas_asistidas: 1, dominadas_negativas: 1, dominadas_supinas: 1, colgarse_barra: 1, elevacion_rodillas_colgado: 1,
  eliptica: 1, caminata_lateral_banda: 1,
};
const ruidoDe = (id) => RUIDO[id] ?? 0;
const CALENT_SILENCIOSO = ['2 min de marcha suave en el lugar, apoyando sin golpear (o caminar por la casa)', '10 círculos de brazos adelante y atrás', '10 bisagras de cadera sin peso', '10 puentes de glúteo', '8 sentadillas lentas sin peso'];

const tandasCfg = () => ({ on: false, min: 20, modo: 'silencio', ...((S.ajustes || {}).tandas || {}) });
function tandasActivas(lg) { return lg?.tandas != null ? !!lg.tandas : tandasCfg().on; }
const minManana = (lg) => lg?.tandaMin || tandasCfg().min;
const modoTandas = (lg) => lg?.tandaModo || tandasCfg().modo || 'silencio';
const REG_NOM = { inf: 'Piernas y glúteos', sup: 'Tren superior', core: 'Core', circ: 'Circuito', mix: 'Superserie', cardio: 'Cardio' };
function regionEj(id) {
  const g = GRUPO_DE_PATRON[PATRON[id]];
  return g === 'Piernas' || g === 'Glúteos e isquios' ? 'inf' : !g || g === 'Core' ? 'core' : 'sup';
}
function regionGrupo(g) {
  if (g[0].k === 'cardio') return 'cardio';
  if (g[0].k === 'circ') return 'circ';
  const r = [...new Set(g.map((x) => regionEj(x.id)))];
  return r.length === 1 ? r[0] : 'mix';
}

// agrupa: superseries juntas y cada circuito completo (encabezado + ejercicios)
function gruposSesion(items, partirCirc = true) {
  const g = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.k === 'warm') continue;
    if (it.k === 'circ') {
      const ejs = [];
      while (items[i + 1]?.circ) ejs.push(items[++i]);
      // circuito mixto: los silenciosos forman su propio mini circuito (si son 2 o más)
      const q = ejs.filter((x) => ruidoDe(x.id) === 0), r = ejs.filter((x) => ruidoDe(x.id) > 0);
      if (partirCirc && q.length >= 2 && r.length) { g.push([{ ...it, nEj: q.length }, ...q]); g.push([{ ...it, nEj: r.length }, ...r]); } else g.push([it, ...ejs]);
      continue;
    }
    if (it.k === 'ex' && it.ss && items[i + 1]?.id === it.ss) { g.push([it, items[++i]]); continue; }
    g.push([it]);
  }
  return g;
}
// devuelve la lista reordenada con encabezados de tanda
function dividirTandas(items, minA, modo = 'silencio') {
  if (modo === 'eq') return dividirEquilibrado(items, minA);
  const grupos = gruposSesion(items);
  const warm = items.find((x) => x.k === 'warm');
  const A = [], B = [];
  let durA = 4; // calentamiento silencioso ~4 min
  for (const g of grupos) {
    const silencioso = g.every((x) => x.k === 'circ' || (x.k === 'ex' && ruidoDe(x.id) === 0));
    const d = segundosEstimados(g) / 60;
    if (silencioso && g[0].k !== 'cardio' && durA + d <= minA + 1) { A.push(...g); durA += d; } else B.push(...g);
  }
  const durB = duracionEstimada([...(warm ? [{ ...warm, corto: true }] : []), ...B]);
  const out = [{ k: 'tanda', n: 1, min: Math.round(durA), vacia: !A.length }];
  if (A.length) out.push({ k: 'warmq' }, ...A, { k: 'tandafin' });
  out.push({ k: 'tanda', n: 2, min: durB, vacia: !B.length });
  if (B.length) out.push(...(warm ? [{ ...warm, corto: true }] : []), ...B);
  return out;
}

// Modo equilibrado: prueba todas las formas de repartir los bloques (superseries y circuitos van juntos)
// y elige la de mejor puntaje:
//  - la mañana debe caber en tus minutos (pasarse penaliza fuerte; quedar corta, poco)
//  - no mezclar piernas y tren superior en la misma tanda
//  - el cardio lejos de las piernas (los intervalos, más aún): menos interferencia fuerza-cardio
function dividirEquilibrado(items, minA) {
  const warm = items.find((x) => x.k === 'warm');
  const G = gruposSesion(items, false).map((g, i) => ({ g, i, reg: regionGrupo(g), d: segundosEstimados(g) / 60, int: g[0].k === 'cardio' && g[0].key === 'intervalos' }));
  const W = warm ? 6 : 0, n = G.length;
  const pesoT = (arr) => {
    const r = new Set(arr.map((x) => x.reg));
    let p = 0;
    if (r.has('inf') && r.has('sup')) p += 6;
    if (r.has('inf') && r.has('cardio')) p += arr.some((x) => x.int) ? 6 : 3;
    if (r.has('circ') && r.has('cardio')) p += 2;
    return p;
  };
  let best = null;
  const lim = n <= 14 ? 1 << n : 0;
  for (let mask = 0; mask < lim; mask++) {
    const A = [], B = [];
    for (let k = 0; k < n; k++) (mask & (1 << k) ? A : B).push(G[k]);
    if (!A.length) continue;
    const dA = W + A.reduce((a, x) => a + x.d, 0);
    const nota = Math.max(0, dA - (minA + 1)) * 4 + Math.max(0, minA - dA) * 0.5 + pesoT(A) + pesoT(B);
    if (!best || nota < best.nota - 1e-9) best = { A, B, dA, nota };
  }
  if (!best) { // sesión enorme (no debería pasar): corte en orden
    const A = [], B = []; let dA = W;
    for (const x of G) { if (dA + x.d <= minA + 1) { A.push(x); dA += x.d; } else B.push(x); }
    best = { A, B, dA };
  }
  const etq = (arr) => [...new Set(arr.map((x) => REG_NOM[x.reg]))].join(' · ');
  const bA = best.A, bB = best.B;
  const durB = duracionEstimada([...(warm ? [warm] : []), ...bB.flatMap((x) => x.g)]);
  const out = [{ k: 'tanda', n: 1, modo: 'eq', etq: etq(bA), min: Math.round(best.dA), vacia: !bA.length }];
  if (bA.length) out.push({ k: 'warmq', modo: 'eq' }, ...bA.flatMap((x) => x.g), { k: 'tandafin' });
  out.push({ k: 'tanda', n: 2, modo: 'eq', etq: etq(bB), min: durB, vacia: !bB.length });
  if (bB.length) out.push(...(warm ? [{ ...warm, corto: false }] : []), ...bB.flatMap((x) => x.g));
  return out;
}

function tandasCtrlHTML(lg, durEst) {
  if (lg?.done) return '';
  if (!tandasActivas(lg)) {
    return `<div class="hint tandas-cta">🌓 ¿Sin tiempo para todo de una vez? <button class="link" data-act="tandas">Dividir en 2 tandas</button>: mañana y tarde, en modo silencioso (muy temprano) o equilibrado (mejor reparto de la carga).</div>`;
  }
  const m = minManana(lg), md = modoTandas(lg);
  return `<div class="card tandas-cfg"><b>🌓 Sesión en 2 tandas</b>
    <div class="seg mt"><button class="${md === 'silencio' ? 'on' : ''}" data-act="tandamodo" data-v="silencio">🤫 Silenciosa</button><button class="${md === 'eq' ? 'on' : ''}" data-act="tandamodo" data-v="eq">⚖️ Equilibrada</button></div>
    <p class="small muted">${md === 'eq'
      ? 'Equilibrada: separa piernas y tren superior en tandas distintas y aleja el cardio de las piernas, para llegar fresco a cada bloque. Ideal si no importa el ruido.'
      : 'Silenciosa: para muy temprano. En la mañana solo ejercicios sin saltos ni golpes; el impacto, la barra y el cardio van a la tarde.'}</p>
    <p class="small muted">¿Cuántos minutos tienes en la mañana? (la sesión completa dura ~${durEst} min)</p>
    <div class="chips">${[10, 15, 20, 25, 30, 40].map((x) => `<button class="tab ${x === m ? 'on' : ''}" data-act="tandamin" data-v="${x}">${x} min</button>`).join('')}</div>
    <label class="chkl small"><input type="checkbox" data-act-change="tandasiempre" ${tandasCfg().on ? 'checked' : ''}> Dividir siempre mis sesiones así</label>
    <button class="link small" data-act="tandas">Volver a una sola tanda</button></div>`;
}

function tandaItemHTML(it, lg) {
  if (it.k === 'tanda') {
    const [ico, tit, sub] = it.modo === 'eq'
      ? [it.n === 1 ? '☀️' : '🌙', `Tanda ${it.n} · ${it.n === 1 ? 'Mañana' : 'Tarde'}`, it.etq]
      : it.n === 1
        ? ['☀️', 'Tanda 1 · Mañana', 'Silenciosa: sin saltos, sin golpes ni barra al suelo. Baja las pesas con suavidad.']
        : ['🌙', 'Tanda 2 · Tarde', 'Aquí van el impacto, la barra y el cardio.'];
    return `<div class="tanda-h ${it.n === 1 && lg?.tandaA ? 'lista' : ''}"><span class="tanda-ico">${ico}</span><div class="grow"><b>${tit}</b><span class="small muted">${it.vacia
      ? (it.n === 1 ? (it.modo === 'eq' ? 'No cabe nada en ese tiempo: todo va en la tarde.' : 'Hoy no hay ejercicios silenciosos que quepan en ese tiempo: todo va en la tarde.') : 'Todo quedó en la mañana.')
      : `≈ ${it.min} min · ${sub}`}</span></div>${it.n === 1 && lg?.tandaA ? '<span class="tanda-ok">✓</span>' : ''}</div>`;
  }
  if (it.k === 'warmq' && it.modo === 'eq') {
    const list = CALENTAMIENTO.normal.map((x) => x.replace('cardio', PLAN().cardio.label.toLowerCase()));
    return `<div class="card blk"><h3>🔥 Calentamiento</h3><ul class="ticks">${list.map((x) => `<li>${x}</li>`).join('')}</ul><p class="small muted">Cada tanda lleva su calentamiento completo: entre una y otra pasan horas y el cuerpo se enfría.</p></div>`;
  }
  if (it.k === 'warmq') {
    return `<div class="card blk"><h3>🔥 Calentamiento silencioso</h3><ul class="ticks">${CALENT_SILENCIOSO.map((x) => `<li>${x}</li>`).join('')}</ul><p class="small muted">Sin saltos ni trote: igual sube la temperatura y prepara las articulaciones.</p></div>`;
  }
  if (it.k === 'tandafin') {
    return extraCtaHTML(lg, 1) + (lg?.tandaA
      ? '<p class="small center muted">✓ Tanda de la mañana lista. Te esperamos en la tarde.</p>'
      : '<button class="btn wide" data-act="tandaok">✓ Terminé la tanda de la mañana</button>');
  }
  return '';
}

Object.assign(actions, {
  tandas() {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.tandas = !tandasActivas(lg);
    save(true); rerender();
  },
  tandamin(btn) {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.tandaMin = +btn.dataset.v;
    if (tandasCfg().on) S.ajustes = { ...(S.ajustes || {}), tandas: { ...tandasCfg(), min: lg.tandaMin } };
    save(true); rerender();
  },
  tandamodo(btn) {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.tandaModo = btn.dataset.v;
    if (tandasCfg().on) S.ajustes = { ...(S.ajustes || {}), tandas: { ...tandasCfg(), modo: lg.tandaModo } };
    save(true); rerender();
  },
  tandaok() {
    const lg = getLog(ctx.date, ctx.sid, true);
    lg.tandaA = new Date().toISOString();
    save(true); toast('☀️ ¡Tanda de la mañana lista! En la tarde completas el resto.'); rerender();
  },
});

/* ============================================================
   Comida más rápida de anotar (v1.30)
   - Comidas favoritas: guarda una comida y agrégala con un toque
   - Copiar el día completo de ayer
   - Planificador simple: sugiere un día con alimentos chilenos comunes
     que se acerca a tu meta de calorías y proteína.
   Seguridad: para menores, con avisos de alimentación desordenada o con
   las calorías ocultas, el plan se muestra sin números (guía de plato).
   Las cantidades son orientativas; no reemplaza a un nutricionista.
   ============================================================ */

/* ---- Favoritas ---- */
const combos = () => (S.combos = S.combos || []);
const nuevoId = (i = 0) => Date.now() + '' + i + Math.floor(Math.random() * 1000);
function combosChipsHTML(m, its, oc) {
  if (its.length) return `<button class="btn ghost small-btn" data-act="combosave" data-m="${m}">⭐ Guardar como favorita</button>`;
  const cs = combos().filter((c) => c.m === m);
  return cs.map((c) => `<button class="btn ghost small-btn fav" data-act="comboadd" data-id="${c.id}" data-m="${m}">⭐ ${esc(c.n)}${oc ? '' : ` · ${Math.round(totales(c.items).k)} kcal`}</button>`).join('');
}
function combosAdminHTML() {
  const cs = combos(), fa = favAlim();
  const favH = fa.length ? `<div class="card"><h3>⭐ Alimentos favoritos</h3><p class="small muted">Salen primero al buscar y el planificador «¿Qué como hoy?» los usa para armar tu día.</p>
    ${fa.map((a) => `<div class="fi"><div class="grow"><b>${esc(a.n)}</b><span class="small muted">${esc(a.p)} · ${a.k} kcal · ${a.pr} g prot.</span></div><button class="link danger" data-act="favquitar" data-n="${esc(a.n)}" aria-label="Quitar">✕</button></div>`).join('')}</div>` : '';
  const comH = cs.length ? `<div class="card"><h3>⭐ Comidas favoritas</h3><p class="small muted">Aparecen en Comida cuando esa comida del día está vacía (un toque y queda anotada) y el planificador las usa.</p>
    ${cs.map((c) => `<div class="fi"><div class="grow"><b>${esc(c.n)}</b><span class="small muted">${(COMIDAS_DIA.find((x) => x[0] === c.m) || [, ''])[1]} · ${c.items.map((i) => esc(i.f.n)).join(', ')} · ${Math.round(totales(c.items).k)} kcal</span></div><button class="link danger" data-act="combodel" data-id="${c.id}" aria-label="Eliminar">✕</button></div>`).join('')}</div>` : '';
  return favH + comH;
}
function copiarDiaHTML(d, items, oc) {
  const ayer = iso(addDays(parse(d), -1)), prev = diaComidas(ayer);
  if (items.length || !prev.length) return '';
  return `<button class="btn wide" data-act="copiadia">↺ Copiar todo lo de ayer (${prev.length} ${prev.length === 1 ? 'alimento' : 'alimentos'}${oc ? '' : ` · ${Math.round(totales(prev).k).toLocaleString('es-CL')} kcal`})</button>`;
}

/* ---- Planificador ---- */
// [nombre exacto en foods.js, porciones, rol]  rol: p = proteína (se escala por proteína),
// c = carbohidrato (se escala por calorías), x = fijo
const MENU_OPC = {
  desayuno: [
    [['Pan integral de molde', 2, 'c'], ['Huevo cocido o revuelto', 2, 'p'], ['Tomate', 1, 'x'], ['Café con leche descremada', 1, 'x']],
    [['Avena cocida con leche descremada', 1, 'c'], ['Plátano', 1, 'x'], ['Yogurt proteico', 1, 'p']],
    [['Marraqueta integral', 1, 'c'], ['Quesillo', 1, 'p'], ['Jamón de pavo', 1, 'p'], ['Palta', 1, 'x'], ['Café o té sin azúcar', 1, 'x']],
  ],
  colacion: [
    [['Yogurt proteico', 1, 'p'], ['Manzana', 1, 'x']],
    [['Yogurt griego sin grasa', 1, 'p'], ['Naranja', 1, 'x']],
    [['Plátano', 1, 'x'], ['Almendras', 1, 'x'], ['Leche descremada', 1, 'p']],
  ],
  almuerzo: [
    [['Pechuga de pollo a la plancha', 1.5, 'p'], ['Arroz blanco cocido', 1, 'c'], ['Ensalada chilena', 1, 'x'], ['Aceite', 1, 'x']],
    [['Merluza / reineta al horno', 1, 'p'], ['Papa cocida', 1.5, 'c'], ['Ensalada de lechuga y tomate', 1, 'x'], ['Aceite', 1, 'x']],
    [['Lentejas guisadas', 1, 'c'], ['Huevo cocido o revuelto', 1, 'p'], ['Ensalada chilena', 1, 'x']],
    [['Carne molida 5% grasa', 1.5, 'p'], ['Fideos / tallarines cocidos', 1, 'c'], ['Ensalada mixta (lechuga, tomate, zanahoria, choclo)', 1, 'x']],
    [['Cazuela de pollo', 1, 'x'], ['Pechuga de pollo a la plancha', 0.5, 'p'], ['Ensalada de lechuga y tomate', 1, 'x']],
  ],
  once: [
    [['Pan integral de molde', 2, 'c'], ['Atún al agua', 0.5, 'p'], ['Palta', 1, 'x'], ['Café o té sin azúcar', 1, 'x']],
    [['Marraqueta integral', 1, 'c'], ['Quesillo', 1, 'p'], ['Huevo cocido o revuelto', 1, 'p'], ['Tomate', 1, 'x'], ['Café o té sin azúcar', 1, 'x']],
    [['Pan integral de molde', 2, 'c'], ['Pechuga de pavo asada', 0.5, 'p'], ['Tomate', 1, 'x'], ['Leche descremada', 1, 'x']],
  ],
  extra: [
    [['Yogurt proteico', 1, 'p'], ['Plátano', 1, 'c']],
    [['Leche descremada', 1, 'p'], ['Avena', 1, 'c']],
  ],
};
const alimPorNombre = (n) => ALIMENTOS.find((a) => a.n === n);
// porciones máximas realistas por alimento (para que la escala no proponga 5 huevos o 4 panes)
const MENU_MAX = {
  'Huevo cocido o revuelto': 3, 'Quesillo': 2, 'Jamón de pavo': 2, 'Yogurt proteico': 1, 'Yogurt griego sin grasa': 1, 'Leche descremada': 1.5,
  'Atún al agua': 1, 'Pechuga de pavo asada': 1.5, 'Pechuga de pollo a la plancha': 2.5, 'Merluza / reineta al horno': 2, 'Carne molida 5% grasa': 2,
  'Pan integral de molde': 3, 'Marraqueta integral': 1.5, 'Avena cocida con leche descremada': 1.5, 'Avena': 1.5, 'Arroz blanco cocido': 2,
  'Papa cocida': 3, 'Fideos / tallarines cocidos': 2, 'Lentejas guisadas': 1.5, 'Plátano': 1,
};
// lo que viene por unidad (yogur, huevo, fruta) va entero; carnes, pan, arroz y legumbres se pueden partir (se muestran en gramos)
const partible = (f) => RX_PAN.test(f.n) || (['Carnes y huevos', 'Pan y cereales', 'Legumbres'].includes(f.cat) && !/huevo/i.test(f.n)) || /^\d+\s*(g|ml)/.test(f.p);
const tope = (x, q) => Math.min(MENU_MAX[x.f.n] || (partible(x.f) || x.f.cat === 'Frutas' ? 2 : 1), partible(x.f) ? red(q) : Math.max(1, Math.round(q)));
let planSeed = 0, planDirty = false;

/* ---- Alimentos favoritos (individuales) ---- */
const favAlim = () => (S.favAlim = S.favAlim || []);
const esFav = (f) => !!f && favAlim().some((x) => x.n === f.n);
function favToggle(f) {
  if (esFav(f)) S.favAlim = favAlim().filter((x) => x.n !== f.n);
  else { const { id, n, p, k, pr, c, g, gp, u, cat } = f; favAlim().push({ id, n, p, k, pr, c, g, gp: gp || null, u: u || 'g', cat: cat || '' }); }
  save(true);
}
const usaFavs = () => (S.ajustes || {}).planFav !== false;
// ¿para qué sirve este favorito en esta comida? (así no aparece salmón en el desayuno)
const RX_DESAYUNO_P = /huevo|jam[oó]n|pavo|at[uú]n|queso|quesillo|yogur|leche|kefir|cottage|ricotta|prote/i;
const RX_PAN = /pan|marraqueta|hallulla|avena|tostada|galleta|cereal|granola|tortilla|pita|wrap|sopaipilla/i;
function rolFav(f) {
  const k = f.k || 1;
  if ((f.pr * 4) / k >= 0.3) return 'p';
  if (((f.c || 0) * 4) / k >= 0.5 && f.cat !== 'Frutas') return 'c';
  if (f.cat === 'Frutas') return 'fruta';
  return null;
}
function favSirve(f, m, rol) {
  const ligera = m !== 'almuerzo';
  if (rol === 'p') return ligera ? RX_DESAYUNO_P.test(f.n) || f.cat === 'Lácteos' : ['Carnes y huevos', 'Legumbres'].includes(f.cat);
  if (rol === 'c') return ligera ? RX_PAN.test(f.n) : !RX_PAN.test(f.n) && ['Pan y cereales', 'Legumbres'].includes(f.cat);
  return rol === 'fruta';
}
// usoDia: cuántas veces va cada favorito en el día (máx. 2, para que haya variedad)
function conFavoritos(m, items, seed, usoDia) {
  const favs = favAlim();
  if (!favs.length) return items;
  const usados = new Set(items.map((x) => x.f.n));
  return items.map((x, j) => {
    const rol = x.rol === 'x' && x.f.cat === 'Frutas' ? 'fruta' : x.rol;
    // misma energía aproximada que el alimento que reemplaza; sin "medio yogur" (el pan sí se puede partir)
    const qDe = (f) => tope({ f }, Math.min(MENU_MAX[f.n] || 1.5, (x.f.k * x.q) / (f.k || 1)));
    const cand = favs.filter((f) => rolFav(f) === rol && favSirve(f, m, rol) && !usados.has(f.n) && (usoDia[f.n] || 0) < 2 && (qDe(f) >= 1 || partible(f)));
    if (!cand.length) return x;
    // primero los menos usados hoy, rotando con la semilla
    const min = Math.min(...cand.map((f) => usoDia[f.n] || 0));
    const pool = cand.filter((f) => (usoDia[f.n] || 0) === min);
    const f = pool[(seed + j) % pool.length];
    usados.add(f.n); usoDia[f.n] = (usoDia[f.n] || 0) + 1;
    return { f, q: qDe(f), rol: x.rol, fav: true };
  });
}
const red = (q) => Math.max(0.5, Math.round(q * 2) / 2);

function armarDia(seed = 0) {
  const o = objetivos();
  const fav = usaFavs(), usoDia = {};
  const meals = ['desayuno', 'colacion', 'almuerzo', 'once'].map((m, i) => {
    // 1º tus comidas favoritas de esa comida (tal cual las comes); si no, un menú base con tus alimentos favoritos
    const cs = fav ? combos().filter((c) => c.m === m) : [];
    const opc = MENU_OPC[m], n = cs.length + opc.length;
    const k = cs.length ? seed % n : (seed + i * 2) % opc.length;
    if (k < cs.length) return { m, combo: cs[k].n, items: cs[k].items.map((x) => ({ f: x.f, q: x.q, rol: 'x', fav: true })) };
    const base = opc[cs.length ? k - cs.length : k].map(([nn, q, rol]) => ({ f: alimPorNombre(nn), q, rol })).filter((x) => x.f);
    return { m, items: fav ? conFavoritos(m, base, seed + i, usoDia) : base };
  });
  const all = () => meals.flatMap((x) => x.items);
  const tot = () => totales(all());
  // 1) proteína: escala los alimentos proteicos
  const pp = all().filter((x) => x.rol === 'p').reduce((a, x) => a + x.f.pr * x.q, 0);
  const po = tot().pr - pp;
  const fp = Math.min(2.5, Math.max(0.6, (o.prot - po) / (pp || 1)));
  for (const x of all()) if (x.rol === 'p') x.q = tope(x, x.q * fp);
  // 2) calorías: escala los carbohidratos
  const kc = all().filter((x) => x.rol === 'c').reduce((a, x) => a + x.f.k * x.q, 0);
  const ko = tot().k - kc;
  const fc = Math.min(2.5, Math.max(0.5, (o.kcal - ko) / (kc || 1)));
  for (const x of all()) if (x.rol === 'c') x.q = tope(x, x.q * fc);
  // 3) si aún falta, se suman colaciones (sin pasarse de la meta)
  const EXTRAS = [
    [['Plátano', 1], ['Almendras', 1]], [['Yogurt proteico', 1], ['Avena', 1]], [['Pan integral de molde', 2], ['Palta', 1]],
    [['Leche descremada', 1], ['Manzana', 1]], [['Nueces', 1], ['Naranja', 1]],
  ];
  let extra = null;
  const sumar_ = (its) => { if (!extra) { extra = { m: 'extra', items: [] }; meals.push(extra); } extra.items.push(...its); };
  // proteína atrasada: primero una colación proteica
  if (o.prot - tot().pr > 20) {
    const its = [['Yogurt proteico', 1], ['Atún al agua', o.prot - tot().pr > 40 ? 1 : 0.5]].map(([n, q]) => ({ f: alimPorNombre(n), q, rol: 'x' })).filter((x) => x.f);
    if (totales(its).k <= o.kcal - tot().k + 150) sumar_(its);
  }
  for (let k = 0; k < EXTRAS.length && o.kcal - tot().k > 150; k++) {
    const its = EXTRAS[(seed + k) % EXTRAS.length].map(([n, q]) => ({ f: alimPorNombre(n), q, rol: 'x' })).filter((x) => x.f);
    if (totales(its).k > o.kcal - tot().k + 150) continue;
    sumar_(its);
  }
  return { meals, tot: tot(), o };
}
const cantTxt = (x) => {
  // "100 g" → 150 g; porciones fraccionadas con peso conocido → en gramos/ml; si no, "2 × 1 unidad"
  const m = String(x.f.p).match(/^(\d+)\s*(g|ml)\b/) || (x.q % 1 ? String(x.f.p).match(/\((\d+)\s*(g|ml)\)/) : null);
  if (m) return `${Math.round(+m[1] * x.q)} ${m[2]}`;
  return x.q === 1 ? x.f.p : `${fmtN(x.q, 1)} × ${x.f.p}`;
};

function planHTML() {
  const { meals, tot, o } = armarDia(planSeed);
  const sinNum = S.perfil.edad < 18 || riesgoAlim() || !!S.perfil.ocultarKcal;
  const nom = (m) => COMIDAS_DIA.find((x) => x[0] === m);
  const dif = Math.round(tot.k - o.kcal);
  return `<p class="small muted">${sinNum
    ? 'Una guía de día equilibrado con alimentos de acá: proteína en cada comida, verduras, fruta y un carbohidrato. Come hasta quedar satisfecho/a y ajusta según tu hambre.'
    : `Un día de ejemplo que se acerca a tu meta: <b>${Math.round(tot.k).toLocaleString('es-CL')} kcal</b> (${dif >= 0 ? '+' : '−'}${Math.abs(dif)} de ${o.kcal.toLocaleString('es-CL')}) y <b>${Math.round(tot.pr)} g de proteína</b> (meta ${o.prot} g). Cantidades aproximadas.`}</p>
    ${favResumenHTML()}
    ${meals.map(({ m, items, combo }) => `<div class="plan-m"><div class="mh"><b>${nom(m)[2]} ${nom(m)[1]}${combo ? ` <span class="fav-tag">⭐ ${esc(combo)}</span>` : ''}</b>${sinNum ? '' : `<span class="small muted">${Math.round(totales(items).k)} kcal · ${Math.round(totales(items).pr)} g prot.</span>`}</div>
      <ul class="plan-l">${items.map((x) => `<li>${x.fav && !combo ? '⭐ ' : ''}${esc(x.f.n)} <span class="muted">· ${esc(cantTxt(x))}</span></li>`).join('')}</ul>
      <button class="btn small-btn" data-act="plananota" data-m="${m}">✓ Lo comí: anotar en ${nom(m)[1].toLowerCase()}</button></div>`).join('')}
    <div class="btns mt"><button class="btn primary" data-act="planotro">🔄 Otra opción</button></div>
    <p class="small muted">Es un ejemplo para inspirarte, no una dieta obligatoria. Cambia lo que quieras por alimentos parecidos. Si tienes una condición de salud, sigue lo que te indique tu nutricionista.</p>`;
}
function favResumenHTML() {
  const nf = favAlim().length, nc = combos().length;
  if (!nf && !nc) return '<p class="small fav-tip">⭐ <b>Tip:</b> marca tus alimentos favoritos con la estrella al anotarlos, o guarda tus comidas favoritas, y armo el día con lo que te gusta.</p>';
  return `<label class="chkl small"><input type="checkbox" data-act-change="planfav" ${usaFavs() ? 'checked' : ''}> Usar mis favoritos (${nf} ${nf === 1 ? 'alimento' : 'alimentos'}, ${nc} ${nc === 1 ? 'comida' : 'comidas'})</label>`;
}
function plannerCardHTML() {
  return `<button class="card row-link plan-cta" data-act="planabrir"><span>🧭</span><div class="grow"><b>¿Qué como hoy?</b><span class="small muted">Te armo un día con tus favoritos y comida chilena simple</span></div>›</button>`;
}

Object.assign(actions, {
  combosave(btn) {
    const m = btn.dataset.m, its = diaComidas(comidaDia).filter((x) => x.m === m);
    if (!its.length) return;
    const nomM = COMIDAS_DIA.find((x) => x[0] === m)[1];
    const n = prompt('Nombre para esta comida favorita', `${nomM}: ${its.map((x) => x.f.n).slice(0, 2).join(' + ')}`.slice(0, 50));
    if (n == null) return;
    combos().push({ id: 'c' + Date.now(), n: (n.trim() || nomM).slice(0, 50), m, items: its.map(({ q, gr, f }) => ({ q, ...(gr ? { gr } : {}), f })) });
    save(true); toast('⭐ Guardada en tus favoritas'); rerender();
  },
  comboadd(btn) {
    const c = combos().find((x) => x.id === btn.dataset.id);
    if (!c) return;
    S.comidas[comidaDia] = [...diaComidas(comidaDia), ...c.items.map((x, i) => ({ ...structuredClone(x), id: nuevoId(i), m: btn.dataset.m }))];
    save(true); toast(`⭐ ${c.n} anotada`); rerender();
  },
  combodel(btn) {
    if (!confirm('¿Eliminar esta comida favorita?')) return;
    S.combos = combos().filter((x) => x.id !== btn.dataset.id);
    save(true); rerender();
  },
  copiadia() {
    const prev = diaComidas(iso(addDays(parse(comidaDia), -1)));
    S.comidas[comidaDia] = [...diaComidas(comidaDia), ...prev.map((x, i) => ({ ...structuredClone(x), id: nuevoId(i) }))];
    save(true); toast('Día de ayer copiado: quita lo que no comiste'); rerender();
  },
  closemodal() { closeModal(); if (planDirty) { planDirty = false; rerender(); } },
  favtoggle() {
    if (!sheet.food) return;
    favToggle(sheet.food);
    toast(esFav(sheet.food) ? '⭐ Agregado a favoritos' : 'Quitado de favoritos');
    renderSheet();
  },
  favitem(btn) {
    const it = diaComidas(comidaDia).find((x) => x.id === btn.dataset.id);
    if (!it) return;
    favToggle(it.f);
    toast(esFav(it.f) ? `⭐ ${it.f.n} en favoritos` : 'Quitado de favoritos');
    rerender();
  },
  favres(btn) {
    const n = btn.dataset.n;
    const f = favAlim().find((x) => x.n === n) || recientes().find((x) => x.n === n) || todosAlimentos().find((x) => x.n === n);
    if (!f) return;
    favToggle(f);
    toast(esFav(f) ? `⭐ ${f.n} en favoritos` : 'Quitado de favoritos');
    const box = $('#fres'); if (box) box.innerHTML = resultadosHTML(sheet.q_);
  },
  favquitar(btn) { S.favAlim = favAlim().filter((x) => x.n !== btn.dataset.n); save(true); rerender(); },
  planabrir() { openModal('🧭 Un día de ejemplo', planHTML()); },
  planotro() { planSeed++; openModal('🧭 Un día de ejemplo', planHTML()); },
  plananota(btn) {
    const { meals } = armarDia(planSeed);
    const ml = meals.find((x) => x.m === btn.dataset.m);
    if (!ml) return;
    const nuevos = ml.items.map((x, i) => {
      const { id, n, p, k, pr, c, g, gp, u } = x.f;
      return { id: nuevoId(i), m: ml.m, q: x.q, f: { id, n, p, k, pr, c, g, gp: gp || null, u: u || 'g' } };
    });
    S.comidas[comidaDia] = [...diaComidas(comidaDia), ...nuevos];
    save(true); planDirty = true;
    btn.disabled = true; btn.textContent = '✓ Anotado';
    toast(`Anotado en ${COMIDAS_DIA.find((x) => x[0] === ml.m)[1]}`);
  },
});

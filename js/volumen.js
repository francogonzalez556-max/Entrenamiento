/* ============================================================
   VOLUMEN POR SUBGRUPO MUSCULAR (series directas e indirectas),
   RANGOS RECOMENDADOS, ENFOQUES Y AJUSTE AUTOMÁTICO DEL PLAN
   ============================================================ */

const SUBGRUPOS = [
  ['pecho', 'Pectoral', 'sup'], ['dorsal', 'Dorsal', 'sup'], ['media', 'Espalda media / trapecio', 'sup'],
  ['h_ant', 'Hombro anterior', 'sup'], ['h_lat', 'Hombro lateral', 'sup'], ['h_post', 'Hombro posterior', 'sup'],
  ['biceps', 'Bíceps', 'sup'], ['triceps', 'Tríceps', 'sup'], ['antebrazo', 'Antebrazo / agarre', 'sup'],
  ['cuad', 'Cuádriceps', 'inf'], ['isquios', 'Isquiotibiales', 'inf'], ['gluteos', 'Glúteos', 'inf'],
  ['aductores', 'Aductores', 'inf'], ['pantorrillas', 'Pantorrillas', 'inf'],
  ['abdomen', 'Abdomen', 'core'], ['lumbar', 'Zona lumbar', 'core'],
];
const NOMBRE_SG = Object.fromEntries(SUBGRUPOS.map(([k, n]) => [k, n]));
const SG_PEQUENOS = ['antebrazo', 'pantorrillas', 'h_post', 'aductores', 'lumbar'];

/* Músculos por patrón: d = directos (cuentan 1), i = indirectos (cuentan 0,5) */
const MUSC_PATRON = {
  pierna: { d: ['cuad', 'gluteos'], i: ['aductores'] }, rodilla: { d: ['cuad'], i: [] },
  bisagra: { d: ['isquios', 'gluteos'], i: ['lumbar', 'antebrazo'] }, gluteo: { d: ['gluteos'], i: [] },
  empujeH: { d: ['pecho'], i: ['triceps', 'h_ant'] }, empujeV: { d: ['h_ant'], i: ['triceps', 'h_lat'] },
  hombroL: { d: ['h_lat'], i: [] }, tironH: { d: ['media', 'dorsal'], i: ['biceps', 'h_post', 'antebrazo'] },
  tironV: { d: ['dorsal'], i: ['biceps', 'media'] }, lumbar: { d: ['lumbar'], i: ['gluteos'] },
  biceps: { d: ['biceps'], i: ['antebrazo'] }, triceps: { d: ['triceps'], i: [] },
  core: { d: ['abdomen'], i: [] }, pantorrilla: { d: ['pantorrillas'], i: [] },
  carga: { d: ['antebrazo', 'abdomen'], i: ['media'] },
};
/* Ajustes para ejercicios puntuales */
const MUSC_EJ = {
  prensa: { d: ['cuad'], i: ['gluteos'] }, extension_cuadriceps: { d: ['cuad'], i: [] }, sentadilla_hack: { d: ['cuad'], i: ['gluteos'] },
  sentadilla_sumo: { d: ['gluteos', 'aductores'], i: ['cuad'] }, zancada_lateral: { d: ['gluteos', 'aductores'], i: ['cuad'] },
  equilibrio_una_pierna: { d: [], i: [] }, extension_terminal_rodilla: { d: ['cuad'], i: [] },
  curl_femoral_maquina: { d: ['isquios'], i: [] }, puente_isquios: { d: ['isquios'], i: ['gluteos'] },
  swing: { d: ['gluteos'], i: ['isquios', 'lumbar', 'abdomen'] }, swing_una_mano: { d: ['gluteos'], i: ['isquios', 'lumbar', 'abdomen'] },
  buenos_dias: { d: ['isquios', 'lumbar'], i: ['gluteos'] }, peso_muerto: { d: ['isquios', 'gluteos'], i: ['lumbar', 'media', 'antebrazo'] },
  aduccion_maquina: { d: ['aductores'], i: [] },
  aperturas_mancuernas: { d: ['pecho'], i: ['h_ant'] }, cruce_poleas: { d: ['pecho'], i: ['h_ant'] },
  elevaciones_frontales: { d: ['h_ant'], i: [] }, pajaros: { d: ['h_post'], i: ['media'] }, face_pull: { d: ['h_post'], i: ['media'] },
  ytw: { d: ['h_post'], i: ['media'] }, rotacion_externa_banda: { d: ['h_post'], i: [] }, encogimientos: { d: ['media'], i: ['antebrazo'] },
  pullover: { d: ['dorsal'], i: ['pecho', 'triceps'] }, colgarse_barra: { d: ['antebrazo'], i: ['dorsal'] },
  fondos_banco: { d: ['triceps'], i: ['pecho', 'h_ant'] }, fondos_paralelas: { d: ['triceps', 'pecho'], i: ['h_ant'] }, flexiones_cerradas: { d: ['triceps'], i: ['pecho'] },
  curl_martillo: { d: ['biceps', 'antebrazo'], i: [] },
  bird_dog: { d: ['abdomen'], i: ['lumbar', 'gluteos'] }, plancha_lateral: { d: ['abdomen'], i: ['gluteos'] }, plancha_lateral_rodillas: { d: ['abdomen'], i: ['gluteos'] },
  elevacion_rodillas_colgado: { d: ['abdomen'], i: ['antebrazo'] }, rueda_abdominal: { d: ['abdomen'], i: ['dorsal'] },
  remo_trx: { d: ['media', 'dorsal'], i: ['biceps', 'abdomen'] }, remo_invertido: { d: ['media', 'dorsal'], i: ['biceps', 'abdomen'] },
  flexion_pica: { d: ['h_ant'], i: ['triceps'] },
};
function musculosDe(id) {
  return MUSC_EJ[id] || MUSC_PATRON[PATRON[id]] || { d: [], i: [] };
}

/* ---------- Enfoques ---------- */
const ENFOQUES = [
  ['superior', '👕', 'Tren superior', ['pecho', 'dorsal', 'media', 'h_ant', 'h_lat', 'h_post', 'biceps', 'triceps']],
  ['inferior', '🦵', 'Tren inferior', ['cuad', 'isquios', 'gluteos', 'pantorrillas']],
  ['pecho', '🏋️', 'Pecho', ['pecho']],
  ['espalda', '🧗', 'Espalda', ['dorsal', 'media', 'h_post']],
  ['hombros', '🤸', 'Hombros', ['h_ant', 'h_lat', 'h_post']],
  ['brazos', '💪', 'Brazos', ['biceps', 'triceps', 'antebrazo']],
  ['gluteos', '🍑', 'Glúteos', ['gluteos']],
  ['piernas', '🦿', 'Piernas', ['cuad', 'isquios', 'aductores', 'pantorrillas']],
  ['core', '🎯', 'Core / abdomen', ['abdomen', 'lumbar']],
  ['cardio', '🫀', 'Cardio / resistencia', []],
];
function enfoqueActivo(p = S.perfil, fecha = today()) {
  const e = p?.enfoques;
  if (!e || !e.areas?.length || fecha < e.desde || fecha > e.hasta) return null;
  return e;
}
function sgEnfocados(areas) {
  return new Set((areas || []).flatMap((a) => ENFOQUES.find((x) => x[0] === a)?.[3] || []));
}

/* ---------- Rango recomendado de series semanales (efectivas) ---------- */
function rangoSeries(p, sg, enf) {
  const base = { principiante: [8, 12], intermedio_bajo: [10, 14], intermedio: [12, 18], avanzado: [14, 22] }[p.nivel] || [10, 14];
  let f = p.objetivo === 'musculo' ? 1 : p.objetivo === 'tonificar' ? 0.75 : 0.6;
  const notas = [];
  if (SG_PEQUENOS.includes(sg)) f *= 0.6;
  if (sg === 'abdomen') f *= 0.8;
  if (enf && enf.has(sg)) { f *= 1.4; notas.push('enfoque'); }
  const L = p.limit || [];
  const lim = (cond, k, txt) => { if (cond) { f *= k; notas.push(txt); } };
  lim(L.includes('rodillas') && sg === 'cuad', 0.75, 'rodillas');
  lim(L.includes('espalda') && sg === 'lumbar', 0.5, 'espalda');
  lim(L.includes('espalda') && sg === 'isquios', 0.85, 'espalda');
  lim(L.includes('hombros') && (sg === 'h_ant' || sg === 'h_lat'), 0.7, 'hombros');
  lim(L.includes('hombros') && sg === 'pecho', 0.85, 'hombros');
  lim(L.includes('munecas') && sg === 'antebrazo', 0.7, 'muñecas');
  lim(p.edad >= 60, 0.8, 'edad');
  lim(p.edad < 16, 0.8, 'edad');
  const min = Math.max(2, Math.round(base[0] * f)), max = Math.max(min + 1, Math.round(base[1] * f));
  return { min, max, notas };
}

/* ---------- Conteo de series ---------- */
function volVacio() { return Object.fromEntries(SUBGRUPOS.map(([k]) => [k, { d: 0, i: 0 }])); }
function sumarSeries(v, id, n) {
  const m = musculosDe(id);
  for (const k of m.d) if (v[k]) v[k].d += n;
  for (const k of m.i) if (v[k]) v[k].i += n;
}
const efectivas = (x) => x.d + x.i * 0.5;
/* Plan de una semana tipo de la fase indicada (0, 1 o 2). Los circuitos cuentan la mitad. */
function volumenPlan(plan, fase = 0) {
  const v = volVacio();
  for (const sid of plan.orden) for (const b of plan.ses[sid].bloques) {
    if (b.tipo === 'ej' && b.rx[fase]) sumarSeries(v, b.id, b.rx[fase][0]);
    if (b.tipo === 'circuito') for (const e of b.ejercicios) if (e.fases.includes(fase + 1)) sumarSeries(v, e.id, b.rondas[fase] * 0.5);
  }
  return v;
}
/* Series completadas en una semana del programa */
function volumenHecho(logs, week) {
  const v = volVacio();
  for (const l of Object.values(logs)) {
    if (l.week !== week) continue;
    for (const [id, e] of Object.entries(l.ex || {})) sumarSeries(v, id, e.sets.filter((s) => s.ok).length);
  }
  return v;
}

/* ---------- Ajuste automático del plan a los rangos ---------- */
// Ejercicios accesorios para sumar volumen a un subgrupo (en orden de preferencia)
const ACC_SG = {
  pecho: ['press_banca_mancuernas', 'press_suelo', 'flexiones', 'flexiones_inclinadas', 'press_pecho_maquina', 'press_pecho_banda', 'aperturas_mancuernas'],
  dorsal: ['jalon', 'dominadas', 'jalon_banda', 'remo_polea', 'remo_mancuerna', 'pullover', 'remo_invertido', 'remo_trx'],
  media: ['remo_pecho_apoyado', 'remo_mancuerna', 'remo_polea', 'remo_banda_pie', 'remo_invertido', 'face_pull', 'encogimientos'],
  h_ant: ['press_militar', 'press_hombro_banda', 'elevaciones_frontales'],
  h_lat: ['elevaciones_laterales', 'elevacion_lateral_polea'],
  h_post: ['face_pull', 'pajaros', 'ytw', 'rotacion_externa_banda'],
  biceps: ['curl_biceps', 'curl_martillo', 'curl_banda', 'curl_polea', 'curl_barra'],
  triceps: ['extension_triceps_polea', 'extension_triceps', 'extension_triceps_banda', 'patada_triceps', 'fondos_banco', 'press_frances'],
  antebrazo: ['paseo_granjero', 'paseo_maleta', 'curl_martillo', 'colgarse_barra'],
  cuad: ['sentadilla_pared', 'sentadilla_goblet', 'sentadilla_cajon', 'extension_terminal_rodilla', 'sentadilla_espanola', 'prensa'],
  isquios: ['puente_isquios', 'curl_femoral_maquina', 'peso_muerto_una_pierna', 'peso_muerto_mancuernas'],
  gluteos: ['puente', 'hip_thrust_banco', 'puente_una_pierna', 'patada_gluteo', 'abduccion_cadera', 'almeja'],
  aductores: ['aduccion_maquina', 'sentadilla_sumo', 'zancada_lateral'],
  pantorrillas: ['elevacion_talones', 'talones_una_pierna', 'talones_sentado'],
  abdomen: ['dead_bug', 'plancha', 'pallof', 'crunch_bicicleta', 'plancha_lateral', 'rueda_abdominal'],
  lumbar: ['bird_dog', 'superman', 'hiperextension'],
};
const SG_EN_SESION_CARDIO = ['abdomen', 'lumbar', 'gluteos', 'pantorrillas'];
const PROTEGIDOS = ['rodilla', 'gluteo', 'core', 'lumbar', 'movilidad'];

function ajustarVolumen(plan, p, enfAreas) {
  const pl = structuredClone(plan);
  const enf = sgEnfocados(enfAreas);
  const eq = equipoDe(p);
  const maxEj = p.dur <= 30 ? 6 : p.dur >= 60 ? 10 : 8;
  const soloEnfoque = !p.autoVol; // sin ajuste automático: solo se refuerzan las zonas enfocadas
  const FASE = 1; // semana tipo de la fase 2 para decidir
  const ejsDe = (ses) => ses.bloques.filter((b) => b.tipo === 'ej');
  const esCardio = (ses) => ses.bloques.some((b) => b.tipo === 'cardio' && b.kind === 'z2') && ejsDe(ses).length <= 4;
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    for (const [sg] of SUBGRUPOS) {
      if (soloEnfoque && !enf.has(sg)) continue;
      const r = rangoSeries(p, sg, enf);
      const foco = enf.has(sg);
      const vol = volumenPlan(pl, FASE)[sg];
      let ef = efectivas(vol), dir = vol.d;
      // en las zonas enfocadas se exige trabajo DIRECTO (al menos 60% del mínimo)
      const minDir = foco ? Math.ceil(r.min * 0.6) : 0;
      const falta = () => ef < r.min || dir < minDir;
      // 1) faltan series: +1 serie a los ejercicios directos (máx. 5 series)
      if (falta()) {
        for (const sid of pl.orden) for (const b of ejsDe(pl.ses[sid])) {
          if (!falta()) break;
          if (!musculosDe(b.id).d.includes(sg) || b.aj) continue;
          if (b.rx.every((x) => !x || x[0] >= 5)) continue;
          b.rx = b.rx.map((x) => (x ? [Math.min(5, x[0] + 1), x[1], x[2]] : x));
          b.aj = '+1 serie';
          ef += 1; dir += 1;
        }
      }
      // 2) aún falta: agrega un accesorio en la sesión con espacio
      if (ef < r.min - 1 || dir < minDir) {
        const cand = (ACC_SG[sg] || []).filter((id) => META[id] && disponible(id, p, eq));
        const sesiones = pl.orden.map((sid) => pl.ses[sid])
          .filter((se) => ejsDe(se).length < maxEj && (!esCardio(se) || SG_EN_SESION_CARDIO.includes(sg)) && !se.bloques.some((b) => b.tipo === 'circuito'))
          .sort((a, b) => ejsDe(a).length - ejsDe(b).length);
        for (const se of sesiones) {
          if (ef >= r.min - 1 && dir >= minDir) break;
          const usados = new Set(ejsDe(se).map((b) => b.id));
          const id = cand.find((x) => !usados.has(x));
          if (!id) continue;
          const tiempo = EJERCICIOS[id].tipo === 'tiempo';
          const bloque = { tipo: 'ej', id, rx: tiempo ? RX.tiempo.map((x) => [...x]) : RX.acc.map((x) => [...x]), aj: 'nuevo' };
          const iCardio = se.bloques.findIndex((b) => b.tipo === 'cardio' && b.kind === 'final');
          if (iCardio >= 0) se.bloques.splice(iCardio, 0, bloque); else se.bloques.push(bloque);
          ef += bloque.rx[FASE][0]; dir += bloque.rx[FASE][0];
        }
      }
      // 3) sobran series (solo con ajuste automático y fuera del enfoque): -1 serie (mín. 2)
      // (nunca se reducen ejercicios de estabilidad / cuidado articular)
      if (!soloEnfoque && !foco && ef > r.max * 1.4) {
        for (const sid of pl.orden) for (const b of ejsDe(pl.ses[sid])) {
          if (ef <= r.max * 1.2) break;
          const m = musculosDe(b.id);
          if (PROTEGIDOS.includes(PATRON[b.id]) || EJERCICIOS[b.id]?.tipo === 'tiempo') continue;
          if (!m.d.includes(sg) || b.aj || m.d.some((x) => enf.has(x))) continue;
          if (b.rx.every((x) => !x || x[0] <= 2)) continue;
          b.rx = b.rx.map((x) => (x ? [Math.max(2, x[0] - 1), x[1], x[2]] : x));
          b.aj = '−1 serie';
          ef -= 1;
        }
      }
    }
  }
  if ((enfAreas || []).includes('cardio')) pl.cardioF = (pl.cardioF || 1) * 1.3;
  return pl;
}

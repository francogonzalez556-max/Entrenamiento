/* ============================================================
   SALUD (v1.15): reglas de las skills de especialistas
   - Alimentación: días completos, alertas de problemas, calidad, agua y alcohol
   - Dolor por zona: semáforo de 3 tramos y señales de alerta (banderas rojas)
   - Bienestar diario (sueño, estrés, ánimo) y racha que perdona
   - Cardio semanal y duración estimada de la sesión
   Las funciones usan el estado S y utilidades de app.js en tiempo de ejecución.
   ============================================================ */

/* ---------- Ayuda y urgencias (Chile) ---------- */
const AYUDA = { samu: '131', suicidio: '*4141', saludResponde: '600 360 7777' };
const ayudaHTML = (intro) => `<div class="card ayuda"><h3>🆘 ¿Lo estás pasando mal?</h3>
  ${intro ? `<p class="small">${intro}</p>` : ''}
  <p class="small"><b>Línea de prevención del suicidio: <a href="tel:*4141">*4141</a></b> (gratis, 24/7)<br>
  <b>Salud Responde: <a href="tel:6003607777">600 360 7777</a></b><br>
  <b>Urgencia: SAMU <a href="tel:131">131</a></b> o el servicio de urgencia más cercano.</p>
  <p class="small muted">Hablar con alguien de confianza y con un profesional de salud mental ayuda. No estás solo/a.</p></div>`;

/* ---------- Clasificación aproximada de alimentos (por nombre y categoría) ---------- */
const RX_ALCOHOL = /cerveza|vino|piscola|pisco|\bron\b|whisky|vodka|chela|terremoto|espumante|champa|michelada|sour|coctel|\bgin\b|tequila|licor|navegado|cola de mono|fernet|jagger|chicha|mojito|destilado/;
const RX_PESCADO = /merluza|reineta|salmon|atun|jurel|pescado|congrio|sardina|corvina|marisco|chorito|macha|camaron|ceviche|pejerrey|trucha|caldillo|almeja|loco|ostion|surimi/;
const RX_LEGUMBRE = /poroto|lenteja|garbanzo|arveja|hummus|soya|tofu/;
const RX_NO_VERDURA = /mayo|aceite|aderezo|salsa|ketchup|mostaza|vinagreta|palta|crema|manjar|mermelada/;
const RX_ULTRA = /vienesa|salchicha|nugget|hamburguesa|completo|hot ?dog|papas fritas|papas de bolsa|galleta|chocolate|helado|pizza|bebida azucarada|nectar|jugo en caja|jamon|mortadela|longaniza|salame|chorizo|cereal azucarado|sopaipilla|ramen|instantane|energetica|queque|kuchen|donut|dona|berlin|alfajor|chocolito|super ocho|snack|ramitas|suflé|souffle|cabritas de micro/;
const nAlim = (f) => normal(`${f.n || ''}`);
const esAlcohol = (f) => RX_ALCOHOL.test(nAlim(f)) && !/sin alcohol|0,0|0\.0/.test(nAlim(f));
const esPescado = (f) => RX_PESCADO.test(nAlim(f));
const esLegumbre = (f) => f.cat === 'Legumbres' || RX_LEGUMBRE.test(nAlim(f));
const esFrutaVerdura = (f) => (['Frutas', 'Ensaladas', 'Verduras y aderezos', 'Verduras'].includes(f.cat) && !RX_NO_VERDURA.test(nAlim(f))) || /ensalada|tomate|lechuga|zanahoria|manzana|platano|naranja|pera|uva|frutilla|kiwi|durazno|sandia|melon|brocoli|zapallo|pepino|acelga|espinaca|betarraga/.test(nAlim(f));
const esUltra = (f) => (f.cat === 'Snacks y dulces' || RX_ULTRA.test(nAlim(f))) && !/zero|light|sin azucar/.test(nAlim(f));
// kcal de alcohol = kcal totales − kcal de los macros (el alcohol aporta 7 kcal/g y no figura en los macros)
const kcalAlcohol = (it) => (esAlcohol(it.f) ? Math.max(0, it.f.k - (4 * (it.f.pr || 0) + 4 * (it.f.c || 0) + 9 * (it.f.g || 0))) * it.q : 0);

/* Un día está "completo" si tiene al menos 2 comidas principales anotadas.
   Así un olvido de registro no se confunde con comer poco. */
const COMIDAS_PRINC = ['desayuno', 'almuerzo', 'once', 'extra'];
function diaCompleto(d) {
  const ms = new Set(diaComidas(d).map((x) => x.m));
  return COMIDAS_PRINC.filter((m) => ms.has(m)).length >= 2;
}
function infoDia(d) {
  const items = diaComidas(d), t = totales(items);
  let fv = 0, ultraK = 0, alcK = 0, leg = false, pez = false;
  const protComida = {};
  for (const it of items) {
    if (esFrutaVerdura(it.f)) fv += it.q;
    if (esUltra(it.f)) ultraK += it.f.k * it.q;
    if (esLegumbre(it.f)) leg = true;
    if (esPescado(it.f)) pez = true;
    alcK += kcalAlcohol(it);
    protComida[it.m] = (protComida[it.m] || 0) + (it.f.pr || 0) * it.q;
  }
  return { d, k: t.k, pr: t.pr, completo: diaCompleto(d), n: items.length, fv: r1(fv), ultraK, alcK, leg, pez, protComida, comidas: new Set(items.map((x) => x.m)) };
}

/* ---------- Alertas de problemas de alimentación (reglas de nutricion-clinica) ---------- */
function alertasNutricion(fin = today()) {
  const p = S.perfil, o = objetivos(), kg = pesoActual();
  const dias = [];
  for (let i = 14; i >= 1; i--) dias.push(infoDia(iso(addDays(parse(fin), -i))));
  const comp = dias.filter((x) => x.completo);
  const out = { suficiente: comp.length >= 5, completos: comp.length, alertas: [] };
  const add = (id, nivel, titulo, texto, accion) => out.alertas.push({ id, nivel, titulo, texto, accion });
  if (comp.length) {
    out.prom = Math.round(comp.reduce((a, x) => a + x.k, 0) / comp.length);
    out.protProm = Math.round(comp.reduce((a, x) => a + x.pr, 0) / comp.length);
  }
  if (!out.suficiente) return out;
  const piso = p.sexo === 'F' ? 1200 : 1500;
  const bajo = (x) => x.k < piso || x.k < o.kcal * 0.6;
  const ult7 = comp.filter((x) => dayDiff(x.d, fin) <= 7), prev7 = comp.filter((x) => dayDiff(x.d, fin) > 7);
  const nb7 = ult7.filter(bajo).length, nbP = prev7.filter(bajo).length;

  // menores: no deben comer por debajo de lo que necesitan para crecer
  if (p.edad < 18 && out.prom < o.kcal * 0.85) {
    add('menor_en_deficit', 'alto', 'Estás comiendo menos de lo que necesitas para crecer',
      `Tu promedio es de ~${out.prom.toLocaleString('es-CL')} kcal y tu cuerpo necesita ~${o.kcal.toLocaleString('es-CL')}. En crecimiento, comer poco afecta tu energía, tu estatura y tu rendimiento.`,
      'Come tus comidas completas y una colación. Conversa con un adulto de confianza o con tu médico o nutricionista.');
  }
  // ciclo restricción-atracón y compensación (días consecutivos)
  let ciclos = 0, comp_ = 0;
  for (let i = 1; i < dias.length; i++) {
    const a = dias[i - 1], b = dias[i];
    if (!a.completo || !b.completo) continue;
    if (a.k < o.kcal * 0.6 && b.k > o.kcal * 1.3) ciclos++;
    if (a.k > o.kcal * 1.3 && b.k < o.kcal * 0.6) comp_++;
  }
  if (ciclos + comp_ >= 2) {
    add('restriccion_atracon', 'alto', 'Tu semana alterna días de muy poca comida con días de mucha',
      `Detectamos ${ciclos + comp_} veces un día muy bajo junto a uno muy alto. Este ciclo es muy común y no es falta de voluntad: comer muy poco un día aumenta el hambre y los antojos del siguiente, y compensar después de un día alto lo mantiene.`,
      'Busca comer parecido todos los días. Después de un día alto, vuelve a tu comida normal en la siguiente comida, sin ayunar ni hacer ejercicio extra para "quemarlo". Si se repite o te genera angustia, conversa con un nutricionista o psicólogo.');
  } else if (nb7 >= 3) {
    const sostenido = nbP >= 3;
    add('ingesta_muy_baja', sostenido ? 'alto' : 'medio', 'Estás comiendo bastante menos de lo que tu cuerpo necesita',
      `En ${nb7} de los últimos 7 días completos anotaste menos de ${Math.max(piso, Math.round(o.kcal * 0.6)).toLocaleString('es-CL')} kcal${sostenido ? ', y la semana anterior también' : ''}. Comer muy poco frena tu energía y tu fuerza, hace perder músculo y suele terminar en hambre intensa. Si esos días no los anotaste completos, ignora este aviso.`,
      `Sube de a poco hacia tu meta: no te saltes comidas y agrega una colación con proteína (yogur, huevo, quesillo).${sostenido ? ' Si te cuesta comer más o sientes culpa al hacerlo, conversa con un nutricionista.' : ''}`);
  }
  // bajada de peso demasiado rápida (sin contar las 2 primeras semanas del plan)
  if (p.edad >= 18) {
    const desde = p.inicio ? iso(addDays(parse(p.inicio), 14)) : '0000';
    const ps = [...S.pesos].filter((x) => x.fecha >= desde && dayDiff(x.fecha, fin) <= 28).sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (ps.length >= 2) {
      const span = dayDiff(ps[0].fecha, ps[ps.length - 1].fecha);
      const sem = span >= 14 ? ((ps[0].kg - ps[ps.length - 1].kg) / span) * 7 : 0;
      if (sem > kg * 0.01) {
        add('perdida_rapida', 'medio', 'Estás bajando más rápido de lo recomendado',
          `Bajas ~${fmtN(sem, 1)} kg por semana, más del 1% de tu peso. A ese ritmo aumenta la pérdida de músculo, el cansancio y el efecto rebote.`,
          'Suma unas 150-250 kcal al día (por ejemplo, una porción de carbohidrato en el almuerzo) y prioriza la proteína y el entrenamiento de fuerza.');
      }
    }
  }
  // proteína baja la mayoría de los días
  const nProtBaja = comp.filter((x) => x.pr < o.prot * 0.7).length;
  if (nProtBaja > comp.length / 2) {
    add('proteina_baja', 'medio', 'Te falta proteína la mayoría de los días',
      `Promedias ~${out.protProm} g de los ${o.prot} g de tu meta. La proteína protege tu músculo y te deja con menos hambre.`,
      'Suma 25-40 g en desayuno y once: 2 huevos + quesillo, yogur protein, atún o pollo en el pan.');
  }
  // alcohol > 10% de las kcal de la semana
  const k7 = ult7.reduce((a, x) => a + x.k, 0), alc7 = ult7.reduce((a, x) => a + x.alcK, 0);
  if (k7 && alc7 / k7 > 0.1) {
    add('alcohol_alto', 'medio', 'El alcohol suma más del 10% de tus calorías',
      `Esta semana el alcohol aportó ~${Math.round(alc7).toLocaleString('es-CL')} kcal (${Math.round((alc7 / k7) * 100)}%). Además empeora el sueño y la recuperación muscular.`,
      'Si tomas, que sea poco y no todos los días; alterna con agua o bebidas zero.');
  }
  // saltarse comidas (desayuno o almuerzo) con mucha comida en la noche
  const conDatos7 = dias.filter((x) => x.n && dayDiff(x.d, fin) <= 7);
  const salta = conDatos7.filter((x) => (!x.comidas.has('desayuno') || !x.comidas.has('almuerzo')) && x.k && (totales(diaComidas(x.d).filter((i) => i.m === 'extra')).k / x.k) > 0.35).length;
  if (salta >= 4) {
    add('saltarse_comidas', 'bajo', 'Te saltas comidas y comes mucho en la noche',
      `En ${salta} de los últimos 7 días faltó el desayuno o el almuerzo y gran parte de lo que comiste fue en la noche. Llegar con mucha hambre a la noche hace más difícil controlar las porciones.`,
      'Intenta un desayuno simple con proteína y no te saltes el almuerzo.');
  }
  // calidad: calorías en orden pero poca fruta y verdura y muchos ultraprocesados
  const fvProm = ult7.length ? ult7.reduce((a, x) => a + x.fv, 0) / ult7.length : 0;
  const ultraPct = k7 ? ult7.reduce((a, x) => a + x.ultraK, 0) / k7 : 0;
  if (fvProm < 2 && ultraPct > 0.3) {
    add('baja_calidad', 'bajo', 'Poca fruta y verdura, y muchos ultraprocesados',
      `Promedias ~${fmtN(fvProm, 1)} porciones de frutas y verduras al día (la meta es 5) y cerca del ${Math.round(ultraPct * 100)}% de tus calorías vienen de snacks, embutidos, comida rápida o bebidas azucaradas (estimado).`,
      'Agrega una fruta en la colación y ensalada en el almuerzo y la once. No se trata de prohibir, sino de sumar.');
  }
  const orden = { alto: 0, medio: 1, bajo: 2 };
  out.alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  return out;
}
function alertasHTML(r, compacto) {
  if (!r.alertas.length) return '';
  const lst = compacto ? r.alertas.filter((a) => a.nivel === 'alto') : r.alertas;
  if (!lst.length) return '';
  return lst.map((a) => `<div class="card alerta ${a.nivel}"><b>${a.nivel === 'alto' ? '🟠' : a.nivel === 'medio' ? '🟡' : '🔵'} ${a.titulo}</b>
    ${compacto ? `<p class="small">${a.accion}</p><a class="link small" href="#/comida">Ver detalle ›</a>` : `<p class="small">${a.texto}</p><p class="small"><b>Qué hacer:</b> ${a.accion}</p>`}</div>`).join('');
}

/* ---------- Calidad del día ---------- */
function calidadHTML(d) {
  const x = infoDia(d), o = objetivos();
  let leg = 0, pez = 0;
  for (let i = 0; i < 7; i++) { const y = infoDia(iso(addDays(parse(d), -i))); if (y.leg) leg++; if (y.pez) pez++; }
  const ultra = x.k ? Math.round((x.ultraK / x.k) * 100) : 0;
  const metaComida = o.menor ? 15 : 25;
  const pc = ['desayuno', 'almuerzo', 'once'].filter((m) => x.comidas.has(m)).map((m) => {
    const g = Math.round(x.protComida[m] || 0);
    return `<span class="${g < metaComida ? 'warn-t' : 'good'}">${COMIDAS_DIA.find((c) => c[0] === m)[1]} ${g} g</span>`;
  }).join(' · ');
  const fila = (ico, txt, ok) => `<div class="qrow"><span>${ico}</span><span class="grow">${txt}</span><b class="${ok ? 'good' : 'warn-t'}">${ok ? '✓' : '·'}</b></div>`;
  return `<div class="card"><h3>🥦 Calidad de ${d === today() ? 'hoy' : 'este día'}</h3>
    ${fila('🍎', `Frutas y verduras: <b>${fmtN(x.fv, 1)}</b> de 5 porciones`, x.fv >= 5)}
    ${fila('🫘', `Legumbres en los últimos 7 días: <b>${leg}</b> de 2`, leg >= 2)}
    ${fila('🐟', `Pescado en los últimos 7 días: <b>${pez}</b> de 2`, pez >= 2)}
    ${x.k ? fila('🍟', `Ultraprocesados: ~<b>${ultra}%</b> de las calorías`, ultra <= 25) : ''}
    ${x.alcK ? fila('🍺', `Alcohol: ~<b>${Math.round(x.alcK)}</b> kcal`, x.alcK < x.k * 0.1) : ''}
    ${pc ? `<p class="small mt">Proteína por comida (meta ${metaComida}-40 g): ${pc}</p>` : ''}
    <p class="small muted">Estimado según el tipo de alimento. Guías Alimentarias de Chile: 5 porciones de frutas y verduras al día, legumbres y pescado 2 veces por semana.</p></div>`;
}

/* ---------- Agua ---------- */
const vasosMeta = (o) => Math.max(6, Math.round((o.agua * 1000) / 250));
function aguaHTML(d) {
  const o = objetivos(), n = (S.agua || {})[d] || 0, meta = vasosMeta(o);
  return `<div class="card"><div class="mh"><h3>💧 Agua</h3><b>${n} / ${meta} vasos</b></div>
    <div class="vasos">${Array.from({ length: Math.max(meta, n) }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
    <div class="btns"><button class="btn small-btn" data-act="agua" data-d="-1" aria-label="Quitar un vaso">−</button><button class="btn primary small-btn" data-act="agua" data-d="1">+ 1 vaso (250 ml)</button></div>
    <p class="small muted">Meta ~${fmtN(o.agua)} L. Más si hace calor o entrenas.</p></div>`;
}

/* ---------- Consejos de alimentación (con los valores calculados) ---------- */
function consejosComida(o) {
  const minimo = o.menor ? null : S.perfil.sexo === 'F' ? 1400 : 1800;
  const lst = [
    ['Método del plato', 'En almuerzo: ½ plato de verduras, ¼ proteína (pollo, pescado, carne magra, huevo, legumbres) y ¼ carbohidrato (arroz, papa, fideos, pan).'],
    ['Proteína en cada comida', `Reparte tu meta (${o.prot} g) en 3-4 comidas de ${o.menor ? '15-30' : '25-40'} g: desayuno, almuerzo, once y, si hace falta, una colación. Te ayuda a no perder músculo y a tener menos hambre.`],
    ['Frutas, verduras, legumbres y pescado', '5 porciones de frutas y verduras al día, legumbres 2 veces por semana y pescado 2 veces por semana (Guías Alimentarias de Chile).'],
    ['Agua', `Apunta a ~${fmtN(o.agua)} L al día (unos ${vasosMeta(o)} vasos), más con calor o entrenamiento.`],
    ['Bebidas y alcohol', 'Las bebidas azucaradas suman calorías sin saciar: prefiere agua, té, café o versiones zero. El alcohol aporta 7 kcal por gramo y empeora el sueño: si tomas, que sea poco y no todos los días.'],
    ['Pan', 'La marraqueta completa son ~270 kcal. Ajusta la cantidad a tu meta y prefiere integral: más fibra y más saciedad.'],
    ['Sin culpa', 'No hay alimentos prohibidos: hay cantidades y frecuencias. Si un día comes más, sigue normal en la próxima comida, sin compensar con ayuno ni ejercicio extra (regla 80/20).'],
    ['Pésate bien', '1 vez por semana, el mismo día, al despertar, después de ir al baño y antes de comer. Mide también la cintura a la altura del ombligo. El peso varía 0,5-2 kg de un día a otro por agua y sal: mira la tendencia de 2-4 semanas.'],
  ];
  if (!o.menor && !o.embarazo && !o.bajoPeso && S.perfil.objetivo === 'bajar') {
    lst.push(['Si no bajas en 3 semanas', `Primero revisa que estés anotando todo, con tus días completos (aceite, salsas, bebidas, picoteos). Si es así, reduce unos 150-200 kcal (ej. ½ porción de carbohidrato en la once) o suma 10-15 min de caminata. No bajes de ${minimo.toLocaleString('es-CL')} kcal sin supervisión.`]);
  }
  return lst;
}

/* ---------- Dolor por zona ---------- */
const ZONAS = { rodillas: 'Rodilla', espalda: 'Espalda baja', hombros: 'Hombro', munecas: 'Muñeca', general: 'Molestia articular' };
const zonasUsuario = (p = S.perfil) => { const z = (p?.limit || []).filter((x) => ZONAS[x]); return z.length ? z : ['general']; };
// dolor registrado de una zona en una sesión (las sesiones antiguas solo tenían "rodilla")
function dolorDe(lg, z) {
  if (lg.dolor && lg.dolor[z] != null) return lg.dolor[z];
  if (lg.dolor) return null;
  return z === 'rodillas' || z === 'general' ? lg.rodilla || 0 : null;
}
const maxDolor = (lg) => Math.max(0, lg.rodilla || 0, ...Object.values(lg.dolor || {}).map((v) => v || 0));
/* Semáforo (skill kinesiologia): sobre las sesiones de las últimas 3 semanas, de cualquier tipo
   verde: ≤3 estable · amarillo: 4-5, o sube ≥2 sobre la media de las 3 anteriores, o amaneció peor
   rojo: ≥6, o >5 dos sesiones seguidas */
function semaforoDolor(z, date) {
  const prev = logsOrdenados().filter((l) => l.done && l.fecha < date && dayDiff(l.fecha, date) <= 21)
    .map((l) => ({ v: dolorDe(l, z), peor: l.manana === 'peor' })).filter((x) => x.v != null);
  if (!prev.length) return { nivel: 'verde', v: null };
  const last = prev[prev.length - 1], ant = prev.slice(-4, -1).map((x) => x.v);
  const media = ant.length ? ant.reduce((a, b) => a + b, 0) / ant.length : last.v;
  const prev2 = prev.length >= 2 ? prev[prev.length - 2].v : null;
  if (last.v >= 6 || (last.v > 5 && prev2 > 5)) return { nivel: 'rojo', v: last.v };
  if (last.v >= 4 || (ant.length && last.v >= 3 && last.v - media >= 2) || last.peor) return { nivel: 'amarillo', v: last.v, peor: last.peor };
  return { nivel: 'verde', v: last.v };
}
// zonas que carga cada patrón de movimiento
const ZONA_PATRON = { rodillas: ['pierna', 'rodilla'], espalda: ['bisagra', 'lumbar'], hombros: ['empujeV', 'hombroL', 'empujeH', 'tironV'], munecas: ['empujeH'] };
const zonasDeEj = (id) => Object.keys(ZONA_PATRON).filter((z) => ZONA_PATRON[z].includes(PATRON[id]));
// sustitutos isométricos o sin dolor por zona (semáforo rojo)
const ISO_ZONA = {
  rodillas: ['sentadilla_pared', 'sentadilla_espanola', 'extension_terminal_rodilla', 'puente'],
  espalda: ['bird_dog', 'puente', 'plancha_lateral_rodillas', 'dead_bug'],
  hombros: ['rotacion_externa_banda', 'pajaros', 'ytw'],
  munecas: ['press_suelo', 'flexiones_inclinadas'],
};

/* ---------- Señales de alerta (banderas rojas) al cerrar la sesión ---------- */
const BANDERAS = [
  ['pecho', 'Dolor u opresión en el pecho, mareo fuerte, desmayo o falta de aire desproporcionada', 'urg'],
  ['silla', 'Adormecimiento en la zona genital o problemas para controlar la orina', 'urg'],
  ['pantorrilla', 'Pantorrilla hinchada, caliente y dolorosa', 'dia'],
  ['apoyo', 'No puedes apoyar el peso, o la articulación "se va"', 'dia'],
  ['chasquido', 'Chasquido con dolor e hinchazón inmediata', 'dia'],
  ['hinchazon', 'Hinchazón, calor o enrojecimiento en una articulación', 'eval'],
  ['hormigueo', 'Hormigueo, adormecimiento o pérdida de fuerza', 'eval'],
  ['noche', 'Dolor que te despierta de noche', 'eval'],
];
function banderaMsg(ids) {
  const tipos = new Set(ids.map((id) => BANDERAS.find((b) => b[0] === id)?.[2]));
  if (tipos.has('urg')) return '<b>Llama al SAMU <a href="tel:131">131</a> o ve a un servicio de urgencia ahora.</b> No sigas entrenando.';
  if (tipos.has('dia')) return '<b>Consulta hoy en un servicio de urgencia o con un médico.</b> No cargues esa zona hasta que te evalúen.';
  return '<b>Detén los ejercicios que cargan esa zona y pide una evaluación con un médico o kinesiólogo.</b> Puedes seguir moviendo el resto del cuerpo sin dolor.';
}
function banderaActiva() {
  const L = logsOrdenados().filter((l) => (l.alertas || []).length && dayDiff(l.fecha, today()) <= 14);
  const l = L[L.length - 1];
  return l && !(S.alertasVistas || {})[logKey(l.fecha, l.sid)] ? l : null;
}

/* ---------- Bienestar diario ---------- */
const SUENO = [[4.5, '< 5 h'], [5.5, '5-6 h'], [6.5, '6-7 h'], [7.5, '7-8 h'], [8.5, '8+ h']];
const ESTRES = [[1, 'Bajo'], [2, 'Medio'], [3, 'Alto']];
const ANIMO = [[1, '😞 Bajo'], [2, '😐 Normal'], [3, '🙂 Bien']];
const bienestarDe = (d) => (S.bienestar || {})[d] || null;
function nochesCortas(date, dias = 7) {
  let n = 0;
  for (let i = 0; i < dias; i++) { const b = bienestarDe(iso(addDays(parse(date), -i))); if (b && b.sueno != null && b.sueno < 6) n++; }
  return n;
}
function animoBajoDias(date, dias = 7) {
  let n = 0;
  for (let i = 0; i < dias; i++) { const b = bienestarDe(iso(addDays(parse(date), -i))); if (b && b.animo === 1) n++; }
  return n;
}
function bienestarHTML(t) {
  const b = bienestarDe(t) || {};
  const completo = b.sueno != null && b.estres != null && b.animo != null;
  const fila = (k, ops, label) => `<div class="bwrow"><span class="lbl">${label}</span><div class="chips">${ops.map(([v, l]) => `<button class="tab ${b[k] === v ? 'on' : ''}" data-act="bienestar" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  if (completo && !S._editBien) {
    return `<div class="card small-card bwok"><p class="small">🌙 Dormiste ${SUENO.find((x) => x[0] === b.sueno)[1]} · estrés ${ESTRES.find((x) => x[0] === b.estres)[1].toLowerCase()} · ánimo ${ANIMO.find((x) => x[0] === b.animo)[1].split(' ')[1].toLowerCase()} <button class="link small" data-act="bienedit">cambiar</button></p>
      ${b.sueno < 6 ? '<p class="small muted">Dormiste poco: hoy la sesión baja 1 serie por ejercicio. Prioriza acostarte temprano.</p>' : ''}</div>`;
  }
  return `<div class="card"><h3>🌙 ¿Cómo amaneciste?</h3><p class="small muted">10 segundos. Ajusta tu entrenamiento a tu descanso.</p>
    ${fila('sueno', SUENO, 'Horas de sueño')}${fila('estres', ESTRES, 'Estrés')}${fila('animo', ANIMO, 'Ánimo')}</div>`;
}

/* ---------- Racha que perdona (semanas activas) ---------- */
function semanaActiva(w) {
  const pl = PLAN(), meta = Math.max(1, pl.orden.length - 1); // 1 día de gracia por semana
  const hechas = Object.values(S.logs).filter((l) => l.done && l.week === w).length;
  return hechas >= meta;
}
function racha() {
  const wi = weekInfo(today());
  if (wi.antes) return { actual: 0, mejor: 0 };
  let actual = 0, mejor = 0, cur = 0;
  for (let w = 1; w <= wi.week; w++) {
    if (semanaActiva(w)) { cur++; mejor = Math.max(mejor, cur); } else if (w < wi.week) cur = 0;
  }
  actual = cur;
  return { actual, mejor };
}

/* ---------- Cardio semanal (ACSM/OMS: 150-300 min) ---------- */
function minutosCardio(week) {
  let m = 0;
  for (const l of Object.values(S.logs)) {
    if (l.week !== week) continue;
    for (const [k, c] of Object.entries(l.cardio || {})) m += (num(c.min) || 0) * (k === 'intervalos' ? 1.5 : 1);
  }
  return Math.round(m + minCaminatas(S.caminatas.filter((c) => weekInfo(c.fecha).week === week)));
}
function metaCardio(wi) {
  if (S.perfil.precaucion || S.perfil.objetivo === 'musculo') return 150;
  return wi.wk <= 4 ? 150 : wi.wk <= 8 ? 200 : 250;
}
function cardioSemanaHTML(wi) {
  const w = wi.antes ? 1 : wi.week, m = minutosCardio(w), meta = metaCardio(wi), falta = Math.max(0, meta - m);
  const libres = 7 - PLAN().orden.length;
  return `<div class="card"><div class="mh"><h3>🫀 Cardio de la semana</h3><b>${m} / ${meta} min</b></div>
    <div class="pbar thin"><i style="width:${Math.min(100, (m / meta) * 100)}%" class="prot"></i></div>
    <p class="small muted">${falta ? `Te faltan ~${falta} min: suma ${falta > 40 ? '2 caminatas' : '1 caminata'} o elíptica suave de 20-30 min (zona 2) en tus ${libres} días libres.` : '¡Meta de cardio cumplida! 💪'} Cuenta la elíptica, las caminatas y los intervalos (×1,5).</p></div>`;
}

/* ---------- Duración estimada de una sesión ---------- */
function duracionEstimada(items) {
  let s = 0;
  for (const it of items) {
    if (it.k === 'warm') s += it.corto ? 180 : 360;
    else if (it.k === 'cardio') s += (it.rx.min || 0) * 60;
    else if (it.k === 'circ') s += it.rondas * it.nEj * (rango(it.trabajo)[0] + it.pausa) + Math.max(0, it.rondas - 1) * it.entre;
    else if (it.k === 'ex' && !it.circ) {
      const [, hi] = rango(it.reps), trab = /s\s*$/.test(String(it.reps)) ? hi : Math.max(20, hi * 3.5);
      // en superserie el descanso se comparte entre los dos ejercicios
      s += it.sets * trab + Math.max(0, it.sets - 1) * (it.rest || 60) * (it.ss ? 0.5 : 1) + 75;
    }
  }
  return Math.round(s / 60 / 5) * 5;
}

/* ---------- Alerta de volumen semanal del plan (siempre visible) ---------- */
function alertaVolumenHTML() {
  const p = S.perfil, wi = weekInfo(today()), fase = (wi.antes ? 1 : wi.phase) - 1;
  const enf = sgEnfocados(enfoqueActivo(p)?.areas || []);
  const v = volumenPlan(PLAN(), fase);
  const bajo = [], alto = [];
  for (const [sg, nom] of SUBGRUPOS) {
    if (['antebrazo', 'aductores', 'lumbar', 'h_post', 'h_ant'].includes(sg)) continue; // se cubren de forma indirecta
    const r = rangoSeries(p, sg, enf), ef = efectivas(v[sg]);
    if (ef < r.min - 0.5) bajo.push(`${nom} (${fmtN(ef)} de ${r.min}-${r.max})`);
    else if (ef > r.max * 1.5) alto.push(`${nom} (${fmtN(ef)} de ${r.min}-${r.max})`);
  }
  if (!bajo.length && !alto.length) return '';
  return `<div class="card warnc"><h3>📊 Volumen de tu plan (fase ${fase + 1})</h3>
    ${bajo.length ? `<p class="small"><b>Bajo el rango:</b> ${bajo.join(' · ')}</p>` : ''}
    ${alto.length ? `<p class="small"><b>Sobre el rango:</b> ${alto.join(' · ')}</p>` : ''}
    <p class="small muted">Series efectivas por semana (directas + ½ indirectas). ${p.autoVol ? 'El ajuste automático está activo.' : 'Puedes activar el ajuste automático en la calculadora: suma o quita series sin cambiar tus ejercicios principales.'}</p>
    <a class="btn small-btn" href="#/series">Abrir calculadora de series</a></div>`;
}

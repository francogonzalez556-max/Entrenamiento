/* ============================================================
   PLAN PERSONALIZADO: ejercicios extra, requisitos y generador
   ============================================================ */

/* ---------- Animaciones de los ejercicios nuevos ---------- */
Object.assign(ANIMS, {
  press_banca: {
    props: [{ t: 'rect', x: 40, y: 124, w: 110, h: 8 }, { t: 'rect', x: 60, y: 132, w: 8, h: 38 }, { t: 'rect', x: 122, y: 132, w: 8, h: 38 }, { t: 'plate', at: 'handN' }],
    base: { hip: [130, 116], torso: 180, leg: { n: { ik: [166, 170] } } },
    frames: [{ arm: { n: { a: [120, -80] } }, hold: 300 }, { arm: { n: { a: [270, -90] } }, hold: 300 }],
    dur: 1300,
  },
  sentadilla_barra: {
    props: [{ t: 'plate', at: 'sh', dy: -4 }],
    base: { leg: { n: { ik: [118, 170] } }, arm: { n: { a: [150, -40] } } },
    frames: [{ hip: [106, 90], torso: -86, hold: 400 }, { hip: [82, 124], torso: -52, hold: 300 }],
    dur: 1500,
  },
  sentadilla_goblet: {
    props: [{ t: 'db', at: 'handN', v: 1 }],
    base: { leg: { n: { ik: [118, 170] } }, arm: { n: { a: [70, -95] } } },
    frames: [{ hip: [108, 90], torso: -88, hold: 400 }, { hip: [82, 130], torso: -58, hold: 300 }],
    dur: 1400,
  },
  peso_muerto: {
    props: [{ t: 'plate', at: 'handN' }],
    base: { leg: { n: { ik: [114, 170] } }, arm: { n: { a: [90, 90] } } },
    frames: [{ hip: [108, 90], torso: -88, hold: 400 }, { hip: [90, 116], torso: -32, hold: 300 }],
    dur: 1600,
  },
  prensa: {
    props: [{ t: 'rect', x: 30, y: 150, w: 80, h: 20 }, { t: 'line', x1: 92, y1: 142, x2: 34, y2: 86, w: 10 }, { t: 'line', x1: 112, y1: 150, x2: 200, y2: 62, w: 4 }, { t: 'bar', at: 'an', ang: 45, len: 46 }],
    base: { hip: [88, 138], torso: -135, arm: { n: { a: [70, 10] } }, footN: -125 },
    frames: [{ leg: { n: { ik: [118, 104] } }, hold: 300 }, { leg: { n: { ik: [150, 74] } }, hold: 300 }],
    dur: 1400,
  },
  jalon: {
    mode: 'front',
    props: [{ t: 'chairF' }, { t: 'cable', from: 'handsMid', to: [120, -8] }, { t: 'hbar', a: 'handL', b: 'handR', ext: 14 }],
    base: { cx: 120, hipY: 118, leg: { a: [70, 90], s: [0.35, 1] } },
    frames: [{ arm: { a: [-55, -75] }, hold: 300 }, { arm: { a: [25, -85] }, hold: 400 }],
    dur: 1300,
  },
  remo_polea: {
    props: [{ t: 'rect', x: 70, y: 142, w: 50, h: 28 }, { t: 'rect', x: 180, y: 118, w: 12, h: 52 }, { t: 'cable', from: 'handN', to: [184, 128] }],
    base: { hip: [92, 138], leg: { n: { ik: [172, 148] } }, footN: -80 },
    frames: [{ torso: -72, arm: { n: { a: [8, 0] } }, hold: 200 }, { torso: -90, arm: { n: { a: [135, 0] } }, hold: 500 }],
    dur: 1300,
  },
  dominadas: {
    mode: 'front', noFloor: true,
    props: [{ t: 'hline', y: 20, x1: 70, x2: 170, w: 5 }],
    base: { cx: 120, leg: { a: [92, 88], s: [1, 0.6] } },
    frames: [{ hipY: 124, arm: { ik: [150, 22], bend: 1 }, hold: 300 }, { hipY: 92, arm: { ik: [150, 22], bend: 1 }, hold: 400 }],
    dur: 1300,
  },
  flexiones: {
    props: [],
    base: { leg: { n: { ik: [30, 166] } }, footN: 30, arm: { n: { ik: [150, 170], bend: 1 } } },
    frames: [{ hip: [105, 133], torso: -23.8, hold: 300 }, { hip: [110.4, 150], torso: -11.2, hold: 300 }],
    dur: 1300,
  },
  zancada: {
    props: [],
    base: { torso: -88, arm: { n: { a: [92, 90] }, f: { a: [88, 90] } } },
    frames: [
      { hip: [110, 90], leg: { n: { ik: [114, 170] }, f: { ik: [108, 170] } }, footF: 0, hold: 300 },
      { hip: [100, 124], leg: { n: { ik: [124, 170] }, f: { ik: [52, 164] } }, footF: 50, hold: 400 },
    ],
    dur: 1300,
  },
  extension_triceps_polea: {
    props: [{ t: 'cable', from: 'handN', to: [150, -8] }],
    base: { hip: [110, 90], torso: -84, leg: { n: { ik: [114, 170] } } },
    frames: [{ arm: { n: { a: [98, -35] } }, hold: 250 }, { arm: { n: { a: [98, 85] } }, hold: 350 }],
    dur: 1100,
  },
  superman: {
    props: [],
    base: { hip: [120, 160], footN: 80 },
    frames: [
      { torso: 180, leg: { n: { a: [0, 0] } }, arm: { n: { a: [180, 180] } }, hold: 300 },
      { torso: 188, leg: { n: { a: [-8, -6] } }, arm: { n: { a: [192, 194] } }, hold: 700 },
    ],
    dur: 1200,
  },
  saltar_cuerda: {
    mode: 'front',
    props: [{ t: 'rope' }],
    base: { cx: 120, leg: { a: [86, 92], s: [1, 1] }, arm: { a: [70, 0] } },
    frames: [{ hipY: 86, ry: -6, hold: 0 }, { hipY: 80, ry: 186, hold: 0 }],
    dur: 320,
  },
  bicicleta: (() => {
    const N = 10, frames = [];
    for (let k = 0; k < N; k++) {
      const t = (2 * Math.PI * k) / N, c = Math.cos(t), s = Math.sin(t);
      frames.push({ hip: [100, 94], leg: { n: { ik: [112 + 16 * c, 150 + 16 * s] }, f: { ik: [112 - 16 * c, 150 - 16 * s] } }, arm: { n: { ik: [158, 80], bend: 1 } }, hold: 0 });
    }
    return { props: [{ t: 'bike' }], base: { torso: -55 }, frames, dur: 120 };
  })(),
});
const pasos = (dy, props) => ({
  props,
  base: { torso: -86 },
  frames: [
    { hip: [105, 81 + dy], leg: { n: { a: [70, 100] }, f: { a: [110, 85] } }, arm: { n: { a: [110, 60] }, f: { a: [70, 20] } }, hold: 0 },
    { hip: [105, 78 + dy], leg: { n: { a: [90, 92] }, f: { a: [90, 92] } }, arm: { n: { a: [90, 40] }, f: { a: [90, 40] } }, hold: 0 },
    { hip: [105, 81 + dy], leg: { n: { a: [110, 85] }, f: { a: [70, 100] } }, arm: { n: { a: [70, 20] }, f: { a: [110, 60] } }, hold: 0 },
    { hip: [105, 78 + dy], leg: { n: { a: [90, 92] }, f: { a: [90, 92] } }, arm: { n: { a: [90, 40] }, f: { a: [90, 40] } }, hold: 0 },
  ],
  dur: 330,
});
ANIMS.trotadora = pasos(0, [{ t: 'treadmill' }]);
ANIMS.caminata = pasos(10, []);

/* ---------- Ejercicios nuevos ---------- */
Object.assign(EJERCICIOS, {
  press_banca: {
    nombre: 'Press de banca con barra', musculos: 'Pectoral, tríceps, hombro anterior', equipo: 'Barra + banco (ideal con rack y alguien que te asista)',
    tipo: 'fuerza', step: 5,
    pasos: ['Acuéstate en el banco con los ojos bajo la barra y los pies firmes en el suelo.', 'Toma la barra algo más abierta que los hombros; junta las escápulas.', 'Baja controlado hasta rozar la parte baja del pecho, codos a ~45°.', 'Empuja hasta estirar los brazos sin despegar glúteos del banco.'],
    errores: ['Rebotar la barra en el pecho', 'Codos abiertos en cruz', 'Levantar los glúteos'], rodilla: 'Sin carga en rodillas.', yt: 'press de banca con barra técnica',
  },
  sentadilla_barra: {
    nombre: 'Sentadilla con barra', musculos: 'Cuádriceps, glúteos, core', equipo: 'Barra + rack',
    tipo: 'fuerza', step: 5,
    pasos: ['Coloca la barra sobre la parte alta de la espalda (no en el cuello).', 'Pies al ancho de hombros, puntas levemente afuera.', 'Baja llevando cadera atrás y abajo, espalda neutra, hasta donde mantengas la técnica.', 'Sube empujando el suelo con todo el pie.'],
    errores: ['Rodillas hacia adentro', 'Redondear la espalda abajo', 'Talones que se levantan'], rodilla: 'Exigente para la rodilla: si molesta, usa sentadilla a cajón o prensa.', yt: 'sentadilla con barra técnica correcta',
  },
  sentadilla_goblet: {
    nombre: 'Sentadilla goblet', musculos: 'Cuádriceps, glúteos, core', equipo: '1 mancuerna o kettlebell (o sin peso)',
    tipo: 'fuerza', step: 2,
    pasos: ['Sostén el peso pegado al pecho, codos abajo.', 'Pies al ancho de hombros, puntas levemente afuera.', 'Baja controlado hasta que los muslos queden paralelos al suelo (o lo que permita tu movilidad).', 'Sube empujando con todo el pie, pecho arriba.'],
    errores: ['Rodillas hacia adentro', 'Talones despegados', 'Inclinar demasiado el tronco'], rodilla: 'Si hay molestia, baja menos o usa una silla de referencia.', yt: 'sentadilla goblet técnica',
  },
  peso_muerto: {
    nombre: 'Peso muerto con barra', musculos: 'Glúteos, isquios, espalda, agarre', equipo: 'Barra + discos',
    tipo: 'fuerza', step: 5,
    pasos: ['Barra sobre la mitad del pie, pies al ancho de cadera.', 'Toma la barra, pecho arriba, espalda neutra y brazos estirados.', 'Empuja el suelo y lleva la cadera adelante; la barra sube pegada a las piernas.', 'Baja controlado con la misma técnica.'],
    errores: ['Redondear la espalda', 'Alejar la barra del cuerpo', 'Tirar con los brazos'], rodilla: 'Bajo estrés para la rodilla si la técnica es correcta.', yt: 'peso muerto convencional técnica',
  },
  prensa: {
    nombre: 'Prensa de piernas', musculos: 'Cuádriceps, glúteos', equipo: 'Máquina de prensa (gimnasio)',
    tipo: 'fuerza', step: 10,
    pasos: ['Siéntate con la espalda apoyada y los pies al ancho de cadera en la plataforma.', 'Quita los seguros y baja controlado hasta ~90° de rodilla.', 'Empuja con todo el pie sin bloquear las rodillas arriba.'],
    errores: ['Despegar la zona lumbar del respaldo', 'Bloquear las rodillas', 'Bajar demasiado'], rodilla: 'Con rango controlado (no tan profundo) suele ser tolerable para rodillas sensibles.', yt: 'prensa de piernas técnica',
  },
  jalon: {
    nombre: 'Jalón al pecho', musculos: 'Dorsales, bíceps', equipo: 'Polea alta (gimnasio)',
    tipo: 'fuerza', step: 5,
    pasos: ['Siéntate con los muslos bajo los apoyos; toma la barra más abierta que los hombros.', 'Lleva la barra hacia la parte alta del pecho, codos hacia abajo y atrás.', 'Sube controlado hasta estirar los brazos.'],
    errores: ['Tirar detrás de la nuca', 'Balancear el tronco', 'Encoger hombros'], rodilla: 'Sin carga en rodillas.', yt: 'jalón al pecho técnica',
  },
  remo_polea: {
    nombre: 'Remo sentado (polea o banda)', musculos: 'Espalda media, dorsales, bíceps', equipo: 'Polea baja o banda elástica',
    tipo: 'fuerza', step: 5,
    pasos: ['Siéntate con rodillas levemente dobladas y espalda recta (con banda: pásala por los pies).', 'Tira hacia el ombligo llevando los codos atrás.', 'Aprieta la espalda 1 s y vuelve estirando los brazos sin encorvarte.'],
    errores: ['Balancear el tronco', 'Redondear la espalda', 'Encoger hombros'], rodilla: 'Sin carga en rodillas.', yt: 'remo sentado en polea técnica',
  },
  dominadas: {
    nombre: 'Dominadas', musculos: 'Dorsales, bíceps, core', equipo: 'Barra de dominadas (puedes usar banda de asistencia)',
    tipo: 'fuerza', step: 0, nota: 'Si no logras hacer las reps, usa una banda de asistencia o haz solo la bajada lenta (5 s).',
    pasos: ['Cuélgate de la barra con agarre algo más abierto que los hombros.', 'Baja los hombros y tira hasta que el mentón pase la barra.', 'Baja lento hasta estirar los brazos.'],
    errores: ['Balancearse', 'Recorrido a medias', 'Encoger hombros'], rodilla: 'Sin carga en rodillas.', yt: 'dominadas técnica principiantes',
  },
  flexiones: {
    nombre: 'Flexiones de brazos', musculos: 'Pectoral, tríceps, core', equipo: 'Peso corporal',
    tipo: 'fuerza', step: 0, nota: 'Si es muy fácil, haz la bajada en 3 s o eleva los pies.',
    pasos: ['Manos algo más abiertas que los hombros, cuerpo en línea recta.', 'Baja el pecho hasta casi tocar el suelo, codos a ~45°.', 'Empuja hasta estirar los brazos sin hundir la cadera.'],
    errores: ['Cadera hundida', 'Codos abiertos en cruz', 'Recorrido corto'], rodilla: 'Sin carga en rodillas.', yt: 'flexiones de brazos técnica correcta',
  },
  zancada: {
    nombre: 'Zancada hacia atrás', musculos: 'Cuádriceps, glúteos', equipo: 'Peso corporal (o mancuernas)',
    tipo: 'fuerza', step: 2, porLado: true,
    pasos: ['De pie, da un paso largo hacia atrás.', 'Baja hasta que la rodilla de atrás casi toque el suelo, tronco erguido.', 'Empuja con la pierna de adelante para volver. Alterna o completa un lado.'],
    errores: ['Rodilla de adelante hacia adentro', 'Paso muy corto', 'Inclinarse adelante'], rodilla: 'No recomendada si tienes molestias de rodilla.', yt: 'zancada hacia atrás técnica',
  },
  extension_triceps_polea: {
    nombre: 'Extensión de tríceps en polea o banda', musculos: 'Tríceps', equipo: 'Polea alta o banda elástica',
    tipo: 'fuerza', step: 2.5,
    pasos: ['De pie frente a la polea, codos pegados al cuerpo.', 'Empuja hacia abajo hasta estirar los brazos.', 'Vuelve controlado sin mover los codos.'],
    errores: ['Mover los codos', 'Usar el peso del cuerpo', 'Recorrido corto'], rodilla: 'Sin carga en rodillas.', yt: 'extensión de tríceps en polea técnica',
  },
  superman: {
    nombre: 'Superman (extensión de espalda)', musculos: 'Espalda baja, glúteos', equipo: 'Peso corporal (colchoneta)',
    tipo: 'fuerza', step: 0,
    pasos: ['Acuéstate boca abajo con brazos estirados al frente.', 'Levanta a la vez brazos, pecho y piernas unos centímetros.', 'Mantén 2 s y baja lento.'],
    errores: ['Levantar demasiado (arquear de más)', 'Hacerlo con impulso', 'Mirar hacia arriba'], rodilla: 'Sin carga en rodillas.', yt: 'ejercicio superman espalda técnica',
  },
  saltar_cuerda: {
    nombre: 'Saltar la cuerda', musculos: 'Cardio, pantorrillas, coordinación', equipo: 'Cuerda para saltar',
    tipo: 'tiempo', step: 0,
    pasos: ['Codos pegados al cuerpo; gira la cuerda con las muñecas.', 'Saltos bajos y suaves sobre la punta de los pies.', 'Mantén un ritmo constante y respira.'],
    errores: ['Saltar muy alto', 'Girar con los brazos', 'Caer con los talones'], rodilla: 'Es de impacto: no recomendado con molestias de rodilla.', yt: 'como saltar la cuerda principiantes',
  },
  bicicleta: {
    nombre: 'Bicicleta estática', musculos: 'Cardio, piernas', equipo: 'Bicicleta estática',
    tipo: 'cardio',
    pasos: ['Ajusta el sillín: con el pedal abajo la rodilla queda levemente doblada.', 'Espalda neutra, hombros relajados.', 'Pedalea a la intensidad indicada ajustando la resistencia.'],
    errores: ['Sillín muy bajo (carga la rodilla)', 'Resistencia excesiva', 'Rebotar en el sillín'], rodilla: 'Bajo impacto. Un sillín bien alto protege la rodilla.', yt: 'como ajustar bicicleta estatica',
  },
  trotadora: {
    nombre: 'Trotadora', musculos: 'Cardio, piernas', equipo: 'Trotadora / cinta',
    tipo: 'cardio',
    pasos: ['Empieza caminando 3-5 min para calentar.', 'Mantén el tronco erguido sin colgarte de las barandas.', 'Para subir la intensidad usa pendiente (inclinación) antes que velocidad.'],
    errores: ['Afirmarse de las barandas', 'Pasos demasiado largos', 'Velocidad excesiva al inicio'], rodilla: 'Con rodillas sensibles, camina en pendiente en vez de trotar.', yt: 'caminar en cinta con inclinacion',
  },
  caminata: {
    nombre: 'Caminata rápida', musculos: 'Cardio', equipo: 'Ninguno (calle, parque o pasillo)',
    tipo: 'cardio',
    pasos: ['Camina a paso rápido, como si estuvieras atrasado.', 'Brazos doblados acompañando el paso.', 'Preferir terreno plano.'],
    errores: ['Ritmo de paseo (muy suave)', 'Encorvarse', 'Calzado inadecuado'], rodilla: 'Bajo impacto en terreno plano.', yt: 'caminata rapida para bajar de peso tecnica',
  },
});
EJERCICIOS.swing.equipo = '1 mancuerna o kettlebell';

/* ---------- Requisitos de cada ejercicio ----------
   eq: equipo ('|' = cualquiera de, '+' = todos), lvl: nivel mínimo (0 principiante … 3 avanzado),
   no: molestias que lo descartan                                                              */
const META = {
  sentadilla_cajon: { eq: 'pc', lvl: 0 }, sentadilla_goblet: { eq: 'pc', lvl: 1, no: ['rodillas'] },
  sentadilla_barra: { eq: 'rack+barra', lvl: 2, no: ['rodillas', 'espalda'] }, prensa: { eq: 'maquinas', lvl: 0 },
  press_suelo: { eq: 'mancuernas|barra', lvl: 0 }, press_banca: { eq: 'barra+banco', lvl: 1, no: ['hombros'] },
  flexiones: { eq: 'pc', lvl: 2, no: ['munecas'] }, flexiones_inclinadas: { eq: 'pc', lvl: 0, no: ['munecas'] },
  remo_polea: { eq: 'poleas|bandas', lvl: 0 }, remo_mancuerna: { eq: 'mancuernas|kettlebell', lvl: 0 },
  remo_barra: { eq: 'barra|mancuernas', lvl: 1, no: ['espalda'] }, superman: { eq: 'pc', lvl: 0 },
  dominadas: { eq: 'dominadas', lvl: 2, no: ['hombros'] }, jalon: { eq: 'poleas', lvl: 0 },
  press_militar: { eq: 'mancuernas|kettlebell', lvl: 0, no: ['hombros'] }, elevaciones_laterales: { eq: 'mancuernas|bandas|poleas', lvl: 0 },
  curl_biceps: { eq: 'mancuernas|barra|bandas|poleas', lvl: 0 }, extension_triceps: { eq: 'mancuernas|kettlebell', lvl: 0, no: ['hombros'] },
  extension_triceps_polea: { eq: 'poleas|bandas', lvl: 0 },
  peso_muerto_rumano: { eq: 'barra', lvl: 1, no: ['espalda'] }, peso_muerto_mancuernas: { eq: 'mancuernas|kettlebell', lvl: 0 },
  peso_muerto: { eq: 'barra', lvl: 2, no: ['espalda'] }, puente: { eq: 'pc', lvl: 0 }, sentadilla_pared: { eq: 'pc', lvl: 0 },
  zancada: { eq: 'pc', lvl: 1, no: ['rodillas'] }, plancha: { eq: 'pc', lvl: 0 }, dead_bug: { eq: 'pc', lvl: 0 },
  bird_dog: { eq: 'pc', lvl: 0 }, abduccion_cadera: { eq: 'pc', lvl: 0 }, elevacion_talones: { eq: 'pc', lvl: 0 },
  paseo_granjero: { eq: 'mancuernas|kettlebell', lvl: 0 }, swing: { eq: 'kettlebell|mancuernas', lvl: 1, no: ['espalda'] },
  saltar_cuerda: { eq: 'cuerda', lvl: 1, no: ['rodillas'] },
};

/* ---------- Opciones del perfil ---------- */
const PERFIL_OPC = {
  objetivos: [
    ['bajar', '🔥', 'Bajar de peso', 'Quemar grasa con fuerza + cardio y déficit de calorías'],
    ['musculo', '💪', 'Ganar músculo', 'Más fuerza y masa muscular, con leve superávit'],
    ['tonificar', '⚡', 'Tonificar / mantener', 'Mejorar la forma sin cambiar mucho el peso'],
    ['cardio', '🫀', 'Mejorar el cardio', 'Más resistencia y capacidad aeróbica'],
    ['salud', '🌱', 'Salud general', 'Moverse, sentirse bien y prevenir lesiones'],
  ],
  actividad: [
    ['sedentario', 'Sedentario', 'Trabajo sentado, poco movimiento'],
    ['ligero', 'Algo activo', 'Camino algo durante el día'],
    ['activo', 'Activo', 'Trabajo de pie o camino mucho'],
    ['muy', 'Muy activo', 'Trabajo físico pesado'],
  ],
  niveles: [
    ['principiante', 'Principiante', 'Sin entrenar hace tiempo'],
    ['intermedio_bajo', 'Intermedio bajo', 'Me muevo algo, entreno a veces'],
    ['intermedio', 'Intermedio', 'Entreno con regularidad'],
    ['avanzado', 'Avanzado', 'Entreno seguido hace años'],
  ],
  equipo: [
    ['mancuernas', '🏋️', 'Mancuernas'], ['barra', '➖', 'Barra y discos'], ['banco', '🛋️', 'Banco'],
    ['bandas', '🎗️', 'Bandas elásticas'], ['dominadas', '🚪', 'Barra de dominadas'], ['kettlebell', '🔔', 'Kettlebell'],
    ['cuerda', '🪢', 'Cuerda para saltar'], ['eliptica', '🚴', 'Elíptica'], ['trotadora', '🏃', 'Trotadora'], ['bicicleta', '🚲', 'Bicicleta estática'],
  ],
  limitaciones: [['rodillas', '🦵 Rodillas'], ['espalda', '🔙 Espalda baja'], ['hombros', '💪 Hombros'], ['munecas', '✋ Muñecas']],
};
const NIVEL_N = { principiante: 0, intermedio_bajo: 1, intermedio: 2, avanzado: 3 };
const EQUIPO_GYM = ['mancuernas', 'barra', 'banco', 'rack', 'maquinas', 'poleas', 'dominadas', 'kettlebell', 'bandas', 'cuerda', 'eliptica', 'trotadora', 'bicicleta'];

/* ---------- Modalidades de cardio ---------- */
const CARDIO_MOD = {
  eliptica: { label: 'Elíptica', anim: 'eliptica', fuerte: 'sube la cadencia' },
  bicicleta: { label: 'Bicicleta', anim: 'bicicleta', fuerte: 'sube la cadencia o la resistencia' },
  trotadora: { label: 'Trotadora', anim: 'trotadora', fuerte: 'sube la velocidad o la pendiente' },
  trotadoraPend: { label: 'Trotadora (caminata en pendiente)', anim: 'trotadora', ex: 'trotadora', fuerte: 'sube la pendiente, sin trotar' },
  caminata: { label: 'Caminata rápida', anim: 'caminata', fuerte: 'camina lo más rápido que puedas' },
};

/* ---------- Opciones por "espacio" del plan (en orden de preferencia) ---------- */
const SLOTS = {
  pierna: ['sentadilla_barra', 'prensa', 'sentadilla_goblet', 'sentadilla_cajon'],
  pierna_iso: ['sentadilla_pared'],
  bisagra: ['peso_muerto_rumano', 'peso_muerto_mancuernas', '~puente'],
  bisagra_m: ['peso_muerto', 'peso_muerto_rumano', 'peso_muerto_mancuernas', '~puente'],
  puente: ['puente'],
  zancada: ['zancada'],
  empujeH: ['press_banca', 'press_suelo', 'flexiones', 'flexiones_inclinadas'],
  empujeV: ['press_militar', '~elevaciones_laterales'],
  tironH: ['remo_polea', 'remo_mancuerna', 'remo_barra', '~superman'],
  tironV: ['dominadas', 'jalon'],
  hombroL: ['elevaciones_laterales'],
  biceps: ['curl_biceps'],
  triceps: ['extension_triceps_polea', 'extension_triceps'],
  carga: ['paseo_granjero'],
  core1: ['plancha'], core2: ['dead_bug'], core3: ['bird_dog'],
  gluteoM: ['abduccion_cadera'], pantorrilla: ['elevacion_talones'],
  c_bisagra1: ['peso_muerto_mancuernas', '~puente'],
  c_bisagra2: ['swing', 'peso_muerto_mancuernas', '~puente'],
  c_pierna: ['sentadilla_goblet', 'sentadilla_cajon'],
  c_empuje: ['flexiones', 'flexiones_inclinadas', 'press_suelo'],
  c_tiron: ['remo_barra', 'remo_mancuerna', 'remo_polea', '~superman'],
  c_cardio: ['saltar_cuerda'],
};

/* Esquemas de series [series, reps, descanso] por fase */
const RX = {
  comp: [[3, '10-12', 90], [4, '8-12', 90], [4, '6-10', 120]],
  acc: [[3, '12-15', 60], [3, '10-15', 60], [4, '10-12', 60]],
  core: [[3, '10', 30], [3, '12', 30], [3, '15', 30]],
  tiempo: [[3, '20-30 s', 45], [3, '30-40 s', 45], [3, '40-50 s', 45]],
};

/* ---------- Plantillas de sesiones ----------
   ej: espacio [nombre, rx | clave RX, rango (0 = 1ª opción), prioridad (1 siempre, 2 normal, 3 solo sesiones largas), opcional] */
const E = (slot, rx, rank = 0, prio = 2, opt = false) => ({ slot, rx, rank, prio, opt });
const PLANTILLAS = {
  // ---- Quemar grasa / tonificar / cardio / salud (A-D = plan original) ----
  A: () => ({
    nombre: 'Fuerza A', foco: 'Piernas, empuje y espalda', dur: '40-45 min',
    bloques: [{ tipo: 'calentamiento' },
      E('pierna', [[3, '12-15', 75], [3, '10-12', 75], [4, '8-10', 90]], 0, 1), E('empujeH', [[3, '12-15', 75], [3, '10-12', 75], [4, '8-10', 90]], 0, 1),
      E('tironH', [[3, '12-15', 60], [3, '10-12', 60], [4, '8-10', 75]], 0, 1), E('puente', [[3, '15', 60], [3, '12', 60], [4, '10', 75]], 0, 2),
      E('empujeV', [[2, '12-15', 60], [3, '10-12', 60], [3, '8-10', 75]], 0, 2), E('tironV', 'comp', 0, 2, true),
      E('core1', [[3, '20-30 s', 45], [3, '30-40 s', 45], [3, '45 s', 45]], 0, 2), { tipo: 'cardio', kind: 'final' }],
  }),
  B: (p) => ({
    nombre: p.limit.includes('rodillas') ? 'Cardio + Rodillas' : 'Cardio + Core', foco: p.limit.includes('rodillas') ? 'Cardio continuo, core y estabilidad de rodilla' : 'Cardio continuo, core y estabilidad', dur: '35-50 min',
    bloques: [{ tipo: 'calentamiento', corto: true }, { tipo: 'cardio', kind: 'z2' },
      E('gluteoM', [[2, '15', 30], [3, '15', 30], [3, '20', 30]], 0, 2), E('pantorrilla', [[3, '15', 45], [3, '15', 45], [3, '20', 45]], 0, 2),
      E('core3', [[3, '8', 30], [3, '10', 30], [3, '12', 30]], 0, 1), E('core2', [[3, '8', 30], [3, '10', 30], [3, '12', 30]], 0, 1)],
  }),
  C: () => ({
    nombre: 'Fuerza B', foco: 'Cadena posterior, espalda y brazos', dur: '40-45 min',
    bloques: [{ tipo: 'calentamiento' },
      E('bisagra', [[3, '12', 90], [3, '10', 90], [4, '8', 120]], 0, 1), E('empujeH', [[3, '8-12', 60], [3, '10-15', 60], [4, '12-15', 60]], 1, 1),
      E('tironH', [[3, '12', 75], [3, '10-12', 75], [4, '8-10', 90]], 1, 1), E('pierna_iso', [[3, '20-30 s', 60], [3, '30-45 s', 60], [3, '45-60 s', 60]], 0, 2),
      E('hombroL', [[2, '12-15', 45], [3, '12-15', 45], [3, '12-15', 45]], 0, 2), E('biceps', [[2, '12', 45], [3, '10-12', 45], [3, '10-12', 45]], 0, 2),
      E('triceps', [[2, '12', 45], [3, '10-12', 45], [3, '10-12', 45]], 0, 2), E('carga', [[3, '30 s', 60], [3, '40 s', 60], [3, '45 s', 60]], 0, 2),
      { tipo: 'cardio', kind: 'final' }],
  }),
  D: () => ({
    nombre: 'Circuito + Intervalos', foco: 'Quema de grasa y capacidad cardiovascular', dur: '40-45 min',
    bloques: [{ tipo: 'calentamiento' },
      { tipo: 'circuito', rondas: [3, 3, 4], trabajo: ['30 s', '40 s', '40 s'], pausa: [30, 20, 20], entreRondas: [90, 90, 75],
        slots: [{ slot: 'c_bisagra1', fases: [1] }, { slot: 'c_bisagra2', fases: [2, 3] }, { slot: 'c_pierna', fases: [1, 2, 3] },
          { slot: 'c_empuje', fases: [1, 2, 3] }, { slot: 'c_tiron', fases: [1, 2, 3] }, { slot: 'core1', fases: [1, 2, 3] }, { slot: 'c_cardio', fases: [1, 2, 3] }] },
      { tipo: 'cardio', kind: 'intervalos' }],
  }),
  E: () => ({
    nombre: 'Fuerza C', foco: 'Cuerpo completo', dur: '40-45 min',
    bloques: [{ tipo: 'calentamiento' }, E('pierna', 'acc', 1, 1), E('empujeH', 'acc', 0, 1), E('tironH', 'acc', 2, 1),
      E('bisagra', 'acc', 1, 2), E('hombroL', 'acc', 0, 2), E('core3', 'core', 0, 2), { tipo: 'cardio', kind: 'final' }],
  }),
  F: () => ({
    nombre: 'Cardio suave + Movilidad', foco: 'Recuperación activa', dur: '30-40 min',
    bloques: [{ tipo: 'calentamiento', corto: true }, { tipo: 'cardio', kind: 'z2' }, E('gluteoM', 'core', 0, 2), E('core2', 'core', 0, 1), E('core3', 'core', 0, 1)],
  }),
  // ---- Ganar músculo ----
  FA: () => ({ nombre: 'Cuerpo completo A', foco: 'Fuerza general', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('pierna', 'comp', 0, 1), E('empujeH', 'comp', 0, 1), E('tironH', 'comp', 0, 1), E('bisagra', 'acc', 1, 2), E('empujeV', 'acc', 0, 2), E('core1', 'tiempo', 0, 2), E('biceps', 'acc', 0, 3), { tipo: 'cardio', kind: 'final' }] }),
  FB: () => ({ nombre: 'Cuerpo completo B', foco: 'Fuerza general', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('bisagra_m', 'comp', 0, 1), E('empujeH', 'comp', 1, 1), E('tironV', 'comp', 0, 1, true), E('tironH', 'comp', 1, 1), E('pierna', 'acc', 1, 2), E('core2', 'core', 0, 2), E('triceps', 'acc', 0, 3), { tipo: 'cardio', kind: 'final' }] }),
  FC: () => ({ nombre: 'Cuerpo completo C', foco: 'Volumen y brazos', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('pierna', 'comp', 1, 1), E('empujeH', 'acc', 0, 1), E('tironH', 'acc', 2, 1), E('puente', 'acc', 0, 2), E('hombroL', 'acc', 0, 2), E('biceps', 'acc', 0, 2), E('triceps', 'acc', 0, 2), E('core3', 'core', 0, 3)] }),
  TA: () => ({ nombre: 'Torso A', foco: 'Pecho, espalda y hombros', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('empujeH', 'comp', 0, 1), E('tironV', 'comp', 0, 1, true), E('tironH', 'comp', 0, 1), E('empujeV', 'comp', 0, 2), E('hombroL', 'acc', 0, 2), E('biceps', 'acc', 0, 2), E('triceps', 'acc', 0, 2), { tipo: 'cardio', kind: 'final' }] }),
  PA: () => ({ nombre: 'Piernas A', foco: 'Cuádriceps y glúteos', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('pierna', 'comp', 0, 1), E('bisagra', 'comp', 0, 1), E('zancada', 'acc', 0, 2, true), E('puente', 'acc', 0, 2), E('pantorrilla', 'acc', 0, 2), E('core1', 'tiempo', 0, 3)] }),
  TB: () => ({ nombre: 'Torso B', foco: 'Espalda, pecho y brazos', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('tironH', 'comp', 1, 1), E('empujeH', 'comp', 1, 1), E('tironV', 'comp', 0, 2, true), E('empujeV', 'acc', 0, 2), E('biceps', 'acc', 0, 2), E('triceps', 'acc', 0, 2), E('carga', 'tiempo', 0, 3), { tipo: 'cardio', kind: 'final' }] }),
  PB: () => ({ nombre: 'Piernas B', foco: 'Cadena posterior', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('bisagra_m', 'comp', 0, 1), E('pierna', 'comp', 1, 1), E('puente', 'acc', 0, 2), E('pierna_iso', 'tiempo', 0, 2), E('gluteoM', 'acc', 0, 2), E('core2', 'core', 0, 3)] }),
  EM: (p, v = 0) => ({ nombre: v ? 'Empuje B' : 'Empuje A', foco: 'Pecho, hombros y tríceps', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('empujeH', 'comp', v, 1), E('empujeV', 'comp', 0, 1), E('empujeH', 'acc', 1 - v, 2), E('hombroL', 'acc', 0, 2), E('triceps', 'acc', 0, 2), E('core1', 'tiempo', 0, 3)] }),
  TI: (p, v = 0) => ({ nombre: v ? 'Tirón B' : 'Tirón A', foco: 'Espalda y bíceps', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E('tironV', 'comp', 0, 1, true), E('tironH', 'comp', v, 1), E('tironH', 'acc', 1 + v, 2), E('biceps', 'acc', 0, 2), E('carga', 'tiempo', 0, 2), E('core2', 'core', 0, 3)] }),
  PI: (p, v = 0) => ({ nombre: v ? 'Piernas B' : 'Piernas A', foco: 'Piernas y glúteos', dur: '45-60 min', bloques: [{ tipo: 'calentamiento' },
    E(v ? 'bisagra_m' : 'pierna', 'comp', 0, 1), E(v ? 'pierna' : 'bisagra', 'comp', v, 1), E('zancada', 'acc', 0, 2, true), E('puente', 'acc', 0, 2), E('pantorrilla', 'acc', 0, 2), E('core3', 'core', 0, 3)] }),
};
const ORDEN = {
  quemar: { 2: ['A', 'C'], 3: ['A', 'C', 'D'], 4: ['A', 'B', 'C', 'D'], 5: ['A', 'B', 'C', 'D', 'E'], 6: ['A', 'B', 'C', 'D', 'E', 'F'] },
  musculo: { 2: ['FA', 'FB'], 3: ['FA', 'FB', 'FC'], 4: ['TA', 'PA', 'TB', 'PB'], 5: ['TA', 'PA', 'TB', 'PB', 'FC'], 6: ['EM', 'TI', 'PI', 'EM2', 'TI2', 'PI2'] },
};

/* ---------- Generador ---------- */
function equipoDe(p) {
  const base = p.lugar === 'gimnasio' ? EQUIPO_GYM : (p.equipo || []);
  return new Set(['pc', ...base]);
}
function cumpleEq(req, eq) {
  return req.split('+').every((grupo) => grupo.split('|').some((x) => eq.has(x)));
}
function disponible(id, p, eq) {
  const m = META[id];
  if (!m) return false;
  if (!cumpleEq(m.eq, eq)) return false;
  if ((m.lvl || 0) > (NIVEL_N[p.nivel] ?? 1)) return false;
  if ((m.no || []).some((x) => (p.limit || []).includes(x))) return false;
  return true;
}
function elegirCardio(p, eq) {
  const rod = (p.limit || []).includes('rodillas');
  const orden = rod ? ['eliptica', 'bicicleta', 'trotadoraPend', 'caminata'] : ['eliptica', 'trotadora', 'bicicleta', 'caminata'];
  const k = orden.find((m) => m === 'caminata' || eq.has(m === 'trotadoraPend' ? 'trotadora' : m));
  return { key: k, ex: CARDIO_MOD[k].ex || k, ...CARDIO_MOD[k] };
}
const FACTOR_CARDIO = { bajar: 1, cardio: 1.25, tonificar: 0.85, salud: 0.8, musculo: 0.8 };

function generarPlan(p) {
  const eq = equipoDe(p);
  const grupo = p.objetivo === 'musculo' ? 'musculo' : 'quemar';
  const dias = [...(p.dias || [2, 3, 4, 5])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const n = Math.min(6, Math.max(2, dias.length));
  const ids = ORDEN[grupo][n];
  const maxPrio = p.dur <= 30 ? 1 : p.dur >= 60 ? 3 : 2;
  const lvl = NIVEL_N[p.nivel] ?? 1;
  const ses = {}, dowSid = {}, orden = [];
  const ajustar = (rx) => rx.map((r, i) => {
    let s = r[0];
    if (lvl === 0 && i === 0) s = Math.max(2, s - 1);
    if (lvl === 3 && i > 0) s = Math.min(5, s + 1);
    return [s, r[1], r[2]];
  });
  // las opciones con '~' son de respaldo: solo se usan si no queda ninguna otra
  const elegir = (slot, rank, usados) => {
    const todas = SLOTS[slot] || [];
    const ok = (id) => disponible(id, p, eq) && !usados.has(id);
    const ops = todas.filter((x) => x[0] !== '~').filter(ok);
    if (ops.length) return ops[Math.min(rank, ops.length - 1)];
    const fb = todas.filter((x) => x[0] === '~').map((x) => x.slice(1)).filter(ok);
    return fb[0] || null;
  };
  ids.forEach((sid, i) => {
    const base = sid.replace(/2$/, '');
    const t = PLANTILLAS[base](p, sid.endsWith('2') ? 1 : 0);
    const usados = new Set();
    const bloques = [];
    for (const b of t.bloques) {
      if (b.slot) {
        if (b.prio > maxPrio) continue;
        const id = elegir(b.slot, b.rank, usados);
        if (!id) continue;
        usados.add(id);
        const ex = EJERCICIOS[id];
        const rx = Array.isArray(b.rx) ? b.rx : RX[ex.tipo === 'tiempo' ? 'tiempo' : b.rx];
        bloques.push({ tipo: 'ej', id, rx: ajustar(rx) });
      } else if (b.tipo === 'circuito') {
        const ejercicios = [];
        for (const s of b.slots) {
          const id = elegir(s.slot, 0, usados);
          if (id) { usados.add(id); ejercicios.push({ id, fases: s.fases }); }
        }
        bloques.push({ ...b, ejercicios });
      } else bloques.push(b);
    }
    ses[sid] = { nombre: t.nombre, foco: t.foco, dur: t.dur, dow: dias[i], bloques };
    dowSid[dias[i]] = sid;
    orden.push(sid);
  });
  return { ses, dowSid, orden, dias: dias.slice(0, n), cardio: elegirCardio(p, eq), cardioF: FACTOR_CARDIO[p.objetivo] || 1, grupo };
}

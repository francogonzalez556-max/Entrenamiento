/* ============================================================
   DATOS: ejercicios, animaciones, programa de 12 semanas y menú
   ============================================================ */

/* ---------- Animaciones (ver anim.js para el motor) ----------
   Vista lateral: hip=[x,y], torso=ángulo (°, -90 = erguido),
   piernas/brazos: {a:[ang1,ang2]} o {ik:[x,y]} (cinemática inversa).
   n = extremidad cercana, f = lejana. Suelo en y=170.            */

const RDL_FRAMES = [
  { hip: [110, 90], torso: -88 },
  { hip: [90, 94], torso: -18, hold: 300 },
];

const ANIMS = {
  sentadilla_cajon: {
    props: [{ t: 'rect', x: 56, y: 130, w: 38, h: 40 }, { t: 'db', at: 'handN', v: 1 }],
    base: { leg: { n: { ik: [118, 170] } }, arm: { n: { a: [70, -95] } } },
    frames: [{ hip: [108, 90], torso: -88, hold: 500 }, { hip: [85, 126], torso: -58, hold: 350 }],
    dur: 1400,
  },
  press_suelo: {
    props: [{ t: 'db', at: 'handN' }],
    base: { hip: [125, 160], torso: 180, leg: { n: { ik: [158, 170] } } },
    frames: [{ arm: { n: { a: [160, -75] } }, hold: 300 }, { arm: { n: { a: [270, -90] } }, hold: 300 }],
    dur: 1300,
  },
  remo_mancuerna: {
    props: [{ t: 'rect', x: 128, y: 138, w: 64, h: 32 }, { t: 'db', at: 'handN' }],
    base: { hip: [85, 95], torso: -15, leg: { n: { ik: [78, 170] }, f: { ik: [100, 170] } }, arm: { f: { a: [75, 75] } } },
    frames: [{ arm: { n: { a: [90, 90] } }, hold: 300 }, { arm: { n: { a: [200, 90] } }, hold: 500 }],
    dur: 1300,
  },
  puente: {
    props: [{ t: 'plate', at: 'hip', dy: -10 }],
    base: { leg: { n: { ik: [150, 170] } } },
    frames: [
      { hip: [112, 160], torso: 180, head: 0, arm: { n: { ik: [112, 152], bend: -1 } }, hold: 300 },
      { hip: [108, 128], torso: 148, head: 20, arm: { n: { ik: [108, 120], bend: -1 } }, hold: 700 },
    ],
    dur: 1200,
  },
  press_militar: {
    mode: 'front',
    props: [{ t: 'chairF' }, { t: 'dbh', at: 'handR' }, { t: 'dbh', at: 'handL' }],
    base: { cx: 120, hipY: 118, leg: { a: [70, 90], s: [0.35, 1] } },
    frames: [{ arm: { a: [0, -90] }, hold: 300 }, { arm: { a: [-70, -95] }, hold: 300 }],
    dur: 1300,
  },
  plancha: {
    props: [],
    base: { torso: -2, leg: { n: { ik: [22, 162] } }, footN: 75, arm: { n: { a: [90, 0] } } },
    frames: [{ hip: [98, 140], hold: 900 }, { hip: [98, 141.5], hold: 900 }],
    dur: 1500,
  },
  peso_muerto_rumano: {
    props: [{ t: 'plate', at: 'handN' }],
    base: { leg: { n: { ik: [114, 170] } }, arm: { n: { a: [90, 90] } } },
    frames: RDL_FRAMES.map((f, i) => ({ ...f, hold: i ? 300 : 400 })),
    dur: 1600,
  },
  peso_muerto_mancuernas: {
    props: [{ t: 'db', at: 'handN' }],
    base: { leg: { n: { ik: [114, 170] } }, arm: { n: { a: [90, 90] } } },
    frames: RDL_FRAMES.map((f, i) => ({ ...f, hold: i ? 300 : 400 })),
    dur: 1600,
  },
  flexiones_inclinadas: {
    props: [{ t: 'rect', x: 118, y: 118, w: 76, h: 52 }],
    base: { leg: { n: { ik: [30, 164] } }, footN: 30, arm: { n: { ik: [126, 118], bend: 1 } } },
    frames: [{ hip: [82.7, 101.2], torso: -50, hold: 300 }, { hip: [96.3, 115.8], torso: -36, hold: 300 }],
    dur: 1400,
  },
  remo_barra: {
    props: [{ t: 'plate', at: 'handN' }],
    base: { hip: [92, 94], torso: -30, leg: { n: { ik: [112, 170] } } },
    frames: [{ arm: { n: { a: [90, 90] } }, hold: 300 }, { arm: { n: { a: [165, 90] } }, hold: 450 }],
    dur: 1200,
  },
  sentadilla_pared: {
    props: [{ t: 'rect', x: 44, y: 10, w: 16, h: 160 }],
    base: { torso: -90, leg: { n: { ik: [118, 170] } }, arm: { n: { a: [75, 30] } } },
    frames: [{ hip: [70, 126], hold: 1200 }, { hip: [70, 124.5], hold: 1200 }],
    dur: 1400,
  },
  elevaciones_laterales: {
    mode: 'front',
    props: [{ t: 'dbv', at: 'handR' }, { t: 'dbv', at: 'handL' }],
    base: { cx: 120, hipY: 88, leg: { a: [86, 90], s: [1, 1] } },
    frames: [{ arm: { a: [82, 85] }, hold: 300 }, { arm: { a: [3, 0] }, hold: 400 }],
    dur: 1300,
  },
  curl_biceps: {
    props: [{ t: 'db', at: 'handN' }],
    base: { hip: [110, 90], torso: -90, leg: { n: { ik: [114, 170] } } },
    frames: [{ arm: { n: { a: [92, 90] } }, hold: 300 }, { arm: { n: { a: [96, -75] } }, hold: 300 }],
    dur: 1200,
  },
  extension_triceps: {
    props: [{ t: 'chairS', x: 80, y: 124, w: 42 }, { t: 'db', at: 'handN', v: 1 }],
    base: { hip: [100, 120], torso: -90, leg: { n: { ik: [140, 170] } } },
    frames: [{ arm: { n: { a: [-95, -92] } }, hold: 300 }, { arm: { n: { a: [-95, -235] } }, hold: 300 }],
    dur: 1400,
  },
  dead_bug: {
    props: [],
    base: { hip: [120, 158], torso: 180, leg: { f: { a: [-90, 0] } }, arm: { n: { a: [-90, -90] } } },
    frames: [
      { leg: { n: { a: [-90, 0] } }, arm: { f: { a: [-90, -90] } }, hold: 400 },
      { leg: { n: { a: [-8, -4] } }, arm: { f: { a: [-170, -172] } }, hold: 500 },
    ],
    dur: 1500,
  },
  paseo_granjero: {
    props: [{ t: 'db', at: 'handN' }, { t: 'db', at: 'handF' }],
    base: { torso: -88, arm: { n: { a: [90, 90] }, f: { a: [90, 90] } } },
    frames: [
      { hip: [110, 91], leg: { n: { a: [70, 100] }, f: { a: [110, 85] } }, hold: 0 },
      { hip: [110, 88], leg: { n: { a: [90, 92] }, f: { a: [90, 92] } }, hold: 0 },
      { hip: [110, 91], leg: { n: { a: [110, 85] }, f: { a: [70, 100] } }, hold: 0 },
      { hip: [110, 88], leg: { n: { a: [90, 92] }, f: { a: [90, 92] } }, hold: 0 },
    ],
    dur: 380,
  },
  bird_dog: {
    props: [],
    base: { hip: [88, 126], torso: -15.4, footN: 180, footF: 180, leg: { f: { a: [90, 180] } }, arm: { n: { a: [90, 90] } } },
    frames: [
      { leg: { n: { a: [90, 180] } }, arm: { f: { a: [90, 90] } }, hold: 400 },
      { leg: { n: { a: [178, 180] } }, arm: { f: { a: [-8, -6] } }, hold: 900 },
    ],
    dur: 1400,
  },
  abduccion_cadera: {
    props: [], lat: 'y',
    base: { hip: [128, 158], torso: 180, footN: 0, footF: 0, leg: { f: { a: [2, 0] } }, arm: { n: { a: [2, 2] }, f: { a: [180, 180] } } },
    frames: [{ leg: { n: { a: [1, 0] } }, hold: 300 }, { leg: { n: { a: [-28, -28] } }, hold: 500 }],
    dur: 1300,
  },
  elevacion_talones: {
    props: [{ t: 'rect', x: 150, y: 20, w: 14, h: 150 }],
    base: { torso: -90, arm: { n: { ik: [149, 74], bend: 1 } } },
    frames: [
      { hip: [110, 90], leg: { n: { ik: [114, 170] } }, footN: 0, hold: 300 },
      { hip: [110, 82], leg: { n: { ik: [114, 162] } }, footN: 40, hold: 500 },
    ],
    dur: 1000,
  },
  swing: {
    props: [{ t: 'db', at: 'handN', v: 1 }],
    base: { leg: { n: { ik: [116, 170] } } },
    frames: [
      { hip: [92, 95], torso: -25, arm: { n: { a: [110, 112] } }, hold: 80 },
      { hip: [110, 90], torso: -88, arm: { n: { a: [5, 0] } }, hold: 150 },
    ],
    dur: 650,
  },
  eliptica: (() => {
    const N = 10, frames = [];
    for (let k = 0; k < N; k++) {
      const t = (2 * Math.PI * k) / N, c = Math.cos(t), s = Math.sin(t);
      frames.push({
        hip: [108, 82 + 1.5 * Math.sin(2 * t)],
        leg: { n: { ik: [116 + 16 * c, 156 + 5 * s] }, f: { ik: [116 - 16 * c, 156 - 5 * s] } },
        arm: { n: { ik: [140 - 10 * c, 78], bend: 1 }, f: { ik: [140 + 10 * c, 78], bend: 1 } },
        hold: 0,
      });
    }
    return { props: [{ t: 'ellip' }], base: { torso: -84 }, frames, dur: 140 };
  })(),
};

/* ---------- Ejercicios ---------- */
const EJERCICIOS = {
  sentadilla_cajon: {
    nombre: 'Sentadilla a cajón / silla',
    musculos: 'Cuádriceps, glúteos, core',
    equipo: 'Silla firme o cajón (+ 1 mancuerna opcional)',
    tipo: 'fuerza', step: 2,
    pasos: [
      'Párate frente a una silla firme, pies al ancho de hombros y puntas levemente hacia afuera.',
      'Si usas peso, sostén la mancuerna vertical pegada al pecho, codos hacia abajo.',
      'Lleva la cadera hacia atrás como si te fueras a sentar; baja controlado (2-3 s).',
      'Toca la silla con los glúteos SIN dejarte caer ni relajarte.',
      'Empuja el suelo con todo el pie y sube apretando glúteos.',
    ],
    errores: ['Rodillas que se van hacia adentro', 'Talones que se despegan del suelo', 'Dejarse caer sobre la silla'],
    rodilla: 'La silla limita la profundidad y protege la rodilla. Si molesta, usa una superficie más alta (agrega un cojín). Empuja las rodillas levemente hacia afuera, en línea con el 2º dedo del pie.',
    yt: 'sentadilla a cajón goblet técnica',
  },
  press_suelo: {
    nombre: 'Press de pecho con mancuernas (suelo o banco)',
    musculos: 'Pectoral, tríceps, hombro anterior',
    equipo: '2 mancuernas',
    tipo: 'fuerza', step: 2,
    pasos: [
      'Acuéstate boca arriba en el suelo (rodillas flexionadas) o en un banco plano.',
      'Mancuernas a la altura del pecho, codos a ~45° del cuerpo (no abiertos en cruz).',
      'Empuja hacia arriba hasta estirar los brazos, sin chocar las mancuernas.',
      'Baja controlado hasta que la parte de atrás del brazo toque el suelo suavemente.',
      'Pausa 1 segundo y vuelve a empujar.',
    ],
    errores: ['Codos totalmente abiertos (estresa el hombro)', 'Rebotar el codo en el suelo', 'Arquear mucho la espalda'],
    rodilla: 'Ejercicio sin carga en rodillas.',
    yt: 'floor press mancuernas técnica',
  },
  remo_mancuerna: {
    nombre: 'Remo con mancuerna apoyado',
    musculos: 'Espalda (dorsal, romboides), bíceps',
    equipo: '1 mancuerna + silla o banco',
    tipo: 'fuerza', step: 2, porLado: true,
    pasos: [
      'Apoya una mano en una silla o banco, espalda recta y casi paralela al suelo.',
      'Pies separados y firmes; rodillas levemente flexionadas.',
      'Con el otro brazo estirado, toma la mancuerna.',
      'Tira llevando el codo hacia la cadera (no hacia el hombro).',
      'Aprieta la escápula arriba 1 s y baja controlado. Completa un lado y cambia.',
    ],
    errores: ['Girar el tronco para subir el peso', 'Encoger el hombro hacia la oreja', 'Espalda redondeada'],
    rodilla: 'No apoyes la rodilla en el banco: mantén ambos pies en el suelo, así evitas presión sobre la rótula.',
    yt: 'remo con mancuerna a una mano técnica',
  },
  puente: {
    nombre: 'Puente de glúteo (con barra o mancuerna)',
    musculos: 'Glúteos, isquiotibiales, core',
    equipo: 'Barra olímpica o mancuerna (usa una toalla sobre la cadera)',
    tipo: 'fuerza', step: 2,
    pasos: [
      'Acuéstate boca arriba, rodillas dobladas y pies apoyados a 1 palmo de los glúteos.',
      'Coloca el peso sobre la cadera (con toalla) y sujétalo con las manos.',
      'Aprieta glúteos y sube la cadera hasta formar una línea hombros-cadera-rodillas.',
      'Mantén 1-2 s arriba sin arquear la zona lumbar.',
      'Baja lento sin apoyar del todo y repite.',
    ],
    errores: ['Empujar con la espalda baja en vez de glúteos', 'Pies muy lejos (se cargan isquios)', 'Bajar de golpe'],
    rodilla: 'Excelente para tus rodillas: fortalece glúteos sin cargar la rótula. Si sientes la rodilla, acerca un poco los pies.',
    yt: 'hip thrust en el suelo con barra técnica',
  },
  press_militar: {
    nombre: 'Press de hombros sentado',
    musculos: 'Hombros, tríceps',
    equipo: '2 mancuernas + silla con respaldo',
    tipo: 'fuerza', step: 2,
    pasos: [
      'Siéntate con la espalda apoyada en el respaldo y pies firmes.',
      'Mancuernas a la altura de los hombros, palmas al frente, codos levemente adelante.',
      'Empuja hacia arriba hasta casi estirar los brazos.',
      'Baja controlado hasta la altura de las orejas/hombros.',
    ],
    errores: ['Arquear la espalda baja', 'Bajar demasiado rápido', 'Bloquear codos con fuerza arriba'],
    rodilla: 'Sentado, sin carga en rodillas.',
    yt: 'press de hombros sentado mancuernas técnica',
  },
  plancha: {
    nombre: 'Plancha en antebrazos',
    musculos: 'Core (abdomen, oblicuos), hombros',
    equipo: 'Peso corporal (colchoneta)',
    tipo: 'tiempo',
    pasos: [
      'Apoya antebrazos con codos bajo los hombros.',
      'Estira las piernas apoyando las puntas de los pies.',
      'Aprieta glúteos y abdomen: cuerpo en línea recta de cabeza a talones.',
      'Respira normal y mantén el tiempo indicado.',
    ],
    errores: ['Cadera hundida (duele la lumbar)', 'Cadera muy alta', 'Aguantar la respiración'],
    rodilla: 'Si es muy difícil, hazla con rodillas apoyadas sobre un cojín.',
    yt: 'plancha abdominal técnica correcta',
  },
  peso_muerto_rumano: {
    nombre: 'Peso muerto rumano con barra',
    musculos: 'Isquiotibiales, glúteos, espalda baja',
    equipo: 'Barra olímpica (20 kg) + discos',
    tipo: 'fuerza', step: 20, nota: 'Con discos de 10 kg sube de a 20 kg (1 por lado). Antes de subir, alarga reps o baja más lento.',
    pasos: [
      'De pie, barra en las manos al ancho de hombros, pies al ancho de cadera.',
      'Rodillas levemente flexionadas y FIJAS durante todo el movimiento.',
      'Empuja la cadera hacia atrás; la barra baja rozando los muslos.',
      'Baja hasta sentir estiramiento atrás del muslo (media canilla aprox.), espalda recta.',
      'Sube apretando glúteos y llevando la cadera adelante.',
    ],
    errores: ['Redondear la espalda', 'Convertirlo en sentadilla (doblar mucho la rodilla)', 'Alejar la barra del cuerpo'],
    rodilla: 'Es un ejercicio de cadera: la rodilla casi no se mueve, ideal para ti.',
    yt: 'peso muerto rumano con barra técnica',
  },
  peso_muerto_mancuernas: {
    nombre: 'Peso muerto rumano con mancuernas',
    musculos: 'Isquiotibiales, glúteos, espalda baja',
    equipo: '2 mancuernas',
    tipo: 'fuerza', step: 2,
    pasos: [
      'De pie con una mancuerna en cada mano frente a los muslos.',
      'Rodillas suaves y fijas, espalda recta.',
      'Cadera atrás, las mancuernas bajan pegadas a las piernas.',
      'Al sentir el estiramiento atrás del muslo, sube apretando glúteos.',
    ],
    errores: ['Espalda redondeada', 'Mirar hacia arriba forzando el cuello', 'Doblar mucho las rodillas'],
    rodilla: 'Movimiento de cadera, bajo estrés para la rodilla.',
    yt: 'peso muerto rumano mancuernas técnica',
  },
  flexiones_inclinadas: {
    nombre: 'Flexiones inclinadas',
    musculos: 'Pectoral, tríceps, core',
    equipo: 'Mesa firme, sofá o banco',
    tipo: 'fuerza', step: 0, nota: 'Para progresar: usa una superficie más baja (mesa → sofá → silla → suelo).',
    pasos: [
      'Apoya las manos en el borde de una mesa firme, algo más abiertas que los hombros.',
      'Lleva los pies atrás hasta que el cuerpo quede en línea recta.',
      'Baja el pecho hacia el borde con codos a ~45°.',
      'Empuja hasta estirar los brazos manteniendo el cuerpo recto.',
    ],
    errores: ['Cadera hundida o levantada', 'Codos abiertos en cruz', 'Recorrido muy corto'],
    rodilla: 'Sin carga para la rodilla.',
    yt: 'flexiones inclinadas en mesa técnica',
  },
  remo_barra: {
    nombre: 'Remo inclinado (barra o mancuernas)',
    musculos: 'Espalda media, dorsales, bíceps',
    equipo: 'Barra olímpica o 2 mancuernas',
    tipo: 'fuerza', step: 2,
    pasos: [
      'Toma el peso, rodillas levemente flexionadas, inclina el tronco ~45° con espalda recta.',
      'Brazos estirados colgando bajo los hombros.',
      'Tira del peso hacia el ombligo llevando los codos atrás.',
      'Aprieta la espalda 1 s y baja controlado.',
    ],
    errores: ['Usar impulso con el tronco', 'Redondear la espalda', 'Subir el peso hacia el pecho'],
    rodilla: 'Rodillas suaves, sin flexionar de más.',
    yt: 'remo inclinado con barra técnica',
  },
  sentadilla_pared: {
    nombre: 'Sentadilla isométrica en pared',
    musculos: 'Cuádriceps, glúteos',
    equipo: 'Pared',
    tipo: 'tiempo',
    pasos: [
      'Apoya la espalda en la pared y adelanta los pies ~50 cm.',
      'Desliza la espalda hacia abajo hasta una flexión de rodilla cómoda (NO tienes que llegar a 90°).',
      'Rodillas sobre los tobillos, peso en los talones.',
      'Mantén el tiempo indicado respirando normal.',
    ],
    errores: ['Rodillas por delante de las puntas', 'Bajar más de lo que tolera la rodilla', 'Aguantar la respiración'],
    rodilla: 'Los isométricos suelen ALIVIAR el dolor de rótula. Busca una molestia máxima de 2/10. Con el tiempo podrás bajar más.',
    yt: 'sentadilla isométrica en pared wall sit técnica',
  },
  elevaciones_laterales: {
    nombre: 'Elevaciones laterales',
    musculos: 'Hombro (deltoides lateral)',
    equipo: '2 mancuernas livianas',
    tipo: 'fuerza', step: 1,
    pasos: [
      'De pie, mancuernas a los costados y codos levemente flexionados.',
      'Sube los brazos hacia los lados hasta la altura de los hombros.',
      'Pausa breve arriba y baja lento (2-3 s).',
    ],
    errores: ['Usar impulso con el cuerpo', 'Subir más arriba de los hombros', 'Encoger los hombros'],
    rodilla: 'Puedes hacerlo sentado si prefieres.',
    yt: 'elevaciones laterales mancuernas técnica',
  },
  curl_biceps: {
    nombre: 'Curl de bíceps',
    musculos: 'Bíceps, antebrazo',
    equipo: '2 mancuernas',
    tipo: 'fuerza', step: 2,
    pasos: [
      'De pie, mancuernas a los costados, palmas al frente.',
      'Codos pegados al cuerpo; sube flexionando solo el codo.',
      'Aprieta arriba y baja lento hasta estirar casi completo.',
    ],
    errores: ['Balancear el cuerpo', 'Mover los codos hacia adelante', 'Bajar sin control'],
    rodilla: '—',
    yt: 'curl de bíceps con mancuernas técnica',
  },
  extension_triceps: {
    nombre: 'Extensión de tríceps sobre la cabeza',
    musculos: 'Tríceps',
    equipo: '1 mancuerna + silla',
    tipo: 'fuerza', step: 2,
    pasos: [
      'Sentado con espalda recta, toma una mancuerna con ambas manos sobre la cabeza.',
      'Codos apuntando al frente/techo, cerca de la cabeza.',
      'Baja la mancuerna por detrás de la cabeza doblando solo los codos.',
      'Estira los brazos de nuevo sin arquear la espalda.',
    ],
    errores: ['Abrir mucho los codos', 'Arquear la lumbar', 'Peso excesivo'],
    rodilla: 'Sentado, sin carga en rodillas.',
    yt: 'extensión de tríceps sobre la cabeza mancuerna sentado',
  },
  dead_bug: {
    nombre: 'Dead bug (bicho muerto)',
    musculos: 'Core profundo, estabilidad lumbar',
    equipo: 'Peso corporal',
    tipo: 'fuerza', step: 0, porLado: true,
    pasos: [
      'Boca arriba, brazos estirados al techo, caderas y rodillas a 90° (posición de mesa).',
      'Pega la zona lumbar al suelo y mantenla así todo el ejercicio.',
      'Estira lentamente un brazo atrás y la pierna contraria adelante.',
      'Vuelve al centro y alterna. Exhala al estirar.',
    ],
    errores: ['Despegar la lumbar del suelo', 'Hacerlo rápido', 'Aguantar la respiración'],
    rodilla: 'Si molesta estirar la pierna, solo toca el suelo con el talón manteniendo la rodilla doblada.',
    yt: 'dead bug ejercicio core técnica',
  },
  paseo_granjero: {
    nombre: 'Paseo del granjero',
    musculos: 'Agarre, core, trapecio, cardio',
    equipo: '2 mancuernas pesadas',
    tipo: 'tiempo', step: 2,
    pasos: [
      'Toma una mancuerna pesada en cada mano (levántalas con la técnica del peso muerto).',
      'Párate erguido: hombros atrás y abajo, abdomen firme.',
      'Camina con pasos cortos y controlados por el tiempo indicado.',
      'Déjalas en el suelo con la espalda recta.',
    ],
    errores: ['Inclinarse hacia un lado', 'Encoger hombros', 'Pasos largos y apurados'],
    rodilla: 'Camina en superficie plana con pasos cortos; evita escaleras.',
    yt: 'farmer walk paseo del granjero técnica',
  },
  bird_dog: {
    nombre: 'Bird dog (cuadrupedia)',
    musculos: 'Core, glúteos, espalda baja',
    equipo: 'Colchoneta',
    tipo: 'fuerza', step: 0, porLado: true,
    pasos: [
      'En 4 apoyos: manos bajo hombros, rodillas bajo caderas.',
      'Estira un brazo al frente y la pierna contraria atrás, sin girar la cadera.',
      'Mantén 2-3 s formando una línea recta.',
      'Vuelve y alterna lados.',
    ],
    errores: ['Arquear la espalda', 'Girar la cadera', 'Hacerlo rápido'],
    rodilla: 'Usa un cojín o colchoneta doble bajo las rodillas.',
    yt: 'bird dog ejercicio técnica',
  },
  abduccion_cadera: {
    nombre: 'Abducción de cadera acostado',
    musculos: 'Glúteo medio (estabiliza la rodilla)',
    equipo: 'Peso corporal',
    tipo: 'fuerza', step: 0, porLado: true,
    pasos: [
      'Acuéstate de lado con las piernas estiradas y el cuerpo en línea recta.',
      'Con la punta del pie mirando al frente (no al techo), sube la pierna de arriba.',
      'Sube hasta ~30-40° sin girar la cadera hacia atrás.',
      'Baja lento. Completa las reps y cambia de lado.',
    ],
    errores: ['Rotar la punta del pie hacia el techo', 'Llevar la pierna adelante', 'Subir demasiado alto'],
    rodilla: 'Clave para ti: un glúteo medio fuerte evita que la rodilla se vaya hacia adentro en escaleras.',
    yt: 'abducción de cadera acostado de lado glúteo medio',
  },
  elevacion_talones: {
    nombre: 'Elevación de talones (pantorrillas)',
    musculos: 'Pantorrillas, tobillo',
    equipo: 'Pared para apoyo (opcional mancuerna)',
    tipo: 'fuerza', step: 2,
    pasos: [
      'De pie frente a una pared, manos apoyadas para equilibrio.',
      'Sube en puntas de pie lo más alto posible.',
      'Pausa 1 s arriba y baja lento (3 s).',
    ],
    errores: ['Rebotar', 'Rango corto', 'Doblar las rodillas'],
    rodilla: 'Fortalece la cadena de la pierna completa y mejora la estabilidad en escaleras.',
    yt: 'elevación de talones de pie técnica',
  },
  swing: {
    nombre: 'Swing con mancuerna',
    musculos: 'Glúteos, isquios, core, cardio',
    equipo: '1 mancuerna (sujetar de un extremo con ambas manos)',
    tipo: 'tiempo', step: 2,
    pasos: [
      'Pies algo más abiertos que la cadera; mancuerna con ambas manos.',
      'Bisagra de cadera: lleva la mancuerna atrás entre las piernas (espalda recta).',
      'Extiende la cadera con fuerza: la mancuerna sube por inercia hasta el pecho.',
      'Déjala caer y repite el ciclo en forma fluida.',
    ],
    errores: ['Levantar con los brazos', 'Hacer sentadilla en vez de bisagra', 'Arquear atrás arriba'],
    rodilla: 'La potencia viene de la cadera, no de la rodilla. Si te molesta, cámbialo por peso muerto rumano.',
    yt: 'swing con mancuerna técnica',
  },
  eliptica: {
    nombre: 'Máquina elíptica',
    musculos: 'Cardio, piernas',
    equipo: 'Elíptica',
    tipo: 'cardio',
    pasos: [
      'Postura erguida, mirada al frente, abdomen activo.',
      'Pies completos sobre los pedales; empuja con talón y mitad del pie.',
      'Usa los brazos para ayudar a empujar y tirar.',
      'Ajusta la resistencia para estar en la zona indicada (ver ritmo cardíaco).',
    ],
    errores: ['Apoyarse en las manillas con todo el peso', 'Ir en puntas de pie', 'Resistencia tan baja que no hay esfuerzo'],
    rodilla: 'Cardio de bajo impacto ideal para ti. Mantén la rodilla alineada con el pie y evita resistencias muy altas con cadencia muy lenta.',
    yt: 'como usar la elíptica correctamente postura',
  },
};

/* ---------- Programa ----------
   rx por fase: [series, reps, descanso_s]  (null = no se hace en esa fase)
   Fase 1 = semanas 1-4 · Fase 2 = 5-8 · Fase 3 = 9-12 · descarga en semanas 4 y 8 */
const FASES = [
  { n: 1, nombre: 'Adaptación', semanas: '1 – 4', desc: 'Aprender la técnica, crear el hábito y preparar articulaciones. Pesos cómodos: termina cada serie con 2-3 repeticiones "en reserva".' },
  { n: 2, nombre: 'Desarrollo', semanas: '5 – 8', desc: 'Más series y cargas. Aparecen los intervalos en la elíptica para mejorar tu capacidad cardiovascular.' },
  { n: 3, nombre: 'Intensificación', semanas: '9 – 12', desc: 'Más volumen e intervalos más exigentes. Mide tu progreso: peso, cintura y minutos de cardio.' },
];

// Las sesiones se generan según el perfil: ver js/plan.js

const CALENTAMIENTO = {
  normal: ['5 min de cardio suave (puedes conversar sin problema)', '10 círculos de brazos adelante y atrás', '10 bisagras de cadera sin peso', '10 sentadillas sin peso (lentas, a una silla si tienes molestias de rodilla)', '10 puentes de glúteo'],
  corto: ['3 min de cardio muy suave', '10 círculos de brazos', '10 puentes de glúteo'],
};
// Vuelta a la calma (3-5 min): baja pulsaciones y devuelve movilidad. Estiramientos suaves, sin rebote ni dolor.
const VUELTA_CALMA = ['2-3 min de cardio o caminata muy suave', '5 respiraciones lentas: inhala 4 s, exhala 6 s',
  'Flexor de cadera de pie (un pie adelante, glúteo apretado): 30 s por lado', 'Isquiotibiales: talón sobre un escalón bajo, espalda recta, 30 s por lado',
  'Pecho en el marco de una puerta: 30 s', 'Pantorrillas contra la pared: 30 s por lado'];
// Tempo (velocidad de cada repetición) según la fase
const TEMPO = { 1: 'baja en 3 s, pausa breve y sube controlado', 2: 'baja en 2-3 s y sube con fuerza, sin rebotes', 3: 'baja en 2 s y sube con fuerza, sin rebotes' };

/* Prescripción de cardio según semana, máquina (mod) y objetivo (factor) */
function cardioRx(kind, semana, mod, factor = 1) {
  const w = Math.min(semana, 12);
  const m = mod || { label: 'Elíptica', fuerte: 'sube la cadencia' };
  const esc = (x) => Math.max(5, Math.round(x * factor));
  if (kind === 'final') {
    const min = esc(w <= 4 ? 10 : w <= 8 ? 12 : 15);
    return { titulo: `${m.label} final · ${min} min`, min, detalle: 'Zona 2: ritmo constante en el que puedes hablar en frases cortas.', zona: 'z2' };
  }
  if (kind === 'z2') {
    const min = esc(Math.min(20 + (w - 1) * 2, 40));
    return { titulo: `${m.label} continua · ${min} min`, min, detalle: 'Zona 2 todo el tiempo. Si al principio no alcanzas, haz pausas de 1 min y continúa: lo importante es completar los minutos.', zona: 'z2' };
  }
  // intervalos
  if (w <= 4) {
    const min = esc(15 + w);
    return { titulo: `${m.label} progresiva · ${min} min`, min, detalle: `Zona 2 constante. En los últimos ${w <= 2 ? 4 : 6} min haz 30 s más intensos cada 1 min (${m.fuerte}).`, zona: 'z2' };
  }
  const rep = factor >= 1.2 ? 1 : factor < 0.9 ? -1 : 0;
  if (w <= 8) {
    const n = 6 + rep, min = 8 + n * 3;
    return { titulo: `Intervalos ${m.label} · ${min} min`, min, detalle: `5 min suave → ${n} × (1 min FUERTE + 2 min suave) → 3 min suave. FUERTE = ${m.fuerte}.`, zona: 'int' };
  }
  const n = 8 + rep, min = Math.round(8 + n * 2.5);
  return { titulo: `Intervalos ${m.label} · ${min} min`, min, detalle: `5 min suave → ${n} × (1 min FUERTE + 1:30 suave) → 3 min suave. FUERTE = ${m.fuerte}.`, zona: 'int' };
}

/* ---------- Alimentación ---------- */
const CONSEJOS_COMIDA = [
  ['Método del plato', 'En almuerzo: ½ plato de verduras, ¼ proteína (pollo, pescado, carne magra, huevo, legumbres) y ¼ carbohidrato (arroz, papa, fideos, pan).'],
  ['Proteína en cada comida', 'Es lo que más te ayuda a no perder músculo y a tener menos hambre. Intenta 25-40 g en desayuno, almuerzo y once.'],
  ['Agua', 'Apunta a ~30-35 ml por kilo al día (más en días de entrenamiento). Antes de cada comida, 1 vaso de agua.'],
  ['Bebidas y alcohol', 'Bebidas solo zero. El alcohol aporta muchas calorías: máximo 1-2 veces por semana y en poca cantidad.'],
  ['Pan', 'La marraqueta completa son ~270 kcal. Prefiere integral y 1 unidad por comida como máximo.'],
  ['Regla 80/20', 'Si cumples el plan el 80% del tiempo, un antojo planificado (ej. el fin de semana) no arruina el progreso.'],
  ['Pésate bien', '1 vez por semana, el mismo día (ej. martes), al despertar, después de ir al baño y antes de comer. Mide también la cintura a la altura del ombligo.'],
  ['Si no bajas en 2-3 semanas', 'Reduce unos 150-200 kcal (ej. ½ porción de carbohidrato en la once) o suma 10 min de elíptica.'],
];

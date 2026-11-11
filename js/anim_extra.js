/* ============================================================
   ANIMACIONES PROPIAS de ejercicios que antes reutilizaban la de otro
   (v1.22). Se carga después de anim3d.js: reemplaza ANIMS[id].
   Vista lateral: ángulos 0 = adelante, 90 = abajo, -90 = arriba;
   o = [o1, o2] inclina brazo/pierna hacia el costado (abrir).
   Vista frontal: rot gira la figura (acostado de lado), s = escorzo.
   ============================================================ */
(() => {
  const { frontJoints, sideJoints } = Fig._int;
  const mezcla = (a, b) => {
    const o = structuredClone(a);
    for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && o[k] && typeof o[k] === 'object' ? mezcla(o[k], b[k]) : structuredClone(b[k]);
    return o;
  };
  // baja/sube cada cuadro de una animación frontal para que el punto más bajo de "pts" toque el suelo
  const apoyar = (anim, pts, y = 168) => {
    anim.frames = anim.frames.map((f) => {
      const p = mezcla(anim.base, f), J = frontJoints(p);
      const d = y - Math.max(...pts.map((k) => J[k][1]));
      const out = { ...f, hipY: p.hipY + d };
      if (p.rp) out.rp = [p.rp[0], p.rp[1] + d];
      return out;
    });
    return anim;
  };
  // ídem para vista lateral (mueve la cadera)
  const apoyarL = (anim, pts, y = 170) => {
    anim.frames = anim.frames.map((f) => {
      const p = mezcla(anim.base, f), J = sideJoints(p);
      const d = y - Math.max(...pts.map((k) => J[k][1]));
      return { ...f, hip: [p.hip[0], p.hip[1] + d] };
    });
    return anim;
  };
  const BANCO = [{ t: 'rect', x: 40, y: 124, w: 110, h: 8 }, { t: 'rect', x: 60, y: 132, w: 8, h: 38 }, { t: 'rect', x: 122, y: 132, w: 8, h: 38 }];
  const DE_PIE = { hip: [110, 90], torso: -90, leg: { n: { ik: [114, 170] } } };

  const A = {
    /* ---------- Hombros ---------- */
    pajaros: {
      props: [{ t: 'dbv', at: 'handN' }],
      base: { hip: [92, 96], torso: -22, leg: { n: { ik: [110, 170] } } },
      frames: [{ arm: { n: { a: [90, 90], o: [4, 4] } }, hold: 300 }, { arm: { n: { a: [92, 92], o: [80, 72] } }, hold: 400 }],
      dur: 1300,
    },
    elevaciones_frontales: {
      props: [{ t: 'db', at: 'handN' }],
      base: DE_PIE,
      frames: [{ arm: { n: { a: [84, 86] } }, hold: 300 }, { arm: { n: { a: [0, -2] } }, hold: 350 }],
      dur: 1300,
    },
    face_pull: {
      props: [{ t: 'line', x1: 192, y1: 14, x2: 192, y2: 170, w: 6 }, { t: 'cable', from: 'handN', to: [192, 36], toz: 0 }],
      base: { hip: [96, 90], torso: -90, leg: { n: { ik: [100, 170] } } },
      frames: [{ arm: { n: { a: [-14, -12], o: [6, 6] } }, hold: 250 }, { arm: { n: { a: [-4, -96], o: [74, -18] } }, hold: 450 }],
      dur: 1300,
    },
    press_militar_pie: {
      mode: 'front',
      props: [{ t: 'dbh', at: 'handR' }, { t: 'dbh', at: 'handL' }],
      base: { cx: 120, hipY: 88, leg: { a: [87, 90] } },
      frames: [{ arm: { a: [0, -90] }, hold: 300 }, { arm: { a: [-70, -95] }, hold: 300 }],
      dur: 1300,
    },
    press_hombro_banda: {
      mode: 'front',
      props: [{ t: 'cable', from: 'handR', to: [132, 170] }, { t: 'cable', from: 'handL', to: [108, 170] }],
      base: { cx: 120, hipY: 88, leg: { a: [87, 90] } },
      frames: [{ arm: { a: [0, -90] }, hold: 300 }, { arm: { a: [-70, -95] }, hold: 300 }],
      dur: 1300,
    },

    /* ---------- Brazos ---------- */
    press_frances: {
      props: [...BANCO, { t: 'db', at: 'handN' }],
      base: { hip: [130, 116], torso: 180, leg: { n: { ik: [166, 170] } } },
      frames: [{ arm: { n: { a: [-98, -96] } }, hold: 300 }, { arm: { n: { a: [-104, -218] } }, hold: 300 }],
      dur: 1300,
    },
    patada_triceps: {
      props: [{ t: 'rect', x: 128, y: 138, w: 64, h: 32 }, { t: 'db', at: 'handN' }],
      base: { hip: [85, 95], torso: -15, leg: { n: { ik: [78, 170] }, f: { ik: [100, 170] } }, arm: { f: { a: [75, 75] } } },
      frames: [{ arm: { n: { a: [162, 92] } }, hold: 250 }, { arm: { n: { a: [166, 168] } }, hold: 450 }],
      dur: 1200,
    },
    fondos_banco: {
      props: [{ t: 'rect', x: 30, y: 122, w: 46, h: 48 }],
      base: { arm: { n: { ik: [74, 120], bend: 1 } }, leg: { n: { ik: [168, 170] } } },
      frames: [{ hip: [92, 112], torso: -88, hold: 300 }, { hip: [95, 138], torso: -84, hold: 300 }],
      dur: 1400,
    },

    /* ---------- Espalda ---------- */
    remo_pecho_apoyado: {
      props: [{ t: 'line', x1: 92, y1: 128, x2: 142, y2: 90, w: 9 }, { t: 'line', x1: 118, y1: 110, x2: 118, y2: 170, w: 5 }, { t: 'line', x1: 92, y1: 170, x2: 144, y2: 170, w: 5 }, { t: 'db', at: 'handN' }],
      base: { hip: [92, 110], torso: -40, leg: { n: { ik: [48, 170] } } },
      frames: [{ arm: { n: { a: [90, 90] } }, hold: 300 }, { arm: { n: { a: [195, 92] } }, hold: 450 }],
      dur: 1300,
    },
    remo_banda_pie: {
      props: [{ t: 'line', x1: 194, y1: 14, x2: 194, y2: 170, w: 6 }, { t: 'cable', from: 'handN', to: [194, 52], toz: 0 }],
      base: { hip: [100, 91], torso: -88, leg: { n: { ik: [106, 170] } } },
      frames: [{ arm: { n: { a: [4, 2] } }, hold: 250 }, { arm: { n: { a: [158, -4] } }, hold: 450 }],
      dur: 1300,
    },

    /* ---------- Pecho ---------- */
    press_pecho_banda: {
      props: [{ t: 'cable', from: 'handN', to: [86, 40] }],
      base: { hip: [100, 91], torso: -88, leg: { n: { ik: [106, 170] }, f: { ik: [88, 170] } } },
      frames: [{ arm: { n: { a: [160, -4] } }, hold: 250 }, { arm: { n: { a: [2, 0] } }, hold: 350 }],
      dur: 1300,
    },
    flexiones_rodillas: {
      props: [],
      base: { arm: { n: { ik: [150, 170], bend: 1 } } },
      frames: [
        { hip: [103.3, 143.2], torso: -32.9, leg: { n: { a: [147, -150] } }, hold: 300 },
        { hip: [109.2, 158], torso: -11, leg: { n: { a: [169, -150] } }, hold: 300 },
      ],
      dur: 1300,
    },

    /* ---------- Piernas ---------- */
    curl_femoral_maquina: {
      props: [{ t: 'rect', x: 30, y: 131, w: 122, h: 7 }, { t: 'rect', x: 50, y: 138, w: 8, h: 32 }, { t: 'rect', x: 130, y: 138, w: 8, h: 32 }, { t: 'bar', at: 'an', ang: 90, len: 12 }],
      face: -1,
      base: { hip: [110, 123], torso: 180, arm: { n: { a: [96, 70] } } },
      frames: [{ leg: { n: { a: [1, 2] } }, hold: 250 }, { leg: { n: { a: [0, -98] } }, hold: 350 }],
      dur: 1200,
    },
    talones_sentado: {
      props: [{ t: 'chairS', x: 80, y: 124, w: 42 }, { t: 'db', at: 'kn' }],
      base: { hip: [100, 119], torso: -90, arm: { n: { ik: [140, 114], bend: 1 } } },
      frames: [{ leg: { n: { ik: [142, 160] } }, footN: 0, hold: 300 }, { leg: { n: { ik: [143, 151] } }, footN: 42, hold: 450 }],
      dur: 1000,
    },
    peso_muerto_una_pierna: {
      props: [{ t: 'db', at: 'handN', v: 1 }],
      base: { leg: { n: { ik: [114, 170] } }, arm: { n: { a: [90, 90] }, f: { a: [88, 80] } } },
      frames: [
        { hip: [110, 90], torso: -88, leg: { f: { a: [96, 96] } }, hold: 350 },
        { hip: [96, 92], torso: -14, leg: { f: { a: [166, 166] } }, hold: 350 },
      ],
      dur: 1600,
    },
    puente_isquios: {
      props: [],
      base: { leg: { n: { ik: [172, 170] } } },
      frames: [
        { hip: [112, 160], torso: 180, head: 0, arm: { n: { ik: [112, 152], bend: -1 } }, hold: 300 },
        { hip: [110, 136], torso: 156, head: 16, arm: { n: { ik: [110, 128], bend: -1 } }, hold: 700 },
      ],
      dur: 1200,
    },
    subida_cajon: {
      props: [{ t: 'rect', x: 122, y: 130, w: 56, h: 40 }],
      base: { arm: { n: { a: [90, 90] } } },
      frames: [
        { hip: [100, 92], torso: -82, leg: { n: { ik: [142, 130] }, f: { ik: [102, 170] } }, hold: 300 },
        { hip: [140, 51], torso: -88, leg: { n: { ik: [142, 130] }, f: { ik: [132, 130] } }, hold: 400 },
      ],
      dur: 1500,
    },
    sentadilla_bulgara: {
      props: [{ t: 'rect', x: 18, y: 128, w: 46, h: 42 }, { t: 'db', at: 'handN', v: 1 }],
      base: { arm: { n: { a: [90, 90] } }, footF: 200 },
      frames: [
        { hip: [104, 92], torso: -84, leg: { n: { ik: [128, 170] }, f: { ik: [54, 124] } }, hold: 300 },
        { hip: [96, 124], torso: -78, leg: { n: { ik: [128, 170] }, f: { ik: [54, 124] } }, hold: 300 },
      ],
      dur: 1500,
    },

    /* ---------- Core ---------- */
    crunch_bicicleta: {
      props: [],
      base: { hip: [120, 158], torso: 198, head: -10, arm: { n: { a: [-158, 12], o: [48, 0] } } },
      frames: [
        { leg: { n: { a: [-104, -6] }, f: { a: [-16, -12] } }, hold: 120 },
        { leg: { n: { a: [-16, -12] }, f: { a: [-104, -6] } }, hold: 120 },
      ],
      dur: 750,
    },
    pallof: {
      props: [{ t: 'cable', from: 'handN', to: [112, 56], toz: 95 }],
      base: { hip: [100, 91], torso: -90, leg: { n: { ik: [104, 170] } } },
      frames: [{ arm: { n: { a: [118, -22], o: [-8, -30] } }, hold: 300 }, { arm: { n: { a: [2, 2], o: [-15, -15] } }, hold: 700 }],
      dur: 1300,
    },
    plancha_toque_hombros: {
      props: [],
      base: { hip: [105, 133], torso: -23.8, leg: { n: { ik: [30, 166] } }, footN: 30 },
      frames: [
        { arm: { n: { a: [92.5, 92.5] }, f: { a: [92.5, 92.5] } }, hold: 150 },
        { arm: { n: { a: [104, -118], o: [6, -50] }, f: { a: [92.5, 92.5] } }, hold: 300 },
        { arm: { n: { a: [92.5, 92.5] }, f: { a: [92.5, 92.5] } }, hold: 150 },
        { arm: { n: { a: [92.5, 92.5] }, f: { a: [104, -118], o: [6, -50] } }, hold: 300 },
      ],
      dur: 600,
    },

    /* ---------- Carga ---------- */
    paseo_maleta: (() => {
      const g = structuredClone(ANIMS.paseo_granjero);
      g.props = [{ t: 'db', at: 'handN' }];
      return g;
    })(),
  };

  /* ---------- De lado (vista frontal girada) ---------- */
  // plancha lateral sobre el antebrazo: lado izquierdo abajo; la figura se gira casi horizontal
  A.plancha_lateral = apoyar({
    mode: 'front',
    props: [],
    base: {
      cx: 120, hipY: 80, rp: [120, 162], leg: { a: [90, 90] },
      arm: { a: [84, 96] }, armL: { a: [12, 90], s: [1, 0.12] },
    },
    frames: [{ rot: -74, hold: 900 }, { rot: -73, hold: 900 }],
    dur: 1500,
  }, ['anL', 'eL']);
  A.plancha_lateral_rodillas = apoyar({
    mode: 'front',
    props: [],
    base: {
      cx: 120, hipY: 80, rp: [120, 122], leg: { a: [90, 90], s: [1, 0.12] },
      arm: { a: [84, 96] }, armL: { a: [20, 90], s: [1, 0.12] },
    },
    frames: [{ rot: -66, hold: 900 }, { rot: -65, hold: 900 }],
    dur: 1500,
  }, ['kL', 'eL']);
  // almeja: acostado sobre el lado izquierdo, caderas y rodillas dobladas; abre la rodilla de arriba
  A.almeja = apoyar({
    mode: 'front', vista: 'tq',
    props: [],
    base: {
      cx: 120, hipY: 120, rot: -90,
      legL: { a: [90, 90], s: [0.72, 0.72] },
      arm: { a: [70, 90], s: [0.5, 0.6] }, armL: { a: [-80, -10] },
    },
    frames: [{ leg: { a: [90, 90], s: [0.72, 0.72] }, hold: 300 }, { leg: { a: [52, 118], s: [0.72, 0.72] }, hold: 500 }],
    dur: 1300,
  }, ['shL', 'hpL', 'eL', 'kL', 'anL']);
  // caminata lateral con banda: semisentadilla abriendo y cerrando las piernas
  A.caminata_lateral_banda = apoyar({
    mode: 'front',
    props: [],
    base: { cx: 120, hipY: 98, arm: { a: [96, 40], s: [1, 0.6] } },
    frames: [
      { leg: { a: [72, 102], s: [0.82, 0.95] }, legL: { a: [84, 96], s: [0.82, 0.95] }, hold: 120 },
      { leg: { a: [78, 98], s: [0.82, 0.95] }, legL: { a: [78, 98], s: [0.82, 0.95] }, hold: 200 },
    ],
    dur: 550,
  }, ['anR', 'anL']);

  /* ---------- Grupo 2 (v1.22): biblioteca y sustituciones ---------- */
  const PLANCHA_ALTA = { hip: [105, 133], torso: -23.8 };
  const g = {
    pullover: {
      props: [...BANCO, { t: 'db', at: 'handN', v: 1 }],
      base: { hip: [130, 116], torso: 180, leg: { n: { ik: [166, 170] } } },
      frames: [{ arm: { n: { a: [-92, -90] }, f: { a: [-92, -90] } }, hold: 300 }, { arm: { n: { a: [-170, -166] }, f: { a: [-170, -166] } }, hold: 300 }],
      dur: 1500,
    },
    ytw: {
      props: [], face: -1,
      base: { hip: [120, 160], torso: 182, footN: 80, leg: { n: { a: [0, 0] } } },
      frames: [
        { arm: { n: { a: [196, 196], o: [32, 32] } }, hold: 500 },
        { arm: { n: { a: [-90, -90], o: [80, 80] } }, hold: 500 },
        { arm: { n: { a: [-8, 196], o: [62, 46] } }, hold: 500 },
      ],
      dur: 900,
    },
    press_banca_mancuernas: { ...ANIMS.press_banca, props: [...BANCO, { t: 'db', at: 'handN' }] },
    press_inclinado_mancuernas: {
      props: [{ t: 'line', x1: 146, y1: 140, x2: 72, y2: 98, w: 9 }, { t: 'line', x1: 118, y1: 128, x2: 118, y2: 170, w: 5 }, { t: 'db', at: 'handN' }],
      base: { hip: [128, 124], torso: -146, leg: { n: { ik: [170, 170] } } },
      frames: [{ arm: { n: { a: [128, -78] } }, hold: 300 }, { arm: { n: { a: [-86, -88] } }, hold: 300 }],
      dur: 1300,
    },
    press_pecho_maquina: {
      props: [{ t: 'chairS', x: 80, y: 124, w: 42 }],
      base: { hip: [100, 119], torso: -90, leg: { n: { ik: [146, 170] } } },
      frames: [{ arm: { n: { a: [160, -4] } }, hold: 250 }, { arm: { n: { a: [2, 0] } }, hold: 350 }],
      dur: 1300,
    },
    aperturas_mancuernas: {
      props: [...BANCO, { t: 'dbv', at: 'handN' }],
      base: { hip: [130, 116], torso: 180, leg: { n: { ik: [166, 170] } } },
      frames: [{ arm: { n: { a: [-90, -86], o: [0, 0] } }, hold: 300 }, { arm: { n: { a: [-90, -80], o: [80, 70] } }, hold: 300 }],
      dur: 1500,
    },
    cruce_poleas: {
      props: [{ t: 'cable', from: 'handN', to: [104, -8], toz: 80 }, { t: 'cable', from: 'handF', to: [104, -8], toz: -80 }],
      base: { hip: [104, 92], torso: -80, leg: { n: { ik: [124, 170] }, f: { ik: [92, 170] } } },
      frames: [
        { arm: { n: { a: [-24, -12], o: [78, 68] }, f: { a: [-24, -12], o: [78, 68] } }, hold: 250 },
        { arm: { n: { a: [24, 30], o: [-12, -14] }, f: { a: [24, 30], o: [-12, -14] } }, hold: 400 },
      ],
      dur: 1400,
    },
    flexion_pica: {
      props: [],
      base: { arm: { n: { ik: [150, 170], bend: 1 } }, leg: { n: { ik: [56, 168] } }, footN: 30, head: 20 },
      frames: [{ hip: [100, 96], torso: 26, hold: 300 }, { hip: [102, 96], torso: 48, hold: 300 }],
      dur: 1300,
    },
    flexiones_declinadas: {
      props: [{ t: 'rect', x: 8, y: 132, w: 44, h: 38 }],
      base: { arm: { n: { ik: [172, 170], bend: 1 } }, leg: { n: { ik: [40, 130] } }, footN: 30 },
      frames: [{ hip: [121.3, 119.6], torso: -7.3, hold: 300 }, { hip: [121.1, 142.2], torso: 8.6, hold: 300 }],
      dur: 1300,
    },
    sentadilla_aire: {
      props: [],
      base: { leg: { n: { ik: [118, 170] } } },
      frames: [{ hip: [108, 90], torso: -88, arm: { n: { a: [80, 84] } }, hold: 400 }, { hip: [82, 130], torso: -58, arm: { n: { a: [2, 0] } }, hold: 300 }],
      dur: 1400,
    },
    extension_cuadriceps: {
      props: [{ t: 'chairS', x: 80, y: 124, w: 42 }, { t: 'bar', at: 'an', ang: 90, len: 12 }],
      base: { hip: [100, 119], torso: -96, arm: { n: { a: [84, 84] } } },
      frames: [{ leg: { n: { a: [0, 88] } }, hold: 250 }, { leg: { n: { a: [-2, -4] } }, hold: 400 }],
      dur: 1200,
    },
    extension_terminal_rodilla: {
      props: [{ t: 'cable', from: 'kn', to: [196, 128], toz: 0 }, { t: 'line', x1: 198, y1: 60, x2: 198, y2: 170, w: 5 }],
      base: { leg: { n: { ik: [116, 170] }, f: { ik: [100, 170] } }, arm: { n: { a: [90, 90] } } },
      frames: [{ hip: [106, 96], torso: -84, hold: 250 }, { hip: [110, 89], torso: -90, hold: 500 }],
      dur: 1100,
    },
    equilibrio_una_pierna: {
      props: [],
      base: { torso: -90, leg: { n: { ik: [112, 170] }, f: { a: [14, 94] } } },
      frames: [{ hip: [110, 90], arm: { n: { a: [90, 90], o: [28, 28] } }, hold: 800 }, { hip: [111, 90], arm: { n: { a: [90, 90], o: [34, 34] } }, hold: 800 }],
      dur: 1200,
    },
    buenos_dias: {
      props: [{ t: 'plate', at: 'sh', dy: -4 }],
      base: { leg: { n: { ik: [114, 170] } }, arm: { n: { a: [150, -40] } } },
      frames: [{ hip: [110, 90], torso: -88, hold: 400 }, { hip: [94, 93], torso: -16, hold: 300 }],
      dur: 1600,
    },
    hiperextension: {
      props: [{ t: 'line', x1: 100, y1: 116, x2: 122, y2: 100, w: 9 }, { t: 'line', x1: 110, y1: 110, x2: 110, y2: 170, w: 5 }, { t: 'line', x1: 30, y1: 156, x2: 62, y2: 156, w: 6 }, { t: 'line', x1: 46, y1: 156, x2: 70, y2: 170, w: 5 }],
      base: { hip: [104, 98], leg: { n: { ik: [44, 150] } } },
      frames: [{ torso: 58, arm: { n: { a: [120, -50] } }, hold: 300 }, { torso: -36, arm: { n: { a: [12, -120] } }, hold: 400 }],
      dur: 1500,
    },
    hip_thrust_banco: {
      props: [{ t: 'rect', x: 30, y: 122, w: 46, h: 48 }, { t: 'plate', at: 'hip', dy: -10 }],
      base: { leg: { n: { ik: [150, 170] } }, arm: { n: { a: [96, 20] } } },
      frames: [{ hip: [108, 152], torso: -138, hold: 300 }, { hip: [122, 116], torso: 180, hold: 600 }],
      dur: 1300,
    },
    puente_una_pierna: {
      props: [],
      base: { leg: { n: { ik: [150, 170] } } },
      frames: [
        { hip: [112, 160], torso: 180, head: 0, arm: { n: { ik: [112, 152], bend: -1 } }, leg: { f: { a: [-62, -16] } }, hold: 300 },
        { hip: [108, 128], torso: 148, head: 20, arm: { n: { ik: [108, 120], bend: -1 } }, leg: { f: { a: [-34, -32] } }, hold: 700 },
      ],
      dur: 1300,
    },
    patada_gluteo: {
      props: [],
      base: { hip: [88, 126], torso: -15.4, footN: 180, footF: 180, leg: { f: { a: [90, 180] } }, arm: { n: { a: [90, 90] } } },
      frames: [{ leg: { n: { a: [90, 180] } }, hold: 300 }, { leg: { n: { a: [192, -92] } }, hold: 500 }],
      dur: 1300,
    },
    patada_polea: {
      props: [{ t: 'line', x1: 164, y1: 20, x2: 164, y2: 170, w: 6 }, { t: 'cable', from: 'an', to: [164, 164], toz: 0 }],
      base: { hip: [110, 92], torso: -76, leg: { f: { ik: [116, 170] } }, arm: { n: { ik: [162, 70], bend: 1 } } },
      frames: [{ leg: { n: { a: [96, 92] } }, hold: 250 }, { leg: { n: { a: [138, 128] } }, hold: 400 }],
      dur: 1200,
    },
    abduccion_maquina: {
      mode: 'front',
      props: [{ t: 'chairF' }],
      base: { cx: 120, hipY: 118, arm: { a: [80, 84] } },
      frames: [{ leg: { a: [76, 90], s: [0.35, 1] }, hold: 250 }, { leg: { a: [30, 88], s: [0.35, 1] }, hold: 400 }],
      dur: 1300,
    },
    aduccion_maquina: {
      mode: 'front',
      props: [{ t: 'chairF' }],
      base: { cx: 120, hipY: 118, arm: { a: [80, 84] } },
      frames: [{ leg: { a: [30, 88], s: [0.35, 1] }, hold: 250 }, { leg: { a: [78, 90], s: [0.35, 1] }, hold: 400 }],
      dur: 1300,
    },
    rotacion_externa_banda: {
      props: [{ t: 'cable', from: 'handN', to: [140, 70], toz: -70 }],
      base: { hip: [110, 90], torso: -90, leg: { n: { ik: [114, 170] } }, arm: { f: { a: [90, 90] } } },
      frames: [{ arm: { n: { a: [90, 0], o: [0, -20] } }, hold: 250 }, { arm: { n: { a: [90, 0], o: [0, 72] } }, hold: 400 }],
      dur: 1200,
    },
    encogimientos: {
      mode: 'front',
      props: [{ t: 'dbv', at: 'handR' }, { t: 'dbv', at: 'handL' }],
      base: { cx: 120, hipY: 88, leg: { a: [86, 90] }, arm: { a: [88, 90] } },
      frames: [{ shUp: 0, hold: 300 }, { shUp: 9, hold: 500 }],
      dur: 1000,
    },
    colgarse_barra: { ...ANIMS.dominadas, frames: [{ hipY: 124, arm: { ik: [150, 22], bend: 1 }, hold: 1200 }, { hipY: 125.5, arm: { ik: [150, 22], bend: 1 }, hold: 1200 }], dur: 1600 },
    fondos_paralelas: {
      mode: 'front', noFloor: true,
      props: [{ t: 'rect', x: 141, y: 104, w: 6, h: 66 }, { t: 'rect', x: 93, y: 104, w: 6, h: 66 }],
      base: { cx: 120, arm: { ik: [144, 104], bend: -1 }, leg: { a: [90, 90], s: [1, 0.5] } },
      frames: [{ hipY: 96, hold: 300 }, { hipY: 118, hold: 300 }],
      dur: 1300,
    },
    elevacion_rodillas_colgado: {
      mode: 'front', noFloor: true,
      props: [{ t: 'hline', y: 20, x1: 70, x2: 170, w: 5 }],
      base: { cx: 120, hipY: 124, arm: { ik: [150, 22], bend: 1 } },
      frames: [{ leg: { a: [92, 88], s: [1, 1] }, hold: 300 }, { leg: { a: [90, 90], s: [0.15, 1] }, hold: 400 }],
      dur: 1400,
    },
    crunch: {
      props: [],
      base: { hip: [120, 158], leg: { n: { ik: [160, 168] } }, arm: { n: { a: [-150, 14], o: [45, 0] } } },
      frames: [{ torso: 180, head: 0, hold: 300 }, { torso: 206, head: -12, hold: 400 }],
      dur: 1200,
    },
    elevacion_piernas: {
      props: [],
      base: { hip: [120, 158], torso: 180, arm: { n: { a: [8, 6] } } },
      frames: [{ leg: { n: { a: [-3, -3] } }, hold: 250 }, { leg: { n: { a: [-86, -86] } }, hold: 400 }],
      dur: 1500,
    },
    hollow: {
      props: [],
      base: { hip: [120, 158], arm: { n: { a: [194, 194] } } },
      frames: [{ torso: 196, leg: { n: { a: [-14, -14] } }, hold: 900 }, { torso: 197, leg: { n: { a: [-15, -15] } }, hold: 900 }],
      dur: 1300,
    },
    giros_rusos: {
      props: [],
      base: { hip: [118, 158], torso: -128, leg: { n: { ik: [164, 168] } } },
      frames: [
        { arm: { n: { a: [40, 10], o: [-38, -38] }, f: { a: [40, 10], o: [38, 38] } }, hold: 150 },
        { arm: { n: { a: [40, 10], o: [38, 38] }, f: { a: [40, 10], o: [-38, -38] } }, hold: 150 },
      ],
      dur: 750,
    },
    crunch_polea: {
      props: [{ t: 'cable', from: 'handN', to: [150, -8] }],
      base: { hip: [110, 124], leg: { n: { a: [90, 180] } }, footN: 180 },
      frames: [{ torso: -86, arm: { n: { a: [-40, 170] } }, hold: 300 }, { torso: -18, arm: { n: { a: [46, -120] } }, hold: 400 }],
      dur: 1400,
    },
    escaladores: {
      props: [],
      base: { ...PLANCHA_ALTA, arm: { n: { a: [92.5, 92.5] } } },
      frames: [{ leg: { n: { a: [56, 140] }, f: { a: [156, 156] } }, hold: 60 }, { leg: { n: { a: [156, 156] }, f: { a: [56, 140] } }, hold: 60 }],
      dur: 380,
    },
    plancha_rodillas: {
      props: [],
      base: { torso: -17.3, arm: { n: { a: [90, 0] } }, leg: { n: { a: [162.7, -150] } } },
      frames: [{ hip: [102, 153.5], hold: 900 }, { hip: [102, 154.5], hold: 900 }],
      dur: 1500,
    },
    paseo_arriba: (() => {
      const g2 = structuredClone(ANIMS.paseo_granjero);
      g2.props = [{ t: 'dbv', at: 'handN' }];
      g2.base.arm = { n: { a: [-90, -90] }, f: { a: [90, 90] } };
      return g2;
    })(),
    marcha_lugar: {
      props: [],
      base: { torso: -90, hip: [110, 88] },
      frames: [
        { leg: { n: { a: [-4, 90] }, f: { a: [90, 90] } }, arm: { n: { a: [120, 60] }, f: { a: [55, -20] } }, hold: 60 },
        { leg: { n: { a: [90, 90] }, f: { a: [90, 90] } }, arm: { n: { a: [90, 40] }, f: { a: [90, 40] } }, hold: 0 },
        { leg: { n: { a: [90, 90] }, f: { a: [-4, 90] } }, arm: { n: { a: [55, -20] }, f: { a: [120, 60] } }, hold: 60 },
        { leg: { n: { a: [90, 90] }, f: { a: [90, 90] } }, arm: { n: { a: [90, 40] }, f: { a: [90, 40] } }, hold: 0 },
      ],
      dur: 300,
    },
    boxeo_sombra: {
      props: [],
      base: { hip: [108, 92], torso: -84, leg: { n: { ik: [130, 170] }, f: { ik: [86, 170] } } },
      frames: [
        { arm: { n: { a: [-4, -4] }, f: { a: [112, -62] } }, hold: 80 },
        { arm: { n: { a: [112, -62] }, f: { a: [112, -62] } }, hold: 120 },
        { arm: { n: { a: [112, -62] }, f: { a: [-4, -4] } }, hold: 80 },
        { arm: { n: { a: [112, -62] }, f: { a: [112, -62] } }, hold: 120 },
      ],
      dur: 260,
    },
    thruster: {
      props: [{ t: 'dbh', at: 'handN' }],
      base: { leg: { n: { ik: [118, 170] } } },
      frames: [{ hip: [82, 130], torso: -58, arm: { n: { a: [62, -100] } }, hold: 200 }, { hip: [110, 88], torso: -90, arm: { n: { a: [-92, -90] } }, hold: 250 }],
      dur: 1100,
    },
    gato_vaca: {
      props: [],
      base: { footN: 180, footF: 180, leg: { n: { a: [90, 180] } }, arm: { n: { a: [90, 90] } } },
      frames: [{ hip: [88, 124], torso: -20, head: 34, hold: 700 }, { hip: [88, 128], torso: -11, head: -28, hold: 700 }],
      dur: 1300,
    },
    rotacion_toracica: {
      props: [],
      base: { hip: [88, 126], torso: -15.4, footN: 180, footF: 180, leg: { n: { a: [90, 180] } }, arm: { f: { a: [90, 90] } } },
      frames: [
        { arm: { n: { a: [100, -140], o: [-35, -20] } }, hold: 300 },
        { arm: { n: { a: [100, -140], o: [86, 40] } }, hold: 0 },
        { arm: { n: { a: [-80, -150], o: [22, 0] } }, hold: 500 },
        { arm: { n: { a: [100, -140], o: [86, 40] } }, hold: 0 },
      ],
      dur: 600,
    },
    postura_nino: {
      props: [],
      base: { head: 20, leg: { n: { a: [14, 180] } }, footN: 180, arm: { n: { a: [8, 0] } } },
      frames: [{ hip: [100, 150], torso: 12, hold: 1200 }, { hip: [100, 149], torso: 10, hold: 1200 }],
      dur: 1800,
    },
    estiramiento_pecho: {
      props: [],
      base: { hip: [110, 90], torso: -90, leg: { n: { ik: [114, 170] } }, arm: { f: { a: [90, 90] } } },
      frames: [{ arm: { n: { a: [6, -92], o: [80, 0] } }, hold: 1500 }, { arm: { n: { a: [-4, -92], o: [86, 0] } }, hold: 1500 }],
      dur: 1500,
    },
    remo_ergometro: {
      props: [{ t: 'rect', x: 40, y: 158, w: 150, h: 6 }, { t: 'cable', from: 'handN', to: [186, 142] }],
      base: { leg: { n: { ik: [168, 152] } }, footN: -70 },
      frames: [{ hip: [118, 150], torso: -62, arm: { n: { a: [-18, -18] } }, hold: 150 }, { hip: [90, 150], torso: -106, arm: { n: { a: [118, -12] } }, hold: 250 }],
      dur: 900,
    },
    sentadilla_pistol_trx: {
      props: [{ t: 'cable', from: 'handN', to: [176, -8] }],
      base: { leg: { n: { ik: [114, 170] } } },
      frames: [
        { hip: [110, 90], torso: -88, leg: { f: { a: [78, 86] } }, arm: { n: { a: [-32, -30] } }, hold: 300 },
        { hip: [88, 130], torso: -56, leg: { f: { a: [4, 2] } }, arm: { n: { a: [-12, -10] } }, hold: 300 },
      ],
      dur: 1600,
    },
  };
  g.press_inclinado_barra = { ...g.press_inclinado_mancuernas, props: [...g.press_inclinado_mancuernas.props.slice(0, 2), { t: 'plate', at: 'handN' }] };
  g.skipping = { ...g.marcha_lugar, frames: structuredClone(g.marcha_lugar.frames), dur: 200 };
  g.skipping.frames[0].leg.n.a = [-18, 100]; g.skipping.frames[2].leg.f.a = [-18, 100];
  Object.assign(A, g);
  // de pie, vista frontal (pasos laterales, leñador y saltos)
  A.zancada_lateral = apoyar({
    mode: 'front',
    props: [],
    base: { arm: { a: [70, -20], s: [0.6, 0.6] } },
    frames: [
      { cx: 120, hipY: 90, leg: { a: [72, 72] }, legL: { a: [72, 72] }, hold: 300 },
      { cx: 133, hipY: 110, leg: { a: [63, 95], s: [0.8, 1] }, legL: { a: [62, 62] }, hold: 300 },
    ],
    dur: 1300,
  }, ['anR', 'anL']);
  A.lenador = apoyar({
    mode: 'front',
    props: [{ t: 'cable', from: 'handsMid', to: [176, -8] }],
    base: { cx: 120, hipY: 90, leg: { a: [78, 90] } },
    frames: [
      { rot: 6, arm: { ik: [158, 18] }, armL: { ik: [154, 20] }, hold: 200 },
      { rot: -10, arm: { ik: [112, 92] }, armL: { ik: [108, 92] }, hold: 300 },
    ],
    dur: 1200,
  }, ['anR', 'anL']);
  A.tijeras_sin_salto = apoyar({
    mode: 'front',
    props: [],
    base: { cx: 120, hipY: 88 },
    frames: [
      { leg: { a: [88, 90] }, legL: { a: [88, 90] }, arm: { a: [80, 86] }, hold: 60 },
      { leg: { a: [66, 70] }, legL: { a: [88, 90] }, arm: { a: [-55, -70] }, hold: 80 },
      { leg: { a: [88, 90] }, legL: { a: [88, 90] }, arm: { a: [80, 86] }, hold: 60 },
      { leg: { a: [88, 90] }, legL: { a: [66, 70] }, arm: { a: [-55, -70] }, hold: 80 },
    ],
    dur: 330,
  }, ['anR', 'anL']);
  A.saltos_tijera = apoyar({
    mode: 'front',
    props: [],
    base: { cx: 120, hipY: 88 },
    frames: [{ leg: { a: [88, 90] }, arm: { a: [82, 86] }, hold: 40 }, { leg: { a: [70, 72] }, arm: { a: [-50, -62] }, hold: 40 }],
    dur: 300,
  }, ['anR', 'anL']);
  // burpees: de pie → cuclillas → plancha → cuclillas (→ salto)
  const BUR = [
    { hip: [110, 88], torso: -88, leg: { n: { ik: [114, 170] } }, arm: { n: { ik: [113, 94], bend: 1 } }, hold: 150 },
    { hip: [100, 132], torso: -24, leg: { n: { ik: [114, 170] } }, arm: { n: { ik: [150, 170], bend: 1 } }, hold: 100 },
    { hip: [105, 133], torso: -23.8, leg: { n: { ik: [30, 166] } }, arm: { n: { ik: [150, 170], bend: 1 } }, hold: 200 },
    { hip: [100, 132], torso: -24, leg: { n: { ik: [114, 170] } }, arm: { n: { ik: [150, 170], bend: 1 } }, hold: 100 },
  ];
  A.burpee_sin_salto = { props: [], base: {}, frames: BUR, dur: 550 };
  A.burpees = { props: [], base: {}, frames: [...BUR, { hip: [110, 78], torso: -90, leg: { n: { ik: [114, 160] } }, arm: { n: { ik: [116, -16], bend: 1 } }, hold: 60 }], dur: 420 };

  // apoyo de la elevación de talones: un poste (una pared taparía a la persona vista de frente)
  ANIMS.elevacion_talones.props = [{ t: 'line', x1: 157, y1: 24, x2: 157, y2: 170, w: 6 }];

  for (const [id, an] of Object.entries(A)) {
    ANIMS[id] = an;
    if (EJERCICIOS[id]) EJERCICIOS[id].anim = id;
  }
})();

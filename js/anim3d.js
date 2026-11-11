/* ============================================================
   Figura 3D giratoria (SVG, offline)
   Reutiliza las animaciones 2D de anim.js: cada pose lateral o
   frontal se convierte en un esqueleto 3D (X = hacia adelante,
   Y = vertical hacia abajo, Z = lado del cuerpo) y se proyecta
   con una cámara que gira alrededor de la figura.
   ============================================================ */
const Fig3D = (() => {
  const { tlOf, poseAt, sideJoints, frontJoints, L, G } = Fig._int;
  const VBW = 240, VBH = 188, VB = `0 -8 ${VBW} ${VBH}`;
  const rad = (d) => (d * Math.PI) / 180;
  const f1 = (n) => Math.round(n * 10) / 10;
  const v3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

  const VISTAS = [
    { k: 'lado', n: 'Lado', th: 0, ph: 8 },
    { k: 'tq', n: '¾', th: 38, ph: 14 },
    { k: 'frente', n: 'Frente', th: 90, ph: 8 },
    { k: 'atras', n: 'Atrás', th: -90, ph: 8 },
    { k: 'arriba', n: 'Arriba', th: 35, ph: 62 },
  ];
  let ultimaVista = null; // recuerda la vista elegida mientras la app está abierta
  // figura hombre ('h') o mujer ('m'): la elegida con el botón, o según el sexo del perfil
  function estiloFig() {
    try { const v = localStorage.getItem('entreno_fig'); if (v === 'h' || v === 'm') return v; } catch (e) { /* sin almacenamiento */ }
    try { return S && S.perfil && S.perfil.sexo === 'F' ? 'm' : 'h'; } catch (e) { return 'h'; }
  }
  let EST = 'h';
  const claseSvg = () => (EST === 'm' ? 'fig mujer' : 'fig');

  /* ---------- pivote (centro de giro) por animación ---------- */
  const pivotes = new Map();
  function pivote(anim) {
    if (pivotes.has(anim)) return pivotes.get(anim);
    const tl = tlOf(anim);
    let px;
    if (anim.mode === 'front') px = tl.frames[0].cx;
    else {
      let lo = Infinity, hi = -Infinity;
      for (const f of tl.frames) {
        const J = sideJoints(f);
        for (const k of ['hip', 'sh', 'head', 'kn', 'an', 'tn', 'hn', 'kf', 'af', 'hf']) {
          lo = Math.min(lo, J[k][0]); hi = Math.max(hi, J[k][0]);
        }
      }
      px = (lo + hi) / 2;
    }
    pivotes.set(anim, px);
    return px;
  }

  /* ---------- esqueleto 3D ---------- */
  function cuerpo(anim, p, px) {
    if (anim.mode === 'front') {
      const J = frontJoints(p);
      // vista frontal: x de pantalla = lado del cuerpo (Z), sin profundidad salvo el escorzo de las piernas
      const P = (q, X = 0) => [X, q[1], -(q[0] - px)];
      // profundidad de cada segmento según su escorzo s (d = sentido: 1 adelante, -1 atrás)
      const prof = (l, s, d) => d * l * Math.sqrt(Math.max(0, 1 - s * s));
      const lado = (hp, k, an, sh, el, ha, lsp, asp) => {
        const ls = lsp.s || [1, 1], ld = lsp.d || [1, -1], as = asp.ik ? [1, 1] : asp.s || [1, 1], ad = asp.d || [1, 1];
        const dTh = prof(L.th, ls[0], ld[0]), dSh = prof(L.sh, ls[1], ld[1]);
        const dU = prof(L.ua, as[0], ad[0]), dF = prof(L.fa, as[1], ad[1]);
        const H = P(hp), K = P(k, dTh), A = P(an, dTh + dSh);
        return { hip: H, kn: K, an: A, toe: v3(A, [11, 0, H[2] * 0.25]), sh: P(sh), el: P(el, dU), ha: P(ha, dU + dF) };
      };
      const N = lado(J.hpL, J.kL, J.anL, J.shL, J.eL, J.hL, p.legL || p.leg, p.armL || p.arm);
      const F = lado(J.hpR, J.kR, J.anR, J.shR, J.eR, J.hR, p.leg, p.arm);
      const head = P(J.head);
      const B = {
        N, F, head, nose: v3(head, [9, 0, 0]),
        torso: [P(J.bL), P(J.bR), F.sh, N.sh],
        neck: [P(J.neck), head],
        pelvis: P([(J.bL[0] + J.bR[0]) / 2, (J.bL[1] + J.bR[1]) / 2]),
      };
      B.map = { handL: N.ha, handR: F.ha, hL: N.ha, hR: F.ha, handsMid: v3(N.ha, v3(F.ha, N.ha, -1), 0.5), shL: N.sh, shR: F.sh, head, cx: px, y: J.y, ry: J.ry };
      B.P = (x, y, z = 0) => [z, y, -(x - px)];
      const lt = v3(P(J.bL), P(J.bR), -1), ll = Math.hypot(...lt) || 1;
      Object.assign(B, { hipC: B.pelvis, shC: P(J.neck), lat: lt.map((v) => v / ll), front: [1, 0, 0] });
      return B;
    }
    const J = sideJoints(p);
    const latY = anim.lat === 'y'; // acostado de lado: el ancho del cuerpo queda en vertical
    const P = (q, z = 0) => (latY ? [q[0] - px, q[1] - z, 0] : [q[0] - px, q[1], z]);
    const HZ = EST === 'm' ? 10 : 9, SZ = EST === 'm' ? 14.5 : 16;
    const lado = (s, kn, an, tn, el, ha) => ({
      hip: P(J.hip, HZ * s), kn: P(kn, HZ * s), an: P(an, HZ * s), toe: P(tn, HZ * s),
      sh: P(J.sh, SZ * s), el: P(el, SZ * s), ha: P(ha, SZ * s),
    });
    const N = lado(1, J.kn, J.an, J.tn, J.en, J.hn);
    const F = lado(-1, J.kf, J.af, J.tf, J.ef, J.hf);
    // o = [o1, o2]: cada segmento se inclina hacia el costado (abrir brazos/piernas fuera del plano lateral)
    if (!latY) {
      const arm = p.arm || {}, leg = p.leg || {};
      const inclina = (S, sp, s, raiz, m, e, l1, l2, toe) => {
        if (!sp || !sp.o || !sp.a) return;
        const o1 = rad(sp.o[0] || 0), o2 = rad(sp.o[1] ?? sp.o[0] ?? 0), a1 = rad(sp.a[0]), a2 = rad(sp.a[1]);
        const M = v3(S[raiz], [Math.cos(a1) * Math.cos(o1), Math.sin(a1) * Math.cos(o1), s * Math.sin(o1)], l1);
        const E = v3(M, [Math.cos(a2) * Math.cos(o2), Math.sin(a2) * Math.cos(o2), s * Math.sin(o2)], l2);
        if (toe) S.toe = v3(E, v3(S.toe, S[e], -1));
        S[m] = M; S[e] = E;
      };
      const aN = arm.n, aF = arm.f || arm.n, lN = leg.n, lF = leg.f || leg.n;
      inclina(N, aN, 1, 'sh', 'el', 'ha', L.ua, L.fa);
      inclina(F, aF, -1, 'sh', 'el', 'ha', L.ua, L.fa);
      inclina(N, lN, 1, 'hip', 'kn', 'an', L.th, L.sh, true);
      inclina(F, lF, -1, 'hip', 'kn', 'an', L.th, L.sh, true);
    }
    const head = P(J.head);
    const a = rad(p.torso + (p.head || 0) + 90), face = anim.face || 1;
    const nose = latY ? [head[0], head[1], 9] : v3(head, [Math.cos(a) * 9 * face, Math.sin(a) * 9 * face, 0]);
    const B = {
      N, F, head, nose,
      torso: [P(J.hip, 11), P(J.hip, -11), P(J.sh, -16), P(J.sh, 16)],
      neck: [P(J.sh), head],
      pelvis: P(J.hip),
    };
    B.map = { hip: P(J.hip), sh: P(J.sh), head, kn: N.kn, an: P(J.an), kf: F.kn, af: F.an, handN: N.ha, handF: F.ha, hn: N.ha, hf: F.ha, en: N.el, ef: F.el };
    B.P = (x, y, z = 0) => P([x, y], z);
    B.bilateral = !(p.arm && p.arm.f);
    const af = rad(p.torso + 90);
    Object.assign(B, { hipC: P(J.hip), shC: P(J.sh), lat: latY ? [0, -1, 0] : [0, 0, 1], front: latY ? [0, 0, 1] : [Math.cos(af) * face, Math.sin(af) * face, 0] });
    return B;
  }

  /* ---------- primitivas 3D ---------- */
  const seg = (a, b, w, cls, ol = true) => ({ t: 's', a, b, w, cls, ol });
  const poly = (pts, cls, w = 0) => ({ t: 'p', pts, cls, w });
  const ball = (c, r, cls) => ({ t: 'c', c, r, cls });
  function disk(c, r, axis, cls, n = 18) {
    const u = axis === 'z' ? [1, 0, 0] : [0, 0, 1];
    const v = axis === 'y' ? [1, 0, 0] : [0, 1, 0];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      pts.push(v3(v3(c, u, Math.cos(t) * r), v, Math.sin(t) * r));
    }
    return { t: 'p', pts, cls, w: 0, hull: true };
  }
  function box(x0, x1, y0, y1, z0, z1, P, cls = 'fig-prop') {
    const c = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) c.push(P(x, y, z));
    // c: índice = xi*4 + yi*2 + zi ; cara superior = y0
    return { t: 'b', c, cls, top: [c[0], c[1], c[5], c[4]] };
  }

  function mancuerna(h, axis, out) {
    const u = AX[axis];
    out.push(seg(v3(h, u, -9), v3(h, u, 9), 3, 'fig-accl', false));
    out.push(seg(v3(h, u, -13), v3(h, u, -8), 12, 'fig-accl'));
    out.push(seg(v3(h, u, 8), v3(h, u, 13), 12, 'fig-accl'));
  }
  function barra(c, out, largo = 56) {
    const z = AX.z;
    out.push(seg(v3(c, z, -largo), v3(c, z, -16), 3.5, 'fig-accl', false));
    out.push(seg(v3(c, z, -16), v3(c, z, 16), 3.5, 'fig-accl', false));
    out.push(seg(v3(c, z, 16), v3(c, z, largo), 3.5, 'fig-accl', false));
    for (const s of [-1, 1]) {
      out.push(disk(v3(c, z, s * 38), 18, 'z', 'fig-plate'));
      out.push(disk(v3(c, z, s * 43), 18, 'z', 'fig-plate'));
    }
  }

  function props(anim, B, pose) {
    const bg = [], fg = [], P = B.P, M = B.map;
    const front = anim.mode === 'front';
    const yaDbF = (anim.props || []).some((q) => q.at === 'handF');
    const LADO = { handN: 1, hn: 1, en: 1, kn: 1, an: 1, handL: 1, hL: 1, handF: -1, hf: -1, ef: -1, kf: -1, af: -1, handR: -1, hR: -1 };
    const PIE = { kn: 1, an: 1, kf: 1, af: 1 };
    for (const pr of anim.props || []) {
      const n0 = fg.length;
      switch (pr.t) {
        case 'rect': {
          const { x, y, w, h } = pr;
          if (w <= 12 && h <= 60) { // patas / postes: dos, uno a cada lado
            bg.push(box(x, x + w, y, y + h, -20, -14, P), box(x, x + w, y, y + h, 14, 20, P));
          } else {
            const zw = h > 100 ? 45 : 20;
            bg.push(box(x, x + w, y, y + h, -zw, zw, P));
          }
          break;
        }
        case 'chairS': {
          const { x, y, w } = pr;
          bg.push(box(x, x + w, y, y + 6, -20, 20, P), box(x - 2, x + 4, y - 46, y + 6, -20, 20, P));
          for (const [a, b] of [[x + 1, x + 5], [x + w - 5, x + w - 1]]) bg.push(box(a, b, y + 6, G, -20, -16, P), box(a, b, y + 6, G, 16, 20, P));
          break;
        }
        case 'chairF': {
          const y = M.y;
          const W = (X0, X1, Y0, Y1, Z0, Z1) => box(X0, X1, Y0, Y1, Z0, Z1, (a, b, c) => [a, b, c]);
          bg.push(W(-24, 34, y + 2, y + 9, -28, 28), W(-30, -24, y - 50, y + 9, -22, 22));
          for (const X of [[-23, -19], [29, 33]]) bg.push(W(X[0], X[1], y + 9, G, -27, -23), W(X[0], X[1], y + 9, G, 23, 27));
          break;
        }
        case 'ellip':
          bg.push(box(60, 195, 162, 170, -18, 18, P));
          for (const z of [-10, 10]) bg.push(seg(P(96, 160, z), P(180, 152, z), 5, 'fig-prop-l', false));
          bg.push(seg(P(178, 162), P(152, 66), 6, 'fig-prop-l', false), box(144, 166, 56, 68, -10, 10, P));
          for (const z of [-14, 14]) bg.push(seg(P(156, 70, z * 0.6), P(146, 84, z), 4, 'fig-prop-l', false));
          bg.push(disk(P(182, 148), 12, front ? 'x' : 'z', 'fig-prop'));
          break;
        case 'bike':
          bg.push(box(70, 190, 163, 170, -18, 18, P));
          bg.push(seg(P(100, 104), P(112, 150), 6, 'fig-prop-l', false), seg(P(112, 150), P(160, 82), 6, 'fig-prop-l', false));
          bg.push(seg(P(112, 150), P(112, 163), 5, 'fig-prop-l', false), seg(P(160, 82), P(165, 140), 5, 'fig-prop-l', false));
          bg.push(box(88, 112, 96, 103, -8, 8, P), seg(P(160, 78, -15), P(160, 78, 15), 5, 'fig-prop-l', false));
          bg.push(disk(P(165, 142), 16, 'z', 'fig-prop'), disk(P(112, 150), 6, 'z', 'fig-prop'));
          break;
        case 'treadmill':
          bg.push(box(30, 200, 160, 170, -24, 24, P), box(164, 190, 60, 72, -22, 22, P));
          for (const z of [-22, 22]) bg.push(seg(P(190, 160, z), P(176, 70, z), 5, 'fig-prop-l', false), seg(P(176, 92, z), P(146, 94, z), 5, 'fig-prop-l', false));
          break;
        case 'line':
        case 'hline': {
          const x1 = pr.x1, x2 = pr.x2, y1 = pr.t === 'hline' ? pr.y : pr.y1, y2 = pr.t === 'hline' ? pr.y : pr.y2, w = pr.w || 5;
          if (front) bg.push(seg(P(x1, y1), P(x2, y2), w, 'fig-prop-l', false));
          else if (w >= 8) bg.push(poly([P(x1, y1, -18), P(x2, y2, -18), P(x2, y2, 18), P(x1, y1, 18)], 'fig-prop fig-prop-l', w * 0.7));
          else for (const z of [-16, 16]) bg.push(seg(P(x1, y1, z), P(x2, y2, z), w, 'fig-prop-l', false));
          break;
        }
        case 'bar': { // plataforma bajo los pies
          const c = M[pr.at], a = rad(pr.ang), l = (pr.len || 40) / 2;
          const d = [Math.cos(a) * l, Math.sin(a) * l, 0];
          const A = [c[0] - d[0], c[1] - d[1]], Bq = [c[0] + d[0], c[1] + d[1]];
          fg.push(poly([[A[0], A[1], -22], [Bq[0], Bq[1], -22], [Bq[0], Bq[1], 22], [A[0], A[1], 22]], 'fig-accp', 6));
          break;
        }
        case 'cable': {
          const a = M[pr.from];
          bg.push(seg(a, P(pr.to[0], pr.to[1], pr.toz ?? (front ? 0 : a[2])), 2, 'fig-cable', false));
          break;
        }
        case 'hbar': {
          const a = M[pr.a], b = M[pr.b], e = pr.ext || 10;
          const dz = Math.sign(b[2] - a[2]) || 1;
          fg.push(seg(v3(a, [0, 0, -dz * e]), v3(b, [0, 0, dz * e]), 5, 'fig-accl', false));
          break;
        }
        case 'rope': {
          const a = M.handL, b = M.handR, cy = 2 * M.ry - (a[1] + b[1]) / 2;
          const pts = [];
          for (let i = 0; i <= 14; i++) {
            const t = i / 14, u = 1 - t;
            pts.push([0, u * u * a[1] + 2 * u * t * cy + t * t * b[1], u * u * a[2] + t * t * b[2]]);
          }
          fg.push({ t: 'l', pts, w: 2.5, cls: 'fig-cable' });
          break;
        }
        case 'wheel': {
          const h = M[pr.at], c = [h[0], h[1] + 8, 0];
          fg.push(disk(c, 10, 'z', 'fig-plate'), seg(v3(c, [0, 0, -16]), v3(c, [0, 0, 16]), 3, 'fig-accl', false));
          break;
        }
        case 'plate': {
          const h = M[pr.at];
          barra([h[0], h[1] + (pr.dy || 0), 0], fg);
          break;
        }
        case 'db':
        case 'dbh':
        case 'dbv': {
          const axis = pr.t === 'dbv' ? 'x' : pr.t === 'dbh' ? 'z' : pr.v ? 'y' : 'z';
          mancuerna(M[pr.at], axis, fg);
          if (pr.at === 'handN' && B.bilateral && !yaDbF) {
            const n1 = fg.length;
            mancuerna(M.handF, axis, fg);
            for (let i = n1; i < fg.length; i++) { fg[i].lado = -1; fg[i].mb = 'b'; }
          }
          break;
        }
      }
      const ld = LADO[pr.at ?? pr.from] ?? 0;
      const mb = PIE[pr.at ?? pr.from] ? 'p' : 'b';
      for (let i = n0; i < fg.length; i++) if (fg[i].lado === undefined) { fg[i].lado = ld; fg[i].mb = mb; }
    }
    return { bg, fg };
  }

  /* músculos por zona del cuerpo (para resaltar los que trabaja el ejercicio) */
  const MZ = {
    muslo: ['cuad', 'isquios', 'aductores'], pierna: ['pantorrillas'], gluteo: ['gluteos'], torsoS: ['pecho', 'dorsal', 'media'],
    torsoI: ['abdomen', 'lumbar'], hombro: ['h_ant', 'h_lat', 'h_post'], brazo: ['biceps', 'triceps'], antebrazo: ['antebrazo'],
  };
  const claseM = (base, zona, musc) => {
    if (!musc) return base;
    if (MZ[zona].some((m) => musc.d.includes(m))) return base + ' fig-md';
    if (MZ[zona].some((m) => musc.i.includes(m))) return base + ' fig-mi';
    return base;
  };
  const L3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const tubo = (pts, r, cls) => ({ k: 'tube', pts, r, cls });
  const bola = (c, r, cls) => ({ k: 'ball', c, r, cls });
  const grupo = (parts) => ({ t: 'g', parts });

  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  // pc = pieza coloreada: skin (piel), top (polera), bot (short/calza), hair (pelo), shoe, eye; far = lado lejano (más oscuro)
  const pc = (tipo, lado) => 'pc ' + tipo + (lado === 'f' ? ' far' : '');

  function escena(anim, pose, px, musc) {
    EST = estiloFig();
    const M = EST === 'm';
    const B = cuerpo(anim, pose, px);
    const { bg, fg } = props(anim, B, pose);
    const body = [], limbs = [];
    const cm = (tipo, lado, zona) => (zona ? claseM(pc(tipo, lado), zona, musc) : pc(tipo, lado));
    // piernas: hombre con short y piernas a la vista; mujer con calza larga
    const pierna = (S, lado) => {
      const talon = v3(S.an, v3(S.an, S.toe, -1), 0.32);
      const partes = M
        ? [tubo([S.hip, L3(S.hip, S.kn, 0.4), S.kn], [10, 8.8, 5.9], cm('bot', lado, 'muslo')),
          tubo([S.kn, L3(S.kn, S.an, 0.3), S.an], [5.7, 6.3, 3.7], cm('bot', lado, 'pierna'))]
        : [tubo([L3(S.hip, S.kn, 0.4), S.kn], [8.6, 6.1], cm('skin', lado, 'muslo')),
          tubo([S.hip, L3(S.hip, S.kn, 0.52)], [10, 9.1], cm('bot', lado, 'muslo')),
          tubo([S.kn, L3(S.kn, S.an, 0.3), S.an], [6.0, 6.8, 4.1], cm('skin', lado, 'pierna'))];
      partes.push(tubo([talon, S.toe], M ? [4.1, 3.1] : [4.5, 3.4], pc('shoe', lado)));
      limbs.push({ it: grupo(partes), lado: lado === 'n' ? 1 : -1, mb: 'p', n: 'pierna-' + lado,
        segs: [[L3(S.hip, S.kn, 0.35), S.kn, 8], [S.kn, S.an, 6], [talon, S.toe, 4]] });
    };
    // brazos: hombre con polera de manga corta; mujer con polera sin mangas
    const brazo = (S, lado) => {
      const partes = M
        ? [bola(S.sh, 6.4, cm('skin', lado, 'hombro')),
          tubo([S.sh, L3(S.sh, S.el, 0.45), S.el], [5.5, 5.2, 4.1], cm('skin', lado, 'brazo')),
          tubo([S.el, L3(S.el, S.ha, 0.3), S.ha], [4.2, 4.3, 2.9], cm('skin', lado, 'antebrazo')),
          bola(S.ha, 3.6, pc('skin', lado))]
        : [tubo([L3(S.sh, S.el, 0.4), S.el], [5.9, 4.6], cm('skin', lado, 'brazo')),
          bola(S.sh, 7.6, cm('top', lado, 'hombro')),
          tubo([S.sh, L3(S.sh, S.el, 0.48)], [7.0, 6.6], cm('top', lado, 'brazo')),
          tubo([S.el, L3(S.el, S.ha, 0.3), S.ha], [4.7, 4.9, 3.4], cm('skin', lado, 'antebrazo')),
          bola(S.ha, 4.1, pc('skin', lado))];
      limbs.push({ it: grupo(partes), lado: lado === 'n' ? 1 : -1, mb: 'b', n: 'brazo-' + lado,
        segs: [[L3(S.sh, S.el, 0.3), S.el, 6], [S.el, S.ha, 4.6]] });
    };
    pierna(B.F, 'f'); brazo(B.F, 'f');
    // torso por niveles (0 = cadera, 1 = hombros): ancho, profundidad adelante y atrás
    const nivel = (t, w, fr, bk) => {
      const c = L3(B.hipC, B.shC, t), out = [];
      for (const sz of [-1, 1]) for (const [k, d] of [[1, fr], [0.7, fr * 1.15], [1, bk], [0.7, bk * 1.1]]) out.push(v3(v3(c, B.lat, sz * w * k), B.front, d));
      return out;
    };
    const hull = (pts, cls) => ({ k: 'hull', pts, cls, lat: B.lat, front: B.front });
    // glúteos (detrás de la cadera), en el mismo volumen que la cadera: sin contornos sueltos
    const gluteos = () => [-1, 1].map((sz) => bola(v3(v3(L3(B.hipC, B.shC, M ? 0.03 : 0.04), B.lat, sz * (M ? 7.2 : 6.5)), B.front, M ? -6.2 : -5.5), M ? 8.6 : 7.6, cm('bot', 'n', 'gluteo')));
    if (M) {
      body.push(grupo([
        hull([...nivel(0.32, 12.6, 7.6, -7.6), ...nivel(0.14, 14, 7.6, -9), ...nivel(0, 15, 7, -10)], cm('bot', 'n')),
        hull([...nivel(0.56, 11, 7, -6.5), ...nivel(0.42, 11.4, 7, -6.8), ...nivel(0.28, 12.4, 7.4, -7.4)], cm('top', 'n', 'torsoI')),
        hull([...nivel(1, 12.5, 5, -6), ...nivel(0.8, 13.5, 9, -8), ...nivel(0.71, 11.5, 11.8, -7.6), ...nivel(0.62, 11, 9.5, -7), ...nivel(0.56, 11, 7, -6.5)], cm('top', 'n', 'torsoS')),
        ...gluteos(),
      ]));
    } else {
      body.push(grupo([
        hull([...nivel(0.24, 13.2, 8.4, -7.4), ...nivel(0, 14, 7, -9)], cm('bot', 'n')),
        hull([...nivel(0.52, 14, 8.6, -7.6), ...nivel(0.2, 13, 8.2, -7.2)], cm('top', 'n', 'torsoI')),
        hull([...nivel(1, 16, 6, -6.5), ...nivel(0.8, 17, 10.5, -9), ...nivel(0.52, 14, 8.6, -7.6)], cm('top', 'n', 'torsoS')),
        ...gluteos(),
      ]));
    }
    // cuello, cabeza, cara y pelo
    const up = nrm(v3(B.head, B.shC, -1)), fw = nrm(v3(B.nose, B.head, -1)), lt = B.lat;
    const rH = M ? L.head : L.head + 0.4;
    const cuello = L3(B.shC, B.head, 0.15);
    body.push(grupo([tubo([cuello, L3(B.shC, B.head, 0.6)], M ? [4.4, 4.0] : [5.8, 5.2], pc('skin', 'n'))]));
    const eje = nrm(v3(fw, up, M ? -0.55 : -0.85));
    const cab = { cara: grupo([bola(B.head, rH, pc('skin', 'n'))]), pelo: { t: 'hair', c: B.head, r: rH + 0.9, eje, cls: pc('hair', 'n') }, cola: null, rasgos: [], c: B.head };
    if (M) { // cola de caballo
      const a = v3(v3(B.head, fw, -8), up, 4), b = v3(v3(B.head, fw, -14), up, -1), c = v3(v3(B.head, fw, -15), up, -9);
      cab.cola = grupo([tubo([a, b, c], [3.9, 3.2, 1.7], pc('hair', 'n'))]);
    }
    for (const sz of [-1, 1]) cab.rasgos.push(ball(v3(v3(v3(B.head, fw, rH - 0.9), up, 1.2), lt, sz * 3.4), 1.15, 'pc eye'));
    cab.rasgos.push(ball(v3(v3(B.head, fw, rH + 0.2), up, -1.6), 1.7, 'pc skin nariz'));
    pierna(B.N, 'n'); brazo(B.N, 'n');
    const todo = [...limbs.map((l) => l.it), ...body, cab.cara, ...(cab.cola ? [cab.cola] : [])];
    // torso ancho y plano: dos ejes paralelos (izquierda y derecha) con el grosor real del tronco
    const segT = [-1, 1].map((sz) => [v3(B.hipC, B.lat, sz * 6.5), v3(L3(B.hipC, B.shC, 0.9), B.lat, sz * 7.5), 8.5]), segH = [[B.head, B.head, rH]];
    return { bg, fg, limbs, torso: body, cab, todo, lat: B.lat, pelvis: B.pelvis, centro: L3(B.hipC, B.shC, 0.5), segT, segH };
  }

  /* ---------- proyección ---------- */
  function camara(th, ph) {
    const c = Math.cos(rad(th)), s = Math.sin(rad(th)), cp = Math.cos(rad(ph)), sp = Math.sin(rad(ph));
    return (P) => {
      const d = P[0] * s + P[2] * c, yr = P[1] - G;
      return [P[0] * c - P[2] * s, yr * cp + d * sp + G, d * cp - yr * sp];
    };
  }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const puntos = (it) => (it.t === 's' ? [it.a, it.b] : it.t === 'c' || it.t === 'hair' ? [it.c] : it.t === 'b' ? it.c : it.t === 'g' ? it.parts.flatMap((q) => (q.k === 'ball' ? [q.c] : q.pts)) : it.pts);
  // tubo 2D: polígono con el grosor de cada punto + círculos en los extremos (redondeados)
  function tuboSVG(sp, rr) {
    const n = sp.length, izq = [], der = [];
    for (let i = 0; i < n; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      izq.push([sp[i][0] - dy * rr[i], sp[i][1] + dx * rr[i]]); der.push([sp[i][0] + dy * rr[i], sp[i][1] - dx * rr[i]]);
    }
    const pts = izq.concat(der.reverse()).map((q) => `${f1(q[0])} ${f1(q[1])}`).join(' L');
    return `<path d="M${pts} Z"/><circle cx="${f1(sp[0][0])}" cy="${f1(sp[0][1])}" r="${f1(rr[0])}"/><circle cx="${f1(sp[n - 1][0])}" cy="${f1(sp[n - 1][1])}" r="${f1(rr[n - 1])}"/>`;
  }

  function render(it, pr, k, T) {
    const tp = (q) => { const s = pr(q); return [T[0] + s[0] * k, T[1] + (s[1] - G) * k]; };
    const ps = (arr) => arr.map((q) => `${f1(q[0])} ${f1(q[1])}`).join(' L');
    switch (it.t) {
      case 's': {
        const a = tp(it.a), b = tp(it.b), d = `M${ps([a, b])}`, w = it.w * k;
        return (it.ol ? `<path d="${d}" class="fig-ol" stroke-width="${f1(w + 3)}"/>` : '') + `<path d="${d}" class="${it.cls}" stroke-width="${f1(w)}" fill="none" stroke-linecap="round"/>`;
      }
      case 'l':
        return `<path d="M${ps(it.pts.map(tp))}" class="${it.cls}" stroke-width="${f1(it.w * k)}" fill="none" stroke-linecap="round"/>`;
      case 'c': {
        const c = tp(it.c);
        return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(it.r * k)}" class="${it.cls}"/>`;
      }
      case 'p': {
        const pts = it.hull ? hull(it.pts.map(tp)) : it.pts.map(tp);
        return `<path d="M${ps(pts)} Z" class="${it.cls}" stroke-width="${f1(it.w * k)}" stroke-linejoin="round"/>`;
      }
      case 'g': {
        // primero el contorno de todas las piezas (color de fondo) y luego el relleno: sin costuras internas
        const O = 1.5, rd = 2.2 * k;
        let ol = '', fl = '';
        for (const q of it.parts) {
          if (q.k === 'tube') {
            const sp = q.pts.map(tp), rr = q.r.map((r) => r * k);
            ol += tuboSVG(sp, rr.map((r) => r + O)); fl += `<g class="${q.cls}">${tuboSVG(sp, rr)}</g>`;
          } else if (q.k === 'ball') {
            const c = tp(q.c);
            ol += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(q.r * k + O)}"/>`; fl += `<circle class="${q.cls}" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(q.r * k)}"/>`;
          } else {
            const d = `M${ps(hull(q.pts.map(tp)))} Z`;
            ol += `<path d="${d}" stroke-width="${f1(rd * 2 + O * 2)}" stroke-linejoin="round"/>`; fl += `<path class="${q.cls}" d="${d}" stroke-width="${f1(rd * 2)}" stroke-linejoin="round"/>`;
          }
        }
        return `<g class="fig-olf">${ol}</g>${fl}`;
      }
      case 'hair': {
        // casco: mitad trasera de la cabeza respecto del plano perpendicular al eje (cara + un poco hacia arriba)
        const C = tp(it.c), A = tp(v3(it.c, it.eje, it.r)), R = it.r * k;
        const az = (pr(v3(it.c, it.eje, 1))[2] - pr(it.c)[2]);
        let dx = A[0] - C[0], dy = A[1] - C[1];
        const l = Math.hypot(dx, dy) || 1e-6; dx /= l; dy /= l;
        const px = -dy, py = dx, pts = [];
        for (let i = 0; i <= 16; i++) { const t = (Math.PI * i) / 16; pts.push([C[0] + px * R * Math.cos(t) - dx * R * Math.sin(t), C[1] + py * R * Math.cos(t) - dy * R * Math.sin(t)]); }
        for (let i = 16; i >= 0; i--) { const t = (Math.PI * i) / 16; pts.push([C[0] + px * R * Math.cos(t) - dx * R * az * Math.sin(t), C[1] + py * R * Math.cos(t) - dy * R * az * Math.sin(t)]); }
        const d = `M${ps(pts)} Z`;
        return `<path d="${d}" class="fig-olf" stroke-width="${f1(3 * k)}" stroke-linejoin="round"/><path d="${d}" class="${it.cls}" stroke-width="${f1(0.6 * k)}" stroke-linejoin="round"/>`;
      }
      case 'b': {
        const h = hull(it.c.map(tp));
        return `<path d="M${ps(h)} Z" class="${it.cls} fig-boxe"/><path d="M${ps(it.top.map(tp))} Z" class="fig-ptop"/>`;
      }
    }
    return '';
  }
  const prof = (it, pr) => { const p = puntos(it); let s = 0; for (const q of p) s += pr(q)[2]; return s / p.length; };

  /* encuadre: ajusta escala y centro para que todo el movimiento quepa */
  function encuadre(anim, tl, px, pr, musc) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const fr = tl.frames.length > 4 ? tl.frames.filter((_, i) => i % 2 === 0) : tl.frames;
    for (const f of fr) {
      const E = escena(anim, f, px, musc);
      for (const it of E.bg.concat(E.fg, E.todo)) for (const q of puntos(it)) {
        const s = pr(q);
        x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]);
      }
    }
    if (!anim.noFloor) y1 = Math.max(y1, pr([0, G + 3, 0])[1]);
    const pad = 14;
    const k = Math.min(1.15, (VBW - 2 * pad) / Math.max(1, x1 - x0), (VBH - 2 * pad) / Math.max(1, y1 - y0));
    const T = [VBW / 2 - ((x0 + x1) / 2) * k, -8 + VBH / 2 - (((y0 + y1) / 2) - G) * k];
    return { k, T };
  }

  /* distancia mínima entre dos segmentos 2D: devuelve [distancia, t en A, u en B] */
  function segSeg(a0, a1, b0, b1) {
    const d1 = [a1[0] - a0[0], a1[1] - a0[1]], d2 = [b1[0] - b0[0], b1[1] - b0[1]], r = [a0[0] - b0[0], a0[1] - b0[1]];
    const A = d1[0] * d1[0] + d1[1] * d1[1], Bq = d1[0] * d2[0] + d1[1] * d2[1], C = d2[0] * d2[0] + d2[1] * d2[1];
    const D = d1[0] * r[0] + d1[1] * r[1], F = d2[0] * r[0] + d2[1] * r[1];
    const cl = (x) => Math.max(0, Math.min(1, x));
    let t, u;
    if (A < 1e-9 && C < 1e-9) { t = 0; u = 0; }
    else if (A < 1e-9) { t = 0; u = cl(F / C); }
    else if (C < 1e-9) { u = 0; t = cl(-D / A); }
    else {
      const den = A * C - Bq * Bq;
      t = den > 1e-9 ? cl((Bq * F - C * D) / den) : 0;
      u = (Bq * t + F) / C;
      if (u < 0) { u = 0; t = cl(-D / A); } else if (u > 1) { u = 1; t = cl((Bq - D) / A); }
    }
    const p = [a0[0] + d1[0] * t, a0[1] + d1[1] * t], q = [b0[0] + d2[0] * u, b0[1] + d2[1] * u];
    return [Math.hypot(p[0] - q[0], p[1] - q[1]), t, u];
  }
  /* piezas del cuerpo ordenadas de atrás hacia adelante.
     Para cada par que se tapa en pantalla se compara la profundidad justo donde se cruzan:
     el orden solo cambia cuando las piezas realmente se tocan (sin saltos al girar o moverse) */
  function ordenar(E, pr) {
    const o0 = pr(E.pelvis), o1 = pr(v3(E.pelvis, E.lat, 10)), cara = (o1[2] - o0[2]) / 10;
    const dT = pr(E.centro)[2];
    const U = [
      ...E.limbs.map((l) => ({ n: l.n, tipo: 'limb', l, segs: l.segs, k: l.lado * cara * 8 + (prof(l.it, pr) - dT) })),
      { n: 'torso', tipo: 'torso', segs: E.segT, k: 0 },
      { n: 'cabeza', tipo: 'cabeza', segs: E.segH, k: 0.1 },
    ];
    for (const u of U) u.ps = u.segs.map(([a, b, r]) => [pr(a), pr(b), r]);
    const n = U.length, antes = U.map(() => new Set()), grado = U.map(() => 0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let mejor = null;
      for (const [a0, a1, ra] of U[i].ps) for (const [b0, b1, rb] of U[j].ps) {
        const [d, t, u] = segSeg(a0, a1, b0, b1), sol = ra + rb - d;
        if (sol <= -4) continue;
        // solo cuenta si en 3D las piezas están separadas (en las uniones, hombro o cadera, se interpenetran y no indican nada)
        const za = a0[2] + (a1[2] - a0[2]) * t, zb = b0[2] + (b1[2] - b0[2]) * u;
        if (Math.hypot(d, za - zb) - (ra + rb) < -2.5) continue;
        if (!mejor || sol > mejor.sol) mejor = { sol, za, zb };
      }
      if (!mejor) continue;
      const [atras, adel] = mejor.za < mejor.zb ? [i, j] : [j, i];
      antes[adel].add(atras);
    }
    // orden topológico; sin restricción (o en ciclos) decide la regla general
    const hecho = new Set(), out = [];
    while (out.length < n) {
      let elegido = -1;
      for (let i = 0; i < n; i++) if (!hecho.has(i) && [...antes[i]].every((x) => hecho.has(x)) && (elegido < 0 || U[i].k < U[elegido].k)) elegido = i;
      if (elegido < 0) for (let i = 0; i < n; i++) if (!hecho.has(i) && (elegido < 0 || U[i].k < U[elegido].k)) elegido = i;
      hecho.add(elegido); out.push(U[elegido]);
    }
    return out;
  }

  function dibujar(anim, pose, px, th, ph, fit, musc, sinPiso) {
    const pr = camara(th, ph);
    const { k, T } = fit;
    const E = escena(anim, pose, px, musc);
    let s = '';
    if (!anim.noFloor && !sinPiso) {
      const c = E.pelvis, Y = G + 3;
      const fl = [];
      const piso = [[-110, -48], [110, -48], [110, 48], [-110, 48]].map(([x, z]) => [x, Y, z]);
      s += render(poly(piso, 'fig-floor3'), pr, k, T);
      for (let x = -88; x <= 88; x += 44) fl.push(seg([x, Y, -48], [x, Y, 48], 1, 'fig-grid', false));
      for (const z of [-24, 0, 24]) fl.push(seg([-110, Y, z], [110, Y, z], 1, 'fig-grid', false));
      s += fl.map((it) => render(it, pr, k, T)).join('');
      const sh = [];
      for (let i = 0; i < 20; i++) { const t = (2 * Math.PI * i) / 20; sh.push([c[0] + Math.cos(t) * 34, Y, Math.sin(t) * 16]); }
      s += render(poly(sh, 'fig-shadow'), pr, k, T);
    }
    const ord = (arr) => arr.map((it, i) => ({ it, i, d: prof(it, pr) })).sort((a, b) => a.d - b.d || a.i - b.i);
    const R = (it) => { s += render(it, pr, k, T); };
    for (const o of ord(E.bg)) R(o.it);
    const props = E.fg.map((it) => ({ it, lado: it.lado || 0, mb: it.mb, d: prof(it, pr) })).sort((a, b) => a.d - b.d);
    for (const u of ordenar(E, pr)) {
      if (u.tipo === 'limb') { // cada accesorio se dibuja justo después de la extremidad que lo sostiene
        R(u.l.it);
        props.filter((q) => q.lado === u.l.lado && q.mb === u.l.mb).forEach((q) => R(q.it));
      } else if (u.tipo === 'torso') {
        E.torso.forEach(R);
        props.filter((q) => !q.lado).forEach((q) => R(q.it));
      } else { // cabeza: cola de caballo (si queda atrás), cara, casco de pelo, ojos y nariz (solo si miran a la cámara)
        const H = E.cab, dH = pr(H.c)[2];
        const colaAtras = H.cola && prof(H.cola, pr) < dH;
        if (colaAtras) R(H.cola);
        R(H.cara); R(H.pelo);
        for (const q of H.rasgos) if (pr(q.c)[2] > dH + 1.5) R(q);
        if (H.cola && !colaAtras) R(H.cola);
      }
    }
    return s;
  }

  const vistaNativa = (anim) => anim.vista || (anim.mode === 'front' ? 'frente' : 'lado');

  function controlesHTML() {
    return `<div class="a3d-vistas">${VISTAS.map((v) => `<button type="button" data-v3="${v.k}">${v.n}</button>`).join('')}</div>
      <div class="a3d-ctl">
        <button type="button" data-c3="play" aria-label="Pausa">⏸</button>
        <button type="button" data-c3="vel">1×</button>
        <button type="button" data-c3="giro">⟳ Girar</button>
        <button type="button" data-c3="fig" aria-label="Cambiar figura">${estiloFig() === 'm' ? '♀ Mujer' : '♂ Hombre'}</button>
        <span class="a3d-hint">↔ arrastra para rotar</span>
      </div>`;
  }

  /* ============================================================
     RENDER 3D REAL (WebGL): cada píxel muestra lo que está más cerca de la cámara,
     así brazos, piernas, torso y accesorios nunca se "montan" al girar o moverse.
     Si el teléfono no tiene WebGL se usa el dibujo SVG de arriba.
     ============================================================ */
  const GLX = (() => {
    const VS = `attribute vec3 p; attribute vec3 n; attribute vec3 c; attribute float o;
      uniform mat4 M; uniform mat3 R; uniform float ow; uniform mediump float lin;
      varying vec3 vc; varying vec3 vn;
      void main() {
        vn = R * n; vc = c;
        vec3 q = p;
        if (lin > 0.5) {
          if (o < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          q = p + n * ow; // contorno: copia un poco más grande; solo se pinta su lado trasero (casco invertido)
        }
        gl_Position = M * vec4(q, 1.0);
      }`;
    const FS = `precision mediump float; varying vec3 vc; varying vec3 vn; uniform float lin; uniform vec3 olc;
      void main() {
        if (lin > 0.5) { if (vn.z > 0.0) discard; gl_FragColor = vec4(olc, 1.0); return; }
        vec3 nn = normalize(vn);
        float d = abs(dot(nn, normalize(vec3(-0.45, -0.65, 0.62))));
        float rim = pow(1.0 - abs(nn.z), 3.0) * 0.08;
        gl_FragColor = vec4(min(vc * (0.64 + 0.42 * d) - rim, vec3(1.0)), 1.0);
      }`;
    function crear(canvas) {
      const gl = canvas.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
      if (!gl) return null;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pg = gl.createProgram();
      gl.attachShader(pg, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pg);
      if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) { console.warn('WebGL:', gl.getProgramInfoLog(pg), gl.getShaderInfoLog(gl.getAttachedShaders(pg)[0]), gl.getShaderInfoLog(gl.getAttachedShaders(pg)[1])); return null; }
      gl.useProgram(pg);
      const buf = gl.createBuffer();
      const at = (nm) => gl.getAttribLocation(pg, nm), un = (nm) => gl.getUniformLocation(pg, nm);
      return { gl, pg, buf, a: { p: at('p'), n: at('n'), c: at('c'), o: at('o') }, u: { M: un('M'), R: un('R'), ow: un('ow'), lin: un('lin'), olc: un('olc') } };
    }

    /* ---- colores: se leen del CSS (tema claro/oscuro, hombre/mujer, músculos resaltados) ---- */
    let sonda = null, cv1 = null;
    const cacheCol = new Map();
    function aRGB(str) {
      if (!cv1) { cv1 = document.createElement('canvas'); cv1.width = cv1.height = 1; }
      const x = cv1.getContext('2d', { willReadFrequently: true });
      x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = str; x.fillRect(0, 0, 1, 1);
      const d = x.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
    }
    function colorDe(cls, svgCls) {
      const key = svgCls + '|' + cls + '|' + (document.documentElement.dataset.tema || '');
      if (cacheCol.has(key)) return cacheCol.get(key);
      if (!sonda) {
        sonda = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        sonda.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;left:-9px;top:-9px');
        sonda.setAttribute('aria-hidden', 'true');
        document.body.appendChild(sonda);
      }
      sonda.setAttribute('class', svgCls);
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('class', cls); el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'none'); sonda.appendChild(el);
      const cs = getComputedStyle(el);
      // discos de peso: color del borde (acento), igual que las mancuernas
      let f = /fig-plate/.test(cls) ? cs.stroke : cs.fill;
      if (!f || f === 'none') f = cs.stroke;
      const op = parseFloat(cs.opacity || '1') * parseFloat(cs.fillOpacity || '1');
      const c = aRGB(f); c[3] *= op;
      el.remove();
      cacheCol.set(key, c);
      return c;
    }
    const sobre = (c, fondo) => [c[0] * c[3] + fondo[0] * (1 - c[3]), c[1] * c[3] + fondo[1] * (1 - c[3]), c[2] * c[3] + fondo[2] * (1 - c[3])];

    /* ---- geometría (triángulos sueltos: posición, normal, color, contorno) ---- */
    const esfera = (la, lo) => {
      const out = [];
      const P = (i, j) => { const t = (Math.PI * i) / la, f = (2 * Math.PI * j) / lo; return [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)]; };
      for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) {
        const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
        out.push(a, b, c, a, c, d);
      }
      return out;
    };
    const ESF = esfera(8, 14), ESF2 = esfera(6, 10); // ESF2: puntas redondeadas de los tubos
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const pto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const un3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    let BUF = new Float32Array(400000);
    class Malla {
      constructor() { this.i = 0; }
      v(p, n, c, o) {
        if (this.i + 10 > BUF.length) { const nb = new Float32Array(BUF.length * 2); nb.set(BUF); BUF = nb; }
        const b = BUF, i = this.i;
        b[i] = p[0]; b[i + 1] = p[1]; b[i + 2] = p[2]; b[i + 3] = n[0]; b[i + 4] = n[1]; b[i + 5] = n[2]; b[i + 6] = c[0]; b[i + 7] = c[1]; b[i + 8] = c[2]; b[i + 9] = o;
        this.i = i + 10;
      }
      get d() { return BUF.subarray(0, this.i); }
      tri(a, b, c, na, nb, nc, col, o) { this.v(a, na, col, o); this.v(b, nb, col, o); this.v(c, nc, col, o); }
      esfera(c, r, col, o = 1, E = ESF) { for (const q of E) this.v([c[0] + q[0] * r, c[1] + q[1] * r, c[2] + q[2] * r], q, col, o); }
      tubo(pts, rr, col, o = 1, tapas = true) {
        const P = [], Rr = [];
        for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < 4; s++) { const t = s / 4; P.push(L3(pts[i], pts[i + 1], t)); Rr.push(rr[i] + (rr[i + 1] - rr[i]) * t); }
        P.push(pts[pts.length - 1]); Rr.push(rr[rr.length - 1]);
        const N = 11, anillos = [];
        let U = null;
        for (let i = 0; i < P.length; i++) {
          const T = un3(sub(P[Math.min(i + 1, P.length - 1)], P[Math.max(i - 1, 0)]));
          if (!U) U = un3(cruz(T, Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
          else U = un3(sub(U, T.map((x) => x * pto(U, T))));
          const V = cruz(T, U), ring = [];
          for (let j = 0; j < N; j++) { const f = (2 * Math.PI * j) / N, n = [U[0] * Math.cos(f) + V[0] * Math.sin(f), U[1] * Math.cos(f) + V[1] * Math.sin(f), U[2] * Math.cos(f) + V[2] * Math.sin(f)]; ring.push([v3(P[i], n, Rr[i]), n]); }
          anillos.push(ring);
        }
        for (let i = 0; i < anillos.length - 1; i++) for (let j = 0; j < N; j++) {
          const a = anillos[i][j], b = anillos[i + 1][j], c = anillos[i + 1][(j + 1) % N], d = anillos[i][(j + 1) % N];
          this.tri(a[0], b[0], c[0], a[1], b[1], c[1], col, o); this.tri(a[0], c[0], d[0], a[1], c[1], d[1], col, o);
        }
        if (tapas) { this.esfera(P[0], Rr[0], col, o, ESF2); this.esfera(P[P.length - 1], Rr[Rr.length - 1], col, o, ESF2); }
      }
      // torso: anillos de 8 puntos (uno por nivel) unidos entre sí
      volumen(pts, lat, front, col) {
        const rings = [];
        for (let i = 0; i + 8 <= pts.length; i += 8) {
          const r = pts.slice(i, i + 8), c = r.reduce((s, q) => [s[0] + q[0] / 8, s[1] + q[1] / 8, s[2] + q[2] / 8], [0, 0, 0]);
          r.sort((a, b) => Math.atan2(pto(sub(a, c), front), pto(sub(a, c), lat)) - Math.atan2(pto(sub(b, c), front), pto(sub(b, c), lat)));
          rings.push({ r, c });
        }
        // cada nivel se suaviza a 16 puntos (curva) para que no se vea facetado
        const suave = (r) => { const o = []; for (let j = 0; j < 8; j++) { const a = r[j], b = r[(j + 1) % 8], p0 = r[(j + 7) % 8], p3 = r[(j + 2) % 8]; o.push(a, [0, 1, 2].map((k) => (-p0[k] + 9 * a[k] + 9 * b[k] - p3[k]) / 16)); } return o; };
        const R2 = rings.map(({ r, c }) => ({ r: suave(r), c }));
        const n16 = (q, c) => un3(sub(q, c));
        for (let i = 0; i < R2.length - 1; i++) for (let j = 0; j < 16; j++) {
          const A = R2[i], B = R2[i + 1], a = A.r[j], b = B.r[j], c = B.r[(j + 1) % 16], d = A.r[(j + 1) % 16];
          this.tri(a, b, c, n16(a, A.c), n16(b, B.c), n16(c, B.c), col, 1); this.tri(a, c, d, n16(a, A.c), n16(c, B.c), n16(d, A.c), col, 1);
        }
        for (const k of [0, R2.length - 1]) { // tapas
          const { r, c } = R2[k], nn = un3(sub(c, R2[k === 0 ? 1 : k - 1].c));
          for (let j = 0; j < 16; j++) this.tri(c, r[j], r[(j + 1) % 16], nn, nn, nn, col, 1);
        }
      }
      // casco de pelo: casquete de esfera del lado opuesto a la cara
      pelo(c, r, eje, col) {
        const e = un3(eje), u = un3(cruz(e, Math.abs(e[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = cruz(e, u);
        const t0 = Math.acos(0.08), nt = 7, nf = 16;
        const P = (i, j) => { const t = t0 + ((Math.PI - t0) * i) / nt, f = (2 * Math.PI * j) / nf; const n = [0, 1, 2].map((k) => e[k] * Math.cos(t) + (u[k] * Math.cos(f) + w[k] * Math.sin(f)) * Math.sin(t)); return [v3(c, n, r), n]; };
        for (let i = 0; i < nt; i++) for (let j = 0; j < nf; j++) {
          const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1);
          this.tri(a[0], b[0], cc[0], a[1], b[1], cc[1], col, 0); this.tri(a[0], cc[0], d[0], a[1], cc[1], d[1], col, 0);
        }
      }
      plano(pts, col) { // polígono convexo plano (suelo, discos, plataformas)
        if (pts.length < 3) return;
        const c = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length, s[2] + q[2] / pts.length], [0, 0, 0]);
        const n = un3(cruz(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
        for (let i = 0; i < pts.length; i++) this.tri(c, pts[i], pts[(i + 1) % pts.length], n, n, n, col, 0);
      }
      caja(cs, col) {
        const cen = cs.reduce((s, q) => [s[0] + q[0] / 8, s[1] + q[1] / 8, s[2] + q[2] / 8], [0, 0, 0]);
        for (const f of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]) {
          const q = f.map((i) => cs[i]), fc = q.reduce((s, x) => [s[0] + x[0] / 4, s[1] + x[1] / 4, s[2] + x[2] / 4], [0, 0, 0]), n = un3(sub(fc, cen));
          this.tri(q[0], q[1], q[2], n, n, n, col, 1); this.tri(q[0], q[2], q[3], n, n, n, col, 1);
        }
      }
    }

    /* ---- escena → triángulos ---- */
    function construir(E, svgCls, conPiso, anim) {
      const m = new Malla(), C = (cls) => colorDe(cls, svgCls);
      const fondo = colorDe('fig-olf', svgCls);
      const col = (cls) => { const c = C(cls); return c[3] < 1 ? sobre(c, fondo) : c.slice(0, 3); };
      const item = (it) => {
        switch (it.t) {
          case 'g':
            for (const q of it.parts) {
              if (q.k === 'tube') m.tubo(q.pts, q.r, col(q.cls));
              else if (q.k === 'ball') m.esfera(q.c, q.r, col(q.cls));
              else m.volumen(q.pts, q.lat, q.front, col(q.cls));
            }
            break;
          case 's': m.tubo([it.a, it.b], [it.w / 2, it.w / 2], col(it.cls), it.w >= 6 ? 1 : 0, it.w >= 6); break;
          case 'l': m.tubo(it.pts, it.pts.map(() => it.w / 2), col(it.cls), 0, false); break;
          case 'c': m.esfera(it.c, it.r, col(it.cls), 0); break;
          case 'p':
            if (it.hull && it.pts.length > 6) { // disco de peso: cilindro con grosor
              const c = it.pts.reduce((s2, q) => [s2[0] + q[0] / it.pts.length, s2[1] + q[1] / it.pts.length, s2[2] + q[2] / it.pts.length], [0, 0, 0]);
              const nn = un3(cruz(sub(it.pts[1], it.pts[0]), sub(it.pts[2], it.pts[0]))), r = Math.hypot(...sub(it.pts[0], c)), cc = col(it.cls);
              m.tubo([v3(c, nn, -1.6), v3(c, nn, 1.6)], [r, r], cc, 1, false);
              m.plano(it.pts.map((q) => v3(q, nn, 1.6)), cc); m.plano(it.pts.map((q) => v3(q, nn, -1.6)), cc);
            } else m.plano(it.pts, col(it.cls));
            break;
          case 'b': m.caja(it.c, col(it.cls)); break;
          case 'hair': m.pelo(it.c, it.r, it.eje, col(it.cls)); break;
        }
      };
      if (conPiso && !anim.noFloor) {
        const Y = G + 3, cP = col('fig-floor3'), cG = col('fig-grid'), cS = sobre([0, 0, 0, 0.28], cP);
        m.plano([[-110, Y, -48], [110, Y, -48], [110, Y, 48], [-110, Y, 48]], cP);
        const raya = (a, b) => { const d = un3(sub(b, a)), s = [d[2] * 0.5, 0, -d[0] * 0.5]; m.plano([v3(a, s, -1), v3(b, s, -1), v3(b, s, 1), v3(a, s, 1)].map((q) => [q[0], Y - 0.08, q[2]]), cG); };
        for (let x = -88; x <= 88; x += 44) raya([x, Y, -48], [x, Y, 48]);
        for (const z of [-24, 0, 24]) raya([-110, Y, z], [110, Y, z]);
        const c = E.pelvis, sh = [];
        for (let i = 0; i < 20; i++) { const t = (2 * Math.PI * i) / 20; sh.push([c[0] + Math.cos(t) * 34, Y - 0.16, Math.sin(t) * 16]); }
        m.plano(sh, cS);
      }
      E.bg.forEach(item); E.fg.forEach(item);
      E.limbs.forEach((l) => item(l.it)); E.torso.forEach(item);
      item(E.cab.cara); item(E.cab.pelo); if (E.cab.cola) item(E.cab.cola); E.cab.rasgos.forEach(item);
      return m.d;
    }

    /* ---- cámara: misma proyección y encuadre que el SVG ---- */
    function matrices(th, ph, fit) {
      const c = Math.cos(rad(th)), s = Math.sin(rad(th)), cp = Math.cos(rad(ph)), sp = Math.sin(rad(ph)), { k, T } = fit;
      const ax = 2 / VBW, ay = 2 / VBH, Z = 1 / 320;
      // por columnas (WebGL)
      const M = new Float32Array([
        k * c * ax, -k * s * sp * ay, -s * cp * Z, 0,
        0, -k * cp * ay, sp * Z, 0,
        -k * s * ax, -k * c * sp * ay, -c * cp * Z, 0,
        T[0] * ax - 1, 1 - (T[1] + 8) * ay + k * cp * G * ay, -sp * G * Z, 1,
      ]);
      const R = new Float32Array([c, s * sp, s * cp, 0, cp, -sp, -s, c * sp, c * cp]);
      return { M, R };
    }
    function dibujarGL(ctx, datos, th, ph, fit, svgCls) {
      const { gl, buf, a, u } = ctx;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, datos, gl.DYNAMIC_DRAW);
      const F = 40;
      gl.enableVertexAttribArray(a.p); gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, F, 0);
      gl.enableVertexAttribArray(a.n); gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, F, 12);
      gl.enableVertexAttribArray(a.c); gl.vertexAttribPointer(a.c, 3, gl.FLOAT, false, F, 24);
      gl.enableVertexAttribArray(a.o); gl.vertexAttribPointer(a.o, 1, gl.FLOAT, false, F, 36);
      const { M, R } = matrices(th, ph, fit);
      gl.uniformMatrix4fv(u.M, false, M); gl.uniformMatrix3fv(u.R, false, R);
      gl.uniform1f(u.ow, 1.7 / fit.k);
      const ol = colorDe('fig-olf', svgCls);
      gl.uniform3f(u.olc, ol[0], ol[1], ol[2]);
      const n = datos.length / 10;
      gl.uniform1f(u.lin, 0); gl.drawArrays(gl.TRIANGLES, 0, n);
      gl.uniform1f(u.lin, 1); gl.drawArrays(gl.TRIANGLES, 0, n);
    }

    // lienzo compartido para miniaturas e imágenes fijas
    let off = null;
    const cacheImg = new Map();
    function imagen(anim, pose, px, th, ph, fit, musc, conPiso, key) {
      const svgCls = claseSvg() + (document.documentElement.dataset.tema === 'claro' ? ' claro' : '');
      const k2 = key && key + '|' + svgCls;
      if (k2 && cacheImg.has(k2)) return cacheImg.get(k2);
      if (!off) { const cv = document.createElement('canvas'); cv.width = 480; cv.height = 376; off = crear(cv); if (!off) return null; off.cv = cv; }
      const E = escena(anim, pose, px, musc);
      dibujarGL(off, construir(E, svgCls, conPiso, anim), th, ph, fit, svgCls);
      const url = off.cv.toDataURL('image/png');
      if (k2) { if (cacheImg.size > 400) cacheImg.clear(); cacheImg.set(k2, url); }
      return url;
    }
    // miniaturas diferidas: se dibujan de a poco (sin congelar la pantalla) y se reemplazan al estar listas
    const VACIA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 188'/%3E";
    const cola = new Map();
    let corriendo = false;
    function trabajar() {
      const t0 = performance.now();
      for (const [k2, fn] of cola) {
        cola.delete(k2);
        const url = fn();
        if (url) document.querySelectorAll(`img[data-figk="${k2}"]`).forEach((im) => { im.src = url; im.removeAttribute('data-figk'); });
        if (performance.now() - t0 > 14) break;
      }
      if (cola.size) requestAnimationFrame(trabajar); else corriendo = false;
    }
    function diferida(anim, pose, px, th, ph, fit, musc, conPiso, key) {
      const svgCls = claseSvg() + (document.documentElement.dataset.tema === 'claro' ? ' claro' : '');
      const k2 = key + '|' + svgCls;
      if (cacheImg.has(k2)) return { url: cacheImg.get(k2) };
      if (!cola.has(k2)) cola.set(k2, () => imagen(anim, pose, px, th, ph, fit, musc, conPiso, key));
      if (!corriendo) { corriendo = true; requestAnimationFrame(trabajar); }
      return { url: VACIA, k2 };
    }
    let ok = null;
    const disponible = () => {
      if (ok === null) { try { const cv = document.createElement('canvas'); ok = !!(cv.getContext('webgl')); } catch (e) { ok = false; } }
      return ok;
    };
    return { crear, construir, dibujarGL, imagen, diferida, disponible, colorDe };
  })();
  const usarGL = () => { try { return localStorage.getItem('entreno_svg3d') !== '1' && GLX.disponible(); } catch (e) { return GLX.disponible(); } };

  /* monta la figura 3D en un contenedor; devuelve la función para detenerla */
  function mount(box, anim, musc) {
    if (!box || !anim) return () => {};
    EST = estiloFig();
    const conGL = usarGL();
    box.innerHTML = (conGL ? '<canvas class="big a3d-svg fig" aria-label="Animación del ejercicio"></canvas>'
      : `<svg class="big a3d-svg ${claseSvg()}" viewBox="${VB}" aria-label="Animación del ejercicio"></svg>`) + controlesHTML();
    const svg = box.querySelector(conGL ? 'canvas' : 'svg');
    let ctx = null;
    const tema = () => claseSvg() + (document.documentElement.dataset.tema === 'claro' ? ' claro' : '');
    if (conGL) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(240, box.clientWidth || 320);
      svg.width = Math.round(w * dpr); svg.height = Math.round((w * dpr * VBH) / VBW);
      ctx = GLX.crear(svg);
    }
    const tl = tlOf(anim), px = pivote(anim);
    const ini = VISTAS.find((v) => v.k === (anim.vista || ultimaVista || vistaNativa(anim)));
    const st = { th: ini.th, ph: ini.ph, t: 0, vel: 1, play: true, giro: false, fit: null, sel: ini.k };
    // anima suavemente hacia la vista elegida
    let meta = null;
    const refit = () => { st.fit = encuadre(anim, tl, px, camara(st.th, st.ph)); };
    const marcar = () => box.querySelectorAll('[data-v3]').forEach((b) => b.classList.toggle('on', b.dataset.v3 === st.sel));
    const ir = (k) => {
      const v = VISTAS.find((x) => x.k === k);
      let d = ((v.th - st.th) % 360 + 540) % 360 - 180; // camino más corto
      meta = { th: st.th + d, ph: v.ph };
      st.sel = k; ultimaVista = k; st.giro = false;
      box.querySelector('[data-c3="giro"]').classList.remove('on');
      marcar();
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !box.contains(b)) return;
      if (b.dataset.v3) ir(b.dataset.v3);
      else if (b.dataset.c3 === 'play') { st.play = !st.play; b.textContent = st.play ? '⏸' : '▶'; b.setAttribute('aria-label', st.play ? 'Pausa' : 'Reproducir'); }
      else if (b.dataset.c3 === 'vel') { st.vel = st.vel === 1 ? 0.5 : st.vel === 0.5 ? 0.25 : 1; b.textContent = st.vel === 1 ? '1×' : st.vel === 0.5 ? '½×' : '¼×'; b.classList.toggle('on', st.vel !== 1); }
      else if (b.dataset.c3 === 'fig') {
        const nv = estiloFig() === 'm' ? 'h' : 'm';
        try { localStorage.setItem('entreno_fig', nv); } catch (er) { /* sin almacenamiento */ }
        b.textContent = nv === 'm' ? '♀ Mujer' : '♂ Hombre';
        EST = nv; if (!ctx) svg.setAttribute('class', 'big a3d-svg ' + claseSvg()); refit();
        document.querySelectorAll('svg.fig:not(.a3d-svg)').forEach((x) => x.classList.toggle('mujer', nv === 'm'));
      } else if (b.dataset.c3 === 'giro') { st.giro = !st.giro; meta = null; b.classList.toggle('on', st.giro); if (st.giro) { st.sel = null; marcar(); } }
    });
    // arrastre horizontal para girar (el vertical sigue desplazando la página)
    let drag = null;
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, th: st.th, ph: st.ph }; meta = null; });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const w = svg.getBoundingClientRect().width || 300;
      st.th = drag.th - ((e.clientX - drag.x) / w) * 220;
      if (e.pointerType === 'mouse') st.ph = Math.max(-5, Math.min(75, drag.ph + ((e.clientY - drag.y) / w) * 120));
      if (st.sel) { st.sel = null; marcar(); }
      if (st.giro) { st.giro = false; box.querySelector('[data-c3="giro"]').classList.remove('on'); }
    });
    const fin = () => { drag = null; };
    svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin); svg.addEventListener('pointerleave', fin);
    marcar();
    refit();
    let raf, prev = performance.now(), lastTh = null, lastPh = null;
    const step = (now) => {
      const dt = Math.min(100, now - prev); prev = now;
      if (st.play) st.t += dt * st.vel;
      if (st.giro) st.th += dt * 0.03;
      if (meta) {
        const a = 1 - Math.pow(0.0001, dt / 1000 * 1.6);
        st.th += (meta.th - st.th) * a; st.ph += (meta.ph - st.ph) * a;
        if (Math.abs(meta.th - st.th) < 0.2 && Math.abs(meta.ph - st.ph) < 0.2) { st.th = meta.th; st.ph = meta.ph; meta = null; }
      }
      if (st.th !== lastTh || st.ph !== lastPh) { refit(); lastTh = st.th; lastPh = st.ph; }
      if (ctx) GLX.dibujarGL(ctx, GLX.construir(escena(anim, poseAt(tl, st.t), px, musc), tema(), true, anim), st.th, st.ph, st.fit, tema());
      else svg.innerHTML = dibujar(anim, poseAt(tl, st.t), px, st.th, st.ph, st.fit, musc);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      if (ctx) { const ext = ctx.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); ctx = null; }
    };
  }

  const ids = new WeakMap();
  let nId = 0;
  const idDe = (a) => { if (!ids.has(a)) ids.set(a, ++nId); return ids.get(a); };
  const img = (url, extra = '') => `<img class="${claseSvg()}" src="${url}" alt=""${extra}>`;

  /* imagen fija (para pruebas o miniaturas) */
  function still(anim, vista = 'tq', frame = 1) {
    if (!anim) return '';
    const tl = tlOf(anim), px = pivote(anim), v = VISTAS.find((x) => x.k === vista);
    const fit = encuadre(anim, tl, px, camara(v.th, v.ph));
    const f = tl.frames[Math.min(frame, tl.frames.length - 1)];
    if (usarGL()) { const r = GLX.diferida(anim, f, px, v.th, v.ph, fit, null, true, `${idDe(anim)}|s|${vista}|${frame}`); return img(r.url, r.k2 ? ` data-figk="${r.k2}"` : ''); }
    const dib = dibujar(anim, f, px, v.th, v.ph, fit);
    return `<svg viewBox="${VB}" class="${claseSvg()}">${dib}</svg>`;
  }

  /* miniatura: vista lateral levemente girada para dar volumen */
  function mini(anim, frame = 1, musc) {
    if (!anim) return '';
    const tl = tlOf(anim), px = pivote(anim);
    const vv = anim.vista && VISTAS.find((x) => x.k === anim.vista);
    const th = vv ? vv.th : anim.mode === 'front' ? 68 : 20, ph = vv ? vv.ph : 9;
    const fit = encuadre(anim, tl, px, camara(th, ph));
    const f = tl.frames[Math.min(frame, tl.frames.length - 1)];
    if (usarGL()) { const r = GLX.diferida(anim, f, px, th, ph, fit, musc, false, `${idDe(anim)}|m|${frame}|${musc ? musc.d + '/' + musc.i : ''}`); return img(r.url, ' aria-hidden="true"' + (r.k2 ? ` data-figk="${r.k2}"` : '')); }
    const dib = dibujar(anim, f, px, th, ph, fit, musc, true);
    return `<svg viewBox="${VB}" class="${claseSvg()}" aria-hidden="true">${dib}</svg>`;
  }

  /* cuadro en un instante cualquiera del movimiento (para revisar transiciones) */
  function enT(anim, ms, vista = 'tq', musc) {
    const tl = tlOf(anim), px = pivote(anim), v = typeof vista === 'object' ? vista : VISTAS.find((x) => x.k === vista);
    const fit = encuadre(anim, tl, px, camara(v.th, v.ph), musc);
    if (usarGL()) { const u = GLX.imagen(anim, poseAt(tl, ms), px, v.th, v.ph, fit, musc, true); if (u) return img(u); }
    const dib = dibujar(anim, poseAt(tl, ms), px, v.th, v.ph, fit, musc);
    return `<svg viewBox="${VB}" class="${claseSvg()}">${dib}</svg>`;
  }

  function diag(anim, ms, th, ph = 10) {
    const tl = tlOf(anim), px = pivote(anim), pr = camara(th, ph);
    const E = escena(anim, poseAt(tl, ms), px);
    return ordenar(E, pr).map((u) => ({ n: u.n, ps: u.ps.map(([a, b, r]) => [a, b, r]) }));
  }

  return { mount, still, mini, enT, diag, segSeg, VISTAS, usarGL, _gl: GLX, _esc: (a, pose, musc) => escena(a, pose, pivote(a), musc) };
})();

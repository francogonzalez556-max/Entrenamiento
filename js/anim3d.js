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
      const ls = p.leg.s || [1, 1];
      const dTh = L.th * Math.sqrt(Math.max(0, 1 - ls[0] * ls[0]));
      const dSh = -L.sh * Math.sqrt(Math.max(0, 1 - ls[1] * ls[1]));
      const lado = (hp, k, an, sh, el, ha) => {
        const H = P(hp), K = P(k, dTh), A = P(an, dTh + dSh);
        return { hip: H, kn: K, an: A, toe: v3(A, [11, 0, H[2] * 0.25]), sh: P(sh), el: P(el), ha: P(ha) };
      };
      const N = lado(J.hpL, J.kL, J.anL, J.shL, J.eL, J.hL);
      const F = lado(J.hpR, J.kR, J.anR, J.shR, J.eR, J.hR);
      const head = P(J.head);
      const B = {
        N, F, head, nose: v3(head, [9, 0, 0]),
        torso: [P([J.cx - 11, J.y]), P([J.cx + 11, J.y]), F.sh, N.sh],
        neck: [P([J.cx, J.y - 48]), head],
        pelvis: P([J.cx, J.y]),
      };
      B.map = { handL: N.ha, handR: F.ha, hL: N.ha, hR: F.ha, handsMid: v3(N.ha, v3(F.ha, N.ha, -1), 0.5), shL: N.sh, shR: F.sh, head, cx: px, y: J.y, ry: J.ry };
      B.P = (x, y, z = 0) => [z, y, -(x - px)];
      Object.assign(B, { hipC: P([J.cx, J.y]), shC: P([J.cx, J.y - 48]), lat: [0, 0, 1], front: [1, 0, 0] });
      return B;
    }
    const J = sideJoints(p);
    const latY = anim.lat === 'y'; // acostado de lado: el ancho del cuerpo queda en vertical
    const P = (q, z = 0) => (latY ? [q[0] - px, q[1] - z, 0] : [q[0] - px, q[1], z]);
    const lado = (s, kn, an, tn, el, ha) => ({
      hip: P(J.hip, 9 * s), kn: P(kn, 9 * s), an: P(an, 9 * s), toe: P(tn, 9 * s),
      sh: P(J.sh, 16 * s), el: P(el, 16 * s), ha: P(ha, 16 * s),
    });
    const N = lado(1, J.kn, J.an, J.tn, J.en, J.hn);
    const F = lado(-1, J.kf, J.af, J.tf, J.ef, J.hf);
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
    for (const pr of anim.props || []) {
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
          bg.push(seg(a, P(pr.to[0], pr.to[1], front ? 0 : a[2]), 2, 'fig-cable', false));
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
          if (pr.at === 'handN' && B.bilateral && !yaDbF) mancuerna(M.handF, axis, fg);
          break;
        }
      }
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

  function escena(anim, pose, px, musc) {
    const B = cuerpo(anim, pose, px);
    const { bg, fg } = props(anim, B, pose);
    const body = [];
    // extremidades con volumen: muslo y pantorrilla más gruesos arriba, antebrazo más fino en la muñeca
    const extremidad = (S, lado) => {
      const b = lado === 'n' ? 'fb-n' : 'fb-f';
      const talon = v3(S.an, v3(S.an, S.toe, -1), 0.32);
      body.push(grupo([
        tubo([S.hip, L3(S.hip, S.kn, 0.4), S.kn], [9.4, 8.4, 6.1], claseM(b, 'muslo', musc)),
        tubo([S.kn, L3(S.kn, S.an, 0.3), S.an], [6.0, 6.8, 4.1], claseM(b, 'pierna', musc)),
        tubo([talon, S.toe], [4.4, 3.4], 'fig-shoe' + (lado === 'f' ? ' far' : '')),
      ]));
      body.push(grupo([
        bola(S.sh, 7.1, claseM(b, 'hombro', musc)),
        tubo([S.sh, L3(S.sh, S.el, 0.45), S.el], [6.2, 5.9, 4.6], claseM(b, 'brazo', musc)),
        tubo([S.el, L3(S.el, S.ha, 0.3), S.ha], [4.7, 4.9, 3.4], claseM(b, 'antebrazo', musc)),
        bola(S.ha, 4.1, b),
      ]));
    };
    extremidad(B.F, 'f');
    // torso: hombros, pecho, cintura y cadera (dos volúmenes para marcar la cintura)
    const nivel = (t, w, fr, bk) => {
      const c = L3(B.hipC, B.shC, t), out = [];
      for (const sz of [-1, 1]) for (const [k, d] of [[1, fr], [0.7, fr * 1.15], [1, bk], [0.7, bk * 1.1]]) out.push(v3(v3(c, B.lat, sz * w * k), B.front, d));
      return out;
    };
    const sup = [...nivel(1, 14.5, 5.5, -6.5), ...nivel(0.8, 16, 10, -9), ...nivel(0.52, 13.5, 8.5, -7.5)];
    const inf = [...nivel(0.52, 13.5, 8.5, -7.5), ...nivel(0.28, 12.5, 8.5, -7), ...nivel(0, 13.5, 6.5, -9)];
    body.push(grupo([{ k: 'hull', pts: inf, cls: claseM('fb-n', 'torsoI', musc) }, { k: 'hull', pts: sup, cls: claseM('fb-n', 'torsoS', musc) }]));
    // glúteos (detrás de la cadera)
    for (const sz of [-1, 1]) body.push(grupo([bola(v3(v3(L3(B.hipC, B.shC, 0.04), B.lat, sz * 6.5), B.front, -5.5), 7.6, claseM('fb-n', 'gluteo', musc))]));
    const cuello = L3(B.shC, B.head, 0.15);
    body.push(grupo([tubo([cuello, L3(B.shC, B.head, 0.6)], [5.4, 4.8], 'fb-n'), bola(B.head, L.head + 0.6, 'fb-n')]));
    body.push(ball(B.nose, 3.2, 'fig-nose'));
    extremidad(B.N, 'n');
    return { bg, fg: body.concat(fg), pelvis: B.pelvis };
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
  const puntos = (it) => (it.t === 's' ? [it.a, it.b] : it.t === 'c' ? [it.c] : it.t === 'b' ? it.c : it.t === 'g' ? it.parts.flatMap((q) => (q.k === 'ball' ? [q.c] : q.pts)) : it.pts);
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
      for (const it of E.bg.concat(E.fg)) for (const q of puntos(it)) {
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
    for (const o of ord(E.bg)) s += render(o.it, pr, k, T);
    for (const o of ord(E.fg)) s += render(o.it, pr, k, T);
    return s;
  }

  const vistaNativa = (anim) => (anim.mode === 'front' ? 'frente' : 'lado');

  function controlesHTML() {
    return `<div class="a3d-vistas">${VISTAS.map((v) => `<button type="button" data-v3="${v.k}">${v.n}</button>`).join('')}</div>
      <div class="a3d-ctl">
        <button type="button" data-c3="play" aria-label="Pausa">⏸</button>
        <button type="button" data-c3="vel">1×</button>
        <button type="button" data-c3="giro">⟳ Girar</button>
        <span class="a3d-hint">↔ arrastra para rotar</span>
      </div>`;
  }

  /* monta la figura 3D en un contenedor; devuelve la función para detenerla */
  function mount(box, anim, musc) {
    if (!box || !anim) return () => {};
    box.innerHTML = `<svg class="fig big a3d-svg" viewBox="${VB}" aria-label="Animación del ejercicio"></svg>${controlesHTML()}`;
    const svg = box.querySelector('svg');
    const tl = tlOf(anim), px = pivote(anim);
    const ini = VISTAS.find((v) => v.k === (ultimaVista || vistaNativa(anim)));
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
      else if (b.dataset.c3 === 'giro') { st.giro = !st.giro; meta = null; b.classList.toggle('on', st.giro); if (st.giro) { st.sel = null; marcar(); } }
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
      svg.innerHTML = dibujar(anim, poseAt(tl, st.t), px, st.th, st.ph, st.fit, musc);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }

  /* imagen fija (para pruebas o miniaturas) */
  function still(anim, vista = 'tq', frame = 1) {
    if (!anim) return '';
    const tl = tlOf(anim), px = pivote(anim), v = VISTAS.find((x) => x.k === vista);
    const fit = encuadre(anim, tl, px, camara(v.th, v.ph));
    const f = tl.frames[Math.min(frame, tl.frames.length - 1)];
    return `<svg viewBox="${VB}" class="fig">${dibujar(anim, f, px, v.th, v.ph, fit)}</svg>`;
  }

  /* miniatura: vista lateral levemente girada para dar volumen */
  function mini(anim, frame = 1, musc) {
    if (!anim) return '';
    const tl = tlOf(anim), px = pivote(anim);
    const th = anim.mode === 'front' ? 68 : 20, ph = 9;
    const fit = encuadre(anim, tl, px, camara(th, ph));
    const f = tl.frames[Math.min(frame, tl.frames.length - 1)];
    return `<svg viewBox="${VB}" class="fig" aria-hidden="true">${dibujar(anim, f, px, th, ph, fit, musc, true)}</svg>`;
  }

  return { mount, still, mini, VISTAS };
})();

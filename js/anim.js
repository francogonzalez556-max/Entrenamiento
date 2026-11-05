/* ============================================================
   Motor de animación de figuras (SVG, offline)
   ============================================================ */
const Fig = (() => {
  const L = { torso: 52, neck: 18, head: 10, ua: 30, fa: 28, th: 42, sh: 40, foot: 11 };
  const G = 170;
  const VB = '0 -8 240 188';
  const rad = (d) => (d * Math.PI) / 180;
  const dir = (a, l) => [Math.cos(rad(a)) * l, Math.sin(rad(a)) * l];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const f1 = (n) => Math.round(n * 10) / 10;
  const pt = (p) => `${f1(p[0])} ${f1(p[1])}`;

  function ik(S, T, l1, l2, bend) {
    const dx = T[0] - S[0], dy = T[1] - S[1];
    let d = Math.hypot(dx, dy);
    const base = Math.atan2(dy, dx);
    d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, d));
    const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    const J = [S[0] + Math.cos(base + bend * a) * l1, S[1] + Math.sin(base + bend * a) * l1];
    const E = [S[0] + Math.cos(base) * d, S[1] + Math.sin(base) * d];
    return [J, E];
  }

  function limb(S, spec, l1, l2, defBend) {
    if (spec.ik) return ik(S, spec.ik, l1, l2, spec.bend ?? defBend);
    const J = add(S, dir(spec.a[0], l1));
    return [J, add(J, dir(spec.a[1], l2))];
  }

  /* ---- interpolación ---- */
  function merge(a, b) {
    if (!b) return structuredClone(a);
    const o = structuredClone(a);
    for (const k in b) {
      const v = b[k];
      o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' ? merge(o[k], v) : structuredClone(v);
    }
    return o;
  }
  function lerp(a, b, t) {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
    if (Array.isArray(a)) return a.map((v, i) => lerp(v, b ? b[i] : v, t));
    if (a && typeof a === 'object') {
      const o = {};
      for (const k in a) o[k] = b && k in b ? lerp(a[k], b[k], t) : a[k];
      return o;
    }
    return a;
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function timeline(anim) {
    const frames = anim.frames.map((f) => merge(anim.base || {}, f));
    const holds = anim.frames.map((f) => f.hold ?? 250);
    const total = holds.reduce((s, h) => s + h + anim.dur, 0);
    const linear = frames.length > 2;
    return { frames, holds, total, dur: anim.dur, linear };
  }
  function poseAt(tl, ms) {
    let t = ms % tl.total;
    const n = tl.frames.length;
    for (let i = 0; i < n; i++) {
      if (t < tl.holds[i]) return tl.frames[i];
      t -= tl.holds[i];
      if (t < tl.dur) {
        const k = t / tl.dur;
        return lerp(tl.frames[i], tl.frames[(i + 1) % n], tl.linear ? k : ease(k));
      }
      t -= tl.dur;
    }
    return tl.frames[0];
  }

  /* ---- cálculo de articulaciones ---- */
  function sideJoints(p) {
    const hip = p.hip, sh = add(hip, dir(p.torso, L.torso));
    const head = add(sh, dir(p.torso + (p.head || 0), L.neck));
    const leg = p.leg || {}, arm = p.arm || {};
    const legN = leg.n || { a: [90, 90] }, legF = leg.f || legN;
    const armN = arm.n || { a: [90, 90] }, armF = arm.f || armN;
    const [kn, an] = limb(hip, legN, L.th, L.sh, -1);
    const [kf, af] = limb(hip, legF, L.th, L.sh, -1);
    const [en, hn] = limb(sh, armN, L.ua, L.fa, 1);
    const [ef, hf] = limb(sh, armF, L.ua, L.fa, 1);
    const footAng = (k, a, o) => {
      if (o !== undefined) return o;
      if (a[1] > G - 5) return 0;
      return (Math.atan2(a[1] - k[1], a[0] - k[0]) * 180) / Math.PI - 90;
    };
    const tn = add(an, dir(footAng(kn, an, p.footN), L.foot));
    const tf = add(af, dir(footAng(kf, af, p.footF ?? p.footN), L.foot));
    return { hip, sh, head, kn, an, kf, af, en, hn, ef, hf, tn, tf, handN: hn, handF: hf };
  }

  function frontJoints(p) {
    const cx = p.cx, y = p.hipY;
    const shR = [cx + 16, y - 48], shL = [cx - 16, y - 48];
    const hpR = [cx + 9, y], hpL = [cx - 9, y];
    const head = [cx, y - 66];
    const la = p.leg.a, ls = p.leg.s || [1, 1], aa = p.arm.a;
    const mir = (a) => 180 - a;
    const kR = add(hpR, dir(la[0], L.th * ls[0])), anR = add(kR, dir(la[1], L.sh * ls[1]));
    const kL = add(hpL, dir(mir(la[0]), L.th * ls[0])), anL = add(kL, dir(mir(la[1]), L.sh * ls[1]));
    let eR, hR, eL, hL;
    if (p.arm.ik) {
      const t = p.arm.ik, bd = p.arm.bend ?? 1;
      [eR, hR] = ik(shR, t, L.ua, L.fa, bd);
      [eL, hL] = ik(shL, [2 * cx - t[0], t[1]], L.ua, L.fa, -bd);
    } else {
      eR = add(shR, dir(aa[0], L.ua)); hR = add(eR, dir(aa[1], L.fa));
      eL = add(shL, dir(mir(aa[0]), L.ua)); hL = add(eL, dir(mir(aa[1]), L.fa));
    }
    const handsMid = [(hR[0] + hL[0]) / 2, (hR[1] + hL[1]) / 2];
    return { cx, y, shR, shL, hpR, hpL, head, kR, anR, kL, anL, eR, hR, eL, hL, handR: hR, handL: hL, handsMid, ry: p.ry };
  }

  /* ---- dibujo ---- */
  const path = (pts, cls, w) => `<path d="M${pts.map(pt).join(' L')}" class="${cls}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

  function dumbbell(p, vertical) {
    const [x, y] = p;
    if (vertical) {
      return `<g class="fig-acc"><rect x="${f1(x - 1.5)}" y="${f1(y - 10)}" width="3" height="20" rx="1"/>` +
        `<rect x="${f1(x - 7)}" y="${f1(y - 13)}" width="14" height="5" rx="2"/><rect x="${f1(x - 7)}" y="${f1(y + 8)}" width="14" height="5" rx="2"/></g>`;
    }
    return `<g class="fig-acc"><rect x="${f1(x - 10)}" y="${f1(y - 1.5)}" width="20" height="3" rx="1"/>` +
      `<rect x="${f1(x - 13)}" y="${f1(y - 7)}" width="5" height="14" rx="2"/><rect x="${f1(x + 8)}" y="${f1(y - 7)}" width="5" height="14" rx="2"/></g>`;
  }
  function plate(p) {
    return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="18" class="fig-plate"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.5" class="fig-acc"/>`;
  }

  function propsSVG(anim, J, layer) {
    let s = '';
    for (const pr of anim.props || []) {
      const fg = ['db', 'dbh', 'dbv', 'plate', 'bar', 'hbar', 'rope'].includes(pr.t);
      if ((layer === 'fg') !== fg) continue;
      switch (pr.t) {
        case 'rect':
          s += `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="4" class="fig-prop"/>`;
          break;
        case 'chairS':
          s += `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="6" rx="2" class="fig-prop"/>` +
            `<rect x="${pr.x - 2}" y="${pr.y - 46}" width="6" height="52" rx="2" class="fig-prop"/>` +
            `<rect x="${pr.x + 1}" y="${pr.y + 6}" width="4" height="${G - pr.y - 6}" class="fig-prop"/>` +
            `<rect x="${pr.x + pr.w - 5}" y="${pr.y + 6}" width="4" height="${G - pr.y - 6}" class="fig-prop"/>`;
          break;
        case 'chairF': {
          const cx = J.cx, y = J.y;
          s += `<rect x="${cx - 22}" y="${y - 50}" width="44" height="50" rx="4" class="fig-prop" opacity=".6"/>` +
            `<rect x="${cx - 28}" y="${y + 2}" width="56" height="7" rx="2" class="fig-prop"/>` +
            `<rect x="${cx - 27}" y="${y + 9}" width="4" height="${G - y - 9}" class="fig-prop"/>` +
            `<rect x="${cx + 23}" y="${y + 9}" width="4" height="${G - y - 9}" class="fig-prop"/>`;
          break;
        }
        case 'ellip':
          s += `<rect x="60" y="162" width="135" height="8" rx="3" class="fig-prop"/>` +
            `<path d="M96 160 L180 152" class="fig-prop-l" stroke-width="5" fill="none" stroke-linecap="round"/>` +
            `<path d="M178 162 L152 66" class="fig-prop-l" stroke-width="6" fill="none" stroke-linecap="round"/>` +
            `<rect x="144" y="56" width="22" height="12" rx="3" class="fig-prop"/>` +
            `<circle cx="182" cy="148" r="12" class="fig-prop"/>`;
          break;
        case 'db':
        case 'dbh':
          s += dumbbell(J[pr.at], !!pr.v);
          break;
        case 'dbv':
          s += dumbbell(J[pr.at], true);
          break;
        case 'plate': {
          const p = J[pr.at];
          s += plate([p[0], p[1] + (pr.dy || 0)]);
          break;
        }
        case 'line':
          s += `<path d="M${pr.x1} ${pr.y1} L${pr.x2} ${pr.y2}" class="fig-prop-l" stroke-width="${pr.w || 5}" fill="none" stroke-linecap="round"/>`;
          break;
        case 'hline':
          s += `<path d="M${pr.x1} ${pr.y} L${pr.x2} ${pr.y}" class="fig-prop-l" stroke-width="${pr.w || 5}" fill="none" stroke-linecap="round"/>`;
          break;
        case 'cable': {
          const a = J[pr.from];
          s += `<path d="M${pt(a)} L${pr.to[0]} ${pr.to[1]}" class="fig-cable" stroke-width="2" fill="none"/>`;
          break;
        }
        case 'bar': { // plataforma o barra corta centrada en una articulación
          const c = J[pr.at], d = dir(pr.ang, (pr.len || 40) / 2);
          s += `<path d="M${pt([c[0] - d[0], c[1] - d[1]])} L${pt([c[0] + d[0], c[1] + d[1]])}" class="fig-accl" stroke-width="7" fill="none" stroke-linecap="round"/>`;
          break;
        }
        case 'hbar': { // barra entre dos manos (vista frontal)
          const a = J[pr.a], b = J[pr.b], e = pr.ext || 10;
          s += `<path d="M${f1(Math.min(a[0], b[0]) - e)} ${f1(a[1])} L${f1(Math.max(a[0], b[0]) + e)} ${f1(b[1])}" class="fig-accl" stroke-width="5" fill="none" stroke-linecap="round"/>`;
          break;
        }
        case 'rope': { // cuerda para saltar
          const a = J.handL, b = J.handR, cy = 2 * J.ry - (a[1] + b[1]) / 2;
          s += `<path d="M${pt(a)} Q${f1(J.cx)} ${f1(cy)} ${pt(b)}" class="fig-cable" stroke-width="2.5" fill="none"/>`;
          break;
        }
        case 'bike':
          s += `<rect x="70" y="163" width="120" height="7" rx="3" class="fig-prop"/>` +
            `<path d="M100 104 L112 150 L160 82" class="fig-prop-l" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
            `<path d="M112 150 L112 163 M160 82 L165 140" class="fig-prop-l" stroke-width="5" fill="none" stroke-linecap="round"/>` +
            `<rect x="88" y="96" width="24" height="7" rx="3" class="fig-prop"/><path d="M152 78 L168 78" class="fig-prop-l" stroke-width="5" stroke-linecap="round"/>` +
            `<circle cx="165" cy="142" r="16" class="fig-prop"/><circle cx="112" cy="150" r="6" class="fig-prop"/>`;
          break;
        case 'treadmill':
          s += `<rect x="30" y="160" width="170" height="10" rx="4" class="fig-prop"/>` +
            `<path d="M190 160 L176 70 M176 92 L146 94" class="fig-prop-l" stroke-width="5" fill="none" stroke-linecap="round"/>` +
            `<rect x="164" y="60" width="26" height="12" rx="3" class="fig-prop"/>`;
          break;
      }
    }
    return s;
  }

  function drawSide(anim, p) {
    const J = sideJoints(p);
    let s = propsSVG(anim, J, 'bg');
    s += path([J.hip, J.kf, J.af, J.tf], 'fig-f', 7);
    s += path([J.sh, J.ef, J.hf], 'fig-f', 6.5);
    s += path([J.hip, J.sh], 'fig-n', 11);
    s += `<circle cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="${L.head}" class="fig-head"/>`;
    s += path([J.hip, J.kn, J.an, J.tn], 'fig-n', 7.5);
    s += path([J.sh, J.en, J.hn], 'fig-n', 7);
    s += propsSVG(anim, J, 'fg');
    return s;
  }

  function drawFront(anim, p) {
    const J = frontJoints(p);
    let s = propsSVG(anim, J, 'bg');
    s += path([J.hpL, J.kL, J.anL, add(J.anL, [-7, 0])], 'fig-n', 7.5);
    s += path([J.hpR, J.kR, J.anR, add(J.anR, [7, 0])], 'fig-n', 7.5);
    s += `<path d="M${pt(J.shL)} L${pt(J.shR)} L${pt([J.cx + 11, J.y])} L${pt([J.cx - 11, J.y])} Z" class="fig-body"/>`;
    s += `<circle cx="${J.head[0]}" cy="${J.head[1]}" r="${L.head}" class="fig-head"/>`;
    s += path([J.shL, J.eL, J.hL], 'fig-n', 7);
    s += path([J.shR, J.eR, J.hR], 'fig-n', 7);
    s += propsSVG(anim, J, 'fg');
    return s;
  }

  function draw(anim, pose) {
    const floor = anim.noFloor ? '' : `<line x1="0" y1="${G + 3}" x2="240" y2="${G + 3}" class="fig-floor"/>`;
    return floor + (anim.mode === 'front' ? drawFront(anim, pose) : drawSide(anim, pose));
  }

  /* ---- API ---- */
  const cache = new Map();
  function tlOf(anim) {
    if (!cache.has(anim)) cache.set(anim, timeline(anim));
    return cache.get(anim);
  }

  function mount(svg, anim) {
    if (!anim) return () => {};
    svg.setAttribute('viewBox', VB);
    const tl = tlOf(anim);
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      svg.innerHTML = draw(anim, poseAt(tl, now - t0));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }

  function still(anim, frame = 1) {
    if (!anim) return '';
    const tl = tlOf(anim);
    const f = tl.frames[Math.min(frame, tl.frames.length - 1)];
    return `<svg viewBox="${VB}" class="fig" aria-hidden="true">${draw(anim, f)}</svg>`;
  }

  return { mount, still, VB };
})();

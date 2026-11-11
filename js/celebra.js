/* ============================================================
   MOTIVACIÓN DURANTE LA SESIÓN (v1.24)
   - Avisos de avance al 25 %, 50 % y 75 % de la rutina
   - Celebración al terminar: resumen + fuegos artificiales (7 estilos que van rotando)
   Tono: celebra el esfuerzo y la constancia, nunca el peso ni "aguantar el dolor".
   ============================================================ */

/* ---------- Avance de la sesión ---------- */
// cada serie cuenta 1; calentamiento y cardio cuentan 1 cada uno
function avanceSesion() {
  const st = estadoItems();
  let hecho = 0, total = 0;
  for (const x of st) {
    if (x.k === 'ex') { hecho += Math.min(x.hechas, x.total); total += x.total; } else { total += 1; if (x.estado === 'ok') hecho += 1; }
  }
  return { pct: total ? hecho / total : 0, falta: total - hecho };
}
const MSJ_AVANCE = {
  25: [
    ['💪', '¡Vas en un 25%!', 'Buen comienzo, continúa así.'],
    ['🚀', '¡25% listo!', 'Ya entraste en ritmo. Sigue con buena técnica.'],
    ['👏', 'Un cuarto de la rutina', 'Lo más difícil era empezar, y ya lo hiciste.'],
  ],
  50: [
    ['🔥', '¡Mitad de la rutina!', 'Vas excelente. La segunda mitad es tuya.'],
    ['⚡', '¡50% completado!', 'Respira, hidrátate y sigue.'],
    ['🙌', '¡Ya vas en la mitad!', 'Cada serie que marcas suma.'],
  ],
  75: [
    ['🏁', '¡75%! Recta final', 'Mantén la técnica hasta la última repetición.'],
    ['⭐', '¡Ya casi!', 'Solo un poco más y la rutina es tuya.'],
    ['💥', '¡Tres cuartos listos!', 'Termina como empezaste: con control.'],
  ],
};
function revisarAvance() {
  if (typeof ctx === 'undefined' || !ctx.items) return;
  const lg = getLog(ctx.date, ctx.sid);
  if (!lg || lg.done) return;
  const { pct, falta } = avanceSesion();
  lg.hitosAv = lg.hitosAv || [];
  const nuevos = [25, 50, 75].filter((h) => pct * 100 >= h && !lg.hitosAv.includes(h));
  if (!nuevos.length || falta <= 0) return; // al 100 % se celebra al cerrar la sesión
  lg.hitosAv.push(...nuevos);
  save();
  const h = nuevos[nuevos.length - 1], ops = MSJ_AVANCE[h], [ico, tit, txt] = ops[(lg.hitosAv.length + Object.keys(S.logs).length) % ops.length];
  mostrarHito(ico, tit, `${txt} Quedan ${falta} ${falta === 1 ? 'paso' : 'pasos'}.`, h);
}
function mostrarHito(ico, tit, txt, pct) {
  let el = document.getElementById('hito');
  if (!el) { el = document.createElement('div'); el.id = 'hito'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  const r = 17, c = 2 * Math.PI * r;
  el.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="hito-f"/><circle cx="22" cy="22" r="${r}" class="hito-a" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/><text x="22" y="26.5" text-anchor="middle">${pct}%</text></svg>
    <div><b>${ico} ${tit}</b><span>${txt}</span></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  navigator.vibrate?.(40);
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3600);
  el.onclick = () => el.classList.remove('show');
}

/* ---------- Celebración al terminar ---------- */
const FIESTAS = [
  { estilo: 'clasico', ico: '🎆', tit: '¡Rutina completada!', txt: 'Cada sesión cuenta, y hoy sumaste una más.', col: ['#ff4d5e', '#ffd166', '#4dd2ff', '#ffffff'] },
  { estilo: 'anillo', ico: '🔥', tit: '¡Qué buena sesión!', txt: 'La constancia le gana a la intensidad. Así se construye.', col: ['#ff7a00', '#ffb347', '#ff3d3d'] },
  { estilo: 'palmera', ico: '💪', tit: '¡Más fuerte que ayer!', txt: 'Tu cuerpo se adapta a lo que haces seguido.', col: ['#ffd166', '#ffe9a8', '#f4a300'] },
  { estilo: 'estrella', ico: '⭐', tit: '¡Sesión estrella!', txt: 'Te comprometiste contigo y cumpliste.', col: ['#ffe14d', '#ffffff', '#9ad0ff'] },
  { estilo: 'corazon', ico: '❤️', tit: '¡Te cuidaste hoy!', txt: 'Moverte es una de las mejores cosas que puedes hacer por tu salud.', col: ['#ff4d6d', '#ff8fa3', '#ffccd5'] },
  { estilo: 'espiral', ico: '🏆', tit: '¡Misión cumplida!', txt: 'Lo importante es aparecer, y apareciste.', col: ['#7cff6b', '#4dd2ff', '#c77dff', '#ffd166'] },
  { estilo: 'confeti', ico: '🎉', tit: '¡A celebrar!', txt: 'Ahora descansa, hidrátate y come rico: eso también es entrenar.', col: ['#ff4d5e', '#ffd166', '#06d6a0', '#4dd2ff', '#c77dff'] },
];
function resumenSesion(lg) {
  let series = 0, ejercicios = 0, kg = 0;
  for (const [id, e] of Object.entries(lg.ex || {})) {
    const ok = (e.sets || []).filter((s) => s.ok);
    if (ok.length) ejercicios++;
    series += ok.length;
    const ex = getEj(id);
    if (ex && usaPeso(ex) && !esTiempo(ex)) for (const s of ok) kg += (num(s.w) || 0) * (num(s.r) || 0) * (ex.porLado ? 2 : 1);
  }
  const cardio = Object.values(lg.cardio || {}).reduce((a, c) => a + (c.ok ? num(c.min) || 0 : 0), 0);
  let dur = null;
  if (lg.ini && lg.fin) { const m = Math.round((new Date(lg.fin) - new Date(lg.ini)) / 60000); if (m >= 5 && m <= 240) dur = m; }
  const nSes = Object.values(S.logs).filter((x) => x.done).length;
  let racha = 0;
  try { racha = rachas().entreno; } catch (e) { /* sin rachas */ }
  return { series, ejercicios, kg: Math.round(kg), cardio, dur, nSes, racha, prs: (lg.prIds || []).length };
}
function celebrarSesion(lg, incompleta) {
  const R = resumenSesion(lg);
  // con dolor alto no hay fiesta: se reconoce el esfuerzo y se prioriza la recuperación
  const dolorMax = Math.max(num(lg.rodilla) || 0, ...Object.values(lg.dolor || {}).map((v) => num(v) || 0));
  const calma = dolorMax >= 6;
  const F = calma ? { estilo: null, ico: '🙏', tit: 'Sesión guardada', txt: `Registraste dolor de ${dolorMax}/10. Hoy prioriza el descanso; si no baja en 48 horas o empeora, revísalo con un profesional.`, col: [] }
    : FIESTAS[(Math.max(1, R.nSes) - 1) % FIESTAS.length];
  const stat = (v, l) => `<div class="fz-s"><b>${v}</b><span>${l}</span></div>`;
  const stats = [
    R.series ? stat(R.series, R.series === 1 ? 'serie' : 'series') : '',
    R.ejercicios ? stat(R.ejercicios, R.ejercicios === 1 ? 'ejercicio' : 'ejercicios') : '',
    R.dur ? stat(R.dur, 'minutos') : R.cardio ? stat(R.cardio, 'min de cardio') : '',
    R.kg >= 50 ? stat(R.kg.toLocaleString('es-CL'), 'kg levantados') : '',
    R.prs ? stat(R.prs, R.prs === 1 ? 'récord nuevo' : 'récords nuevos') : '',
  ].filter(Boolean).slice(0, 4).join('');
  const extra = [
    `Sesión n.º <b>${R.nSes}</b>${R.racha >= 2 ? ` · racha de <b>${R.racha}</b> días entrenando` : ''}`,
    incompleta ? 'No la terminaste completa, y está bien: lo que hiciste hoy también suma.' : '',
  ].filter(Boolean).map((t) => `<p>${t}</p>`).join('');
  const ov = document.createElement('div');
  ov.className = 'fiesta';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', F.tit);
  ov.innerHTML = `<canvas aria-hidden="true"></canvas>
    <div class="fz-card"><div class="fz-ico">${F.ico}</div><h2>${F.tit}</h2><p class="fz-txt">${F.txt}</p>
      <div class="fz-stats">${stats}</div><div class="fz-extra">${extra}</div>
      <button class="btn primary big" data-fz="ok">¡Listo!</button></div>`;
  document.body.appendChild(ov);
  if (!calma) navigator.vibrate?.([80, 60, 80, 60, 160]);
  const parar = calma ? () => {} : fuegos(ov.querySelector('canvas'), F);
  const cerrar = () => { parar(); ov.classList.add('out'); setTimeout(() => ov.remove(), 300); };
  ov.querySelector('[data-fz="ok"]').addEventListener('click', cerrar);
  setTimeout(() => ov.querySelector('[data-fz="ok"]').focus(), 50);
  return cerrar;
}

/* ---------- Fuegos artificiales (canvas) ---------- */
function fuegos(cv, F) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ctx2 = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  const medir = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); };
  medir();
  window.addEventListener('resize', medir);
  const P = [], cohetes = [], rnd = (a, b) => a + Math.random() * (b - a), col = () => F.col[(Math.random() * F.col.length) | 0];
  const chispa = (x, y, vx, vy, c, o = {}) => P.push({ x, y, vx, vy, c, vida: o.vida || rnd(55, 80), t: 0, g: o.g ?? 0.045, r: o.r || rnd(1.6, 2.6), drag: o.drag ?? 0.982, conf: o.conf, rot: rnd(0, 6), vr: rnd(-0.2, 0.2) });
  const forma = { // vectores de velocidad de cada patrón de explosión
    clasico: () => Array.from({ length: 70 }, () => { const a = rnd(0, 6.283), s = rnd(1.2, 4.2); return [Math.cos(a) * s, Math.sin(a) * s]; }),
    anillo: () => { const n = 56, s = rnd(3, 3.8), o = []; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; o.push([Math.cos(a) * s, Math.sin(a) * s], [Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55]); } return o; },
    palmera: () => Array.from({ length: 46 }, () => { const a = rnd(0, 6.283), s = rnd(2, 3.4); return [Math.cos(a) * s, Math.sin(a) * s - 0.6]; }),
    estrella: () => { const o = [], pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.45 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      for (let i = 0; i < 10; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 10]; for (let k = 0; k < 7; k++) { const t = k / 7; o.push([(x1 + (x2 - x1) * t) * 4, (y1 + (y2 - y1) * t) * 4]); } } return o; },
    corazon: () => { const o = []; for (let i = 0; i < 70; i++) { const t = (i / 70) * 6.283, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); o.push([x * 0.22, -y * 0.22]); } return o; },
    espiral: () => { const o = []; for (let i = 0; i < 64; i++) { const a = i * 0.62, s = 0.8 + (i / 64) * 3.4; o.push([Math.cos(a) * s, Math.sin(a) * s]); } return o; },
  };
  const explotar = (x, y) => {
    const est = F.estilo === 'confeti' ? 'clasico' : F.estilo, c0 = col(), mono = est === 'corazon' || est === 'estrella' || est === 'anillo';
    for (const [vx, vy] of forma[est]()) chispa(x, y, vx, vy, mono ? c0 : col(), est === 'palmera' ? { g: 0.06, vida: rnd(80, 110), drag: 0.975, r: 2.2 } : mono ? { g: 0.025, drag: 0.975 } : {});
  };
  const lanzar = () => { const x = rnd(W * 0.15, W * 0.85); cohetes.push({ x, y: H + 4, vx: rnd(-0.6, 0.6), vy: -rnd(H * 0.0105, H * 0.0135), meta: rnd(H * 0.16, H * 0.42), c: col() }); };
  const confeti = (n) => { for (let i = 0; i < n; i++) chispa(rnd(0, W), rnd(-H * 0.3, -10), rnd(-1, 1), rnd(1, 2.6), col(), { conf: true, g: 0.02, drag: 0.995, vida: 400, r: rnd(3, 6) }); };
  if (reduce) { // sin animación: unas pocas chispas quietas como adorno
    ctx2.globalAlpha = 0.8;
    for (let i = 0; i < 40; i++) { ctx2.fillStyle = col(); ctx2.beginPath(); ctx2.arc(rnd(0, W), rnd(0, H * 0.5), rnd(1.5, 3), 0, 6.283); ctx2.fill(); }
    return () => window.removeEventListener('resize', medir);
  }
  let raf, t0 = performance.now(), ult = 0, vivo = true;
  if (F.estilo === 'confeti') confeti(140);
  const paso = (now) => {
    const el = now - t0;
    if (el < 5200 && el - ult > (F.estilo === 'confeti' ? 900 : 420)) { lanzar(); if (Math.random() < 0.35) lanzar(); ult = el; }
    if (F.estilo === 'confeti' && el < 4000 && Math.random() < 0.3) confeti(3);
    ctx2.globalCompositeOperation = 'source-over';
    ctx2.fillStyle = 'rgba(10, 10, 16, 0.22)'; ctx2.fillRect(0, 0, W, H);
    ctx2.globalCompositeOperation = 'lighter';
    for (let i = cohetes.length - 1; i >= 0; i--) {
      const k = cohetes[i]; k.x += k.vx; k.y += k.vy; k.vy += 0.06;
      ctx2.fillStyle = k.c; ctx2.beginPath(); ctx2.arc(k.x, k.y, 2.2, 0, 6.283); ctx2.fill();
      chispa(k.x, k.y, rnd(-0.3, 0.3), rnd(0.5, 1.2), '#ffcf80', { vida: 18, r: 1.2, g: 0.02 });
      if (k.y <= k.meta || k.vy >= -0.5) { explotar(k.x, k.y); cohetes.splice(i, 1); }
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t++; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy;
      const a = Math.max(0, 1 - p.t / p.vida);
      if (a <= 0 || p.y > H + 20) { P.splice(i, 1); continue; }
      ctx2.globalAlpha = p.conf ? Math.min(1, a * 3) : a;
      ctx2.fillStyle = p.c;
      if (p.conf) { // papelito que gira
        ctx2.globalCompositeOperation = 'source-over';
        p.rot += p.vr; ctx2.save(); ctx2.translate(p.x, p.y); ctx2.rotate(p.rot); ctx2.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8 * Math.abs(Math.cos(p.t * 0.1)) + 0.6); ctx2.restore();
        ctx2.globalCompositeOperation = 'lighter';
      } else { ctx2.beginPath(); ctx2.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, 6.283); ctx2.fill(); }
    }
    ctx2.globalAlpha = 1;
    if (vivo && (el < 5200 || P.length || cohetes.length)) raf = requestAnimationFrame(paso);
  };
  raf = requestAnimationFrame(paso);
  return () => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('resize', medir); };
}

/* ---------- Ejercicios con peso opcional: cómo sostener el peso ---------- */
const PESO_OPC = {
  sentadilla_cajon: 'una mancuerna vertical pegada al pecho, codos hacia abajo',
  sentadilla_goblet: 'una mancuerna o kettlebell vertical pegada al pecho, codos hacia abajo',
  zancada: 'una mancuerna en cada mano, brazos colgando a los costados',
  zancada_frontal: 'una mancuerna en cada mano, brazos colgando a los costados',
  zancada_lateral: 'una mancuerna sostenida con ambas manos pegada al pecho',
  sentadilla_bulgara: 'una mancuerna en cada mano, brazos colgando a los costados',
  subida_cajon: 'una mancuerna en cada mano a los costados (sin peso: manos en la cintura)',
  peso_muerto_una_pierna: 'una mancuerna en la mano contraria a la pierna de apoyo, colgando bajo el hombro',
  talones_una_pierna: 'una mancuerna en la mano del mismo lado de la pierna que trabaja; la otra mano en la pared',
};
for (const [id, como] of Object.entries(PESO_OPC)) {
  const e = EJERCICIOS[id];
  if (e && !e.pasos.some((p) => p.startsWith('Con peso'))) e.pasos.push(`Con peso (opcional): ${como}.`);
}
const pesoOpcHTML = (id) => (PESO_OPC[id] ? `<p class="small muted pesoopc">🏋️ <b>Peso opcional:</b> ${PESO_OPC[id]}. Si lo haces sin peso, deja los kg vacíos.</p>` : '');

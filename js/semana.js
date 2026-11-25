/* ============================================================
   Progreso que se siente (v1.30)
   - Resumen semanal (Hoy los lunes a miércoles, y Progreso), compartible como imagen
   - Mejora de fuerza por ejercicio (primera sesión vs mejor marca)
   Seguridad: el peso no aparece en el resumen para menores ni con avisos de
   alimentación desordenada; nunca se premia comer menos ni bajar más rápido.
   ============================================================ */

const RIESGO_IDS = ['restriccion_atracon', 'ingesta_muy_baja', 'menor_en_deficit', 'perdida_rapida'];
function riesgoAlim() {
  try { return (alertasNutricion().alertas || []).some((a) => RIESGO_IDS.includes(a.id)); } catch (e) { return false; }
}

let semOff = 0; // semana elegida en Progreso (0 = esta, -1 = anterior…)

function resumenSemana(lun) {
  const fin = iso(addDays(parse(lun), 6));
  const enSem = (f) => f >= lun && f <= fin;
  const logs = Object.values(S.logs).filter((l) => l.done && enSem(l.fecha));
  let series = 0, kg = 0, cardio = 0, prs = 0;
  const prNombres = [];
  for (const l of logs) {
    const R = resumenSesion(l);
    series += R.series; kg += R.kg; cardio += R.cardio; prs += R.prs;
    for (const id of l.prIds || []) { const n = getEj(id)?.nombre; if (n && !prNombres.includes(n)) prNombres.push(n); }
  }
  const cams = S.caminatas.filter((c) => enSem(c.fecha));
  const deps = (S.deportes || []).filter((e) => enSem(e.fecha));
  cardio += minCaminatas(cams) + deps.reduce((a, e) => a + minEquivCardio(e), 0);
  const o = objetivos();
  let diasCom = 0, diasProt = 0;
  for (let i = 0; i < 7; i++) {
    const d = iso(addDays(parse(lun), i));
    if (d > today()) break;
    if (!diaCompleto(d)) continue;
    diasCom++;
    if (totales(diaComidas(d)).pr >= o.prot * 0.9) diasProt++;
  }
  // peso: promedio de la semana vs. promedio de la anterior (dato neutro, sin juicio)
  const prom = (a, b) => { const xs = S.pesos.filter((x) => x.fecha >= a && x.fecha <= b).map((x) => x.kg); return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null; };
  const pAct = prom(lun, fin), pAnt = prom(iso(addDays(parse(lun), -7)), iso(addDays(parse(lun), -1)));
  const metaSes = PLAN().orden.length;
  return {
    lun, fin, ses: logs.length, metaSes, series, kg: Math.round(kg), cardio: Math.round(cardio), prs, prNombres,
    pasos: sumar(cams, 'pasos'), km: r1(sumar(cams, 'km')), deportes: deps.length, diasCom, diasProt,
    peso: pAct == null ? null : r1(pAct), dPeso: pAct != null && pAnt != null ? r1(pAct - pAnt) : null,
    vacia: !logs.length && !cams.length && !deps.length && !diasCom,
  };
}
const mostrarPeso = () => S.perfil.edad >= 18 && !riesgoAlim();

function fraseSemana(R) {
  if (R.ses >= R.metaSes && R.metaSes) return '¡Semana completa! Cumpliste todas tus sesiones.';
  if (R.prs) return `Sumaste ${R.prs} ${R.prs === 1 ? 'récord' : 'récords'}: te estás poniendo más fuerte.`;
  if (R.ses) return `${R.ses} ${R.ses === 1 ? 'sesión' : 'sesiones'} hechas. Cada una cuenta.`;
  if (R.cardio) return 'Te mantuviste en movimiento. Esta semana vamos por la fuerza también.';
  return 'Semana nueva, oportunidad nueva. Empieza con una sesión corta.';
}

function statsSemana(R) {
  const st = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;
  const s = [
    R.ses > R.metaSes ? st(R.ses, `sesiones (meta ${R.metaSes})`) : st(`${R.ses}/${R.metaSes}`, 'sesiones'),
    R.series ? st(R.series, 'series') : '',
    R.kg >= 50 ? st(R.kg.toLocaleString('es-CL'), 'kg levantados') : '',
    R.cardio ? st(R.cardio, 'min de cardio') : '',
    R.prs ? st(R.prs, R.prs === 1 ? 'récord' : 'récords') : '',
    R.pasos ? st(R.pasos.toLocaleString('es-CL'), 'pasos') : R.km ? st(fmtN(R.km), 'km caminados') : '',
    R.diasCom ? st(`${R.diasCom}/7`, 'días de comida anotada') : '',
    R.diasCom ? st(`${R.diasProt}/7`, 'días con tu proteína') : '',
  ].filter(Boolean);
  return `<div class="sem-stats">${s.join('')}</div>`;
}

function resumenSemanaHTML(R, opts = {}) {
  const tit = `${fmt(R.lun)} – ${fmt(R.fin)}`;
  const peso = mostrarPeso() && R.peso != null
    ? `<p class="small muted">⚖️ Peso promedio: <b>${fmtN(R.peso)} kg</b>${R.dPeso != null ? ` (${R.dPeso > 0 ? '+' : R.dPeso < 0 ? '−' : '±'}${fmtN(Math.abs(R.dPeso))} vs. semana anterior)` : ''}. Mira la tendencia de varias semanas, no un día.</p>` : '';
  return `<div class="sem-res">
    <p class="sem-fecha">${tit}</p>
    <p class="sem-frase">${fraseSemana(R)}</p>
    ${statsSemana(R)}
    ${R.prNombres.length ? `<p class="small">🏆 Récords en: ${R.prNombres.slice(0, 4).map(esc).join(', ')}${R.prNombres.length > 4 ? '…' : ''}</p>` : ''}
    ${peso}
    ${opts.share === false ? '' : `<div class="btns"><button class="btn small-btn" data-act="semshare" data-l="${R.lun}">📤 Compartir</button>${opts.cerrar ? `<button class="btn ghost small-btn" data-act="semvisto" data-l="${R.lun}">Listo</button>` : ''}</div>`}
  </div>`;
}

// Hoy: de lunes a miércoles aparece el resumen de la semana pasada (una vez, se puede cerrar)
function resumenHoyHTML() {
  const t = today(), dow = parse(t).getDay();
  if (![1, 2, 3].includes(dow) || weekInfo(t).antes) return '';
  const lun = lunesDe(iso(addDays(parse(t), -7)));
  if ((S.semVisto || '') >= lun || lun < lunesDe(S.perfil.inicio)) return '';
  const R = resumenSemana(lun);
  if (R.vacia) return '';
  return `<div class="card sem-card"><h3>🗓️ Tu semana pasada</h3>${resumenSemanaHTML(R, { cerrar: true })}</div>`;
}

// Progreso: navegador de semanas
function resumenProgresoHTML() {
  const t = today(), lun = lunesDe(iso(addDays(parse(t), semOff * 7)));
  const ini = lunesDe(S.perfil.inicio);
  const R = resumenSemana(lun);
  return `<div class="card sem-card"><h3>🗓️ Resumen semanal</h3>
    <div class="weeknav"><button class="btn ghost" data-act="semnav" data-d="-1" ${lun <= ini ? 'disabled' : ''} aria-label="Semana anterior">‹</button><div><b>${semOff === 0 ? 'Esta semana' : semOff === -1 ? 'Semana pasada' : `Hace ${-semOff} semanas`}</b></div><button class="btn ghost" data-act="semnav" data-d="1" ${semOff >= 0 ? 'disabled' : ''} aria-label="Semana siguiente">›</button></div>
    ${R.vacia ? `<p class="small muted">${semOff === 0 ? 'Aún no hay registros esta semana. ¡Tu primera sesión la estrena!' : 'Sin registros esa semana.'}</p>` : resumenSemanaHTML(R)}</div>`;
}

/* ---- Imagen para compartir (1080×1350) ---- */
async function imagenSemana(R) {
  try { await document.fonts.load('64px Display'); await document.fonts.load('700 30px Inter'); } catch (e) { /* sin fuentes */ }
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0b0c'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#d4ff3a'; x.fillRect(0, 0, W, 14);
  x.fillStyle = '#d4ff3a'; x.font = '64px Display, Impact, sans-serif'; x.textBaseline = 'top';
  x.fillText('ATHLOS', 80, 80);
  x.fillStyle = '#9a9aa2'; x.font = '600 30px Inter, sans-serif';
  x.fillText('Enciende tu mejor versión', 80, 160);
  x.fillStyle = '#ffffff'; x.font = '110px Display, Impact, sans-serif';
  x.fillText('MI SEMANA', 80, 250);
  x.fillStyle = '#9a9aa2'; x.font = '600 34px Inter, sans-serif';
  x.fillText(`${fmt(R.lun)} – ${fmt(R.fin)}`, 80, 380);
  // frase (en 2 líneas como máximo)
  x.fillStyle = '#ffffff'; x.font = '700 40px Inter, sans-serif';
  const palabras = fraseSemana(R).split(' '); let lin = '', y = 450;
  for (const p of palabras) {
    if (x.measureText(lin + p).width > W - 160) { x.fillText(lin.trim(), 80, y); lin = ''; y += 52; }
    lin += p + ' ';
  }
  x.fillText(lin.trim(), 80, y);
  const datos = [
    R.ses > R.metaSes ? [R.ses, 'sesiones'] : [`${R.ses}/${R.metaSes}`, 'sesiones'],
    R.series ? [R.series, 'series'] : null,
    R.kg >= 50 ? [R.kg.toLocaleString('es-CL'), 'kg levantados'] : null,
    R.cardio ? [R.cardio, 'min de cardio'] : null,
    R.prs ? [R.prs, R.prs === 1 ? 'récord' : 'récords'] : null,
    R.pasos ? [R.pasos.toLocaleString('es-CL'), 'pasos'] : null,
    R.diasProt >= 3 ? [`${R.diasProt}/7`, 'días con mi proteína'] : null,
  ].filter(Boolean).slice(0, 6);
  datos.forEach(([v, l], i) => {
    const cx = 80 + (i % 2) * 470, cy = 600 + Math.floor(i / 2) * 210;
    x.fillStyle = '#18181b'; x.beginPath(); x.roundRect ? x.roundRect(cx, cy, 440, 180, 24) : x.rect(cx, cy, 440, 180); x.fill();
    x.fillStyle = '#d4ff3a'; x.font = '84px Display, Impact, sans-serif'; x.fillText(String(v), cx + 32, cy + 26);
    x.fillStyle = '#c8c8ce'; x.font = '600 28px Inter, sans-serif'; x.fillText(l, cx + 32, cy + 130);
  });
  x.fillStyle = '#6b6b73'; x.font = '500 24px Inter, sans-serif';
  x.fillText('Registrado con Athlos', 80, H - 70);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
function textoSemana(R) {
  return `🗓️ Mi semana en Athlos (${fmt(R.lun)} – ${fmt(R.fin)})\n${fraseSemana(R)}\n• ${R.ses > R.metaSes ? R.ses : `${R.ses}/${R.metaSes}`} sesiones${R.series ? ` · ${R.series} series` : ''}${R.kg >= 50 ? ` · ${R.kg.toLocaleString('es-CL')} kg levantados` : ''}${R.cardio ? `\n• ${R.cardio} min de cardio` : ''}${R.prs ? `\n• 🏆 ${R.prs} ${R.prs === 1 ? 'récord' : 'récords'}` : ''}${R.pasos ? `\n• ${R.pasos.toLocaleString('es-CL')} pasos` : ''}\n#Athlos Enciende tu mejor versión`;
}

/* ---- Mejora de fuerza por ejercicio ---- */
function mejorasFuerzaHTML(L) {
  const porEj = {};
  for (const l of L) for (const [id, e] of Object.entries(l.ex || {})) {
    const ok = (e.sets || []).filter((s) => s.ok && num(s.r));
    if (!ok.length) continue;
    const ex = getEj(id);
    if (!ex) continue;
    const conPeso = usaPeso(ex) && ok.some((s) => num(s.w));
    const v = conPeso ? Math.max(...ok.map((s) => e1rm(num(s.w) || 0, num(s.r)))) : Math.max(...ok.map((s) => num(s.r)));
    (porEj[id] = porEj[id] || { conPeso, pts: [] }).pts.push({ f: l.fecha, v, conPeso });
  }
  const filas = Object.entries(porEj).map(([id, x]) => {
    // si en algún momento empezó a usar peso, se compara solo dentro del mismo tipo
    const pts = x.pts.filter((p) => p.conPeso === x.pts[x.pts.length - 1].conPeso);
    if (pts.length < 2) return null;
    const ini = pts[0], mej = pts.reduce((a, b) => (b.v > a.v ? b : a));
    if (!(ini.v > 0) || mej.v <= ini.v) return null;
    return { id, ini, mej, conPeso: ini.conPeso, pct: Math.round(((mej.v - ini.v) / ini.v) * 100) };
  }).filter(Boolean).sort((a, b) => b.pct - a.pct).slice(0, 6);
  if (!filas.length) return '<h4>📈 Cuánto has mejorado</h4><p class="small muted">Cuando repitas un ejercicio en 2 o más sesiones, aquí verás cuánto mejoraste desde la primera vez.</p>';
  const max = Math.max(...filas.map((f) => f.pct));
  const u = (f) => (f.conPeso ? ' kg' : esTiempo(getEj(f.id)) ? ' s' : ' reps');
  return `<h4>📈 Cuánto has mejorado</h4><div class="mejoras">${filas.map((f) => `<div class="mej">
      <div class="mej-h"><b>${esc(getEj(f.id).nombre)}</b><span class="mej-p">+${f.pct}%</span></div>
      <div class="mej-bar"><i style="width:${Math.max(8, (f.pct / max) * 100)}%"></i></div>
      <span class="small muted">${fmt(f.ini.f)}: ${fmtN(f.ini.v)}${u(f)} → mejor: ${fmtN(f.mej.v)}${u(f)}${f.conPeso ? ' (1RM estimado)' : ''}</span></div>`).join('')}</div>`;
}

Object.assign(actions, {
  semnav(btn) { semOff = Math.min(0, semOff + +btn.dataset.d); rerender(); },
  semvisto(btn) { S.semVisto = btn.dataset.l; save(true); rerender(); },
  async semshare(btn) {
    const R = resumenSemana(btn.dataset.l);
    const txt = textoSemana(R);
    try {
      const blob = await imagenSemana(R);
      const file = blob && new File([blob], `athlos-semana-${R.lun}.png`, { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: txt }); return; }
      if (navigator.share) { await navigator.share({ text: txt }); return; }
      if (file) { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
      await navigator.clipboard?.writeText(txt);
      toast('Imagen descargada y resumen copiado');
    } catch (e) { if (e?.name !== 'AbortError') toast('No se pudo compartir'); }
  },
});

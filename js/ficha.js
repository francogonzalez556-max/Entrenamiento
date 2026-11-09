/* ============================================================
   FICHA TÉCNICA DEL PLAN: el programa completo en un documento
   imprimible (PDF) para que lo revise un profesional.
   ============================================================ */
function vFicha() {
  const p = S.perfil, t = today(), PL = PLAN(), wi = weekInfo(t);
  const lab = (lista, k) => (PERFIL_OPC[lista].find((x) => x[0] === k) || [])[2] || k || '—';
  const kg = pesoActual(), imc = r1(kg / Math.pow(p.estatura / 100, 2));
  const fz = fcZonas();
  const limit = (p.limit || []).map((z) => ZONAS[z] || z);
  const parq = p.parq ? ((p.parq.resp || []).some(Boolean) ? 'Al menos una respuesta "sí": modo precaución activo' : 'Todas "no"') + (p.parq.embarazo ? ' · embarazo o posparto' : '') : 'No completado';
  const rxTxt = (r) => (r ? `${r[0]} × ${esc(r[1])} · ${r[2]} s` : '—');
  const fila = (cols, th) => `<tr>${cols.map((c) => `<${th ? 'th' : 'td'}>${c}</${th ? 'th' : 'td'}>`).join('')}</tr>`;

  // 1. sesiones con su prescripción en las 3 fases
  const sesiones = PL.orden.map((sid) => {
    const ses = PL.ses[sid];
    const filas = [];
    for (const b of ses.bloques) {
      if (b.tipo === 'calentamiento') filas.push(fila([`Calentamiento ${b.corto ? 'corto (3-5 min)' : '(8-10 min) + series de aproximación'}`, '', '', '']));
      else if (b.tipo === 'ej') {
        const ex = getEj(b.id);
        filas.push(fila([`${esc(ex.nombre)}${b.ss ? ` <i>(superserie con ${esc(getEj(b.ss).nombre)})</i>` : ''}<br><span class="muted">${esc(ex.musculos || '')}</span>`, ...[0, 1, 2].map((i) => rxTxt(b.rx[i]))]));
      } else if (b.tipo === 'cardio') {
        filas.push(fila([`Cardio ${b.kind === 'z2' ? 'continuo zona 2' : b.kind === 'intervalos' ? 'intervalos' : 'final zona 2'} (${esc(PL.cardio.label)})`, ...[2, 6, 10].map((w) => esc(cardioRx(b.kind, w, PL.cardio, PL.cardioF).titulo.replace(/^.*·\s*/, '')))]));
      } else if (b.tipo === 'circuito') {
        filas.push(fila(['<b>Circuito</b>', ...[0, 1, 2].map((i) => `${b.rondas[i]} rondas · ${b.trabajo[i]} / ${b.pausa[i]} s pausa · ${b.entreRondas[i]} s entre rondas`)]));
        for (const e of b.ejercicios) filas.push(fila([`&nbsp;&nbsp;· ${esc(getEj(e.id).nombre)}`, ...[1, 2, 3].map((f) => (e.fases.includes(f) ? '✓' : '—'))]));
      }
    }
    filas.push(fila(['Vuelta a la calma (3-5 min)', '', '', '']));
    return `<div class="card fcard"><h3>Sesión ${sid} · ${esc(ses.nombre)} <span class="muted small">(${DIAS[ses.dow]})</span></h3><p class="small muted">${esc(ses.foco)}</p>
      <table class="ftab"><thead>${fila(['Ejercicio', 'Fase 1 (sem 1-4)', 'Fase 2 (sem 5-8)', 'Fase 3 (sem 9-12)'], true)}</thead><tbody>${filas.join('')}</tbody></table></div>`;
  }).join('');

  // 2. volumen semanal por grupo muscular (series efectivas = directas + ½ indirectas)
  const enf = sgEnfocados(enfoqueActivo(p)?.areas || []);
  const vols = [0, 1, 2].map((f) => volumenPlan(PL, f));
  const volFilas = SUBGRUPOS.map(([sg, nom]) => {
    const r = rangoSeries(p, sg, enf);
    return fila([nom, ...vols.map((v) => fmtN(efectivas(v[sg]))), `${r.min}-${r.max}`]);
  }).join('');

  // 3. ejercicios excluidos por molestias
  const excl = (p.limit || []).map((z) => {
    const ids = Object.keys(META).filter((id) => (META[id].no || []).includes(z) && EJERCICIOS[id]);
    return ids.length ? `<li><b>${ZONAS[z] || z}:</b> ${ids.map((id) => esc(EJERCICIOS[id].nombre)).join(', ')}</li>` : '';
  }).join('');

  // 4. registro real: adherencia, esfuerzo, dolor y cargas actuales
  const hechos = logsOrdenados().filter((l) => l.done);
  const ult4 = hechos.filter((l) => dayDiff(l.fecha, t) < 28);
  const rpes = hechos.slice(-8).map((l) => l.rpe).filter((x) => x != null);
  const rpeProm = rpes.length ? fmtN(rpes.reduce((a, b) => a + b, 0) / rpes.length) : '—';
  const manana = addDays(parse(t), 1), mIso = iso(manana);
  const cargas = [];
  for (const sid of PL.orden) for (const b of PL.ses[sid].bloques) {
    if (b.tipo !== 'ej') continue;
    const u = ultimaVez(b.id, mIso);
    if (!u) continue;
    const ex = getEj(b.id);
    cargas.push(fila([esc(ex.nombre), fmt(u.fecha), u.sets.map((s) => (num(s.w) ? `${s.w} kg × ` : '') + (s.r || '?')).join(' · '), u.rir != null ? String(u.rir) : '—']));
  }
  const dolor = zonasUsuario().map((z) => {
    const vals = hechos.map((l) => dolorDe(l, z)).filter((x) => x != null).slice(-6);
    const s = semaforoDolor(z, mIso);
    return `<li><b>${ZONAS[z]}:</b> ${vals.length ? vals.join(' → ') + ' /10' : 'sin registros'} · semáforo actual: <b>${s.nivel}</b></li>`;
  }).join('');

  return `${header('Ficha técnica del plan', '#/plan')}<section class="wrap ficha">
    <div class="noprint btns"><button class="btn primary" onclick="window.print()">🖨️ Imprimir o guardar PDF</button></div>
    <p class="small muted noprint">Lleva esta ficha a tu kinesiólogo, profesor de educación física o preparador físico. Tiene todo lo necesario para revisar el plan y anotar sus cambios.</p>

    <div class="card fcard"><h2>Ficha técnica del plan de entrenamiento</h2>
      <p class="small">${esc(p.nombre || '')} · generada el ${fmt(t, true)} ${parse(t).getFullYear()} · semana ${wi.antes ? 1 : wi.wk} de 12, fase ${wi.antes ? 1 : wi.phase}, ciclo ${wi.antes ? 1 : wi.ciclo}</p>
      <p class="small muted">Plan generado automáticamente por la app según guías de ACSM y NSCA (fuerza, cardio y autorregulación). Pendiente de revisión por un profesional.</p></div>

    <div class="card fcard"><h3>1. Perfil</h3><table class="ftab kv"><tbody>
      ${fila(['Edad / sexo', `${p.edad} años · ${p.sexo === 'F' ? 'Mujer' : 'Hombre'}`])}
      ${fila(['Estatura / peso', `${p.estatura} cm · ${fmtN(kg)} kg (inicial ${fmtN(p.peso)} kg) · IMC ${fmtN(imc)}`])}
      ${fila(['Objetivo', lab('objetivos', p.objetivo)])}
      ${fila(['Nivel / actividad diaria', `${(PERFIL_OPC.niveles.find((x) => x[0] === p.nivel) || [])[1] || '—'} · ${(PERFIL_OPC.actividad.find((x) => x[0] === p.actividad) || [])[1] || '—'}`])}
      ${fila(['Frecuencia / duración', `${PL.orden.length} sesiones por semana (${PL.dias.map((d) => DIAS[d]).join(', ')}) · ${p.dur} min`])}
      ${fila(['Lugar / equipamiento', `${p.lugar === 'gimnasio' ? 'Gimnasio' : 'Casa'}${p.lugar !== 'gimnasio' ? ' · ' + ((p.equipo || []).join(', ') || 'sin equipo') + (p.mancMax ? ` · mancuernas hasta ${p.mancMax} kg` : '') : ''}`])}
      ${fila(['Molestias declaradas', limit.join(', ') || 'Ninguna'])}
      ${fila(['Cuestionario de salud (PAR-Q+)', parq])}
      ${fila(['FC máx. estimada (Tanaka)', `${fz.max} lpm · zona 2: ${fz.z2[0]}-${fz.z2[1]} lpm · intervalos: ${fz.fuerte[0]}-${fz.fuerte[1]} lpm`])}
    </tbody></table></div>

    <div class="card fcard"><h3>2. Estructura del programa</h3><ul class="small">
      <li><b>Macrociclo de 12 semanas</b> en 3 fases: ${FASES.map((f) => `${f.nombre} (sem ${f.semanas})`).join(', ')}. Al terminar empieza un nuevo ciclo: los ejercicios principales se mantienen para seguir progresando la carga y los accesorios rotan.</li>
      <li><b>Descarga</b> en las semanas 4 y 8 (o antes si hay fatiga acumulada): ~40% menos series, mismos pesos, sin intervalos.</li>
      <li><b>Intensidad por RIR</b> (repeticiones en reserva): fase 1: 2-3 · fases 2-3: 1-2 · descarga: 3.</li>
      <li><b>Tempo:</b> ${[1, 2, 3].map((f) => `fase ${f}: ${TEMPO[f]}`).join(' · ')}.</li>
      <li><b>Calentamiento:</b> ${CALENTAMIENTO.normal.join('; ')}; luego 2 series de aproximación (50% y 75% del peso de trabajo) en el primer ejercicio con carga.</li>
      <li><b>Vuelta a la calma:</b> ${VUELTA_CALMA.join('; ')}.</li>
      <li><b>Cardio semanal:</b> meta de ${metaCardio(wi)} min (ACSM: 150-300 min/semana de intensidad moderada), sumando sesiones y caminatas.</li>
    </ul></div>

    <h2 class="sec">3. Sesiones (series × repeticiones · descanso)</h2>
    ${sesiones}

    <div class="card fcard"><h3>4. Volumen semanal por grupo muscular</h3>
      <table class="ftab"><thead>${fila(['Grupo', 'Fase 1', 'Fase 2', 'Fase 3', 'Rango objetivo'], true)}</thead><tbody>${volFilas}</tbody></table>
      <p class="small muted">Series efectivas por semana = series directas + ½ de las indirectas. El rango se ajusta según nivel y objetivo.</p></div>

    <div class="card fcard"><h3>5. Progresión y autorregulación</h3><ul class="small">
      <li><b>Doble progresión:</b> se sube la carga solo cuando se completan todas las series en el tope del rango con 2 o más RIR; luego se vuelve al mínimo del rango.</li>
      <li><b>Saltos de carga:</b> máximo ~10% en tren superior y ~15% en tren inferior; si el incremento disponible es mayor, primero se suman 1-2 repeticiones o se alarga la fase excéntrica. Con la carga máxima disponible se progresa por repeticiones, pausas o tempo.</li>
      <li><b>Ajustes automáticos de la sesión:</b> menos de 6 h de sueño = 1 serie menos por ejercicio · 10 o más días sin entrenar = 1 serie menos y −10% de carga · esfuerzo de la sesión anterior 9-10/10 = −10% de carga.</li>
      <li><b>Semáforo de dolor</b> (por zona, escala 0-10, modelo de monitoreo del dolor): verde ≤3 → sigue; amarillo 4-5, alza de 2 puntos o "amaneció peor" → −10% de carga en los ejercicios de esa zona; rojo ≥6 → se cambian por variantes isométricas o sin carga en esa zona.</li>
      <li><b>Descarga sugerida</b> ante esfuerzo promedio ≥8,5 o dos señales de fatiga: esfuerzo alto, 3 o más noches cortas o dolor en alza.</li>
      <li><b>Señales de alerta</b> registradas al cerrar cada sesión, con derivación a urgencia (SAMU 131), consulta en el día o evaluación profesional.</li>
    </ul></div>

    ${excl ? `<div class="card fcard"><h3>6. Ejercicios excluidos por molestias</h3><ul class="small">${excl}</ul></div>` : ''}

    <div class="card fcard"><h3>${excl ? 7 : 6}. Registro real</h3><ul class="small">
      <li><b>Sesiones completadas:</b> ${hechos.length} en total · ${ult4.length} de ${PL.orden.length * 4} planificadas en las últimas 4 semanas.</li>
      <li><b>Esfuerzo percibido promedio</b> (últimas 8 sesiones): ${rpeProm}/10.</li>
      ${dolor ? `<li><b>Dolor por zona</b> (últimas sesiones):<ul>${dolor}</ul></li>` : ''}
    </ul>
    ${cargas.length ? `<table class="ftab"><thead>${fila(['Ejercicio', 'Fecha', 'Última sesión (kg × reps)', 'RIR'], true)}</thead><tbody>${cargas.join('')}</tbody></table>` : '<p class="small muted">Aún no hay cargas registradas.</p>'}</div>

    <div class="card fcard revisar"><h3>Revisión profesional</h3>
      <p class="small">Observaciones:</p><div class="lineas"></div>
      <p class="small">Ejercicios a cambiar o evitar:</p><div class="lineas"></div>
      <p class="small">Cargas, rangos o límites indicados:</p><div class="lineas"></div>
      <p class="small">Nombre, profesión y registro: ____________________________ &nbsp; Fecha: ____________ &nbsp; Firma: ____________</p></div>
  </section>`;
}

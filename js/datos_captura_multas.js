/* Valores visibles en la captura del usuario. Asociaciones/IDs/vigencias son de estudio. */
window.SILOG = window.SILOG || {};
SILOG.incorporarMultasCaptura = st => {
  const key = 'CAPTURA-ASOCIAR-RECARGO-CRE-981124';
  const next = xs => Math.max(0, ...xs.map(x => Number(x.id) || 0)) + 1;
  let header = st.multasContractuales.find(h => h.fuenteCaptura === key);
  if (!header) {
    header = { id: next(st.multasContractuales), fuenteCaptura: key, denominacion: 'Multas Transporte Terrestre', tipoContratoId: 1,
      tipo: 'Multa', aplicabilidad: 'CRE_D', vigInicio: '2026-01-01', vigFin: '2026-12-31', observacion: 'Referencia visual; no confirma un contrato real.' };
    st.multasContractuales.push(header);
  }
  [
    ['MDR', 'Día de Retraso', 200, 'BOB', 'días de retraso'],
    ['MAC', 'Alcohol en Conductor', 2000, 'BOB', 'incumplimientos'],
    ['ACI', 'Acto y/o Condiciones Inseguras', 2000, 'BOB', 'incumplimientos'],
    ['ADOC', 'Alteración de Documentación', 2000, 'BOB', 'incumplimientos'],
    ['CFH', 'Conducción Fuera de Horario', 2000, 'BOB', 'incumplimientos'],
    ['CNC', 'Conductor No Certificado', 2000, 'BOB', 'incumplimientos'],
    ['EHR', 'Extravío Hoja de Ruta', 10, '%', 'litros involucrados'],
    ['MPF', 'Filtración', 4.22, 'USD', 'litros afectados'],
    ['IC', 'Inasistencia a Cursos', 700, 'BOB', 'inasistencias'],
    ['IFT', 'Incumplimiento de Funciones y Tareas', 2000, 'BOB', 'incumplimientos'],
    ['IPV', 'Incumplimiento Plan de Viaje', 2000, 'BOB', 'incumplimientos'],
    ['OP', 'Otros Pasajeros', 2000, 'BOB', 'incumplimientos'],
    ['RHR', 'Reposición Costo Hoja de Ruta', 1, 'VAR', 'reposiciones']
  ].forEach(([sigla, concepto, monto, moneda, cantidadUnidad]) => {
    if (st.recargosCatalogo.some(d => d.fuenteCaptura === key && d.sigla === sigla)) return;
    st.recargosCatalogo.push({ id: next(st.recargosCatalogo), fuenteCaptura: key, cabeceraId: header.id, sigla, concepto, monto, moneda, cantidadUnidad,
      vigInicio: header.vigInicio, vigFin: header.vigFin, activo: true, estado: 'LIBERADO', empresas: [1], historial: [],
      observacion: 'Concepto/monto/moneda de la captura; siglas ordinarias, empresa, vigencia y liberación ficticias. No se aplica automáticamente.' });
  });
};

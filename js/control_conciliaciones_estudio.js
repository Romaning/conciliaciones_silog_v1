/* Eventos del puente conectado. Los errores conservan formularios y no generan otro lote de datos. */
(function () {
  const B = SILOG.conciliacionesEstudio, U = SILOG.estudioConciliacionesUI, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const resultado = r => { if (r?.ok) E.guardar(); if (r) A.notificar(r); };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-ce-form]'); if (!f) return; ev.preventDefault();
    const { m, v, c, x } = U.seleccion(), d = leer(f), tipo = f.dataset.ceForm, ctx = U.contexto(); v.formularios[tipo] = d;
    if (tipo === 'precio') { resultado(B.precio(m, d, ctx)); return; }
    if (tipo === 'tecnicos') { resultado(B.datosTecnicos(m, Number(f.dataset.id), d, ctx)); return; }
    if (tipo === 'generar') {
      const ids = Object.entries(d).filter(([k, val]) => k.startsWith('rec_') && val === true).map(([k]) => Number(k.slice(4))); v.seleccion = ids; v.grupo = f.dataset.clave;
      const r = B.generar(m, v.grupo, ids, d.aceptarCeros === true, ctx); if (r.ok) { v.conciliacionId = r.id; v.seleccion = []; v.paso = 3; } resultado(r); return;
    }
    if (tipo === 'procesar') {
      if (!c) return;
      const cambios = [...new Set(c.lineas.map(l => l.recepcionId))].map(n => ({ recepcionId: n, liberarMerma: d['merma_' + n] === true, capacidad: d['capacidad_' + n] || 0, especial: d['especial_' + n] || 0, porcentaje: d['porcentaje_' + n] || 0, observacion: d['observacion_' + n] || '' }));
      cambios.forEach(fila => { v.cambios[fila.recepcionId] = fila; }); const r = B.procesar(m, c.id, cambios, ctx); if (r.ok) v.cambios = {}; resultado(r); return;
    }
    if (tipo === 'definicion') { resultado(B.multas(m, 'guardarCabecera', [{ tipoContratoId: c?.medio, denominacion: d.denominacion, tipo: 'Multa', aplicabilidad: d.aplicabilidad, vigInicio: d.inicio, vigFin: d.fin, observacion: 'Definición de práctica para el recorrido conectado.' }], ctx)); return; }
    if (tipo === 'concepto') {
      const h = x.multasContractuales.find(h => h.id === Number(d.cabeceraId)); if (!h) { resultado({ ok: false, msg: 'Selecciona una definición existente.' }); return; }
      const r = B.multas(m, 'guardarDetalle', [{ cabeceraId: h.id, concepto: d.concepto, sigla: d.sigla, monto: Number(d.monto), moneda: d.moneda, vigInicio: h.vigInicio, vigFin: h.vigFin }], ctx); if (r.ok) v.detalleRecargoId = r.id; resultado(r); return;
    }
    if (tipo === 'aplicar') { resultado(B.multas(m, 'aplicarCRE', [c?.id, Number(d.creId), [{ id: Number(v.detalleRecargoId), cantidad: Number(d.cantidad), monto: Number(d.monto), referencia: d.referencia }]], ctx)); }
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ce-accion]'); if (!b) return; const { m, v, c, x } = U.seleccion(), ctx = U.contexto(), a = b.dataset.ceAccion;
    if (a === 'paso') { v.paso = Number(b.dataset.paso); A.render(); return; }
    if (a === 'asociarEmpresa') { resultado(B.multas(m, 'asociarEmpresas', [Number(v.detalleRecargoId), [c?.transportistaId]], ctx)); return; }
    if (a === 'avanzarRecargo') { resultado(B.multas(m, 'cambiarEstado', [Number(v.detalleRecargoId), false], ctx)); return; }
    if (a === 'pedirRechazo') { v.confirmacion = true; A.render(); document.querySelector?.('[data-ce-accion="confirmarRechazo"]')?.focus(); return; }
    if (a === 'cancelar') { v.confirmacion = null; A.render(); return; }
    if (a === 'confirmarRechazo') { if (!v.confirmacion) return; const r = B.cambiar(m, c?.id, 'rechazar', ctx); if (r.ok) v.confirmacion = null; resultado(r); return; }
    if (a === 'excluir') { resultado(B.excluir(m, c?.id, Number(b.dataset.id), ctx)); return; }
    if (a === 'enviar' || a === 'aceptar') {
      resultado(B.cambiar(m, c?.id, a, ctx));
    }
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.ce-estudio')) return; const { v } = U.seleccion();
    if (e.dataset.cePermiso) { U.contexto().permisos[e.dataset.cePermiso] = e.checked; E.guardar(); return; }
    if (e.name === 'ceGrupo') { v.grupo = e.value; v.seleccion = []; A.render(); return; }
    if (e.name === 'ceConciliacionId') { if (Object.keys(v.cambios).length) { resultado({ ok: false, msg: 'Procesa o conserva tu borrador actual antes de cambiar la conciliación.' }); return; } v.conciliacionId = e.value ? Number(e.value) : null; v.confirmacion = null; A.render(); return; }
    if (e.name === 'ceRecargoId') { v.detalleRecargoId = e.value ? Number(e.value) : null; A.render(); return; }
    const f = e.closest('form[data-ce-form]'); if (!f) return; const d = leer(f); v.formularios[f.dataset.ceForm] = d;
    if (f.dataset.ceForm === 'procesar') { const { c } = U.seleccion(); if (!c) return; for (const n of new Set(c.lineas.map(l => l.recepcionId))) v.cambios[n] = { capacidad: d['capacidad_' + n] || 0, especial: d['especial_' + n] || 0, porcentaje: d['porcentaje_' + n] || 0, observacion: d['observacion_' + n] || '', liberarMerma: d['merma_' + n] === true }; }
  });
})();

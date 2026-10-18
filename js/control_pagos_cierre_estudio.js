/* Adaptador de propuestas: borradores por conciliación, confirmación en página y guardas de selección. */
(function () {
  const P = SILOG.pagosCierreEstudio, U = SILOG.estudioPagosCierreUI, CU = SILOG.estudioConciliacionesUI, A = SILOG.app, E = SILOG.estado;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const terminar = r => { if (r.ok) E.guardar(); A.notificar(r); };
  const huella = c => JSON.stringify({ foto: P.foto(c), revision: c.pagoCierrePropuesto?.revision, movimientos: c.pagoCierrePropuesto?.movimientos, consulta: c.pagoCierrePropuesto?.ultimaConsulta, cierre: c.pagoCierrePropuesto?.cierre });
  const confirmar = (c, v, accion, datos) => { v.confirmar = { id: c.id, accion, datos: structuredClone(datos), huella: huella(c) }; A.render(); document.querySelector?.('[data-pe-accion="confirmar"]')?.focus(); };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-pe-form]'); if (!f) return; ev.preventDefault();
    const { m, c, v } = U.seleccion(); if (!c) return; const d = leer(f), tipo = f.dataset.peForm;
    (v.formularios[c.id] ||= {})[tipo] = d;
    if (tipo === 'plan') { const r = P.acordar(m, c.id, d, U.contexto()); if (r.ok) { delete v.formularios[c.id].plan; v.respuesta = null; } terminar(r); }
    else if (tipo === 'abono') { const r = P.ejemplo(m, c, 'sinAbonos'); if (!r) { terminar({ ok: false, msg: 'Prepara el acuerdo del paso 4.' }); return; } r.eventos = [{ ...d, tipo: 'abono' }]; v.respuesta = r; A.render(); }
    else if (tipo === 'cierre' || tipo === 'reabrir') confirmar(c, v, tipo === 'cierre' ? 'cerrar seguimiento' : 'reabrir seguimiento', d);
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-pe-accion]'); if (!b) return; const { m, c, v } = U.seleccion(), a = b.dataset.peAccion;
    if (a === 'paso') { const n = Number(b.dataset.paso); if (Number.isInteger(n) && n >= 0 && n < P.PASOS.length) v.paso = n; A.render(); return; }
    if (a === 'cancelar') { v.confirmar = null; A.render(); return; }
    if (a === 'seleccionar') { CU.vista().conciliacionId = Number(b.dataset.id); v.confirmar = null; v.respuesta = null; A.render(); return; }
    if (!c) { terminar({ ok: false, msg: 'Selecciona una conciliación del recorrido.' }); return; }
    if (a === 'ejemploPlan') {
      const f = c.facturacion.servicioPropuesto; if (!f) return;
      (v.formularios[c.id] ||= {}).plan = { importe: f.total, referenciaFinanzas: `REV-FIN-C${c.id}`, justificacion: 'Ejercicio ficticio: importe de factura, cobros por multas revisados por separado; sin compensación automática.' }; A.render();
    } else if (a === 'previsualizar') { v.respuesta = P.ejemplo(m, c, v.caso); A.render(); }
    else if (a === 'recibir') { if (!v.respuesta || v.respuesta.conciliacionId !== c.id) return; confirmar(c, v, 'recibir evidencia simulada', v.respuesta); }
    else if (a === 'confirmar') {
      const q = v.confirmar; v.confirmar = null;
      if (!q || q.id !== c.id || q.huella !== huella(c)) { terminar({ ok: false, msg: 'Cambió la selección, evidencia o documento. Revisa y confirma de nuevo.' }); return; }
      const r = q.accion === 'recibir evidencia simulada' ? P.consultar(m, c.id, q.datos, U.contexto()) : q.accion === 'cerrar seguimiento' ? P.cerrar(m, c.id, q.datos, U.contexto()) : q.accion === 'reabrir seguimiento' ? P.reabrir(m, c.id, q.datos.motivo, U.contexto()) : { ok: false, msg: 'Acción de propuesta desconocida.' };
      if (r.ok && q.accion === 'recibir evidencia simulada') v.respuesta = null;
      terminar(r);
    }
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.pe-estudio')) return; const { c, v } = U.seleccion();
    if (e.name === 'peConciliacionId') { CU.vista().conciliacionId = e.value ? Number(e.value) : null; v.confirmar = null; v.respuesta = null; A.render(); }
    else if (e.name === 'peCaso') { v.caso = e.value; v.respuesta = null; A.render(); }
    else if (e.name === 'peEmpresa' || e.name === 'peMes') { v[e.name === 'peEmpresa' ? 'empresa' : 'mes'] = e.value; A.render(); }
    else if (e.dataset.pePermiso) { U.contexto().permisos[e.dataset.pePermiso] = e.checked; E.guardar(); A.render(); }
    else { const f = e.closest('form[data-pe-form]'); if (f && c) (v.formularios[c.id] ||= {})[f.dataset.peForm] = leer(f); }
  });
})();

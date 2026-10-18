/* Adaptador DOM del estudio de órdenes. Confirmaciones internas, sin window.confirm. */
(function () {
  const O = SILOG.ordenesEstudio, U = SILOG.estudioOrdenesUI, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.value]));
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  const cabecera = v => ({ ...v.cab, origenId: Number(v.cab.origenId), medioId: Number(v.cab.medioId), variable: !!U.modelo().terminales.find(t => t.id === Number(v.cab.origenId))?.variable });
  const agregar = datos => {
    const { m, v, o } = U.seleccion();
    if (o) { resultado(O.agregar(m, o.id, datos, U.contexto())); return; }
    const cab = O.cabecera(m, v.cab); if (!cab.ok) { resultado(cab); return; }
    const r = O.detalle(m, cab.cab, datos); if (!r.ok) { resultado(r); return; }
    if (datos.solicitudId && v.filas.some(f => Number(f.solicitudId) === Number(datos.solicitudId) && Number(f.solicitudDetalleId || 1) === Number(datos.solicitudDetalleId || 1))) { resultado({ ok: false, msg: 'La línea de solicitud ya está en el borrador.' }); return; }
    v.filas.push(structuredClone(datos)); A.render();
  };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-od-form]'); if (!f) return;
    ev.preventDefault(); const { m, v, o } = U.seleccion(), d = leer(f), ctx = U.contexto();
    if (f.dataset.odForm === 'cabecera') {
      const r = O.cabecera(m, d); if (!r.ok) { resultado(r); return; }
      if (v.filas.length && (Number(d.origenId) !== Number(v.cab.origenId) || Number(d.medioId) !== Number(v.cab.medioId))) { resultado({ ok: false, msg: 'Quita primero las filas del borrador para cambiar su terminal o medio. No se descartaron datos.' }); return; }
      v.cab = d; A.render(); return;
    }
    if (f.dataset.odForm === 'solicitud') { const [solicitudId, solicitudDetalleId] = String(d.solicitudLinea || '').split(':').map(Number); agregar({ solicitudId, solicitudDetalleId }); return; }
    if (f.dataset.odForm === 'manual') { v.manual = d; agregar(d); return; }
    if (f.dataset.odForm === 'cre') {
      v.cre = d; const r = O.prepararCRE(m, o?.id, v.seleccion, d, ctx);
      if (r.ok) { v.seleccion = []; v.cre = null; v.paso = 4; } resultado(r); return;
    }
    if (f.dataset.odForm === 'activar') {
      if (SILOG.creEstudio) SILOG.creEstudio.preparar(m);
      resultado(SILOG.creEstudio ? SILOG.creEstudio.activarDespacho(m, Number(f.dataset.id), d, ctx) : O.activarCRE(m, Number(f.dataset.id), d.volumen, ctx)); return;
    }
    if (f.dataset.odForm === 'dia') resultado(O.avanzarDia(m, d.dia, ctx));
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-od-accion]'); if (!b) return;
    const { m, v, o } = U.seleccion(), a = b.dataset.odAccion, ctx = U.contexto();
    if (a === 'paso') { v.paso = Number(b.dataset.paso); A.render(); return; }
    if (a === 'nuevo') { v.ordenId = null; v.seleccion = []; v.cre = null; v.paso = 1; A.render(); return; }
    if (['importar', 'reiniciar'].includes(a)) {
      const fuente = a === 'importar' ? SILOG.contratosEstudio.preparar(E.st) : null;
      if (fuente?.catalogoId === m.contratos.catalogoId) { resultado({ ok: true, msg: 'Los contratos ya son compartidos con este recorrido. No se reinició ni reemplazó ningún documento.' }); return; }
      v.confirmacion = { tipo: a, ejercicioId: m.ejercicioId, huella: JSON.stringify(m), catalogoId: fuente?.catalogoId, huellaFuente: fuente && JSON.stringify(fuente) };
      A.render(); document.querySelector?.('[data-od-accion="confirmar"]')?.focus(); return;
    }
    if (a === 'restaurar') { v.confirmacion = { tipo: a, archivoId: b.dataset.id, ejercicioId: m.ejercicioId, huella: JSON.stringify(m) }; A.render(); return; }
    if (a === 'cancelar') { v.confirmacion = null; A.render(); return; }
    if (a === 'confirmar') {
      if (!v.confirmacion) return;
      const op = v.confirmacion; v.confirmacion = null;
      if (op.ejercicioId !== m.ejercicioId || op.huella !== JSON.stringify(m)) { resultado({ ok: false, msg: 'El recorrido cambió después de confirmar la intención. Revísalo y solicita de nuevo el cambio; no se reemplazó nada.' }); return; }
      const fuente = op.tipo === 'importar' ? SILOG.contratosEstudio.preparar(E.st) : null;
      if (fuente && (fuente.catalogoId !== op.catalogoId || JSON.stringify(fuente) !== op.huellaFuente)) { resultado({ ok: false, msg: 'El catálogo fuente cambió. No se aplicó una importación con una confirmación anterior.' }); return; }
      const r = op.tipo === 'restaurar' ? O.restaurar(E.st, op.archivoId, ctx) : O.reemplazar(E.st, fuente || undefined, ctx, op.tipo === 'importar' ? 'Cambio explícito de catálogo' : 'Inicio de otro ejercicio');
      if (r.ok) U.limpiarSeleccion(); resultado(r); return;
    }
    if (a === 'tresSolicitudes') {
      if (v.filas.length) { resultado({ ok: false, msg: 'El borrador ya tiene filas. Quítalas antes de cargar el ejemplo para no sobrescribirlo.' }); return; }
      v.filas = [6001, 6002, 6003].map(solicitudId => ({ solicitudId })); A.render(); return;
    }
    if (a === 'quitarBorrador') { v.filas.splice(Number(b.dataset.id), 1); A.render(); return; }
    if (a === 'guardar') {
      const r = O.crear(m, cabecera(v), v.filas, ctx);
      if (r.ok) { v.ordenId = r.id; v.filas = []; v.seleccion = []; v.paso = 2; } resultado(r); return;
    }
    if (a === 'quitar') { resultado(O.quitar(m, o?.id, Number(b.dataset.id), ctx)); return; }
    if (['solicitar', 'aprobar', 'rechazar', 'anular', 'liberar', 'habilitar', 'inhabilitar'].includes(a)) resultado(O.cambiar(m, o?.id, a, ctx));
  });
  document.addEventListener('change', ev => {
    const e = ev.target;
    if (!e.closest('.od-estudio')) return;
    const v = U.vista();
    if (e.name === 'ordenId') { v.ordenId = e.value ? Number(e.value) : null; v.seleccion = []; v.cre = null; A.render(); return; }
    if (e.dataset.odDetalle) {
      const id = Number(e.dataset.odDetalle); v.seleccion = v.seleccion.filter(x => x !== id); if (e.checked) v.seleccion.push(id);
      A.render(); return;
    }
    if (e.dataset.odPermiso) { U.contexto().permisos[e.dataset.odPermiso] = e.checked; E.guardar(); }
  });
})();

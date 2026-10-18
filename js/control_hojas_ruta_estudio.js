/* Adaptador DOM, sin reglas de negocio duplicadas ni confirmaciones nativas. */
(function () {
  const H = SILOG.hojasRutaEstudio, O = SILOG.ordenesEstudio, U = SILOG.estudioHRUI, OU = SILOG.estudioOrdenesUI, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.value]));
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-hr-form]'); if (!f) return; ev.preventDefault();
    const { m, v, s, x } = U.seleccion(), d = leer(f), ctx = U.contexto();
    if (f.dataset.hrForm === 'solicitud') { v.borrador = d; const r = H.activar(m, { ...d, detalles: v.filas }, ctx); if (r.ok) { v.solicitudId = r.id; v.paso = 3; v.registro = null; } resultado(r); return; }
    if (f.dataset.hrForm === 'linea') {
      const ra = x.registros.find(r => r.origenId === Number(v.borrador.origenId) && r.productoId === Number(d.productoId));
      if (!ra || !Number.isInteger(Number(d.volumen)) || Number(d.volumen) <= 0 || Number(d.volumen) > 2147483647 || v.filas.some(a => a.productoId === Number(d.productoId)) || v.filas.length >= (Number(v.borrador.medioId) === 1 ? 2 : 1)) { resultado({ ok: false, msg: 'Revisa producto no repetido, registro RA, volumen entero positivo y máximo de productos del medio.' }); return; }
      v.filas.push({ productoId: Number(d.productoId), registroId: ra.id, volumen: Number(d.volumen) }); A.render(); return;
    }
    if (f.dataset.hrForm === 'registro') { v.registro = d; resultado(H.registrar(m, s?.id, d, ctx)); return; }
    if (f.dataset.hrForm === 'estado') { v.observacion = d.observacion; resultado(H.cambiar(m, s?.id, d.estado, d.observacion, ctx)); return; }
    if (f.dataset.hrForm === 'cupo') { resultado(H.habilitar(m, s?.id, d.cantidad, ctx)); return; }
    if (f.dataset.hrForm === 'adjunto') { resultado(H.adjuntar(m, s?.id, d.nombre, ctx)); return; }
    if (f.dataset.hrForm === 'dia') { resultado(O.avanzarDia(m, d.dia, ctx)); return; }
    if (f.dataset.hrForm === 'cupoRA') {
      const r = x.registros.find(r => r.id === Number(d.registroId));
      if (!ctx.permisos['Acceso administrativo simulado'] || !r || !String(d.volumen).trim() || !Number.isInteger(Number(d.volumen)) || Number(d.volumen) < 1 || Number(d.volumen) > 2147483647) { resultado({ ok: false, msg: 'Revisa acceso administrativo, registro y cupo positivo entero dentro de int.' }); return; }
      r.volumenMes = Number(d.volumen); H.registrarEvento(m, ctx, 'Cambiar cupo RA de práctica', `${r.codigo}: cupo mensual ${r.volumenMes} L. No modifica un registro regulatorio real.`); resultado({ ok: true, msg: 'Cupo RA de práctica actualizado.' }); return;
    }
    if (f.dataset.hrForm === 'costos') {
      if (!ctx.permisos['Acceso administrativo simulado'] || Object.values(d).some(n => !String(n).trim() || !Number.isInteger(Number(n)) || Number(n) < 0 || Number(n) > 2147483647) || Number(d.limite) < 1 || Number(d.ultimo) <= Number(d.limite)) { resultado({ ok: false, msg: 'Revisa acceso administrativo, límites enteros crecientes e importes enteros no negativos.' }); return; }
      x.costos = [{ desde: 1, hasta: Number(d.limite), bs: Number(d.primero) }, { desde: Number(d.limite) + 1, hasta: Number(d.ultimo), bs: Number(d.segundo) }];
      H.registrarEvento(m, ctx, 'Cambiar costos de práctica', 'Tabla ilustrativa de costo de solicitud actualizada; no es tarifa de flete ni dato oficial.'); resultado({ ok: true, msg: 'Supuestos de costo actualizados para nuevas solicitudes.' });
    }
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-hr-accion]'); if (!b) return;
    const { m, v, s } = U.seleccion(), a = b.dataset.hrAccion, ctx = U.contexto();
    if (a === 'paso') { v.paso = Number(b.dataset.paso); A.render(); return; }
    if (a === 'nueva') { v.solicitudId = null; v.paso = 1; v.registro = null; v.impresion = false; v.confirmacion = null; A.render(); return; }
    if (a === 'quitarLinea') { v.filas.splice(Number(b.dataset.id), 1); A.render(); return; }
    if (a === 'otrosMedios') { resultado(H.otrosMedios(m, ctx)); return; }
    if (a === 'imprimir') { if (!ctx.permisos['Imprimir SHR']) { resultado({ ok: false, msg: 'Falta Imprimir SHR.' }); return; } v.impresion = !v.impresion; A.render(); return; }
    if (a === 'pedirAnulacion' || a === 'pedirReversion') { v.confirmacion = a === 'pedirAnulacion' ? 'anular' : 'revertir'; A.render(); document.querySelector?.('[data-hr-accion="confirmar"]')?.focus(); return; }
    if (a === 'cancelar') { v.confirmacion = null; A.render(); return; }
    if (a === 'confirmar') { if (!v.confirmacion) return; const r = v.confirmacion === 'anular' ? H.anularSolicitud(m, s?.id, ctx) : H.revertir(m, s?.id, ctx); if (r.ok) { v.confirmacion = null; v.registro = null; } resultado(r); return; }
    if (a === 'orden') {
      if (!s) return; const r = H.elegible(m, s.id, m.hoy, s.origenId, s.medioId); if (!r.ok) { resultado(r); return; }
      const ov = OU.vista(); if (ov.filas.length) { resultado({ ok: false, msg: 'Tu borrador de orden ya tiene filas y no se sobrescribirá. Guárdalo o quita sus filas en Órdenes.' }); return; }
      ov.ordenId = null; ov.cab = { origenId: s.origenId, medioId: s.medioId, fecha: m.hoy }; ov.filas = [{ solicitudId: s.id, solicitudDetalleId: Number(b.dataset.linea) }]; ov.seleccion = []; ov.paso = 1; location.hash = '#ordenespasos';
    }
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.hr-estudio')) return;
    const { m, v, x } = U.seleccion();
    if (e.name === 'solicitudSeleccionada') { v.solicitudId = e.value ? Number(e.value) : null; v.registro = null; v.impresion = false; v.confirmacion = null; A.render(); return; }
    if (e.dataset.hrPermiso) { U.contexto().permisos[e.dataset.hrPermiso] = e.checked; E.guardar(); return; }
    if (e.dataset.hrControl) { x.controles[e.dataset.hrControl] = e.checked; E.guardar(); return; }
    if (e.dataset.hrContrato) { if (!U.contexto().permisos['Acceso administrativo simulado']) { resultado({ ok: false, msg: 'Falta acceso administrativo simulado para variar ControlaRuta.' }); return; } m.contratos.contratos.find(c => c.id === Number(e.dataset.hrContrato)).controlaRuta = e.checked; E.guardar(); return; }
    if (e.hasAttribute('data-hr-practica')) { x.origenHabilitadoPractica = e.checked; E.guardar(); return; }
    const f = e.closest('form[data-hr-form="solicitud"]'); if (!f) return;
    v.borrador = leer(f); const d = v.borrador;
    if (e.name === 'medioId') { d.unidadId = m.unidades.find(u => u.medioId === Number(d.medioId))?.id || ''; }
    if (['medioId', 'unidadId'].includes(e.name)) { const u = m.unidades.find(u => u.id === Number(d.unidadId)); d.conductorId = m.conductores.find(c => c.empresaId === u?.empresaId)?.id || ''; }
    if (['medioId', 'origenId', 'destinoId'].includes(e.name)) { d.rutaId = m.contratos.rutas.find(r => r.medioId === Number(d.medioId) && r.origenId === Number(d.origenId) && r.destinoId === Number(d.destinoId))?.id || ''; v.filas = v.filas.map(a => ({ ...a, registroId: x.registros.find(r => r.origenId === Number(d.origenId) && r.productoId === a.productoId)?.id || null })); }
    if (e.tagName === 'SELECT') A.render();
  });
})();

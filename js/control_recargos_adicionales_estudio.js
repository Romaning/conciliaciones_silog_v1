/* Adaptador del ejercicio; validar y confirmar no ejecutan SQL ni servicios externos. */
(function () {
  const N = SILOG.recargosAdicionalesEstudio, U = SILOG.estudioAdicionalesUI, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  const ejecutar = (z, operacion, datos) => operacion === 'cg' ? N.guardarCG(z.m, z.c.id, datos, z.ctx) : operacion === 'casos' ? N.guardarCasos(z.m, z.c.id, datos, z.ctx) : operacion === 'eliminar' ? N.eliminarCaso(z.m, z.c.id, datos, z.ctx) : N.estadoCobro(z.m, z.c.id, datos, 'anular', z.ctx);
  const pedir = (z, accion, datos, titulo) => { z.v.confirmacion = { accion, datos: structuredClone(datos), titulo, conciliacionId: z.c.id, ejercicioId: z.m.ejercicioId, firma: N.firma(z.m, z.c) }; A.render(); };
  const refrescar = (z, r) => { if (r.ok) { z.v.casosEditados = null; z.v.cgEditado = {}; } resultado(r); };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-ra-form]'); if (!f) return; ev.preventDefault();
    const z = U.seleccion(); if (!z.c) return resultado({ ok: false, msg: 'Selecciona una conciliación del recorrido.' });
    const d = leer(f), tipo = f.dataset.raForm;
    if (tipo === 'origen') { z.v.formularios.origen = d; return resultado(N.crearCobro(z.m, z.c.id, { ...d, detalleIds: Object.keys(d).filter(k => k.startsWith('detalle_') && d[k] === true).map(k => Number(k.slice(8))) }, z.ctx)); }
    if (tipo === 'adjunto') return resultado(N.adjunto(z.m, z.c.id, f.dataset.id, d.nombre, z.ctx));
    if (tipo === 'facturaCG') return resultado(N.facturaCG(z.m, z.c.id, f.dataset.id, d.factura, d.observacion, z.ctx));
    if (tipo === 'carros') {
      const seleccion = Object.keys(d).filter(k => k.startsWith('seleccion_') && d[k] === true).map(k => { const clave = k.slice(10); return { clave: decodeURIComponent(clave), factura: d['factura_' + clave], observacion: d['observacion_' + clave] }; });
      return pedir(z, 'cg', seleccion, 'Registrar la selección completa de carro guía');
    }
    if (tipo === 'casos') {
      const filas = U.borradorCasos(z.c).map((fila, i) => Object.fromEntries(Object.keys(fila).map(k => [k, d[k + '_' + i] ?? fila[k]])));
      z.v.casosEditados = filas; return pedir(z, 'casos', filas, 'Reemplazar todos los casos de esta conciliación');
    }
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ra-accion], [data-ra-abrir]'); if (!b) return;
    const z = U.seleccion(), { m, v, c, ctx } = z;
    if (b.dataset.raAbrir) { const n = Number(b.dataset.raAbrir), p = Number(b.dataset.raPaso || 0); if (!m.recorridoConciliaciones.lista.some(c => c.id === n && c.medio === 1) || !Number.isInteger(p) || p < 0 || p > 4) return resultado({ ok: false, msg: 'Conciliación/paso ajeno al recorrido.' }); SILOG.estudioConciliacionesUI.vista().conciliacionId = n; U.seleccion().v.paso = p; location.hash = 'recargosconectados'; A.render(); return; }
    const a = b.dataset.raAccion;
    if (a === 'paso') { const p = Number(b.dataset.paso); if (Number.isInteger(p) && p >= 0 && p <= 4) { v.paso = p; v.confirmacion = null; A.render(); } return; }
    if (a === 'cancelar') { v.confirmacion = null; A.render(); return; }
    if (!c) return;
    if (a === 'confirmar') { const p = v.confirmacion; v.confirmacion = null; if (!p) return; if (p.ejercicioId !== m.ejercicioId || p.conciliacionId !== c.id || p.firma !== N.firma(m, c)) return resultado({ ok: false, msg: 'Cambió el ejercicio, la selección, el estado o su fuente. Revisa y confirma nuevamente; no se reemplazó nada.' }); return refrescar(z, ejecutar(z, p.accion, p.datos)); }
    if (a === 'agregarCaso') { U.borradorCasos(c).push({ multaId: 12, monto: '', volumen: 0, productoId: 0, moneda: 'Bs.', factura: '', observacion: '', tcPropuesto: '', fuenteTC: '' }); A.render(); }
    else if (a === 'retirarBorrador') { const i = Number(b.dataset.indice); if (Number.isInteger(i) && i >= 0 && i < U.borradorCasos(c).length) U.borradorCasos(c).splice(i, 1); A.render(); }
    else if (a === 'restaurarBorrador') { v.casosEditados = null; v.confirmacion = null; A.render(); }
    else if (a === 'eliminarCaso') pedir(z, 'eliminar', b.dataset.id, 'Eliminar caso guardado según el modo seleccionado');
    else if (a === 'activarOrigen') resultado(N.estadoCobro(m, c.id, b.dataset.id, 'activar', ctx));
    else if (a === 'anularOrigen') pedir(z, 'anular', b.dataset.id, 'Anular el cobro de origen, si no está vinculado');
  });
  const recordar = ev => {
    const e = ev.target; if (!e.closest('.ra-estudio')) return;
    const z = U.seleccion();
    if (e.dataset.raCampo != null && z.c) { const f = U.borradorCasos(z.c)[Number(e.dataset.raFila)]; if (f) f[e.dataset.raCampo] = e.value; }
    const f = e.closest('form[data-ra-form]');
    if (f?.dataset.raForm === 'origen') z.v.formularios.origen = leer(f);
    if (f?.dataset.raForm === 'carros') {
      const d = leer(f); for (const r of N.filasCG(z.m, z.c)) { const k = encodeURIComponent(r.clave); z.v.cgEditado[r.clave] = { seleccion: d['seleccion_' + k] === true, factura: d['factura_' + k], observacion: d['observacion_' + k] }; }
    }
    if (f && z.v.confirmacion) { z.v.confirmacion = null; A.notificar({ ok: true, msg: 'Cambiaste el borrador: revisa y solicita otra confirmación antes de registrar.' }); }
  };
  document.addEventListener('input', recordar);
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.ra-estudio')) return; const z = U.seleccion(); recordar(ev);
    if (e.name === 'raConciliacion') { SILOG.estudioConciliacionesUI.vista().conciliacionId = e.value ? Number(e.value) : null; U.seleccion(); A.render(); }
    else if (e.dataset.raPermiso) { z.ctx.permisos[e.dataset.raPermiso] = e.checked; E.guardar(); }
  });
})();

/* Formularios y navegación del CRE. Conserva entradas sin redibujar en cada pulsación. */
(function () {
  const R = SILOG.creEstudio, U = SILOG.estudioCREUI, OU = SILOG.estudioOrdenesUI, O = SILOG.ordenesEstudio, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  const guardarBorrador = f => {
    const d = leer(f), v = U.vista();
    if (f.dataset.clave) v.borradores[f.dataset.clave] = d;
    if (f.dataset.crForm === 'previo') v.previo = d;
    return d;
  };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-cr-form]'); if (!f) return;
    ev.preventDefault(); const { m, v } = U.seleccion(), d = guardarBorrador(f), ctx = U.contexto(); let r;
    if (f.dataset.crForm === 'previo') {
      r = R.crearRecepcion(m, v.ids, d, ctx);
      if (r.ok) { v.ids = []; v.recepcionId = r.id; v.paso = 3; v.previo = {}; }
    }
    if (f.dataset.crForm === 'activarDespacho') r = R.activarDespacho(m, Number(f.dataset.id), d, ctx);
    if (f.dataset.crForm === 'activarRecepcion') {
      const distribucion = m.recorridoCRE.cuentas.map(c => ({ cuentaId: c.id, volumen: d['cuenta_' + c.id] === '' ? 0 : d['cuenta_' + c.id] }));
      r = R.activarRecepcion(m, Number(f.dataset.id), { ...d, distribucion }, ctx);
      if (r.ok) { v.balanceId = r.id; v.recepcionId = r.id; v.paso = 4; }
    }
    if (f.dataset.crForm === 'dia') r = O.avanzarDia(m, d.dia, ctx);
    if (f.dataset.crForm === 'saldo') {
      const n = Number(d.saldoLitros);
      if (!ctx.permisos['Modificar Orden'] || String(d.saldoLitros).trim() === '' || !Number.isInteger(n) || n < 0 || n > 2147483647) r = { ok: false, msg: 'Ingresa saldo simulado válido y conserva autorización de operación.' };
      else { m.recorridoCRE.controles.saldoLitros = n; r = { ok: true, msg: 'Saldo simulado actualizado para validar la activación de despachos de cisterna.' }; }
    }
    if (f.dataset.crForm === 'cero') {
      const c = m.cres.find(c => c.id === Number(d.despachoId));
      if (!ctx.permisos['Modificar Orden'] || !R.esDespacho(c) || R.medio(c) !== 1 || c.estadoId !== 1) r = { ok: false, msg: 'Selecciona despacho activo de cisterna y autorización simulada.' };
      else { if (!m.recorridoCRE.ceroAutorizado.includes(c.id)) m.recorridoCRE.ceroAutorizado.push(c.id); r = { ok: true, msg: 'Autorización cero simulada. No se insertó ninguna autorización en V1.' }; }
    }
    if (r) resultado(r);
  });
  document.addEventListener('input', ev => {
    const f = ev.target.closest('form[data-cr-form]'); if (!f) return;
    const d = guardarBorrador(f), salida = f.querySelector?.('[data-cr-medicion]');
    if (salida) { const r = R.medicion(d); salida.textContent = r.ok ? r.formula : r.msg; }
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.cr-estudio')) return;
    const { m, v } = U.seleccion();
    if (e.name === 'crOrdenId') { OU.vista().ordenId = e.value ? Number(e.value) : null; v.ids = []; v.previo = {}; A.render(); return; }
    if (e.name === 'crRecepcionId') { v.recepcionId = Number(e.value); A.render(); return; }
    if (e.name === 'crBalanceId') { v.balanceId = Number(e.value); A.render(); return; }
    if (e.dataset.crDespacho) { const n = Number(e.dataset.crDespacho); v.ids = v.ids.filter(x => x !== n); if (e.checked) v.ids.push(n); A.render(); return; }
    if (e.hasAttribute('data-cr-solo-orden')) { v.soloOrden = e.checked; v.ids = []; v.previo = {}; A.render(); return; }
    if (e.dataset.crControl && ['periodoAbierto', 'movimientoAbierto', 'brevetVigente', 'precintosValidos'].includes(e.dataset.crControl)) {
      if (U.contexto().permisos['Modificar Orden']) { m.recorridoCRE.controles[e.dataset.crControl] = e.checked; E.guardar(); } A.render(); return;
    }
    const f = e.closest('form[data-cr-form]'); if (f) guardarBorrador(f);
    if (e.name === 'modo') A.render();
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-cr-accion]'); if (!b) return;
    const { m, v } = U.seleccion(), a = b.dataset.crAccion;
    if (a === 'paso') { v.paso = Number(b.dataset.paso); A.render(); return; }
    if (a === 'balance') { v.balanceId = Number(b.dataset.id); v.paso = 4; A.render(); return; }
    if (a === 'distribuir') {
      const f = b.closest('form[data-cr-form]'), d = guardarBorrador(f), r = R.medicion(d);
      if (!r.ok) { resultado(r); return; }
      m.recorridoCRE.cuentas.forEach((c, i) => { d['cuenta_' + c.id] = i === 0 ? r.volumen : 0; });
      v.borradores[b.dataset.clave] = d; A.render(); return;
    }
    if (a === 'descartar') { v.confirmacion = { id: Number(b.dataset.id) }; A.render(); document.querySelector?.('[data-cr-accion="confirmarDescarte"]')?.focus(); return; }
    if (a === 'cancelarDescarte') { v.confirmacion = null; A.render(); return; }
    if (a === 'confirmarDescarte') { const op = v.confirmacion; if (!op) return; v.confirmacion = null; resultado(R.descartarReserva(m, op.id, U.contexto())); }
  });
})();

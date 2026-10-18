/* Adaptador DOM/estado del recorrido. Se carga después de app.js; no duplica su navegador. */
(function (U) {
  const E = SILOG.estado, C = SILOG.multasContractuales, M = SILOG.motor, A = SILOG.app;
  U.vista = () => A.vs.mc || (A.vs.mc = Object.assign({ paso: 0, cabeceraId: null, detalleId: null, concId: null, ambito: 'CRE_D', creId: null, borrador: {} }, E.ui.ramaMultasOT && E.ui.ramaMultasOT.seleccion || {}));
  U.contexto = () => {
    E.ui.permisosMultas = E.ui.permisosMultas || Object.fromEntries(C.PERMISOS.map(p => [p, true]));
    return { permisos: E.ui.permisosMultas, usuario: E.ui.usuario, modo: E.ui.modo };
  };
  const persistir = (accion, r) => {
    if (r.ok) { E.log(accion, r.msg); E.guardar(); }
    A.notificar(r); return r;
  };
  const leer = form => Object.fromEntries([...form.elements].filter(x => x.name && x.name !== 'empresa').map(x => [x.name, x.type === 'checkbox' ? x.checked : x.value]));
  U.filas = form => [...form.querySelectorAll('[data-mc-fila]')].map(f => {
    const campo = n => f.querySelector(`[name="${n}"]`);
    return { id: Number(f.dataset.mcFila), marcado: campo('marcado').checked, monto: campo('monto').value, cantidad: campo('cantidad').value, tc: campo('tc').value };
  });
  document.addEventListener('submit', ev => {
    const f = ev.target;
    if (!f.dataset.mcForm) return;
    ev.preventDefault();
    if (E.ui.ayuda) { A.notificar({ ok: true, msg: 'Modo Ayuda activo: no se guardó ningún cambio. Desactívelo para realizar el ejercicio.' }); return; }
    const v = U.vista(), d = leer(f), ctx = U.contexto(); let r;
    if (f.dataset.mcForm === 'cabecera') {
      r = C.guardarCabecera(E.st, Object.assign(d, { id: v.cabeceraId }), ctx);
      if (r.ok) { v.cabeceraId = r.id; v.detalleId = null; v.paso = 1; }
    } else if (f.dataset.mcForm === 'detalle') {
      r = C.guardarDetalle(E.st, Object.assign(d, { id: v.detalleId, cabeceraId: v.cabeceraId }), ctx);
      if (r.ok) { v.detalleId = r.id; v.paso = 2; }
    } else if (f.dataset.mcForm === 'empresas') {
      r = C.asociarEmpresas(E.st, v.detalleId, [...f.querySelectorAll('[name="empresa"]:checked')].map(x => Number(x.value)), ctx);
      if (r.ok) v.paso = 3;
    } else if (f.dataset.mcForm === 'aplicacion') {
      const entradas = U.filas(f).filter(x => x.marcado), concId = Number(f.dataset.conc), creId = Number(f.dataset.cre);
      const afectadas = ctx.modo === 'V1' ? E.st.conciliaciones : E.st.conciliaciones.filter(c => c.id === concId);
      const existentes = afectadas.reduce((n, c) => n + c.recargos.filter(r => r.creId === creId && r.catalogoId).length, 0);
      if ((existentes || !entradas.length) && !confirm(`Se reemplazarán ${existentes} aplicaciones contractuales por ${entradas.length} seleccionadas. ${ctx.modo === 'V1' ? 'V1 elimina por CREID, incluso en otras conciliaciones.' : 'Se limita a esta conciliación.'} ¿Guardar?`)) return;
      r = C.aplicarCRE(E.st, concId, creId, entradas, ctx);
      if (r.ok) { v.borrador = {}; v.concId = concId; A.vs.conc.concId = concId; }
    }
    if (r) persistir('Multas contractuales · ' + f.dataset.mcForm, r);
  });
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-mc-accion]'); if (!el) return;
    const v = U.vista(), a = el.dataset.mcAccion; let r;
    if (a === 'paso') v.paso = Number(el.dataset.paso);
    if (a === 'nuevaCabecera') { v.cabeceraId = null; v.detalleId = null; v.paso = 0; }
    if (a === 'nuevoDetalle') { v.detalleId = null; v.paso = 1; }
    if (a === 'avanzar' || a === 'revertir') {
      if (a === 'revertir' && !confirm('¿Devolver el recargo a elaboración? Si ya se utilizó, V1 lo impide.')) return;
      r = C.cambiarEstado(E.st, v.detalleId, a === 'revertir', U.contexto());
    }
    if (a === 'descartar') v.borrador = {};
    if (a === 'procesar') { try { r = E.procesar(Number(el.dataset.id)); } catch (e) { r = { ok: false, msg: e.message }; } }
    if (a === 'prepararConciliacion') {
      const existente = E.st.conciliaciones.find(c => c.estado === 'En Elaboracion');
      if (existente) { v.concId = existente.id; A.vs.conc.concId = existente.id; }
      else {
        const g = M.recepcionesSinConciliar(E.st, 3, E.ui.modo).grupos.find(x => x.contrato && x.recepciones.length && !M.validarGeneracion(E.st, x, x.recepciones, x.contrato.moneda));
        if (!g) r = { ok: false, msg: 'No hay recepciones elegibles. Cargue el escenario F «Multas y recargos» o registre un viaje.' };
        else { r = E.generar(3, [{ clave: g.clave, marcado: true, moneda: g.contrato.moneda, recepciones: g.recepciones.map(x => x.recepcion.id) }]); if (r.ok) { v.concId = r.ids[0]; A.vs.conc.concId = r.ids[0]; } }
      }
      v.borrador = {}; v.creId = null;
    }
    if (r) persistir('Multas contractuales · ' + a, r); else A.render();
  });
  document.addEventListener('change', ev => {
    const el = ev.target, v = U.vista();
    if (el.dataset.mcPermiso !== undefined) { U.contexto().permisos[C.PERMISOS[Number(el.dataset.mcPermiso)]] = el.checked; E.guardar(); A.render(); return; }
    if (el.dataset.mcCambio) {
      const k = el.dataset.mcCambio; v[k] = k === 'ambito' ? el.value : el.value ? Number(el.value) : null;
      if (k === 'cabeceraId') v.detalleId = null;
      if (k === 'detalleId' && v.detalleId) v.cabeceraId = M.porId(E.st.recargosCatalogo, v.detalleId).cabeceraId;
      if (k === 'concId') { A.vs.conc.concId = v.concId; v.creId = null; }
      if (k === 'ambito') v.creId = null;
      v.borrador = {}; A.render();
    }
    const f = el.closest('[data-mc-form="cabecera"]');
    if (f && el.name === 'tipo') {
      const s = f.elements.aplicabilidad;
      [...s.options].forEach(o => { o.disabled = el.value === 'Descuento' && o.value !== 'CONCILIACION'; });
      if (el.value === 'Descuento') s.value = 'CONCILIACION';
    }
  });
  const actualizarFila = ev => {
    const f = ev.target.closest('[data-mc-form="aplicacion"]'); if (!f) return;
    const v = U.vista(), conc = M.porId(E.st.conciliaciones, Number(f.dataset.conc));
    U.filas(f).forEach(b => { v.borrador[b.id] = b; });
    const fila = ev.target.closest('[data-mc-fila]');
    if (fila && conc) {
      const b = v.borrador[Number(fila.dataset.mcFila)], d = M.porId(E.st.recargosCatalogo, b.id);
      const calc = C.calcular(E.st, conc, { catalogoId: d.id, creId: Number(f.dataset.cre), moneda: d.moneda, monto: Number(b.monto), cantidad: Number(b.cantidad), tc: Number(b.tc) }, E.ui.modo);
      fila.querySelector('[data-mc-preview]').textContent = M.fmtB(calc.total);
      fila.querySelector('details ol').innerHTML = calc.pasos.map(p => `<li>${SILOG.vistas.esc(p)}</li>`).join('');
    }
  };
  document.addEventListener('input', actualizarFila);
  document.addEventListener('change', actualizarFila);
})(SILOG.controlMultas = {});

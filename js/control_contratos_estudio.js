/* Puente DOM → modelo de estudio; no copia el cálculo a los eventos. */
(function () {
  const C = SILOG.contratosEstudio, U = SILOG.estudioContratosUI, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.value]));
  const seleccionar = (id, paso) => { const m = U.modelo(), h = m.historiales.find(x => x.id === id), v = U.vista(); if (h) { v.historialId = h.id; v.contratoId = h.contratoId; v.filas = []; v.confirmacion = null; } if (paso != null) v.paso = paso; };
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  const confirmar = op => {
    const m = U.modelo(); U.vista().confirmacion = { ...op, catalogoId: m.catalogoId, huella: JSON.stringify(m) }; A.render();
    document.querySelector?.('[data-ct-accion="confirmar"]')?.focus();
  };
  const cargarCaso = ctx => {
    const r = SILOG.ordenesEstudio.reemplazar(E.st, C.casoCompleto(), ctx, 'Inicio del caso contractual de dos empresas');
    if (r.ok) { SILOG.estudioOrdenesUI.limpiarSeleccion(); Object.assign(U.vista(), { contratoId: 1, historialId: 3, filas: [], paso: 0 }); }
    resultado(r);
  };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-ct-form]'); if (!f) return;
    ev.preventDefault(); const { m, v, c, h } = U.seleccion(), d = leer(f), ctx = U.contexto(); let r;
    if (f.dataset.ctForm === 'contrato') { v.borradorContrato = d; r = C.crear(m, d, ctx); if (r.ok) { v.borradorContrato = null; seleccionar(r.id, 2); } }
    if (f.dataset.ctForm === 'fila') { v.filas.push(d); A.render(); return; }
    if (f.dataset.ctForm === 'adenda') { v.borradorAdenda = d; r = C.adenda(m, c?.id, d, ctx); if (r.ok) { v.borradorAdenda = null; seleccionar(r.id, 2); } }
    if (f.dataset.ctForm === 'finalizar') { r = C.adenda(m, c?.id, { ...d, tipo: 'FINALIZACION' }, ctx); if (r.ok) seleccionar(r.id, 3); }
    if (f.dataset.ctForm === 'consulta') { v.consulta = d; A.render(); return; }
    if (r) resultado(r);
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ct-accion]'); if (!b) return;
    const { m, v, c, h } = U.seleccion(), a = b.dataset.ctAccion, ctx = U.contexto(); let r;
    if (a === 'paso') { v.paso = Number(b.dataset.paso); A.render(); return; }
    if (a === 'caso') {
      if (m.contratos.length || E.st.estudioOrdenes) { confirmar({ tipo: 'caso' }); return; }
      cargarCaso(ctx); return;
    }
    if (a === 'cancelarConfirmacion') { v.confirmacion = null; A.render(); return; }
    if (a === 'confirmar') {
      const op = v.confirmacion; if (!op) return;
      v.confirmacion = null;
      if (op.catalogoId !== m.catalogoId || op.huella !== JSON.stringify(m)) { resultado({ ok: false, msg: 'El catálogo o sus usos cambiaron. Revisa la operación y confírmala de nuevo; no se aplicó una confirmación anterior.' }); return; }
      if (op.tipo === 'caso') {
        cargarCaso(ctx); return;
      }
      if (op.tipo === 'matriz') { r = C.guardarTarifas(m, op.historialId, op.filas, ctx); if (r.ok && h?.id === op.historialId) v.filas = []; }
      if (op.tipo === 'revertir') r = C.revertir(m, op.historialId, ctx);
      if (r) resultado(r); return;
    }
    if (a === 'contrato') { const hs = C.historiales(m, Number(b.dataset.id)); seleccionar(hs.at(-1)?.id, 2); A.render(); return; }
    if (a === 'version') { seleccionar(Number(b.dataset.id), 2); A.render(); return; }
    if (a === 'cargarMatriz') { v.filas = m.tarifas.filter(t => t.historialId === h?.id).map(t => ({ rutaId: t.rutaId, productoId: t.productoId, tarifa: t.tarifa, admisible: t.admisible })); A.render(); return; }
    if (a === 'limpiarMatriz') { v.filas = []; A.render(); return; }
    if (a === 'guardarMatriz') {
      confirmar({ tipo: 'matriz', historialId: h?.id, filas: structuredClone(v.filas) }); return;
    }
    if (a === 'avanzar') r = C.avanzar(m, h?.id, ctx);
    if (a === 'usarConsulta') { const f = b.closest('form[data-ct-form="consulta"]'); v.consulta = leer(f); r = C.registrarUso(m, v.consulta, ctx); }
    if (a === 'revertir') {
      const control = C.controlReversion(m, h?.id);
      if (ctx.modo === 'V1' && control?.relacionados.length && !control.detectadosV1.length) { confirmar({ tipo: 'revertir', historialId: h.id }); return; }
      r = C.revertir(m, h?.id, ctx);
    }
    if (r) resultado(r);
  });
  document.addEventListener('change', ev => {
    const e = ev.target, v = U.vista();
    const form = e.closest?.('form[data-ct-form]');
    if (e.name === 'empresaId' && form?.dataset.ctForm === 'contrato') { v.borradorContrato = leer(form); A.render(); return; }
    if (e.name === 'empresaId' && form?.dataset.ctForm === 'consulta') { v.consulta = { ...leer(form), volumen: '' }; A.render(); return; }
    if (e.hasAttribute('data-ct-origen')) {
      if (v.filas.length || v.borradorContrato || v.borradorAdenda) { resultado({ ok: false, msg: 'Termina o vacía el borrador antes de cambiar de catálogo. No se descartó.' }); A.render(); return; }
      v.origenCatalogo = e.value; v.confirmacion = null; A.render(); return;
    }
    if (e.dataset.ctSeleccion === 'contrato') { const hs = C.historiales(U.modelo(), Number(e.value)); seleccionar(hs.at(-1)?.id); A.render(); }
    if (e.dataset.ctSeleccion === 'version') { seleccionar(Number(e.value)); A.render(); }
    if (e.hasAttribute('data-ct-tipo')) { v.borradorAdenda = leer(e.closest('form')); v.tipoAdenda = e.value; A.render(); }
    if (e.dataset.ctPermiso) { U.contexto().permisos[e.dataset.ctPermiso] = e.checked; E.guardar(); }
  });
})();

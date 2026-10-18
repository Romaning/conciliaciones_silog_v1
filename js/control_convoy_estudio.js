(function () {
  const U = SILOG.estudioConvoyUI, N = SILOG.convoyEstudio, CU = SILOG.estudioConciliacionesUI, E = SILOG.estado, A = SILOG.app;
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const recordar = (f, v) => { const d = leer(f); v.inicio = d.inicio; v.fin = d.fin; v.ids = Object.keys(d).filter(k => k.startsWith('rec_') && d[k] === true).map(k => Number(k.slice(4))); v.previa = null; };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-nc-form]'); if (!f) return; ev.preventDefault();
    const { m, c } = CU.seleccion(); if (!c) return;
    const v = U.vista(c), ctx = CU.contexto(); recordar(f, v);
    const r = N.previsualizar(m, c.id, v.inicio, v.fin, v.ids, ctx);
    if (!r.ok) return resultado(r);
    v.previa = { firma: r.firma, conciliacionId: c.id, ejercicioId: m.ejercicioId }; A.render();
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-nc-accion]'); if (!b) return;
    const { m, c } = CU.seleccion(); if (!c) return; const v = U.vista(c);
    if (b.dataset.ncAccion === 'abrir') { v.abierto = !v.abierto; v.previa = null; A.render(); }
    if (b.dataset.ncAccion === 'cancelar') { v.previa = null; A.render(); }
    if (b.dataset.ncAccion === 'confirmar') {
      const p = v.previa; v.previa = null;
      if (!p || p.conciliacionId !== c.id || p.ejercicioId !== m.ejercicioId) return resultado({ ok: false, msg: 'Cambió la selección del expediente. Compara nuevamente.' });
      const r = N.agregar(m, c.id, v.inicio, v.fin, [...v.ids], CU.contexto(), p.firma);
      if (r.ok) v.ids = []; resultado(r);
    }
  });
  document.addEventListener('input', ev => {
    const f = ev.target.closest('form[data-nc-form]'); if (!f) return;
    const { c } = CU.seleccion(); if (c) recordar(f, U.vista(c));
  });
  document.addEventListener('change', ev => {
    const f = ev.target.closest('form[data-nc-form]'); if (!f) return;
    const { c } = CU.seleccion(); if (!c) return;
    recordar(f, U.vista(c)); A.render();
  });
})();

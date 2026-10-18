/* Eventos de captura: selección por ID, previsualización y confirmación local del reemplazo. */
(function () {
  const L = SILOG.multasCREEstudio, U = SILOG.estudioMultasCREUI, E = SILOG.estado, A = SILOG.app;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const resultado = r => { if (r.ok) E.guardar(); A.notificar(r); };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-lc-form]'); if (!f) return; ev.preventDefault();
    const m = U.modelo(), v = U.vista(), d = leer(f), ctx = U.contexto();
    if (f.dataset.lcForm === 'referencia') return resultado(L.etiquetar(m, f.dataset.origen, Number(f.dataset.id), d.referencia, ctx));
    v.borradores[v.creId] = d; v.confirmacion = null;
    const entradas = L.preparar(m).catalogo.filter(c => d['usar_' + c.id] === true).map(c => ({ multaId: c.id, cantidad: d['cantidad_' + c.id], mpf: d['mpf_' + c.id], tc: d.tc, referencia: d['referencia_' + c.id] }));
    const calculos = entradas.map(e => L.calcular(m, v.creId, e)), error = calculos.find(r => !r.ok); if (error) return resultado(error);
    v.calculo = calculos;
    if (ev.submitter?.value !== 'guardar') { A.render(); return; }
    if (L.preparar(m).registros.some(r => r.creId === Number(v.creId))) {
      v.confirmacion = { ejercicioId: m.ejercicioId, creId: Number(v.creId), entradas, huella: JSON.stringify(L.preparar(m).registros) }; A.render(); return;
    }
    resultado(L.guardar(m, v.creId, entradas, ctx));
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-lc-accion], [data-lc-abrir]'); if (!b) return;
    const m = U.modelo(), v = U.vista();
    if (b.dataset.lcAbrir) { const n = Number(b.dataset.lcAbrir); if (!m.cres.some(c => c.id === n && c.tipoId === 3 && c.estadoId === 1)) return resultado({ ok: false, msg: 'El despacho no pertenece al recorrido activo.' }); v.creId = n; v.calculo = null; v.confirmacion = null; location.hash = 'multascreconectadas'; A.render(); return; }
    if (b.dataset.lcAccion === 'cancelar') { v.confirmacion = null; A.render(); return; }
    if (b.dataset.lcAccion === 'confirmar') {
      const p = v.confirmacion; v.confirmacion = null; if (!p) return;
      if (p.ejercicioId !== m.ejercicioId || p.creId !== Number(v.creId) || p.huella !== JSON.stringify(L.preparar(m).registros)) return resultado({ ok: false, msg: 'La selección o las multas cambiaron; revisa y confirma otra vez. No se reemplazó nada.' });
      resultado(L.guardar(m, p.creId, p.entradas, U.contexto()));
    }
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.lc-estudio')) return; const v = U.vista();
    if (e.name === 'lcCreId') { v.creId = e.value ? Number(e.value) : null; v.calculo = null; v.confirmacion = null; A.render(); }
    else if (e.dataset.lcPermiso) { U.contexto().permisos[e.dataset.lcPermiso] = e.checked; E.guardar(); }
  });
})();

/* Adaptador SAP: borradores aislados, confirmación en página y persistencia de intentos fallidos. */
(function () {
  const S = SILOG.sapEstudio, U = SILOG.estudioSAPUI, CU = SILOG.estudioConciliacionesUI, A = SILOG.app, E = SILOG.estado;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.value]));
  const terminar = r => { E.guardar(); A.notificar(r); }; // Un fallo puede contener respuesta remota y debe conservarse.
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-se-form]'); if (!f) return; ev.preventDefault();
    const { m, c, v } = U.seleccion(); if (!c) return;
    const d = leer(f); v.borradores[c.id] = d;
    const r = S.configurar(m, c.id, d, U.contexto()); if (r.ok) delete v.borradores[c.id]; terminar(r);
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-se-accion]'); if (!b) return;
    const { m, c, v } = U.seleccion(), a = b.dataset.seAccion;
    if (a === 'paso') { const n = Number(b.dataset.paso); if (Number.isInteger(n) && n >= 0 && n < S.PASOS.length) v.paso = n; A.render(); return; }
    if (a === 'cancelar') { v.confirmar = null; A.render(); return; }
    if (!c) { terminar({ ok: false, msg: 'Selecciona una conciliación del recorrido.' }); return; }
    if (a === 'preparar') terminar(S.prepararExpediente(m, c.id, U.contexto(), true));
    else if (a === 'ejemplo') { v.borradores[c.id] = S.ejemploConfiguracion(m, c.id); A.render(); }
    else if (a === 'aprobarLOG') terminar(S.aprobarLOG(m, c.id, U.contexto()));
    else if (a === 'ejecutar' || a === 'recuperar') {
      v.confirmar = { id: c.id, accion: a === 'recuperar' ? 'recuperación propuesta' : b.dataset.operacion, escenario: v.escenario, recuperar: a === 'recuperar' };
      A.render(); document.querySelector?.('[data-se-accion="confirmar"]')?.focus();
    } else if (a === 'confirmar') {
      const q = v.confirmar; if (!q || q.id !== c.id) { v.confirmar = null; terminar({ ok: false, msg: 'La selección cambió. Confirma de nuevo sobre el documento correcto.' }); return; }
      const r = q.recuperar ? S.recuperar(m, c.id, U.contexto()) : S.ejecutar(m, c.id, q.accion, U.contexto(), q.escenario);
      v.confirmar = null; if (c.sapEstudio?.incidencia) v.paso = 6; terminar(r);
    }
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.se-estudio')) return; const { c, v } = U.seleccion();
    if (e.name === 'seConciliacionId') { CU.vista().conciliacionId = e.value ? Number(e.value) : null; v.confirmar = null; A.render(); }
    else if (e.name === 'seEscenario') { if (['correcto', 'sinConexion', 'errorSAP', 'falloLocal'].includes(e.value)) v.escenario = e.value; A.render(); }
    else if (e.name === 'seExterno') { v.externo = e.checked; A.render(); }
    else if (e.dataset.sePermiso) { U.contexto().permisos[e.dataset.sePermiso] = e.checked; E.guardar(); A.render(); }
    else { const f = e.closest('form[data-se-form]'); if (f && c) v.borradores[c.id] = leer(f); }
  });
})();

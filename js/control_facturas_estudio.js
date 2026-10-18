/* Adaptador de facturas: mismas conciliaciones, formularios aislados y confirmación sin diálogo nativo. */
(function () {
  const F = SILOG.facturasEstudio, U = SILOG.estudioFacturasUI, CU = SILOG.estudioConciliacionesUI, A = SILOG.app, E = SILOG.estado;
  const leer = f => Object.fromEntries([...f.elements].filter(e => e.name && !e.disabled).map(e => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  const terminar = r => { if (r.ok) E.guardar(); A.notificar(r); };
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-fe-form]'); if (!f) return; ev.preventDefault();
    const { m, c, v } = U.seleccion(); if (!c) { terminar({ ok: false, msg: 'Selecciona una conciliación generada.' }); return; }
    const d = leer(f), t = f.dataset.feForm; (v.borradores[c.id] ||= {})[t] = d;
    if (t === 'referencias') { const r = F.guardarReferencias(m, c.id, d, U.contexto()); if (r.ok) delete v.borradores[c.id][t]; terminar(r); }
    else if (t === 'liberar') {
      const claves = Object.entries(d).filter(([k, val]) => k.startsWith('fila_') && val === true).map(([k]) => k.slice(5));
      if (!claves.length) { terminar({ ok: false, msg: 'Selecciona al menos una fila pendiente.' }); return; }
      v.confirmar = claves; A.render(); document.querySelector?.('[data-fe-accion="confirmarLiberar"]')?.focus();
    } else if (t === 'laboratorio') {
      const n = s => typeof s !== 'boolean' && String(s ?? '').trim() && Number.isFinite(Number(s));
      if (!n(d.merma) || !n(d.incumplimiento) || !['true', 'false', 'null'].includes(d.bandera)) { terminar({ ok: false, msg: 'Introduce importes numéricos y una bandera válida para el laboratorio.' }); return; }
      const copia = structuredClone(c); copia.estado = 'Aprobada Por Transportista'; copia.recargos = [];
      copia.totales = { ...copia.totales, merma: Number(d.merma), multaTransporte: Number(d.incumplimiento) };
      copia.facturacion.facturasPagadas = d.bandera === 'null' ? null : d.bandera === 'true';
      const filas = F.pendientes({ recorridoConciliaciones: { lista: [copia] } }, c.id);
      v.laboratorio = { conciliacionId: c.id, mensaje: c.medio !== 1 ? 'La rama de barcaza/vagón no devuelve ese listado de deudas; no se infiere deuda cero.' : `${filas.length ? 'Sí aparecería' : 'No aparecería'}: estado Aprobada Por Transportista, bandera ${d.bandera}; −(${d.merma}) > 50000 O −(${d.incumplimiento}) > 50000. NULL no cumple =0. Los conceptos se comparan separados, no se suman. Tu conciliación no cambió.` };
      A.render();
    } else if (t === 'servicio') { const r = F.proponerServicio(m, c.id, d, U.contexto()); if (r.ok) delete v.borradores[c.id][t]; terminar(r); }
    else if (t === 'anularServicio') { const r = F.anularPropuesta(m, c.id, d.motivo, U.contexto()); if (r.ok) delete v.borradores[c.id][t]; terminar(r); }
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-fe-accion]'); if (!b) return; const { m, c, v } = U.seleccion();
    const a = b.dataset.feAccion;
    if (a === 'paso') { const p = Number(b.dataset.paso); if (Number.isInteger(p) && p >= 0 && p < F.PASOS.length) v.paso = p; A.render(); }
    else if (a === 'cancelar') { v.confirmar = null; A.render(); }
    else if (a === 'confirmarLiberar') { if (!v.confirmar) return; const r = F.liberarCobros(m, c?.id, v.confirmar, U.contexto()); if (r.ok) v.confirmar = null; terminar(r); }
    else if (a === 'rutaAnterior') terminar(F.ensayarRutaAnterior(m, c?.id, U.contexto()));
  });
  document.addEventListener('change', ev => {
    const e = ev.target; if (!e.closest('.fe-estudio')) return; const { c, v } = U.seleccion();
    if (e.name === 'feConciliacionId') { CU.vista().conciliacionId = e.value ? Number(e.value) : null; v.confirmar = null; A.render(); return; }
    if (e.dataset.fePermiso) { U.contexto().permisos[e.dataset.fePermiso] = e.checked; E.guardar(); return; }
    const f = e.closest('form[data-fe-form]'); if (f && c) (v.borradores[c.id] ||= {})[f.dataset.feForm] = leer(f);
  });
})();

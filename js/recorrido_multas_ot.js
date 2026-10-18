/* Rama opcional contractual: conserva IDs/contexto de OT y reutiliza formularios y guía. */
(function (R) {
  const E = SILOG.estado, M = SILOG.motor, C = SILOG.multasContractuales, U = SILOG.controlMultas, A = SILOG.app, V = SILOG.vistas;
  const c = () => M.porId(E.st.conciliaciones, (E.ui.ramaMultasOT || {}).concId);
  const h = () => M.porId(E.st.multasContractuales, U.vista().cabeceraId);
  const d = () => M.porId(E.st.recargosCatalogo, U.vista().detalleId);
  const guardar = r => { if (r.ok) { E.log('Rama contractual OT', r.msg); E.guardar(); } return r; };
  R.preparar = concId => {
    const conc = M.porId(E.st.conciliaciones, concId);
    if (!conc || conc.tipo !== 'Cisterna' || conc.estado !== 'En Elaboracion') return { ok: false, msg: 'Seleccione una conciliación de cisterna en elaboración para estudiar la rama operativa.' };
    if (E.ui.tour?.rama === 'MULTAS_OT') return { ok: false, msg: 'Ya hay una rama activa; termine o vuelva a OT.' };
    E.ui.ramaMultasOT = { concId, tourAnterior: { ...E.ui.tour }, vistaOT: JSON.parse(JSON.stringify(A.vs.ot)) };
    Object.assign(U.vista(), { concId, cabeceraId: null, detalleId: null, paso: 0, ambito: 'CRE_R', creId: null, borrador: {} });
    A.vs.conc.concId = concId; E.ui.tour = { activo: true, paso: 0, rama: 'MULTAS_OT' }; E.guardar();
    return { ok: true, msg: `Rama contractual de la N° ${conc.numero}; no se crea otra conciliación.` };
  };
  R.iniciar = id => { const r = R.preparar(id); if (r.ok) A.irPasoTour(0); else A.notificar(r); };
  R.volver = () => {
    const rama = E.ui.ramaMultasOT; if (!rama) return;
    const conc = c();
    Object.assign(A.vs.ot, rama.vistaOT, conc ? { concId: conc.id, tipo: conc.tipo, area: conc.area, mes: conc.mes, anio: conc.anio, quincena: conc.quincena, transportistaId: 0 } : {});
    A.vs.conc.concId = rama.concId; E.ui.tour = rama.tourAnterior || { activo: false, paso: 0 }; E.ui.ramaMultasOT = null; E.guardar();
    if (A.ruta() !== 'ot') location.hash = 'ot'; else A.render();
  };
  const paso = (n, titulo, hacer, porque, veras, hecho, auto) => ({ vista: 'multascontractuales', titulo, hacer, porque, veras, hecho, auto,
    sel: ['[data-mc-form="cabecera"]', '[data-mc-form="detalle"]', '[data-mc-form="empresas"]', '.mc-historia', '[data-mc-form="aplicacion"]', '.mc-resumen'][n],
    preparar: () => { U.vista().paso = n; U.vista().concId = (E.ui.ramaMultasOT || {}).concId; } });
  R.pasos = [
    paso(0, 'Definir la multa del recorrido', 'Guarde una Multa a CRE de recepción o despacho con vigencia que cubra el viaje.', 'La configuración se administra fuera de OT; se estudia cómo termina en sus Recargos.', 'Definición guardada, ningún cobro todavía.',
      () => !!h(), () => { const conc = c(); const r = C.guardarCabecera(E.st, { tipoContratoId: C.tipoContrato(E.st, conc), denominacion: `Condiciones documentales · conciliación ${conc.numero}`, tipo: 'Multa', aplicabilidad: 'CRE_R', vigInicio: `${conc.anio}-01-01`, vigFin: `${conc.anio}-12-31`, observacion: 'Ejercicio ficticio de Otros Transportes.' }, U.contexto()); if (r.ok) U.vista().cabeceraId = r.id; return guardar(r); }),
    paso(1, 'Crear concepto e importe', 'Cree un concepto documental DOC de 100 BOB.', 'Configurar un importe no aplica una multa a un viaje.', 'Recargo EN ELABORACION; conciliación sin cambios.',
      () => !!d(), () => { const cab = h(); const r = C.guardarDetalle(E.st, { cabeceraId: cab.id, concepto: 'Documentación del CRE entregada fuera de plazo', sigla: 'DOC', monto: 100, moneda: 'BOB', vigInicio: cab.vigInicio, vigFin: cab.vigFin, activo: true }, U.contexto()); if (r.ok) U.vista().detalleId = r.id; return guardar(r); }),
    paso(2, 'Asociar la empresa de esta conciliación', 'Seleccione la empresa transportista y guarde.', 'La empresa debe estar asociada para que el recargo sea elegible.', 'Empresa habilitada; todavía ningún CRE multado.',
      () => !!d() && !!c() && d().empresas.includes(c().transportistaId), () => guardar(C.asociarEmpresas(E.st, d().id, [c().transportistaId], U.contexto()))),
    paso(3, 'Aprobar y liberar el recargo', 'Solicite aprobación, solicite liberación y libere con las actividades correspondientes.', 'Solo LIBERADO puede aparecer en las multas del CRE.', 'Tres transiciones auditadas; la conciliación sigue En Elaboracion.',
      () => !!d() && d().estado === 'LIBERADO', () => { let r = { ok: true, msg: 'Recargo ya liberado.' }; while (d().estado !== 'LIBERADO') { r = C.cambiarEstado(E.st, d().id, false, U.contexto()); if (!r.ok) break; } return guardar(r); }),
    paso(4, 'Aplicar al CRE de esta conciliación', 'Elija operación y CRE, marque el concepto, indique cantidad 2 y guarde.', 'Ahora se registra detalle contractual → conciliación → CRE. Solo corresponde si existe un incidente.', '100 × 2 = 200 BOB aplicados. No se crea otra conciliación.',
      () => !!d() && !!c() && c().recargos.some(r => r.catalogoId === d().id && r.creId), () => {
        const conc = c(), cre = C.cres(E.st, conc, h().aplicabilidad)[0]; if (!cre) return { ok: false, msg: 'No hay CRE para ese ámbito.' };
        const anteriores = conc.recargos.filter(r => r.creId === cre.id && r.catalogoId).map(r => ({ id: r.catalogoId, monto: r.monto, cantidad: r.cantidad ?? 1, tc: r.tc }));
        Object.assign(U.vista(), { ambito: h().aplicabilidad, creId: cre.id, borrador: {} });
        if (!anteriores.some(r => r.id === d().id)) anteriores.push({ id: d().id, monto: d().monto, cantidad: 2, tc: C.TC_V1 });
        return guardar(C.aplicarCRE(E.st, conc.id, cre.id, anteriores, U.contexto()));
      }),
    paso(5, 'Comprobar y volver a Otros Transportes', 'Revise el desglose y procese; Terminar vuelve a la misma conciliación y guía principal.', 'Las clásicas y contractuales ya están en Multa Transporte. Guardar aplicación no es procesar el neto.', 'Neto guardado coincide con recalculado. Las ediciones pendientes de OT se conservan, no se aplican aquí.',
      () => !!c() && c().procesada && c().totales.neto === M.recalcular(E.st, c(), E.ui.modo).cab.neto && !!d() && c().recargos.some(r => r.catalogoId === d().id), () => guardar(E.procesar(c().id)))
  ];
  V.ramaContractualOT = conc => `<li class="ot-etapa carril-ot"><span class="ot-n" aria-hidden="true">↳</span><div class="ot-cuerpo"><div class="ot-tit"><strong>Rama: multas contractuales asociadas al CRE</strong><span class="tag">Opcional · antes de Procesar</span></div>
    <p>Si hay un incumplimiento contractual: <strong>Ver Recargos → seleccionar CRE → aplicar concepto liberado → procesar → continuar OT</strong>. Si el concepto no existe, se configura, asocia y autoriza en el subrecorrido.</p>
    <p>Definición → recargo → empresa → aprobación/liberación → CRE → cálculo. No sustituye las multas clásicas ni obliga a multar todos los viajes.</p>
    <p class="mono">V1: wmRecargo → MultaDescuentoConciliacion.aspx → AdicionarMultaAlCRE.aspx. Configuración: DetalleMultaDescuento.aspx.</p>
    <div class="mc-acciones"><button class="btn primario" data-accion="iniciarMultasOT" ${conc && conc.estado === 'En Elaboracion' ? `data-id="${conc.id}"` : 'disabled'}>Recorrer multas contractuales de esta conciliación</button>${conc ? `<a class="btn" href="#recargos" data-accion="verConc" data-id="${conc.id}" data-ir="recargos">Ver Recargos de la N° ${conc.numero}</a>` : ''}</div>
    ${!conc ? '<p class="ayuda">Genere y seleccione una conciliación en «Sigue una conciliación».</p>' : conc.estado !== 'En Elaboracion' ? '<p class="ayuda">Solo consulta: la conciliación no está en elaboración.</p>' : ''}
  </div></li>`;
  // No desplaza las posiciones del guion O: la rama se ofrece en un paso existente.
  const entrada = SILOG.TOUR_OT.find(p => p.titulo === 'Marca la N° 1001');
  if (entrada) { entrada.ramaMultas = true; entrada.hacer += ' Si hay multas contractuales, use «Recorrer multas contractuales» y luego vuelva. Si no corresponden, continúe con Siguiente.'; }
  const final = SILOG.TOUR_OT.find(p => p.titulo === 'Resultado final y qué sigue');
  if (final) final.veras += ' Esta es la línea base sin multas contractuales adicionales; si estudió la rama, consulte el neto actual que incluye las aplicaciones guardadas.';
  SILOG.escenarioPorId('O').guion = SILOG.TOUR_OT.map(p => ({ vista: p.vista, paso: p.hacer, esperado: p.veras }));
  const fuentesOT = [
    ['Control de usuario', 'ConciliacionOtrosTransportes.ascx.vb', 'LOGISTICA/UserControls/ConciliacionOtrosTransportes.ascx.vb:875-897', 'Ver Recargos conserva ConciliacionID, tipo de conciliación, tipo de contrato y modo de edición.'],
    ['Código VB', 'MultaDescuentoConciliacion.aspx.vb', 'LOGISTICA/MultaDescuentoConciliacion.aspx.vb:825-845', 'Seleccionar un CRE abre AdicionarMultaAlCRE con CREID y ConciliacionID.']
  ];
  SILOG.FUENTES.otmapa.items.push(...fuentesOT);
  SILOG.FUENTES.multascontractuales.items.push(...fuentesOT);
})(SILOG.recorridoMultasOT = {});

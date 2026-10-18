/* Adaptador de la guía: reutiliza los motores, nunca copia IDs del simulador general.
 * La identidad y las selecciones se guardan dentro del expediente para archivar/restaurar juntas. */
(function (G) {
  const C = SILOG.contratosEstudio, O = SILOG.ordenesEstudio, H = SILOG.hojasRutaEstudio,
    R = SILOG.creEstudio, B = SILOG.conciliacionesEstudio;
  const E = () => SILOG.estado, A = () => SILOG.app;
  const porId = (xs, id) => (xs || []).find(x => x.id === Number(id));
  const error = msg => ({ ok: false, msg }), ok = msg => ({ ok: true, msg });
  G.VERSION = 2;
  G.REVISION = 5; // Nuevo convoy es una rama de estudio; no se inyectan viajes en expedientes anteriores.
  // Datos ficticios de un caso de estudio, no parámetros contractuales de producción.
  G.CASO = Object.freeze({ empresaId: 502, medioId: 1, unidadId: 1003, conductorId: 1103,
    origenId: 701, destinoId: 702, rutaId: 901, productoId: 801, volumen: 34000, recibido: 33000,
    tarifaInicial: 180, tarifaAdenda: 230, admisible: 0.4, precio: 3.74, multa: 200, cantidadMulta: 2 });
  G.expediente = (st = E().st) => {
    const m = st?.estudioOrdenes, g = m?.guiaOT;
    if (!g || g.version !== G.VERSION || g.ejercicioId !== m.ejercicioId) return null;
    const ids = g.ids, k = m.contratos;
    const inicial = porId(k.historiales, ids.inicial), adenda = porId(k.historiales, ids.adenda);
    const contrato = porId(k.contratos, ids.contrato), s = porId(m.solicitudes, ids.solicitud);
    const o = porId(m.ordenes, ids.orden), d = o?.detalles.find(d => d.id === ids.detalle);
    const desp = porId(m.cres, ids.despacho), rec = porId(m.cres, ids.recepcion);
    const c = porId(m.recorridoConciliaciones?.lista, ids.conciliacion);
    return { m, g, ids, k, contrato, inicial, adenda, s, h: s && H.hoja(m, s.id), o, d, desp, rec, c };
  };
  G.problemas = (st = E().st) => {
    const z = G.expediente(st); if (!z) return ['Prepara o restaura el expediente guiado antes de continuar.'];
    const { m, ids, contrato, inicial, adenda, s, o, d, desp, rec, c } = z, xs = [];
    if (ids.contrato && (!contrato || contrato.empresaId !== G.CASO.empresaId || contrato.medioId !== G.CASO.medioId)) xs.push('Contrato ausente o de otra empresa/medio.');
    for (const [id, h] of [[ids.inicial, inicial], [ids.adenda, adenda]]) if (id && (!h || h.contratoId !== ids.contrato)) xs.push('Historial de otro contrato o ausente.');
    const tarifa = porId(z.k.tarifas, ids.tarifa);
    if (ids.tarifa && (!tarifa || tarifa.historialId !== ids.adenda)) xs.push('La tarifa seguida ya no existe o pertenece a otro historial.');
    if (ids.solicitud && (!s || s.contratoId !== ids.contrato || !s.detalles.some(l => l.id === ids.lineaSolicitud && l.tarifaId === ids.tarifa))) xs.push('La solicitud no conserva la línea y tarifa contractual vinculadas.');
    if (ids.orden && (!o || !d || d.solicitudId !== ids.solicitud || d.solicitudDetalleId !== ids.lineaSolicitud)) xs.push('La orden no contiene la línea de solicitud seguida.');
    if (ids.despacho && (!R.esDespacho(desp) || !desp.detalleIds?.includes(ids.detalle) || desp.estadoId === 1 && !m.enlaces.some(e => e.creId === ids.despacho && e.detalleId === ids.detalle))) xs.push('El despacho no está relacionado con el detalle seguido.');
    if (ids.recepcion && (!R.esRecepcion(rec) || !rec.despachoIds?.includes(ids.despacho) || rec.estadoId === 1 && !m.recorridoCRE.asociaciones.some(a => a.despachoId === ids.despacho && a.recepcionId === ids.recepcion))) xs.push('La recepción no está relacionada con el despacho seguido.');
    if (ids.conciliacion && (!c || c.transportistaId !== contrato?.empresaId || !c.lineas.some(l => l.despachoId === ids.despacho && l.recepcionId === ids.recepcion && l.procedencia?.tarifaId === ids.tarifa))) xs.push('La conciliación no contiene el par de CRE y la tarifa seguidos.');
    if (c?.sapEstudio && (c.sapEstudio.conciliacionId !== c.id || c.sapEstudio.empresaId !== c.transportistaId)) xs.push('El registro SAP pertenece a otro documento/empresa.');
    const definicion = porId(m.recorridoConciliaciones?.multasContractuales, ids.definicion);
    const concepto = porId(m.recorridoConciliaciones?.recargosCatalogo, ids.concepto);
    if (ids.definicion && (!definicion || definicion.tipoContratoId !== c?.medio || definicion.aplicabilidad !== 'CRE_D')) xs.push('La definición de multa ya no corresponde al medio y ámbito seguidos.');
    if (ids.concepto && (!concepto || concepto.cabeceraId !== ids.definicion)) xs.push('El concepto ya no pertenece a la definición seguida.');
    if (ids.cobroGuia) { const cobro = m.recorridoAdicionales?.cobros.find(r => r.id === ids.cobroGuia); if (!cobro || cobro.ejercicioId !== m.ejercicioId || !cobro.detalleIds.includes(ids.detalle)) xs.push('El cobro CG no pertenece al detalle de orden y ejercicio seguidos.'); }
    return xs;
  };
  G.normalizarProgreso = () => {
    if (E().ui.escenario !== 'T' || E().ui.tour?.rama === 'MULTAS_OT') return;
    const t = E().ui.tour ||= {};
    if (t.versionGuia === G.VERSION && t.revisionGuia === G.REVISION) return;
    if (t.paso || E().ui.guion?.T?.length) {
      (E().ui.guiasAnteriores ||= []).push({ escenario: 'T', tour: structuredClone(t), pasos: [...(E().ui.guion?.T || [])] });
      t.actualizacion = 'La guía incorpora multas CRE, carro guía, casos especiales y la rama Nuevo convoy. Se conservan documentos y marcas anteriores; se reinicia sólo la posición. No se inyectan cargos en conciliaciones aprobadas: para repetir el caso prepara otro ejercicio desde Órdenes (el anterior se archiva). No se convierten documentos generales por coincidencia de ID.';
    }
    Object.assign(t, { versionGuia: G.VERSION, revisionGuia: G.REVISION, paso: 0 });
    (E().ui.guion ||= {}).T = []; E().guardar();
  };
  G.iniciar = () => {
    if (G.expediente()) return ok('Continúas el mismo expediente guiado; no se reemplazó ningún dato.');
    const st = E().st, fuente = st.estudioContratos;
    // La primera vista de Contratos puede haber preparado sólo catálogos vacíos. Reutilizarlos
    // evita inventar un «laboratorio antiguo» al comenzar; un catálogo con trabajo se conserva aparte.
    const catalogo = !st.estudioOrdenes && fuente && !fuente.contratos.length && !fuente.historiales.length && !fuente.tarifas.length && !C.todosUsos(fuente).length ? fuente : C.nuevo();
    const r = O.reemplazar(st, catalogo, { usuario: E().ui.usuario }, 'Inicio explícito de Aprende paso a paso', { ejemplos: false });
    if (!r.ok) return r;
    const m = E().st.estudioOrdenes;
    m.guiaOT = { version: G.VERSION, ejercicioId: m.ejercicioId, ids: {}, lecturas: [] };
    SILOG.estudioOrdenesUI.limpiarSeleccion(); B.preparar(m); E().guardar();
    return ok('Expediente vacío preparado, sin solicitudes/HR precargadas. El anterior quedó archivado si existía. Los escenarios generales y el laboratorio contractual independiente se conservan.');
  };
  G.contexto = vista => {
    const ui = { contratos: 'estudioContratosUI', hojasruta: 'estudioHRUI', ordenespasos: 'estudioOrdenesUI', crepasos: 'estudioCREUI',
      otconectadas: 'estudioConciliacionesUI', multascreconectadas: 'estudioMultasCREUI', recargosconectados: 'estudioAdicionalesUI', facturasconectadas: 'estudioFacturasUI', sapconectado: 'estudioSAPUI', pagoscierre: 'estudioPagosCierreUI' };
    return SILOG[ui[vista]].contexto();
  };
  G.enfocar = (vista, paso, historial = 'adenda') => {
    const z = G.expediente(); if (!z) return;
    const { m, ids } = z;
    // Selección siempre por IDs del expediente. No tomar «último» ni primer documento de otra vista.
    if (vista === 'contratos') Object.assign(SILOG.estudioContratosUI.vista(), { paso, origenCatalogo: 'operativo', catalogoId: m.contratos.catalogoId, contratoId: ids.contrato || null, historialId: ids[historial] || null });
    if (vista === 'hojasruta') { SILOG.estudioHRUI.modelo(); Object.assign(SILOG.estudioHRUI.vista(), { paso, solicitudId: ids.solicitud || null }); }
    if (['ordenespasos', 'crepasos'].includes(vista)) Object.assign(SILOG.estudioOrdenesUI.vista(), { paso: vista === 'ordenespasos' ? paso : 4, ordenId: ids.orden || null, seleccion: ids.detalle ? [ids.detalle] : [] });
    if (vista === 'crepasos') { SILOG.estudioCREUI.modelo(); Object.assign(SILOG.estudioCREUI.vista(), { paso, ids: ids.despacho ? [ids.despacho] : [], recepcionId: ids.recepcion || null, soloOrden: true }); }
    if (vista === 'multascreconectadas') { SILOG.estudioMultasCREUI.modelo(); SILOG.estudioMultasCREUI.vista().creId = ids.despacho || null; }
    if (['otconectadas', 'recargosconectados', 'facturasconectadas', 'sapconectado', 'pagoscierre', 'otmapa'].includes(vista)) {
      SILOG.estudioConciliacionesUI.modelo();
      Object.assign(SILOG.estudioConciliacionesUI.vista(), { conciliacionId: ids.conciliacion || null });
    }
    if (vista === 'otconectadas') Object.assign(SILOG.estudioConciliacionesUI.vista(), { paso, detalleRecargoId: ids.concepto || null });
    if (vista === 'recargosconectados') SILOG.estudioAdicionalesUI.seleccion().v.paso = paso;
    for (const [v, ui] of [['facturasconectadas', 'estudioFacturasUI'], ['sapconectado', 'estudioSAPUI'], ['pagoscierre', 'estudioPagosCierreUI']]) if (vista === v) SILOG[ui].seleccion().v.paso = paso;
    if (vista === 'otmapa') Object.assign(A().vs.otm, { origen: 'conectado', concId: ids.conciliacion || null });
  };
  G.guardarId = (nombre, r, extra = {}) => {
    if (!r.ok) return r;
    Object.assign(G.expediente().ids, { [nombre]: r.id }, extra); E().guardar(); return r;
  };
  G.vincular = (tipo, seleccionId) => {
    const z = G.expediente(); if (!z) return error('Primero prepara el expediente de la guía.');
    const { m, ids } = z, propuesta = { ...ids };
    if (tipo === 'inicial' || tipo === 'adenda') {
      const { c, h, m: catalogo } = SILOG.estudioContratosUI.seleccion();
      if (catalogo !== z.k) return error('Ese contrato pertenece al laboratorio independiente, no al catálogo del expediente activo. No se vincula por coincidencia de ID.');
      if (tipo === 'inicial' && (c?.empresaId !== G.CASO.empresaId || c?.medioId !== 1 || h?.secuencia !== 1)) return error('Selecciona el contrato de Cisternas del Oriente y su historial inicial en el catálogo activo.');
      if (tipo === 'adenda' && (c?.id !== ids.contrato || h?.secuencia <= 1 || h?.tipo !== 'MCOND')) return error('Selecciona una adenda MCOND del mismo contrato guiado.');
      Object.assign(propuesta, { contrato: c.id, [tipo]: h.id });
    } else if (tipo === 'solicitud') {
      const { s } = SILOG.estudioHRUI.seleccion(), ls = s?.detalles.filter(l => l.productoId === G.CASO.productoId && porId(m.contratos.tarifas, l.tarifaId)?.historialId === ids.adenda);
      if (s?.contratoId !== ids.contrato || ls?.length !== 1 || s.ejemploPreparado) return error('Selecciona una SHR creada desde el inicio con la tarifa GES de la adenda guiada.');
      Object.assign(propuesta, { solicitud: s.id, lineaSolicitud: ls[0].id, tarifa: ls[0].tarifaId });
    } else if (tipo === 'orden') {
      const { o } = SILOG.estudioOrdenesUI.seleccion(), ds = o?.detalles.filter(d => d.solicitudId === ids.solicitud && d.solicitudDetalleId === ids.lineaSolicitud);
      if (ds?.length !== 1) return error('Selecciona la orden que contiene la línea de la SHR guiada.');
      Object.assign(propuesta, { orden: o.id, detalle: ds[0].id });
    } else if (tipo === 'despacho') {
      const candidatos = m.cres.filter(c => R.esDespacho(c) && c.detalleIds.includes(ids.detalle) && !c.reservaDescartada);
      const seleccionado = SILOG.estudioCREUI.vista().ids, ds = candidatos.filter(c => seleccionado.includes(c.id));
      const d = ds.length === 1 ? ds[0] : candidatos.length === 1 ? candidatos[0] : null;
      if (!d) return error('Selecciona un CRE de despacho relacionado con el detalle guiado; no se elige entre varios arbitrariamente.');
      propuesta.despacho = d.id;
    } else if (tipo === 'recepcion') {
      const r = porId(m.cres, SILOG.estudioCREUI.vista().recepcionId);
      if (!R.esRecepcion(r) || !r.despachoIds.includes(ids.despacho)) return error('Selecciona la recepción vinculada al despacho guiado.');
      propuesta.recepcion = r.id;
    } else if (tipo === 'conciliacion') {
      const c = SILOG.estudioConciliacionesUI.seleccion().c;
      if (!c?.lineas.some(l => l.despachoId === ids.despacho && l.recepcionId === ids.recepcion && l.procedencia?.tarifaId === ids.tarifa)) return error('Selecciona la conciliación del mismo par de CRE y tarifa guiados.');
      propuesta.conciliacion = c.id;
    } else if (tipo === 'definicion') {
      const h = porId(m.recorridoConciliaciones.multasContractuales, seleccionId);
      if (!h || h.tipoContratoId !== z.c?.medio || h.aplicabilidad !== 'CRE_D') return error('Selecciona por ID una definición del mismo medio y ámbito despacho.');
      propuesta.definicion = h.id;
    } else if (tipo === 'concepto') {
      const d = porId(m.recorridoConciliaciones.recargosCatalogo, SILOG.estudioConciliacionesUI.vista().detalleRecargoId);
      if (!d || d.cabeceraId !== ids.definicion) return error('Selecciona un recargo de la definición guiada.');
      propuesta.concepto = d.id;
    } else return error('Tipo de vínculo no admitido.');
    // Validar en una copia antes de tocar la selección persistida (incluye vínculos posteriores).
    const copia = structuredClone(E().st); copia.estudioOrdenes.guiaOT.ids = propuesta;
    const errores = G.problemas(copia); if (errores.length) return error(errores.join(' '));
    Object.assign(ids, propuesta); E().guardar(); return ok('Documento seleccionado vinculado por sus relaciones persistidas.');
  };
  G.resumen = () => {
    const z = G.expediente();
    if (!z) return 'Todavía no hay un expediente guiado activo. Prepararlo archiva el recorrido anterior, sin borrarlo.';
    const { ids, contrato, s, h, o, desp, rec, c } = z;
    return [`Cisternas del Oriente SA · Oruro → Potosí · Gasolina Especial`,
      `Contrato ${contrato?.numero || 'pendiente'} (#${ids.contrato || '—'}); historial inicial #${ids.inicial || '—'}; adenda #${ids.adenda || '—'}; tarifa #${ids.tarifa || '—'}.`,
      `SHR #${s?.id || '—'} / línea #${ids.lineaSolicitud || '—'}; HR ${h?.numero || '—'} (#${h?.id || '—'}); orden ${o?.numero || '—'} (#${o?.id || '—'}) / detalle #${ids.detalle || '—'}.`,
      `CRE despacho ${desp?.numero || '—'} (#${desp?.id || '—'}) → recepción ${rec?.numero || '—'} (#${rec?.id || '—'}).`,
      `Conciliación ${c?.numero || '—'} (#${c?.id || '—'}) · ${c?.estado || 'sin generar'}; pedido ${c?.sapEstudio?.pedido || '—'}; hoja SAP ${c?.sapEstudio?.hoja || '—'}.`,
      ...G.problemas()].join('\n');
  };
})(SILOG.tourConectado = {});

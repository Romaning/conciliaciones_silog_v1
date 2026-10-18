/* Integración de mapas y guías: contextos separados por origen, sin copiar conciliaciones. */
(function (R) {
  const E = SILOG.estado, A = SILOG.app, V = SILOG.vistas, F = SILOG.facturasEstudio, S = SILOG.sapEstudio, P = SILOG.pagosCierreEstudio, PU = SILOG.estudioPagosCierreUI, SU = SILOG.estudioSAPUI, CU = SILOG.estudioConciliacionesUI, FU = SILOG.estudioFacturasUI, M = SILOG.motor, esc = V.esc;
  R.contexto = () => {
    const v = A.vs.otm, m = E.st.estudioOrdenes;
    if (m) CU.modelo(); // Sin inicializar otro ejercicio; sincroniza selección tras reiniciar/importar.
    const lista = m ? F.preparar(m).lista : [];
    const elegido = lista.find(c => c.id === Number(CU.vista().conciliacionId));
    const origen = v.origen || (elegido ? 'conectado' : 'general');
    return { v, m, lista, origen, c: origen === 'conectado' ? elegido : E.st.conciliaciones.find(c => c.id === Number(v.concId)) };
  };
  R.estudiarGeneral = (n, rama = 'facturas') => {
    const c = E.st.conciliaciones.find(c => c.id === Number(n));
    if (!c) return { ok: false, msg: 'Selecciona una conciliación del escenario general; no se usará una del recorrido por coincidencia de ID.' };
    Object.assign(A.vs.otm, { origen: 'general', concId: c.id, ...(rama === 'sap' ? { abrirSAP: true } : rama === 'pago' ? { abrirPago: true } : { abrirFacturas: true }) });
    location.hash = 'otmapa'; A.render();
    return { ok: true, msg: `Estudio de ${rama === 'sap' ? 'SAP' : rama === 'pago' ? 'pago y cierre' : 'facturas'} del ejemplo nº ${c.numero}, ID general #${c.id}. No se copió a estudioOrdenes.` };
  };
  R.abrir = (vista, paso) => {
    const { origen, c, m } = R.contexto();
    const limites = { otconectadas: 7, multascreconectadas: 1, recargosconectados: 5, facturasconectadas: 6, sapconectado: 8, pagoscierre: 8, hojasruta: 8, ordenespasos: 7, crepasos: 5 };
    if (origen !== 'conectado' || !c || !(vista in limites) || !Number.isInteger(paso) || paso < 0 || paso >= limites[vista]) return { ok: false, msg: 'Elige una conciliación de Mis documentos y un paso válido. Los IDs de los escenarios no se trasladan a este recorrido.' };
    const ds = new Set(c.lineas.map(l => l.despachoId)), ordenes = m.ordenes.filter(o => o.detalles.some(d => m.enlaces.some(e => e.detalleId === d.id && ds.has(e.creId))));
    const solicitudes = [...new Set(c.lineas.flatMap(l => l.procedencia?.solicitudIds || []))];
    CU.vista().conciliacionId = c.id;
    if (vista === 'otconectadas') CU.vista().paso = paso;
    else if (vista === 'multascreconectadas') { SILOG.estudioMultasCREUI.modelo(); SILOG.estudioMultasCREUI.vista().creId = ds.size === 1 ? [...ds][0] : null; }
    else if (vista === 'recargosconectados') SILOG.estudioAdicionalesUI.seleccion().v.paso = paso;
    else if (vista === 'facturasconectadas') FU.seleccion().v.paso = paso;
    else if (vista === 'sapconectado') SU.seleccion().v.paso = paso;
    else if (vista === 'pagoscierre') PU.seleccion().v.paso = paso;
    else if (vista === 'hojasruta') Object.assign(SILOG.estudioHRUI.vista(), { paso, solicitudId: solicitudes.length === 1 ? solicitudes[0] : null });
    else if (vista === 'ordenespasos') Object.assign(SILOG.estudioOrdenesUI.vista(), { paso, ordenId: ordenes.length === 1 ? ordenes[0].id : null });
    else { Object.assign(SILOG.estudioOrdenesUI.vista(), { ordenId: ordenes.length === 1 ? ordenes[0].id : null }); Object.assign(SILOG.estudioCREUI.vista(), { paso, soloOrden: ordenes.length === 1, recepcionId: new Set(c.lineas.map(l => l.recepcionId)).size === 1 ? c.lineas[0].recepcionId : null }); }
    location.hash = vista; A.render(); return { ok: true, msg: `Continúas con la misma conciliación #${c.id}.` };
  };
  const boton = (vista, paso, t, c) => `<button type="button" class="btn chico" data-ri-vista="${vista}" data-ri-paso="${paso}" ${c ? '' : 'disabled'}>${esc(t)}</button>`;
  V.ramaPagoOT = (c, origen = 'general') => `<li class="ot-etapa carril-despues" id="ot-estudio-pago"><span class="ot-n" aria-hidden="true">↳</span><div class="ot-cuerpo"><h3>Pago y cierre dentro de este recorrido</h3><p>${c ? `Conciliación nº ${c.numero} · ID #${c.id} · ${esc(c.estado)}.` : 'Selecciona una conciliación del origen indicado.'} Liberado no acredita pago. Pagos Logística abre un reporte de costos; el retorno financiero no está localizado en el circuito V1 revisado.</p>${origen === 'conectado' ? `<p>Seguimiento: ${esc(P.resumen(E.st.estudioOrdenes, c).estado)}; cierre ${esc(P.resumen(E.st.estudioOrdenes, c).cierre)}. Pago real no acreditado por el laboratorio.</p><div class="od-acciones">${boton('pagoscierre', 1, 'Estudiar los importes del reporte', c)}${boton('pagoscierre', 3, 'Ensayar acuerdo/evidencia (PROPUESTA)', c)}${boton('pagoscierre', 5, 'Consultar cierre y reapertura propuestos', c)}</div>` : '<p class="nota nota-aviso">Este ejemplo general conserva sus propios documentos y no se marca Pagado. El laboratorio de abonos/reversiones se practica con Mis documentos, sin copiar esta conciliación por ID.</p>'}<details ${A.vs.otm.abrirPago ? 'open' : ''}><summary>Qué hay en V1, problemas y mejoras del pago/cierre</summary>${[0, 1, 2, 3, 4, 5, 6, 7].map(n => PU.evidencia(n)).join('')}</details></div></li>`;
  V.ramaSAPOT = (c, origen = 'general') => {
    const s = origen === 'conectado' ? c?.sapEstudio : c?.sap;
    return `<li class="ot-etapa carril-despues" id="ot-estudio-sap"><span class="ot-n" aria-hidden="true">↳</span><div class="ot-cuerpo"><h3>SAP dentro de este recorrido</h3><p>Preparación local → pedido → liberación → hoja de entrada de servicio → aceptación. Las anulaciones recorren la secuencia inversa. Nada de esto acredita pago.</p>${c ? `<p>${origen === 'conectado' ? 'Mis documentos' : 'Escenario general'} · conciliación nº ${c.numero}, ID #${c.id} · estado ${esc(c.estado)}. SAP ${esc(s?.estado || 'sin preparación')}; pedido ${esc(s?.pedido || '(vacío)')}; hoja ${esc(s?.hoja || '(vacía)')}.</p>` : '<p>Selecciona una conciliación para ver sus propias referencias.</p>'}
      ${origen === 'conectado' ? `<div class="od-acciones">${boton('sapconectado', 0, 'Continuar SAP con esta conciliación', c)}${boton('sapconectado', 6, 'Estudiar errores y recuperación propuesta', c)}${boton('sapconectado', 7, 'Ver sus intentos e historial', c)}</div>` : '<p class="nota nota-aviso">El motor de los escenarios generales es simplificado: conserva sus mismos documentos, pero no simula dependencias contables, mensajes ni fallos de persistencia. No se considera prueba de integración V1. El laboratorio operativo detallado está en Mis documentos; no se copian IDs entre orígenes.</p>'}
      <details ${A.vs.otm.abrirSAP ? 'open' : ''}><summary>Estudiar V1, sus problemas y mejoras SAP</summary>${[0, 1, 2, 3, 4, 5, 6, 7].map(n => SU.evidencia(n)).join('')}</details></div></li>`;
  };
  V.ramaFacturasOT = (c, origen = 'general') => {
    let r, p, f;
    if (c) {
      p = origen === 'conectado' ? F.foto(c) : { merma: Number(c.totales.mermas || 0), incumplimiento: Number(c.totales.multaTransporte || 0) };
      f = origen === 'conectado' ? c.facturacion : { mermas: c.facturaMermas || '', incumplimiento: c.facturaIncumplimiento || '' };
      r = F.validarCamposSAP(origen === 'conectado' ? c.medio : c.tipo === 'Barcaza' ? 2 : c.tipo === 'Vagon' ? 3 : 1, p, f);
    }
    return `<li class="ot-etapa carril-ot" id="ot-estudio-facturas"><span class="ot-n" aria-hidden="true">↳</span><div class="ot-cuerpo"><h3>Facturas dentro de este recorrido</h3><p>Referencias por merma/incumplimiento → requisito documental para SAP → consulta y marca de cobros. La factura del servicio es otro documento; su captura se estudia como propuesta.</p>
      ${c ? `<p><strong>${origen === 'general' ? 'Escenario general' : 'Mis documentos'} · nº ${c.numero} · ID #${c.id}</strong>. Merma ${M.fmtB(p.merma)}; incumplimiento ${M.fmtB(p.incumplimiento)}. Referencias: ${esc(f.mermas || '(vacía)')} / ${esc(f.incumplimiento || '(vacía)')}.</p><p class="nota ${r.ok ? 'nota-info' : 'nota-aviso'}">${esc(r.msg)}</p>` : '<p>Selecciona una conciliación del origen indicado para consultar sus propios datos.</p>'}
      ${origen === 'conectado' ? `<div class="od-acciones">${boton('facturasconectadas', 1, 'Registrar referencias de esta conciliación', c)}${boton('facturasconectadas', 3, 'Consultar cobros de su empresa', c)}${boton('facturasconectadas', 4, 'Ensayar documento del servicio (propuesta)', c)}</div>` : `<p class="nota nota-aviso">Los ejemplos generales guardan el número al salir del campo y su motor SAP es simplificado. Este panel consulta la regla SQL comprobada, pero no convierte esa simplificación en comportamiento de V1. No se copia esta conciliación al módulo conectado.</p>${c ? `<button class="btn chico" data-accion="otmTrabajar" data-id="${c.id}">Abrir las referencias de este ejemplo en Otros Transportes</button>` : ''}`}
      <details ${A.vs.otm.abrirFacturas ? 'open' : ''}><summary>Qué existe en V1, problemas y propuestas de facturación</summary>${[1, 2, 3, 4].map(n => FU.evidencia(n)).join('')}</details></div></li>`;
  };
  R.etapas = (m, c) => {
    const ids = campo => new Set(c?.lineas.map(l => l[campo]) || []), ds = ids('despachoId'), rs = ids('recepcionId');
    const solicitudes = new Set(c?.lineas.flatMap(l => l.procedencia?.solicitudIds || []) || []);
    const dets = new Set((m?.enlaces || []).filter(e => ds.has(e.creId)).map(e => e.detalleId));
    const texto = xs => xs.length ? xs.join(' · ') : 'Sin relación comprobada en la selección.';
    const paso = (titulo, datos, estado, vista, n, nota = '') => ({ titulo, datos, estado, vista, paso: n, nota });
    const validar = c && F.validarSAP(m, c.id);
    return [
      paso('Contrato, adenda y tarifa fotografiados', texto([...new Set(c?.lineas.map(l => `Contrato #${l.procedencia?.contratoId ?? '?'} · historial #${l.procedencia?.historialId ?? '?'} · tarifa #${l.procedencia?.tarifaId ?? 'sin dato'}`) || [])]), c ? 'Fotografía disponible' : 'Sin selección', 'otconectadas', 3, 'Contratos comparte el catálogo activo. Sus nuevas adendas no recalculan esta fotografía; un laboratorio antiguo independiente permanece identificado aparte.'),
      paso('Solicitud de hoja de ruta', texto((m?.solicitudes || []).filter(s => solicitudes.has(s.id)).map(s => `SHR #${s.id} · ${s.estado}`)), solicitudes.size ? 'Relaciones disponibles' : 'Sin SHR vinculada', 'hojasruta', 1, 'Puede existir una adición manual; no se inventa una solicitud para completar el mapa.'),
      paso('Hoja de ruta con estado propio', texto((m?.recorridoHR.hojas || []).filter(h => solicitudes.has(h.solicitudId)).map(h => `HR #${h.id} · ${h.numero} · ${h.estado}`)), solicitudes.size ? 'Consultar documentos' : 'Sin relación comprobada', 'hojasruta', 4, 'DESCARGADA es un descargo documental, no pago ni conciliación económica.'),
      paso('Orden y detalle de despacho', texto((m?.ordenes || []).filter(o => o.detalles.some(d => dets.has(d.id))).map(o => `Orden #${o.id} · ${o.estado}`)), dets.size ? 'Relaciones disponibles' : 'Sin selección', 'ordenespasos', 6),
      paso('CRE de despacho', texto((m?.cres || []).filter(d => ds.has(d.id)).map(d => `CRE #${d.id} / nº ${d.numero} · ${d.volumen} L · EstadoID ${d.estadoId}`)), ds.size ? 'Documentos disponibles' : 'Sin selección', 'crepasos', 0),
      paso('CRE de recepción y asociaciones', texto((m?.cres || []).filter(r => rs.has(r.id)).map(r => `CRE #${r.id} / nº ${r.numero} · ${r.volumen} L · EstadoID ${r.estadoId}`)), rs.size ? 'Documentos disponibles' : 'Sin selección', 'crepasos', 4),
      paso('Detalle sin conciliar y generación', c ? `Conciliación #${c.id} / nº ${c.numero} · ${c.lineas.length} pares fotografiados` : 'Genera la conciliación con las recepciones del recorrido.', c ? 'Cabecera existente' : 'Pendiente', 'otconectadas', c ? 3 : 2),
      paso('Nuevo convoy y revisión de incidentes', c ? `${c.recargos.filter(r => !['CG', 'CASO'].includes(r.tipo)).length} aplicación(es) MC; ${c.recargos.filter(r => r.tipo === 'CG').length} grupos CG; ${c.recargos.filter(r => r.tipo === 'CASO').length} casos; ${SILOG.multasCREEstudio?.resumen(m, c).registros.length || 0} multas por CRE. El número cero no significa que falta una multa.` : 'Solo aplicar si existió un incidente.', 'Opcional según el viaje', 'otconectadas', 3, 'Nuevo convoy: recepciones activas pendientes → misma cabecera → comparación → insertar pares y recalcular. El selector usa las fechas de pantalla, no repite el control inicial de contrato. No reconstruye fotos anteriores ni actualiza un pedido SAP. Las dos fuentes de multa se consolidan en Multa Transporte de cisterna. El desglose permite seguir registro, aporte SQL y neto guardado sin restar otra vez los subtotales. CG y casos tienen captura sobre esta misma conciliación; no entran al neto V1 procesado.'),
      paso('Ajustar y procesar cálculos', c ? `Neto guardado ${M.fmtB(c.totales.neto)} Bs; ${c.historial.filter(h => h.accion === 'Procesar y guardar cálculo').length} operación(es) manuales.` : 'Sin cálculo seleccionado.', c?.procesada ? 'Actualización manual registrada' : 'Consultar si corresponde', 'otconectadas', 5, 'V1 no exige pulsar Procesar otra vez como condición adicional de conformidad.'),
      paso('Conformidad del transportista', c?.estado || 'Sin conciliación seleccionada.', c?.estado === 'Aprobada Por Transportista' ? 'Conformidad registrada' : 'Consultar estado actual', 'otconectadas', 6, 'Un rechazo puede devolver a elaboración; no se marca completado solo porque existió una aceptación anterior.'),
      paso('Referencias de facturas y requisito documental', validar?.msg || 'Primero selecciona la conciliación.', validar ? validar.aplica ? validar.ok ? 'Cumple solo requisito documental' : 'Referencias pendientes' : 'Control no invocado para vagón' : 'Pendiente', 'facturasconectadas', 1),
      paso('Cobros pendientes de la empresa', c ? `FacturasPagadas=${c.facturacion.facturasPagadas === null ? 'NULL' : c.facturacion.facturasPagadas ? '1' : '0'}; ${F.pendientes(m, c.id).length} fila(s) en la consulta histórica.` : 'Sin selección.', 'Consulta, no prueba de pago del flete', 'facturasconectadas', 3, 'NULL y «sin filas» no acreditan que no exista deuda; se preservan los límites del SQL.'),
      paso('Documento del servicio de transporte', c?.facturacion.servicioPropuesto ? `${c.facturacion.servicioPropuesto.numero} · ${c.facturacion.servicioPropuesto.estado}` : 'No se ha ensayado una captura documental.', 'Propuesta separada de V1', 'facturasconectadas', 4, 'No completa Factura Recepcionada ni altera referencias históricas.'),
      paso('Preparación y pedido SAP', c?.sapEstudio ? `SAP #${c.sapEstudio.id} · pedido ${c.sapEstudio.pedido || '(sin crear)'} · ${c.sapEstudio.estado}` : 'La preparación se registra con la conformidad. Guardados anteriores pueden reconstruirla explícitamente.', c?.sapEstudio?.pedido ? 'Pedido de práctica disponible' : 'Pendiente de pedido', 'sapconectado', 1, 'Las posiciones vienen del flete fotografiado, no del neto conciliado.'),
      paso('Aprobación interna y liberación del pedido', c ? `Conciliación ${c.estado}; DocumentoLiberacion=${c.sapEstudio?.liberacion || '(vacío)'}` : 'Sin selección.', c?.sapEstudio?.liberacion === 'SI' ? 'Pedido liberado en la simulación' : 'Revisar ambas decisiones', 'sapconectado', 2, 'V1 no impone Pendiente de Liberacion en el manejador SAP; esa omisión se estudia como riesgo.'),
      paso('Hoja de entrada de servicio SAP', c?.sapEstudio?.hoja || 'Sin hoja registrada.', c?.sapEstudio?.hoja ? 'Hoja de práctica disponible' : 'Pendiente', 'sapconectado', 3, 'No es la hoja de ruta del conductor.'),
      paso('Aceptación, anulaciones y discrepancias', c ? `SAP ${c.sapEstudio?.estado || 'sin preparar'}; conciliación ${c.estado}${c.sapEstudio?.incidencia ? '; éxito remoto sin confirmación local' : ''}.` : 'Sin selección.', c?.sapEstudio?.estado === 'Aceptado' ? 'Aceptada solo en simulación' : 'Aceptación vigente no acreditada', 'sapconectado', 5, 'Anular aceptación deja Liberado en V1; se muestra la inconsistencia, no se corrige silenciosamente.'),
      paso('Pago y cierre externo', c?.pagoCierrePropuesto ? `${P.resumen(m, c).estado} · ${P.resumen(m, c).cierre}. Son datos financieros ficticios, no pagos reales.` : 'El reporte de Pagos Logística muestra costos, no transferencias. Estudia la evidencia externa y el cierre propuesto con los mismos documentos.', c?.pagoCierrePropuesto ? 'Seguimiento propuesto; pago real no acreditado' : 'Pendiente: pago no acreditado', 'pagoscierre', 0, 'FacturasPagadas es una marca de cobros por otros conceptos. El cierre propuesto y el mensual son procesos distintos.')
    ];
  };
  const mapaAnterior = V.otmapa;
  const selector = z => `<section class="tarjeta"><h2>Qué documentos quieres seguir de principio a fin</h2><label>Origen de los datos<select name="riOrigen"><option value="general" ${z.origen === 'general' ? 'selected' : ''}>Escenarios generales de estudio</option><option value="conectado" ${z.origen === 'conectado' ? 'selected' : ''}>Mis documentos: solicitudes → órdenes → CRE → conciliación → facturas → SAP → pago/cierre</option></select></label><p>Son conjuntos separados: un ID igual en ambos no representa el mismo documento. Cambiar de origen no copia ni reemplaza datos.</p><nav class="od-acciones" aria-label="Módulos del recorrido conectado"><a class="btn" href="#hojasruta">Solicitudes y hojas de ruta</a><a class="btn" href="#ordenespasos">Órdenes</a><a class="btn" href="#crepasos">Despacho y recepción</a><a class="btn" href="#otconectadas">Mis conciliaciones</a><a class="btn" href="#recargosconectados">CG y casos de Mis documentos</a><a class="btn" href="#facturasconectadas">Mis facturas conectadas</a><a class="btn" href="#sapconectado">Mi circuito SAP conectado</a><a class="btn" href="#pagoscierre">Pago/cierre: V1 y propuesta</a></nav></section>`;
  V.otmapa = () => {
    const z = R.contexto();
    if (z.origen === 'general') return selector(z) + mapaAnterior();
    const { c, m } = z;
    const etapas = R.etapas(m, c).map((e, i) => `<li class="ot-etapa carril-${i < 6 ? 'antes' : i < 13 ? 'ot' : 'despues'}"><span class="ot-n" aria-hidden="true">${i + 1}</span><div class="ot-cuerpo"><h3>${esc(e.titulo)}</h3><span class="tag">${esc(e.estado)}</span><p>${esc(e.datos)}</p>${e.nota ? `<p class="ayuda">${esc(e.nota)}</p>` : ''}${e.vista ? boton(e.vista, e.paso, 'Consultar este paso con mis documentos', c) : ''}</div></li>${i === 10 ? V.ramaFacturasOT(c, 'conectado') : ''}${i === 13 ? V.ramaSAPOT(c, 'conectado') : ''}${i === 17 ? V.ramaPagoOT(c, 'conectado') : ''}`).join('');
    return `<header class="vista-cab"><h1>Otros Transportes: de principio a fin</h1><p class="sub">Seguimiento de tus documentos conectados, con los mismos IDs.</p></header>${selector(z)}<section class="tarjeta od-estudio"><label>Sigue una conciliación de Mis documentos<select name="riConciliacion"><option value="">Selecciona una generada</option>${z.lista.map(cc => `<option value="${cc.id}" ${cc.id === c?.id ? 'selected' : ''}>${cc.numero} · ID #${cc.id} · ${esc(m.empresas.find(e => e.id === cc.transportistaId)?.nombre)} · ${esc(cc.estado)}</option>`).join('')}</select></label>${!m ? '<p class="nota nota-info">Todavía no iniciaste el recorrido de solicitudes, órdenes y CRE. Este mapa no lo rellena automáticamente con otro escenario.</p>' : ''}<ol class="ot-linea">${etapas}</ol><p class="nota nota-info">La disponibilidad de un documento no equivale a que alguien haya realizado su revisión. El mapa no marca etapas posteriores como hechas por su posición ni por el registro de una propuesta.</p></section>`;
  };
  document.addEventListener('change', ev => {
    const e = ev.target;
    if (e.name === 'riOrigen') { if (!['conectado', 'general'].includes(e.value)) return; A.vs.otm.origen = e.value; A.render(); }
    else if (e.name === 'riConciliacion') { const z = R.contexto(), n = Number(e.value); CU.vista().conciliacionId = z.lista.some(c => c.id === n) ? n : null; A.render(); }
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ri-vista], [data-ri-facturas], [data-ri-sap], [data-ri-pago], [data-ri-mapa]'); if (!b) return;
    if (b.dataset.riVista) { const r = R.abrir(b.dataset.riVista, Number(b.dataset.riPaso)); if (!r.ok) A.notificar(r); }
    else if (b.dataset.riFacturas) R.estudiarGeneral(Number(b.dataset.riFacturas));
    else if (b.dataset.riSap) R.estudiarGeneral(Number(b.dataset.riSap), 'sap');
    else if (b.dataset.riPago) R.estudiarGeneral(Number(b.dataset.riPago), 'pago');
    else { A.vs.otm.origen = 'conectado'; location.hash = 'otmapa'; A.render(); }
  });
  // Sólo O conserva el simulador general. T usa los módulos conectados y sus propios vínculos.
  const prepararMapaGeneral = p => { const anterior = p.preparar; p.preparar = () => { anterior?.(); A.vs.otm.origen = 'general'; }; };
  for (const pasos of [SILOG.TOUR_OT]) {
    pasos.filter(p => p.vista === 'otmapa').forEach(prepararMapaGeneral);
    const p = pasos.find(p => /Registra facturas|Crea el pedido en SAP/.test(p.titulo));
    if (p) { p.ramaFacturas = true; p.facturaConcId = () => SILOG.TUTORIAL_OT.conc(E.st)?.id; p.hacer += ' Usa «Estudiar facturas de este ejemplo» para consultar en el mapa las referencias de esta misma conciliación, la regla SQL, cobros y propuestas; luego vuelve con «Ir a la pantalla» de la guía.'; }
    for (const p of pasos.filter(p => p.vista === 'sap')) { p.ramaSAP = true; p.sapConcId = () => SILOG.TUTORIAL_OT.conc(E.st)?.id; p.hacer += ' En «Estudiar SAP de este ejemplo» consulta las BAPI, los dos estados, riesgos y anulaciones. El motor de esta guía es simplificado; no certifica una integración real.'; }
    for (const p of pasos.filter(p => p.vista === 'sap' || p.vista === 'mejoras')) { p.ramaPago = true; p.pagoConcId = () => SILOG.TUTORIAL_OT.conc(E.st)?.id; p.hacer += ' Usa «Estudiar pago y cierre de este ejemplo»: Liberado no es Pagado, el reporte muestra costos y las evidencias/cierre mejorados se identifican como propuesta.'; }
  }
  for (const id of ['O']) { const e = SILOG.escenarioPorId(id); e.guion = e.tour.map(p => ({ vista: p.vista, paso: p.hacer, esperado: p.veras })); }
  for (const nombre of ['otconectadas', 'facturasconectadas', 'sapconectado', 'pagoscierre']) {
    const anterior = V[nombre]; V[nombre] = () => `<section class="tarjeta"><button class="btn" data-ri-mapa="conectado">Ver estos documentos en el recorrido de principio a fin</button></section>` + anterior();
  }
  const estudioSAP = V.sapconectado;
  V.sapconectado = () => estudioSAP() + '<section class="tarjeta"><h2>Continuar con pago y cierre de esta conciliación</h2><p>La aceptación de hoja no acredita transferencia. Estudia el reporte V1 y, aparte, una propuesta de evidencia externa con abonos, reversión y cierre.</p><a class="btn primario" href="#pagoscierre">Pago y cierre con la misma selección</a></section>';
  const sapGeneral = V.sap;
  V.sap = () => '<section class="tarjeta"><h2>SAP del escenario general: simulación simplificada</h2><p>Este circuito conserva las referencias del ejemplo general. Para los documentos creados desde contratos, solicitudes y CRE usa el estudio conectado: incluye dependencias contables, respuestas, fallos locales y anulaciones.</p><a class="btn" href="#sapconectado">SAP de Mis documentos, sin copiar este escenario</a></section>' + sapGeneral();
})(SILOG.recorridoIntegradoOT = {});

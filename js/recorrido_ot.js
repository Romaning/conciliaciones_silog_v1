/*
 * "Conciliación Otros Transportes" de principio a fin.
 *
 * - SILOG.OT_ETAPAS: las 17 etapas que recorre una conciliación de cisterna, desde la tarifa hasta el
 *   pago. Indica cuáles ocurren FUERA y cuáles DENTRO de la pantalla Otros Transportes, quién las hace,
 *   qué entra, qué sale y en qué tablas queda. Lo usan la vista "Otros Transportes: de principio a fin"
 *   y el asistente "¿Qué hago ahora?".
 * - SILOG.otEtapaActual(st, conc): número de la etapa pendiente de una conciliación.
 * - Escenario "O" con datos realistas de una quincena y su recorrido guiado (22 pasos).
 */
window.SILOG = window.SILOG || {};

(function () {
  const M = SILOG.motor;
  const E = () => SILOG.estado;
  const A = () => SILOG.app;
  const B = v => M.fmtB(v);
  const estadoEn = (c, e) => !!c && M.ESTADOS.indexOf(c.estado) >= M.ESTADOS.indexOf(e);

  // ───────────────────────── etapas ─────────────────────────
  // carril: 'antes' (otras pantallas, nace la conciliación) · 'ot' (pantalla Otros Transportes) · 'despues' (SAP y pago).
  SILOG.OT_ETAPAS = [
    { n: 1, carril: 'antes', titulo: 'Contrato y tarifa por ruta', vista: 'tarifario', v1: 'ContratoDetalle.aspx', quien: 'Contratos y Logística',
      entra: 'Contrato firmado con el transportista y su versión liberada.',
      sale: 'Tarifa en Bs/m³ y admisible % por origen, destino y producto (PRINCIPAL y ALTERNAS).',
      tablas: 'MC_Contrato, MC_ContratoHistorial, MC_TarifaOT',
      para: 'Sin tarifa vigente el flete se calcula en 0.',
      dato: (st, c) => { const ids = [...new Set(c.lineas.map(l => l.tarifaId).filter(Boolean))]; return ids.map(id => { const t = M.porId(st.tarifas, id); return t ? `#${t.id} ${t.prioridad} ${M.fmtN(t.tarifa)} Bs/m³ (${M.nombreLoc(st, t.origenId)} → ${M.nombreLoc(st, t.destinoId)}, ${M.porId(st.productos, t.productoId).codigo})` : ''; }).join(' · '); } },
    { n: 2, carril: 'antes', titulo: 'Orden de despacho', vista: 'ordenes', v1: 'DetalleOrdenDespacho.aspx', quien: 'Programación de la terminal',
      entra: 'Necesidad de producto de una planta.',
      sale: 'Viajes autorizados: cisterna, conductor, destino, producto, volumen y hoja de ruta.',
      tablas: 'OrdenDeDespacho, OrdenDespachoDetalle, SolicitudHRDetalle',
      para: 'Sin orden no se puede cargar.',
      dato: (st, c) => { const ids = new Set(c.lineas.map(l => l.despachoId)); const o = st.ordenes.filter(x => x.detalles.some(d => ids.has(d.creDespachoId))); return `${o.length} orden(es): ${o.map(x => `${M.nombreLoc(st, x.terminalId)}-${x.nro} del ${M.fmtF(x.fecha)}`).join(', ')}`; } },
    { n: 3, carril: 'antes', titulo: 'Carga: CRE de despacho', vista: 'cre', v1: 'DetalleOrdenDespacho.aspx (Crear CRE) o CREPrevioOT.aspx', quien: 'Terminal de carga',
      entra: 'Detalle de orden aprobado y la cisterna en la terminal.',
      sale: 'Volumen cargado certificado: el "lado A" de la comparación.',
      tablas: 'CRE (TipoCRE 3), Lote, CREOrdenDespacho',
      para: 'Es lo que el transportista recibió para llevar.',
      dato: (st, c) => { const ids = [...new Set(c.lineas.map(l => l.despachoId))]; return `${ids.length} despachos, ${M.fmtN(ids.reduce((s, id) => s + M.porId(st.cres, id).volumen, 0))} L cargados`; } },
    { n: 4, carril: 'antes', titulo: 'Llegada: CRE de recepción', vista: 'cre', v1: 'CRECisterna.aspx', quien: 'Planta de destino',
      entra: 'La cisterna descargando en el tanque de la planta.',
      sale: 'Volumen recibido, asociado a su despacho: el "lado B".',
      tablas: 'CRE (TipoCRE 8), CREAsociacion',
      para: 'Sin recepción no hay nada que conciliar.',
      dato: (st, c) => { const ids = [...new Set(c.lineas.map(l => l.recepcionId))]; return `${ids.length} recepciones, ${M.fmtN(ids.reduce((s, id) => s + M.porId(st.cres, id).volumen, 0))} L recibidos`; } },
    { n: 5, carril: 'antes', opcional: true, titulo: 'Incidentes del viaje (opcional)', vista: 'multas', v1: 'Multas por CRE (CRE de despacho)', quien: 'Logística',
      entra: 'Retrasos, conductor no certificado, filtraciones…',
      sale: 'Multas por CRE en dólares, convertidas a Bs.',
      tablas: 'Multa, MultaPorIncumplimiento',
      para: 'En V1 se muestran como informativas: no entran al neto (D13).',
      dato: (st, c) => { const ids = new Set(c.lineas.map(l => l.despachoId)); const m = st.multasCRE.filter(x => ids.has(x.creId)); return m.length ? `${m.length} multa(s) por CRE: ${B(m.reduce((s, x) => s + x.total, 0))} Bs (informativo)` : 'Sin multas por CRE'; } },
    { n: 6, carril: 'antes', titulo: 'Generar la conciliación', vista: 'sinconciliar', v1: 'DetalleSinConciliar.aspx', quien: 'Analista de logística',
      entra: 'Recepciones sin conciliar de la quincena, agrupadas por transportista y área.',
      sale: 'Conciliación N° en "En Elaboracion", con una línea por despacho y recepción ya calculada.',
      tablas: 'ConciliacionCisterna, ConciliacionCisternaDetalle',
      para: 'Otros Transportes no crea conciliaciones: recibe las que nacen aquí.',
      dato: (st, c) => `N° ${c.numero} · ${c.lineas.length} líneas · generada el ${M.fmtF(c.fecha)}` },
    { n: 7, carril: 'ot', inicioOT: true, titulo: 'Buscar y marcar la conciliación', vista: 'ot', v1: 'ConciliacionOtrosTransportes.aspx (cabecera)', quien: 'Analista LOG',
      entra: 'Tipo de transporte, área, mes, año y quincena; permisos del usuario.',
      sale: 'Lista de conciliaciones del periodo con sus totales y botones según estado y permisos.',
      tablas: "CARGAR_DATOS_CONCILIACION_OT 'CABECERA', CONFIGURACION_CONCILIACIONES",
      para: 'Ubicar la conciliación que hay que trabajar.' },
    { n: 8, carril: 'ot', titulo: 'Revisar fila por recepción', vista: 'ot', v1: "CARGAR_DATOS_CONCILIACION_OT 'DETALLE'", quien: 'Analista LOG',
      entra: 'Las líneas de la conciliación.',
      sale: 'Una fila por recepción: despacho, recepción, balance, admisible, crédito/débito, tarifa y flete.',
      tablas: 'ConciliacionCisternaDetalle (agrupada por recepción)',
      para: 'Detectar qué viaje tiene un problema.' },
    { n: 9, carril: 'ot', titulo: 'Corregir lo que corresponda', vista: 'ot', v1: 'Columnas editables y botones de la grilla', quien: 'Analista LOG (según permisos)',
      entra: 'Evidencia del viaje: desvío, medidor descalibrado, falta de producto, reclamo, recepción tardía.',
      sale: 'Tarifa P/A1/0 o especial, merma liberada, capacidad liberada, recepción excluida o agregada.',
      tablas: 'ConciliacionCisternaDetalle (LiberarMerma, LiberarCapacidad, Tarifa, TarifaEspecialBs)',
      para: 'Que el monto refleje lo que realmente pasó.' },
    { n: 10, carril: 'ot', titulo: 'Procesar', vista: 'ot', v1: 'btnProcesar_Click → PROCESAR_CONCILIACION', quien: 'Analista LOG (PuedeProcesar)',
      entra: 'Los cambios de la grilla.',
      sale: 'Fletes y totales recalculados y guardados: neto conciliado.',
      tablas: 'ConciliacionCisternaDetalle, ConciliacionCisterna (NetoConciliado)',
      para: 'Hasta procesar, los cambios no existen.',
      dato: (st, c) => `Neto conciliado ${B(M.recalcular(st, c, 'V1').cab.neto)} ${c.moneda}` },
    { n: 11, carril: 'ot', titulo: 'Enviar al transportista (✔)', vista: 'ot', v1: 'btnAprobar (En Elaboracion)', quien: 'Analista LOG (PuedeSolicitarAprobacion)',
      entra: 'Conciliación procesada.',
      sale: 'Estado "En Aprobacion de Transportista": ya no se edita.',
      tablas: 'ConciliacionCisterna.Estado',
      para: 'El transportista debe aceptar el monto antes de pedir el pago.' },
    { n: 12, carril: 'ot', titulo: 'Aceptación del transportista (✔)', vista: 'ot', v1: 'btnAprobar (En Aprobacion de Transportista)', quien: 'En V1: un usuario de logística (D22)',
      entra: 'Conformidad del transportista (fuera del sistema).',
      sale: 'Estado "Aprobada Por Transportista", registro SAP "Sin Registrar en SAP", correo para crear el pedido y alertas de factura.',
      tablas: 'SAP_ConciliacionMaster, SAP_ConciliacionDetail, ConciliacionArea, Alerta',
      para: 'Deja todo listo para SAP.',
      dato: (st, c) => c.sap ? `Registro SAP ${c.sap.texto}` : '' },
    { n: 13, carril: 'ot', titulo: 'Registrar facturas', vista: 'ot', v1: 'Columnas Factura mermas / incumplimiento + Procesar', quien: 'Analista LOG',
      entra: 'Factura que emite el transportista por las mermas cobradas (y por incumplimiento, si hay multa de transporte).',
      sale: 'Números de factura en la conciliación.',
      tablas: 'ConciliacionCisterna (FacturaMermas, FacturaIncumplimiento)',
      para: 'Cobrar al transportista lo descontado. El prototipo no lo exige para crear el pedido.',
      dato: (st, c) => [c.facturaMermas && 'Mermas: ' + c.facturaMermas, c.facturaIncumplimiento && 'Incumplimiento: ' + c.facturaIncumplimiento].filter(Boolean).join(' · ') },
    { n: 14, carril: 'despues', vuelve: true, titulo: 'SAP: crear el pedido', vista: 'sap', v1: 'Sincronizaciones_To_SAP.aspx', quien: 'Usuario con rol SAP "Solicitar Aprobacion"',
      entra: 'Registro SAP de la conciliación.',
      sale: 'Pedido de compra por el flete de cada producto; la conciliación pasa a "Pendiente de Aprobacion".',
      tablas: 'SAP_ConciliacionMaster (pedido), SAP vía ERPConnect',
      para: 'Sin pedido de compra no se puede pagar.',
      dato: (st, c) => c.sap && c.sap.pedido ? 'Pedido ' + c.sap.pedido : '' },
    { n: 15, carril: 'ot', finOT: true, titulo: 'Solicitar la liberación (✔)', vista: 'ot', v1: 'btnAprobar (Pendiente de Aprobacion)', quien: 'Jefe LOG o Gerente (PuedeSolicitarLiberacion)',
      entra: 'Pedido creado y facturas del transportista al día.',
      sale: 'Estado "Pendiente de Liberacion". Se bloquea si el transportista tiene facturas impagas mayores al umbral.',
      tablas: 'ConciliacionCisterna.Estado, FacturasPendienteAPagar',
      para: 'Último control de logística antes de pagar.' },
    { n: 16, carril: 'despues', titulo: 'SAP: liberar pedido, hoja de entrada y aceptación', vista: 'sap', v1: 'Sincronizaciones_To_SAP.aspx', quien: 'Compras y responsables SAP',
      entra: 'Pedido creado.',
      sale: 'Hoja de entrada de servicio aceptada; la conciliación queda "Liberado".',
      tablas: 'SAP_ConciliacionMaster (hoja, estado)',
      para: 'La hoja de entrada confirma que el servicio de transporte se prestó.',
      dato: (st, c) => c.sap && c.sap.hoja ? `Hoja ${c.sap.hoja} · SAP ${c.sap.estado}` : '' },
    { n: 17, carril: 'despues', titulo: 'Pago y cierre (fuera de SILOG)', vista: 'otmapa', v1: 'SAP / Finanzas [I]', quien: 'Finanzas',
      entra: 'Hoja aceptada y factura de flete del transportista.',
      sale: 'Flete pagado; mermas cobradas; ejecución del contrato marco actualizada.',
      tablas: 'Fuera de SILOG [I]; MC_ObtenerEjecucionContratoMarco suma el flete conciliado',
      para: 'Cierra el ciclo de la quincena.' }
  ];

  // Etapa pendiente de una conciliación (sin conciliación: hay que generarla, etapa 6).
  SILOG.otEtapaActual = (st, c) => {
    if (!c) return 6;
    const k = M.recalcular(st, c, 'V1').cab;
    switch (c.estado) {
      case 'En Elaboracion': return c.procesada ? 11 : 8;
      case 'En Aprobacion de Transportista': return 12;
      case 'Aprobada Por Transportista': return (k.mermas && !c.facturaMermas) || (k.multaTransporte && !c.facturaIncumplimiento) ? 13 : 14;
      case 'Pendiente de Aprobacion': return 15;
      case 'Pendiente de Liberacion': return 16;
      default: return 17;
    }
  };

  // ───────────────────────── escenario O ─────────────────────────
  // Objetos del recorrido: la conciliación de Cóndor Andino de la 2da quincena y sus recepciones.
  const O = {
    conc: st => st.conciliaciones.find(c => c.transportistaId === 1 && c.anio === 2026 && c.mes === 9 && c.quincena === 2) || null,
    c990: st => st.conciliaciones.find(c => c.numero === 990),
    rec: (st, vol) => st.cres.find(c => c.tipo === 8 && c.volumen === vol && M.transportistaDeCRE(st, c) === 1),
    despTarde: st => st.cres.find(c => c.tipo === 3 && c.cisternaId === 8 && c.fecha === '2026-09-29'),
    recTarde: st => { const d = O.despTarde(st); return d ? M.recepcionesDe(st, d.id)[0] || null : null; },
    lineas: (st, vol) => { const c = O.conc(st), r = O.rec(st, vol); return c && r ? c.lineas.filter(l => l.recepcionId === r.id) : []; }
  };
  SILOG.TUTORIAL_OT = O;
  const abrirOT = st => {
    const c = O.conc(st);
    if (c) Object.assign(A().vs.ot, { tipo: 'Cisterna', area: 2, mes: 9, anio: 2026, quincena: 2, transportistaId: 0, fi: '', ff: '', concId: c.id, edits: {}, convoy: false, convoySel: [] });
    return c;
  };
  const otProcesar = (vol, edit) => { const c = abrirOT(E().st); return E().otProcesar(c.id, { [O.rec(E().st, vol).id]: edit }); };
  const selFila = (campo, vol) => st => { const r = O.rec(st, vol); return r ? `[data-ot-edit="${campo}"][data-ot-rec="${r.id}"]` : '[data-ot-sel]'; };
  const selAprobar = st => { const c = O.conc(st); return c ? `[data-accion="otAprobar"][data-id="${c.id}"]` : '[data-accion="otAprobar"]'; };

  SILOG.TOUR_OT = [
    { vista: 'otmapa', titulo: 'Mira el camino completo', sel: '.ot-linea',
      hacer: 'Recorre las 17 etapas de arriba abajo. Fíjate en las marcas "AQUÍ EMPIEZA" (antes de la etapa 7) y "AQUÍ TERMINA" (después de la 15): solo esas etapas se hacen en la pantalla Otros Transportes.',
      porque: 'Otros Transportes no crea conciliaciones ni paga: recibe conciliaciones ya generadas, permite corregirlas y aprobarlas, y las entrega a SAP.',
      veras: 'Etapas 1 a 5 hechas (ya existen tarifas, órdenes, despachos y recepciones) y la 6, "Generar la conciliación", marcada como "Estás aquí".' },
    { vista: 'ordenes', titulo: 'De dónde salen los viajes', sel: '.tabla',
      hacer: 'Abre la orden de la terminal RCBA del 17/09/2026 y mira sus detalles: cada fila es un viaje autorizado (cisterna, conductor, destino, volumen) con su CRE de despacho.',
      porque: 'Cada fila que verás en Otros Transportes nace de un detalle de orden.',
      veras: 'Órdenes LIBERADO de Transportes Cóndor Andino, Logística Altiplano y Fletes Chaco; la del 17/09 tiene dos cisternas de 30.000 L a Senkata.' },
    { vista: 'cre', titulo: 'Cargas y llegadas', sel: '.tabla',
      hacer: 'Mira los despachos (CB-…) y sus recepciones (SK-, OR-, PT-…). El despacho a Oruro del 29/09/2026 con la placa 5678-DEF sigue "En tránsito".',
      porque: 'La conciliación compara lo cargado con lo recibido. El viaje en tránsito ya llegó, pero la planta aún no registró su recepción: no entrará en la conciliación hasta que se registre.',
      veras: 'Despachos con su recepción y uno "En tránsito". La cisterna 4567-CDE cargó dos compartimientos (2 × 7.500 L) y descargó todo junto (14.980 L).' },
    { vista: 'sinconciliar', titulo: 'Genera la conciliación (aquí nace)', sel: '[data-accion="generar"]',
      hacer: 'Con el área RCBA, marca la casilla de "Transportes Cóndor Andino SRL" (2da quincena de septiembre 2026) y pulsa "Generar".',
      porque: 'La conciliación nace en esta pantalla, no en Otros Transportes. Aquí se calcula cada línea: admisible, balance, crédito/débito y flete.',
      veras: 'Mensaje "CONCILIACIONES GENERADAS CORRECTAMENTE: N° 1001". Tiene 8 recepciones y 9 líneas.',
      hecho: st => !!O.conc(st),
      auto: () => {
        const st = E().st;
        const g = M.recepcionesSinConciliar(st, 2, 'V1').grupos.find(x => x.transportistaId === 1 && x.anio === 2026 && x.mes === 9 && x.quincena === 2);
        const r = E().generar(2, [{ clave: g.clave, marcado: true, moneda: g.contrato.moneda, recepciones: g.recepciones.map(y => y.recepcion.id) }]);
        if (r.ok) A().vs.conc.concId = r.ids[0];
        return r;
      } },
    { vista: 'ot', titulo: 'Ubica la quincena en Otros Transportes', sel: 'table.seleccionable',
      hacer: 'Deja los filtros Cisterna, RCBA, Septiembre 2026, 2da quincena. Mira la lista: hay una conciliación por transportista y cada una está en un estado distinto.',
      porque: 'Los botones de cada fila dependen del estado y de tus permisos: ✔ aparece en "En Elaboracion" y "En Aprobacion de Transportista"; en "Aprobada Por Transportista" no hay ✔ porque lo siguiente se hace en SAP.',
      veras: 'N° 996 Fletes Chaco (Aprobada Por Transportista, sin botones), N° 997 Logística Altiplano (En Aprobacion de Transportista, ✔) y N° 1001 Transportes Cóndor Andino (En Elaboracion, ✔).' },
    { vista: 'ot', titulo: 'Marca la N° 1001', sel: st => { const c = O.conc(st); return c ? `[data-ot-sel="${c.id}"]` : '[data-ot-sel]'; },
      hacer: 'Marca la casilla de la fila N° 1001.',
      porque: 'Al marcarla se abre su detalle: una fila por recepción.',
      veras: '8 filas (1 de diésel, 7 de gasolina). La de 14.980 L agrupa dos despachos.',
      hecho: st => { const c = O.conc(st); return !!c && A().vs.ot.concId === c.id; },
      auto: () => { abrirOT(E().st); return { ok: true, msg: 'Conciliación N° 1001 marcada.' }; } },
    { vista: 'ot', titulo: '¿De dónde viene cada dato?', sel: st => { const r = O.rec(st, 29800); return r ? `[data-accion="otOrigen"][data-rec="${r.id}"]` : '[data-accion="otOrigen"]'; },
      hacer: 'Pulsa 🔎 en la fila de 29.800 L (gasolina a Senkata del 18/09).',
      porque: 'Cada número de la fila tiene un origen: la orden, la cisterna, los CRE, el contrato, la tarifa y el precio de multa. El cálculo se explica paso a paso.',
      veras: 'La cadena orden → cisterna → CRE de despacho (30.000 L) → CRE de recepción (29.800 L) → tarifa #101 PRINCIPAL 210 Bs/m³ → admisible 90 L → C/D −110 L × 4,79 = −526,90 Bs → flete 6.258,00 Bs.',
      hecho: st => { const r = O.rec(st, 29800); return !!r && A().vs.ot.origen === r.id; },
      auto: () => { abrirOT(E().st); A().vs.ot.origen = O.rec(E().st, 29800).id; return { ok: true, msg: 'Origen de la recepción de 29.800 L abierto.' }; } },
    { vista: 'ot', titulo: 'Hubo un desvío: usa la tarifa alterna', sel: selFila('tarifa', 29910),
      hacer: 'En la fila de 29.910 L (23/09), columna Tarifa, elige "0.22500 A1" y pulsa Procesar.',
      porque: 'Un bloqueo obligó a tomar la ruta alterna autorizada. El contrato tiene para esa ruta una tarifa ALTERNA de 225 Bs/m³.',
      veras: '"CONCILIACIÓN PROCESADA CORRECTAMENTE." El flete de la fila pasa de 6.281,10 a 6.729,75 Bs.',
      hecho: st => O.lineas(st, 29910).length > 0 && O.lineas(st, 29910).every(l => l.tarifa === 0.225),
      auto: () => otProcesar(29910, { tarifa: 0.225, etiqueta: 'A1' }) },
    { vista: 'ot', titulo: 'Medidor descalibrado: libera la merma', sel: selFila('liberarMerma', 24790),
      hacer: 'En la fila de diésel de 24.790 L (Oruro), marca "Lib. merma" y pulsa Procesar.',
      porque: 'Faltaron 210 L, pero un informe técnico confirmó que el medidor de la planta Oruro estaba descalibrado: no es culpa del transportista.',
      veras: 'El C/D de esa fila (−147 L × 4,79 = −704,13 Bs) aparece tachado y deja de descontarse: las mermas bajan de −2.356,68 a −1.652,55 Bs.',
      hecho: st => { const c = O.conc(st), ls = O.lineas(st, 24790); return ls.length > 0 && ls.every(l => (c.ajustes[l.key] || {}).liberarMerma); },
      auto: () => otProcesar(24790, { liberarMerma: true }) },
    { vista: 'ot', titulo: 'Faltó producto: libera la capacidad', sel: selFila('liberarCapacidad', 28470),
      hacer: 'En la fila de 28.470 L (Potosí), escribe 30000 en "Lib. capacidad L" y pulsa Procesar.',
      porque: 'La terminal solo pudo cargar 28.500 L en una cisterna de 30.000 L por falta de producto. El transportista puso el camión completo: se le paga como lleno, descontando lo que perdió en el viaje.',
      veras: 'Base = 30.000 − 28.500 + 28.470 = 29.970 L; flete 29.970 × 0,23 = 6.893,10 Bs (antes 6.548,10).',
      hecho: st => { const c = O.conc(st), ls = O.lineas(st, 28470); return ls.length > 0 && (c.ajustes[ls[ls.length - 1].key] || {}).liberarCapacidad === 30000; },
      auto: () => otProcesar(28470, { liberarCapacidad: 30000 }) },
    { vista: 'ot', titulo: 'Precinto roto: excluye la recepción', sel: st => { const r = O.rec(st, 29640); return r ? `[data-accion="otExcluir"][data-rec="${r.id}"]` : '[data-accion="otExcluir"]'; },
      hacer: 'Pulsa 🗑 en la fila de 29.640 L (26/09).',
      porque: 'La cisterna llegó con el precinto roto y seguridad investiga. Se saca de esta conciliación para no pagarla todavía; vuelve a quedar "sin conciliar".',
      veras: '"CRE EXCLUIDO CORRECTAMENTE." Quedan 7 filas. Sin sus −270 L, las mermas de gasolina bajan a −359,25 Bs (−110 L de la recepción de 29.800 L compensados en parte por la demasía de +35 L).',
      hecho: st => !!O.conc(st) && !!O.rec(st, 29640) && O.lineas(st, 29640).length === 0,
      auto: () => { const c = abrirOT(E().st); return E().otExcluir(c.id, O.rec(E().st, 29640).id); } },
    { vista: 'cre', titulo: 'Llegó tarde: registra la recepción', sel: '[data-accion="registrarRecepcion"]',
      hacer: 'Marca el despacho "En tránsito" a Oruro del 29/09/2026 (placa 5678-DEF), pon la fecha 30/09/2026 y el volumen 29960, y pulsa "Registrar recepción".',
      porque: 'La planta Oruro registró la llegada con retraso, cuando la conciliación ya estaba generada.',
      veras: 'Una recepción OR-… de 29.960 L asociada al despacho.',
      hecho: st => !!O.recTarde(st),
      auto: () => E().registrarRecepcion([O.despTarde(E().st).id], '29960', '2026-09-30') },
    { vista: 'ot', titulo: 'Agrégala con "Nuevo convoy"', sel: '[data-accion="otConvoy"]',
      hacer: 'Marca la N° 1001 (si no lo está), pulsa "Nuevo convoy", marca solo la recepción de 29.960 L y pulsa "Aceptar". También aparecerá la de 29.640 L que excluiste: déjala sin marcar.',
      porque: '"Nuevo convoy" agrega a una conciliación existente las recepciones del mismo transportista y área que quedaron fuera. Ojo: V1 no vuelve a validar contrato, moneda ni presupuesto (D30).',
      veras: '"Nuevo convoy agregado". Vuelven a ser 8 filas; la nueva tiene flete 29.960 × 0,15 = 4.494,00 Bs.',
      hecho: st => { const c = O.conc(st), r = O.recTarde(st); return !!c && !!r && c.lineas.some(l => l.recepcionId === r.id); },
      auto: () => { const c = abrirOT(E().st); return E().otAgregar(c.id, [O.recTarde(E().st).id], '2026-09-16', '2026-09-30'); } },
    { vista: 'ot', titulo: 'Envíala al transportista (✔)', sel: selAprobar,
      hacer: 'Pulsa ✔ en la fila de la N° 1001.',
      porque: 'Con las correcciones hechas, se pide la conformidad del transportista. Desde aquí ya no se puede editar.',
      veras: 'Estado "En Aprobacion de Transportista". Las columnas de edición quedan deshabilitadas.',
      hecho: st => estadoEn(O.conc(st), 'En Aprobacion de Transportista'),
      auto: () => E().otAprobar(abrirOT(E().st).id) },
    { vista: 'ot', titulo: 'El transportista acepta (✔ otra vez)', sel: selAprobar,
      hacer: 'Pulsa otra vez ✔ en la N° 1001.',
      porque: 'En V1 esta aceptación la registra un usuario de logística en nombre del transportista (defecto D22). Si el transportista no estuviera de acuerdo, un Jefe LOG pulsaría ✖ Rechazar y la conciliación volvería a "En Elaboracion".',
      veras: 'Estado "Aprobada Por Transportista", registro SAP "CT 1001 9/26" y avisos de correo y de factura por mermas.',
      hecho: st => estadoEn(O.conc(st), 'Aprobada Por Transportista'),
      auto: () => E().otAprobar(abrirOT(E().st).id) },
    { vista: 'ot', titulo: 'Registra la factura por mermas', sel: st => { const c = O.conc(st); return c ? `[data-ot-factura="facturaMermas"][data-id="${c.id}"]` : '[data-ot-factura]'; },
      hacer: 'En la fila de la N° 1001, escribe F-1001-M en "Factura mermas" y sal del campo con Tab.',
      porque: 'Las mermas descontadas se cobran al transportista con una factura. Su número queda en la conciliación.',
      veras: '"Número de factura registrado."',
      hecho: st => !!(O.conc(st) || {}).facturaMermas,
      auto: () => E().facturas(abrirOT(E().st).id, 'facturaMermas', 'F-1001-M') },
    { vista: 'sap', titulo: 'Sale a SAP: crea el pedido', sel: '[data-a="Crear pedido"]',
      hacer: 'En la lista, pulsa la fila N° 1001 y luego "Crear pedido".',
      porque: 'Compras necesita un pedido de compra en SAP por el flete de cada producto para poder pagar.',
      veras: 'Pedido 4500001001; SAP "Pendiente de Liberación"; la conciliación pasa a "Pendiente de Aprobacion".',
      hecho: st => { const c = O.conc(st); return !!c && !!c.sap && c.sap.estado !== 'Sin Registrar en SAP'; },
      auto: () => { const c = O.conc(E().st); A().vs.conc.concId = c.id; return E().sapAccion(c.id, 'Crear pedido'); } },
    { vista: 'ot', titulo: 'Vuelve: solicita la liberación como Jefe LOG', sel: '#rol',
      hacer: 'Cambia "Usuario simulado" a Jefe LOG (el Analista no tiene PuedeSolicitarLiberacion) y pulsa ✔ en la N° 1001.',
      porque: 'Antes de liberar, V1 revisa si el transportista debe facturas por encima del umbral.',
      veras: 'Error: "Se Canceló la Solicitud, Existen Conciliaciones Pendiente de su Pago de Factura Mayores a 1.000: […Conc. 990 Septiembre-2026]". La N° 990 de la 1ra quincena tiene la factura por mermas F-0990 (1.963,90 Bs) sin pagar.',
      hecho: () => E().ui.rol === 'Jefe LOG',
      auto: () => { E().setRol('Jefe LOG'); return E().otAprobar(abrirOT(E().st).id); } },
    { vista: 'sap', titulo: 'El transportista pagó: marca la factura', sel: '[data-accion="facturasPagadas"]',
      hacer: 'En la lista, pulsa la fila N° 990 y luego "Marcar facturas pagadas".',
      porque: 'En V1 la marca de pago viene de la cobranza; aquí se simula con un botón.',
      veras: '"Facturas marcadas como pagadas." La N° 990 muestra "Al día".',
      hecho: st => !!O.c990(st) && O.c990(st).facturasPagadas === true,
      auto: () => { const c = O.c990(E().st); A().vs.conc.concId = c.id; return E().marcarFacturasPagadas(c.id); } },
    { vista: 'ot', titulo: 'Solicita la liberación otra vez (✔)', sel: selAprobar,
      hacer: 'Con el rol Jefe LOG, pulsa ✔ en la N° 1001.',
      porque: 'Sin facturas pendientes, la solicitud pasa.',
      veras: 'Estado "Pendiente de Liberacion". Aquí termina el trabajo en Otros Transportes.',
      hecho: st => estadoEn(O.conc(st), 'Pendiente de Liberacion'),
      auto: () => { if (E().ui.rol !== 'Jefe LOG') E().setRol('Jefe LOG'); return E().otAprobar(abrirOT(E().st).id); } },
    { vista: 'sap', titulo: 'Termina en SAP', sel: '[data-accion="sapAccion"]:not([disabled])',
      hacer: 'Pulsa la fila N° 1001 y luego, en orden, "Liberar pedido", "Registrar hoja de entrada" y "Liberar hoja".',
      porque: 'La hoja de entrada de servicio confirma que el transporte se prestó. Al liberarla, SAP la acepta y V1 libera la conciliación.',
      veras: 'SAP "Aceptado", hoja 1000001001 y conciliación "Liberado".',
      hecho: st => { const c = O.conc(st); return !!c && c.estado === 'Liberado'; },
      auto: () => { const c = O.conc(E().st); A().vs.conc.concId = c.id; let r; ['Liberar pedido', 'Registrar hoja de entrada', 'Liberar hoja'].forEach(a => { if (c.estado !== 'Liberado') r = E().sapAccion(c.id, a); }); return r; } },
    { vista: 'otmapa', titulo: 'Resultado final y qué sigue', sel: '.ot-resultado',
      hacer: 'En "Sigue una conciliación" elige la N° 1001: las etapas 1 a 16 están hechas y cada una muestra el dato real. Lee "Resultado final" y "Qué sigue después".',
      porque: 'El objetivo de todo el circuito es pagar el flete correcto, cobrar las mermas y dejar el gasto registrado en SAP.',
      veras: 'Etapa 17 "Pago y cierre" como "Estás aquí". Neto conciliado 43.426,12 Bs: flete 43.785,37 menos mermas 359,25. En modo propuesto 43.078,12, porque también descuenta la multa por CRE de 348,00.' }
  ];

  // Al entrar a un paso de Otros Transportes posterior a "Marca la N° 1001", se deja marcada (también tras recargar la página).
  SILOG.TOUR_OT.forEach((p, i) => {
    if (p.vista === 'ot' && i >= 6) p.preparar = () => { const c = O.conc(E().st); if (c && A().vs.ot.concId !== c.id) abrirOT(E().st); };
  });

  // Insertado después del escenario T (si existe) para que aparezca entre los primeros.
  const escO = {
    id: 'O', letra: 'O', nombre: 'O. Otros Transportes de principio a fin (recorrido guiado)',
    objetivo: 'Seguir una quincena real de Transportes Cóndor Andino desde la generación de la conciliación hasta su liberación en SAP, pasando por la pantalla "Conciliación Otros Transportes": tarifa alterna por desvío, merma liberada por medidor descalibrado, capacidad liberada por falta de producto, recepción excluida por precinto roto, recepción tardía agregada con "Nuevo convoy", aprobaciones, factura por mermas, pedido SAP, bloqueo por factura impaga y liberación.',
    ajustes: 'Umbral de facturas impagas reducido a 1.000 Bs para la demostración (en V1 es 50.000). Se agregan la cisterna 5678-DEF y el conductor Carlos Huanca a Transportes Cóndor Andino, y un contrato 2026 a Fletes Chaco. Hay conciliaciones de otros transportistas en la misma quincena (N° 996 y 997) y una de Cóndor de la 1ra quincena (N° 990) con su factura por mermas sin pagar.',
    preparar: st => {
      st.umbralFacturas = 1000;
      st.cisternas.push({ id: 8, placa: '5678-DEF', transportistaId: 1, capacidad: 30000 });
      st.conductores.push({ id: 7, nombre: 'Carlos Huanca', transportistaId: 1, certificado: true });
      st.contratos.push({ id: 15, transportistaId: 4, numero: 'CTR-T4-2026', moneda: 'Bs', vigInicio: '2026-01-01', vigFin: '2026-12-31', estado: 'LIBERADO', marco: null });
      st.tarifas.push({ id: 200, contratoId: 15, origenId: 2, destinoId: 4, productoId: 1, tarifa: 152, admisible: 0.30, prioridad: 'PRINCIPAL', vigInicio: '2026-01-01', estado: true, aprobada: true });
    },
    viajes: [
      // 1ra quincena: ya conciliada y liberada, con la factura por mermas impaga.
      { orden: 'O0', terminal: 2, fecha: '2026-09-05', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-06', vol: 29500 }], historico: 'O-990', nota: 'Válvula con filtración: se perdieron 500 L.' },
      // 2da quincena de Transportes Cóndor Andino: se concilia en el recorrido.
      { orden: 'O1', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29800 }], multas: [{ id: 2, entrada: 1 }], nota: 'Faltan 200 L y el admisible es 90 L: se cobran 110 L. Llegó un día tarde (multa por CRE).' },
      { orden: 'O1', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 2, conductor: 2, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29945 }], nota: 'Faltan 55 L: dentro del admisible, no se cobra.' },
      { orden: 'O2', terminal: 2, fecha: '2026-09-20', destino: 4, producto: 2, cisterna: 8, conductor: 7, vol: 25000, rec: [{ fecha: '2026-09-21', vol: 24790 }], nota: 'Diésel a Oruro: faltan 210 L por un medidor descalibrado de la planta: se libera la merma.' },
      { orden: 'O3', terminal: 2, fecha: '2026-09-22', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-23', vol: 29910 }], nota: 'Bloqueo de carretera: ruta alterna autorizada, tarifa ALTERNA.' },
      { orden: 'O3', terminal: 2, fecha: '2026-09-22', destino: 6, producto: 1, cisterna: 2, conductor: 2, vol: 28500, rec: [{ fecha: '2026-09-24', vol: 28470 }], nota: 'La terminal solo cargó 28.500 L de 30.000 por falta de producto: se libera la capacidad.' },
      { orden: 'O4', terminal: 2, fecha: '2026-09-25', destino: 3, producto: 1, cisterna: 8, conductor: 7, vol: 30000, rec: [{ fecha: '2026-09-26', vol: 30035 }], nota: 'Demasía de 35 L por temperatura: compensa mermas de gasolina.' },
      { orden: 'O4', terminal: 2, fecha: '2026-09-25', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-26', vol: 29640 }], nota: 'Precinto roto al llegar: en investigación, se excluye.' },
      { orden: 'O5', terminal: 2, fecha: '2026-09-27', destino: 3, producto: 1, cisterna: 3, conductor: 2, vol: 7500, grupo: 'GO', nota: 'Compartimiento 1 de 2.' },
      { orden: 'O5', terminal: 2, fecha: '2026-09-27', destino: 3, producto: 1, cisterna: 3, conductor: 2, vol: 7500, grupo: 'GO', recGrupo: [{ fecha: '2026-09-28', vol: 14980 }], nota: 'Compartimiento 2 de 2: una sola recepción, una sola fila en Otros Transportes.' },
      { orden: 'O5', terminal: 2, fecha: '2026-09-29', destino: 4, producto: 1, cisterna: 8, conductor: 7, vol: 30000, nota: 'Llegó a Oruro el 30/09 pero la recepción se registra tarde: "Nuevo convoy".' },
      // Otros transportistas de la misma quincena y área.
      { orden: 'OA', terminal: 2, fecha: '2026-09-18', destino: 3, producto: 1, cisterna: 6, vol: 30000, rec: [{ fecha: '2026-09-19', vol: 29960 }], historico: 'O-997' },
      { orden: 'OA', terminal: 2, fecha: '2026-09-23', destino: 3, producto: 1, cisterna: 6, vol: 30000, rec: [{ fecha: '2026-09-24', vol: 29985 }], historico: 'O-997' },
      { orden: 'OC', terminal: 2, fecha: '2026-09-21', destino: 4, producto: 1, cisterna: 7, vol: 30000, rec: [{ fecha: '2026-09-22', vol: 29950 }], historico: 'O-996' },
      { orden: 'OC', terminal: 2, fecha: '2026-09-26', destino: 4, producto: 1, cisterna: 7, vol: 30000, rec: [{ fecha: '2026-09-27', vol: 29880 }], historico: 'O-996' }
    ],
    historicos: [
      { marca: 'O-990', numero: 990, estado: 'Liberado', sap: 'Aceptado', facturasPagadas: false, facturaMermas: 'F-0990' },
      { marca: 'O-996', numero: 996, estado: 'Aprobada Por Transportista' },
      { marca: 'O-997', numero: 997, estado: 'En Aprobacion de Transportista' }
    ],
    tour: SILOG.TOUR_OT,
    guion: SILOG.TOUR_OT.map(p => ({ vista: p.vista, paso: p.hacer, esperado: p.veras }))
  };
  if (SILOG.FUENTES) {
    const claves = ['tarifario', 'ordenes', 'cre', 'multas', 'sinconciliar', 'ot', 'sap'];
    SILOG.FUENTES.otmapa = {
      resumen: 'Síntesis: las pantallas que intervienen antes, durante y después de "Conciliación Otros Transportes". Las tablas, procedimientos y líneas de código de cada etapa están en el panel de fuentes de su propia vista.',
      items: [].concat(...claves.filter(k => SILOG.FUENTES[k]).map(k => SILOG.FUENTES[k].items.filter(i => i[0] === 'Pantalla')))
    };
  }
  const iT = SILOG.ESCENARIOS.findIndex(e => e.id === 'T');
  SILOG.ESCENARIOS.splice(iT + 1, 0, escO);
})();

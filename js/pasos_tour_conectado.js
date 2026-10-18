/* Guion de estudio: una acción por decisión, motores reutilizados y ramas de lectura explícitas. */
(function (G) {
  const C = SILOG.contratosEstudio, H = SILOG.hojasRutaEstudio, O = SILOG.ordenesEstudio,
    R = SILOG.creEstudio, B = SILOG.conciliacionesEstudio, F = SILOG.facturasEstudio,
    S = SILOG.sapEstudio, P = SILOG.pagosCierreEstudio, N = SILOG.recargosAdicionalesEstudio, E = SILOG.estado, X = G.CASO;
  const evidencia = (existe, fuente, problema, propuesta) => ({ existe, fuente, problema, propuesta });
  const evContrato = evidencia('MC_Contrato conserva la identidad; cada historial inicial/adenda tiene una PK propia. La matriz MC_TarifaOT apunta a esa PK; solicitar, aprobar y liberar son decisiones separadas.',
    'ContratoDetalle.ascx.vb:889–899,1949–1965; MC_Contrato, MC_ContratoHistorial y MC_TarifaOT.',
    'Confundir la secuencia HistorialContratoID con la PK ContratoHistorialID mezcla tarifas. V1 borra/reinserta la matriz; MC_ExistenContratosVigentes termina en AND 1 = 2 y no detecta superposiciones.',
    'Versiones identificadas, validación transaccional de períodos y uso comprobado; conservar las fotografías económicas de documentos anteriores.');
  const evAdenda = evidencia('MCOND modifica condiciones dentro de la vigencia; ACONT amplía el plazo; FINALIZACION lo acorta. Una adenda no es un contrato de otra empresa ni copia todas las tarifas automáticamente.',
    'ContratoDetalle.ascx.vb; MC_ObtenerFechaContrato; MC_DevolverTarifaVigente_OT; MC_ExisteEnConciliacion.',
    'El mayor historial no sustituye automáticamente todas las tarifas anteriores: importan producto, aprobación, liberación y fechas. El control de reversión usa erróneamente inicio como ambos límites.',
    'Mostrar versión y tarifa efectivamente usadas, impedir reversiones por relaciones económicas y conservar adendas anteriores, no por coincidencia de números.');
  const evHR = evidencia('Activar crea SolicitudHojaDeRuta en ACTIVO (PK SolicitudHojaRutaID) y sus líneas SolicitudHRDetalle. Registrar HojaRutaCRE deja la solicitud UTILIZADO y la hoja TRAMITADA. El despacho la lleva EN TRANSITO y la recepción completa a UTILIZADA o VENCIDA.',
    'UserControls/SolicitudHojaRuta.ascx.vb:949–1292 y HojasDeRuta.ascx.vb:340–719; SolicitudHojaDeRuta, SolicitudHRDetalle, HojaRutaCRE.',
    'TRAMITADA no es un estado de solicitud. Costo/depósito de trámite, descargo de HR y pago del flete son cosas distintas. Licencias, RA, aduana y autoridades se simulan, no se verifican contra sistemas reales.',
    'Estados y responsables por documento; requisitos explicados, comprobantes verificables y trazabilidad de cada línea sin inventar una aprobación adicional de SHR.');
  const evOrden = evidencia('La orden importa líneas de SHR con su tarifa o permite adiciones manuales en tramos habilitados. Se guarda, solicita y aprueba; el número se asigna por terminal. El CRE previo y su activación ocurren después.',
    'DetalleOrdenDespacho.ascx.vb y OrdenesDeDespacho.ascx.vb; OrdenDespachoDetalle; CREOrdenDespacho.',
    'Aprobar no significa despachar. Liberar sólo exige al menos un CRE activo y puede dejar detalles pendientes; la habilitación parcial permite continuar. La orden variable no usa el mismo previo que la normal.',
    'Mostrar programado, ejecutado y pendiente por relación detalle–CRE, separar liberación de completitud y usar numeración transaccional.');
  const evCRE = evidencia('El previo usa EstadoID=2 y número 0. Activar asigna número y EstadoID=1. La recepción conserva CREAsociacion y el vínculo al detalle de orden; puede asociar despachos y registrar distribución por cuenta.',
    'CREPrevioOT.ascx.vb, CRECisterna.ascx.vb, CREDistribucionCuenta.ascx.vb y CREParcial.ascx.vb; CREAsociacion; CREOrdenDespacho.',
    'Litros programados no son medidos. Agrupar recepciones o duplicar asociaciones afecta el reparto. ASTM/API, balanza y tanques no se reproducen íntegramente en el navegador.',
    'Validar balance, unicidad de asociaciones y medición real, manteniendo documento original, correcciones y fotografía del cálculo.');
  const evAdicionales = evidencia('CG proviene de cobros activos repartidos por cantidad de filas de orden; se agrupan por proveedor hasta fin de quincena. Los casos guardan Monto firmado y volumen informativo, TC=0 y FacturaPagada. Procesar cisterna no incorpora CG/casos al neto guardado.',
    'CobroCarroGuiaDetalle.ascx.vb:550–625; MultaDescuentoConciliacion.aspx.vb:349–637; CG_CargarCobrosCarroGuiaParaConciliacion; ObtenerMontosDeConciliacion; RPT_CostosTransporte, Ds_ConciliacionPorConciliacion.',
    'FechaIni no filtra; una fila guardada más otra pendiente del mismo proveedor puede desajustar monto e IDs. Casos USD no se convierten al sumar; reemplazar reinicia marcas/adjuntos y el umbral >=50.000 no coincide con >50.000 de cobros. Los netos son distintos.',
    'Identidades por fuente/fila, validación transaccional, moneda/TC documentados y un neto aprobado con negocio. Se muestra sólo una comparación propuesta; no se cambia el neto V1 ni se inventan servicios como obligatorios.');
  const pasos = [];
  const agregar = (id, vista, paso, titulo, hacer, e, opciones = {}) => {
    const p = { id, conectado: true, vista, titulo, hacer, porque: opciones.porque || 'Sigue la misma cadena documental; estudiar un paso no acredita que se haya ejecutado el siguiente.',
      veras: opciones.veras || 'La pantalla conserva los documentos del expediente y muestra sus relaciones y estados propios.',
      sel: { contratos: '.ct-estudio', hojasruta: '.hr-estudio', ordenespasos: '.od-estudio', crepasos: '.cr-estudio', multascreconectadas: '.lc-estudio', recargosconectados: '.ra-estudio', otconectadas: '.ce-estudio', facturasconectadas: '.fe-estudio', sapconectado: '.se-estudio', pagoscierre: '.pe-estudio', otmapa: '.ot-linea' }[vista],
      evidencia: () => typeof e === 'function' ? e() : e,
      preparar: () => { G.enfocar(vista, paso, opciones.historial); G.prefijar(id); }, ...opciones };
    if (opciones.comprobado) p.hecho = st => {
      const z = G.expediente(st); return !!z && !G.problemas(st).length && !!opciones.comprobado(z);
    };
    if (opciones.ejecutar) p.auto = () => {
      if (p.hecho?.(E.st)) return { ok: true, msg: 'Este paso ya está comprobado; no se duplicó la operación.' };
      const errores = G.problemas(); if (errores.length) return { ok: false, msg: errores.join(' ') };
      let r; try { r = opciones.ejecutar(G.expediente(), G.contexto(vista)); } catch (err) { return { ok: false, msg: 'Revisa el paso anterior: ' + err.message }; }
      if (r?.ok) { E.guardar(); G.enfocar(vista, paso, opciones.historial); } return r;
    };
    pasos.push(p); return p;
  };
  const leer = (id, vista, paso, titulo, hacer, e, opciones = {}) => agregar(id, vista, paso, titulo, hacer, e, { lectura: true, ...opciones });
  const contractual = (id, historial, estado, titulo) => agregar(id, 'contratos', 3, titulo,
    `Usa la transición de la versión ${historial === 'inicial' ? 'inicial' : 'de adenda'} hasta ${estado}; revisa que sus tarifas sólo se aprueban al liberar.`, historial === 'inicial' ? evContrato : evAdenda,
    { historial, comprobado: z => C.ESTADOS.indexOf(z[historial]?.estado) >= C.ESTADOS.indexOf(estado), ejecutar: (z, ctx) => C.avanzar(z.k, z.ids[historial], ctx) });
  const recargo = (id, estado, titulo) => agregar(id, 'otconectadas', 4, titulo,
    `Selecciona el concepto vinculado y avanza sólo hasta ${estado}. Definir o liberar el catálogo no aplica todavía ningún cargo al viaje.`, () => B.EVIDENCIAS[4], {
      comprobado: z => { const d = z.m.recorridoConciliaciones.recargosCatalogo.find(d => d.id === z.ids.concepto), estados = SILOG.multasContractuales.ESTADOS; return d && estados.indexOf(d.estado) >= estados.indexOf(estado); },
      ejecutar: (z, ctx) => B.multas(z.m, 'cambiarEstado', [z.ids.concepto, false], ctx) });
  const sap = (id, paso, titulo, accion, comprobar, n) => agregar(id, 'sapconectado', paso, titulo,
    `Revisa los datos de esta conciliación y ejecuta «${accion}». Es una respuesta SAP ficticia: no se llama a RFC ni se envía un documento real.`, () => S.EVIDENCIAS[n], {
      comprobado: z => comprobar(z.c?.sapEstudio, z.c), ejecutar: (z, ctx) => S.ejecutar(z.m, z.c.id, accion, ctx) });

  const inicio = agregar('preparar', 'contratos', 0, 'Preparar el expediente de principio a fin',
    'Pulsa «Hazlo por mí» para preparar catálogos de práctica y un expediente sin contratos, solicitudes, HR, órdenes ni CRE. Si había otro recorrido operativo, se archiva completo y puede restaurarse desde Órdenes. No se borran los escenarios generales.', evContrato,
    { veras: 'Cisternas del Oriente SA; Oruro → Potosí; Gasolina Especial; cisterna 4244-ZRY y Miguel Morales Sandoval. Todavía no hay operaciones.', comprobado: () => true });
  inicio.auto = G.iniciar;
  leer('requisitos', 'hojasruta', 1, 'Distinguir los requisitos y sistemas externos',
    'Revisa empresa, medio, localidades, producto, unidad, conductor, registro RA, cupo, acceso y vigencia. Son catálogos y respuestas externas ficticias. No necesitas inventar permisos productivos ni una tarifa universal.', evHR);
  agregar('contrato', 'contratos', 1, 'Registrar el contrato y su versión inicial',
    'Registra CIS-ORIENTE-2026 de Cisternas del Oriente SA, Bs/m³, del 01/01/2026 al 31/12/2026. Conserva por separado el ID del contrato y la PK del historial inicial. Si lo haces manualmente, vincula el documento seleccionado desde la guía.', evContrato, {
      historial: 'inicial', vincular: 'inicial', comprobado: z => !!z.inicial,
      ejecutar: (z, ctx) => { const r = C.crear(z.k, G.datosContrato(), ctx); return r.ok ? G.guardarId('inicial', r, { contrato: z.k.historiales.find(h => h.id === r.id).contratoId }) : r; } });
  agregar('matriz-inicial', 'contratos', 2, 'Registrar la matriz inicial',
    'Añade Diésel Oil en Oruro → Potosí, PRINCIPAL: 180 Bs/m³ y admisible 0,4 %. Guarda la matriz mediante su confirmación interna. GES se incorporará en la adenda, no se mezclará con esta versión.', evContrato, {
      historial: 'inicial', comprobado: z => z.k.tarifas.some(t => t.historialId === z.ids.inicial && t.productoId === 802),
      ejecutar: (z, ctx) => C.guardarTarifas(z.k, z.ids.inicial, [{ rutaId: X.rutaId, productoId: 802, tarifa: X.tarifaInicial, admisible: X.admisible }], ctx) });
  contractual('solicitar-contrato', 'inicial', 'PENDIENTE DE APROBACION', 'Solicitar aprobación del contrato');
  contractual('aprobar-contrato', 'inicial', 'PENDIENTE DE LIBERACION', 'Aprobar la versión inicial');
  contractual('liberar-contrato', 'inicial', 'LIBERADO', 'Liberar contrato y tarifas iniciales');
  agregar('adenda', 'contratos', 4, 'Crear la adenda del mismo contrato',
    'Crea una adenda MCOND desde el 16/09/2026 para incorporar Gasolina Especial. El contrato conserva su ID; la adenda tiene otra PK de historial y la secuencia siguiente. La finalización y ampliación son ramas distintas, no pasos obligatorios de este viaje.', evAdenda, {
      vincular: 'adenda', comprobado: z => !!z.adenda,
      ejecutar: (z, ctx) => G.guardarId('adenda', C.adenda(z.k, z.ids.contrato, G.datosAdenda(), ctx)) });
  agregar('matriz-adenda', 'contratos', 2, 'Registrar la tarifa de Gasolina Especial',
    'En la adenda agrega Oruro → Potosí, PRINCIPAL, GES: 230 Bs/m³; admisible 0,4 %. El sentido inverso y una ruta alterna no se consideran equivalentes automáticamente.', evAdenda, {
      comprobado: z => z.k.tarifas.some(t => t.historialId === z.ids.adenda && t.productoId === X.productoId),
      ejecutar: (z, ctx) => C.guardarTarifas(z.k, z.ids.adenda, [{ rutaId: X.rutaId, productoId: X.productoId, tarifa: X.tarifaAdenda, admisible: X.admisible }], ctx) });
  contractual('solicitar-adenda', 'adenda', 'PENDIENTE DE APROBACION', 'Solicitar aprobación de la adenda');
  contractual('aprobar-adenda', 'adenda', 'PENDIENTE DE LIBERACION', 'Aprobar la adenda');
  contractual('liberar-adenda', 'adenda', 'LIBERADO', 'Liberar la adenda y su matriz');
  leer('consulta-tarifa', 'contratos', 5, 'Comprobar qué versión y tarifa aplican',
    'Consulta la empresa, ruta dirigida, GES y fecha del ejercicio. En este ejemplo 230 Bs/m³ se normaliza a 0,23 Bs/L. Revisa los IDs de contrato, historial y tarifa; no registres un uso económico ficticio con el botón de ensayo.', evAdenda);
  leer('solicitud-requisitos', 'hojasruta', 1, 'Validar antes de activar la solicitud',
    'Comprueba vigencia, ruta, recurso/conductor, RA y cupo. Al activar se asociará la tarifa liberada de la adenda. La solicitud todavía no será una HR, un despacho ni una conciliación.', evHR);
  agregar('activar-solicitud', 'hojasruta', 2, 'Activar una solicitud nueva con su línea',
    'Crea una SHR para la cisterna 4244-ZRY, Miguel Morales Sandoval y 34.000 L de GES. Usa el registro RA de GES de Oruro y la fecha del ejercicio. Vincula la SHR seleccionada si operas el formulario manualmente.', evHR, {
      vincular: 'solicitud', comprobado: z => !!z.s,
      ejecutar: (z, ctx) => { const r = H.activar(z.m, G.datosSolicitud(z), ctx); if (!r.ok) return r; const s = z.m.solicitudes.find(s => s.id === r.id), l = s.detalles[0]; return G.guardarId('solicitud', r, { lineaSolicitud: l.id, tarifa: l.tarifaId }); } });
  agregar('registrar-hr', 'hojasruta', 3, 'Tramitar y registrar la hoja de ruta',
    'Registra número externo de HR, depósito y vigencia de la solicitud. El ejemplo usa un número ficticio; no lo emite una autoridad real. Comprueba solicitud UTILIZADO y hoja TRAMITADA.', evHR, {
      comprobado: z => !!z.h, ejecutar: (z, ctx) => H.registrar(z.m, z.s.id, { numero: 990000 + z.s.id, deposito: String(88000000 + z.s.id), inicio: z.s.inicio, fin: z.s.fin }, ctx) });
  leer('respaldo-hr', 'hojasruta', 7, 'Revisar impresión, respaldo y dos estados',
    'Sigue el número de solicitud, línea y HR. El adjunto es un respaldo documental; el depósito es costo de trámite, no pago del flete. La impresión/autoridad externa no se ejecuta en este prototipo.', evHR);
  agregar('crear-orden', 'ordenespasos', 1, 'Importar la línea de SHR y guardar la orden',
    'Selecciona Oruro, cisterna y fecha del ejercicio; importa la línea GES de la SHR guiada y guarda. No uses las solicitudes preparadas de otros ejercicios. Vincula la orden seleccionada si la registraste manualmente.', evOrden, {
      vincular: 'orden', comprobado: z => !!z.o && !!z.d,
      ejecutar: (z, ctx) => { const r = O.crear(z.m, { origenId: X.origenId, medioId: X.medioId, fecha: z.m.hoy }, [{ solicitudId: z.s.id, solicitudDetalleId: z.ids.lineaSolicitud }], ctx); if (!r.ok) return r; const o = z.m.ordenes.find(o => o.id === r.id); return G.guardarId('orden', r, { detalle: o.detalles.find(d => d.solicitudId === z.s.id && d.solicitudDetalleId === z.ids.lineaSolicitud).id }); } });
  agregar('solicitar-orden', 'ordenespasos', 2, 'Solicitar aprobación de la orden', 'Solicita la aprobación de la nómina. Todavía no hay CRE activo ni recepción.', evOrden, {
    comprobado: z => O.ESTADOS.indexOf(z.o?.estado) >= 1 && z.o?.estado !== 'ANULADO', ejecutar: (z, ctx) => O.cambiar(z.m, z.o.id, 'solicitar', ctx) });
  agregar('aprobar-orden', 'ordenespasos', 2, 'Aprobar la orden y comprobar su número', 'Aprueba la orden de esta terminal. Revisa número e ID: no son la misma cosa. El correo de autorización sólo se registra como simulación.', evOrden, {
    comprobado: z => ['APROBADO', 'LIBERADO'].includes(z.o?.estado), ejecutar: (z, ctx) => O.cambiar(z.m, z.o.id, 'aprobar', ctx) });
  leer('ramas-orden', 'ordenespasos', 0, 'Estudiar órdenes manuales, variables y otros medios',
    'La rama principal continúa con cisterna y SHR. Una adición manual exige un tramo sin HR habilitado y no se le inventa una solicitud; una orden variable registra directamente un despacho activo. Barcaza y vagón tienen recursos, tipos de CRE y cálculo propios. No cambies el medio del documento para simular otra rama.', evOrden);
  agregar('previo-despacho', 'ordenespasos', 3, 'Preparar el CRE de despacho sin activarlo',
    'Selecciona el detalle guiado, TK-101, lote cisterna/GES y la misma unidad. Crea el previo: EstadoID=2 y número 0. Vincula ese despacho si lo preparaste manualmente.', evCRE, {
      vincular: 'despacho', comprobado: z => !!z.desp,
      ejecutar: (z, ctx) => G.guardarId('despacho', O.prepararCRE(z.m, z.o.id, [z.d.id], { tanqueId: 4101, unidadId: z.d.unidadId, loteId: 1 }, ctx)) });
  agregar('activar-despacho', 'crepasos', 1, 'Medir y activar el despacho',
    'Registra 34.000 L medidos y activa el CRE. Revisa su número definitivo, el enlace al detalle y HR EN TRANSITO. La guía usa volumen consolidado; no afirma simular ASTM/API ni balanza.', evCRE, {
      comprobado: z => z.desp?.estadoId === 1, ejecutar: (z, ctx) => R.activarDespacho(z.m, z.desp.id, { volumen: X.volumen }, ctx) });
  agregar('liberar-orden', 'ordenespasos', 5, 'Liberar la orden sin confundirla con el pago',
    'Libera la orden después del despacho. En este ejemplo sólo hay un detalle; en V1 una orden con más filas puede liberarse con pendientes. Estudia habilitar/inhabilitar parcial sin aplicarlo arbitrariamente a este viaje.', evOrden, {
      comprobado: z => z.o?.estado === 'LIBERADO', ejecutar: (z, ctx) => O.cambiar(z.m, z.o.id, 'liberar', ctx) });
  agregar('previo-recepcion', 'crepasos', 2, 'Preparar la recepción del mismo despacho',
    'Selecciona el CRE guiado, la unidad líder y TK destino GES. Guarda el previo de recepción: aún no es recepción activa y no aparece en Detalle sin conciliar.', evCRE, {
      vincular: 'recepcion', comprobado: z => !!z.rec,
      ejecutar: (z, ctx) => G.guardarId('recepcion', R.crearRecepcion(z.m, [z.desp.id], { fecha: z.m.hoy, tanqueId: 4201, liderId: z.d.unidadId }, ctx)) });
  agregar('activar-recepcion', 'crepasos', 3, 'Medir, distribuir y activar la recepción',
    'Registra 33.000 L recibidos y distribuye los 33.000 L a la cuenta de práctica. Activa como recepción final. Se conservan los 34.000 L despachados; la diferencia física no se convierte automáticamente en multa contractual.', evCRE, {
      comprobado: z => z.rec?.estadoId === 1, ejecutar: (z, ctx) => R.activarRecepcion(z.m, z.rec.id, { volumen: X.recibido, parcial: false, distribucion: [{ cuentaId: 2, volumen: X.recibido }] }, ctx) });
  leer('descargo-hr', 'hojasruta', 6, 'Distinguir recepción y descargo administrativo de HR',
    'Revisa HR UTILIZADA o VENCIDA según su vigencia. DESCARGADA es un cierre documental separado que puede registrar el responsable con respaldo; no se fuerza como requisito de conciliación y no paga el transporte. Anular SHR o revertir HR exige revisar sus usos.', evHR);
  leer('parciales-convoy', 'crepasos', 4, 'Estudiar parciales y varios despachos para una recepción',
    'Consulta el balance y las asociaciones. V1 puede conciliar una recepción parcial abierta: una recepción posterior cambia el reparto nuevo, no la fotografía anterior. El agrupamiento múltiple de la práctica está acotado a cisterna; no se extiende silenciosamente a otros medios.', () => B.EVIDENCIAS[2]);
  agregar('precio-producto', 'otconectadas', 1, 'Registrar el precio de producto para el cálculo',
    'En Datos de cálculo registra GES, fecha de carga, PPT 3,74 y precio multa 3,74 Bs/L. Es un precio ficticio, distinto de la tarifa contractual del transporte. En vagón serían necesarios kilos/autorización y la base sería por toneladas.', () => B.EVIDENCIAS[1], {
      comprobado: z => z.m.recorridoConciliaciones.precios.some(p => p.productoId === X.productoId && p.vigInicio === z.desp?.fecha),
      ejecutar: (z, ctx) => B.precio(z.m, { productoId: X.productoId, fecha: z.desp.fecha, ppt: X.precio, precioMulta: X.precio }, ctx) });
  leer('pendientes', 'otconectadas', 2, 'Verificar disponibilidad y exclusiones antes de generar',
    'Selecciona la empresa y período que contienen la recepción guiada. Revisa activa/asociada/no incluida, tarifa asociada o PRINCIPAL por fecha de recepción, admisible y precio por fecha de carga. Un dato cero se informa; no se interpreta como transporte gratuito.', () => B.EVIDENCIAS[2]);
  agregar('generar-conciliacion', 'otconectadas', 2, 'Generar una sola conciliación con los CRE guiados',
    'Marca únicamente la recepción guiada y genera. Comprueba cabecera, detalle y los dos CRE. La recepción deja de estar disponible para otra generación; no desaparecen los documentos originales.', () => B.EVIDENCIAS[3], {
      vincular: 'conciliacion', comprobado: z => !!z.c,
      ejecutar: (z, ctx) => { const g = B.pendientes(z.m).grupos.find(g => g.recepciones.some(r => r.rec.id === z.rec.id)); return g ? G.guardarId('conciliacion', B.generar(z.m, g.clave, [z.rec.id], false, ctx)) : { ok: false, msg: 'La recepción ya no está disponible; revisa exclusiones y vínculos.' }; } });
  leer('fotografia-traza', 'otconectadas', 3, 'Comprobar fotografía y documentos propios frente al grupo',
    'Abre «Documentos propios y grupo de recepción»: contrato, historial/adenda, tarifa, SHR/línea, HR, orden/detalle y CRE son los mismos. Excluir retira el detalle y sus usos, no borra CRE; V1 puede borrar aplicaciones por CREID en otras conciliaciones. No ejecutes una exclusión para simular que ocurrió.', () => B.EVIDENCIAS[3]);
  agregar('multas-antiguas', 'multascreconectadas', 0, 'Registrar un incumplimiento por CRE y seguir su cálculo',
    'Para este caso ficticio marca Otros pasajeros del CRE guiado, TC 6,96: catálogo 100 Sus × una ocurrencia × 6,96 = 696 Bs. Identifica el incidente como ACTA-OT-PASAJEROS-01 (metadato propuesto). Es distinto del retraso que aplicarás después desde MC; no registres dos veces el mismo hecho. Revisa Calcular, TotalMultas y aporte SQL, en especial la inconsistencia de filtración.',
    evidencia('La pantalla independiente registra MultaPorIncumplimiento por CRE. SQL agrega esa fuente a Multa Transporte de cisterna; guardar una multa no reprocesa la cabecera automáticamente.', 'MultasPorInclumpliento.ascx.vb:179–350; AdmUtilitariosConciliacion.vb:438–449; MC_ObtenerMultaDescuentoAplicado.', 'Filtración puede convertir varias veces; el mismo incidente puede cobrarse desde CRE y MC, o en distintas conciliaciones parciales.', 'Identificar el incidente, revisar ambas fuentes y convertir una sola vez con base/moneda confirmadas. Los importes propuestos no reemplazan el cálculo V1.'), {
      comprobado: z => SILOG.multasCREEstudio.preparar(z.m).registros.some(r => r.creId === z.ids.despacho && r.multaId === 6),
      ejecutar: (z, ctx) => SILOG.multasCREEstudio.guardar(z.m, z.ids.despacho, [{ multaId: 6, tc: 6.96, referencia: 'ACTA-OT-PASAJEROS-01' }], ctx) });
  agregar('definir-multa', 'otconectadas', 4, 'Definir la multa contractual del caso de estudio',
    'Sólo para ensayar un incidente ficticio: crea «Incumplimiento de itinerario · estudio OT», ámbito CRE de despacho y vigencia anual. Esta definición todavía no descuenta nada. Si la creas manualmente, selecciónala por ID en la guía y vincúlala.', () => B.EVIDENCIAS[4], {
      vincular: 'definicion', comprobado: z => z.m.recorridoConciliaciones.multasContractuales.some(h => h.id === z.ids.definicion),
      ejecutar: (z, ctx) => G.guardarId('definicion', B.multas(z.m, 'guardarCabecera', [{ tipoContratoId: 1, denominacion: 'Incumplimiento de itinerario · estudio OT', tipo: 'Multa', aplicabilidad: 'CRE_D', vigInicio: '2026-01-01', vigFin: '2026-12-31' }], ctx)) });
  agregar('concepto-multa', 'otconectadas', 4, 'Crear el concepto con monto, moneda y cantidad separada',
    'Agrega «Día de retraso», sigla DR, monto 200 BOB y la vigencia de la definición. BOB multiplica monto × cantidad; USD, %, VAR y siglas MPF/EHR siguen otras fórmulas V1. El TC histórico del catálogo no es una cotización actual del BCB.', () => B.EVIDENCIAS[4], {
      vincular: 'concepto', comprobado: z => z.m.recorridoConciliaciones.recargosCatalogo.some(d => d.id === z.ids.concepto),
      ejecutar: (z, ctx) => G.guardarId('concepto', B.multas(z.m, 'guardarDetalle', [{ cabeceraId: z.ids.definicion, concepto: 'Día de retraso', sigla: 'DR', monto: X.multa, moneda: 'BOB', vigInicio: '2026-01-01', vigFin: '2026-12-31' }], ctx)) });
  agregar('asociar-empresa', 'otconectadas', 4, 'Asociar el concepto a la empresa transportista',
    'Asocia Cisternas del Oriente SA. No asocies una empresa por tener una placa parecida: debe coincidir con la empresa de la conciliación y el tipo de contrato.', () => B.EVIDENCIAS[4], {
      comprobado: z => z.m.recorridoConciliaciones.recargosCatalogo.find(d => d.id === z.ids.concepto)?.empresas.includes(z.c?.transportistaId),
      ejecutar: (z, ctx) => B.multas(z.m, 'asociarEmpresas', [z.ids.concepto, [z.c.transportistaId]], ctx) });
  recargo('solicitar-multa', 'PENDIENTE DE APROBACION', 'Solicitar aprobación del recargo');
  recargo('aprobar-multa', 'PENDIENTE DE LIBERACION', 'Aprobar el recargo');
  recargo('liberar-multa', 'LIBERADO', 'Liberar el concepto contractual');
  agregar('aplicar-multa', 'otconectadas', 4, 'Aplicar dos días al CRE de despacho seguido',
    'Selecciona el CRE de despacho guiado y cantidad 2: 200 BOB × 2 = 400 Bs de descuento en este ejemplo. No es una multa automática por diferencia de volumen ni se duplica con la fuente antigua. Sin incidente real este cargo no correspondería.', () => B.EVIDENCIAS[4], {
      comprobado: z => z.c?.recargos.some(r => r.creId === z.ids.despacho && r.catalogoId === z.ids.concepto),
      ejecutar: (z, ctx) => B.multas(z.m, 'aplicarCRE', [z.c.id, z.ids.despacho, [{ id: z.ids.concepto, cantidad: X.cantidadMulta, referencia: 'ACTA-OT-RETRASO-01' }]], ctx) });
  agregar('origen-carro-guia', 'recargosconectados', 0, 'Preparar el cobro CG del mismo detalle de orden',
    'Sólo para este ejemplo se supone un servicio de escolta ficticio de 300 Bs. Marca el detalle de la orden guiada y prepara el origen en elaboración. No se cobra por defecto ni se toma la tarifa GES del contrato: ésta es otra tarifa de servicio. El origen es una simulación acotada del módulo CG de V1.', evAdicionales, {
      comprobado: z => !!z.ids.cobroGuia && N.preparar(z.m).cobros.some(r => r.id === z.ids.cobroGuia),
      ejecutar: (z, ctx) => G.guardarId('cobroGuia', N.crearCobro(z.m, z.c.id, { empresaGuiaId: 9501, fecha: z.m.hoy, costo: 300, especial: 0, detalleIds: [z.d.id] }, ctx)) });
  agregar('activar-carro-guia', 'recargosconectados', 0, 'Activar el origen antes de incluirlo en conciliación',
    'Activa el cobro CG del ejercicio. Activar sólo lo vuelve elegible en pendientes; no inserta CG_ConciliacionCarroGuia ni cambia netos, CRE, HR o SAP.', evAdicionales, {
      comprobado: z => N.preparar(z.m).cobros.some(r => r.id === z.ids.cobroGuia && r.estado === 'ACTIVO'),
      ejecutar: (z, ctx) => N.estadoCobro(z.m, z.c.id, z.ids.cobroGuia, 'activar', ctx) });
  agregar('aplicar-carro-guia', 'recargosconectados', 1, 'Seleccionar el cobro CG de esta empresa transportista',
    'Incluye el grupo pendiente de Escoltas del Altiplano, referencia CG-2841 y observación de práctica. Una unidad de esta empresa sobre una unidad total: 300 × 1/1 = 300 Bs. Se fotografía el monto positivo y OT muestra −300. Los IDs quedan vinculados y ya no disponibles para otra conciliación.', evAdicionales, {
      comprobado: z => N.carros(z.c).some(r => r.detalleCobroIds?.some(n => N.preparar(z.m).detallesEmpresa.some(d => d.id === n && d.cobroId === z.ids.cobroGuia))),
      ejecutar: (z, ctx) => N.guardarCG(z.m, z.c.id, [{ clave: 'pendiente:9501', factura: 'CG-2841', observacion: 'Servicio de carro guía ficticio del mismo viaje.' }], ctx) });
  agregar('guardar-casos', 'recargosconectados', 2, 'Registrar dos ajustes especiales con signo y respaldo',
    'Para estudiar ambos signos, guarda dos casos genéricos ficticios distintos de las multas y merma: −120 Bs por ajuste documental y +20 Bs por regularización respaldada; volumen informativo 0, producto GES. La suma es −100 Bs, no monto × volumen. V1 guardará TC=0 y marca automática 1; eso no acredita aprobación ni pago.', evAdicionales, {
      comprobado: z => N.casos(z.c).some(r => r.factura === 'CE-DOC-018') && N.casos(z.c).some(r => r.factura === 'CE-REG-019'),
      ejecutar: (z, ctx) => N.guardarCasos(z.m, z.c.id, G.ejemploCasos(z), ctx) });
  leer('otros-recargos', 'recargosconectados', 3, 'Comparar cabecera, visual, reporte y mejora propuesta',
    'Sin editar el ejemplo: neto de cabecera al procesar 3.262,64 Bs; visual OT 3.262,64 − 300 − 120 + 20 = 2.862,64; reporte Costos 3.262,64 − 120 + 20 = 3.162,64. Son resultados alternativos, no se suman entre sí. El ensayo unificado es propuesta y no cambia V1. Casos, CG y descuentos sólo proceden cuando tienen respaldo; no son cargos obligatorios.', evAdicionales);
  leer('nuevo-convoy', 'otconectadas', 3, 'Estudiar cómo agregar recepciones a la misma conciliación',
    'Abre Nuevo convoy en la revisión. Si tienes otra recepción activa del mismo ejercicio, selecciona su rango, compara y confirma. Es una alternativa: el caso principal continúa con su única recepción, sin inventar un viaje adicional. Para practicar, registra antes otro viaje completo o excluye y reincorpora la recepción; revisa que excluir V1 puede borrar aplicaciones por CREID. Nuevo convoy conserva cabecera/número, agrega pares y recalcula; una demasía compensa mermas sólo del mismo producto. Si hay parciales tardías, contrasta todas las fotos del despacho.', () => SILOG.convoyEstudio.EVIDENCIA);
  agregar('procesar', 'otconectadas', 5, 'Revisar ajustes y guardar el cálculo',
    'Revisa liberar merma, capacidad o tarifa especial, sus permisos y justificación. Para el caso principal conserva los valores y pulsa Procesar. Es una práctica explícita de cálculo: V1 no impone volver a procesar como condición adicional para conformidad.', () => B.EVIDENCIAS[5], {
      comprobado: z => z.c?.procesada === true, ejecutar: (z, ctx) => B.procesar(z.m, z.c.id, [], ctx) });
  leer('explicar-importes', 'otconectadas', 5, 'Entender flete, merma, multa y los dos netos',
    'Abre los desgloses. Flete 7.590 Bs; admisible 136 L; merma −864 × 3,74 = −3.231,36 Bs; multas CRE −696 y MC −400 consolidadas en Multa Transporte −1.096; neto guardado 3.262,64. CG −300 y casos −100 llevan el visual OT a 2.862,64, pero V1 no los guarda en ese neto. Reporte 3.162,64; SAP por flete 7.590. No restes componentes dos veces; si editaste datos usa el cálculo actual.', () => B.EVIDENCIAS[5], {
      resultado: z => z.c ? `Importes guardados actuales: flete ${z.c.totales.flete} Bs; merma ${z.c.totales.merma} Bs; multa transporte ${z.c.totales.multaTransporte ?? 0} Bs; neto ${z.c.totales.neto} Bs. Total visual calculado: ${B.evaluar(z.m, z.c).netoVisual} Bs.` : 'Genera y procesa primero.' });
  agregar('enviar-conformidad', 'otconectadas', 6, 'Enviar a conformidad del transportista',
    'Envía la misma conciliación desde En Elaboracion a En Aprobacion de Transportista. No se ha creado un pedido ni una factura pagada por cambiar este estado.', () => B.EVIDENCIAS[6], {
      comprobado: z => z.c && z.c.estado !== 'En Elaboracion', ejecutar: (z, ctx) => B.cambiar(z.m, z.c.id, 'enviar', ctx) });
  leer('rechazo-conformidad', 'otconectadas', 6, 'Estudiar rechazo y revisión sin borrar el viaje',
    'Rechazar devuelve la conciliación a elaboración para revisar ajustes y reenviar. Conserva el historial y los CRE. Es una alternativa a la aceptación, no un rechazo que deba registrarse en cada viaje; si lo practicas, procesa/reenvía antes de continuar.', () => B.EVIDENCIAS[6]);
  agregar('aceptar-conformidad', 'otconectadas', 6, 'Registrar la conformidad y revisar la preparación SAP',
    'Registra la conformidad. V1 permite que logística pulse por el transportista: no acredita firma directa de la empresa. Prepara master/detail local SAP por flete/producto, sin pedido; después intenta alertas de pedido y facturación por merma/incumplimiento. Un fallo de correo puede dejar la operación guardada; aquí no se envían correos.', () => B.EVIDENCIAS[6], {
      comprobado: z => z.c?.sapEstudio && !['En Elaboracion', 'En Aprobacion de Transportista'].includes(z.c.estado), ejecutar: (z, ctx) => B.cambiar(z.m, z.c.id, 'aceptar', ctx) });
  agregar('facturas-referencias', 'facturasconectadas', 1, 'Guardar las referencias de merma e incumplimiento',
    'En Aprobada Por Transportista, guarda MER-ORU-8105 e INC-ORU-2026 para los cobros de este ejemplo. Son referencias, no recepción fiscal ni pago de la factura del servicio. Vagón tiene otra rama de validación.', () => F.EVIDENCIAS[1], {
      comprobado: z => !!z.c?.facturacion?.mermas && !!z.c?.facturacion?.incumplimiento,
      ejecutar: (z, ctx) => F.guardarReferencias(z.m, z.c.id, { mermas: 'MER-ORU-8105', incumplimiento: 'INC-ORU-2026' }, ctx) });
  leer('validar-facturas', 'facturasconectadas', 2, 'Consultar el requisito documental de SAP',
    'Comprueba FacturasCorrectas: importes decimales y referencias no vacías/guion para CT/CB. La rama VB de aprobación en OT tiene errores y no es alcanzable desde ese estado; no la presentes como aprobación exitosa ni como pago.', () => F.EVIDENCIAS[2], {
      resultado: z => z.c ? F.validarSAP(z.m, z.c.id).msg : 'Sin conciliación seleccionada.' });
  leer('cobros', 'facturasconectadas', 3, 'Consultar cobros de la misma empresa',
    'Revisa FacturasPagadas, NULL y el umbral estrictamente mayor a 50.000 de la consulta histórica. Sin filas no demuestra ausencia de deuda. Liberar facturas marca cobros; no paga el flete ni registra una transferencia. Este ejemplo puede no devolver filas y no se fabricará una deuda.', () => F.EVIDENCIAS[3]);
  agregar('servicio-propuesto', 'facturasconectadas', 4, 'Ensayar la factura del servicio como propuesta separada',
    'PROPUESTA: registra FC-ORIENTE-8105, fecha del ejercicio, total 7.590 Bs (si no editaste los datos) y una nota de revisión. El importe se toma del flete del documento SAP de práctica, no se asume que el neto de 3.262,64 sea el total fiscal o el pago. La captura V1 de esas columnas no se ha localizado.', () => F.EVIDENCIAS[4], {
      propuesta: true, comprobado: z => !!z.c?.facturacion?.servicioPropuesto && !z.c.facturacion.servicioPropuesto.estado.startsWith('Anulada'),
      ejecutar: (z, ctx) => F.proponerServicio(z.m, z.c.id, { numero: 'FC-ORIENTE-8105', fecha: z.m.hoy, total: S.total(z.c.sapEstudio), moneda: 'Bs', nota: 'PROPUESTA de estudio: revisar por separado los cobros por merma e incumplimiento; no recepción fiscal V1.' }, ctx) });
  agregar('configurar-sap', 'sapconectado', 1, 'Preparar las dependencias contables para SAP',
    'Revisa proveedor, condición de pago, grupo de compra, código de liberación, fecha contable, CeBe y cuenta por posición. «Hazlo por mí» guarda valores ficticios del módulo. No añade un contrato marco ni ejecuta DISTRIBUIR sin parametrización.', () => S.EVIDENCIAS[1], {
      comprobado: z => { const s = z.c?.sapEstudio; return s && ['proveedorSAP', 'condicionPago', 'grupoCompra', 'codigoLiberacion', 'fechaContabilizacion'].every(k => s[k]) && s.detalles.length > 0 && s.detalles.every(d => d.ceBe && d.cuenta); },
      ejecutar: (z, ctx) => S.configurar(z.m, z.c.id, S.ejemploConfiguracion(z.m, z.c.id), ctx) });
  sap('pedido', 1, 'Crear el pedido SAP simulado', 'Crear pedido', s => !!s?.pedido, 1);
  agregar('aprobacion-log', 'sapconectado', 2, 'Registrar la aprobación interna de logística',
    'Aprueba internamente la conciliación: Pendiente de Aprobacion → Pendiente de Liberacion. Es una decisión distinta de la conformidad transportista y de liberar el pedido SAP.', () => S.EVIDENCIAS[2], {
      comprobado: z => ['Pendiente de Liberacion', 'Liberado'].includes(z.c?.estado), ejecutar: (z, ctx) => S.aprobarLOG(z.m, z.c.id, ctx) });
  sap('liberar-pedido', 2, 'Liberar el pedido de compra', 'Liberar pedido', s => s?.liberacion === 'SI', 2);
  sap('hoja-servicio', 3, 'Registrar la hoja de entrada de servicio', 'Registrar hoja de entrada', s => !!s?.hoja, 3);
  sap('aceptar-hoja', 4, 'Aceptar la hoja SAP sin declarar un pago', 'Liberar hoja', s => s?.aceptacion === 'SI' && s.estado === 'Aceptado', 4);
  leer('reversiones-sap', 'sapconectado', 5, 'Estudiar anulaciones en orden inverso',
    'Aceptación → hoja → liberación de pedido → pedido se revierten respetando dependencias. Al anular aceptación V1 puede dejar la conciliación Liberado: se muestra como inconsistencia, no se corrige en silencio. No anules el ciclo principal sólo por visitar este paso.', () => S.EVIDENCIAS[5]);
  leer('errores-sap', 'sapconectado', 6, 'Estudiar errores remotos y confirmación local',
    'Lee éxito remoto seguido de fallo local: reintentar a ciegas puede duplicar. La recuperación idempotente es PROPUESTA. Simular APP_EXTERNA deja SAP en sólo lectura y no debe ser ignorado por «Hazlo por mí». No se ha probado una integración SAP real.', () => S.EVIDENCIAS[6]);
  leer('reporte-pago', 'pagoscierre', 1, 'Consultar qué muestra Pagos Logística en V1',
    'Revisa flete, merma, incumplimiento, neto y casos del reporte RPT_CostosTransporte. No es una consulta de transferencias. Liberado/Aceptado y FacturasPagadas no acreditan el pago del flete; no inventes estado V1 Pagado.', () => P.EVIDENCIAS[1]);
  leer('usos-contrato', 'contratos', 6, 'Comprobar el uso económico y la reversión contractual',
    'Revisa el uso derivado de esta conciliación: contrato/adenda/tarifa, CRE y fecha. El índice diferencia vigente/retirado y no duplica el flete. Compara el control defectuoso V1 por fecha con la protección propuesta por relaciones, sin revertir la versión usada durante este viaje.', evAdenda);
  agregar('acuerdo-pago', 'pagoscierre', 3, 'Acordar el importe del seguimiento propuesto',
    'PROPUESTA: revisa factura, pedido y deducciones con Finanzas. Para el laboratorio acuerda el importe de la factura propuesta con una referencia y justificación ficticias; no se toma el neto como pago automático ni se compensan multas en silencio.', () => P.EVIDENCIAS[3], {
      propuesta: true, comprobado: z => !!z.c?.pagoCierrePropuesto && P.vigente(z.c),
      ejecutar: (z, ctx) => P.acordar(z.m, z.c.id, { importe: z.c.facturacion.servicioPropuesto.total, referenciaFinanzas: 'REV-FIN-ORIENTE-2026', justificacion: 'Estudio: importe del documento del servicio, con cobros/deducciones separados y pendientes de evidencia real.' }, ctx) });
  agregar('abono-parcial', 'pagoscierre', 4, 'Recibir una evidencia ficticia de abono parcial',
    'PROPUESTA: prepara «parcial» y recibe la evidencia simulada con la identidad de la misma conciliación, empresa, pedido, hoja y factura/revisión. Conserva un evento único. No se ejecuta una transferencia bancaria.', () => P.EVIDENCIAS[4], {
      propuesta: true, comprobado: z => (z.c?.pagoCierrePropuesto?.movimientos || []).some(a => a.tipo === 'abono'),
      ejecutar: (z, ctx) => P.consultar(z.m, z.c.id, P.ejemplo(z.m, z.c, 'parcial'), ctx) });
  agregar('completar-abono', 'pagoscierre', 4, 'Completar y verificar el importe del laboratorio',
    'PROPUESTA: recibe «completar», verifica saldo cero y ausencia de exceso. Sin información o con un servicio no disponible no se concluye saldo cero. Repetir la misma evidencia no debe duplicar el movimiento.', () => P.EVIDENCIAS[4], {
      propuesta: true, comprobado: z => { if (!z.c) return false; const r = P.resumen(z.m, z.c); return r.puedeCerrar || r.cierre === 'Cerrado en laboratorio (propuesta)'; },
      ejecutar: (z, ctx) => P.consultar(z.m, z.c.id, P.ejemplo(z.m, z.c, 'completar'), ctx) });
  agregar('cerrar-seguimiento', 'pagoscierre', 5, 'Cerrar sólo el seguimiento financiero propuesto',
    'PROPUESTA: confirma revisión y explica aparte la situación de merma/incumplimiento. El cierre exige documentos vigentes, importe cubierto y evidencia disponible del día simulado. La conciliación V1 permanece Liberado; no se certifica un pago real.', () => P.EVIDENCIAS[5], {
      propuesta: true, comprobado: z => !!z.c && P.resumen(z.m, z.c).cierre === 'Cerrado en laboratorio (propuesta)',
      ejecutar: (z, ctx) => P.cerrar(z.m, z.c.id, { revisado: true, notaCobros: 'Revisión ficticia: merma e incumplimiento siguen como cobros separados; no se compensan ni se declaran pagados automáticamente.' }, ctx) });
  leer('reabrir-seguimiento', 'pagoscierre', 5, 'Estudiar reversiones, cambios y reapertura',
    'PROPUESTA: una reversión conserva el abono original; cambiar factura, importes o ciclo SAP vuelve obsoleta la fotografía. Hay que aclarar y reabrir, no borrar historial ni reactivar un cierre porque la hoja vuelva a aceptarse. Es una rama de estudio, no una reversión ocurrida en el caso principal.', () => P.EVIDENCIAS[5]);
  leer('cierre-mensual', 'pagoscierre', 6, 'Separar cierre mensual de pago del transporte',
    'El cierre mensual de movimientos valida localidad/producto y diferencias del período; no es cierre financiero de esta conciliación. Estudia el OR de documentos SAP y la continuación del llamador. No se cierra ningún mes real desde el prototipo.', () => P.EVIDENCIAS[6]);
  leer('mapa-final', 'otmapa', 0, 'Verificar todo el expediente y sus límites',
    'En «Mis documentos» recorre contrato/adenda → SHR/línea → HR → orden/detalle → CRE despacho/recepción → multas de ambas fuentes y conciliación → referencias/factura propuesta → pedido/hoja SAP → evidencia y cierre propuestos. A-05 está conectada; los otros límites de captura siguen identificados y no se declaran implementados por terminar la guía.', () => P.EVIDENCIAS[7]);

  // Rellenar borradores sin persistir operaciones ni descartar lo escrito por el usuario.
  G.datosContrato = () => ({ empresaId: X.empresaId, numero: 'CIS-ORIENTE-2026', inicio: '2026-01-01', fin: '2026-12-31', moneda: 'Bs' });
  G.datosAdenda = () => ({ tipo: 'MCOND', inicio: '2026-09-16', observacion: 'Incorporar Gasolina Especial al recorrido guiado.' });
  G.datosSolicitud = z => ({ ...X, inicio: z.m.hoy, detalles: [{ productoId: X.productoId, registroId: z.m.recorridoHR.registros.find(r => r.origenId === X.origenId && r.productoId === X.productoId).id, volumen: X.volumen }] });
  G.ejemploCasos = z => [{ multaId: 12, monto: -120, moneda: 'Bs.', volumen: 0, productoId: X.productoId, factura: 'CE-DOC-018', observacion: 'Ajuste documental ficticio, distinto de multas y merma.' }, { multaId: 12, monto: 20, moneda: 'Bs.', volumen: 0, productoId: X.productoId, factura: 'CE-REG-019', observacion: 'Regularización documentada ficticia, no bonificación automática.' }];
  G.prefijar = id => {
    const z = G.expediente(); if (!z) return;
    const p = pasos.find(p => p.id === id), ui = SILOG.estudioContratosUI.vista();
    if (id === 'contrato') ui.borradorContrato ||= G.datosContrato();
    if (id === 'adenda') ui.borradorAdenda ||= G.datosAdenda();
    if (id === 'consulta-tarifa') ui.consulta = { empresaId: X.empresaId, origenId: X.origenId, destinoId: X.destinoId, productoId: X.productoId, prioridad: 'PRINCIPAL', fecha: z.m.hoy, volumen: X.recibido };
    if (id === 'activar-solicitud') { const v = SILOG.estudioHRUI.vista(); if (!z.s && !v.guiaPreparada) { const d = G.datosSolicitud(z); v.borrador = d; v.filas = d.detalles; v.guiaPreparada = true; } }
    if (id === 'crear-orden' && !z.o) SILOG.estudioOrdenesUI.vista().cab = { origenId: X.origenId, medioId: X.medioId, fecha: z.m.hoy };
    if (id === 'generar-conciliacion' || id === 'pendientes') {
      const v = SILOG.estudioConciliacionesUI.vista(), grupo = B.pendientes(z.m).grupos.find(g => g.recepciones.some(r => r.rec.id === z.ids.recepcion));
      if (grupo) v.grupo = grupo.clave;
    }
    if (id === 'origen-carro-guia') SILOG.estudioAdicionalesUI.vista().formularios.origen ||= { empresaGuiaId: 9501, fecha: z.m.hoy, costo: 300, especial: 0, ['detalle_' + z.ids.detalle]: true };
    if (id === 'guardar-casos' && !N.casos(z.c).length) SILOG.estudioAdicionalesUI.vista().casosEditados ||= G.ejemploCasos(z).map(r => ({ ...r, tcPropuesto: '', fuenteTC: '' }));
    // La pantalla actual ya maneja su formulario; no trasladar borradores entre ejercicios.
    if (p) return p.vista;
  };
  G.pasos = pasos; SILOG.TOUR = pasos;
  const escenario = SILOG.escenarioPorId('T');
  escenario.tour = pasos; escenario.guion = pasos.map(p => ({ titulo: p.titulo, vista: p.vista, paso: p.hacer, esperado: p.veras }));
})(SILOG.tourConectado);

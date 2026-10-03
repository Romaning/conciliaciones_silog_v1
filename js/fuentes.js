/*
 * Trazabilidad: de dónde se extrajo cada parte del prototipo en SILOG_V1.
 *
 * SQL_LINEAS indica la línea donde empieza cada objeto en
 * SILOG_V1/SSCC/YPFBRLogistica_SVMRSCDBWSD_14122020.sql (UTF-16; la numeración coincide con su
 * conversión a UTF-8). Cada objeto SQL citado tiene su copia en ../EXTRACCION_SQL_CONCILIACIONES/.
 *
 * Rutas de código relativas a SILOG_V1/. Abreviaturas:
 *   UC/  = LOGISTICA/UserControls/
 *   BF/  = SYSLOGDISENO/Working Version/SYSLOGISTICABusinessFramework/
 */
window.SILOG = window.SILOG || {};

(function () {
  const L = {
    // Tablas
    Localidad: 22538, AreaInfluencia: 18699, Refineria: 25689, Producto: 25336, ProductoPrecio: 25406, MA_PrecioProductoImportado: 23330,
    MedioTransportePropietario: 24380, Cisterna: 19217, Conductor: 20688, TransportistaUsuario: 27364,
    MC_Contrato: 23814, MC_ContratoHistorial: 23857, MC_ContratoMarco: 23894, MC_ContratoMarcoPresupuesto: 23933, MC_TipoContrato: 24279, MC_TarifaOT: 24212,
    TarifarioOtrosTransportes: 27038, TarifarioCisternaNacional: 26998,
    OrdenDeDespacho: 24998, OrdenDespachoDetalle: 25029, OrdenDespachoParcial: 25055, CREOrdenDespacho: 21446, NroOrdenProximo: 24871,
    CRE: 21083, CREAsociacion: 21249, TipoCRE: 27121, Lote: 22650, CREProximo: 21495, MedicionPlanta: 24333,
    HojaRutaCRE: 22395, SolicitudHojaDeRuta: 26773, SolicitudHRDetalle: 26832, CREAsociacionHojaRuta: 21264,
    Multa: 24594, MultaPorIncumplimiento: 24613, MC_MultasDescuentos: 24015, MC_MultasDescuentosDetalle: 24042, MC_MultasDescuentosDetalleEmpresas: 24075,
    MC_MultaDescuentoConciliacion: 23988, DetalleCasosConciliacionCisterna: 21623, CG_CobroCarroGuia: 19010, CG_ConciliacionCarroGuia: 19079, CG_ConciliacionEmpresaCobro: 19095,
    ConciliacionCisterna: 19809, ConciliacionCisternaDetalle: 19855, ConciliacionPeriodo: 20418, NroConciliacionProximo: 24862, Anio: 18669,
    CONFIGURACION_CONCILIACIONES: 20733, ConciliacionArea: 19588, SAP_ConciliacionMaster: 26232, SAP_ConciliacionDetail: 26210, SINC_ConfiguracionServicio: 26712,
    CuentaContable: 21533, CuentaContableVigencia: 21562, CuentaContableProductoTipoConciliacion: 21550, MANEJO_DE_ERRORES: 23660,
    // Procedimientos
    DetalleDeCisternasSinConciliar: 54696, CisternasSinConciliar: 52684, CargarConciliacionCisterna: 48137, ObtenerTotalesConciliacion: 67784,
    ObtenerMontosDeConciliacion: 66652, ObtenerPrecioProducto: 67290, DatosCRE: 53719, CargarCREsDespachos: 49660, MC_ObtenerMonedaContratoEmpresa: 61837,
    MC_ObtenerEjecucionContratoMarco: 61431, MC_CargarMultasYDescuentosConciliacion: 60656, MC_CargarMultasParaCRE: 60613, CG_CargarCobrosCarroGuiaParaConciliacion: 52161,
    CG_CargarIDsParaRegistroConciliacion: 52529, CasosConciliacionCisterna: 52127, FacturasPendienteAPagar: 55255, NroConc_Proximo: 62505, NroCREProximo: 62522,
    NroOrdeProximo: 62551, ObtenerFletesConciliacion: 65447, CargarConciliacionesSinContabilizar: 48954, CargarDetalleOrdenDespacho: 50094, ConciliacionesPorEmpresa: 52939,
    PlantasPorArea: 68441, ObtenerLocalidadesPorAreaInfluencia: 65908, MC_CargarRutasParametrizadas: 60792,
    // Funciones
    MC_DevolverTarifaVigente_OT: 10224, MC_ExisteRutaConTarifaVigenteAsociada_OT: 10520, MC_ExisteContratoVigente: 10365, MC_ObtenerFechaContrato: 11078,
    _RPT_ObtenerTipoDeCambio: 8419, TotalMultasPorIncumplimiento: 18135, MC_ObtenerMultaDescuentoAplicado: 11118, ObtenerCuentaContableVigente: 12296,
    MC_ExisteEnConciliacion: 10416, MC_ExisteMultaDescuentoEnConciliacion: 10496, ObtenerPeriodoTxtConciliacion: 12952, CREConciliado: 8922, ExisteQuincena: 9318,
    MC_ObtenerDetalleProductoTarifa: 10647,
    // Otros Transportes
    CARGAR_DATOS_CONCILIACION_OT: 47341, MC_ObtenerPrioridadesTarifas: 61860, ObtenerTarifaAsociadaSHR: 14305, MC_ObtenerContratoMarco: 61291,
    DetalleDeBarcazasSinConciliar: 54645, DetalleDeVagonesSinConciliar: 54861, ObtenerRecepcionsOTs: 67570, ObtenerBalanceCisternasPorDespacho: 63486,
    ObtenerBalanceVagonesPorDespacho: 63600, CargarRutasSHR: 51461, MC_ObtenerLocalidadesPorMedioT: 61804, ObtenerLotesEnTransito: 66048,
    Alerta: 18613, ConciliacionBarcaza: 19600, ConciliacionBarcazaDetalle: 19643, ConciliacionVagon: 20498, ConciliacionVagonDetalle: 20542,
    BarcazaBone: 18891, Vagon: 27445, CREBarcaza: 21290,
    // Vistas
    vwConciliacionesPorTransportista: 27785, vwLocalidad: 28168, TarifarioOT: 27583, vw_RutasTarifas: 27687
  };
  const PREFIJO = { Tabla: 'Table', Procedimiento: 'StoredProcedure', 'Función': 'UserDefinedFunction', Vista: 'View' };

  // Elementos reutilizables: [tipo, nombre, ubicación, uso]
  const T = (n, uso) => ['Tabla', n, null, uso];
  const P = (n, uso) => ['Procedimiento', n, null, uso];
  const F = (n, uso) => ['Función', n, null, uso];
  const W = (n, uso) => ['Vista', n, null, uso];
  const PAN = (n, uso) => ['Pantalla', n, 'LOGISTICA/' + n, uso];
  const UC = (n, lineas, uso) => ['Control de usuario', n, 'LOGISTICA/UserControls/' + n + (lineas ? ':' + lineas : ''), uso];
  const VB = (n, ruta, uso) => ['Código VB', n, ruta, uso];
  const EXT = (n, ubic, uso) => ['Otra base o sistema', n, ubic, uso];
  const SIN_TRIGGERS = ['Trigger', 'Ninguno', 'Búsqueda de CREATE/ALTER/ENABLE/DISABLE TRIGGER en los dos scripts SQL de SSCC, los scripts de sprint y todo el código de SILOG_V1', 'No existen triggers: la auditoría y los efectos secundarios se programan en el código (por ejemplo, INSERT en SILOG_Auditoria desde AdmUtilitariosConciliacion.Insertar/Modificar/Eliminar).'];
  const AUDITORIA = EXT('SILOG_Auditoria', 'Base de datos AUDITORIA (cadena de conexión "AUDITORIA" en web.config); no incluida en el script', 'Registro del texto del SQL ejecutado en cada INSERT/UPDATE/DELETE (AdmUtilitariosConciliacion.vb:1015-1157).');
  const SEGURIDAD = EXT('YPFBRSeguridad / Session("AccesoActividades")', 'LOGISTICA/App_Code/BasePage.vb; SYSLOGDISENO/Working Version/YPFBRSeguridadCliente/ClaseDLL.vb', 'Actividades permitidas al usuario; Autorizacion(actividad) devuelve 2 si está permitida.');

  SILOG.FUENTES = {
    simulador: {
      resumen: 'Combina la búsqueda de tarifa y precio que hace la generación de conciliaciones con la creación de orden, CRE y asociación.',
      items: [
        UC('DetalleSinConciliar.ascx.vb', '1551-1576', 'Decide entre tarifa asociada a la hoja de ruta y tarifa vigente; fecha de recepción como fecha de búsqueda.'),
        VB('AdmUtilitariosConciliacion.DevolverTarifa', 'BF/AdmUtilitariosConciliacion.vb:908-922', 'Llama a MC_DevolverTarifaVigente_OT con prioridad PRINCIPAL o ALTERNA.'),
        F('MC_DevolverTarifaVigente_OT', 'Tarifa o admisible vigente; divide la tarifa entre 1000 salvo vagones.'),
        F('MC_ObtenerFechaContrato', 'Fecha de fin del contrato usada como límite de vigencia de la tarifa.'),
        F('MC_ExisteRutaConTarifaVigenteAsociada_OT', 'Tarifa asociada en SolicitudHRDetalle.TarifaOTID.'),
        P('ObtenerPrecioProducto', 'Precio de multa vigente; importado si el origen es extranjero.'),
        T('MC_TarifaOT', 'Tarifas por ruta y producto.'), T('MC_Contrato', 'Empresa y tipo de contrato.'), T('MC_ContratoHistorial', 'Versión del contrato y estado LIBERADO.'),
        T('Localidad', 'Origen, destino y nacionalidad.'), T('AreaInfluencia', 'Área de conciliación del origen.'), T('ProductoPrecio', 'Precio de multa nacional.'), T('MA_PrecioProductoImportado', 'Precio importado.'),
        ['Prototipo', 'Mapa esquemático', null, 'No existe en V1: coordenadas aproximadas de Localidad.LocalidadLongitud/Latitud con valores ficticios.'],
        SIN_TRIGGERS
      ]
    },
    localidades: {
      resumen: 'Maestro geográfico que usan órdenes, CRE, tarifas y el área de conciliación.',
      items: [
        PAN('Localidad.aspx', 'Mantenimiento de localidades.'), UC('LocalidadComponent.ascx', '', 'Formulario de la localidad.'), PAN('LocalidadWorkWith.aspx', 'Listado.'),
        T('Localidad', 'LocalidadCodigo, LocalidadCodigoCRE, LocalidadNacionalidad, LocalidadTipo, coordenadas.'),
        T('AreaInfluencia', 'SitioIDConciliaciones: 1 RSCZ, 2 RCBA.'), T('Refineria', 'Abreviatura del área (RefineriaAbr).'),
        W('vwLocalidad', 'Vista de localidades.'), P('ObtenerLocalidadesPorAreaInfluencia', 'Localidades por área.'), P('PlantasPorArea', 'Plantas de un área (AdmUtilitariosConciliacion.PlantasPorArea).'),
        EXT('LocalidadController (LEGACY-BACKEND)', 'SILOG_LEGACY_BACKEND/src/Api/ApiSilog/Controllers/LocalidadController.cs', 'Exposición actual por API; referencia para reemplazar los nodos de DESTINO.'),
        SIN_TRIGGERS
      ]
    },
    tarifario: {
      resumen: 'Las tarifas que usa la conciliación (MC_TarifaOT) se registran dentro del contrato y se habilitan cuando la versión del contrato se libera. La pantalla TarifarioOtrosTransportes.aspx administra una tabla anterior que la conciliación de cisternas ya no usa.',
      items: [
        PAN('ContratoDetalle.aspx', 'Registro del contrato, sus versiones (adendas) y sus tarifas.'),
        UC('ContratoDetalle.ascx.vb', '1304-1392', 'btnRegistrarTarifas_Click: INSERT en MC_TarifaOT (línea 1358).'),
        UC('ContratoDetalle.ascx.vb', '1908-1980', 'gvHistorialContrato_RowCommand: EN ELABORACION → PENDIENTE DE APROBACION ("MC Puede Solicitar AP") → PENDIENTE DE LIBERACION ("MC Puede Solicitar LB") → LIBERADO ("MC Puede Liberar"); al liberar pone AprobacionTarifa = 1; el rechazo se niega si MC_ExisteEnConciliacion.'),
        PAN('AdministracionContrato.aspx', 'Alta de contratos.'), UC('AdministracionContrato.ascx.vb', '544, 823', 'INSERT en MC_TarifaOT.'),
        UC('PanelDeSistema.ascx.vb', '1845-1870', 'gvTarifas_RowCommand: aprueba (AprobacionTarifa = 1) o elimina tarifas pendientes.'),
        T('MC_Contrato', 'Contrato: empresa, tipo, moneda, contrato marco.'), T('MC_ContratoHistorial', 'Versiones con vigencia y estado.'), T('MC_TipoContrato', 'TablaDetalle = MC_TarifaOT para transporte.'),
        T('MC_ContratoMarco', 'Contrato marco, moneda y ControlaPresupuesto.'), T('MC_ContratoMarcoPresupuesto', 'Programado por año y versión.'),
        T('MC_TarifaOT', 'Tarifa, Admisible, Prioridad, Estado, AprobacionTarifa, MaestroRutaID.'),
        P('MC_ObtenerEjecucionContratoMarco', 'Ejecutado por año = suma de NetoFleteFacturable de las conciliaciones del contrato marco.'),
        F('MC_ExisteEnConciliacion', 'Impide revertir una versión de contrato ya usada en conciliaciones.'),
        PAN('TarifarioOtrosTransportes.aspx', 'Tarifario anterior (tabla TarifarioOtrosTransportes); no lo usa la conciliación de cisternas actual.'),
        T('TarifarioOtrosTransportes', 'Tarifario anterior.'), W('TarifarioOT', 'Vista del tarifario anterior.'),
        T('TarifarioCisternaNacional', 'Tabla anterior; AdmUtilitariosConciliacion.CargarTarifas la consulta pero DetalleSinConciliar no llama a esa función.'),
        ['Prototipo', 'Agregar tarifa / dar de baja', null, 'Simplificación: en V1 la tarifa se agrega dentro de una versión del contrato y se habilita al liberarla.'],
        SIN_TRIGGERS
      ]
    },
    precios: {
      resumen: 'Precio de multa con el que se valoriza la merma no admisible.',
      items: [
        PAN('PrecioProducto.aspx', 'Mantenimiento de precios.'), UC('PrecioProductoComponent.ascx', '', 'Formulario.'), PAN('PrecioCompraImportado.aspx', 'Precios de importación.'),
        P('ObtenerPrecioProducto', 'Elige ProductoPrecio o MA_PrecioProductoImportado según LocalidadNacionalidad del origen del despacho.'),
        T('ProductoPrecio', 'PPTnacional, PrecioMulta, VigenciaInicio.'), T('MA_PrecioProductoImportado', 'Precio, Moneda, TC y vigencia.'), T('MedioTransportePropietario', 'MedioTransporteMonedaPago para convertir el precio importado.'),
        UC('DetalleSinConciliar.ascx.vb', '1610-1627', 'Toma el primer precio con VigenciaInicio ≤ fecha de carga del despacho.'),
        SIN_TRIGGERS
      ]
    },
    ordenes: {
      resumen: 'Autoriza la carga de cada cisterna y origina el CRE de despacho.',
      items: [
        PAN('OrdenesDeDespacho.aspx', 'Listado.'), UC('OrdenesDeDespacho.ascx.vb', '118-146', 'CargarOrdenesDeDespacho.'),
        PAN('DetalleOrdenDespacho.aspx', 'Detalle de la orden.'),
        UC('DetalleOrdenDespacho.ascx.vb', '1542-1719', 'btnEstado_Click: estados de la orden, número correlativo y correo "Nómina Autorizada de Carga".'),
        UC('DetalleOrdenDespacho.ascx.vb', '1474-1540', 'ValidarCreaciondeCRES: mismo producto, empresa, destino y ruta.'),
        UC('DetalleOrdenDespacho.ascx.vb', '1259-1429', 'ObtenerLoteIDCisterna y CrearCREDespachoOrdenVariable.'),
        UC('DetalleOrdenDespacho.ascx.vb', '86-140', 'Actividades "Anular Orden", "Imprimir Orden", "Modificar Orden".'),
        VB('AdmCRE.NumeroOrdenProximo', 'BF/AdmCRE.vb:35', 'Ejecuta NroOrdeProximo por terminal.'),
        P('CargarDetalleOrdenDespacho', 'Detalle con CRE de despacho y de recepción vinculados.'), P('NroOrdeProximo', 'Número de orden por terminal.'), P('NroCREProximo', 'Número de CRE (contador global serializable).'),
        T('OrdenDeDespacho', 'Cabecera, estado y usuarios de cada estado.'), T('OrdenDespachoDetalle', 'Destino, producto, empresa, conductor, cisterna, volumen, hoja de ruta.'), T('OrdenDespachoParcial', 'Habilitación parcial.'),
        T('NroOrdenProximo', 'Contador y bandera OrdenVariable.'), T('CREOrdenDespacho', 'Vínculo detalle ↔ CRE de despacho y de recepción.'),
        T('SolicitudHojaDeRuta', 'Ruta a seguir del viaje.'), T('SolicitudHRDetalle', 'TarifaOTID asociada al viaje.'), T('HojaRutaCRE', 'EstadoHojaRuta = EN TRANSITO al crear el CRE.'),
        UC('SolicitudHojaRuta.ascx.vb', '1277', 'INSERT en SolicitudHRDetalle con TarifaOTID.'),
        SEGURIDAD, AUDITORIA, SIN_TRIGGERS
      ]
    },
    cre: {
      resumen: 'Certificados de despacho (tipo 3) y recepción (tipo 8) y su asociación.',
      items: [
        PAN('CRECisterna.aspx', 'Registro de CRE de cisterna.'), UC('CRECisterna.ascx.vb', '2625', 'INSERT en CREAsociacion (recepción ↔ despachos).'),
        UC('CRECisterna.ascx.vb', '735-760, 1862', 'Consulta de despachos asociados y control de asociación.'), UC('CRECisterna.ascx.vb', '3357', 'INSERT en CREAsociacionHojaRuta.'),
        PAN('CREAsociacion.aspx', 'Consulta de asociaciones.'), UC('CREAsociacion.ascx.vb', '6-120', 'Búsqueda y listado de CRE asociados.'),
        T('CRE', 'TipoCREID, CREFecha, CREFechaDespacho, CREPlantaOrigen/Destino, CREVolumenConsolidadoLTS, LoteID, CREAdmViaje, EstadoID.'),
        T('CREAsociacion', 'CREIDRecepcion, CREIDEntrega.'), T('TipoCRE', '3 despacho, 8 recepción de cisterna.'), T('Lote', 'LoteCodigo OT-CIS-…'),
        T('Cisterna', 'Placa y transportista dueño.'), T('MedicionPlanta', 'Tipo de medición del tanque al crear el CRE desde la orden.'), T('CREProximo', 'Contador de CRE.'),
        P('DatosCRE', 'Datos del CRE para la conciliación (AdmUtilitariosConciliacion.CargarDatosCRE).'),
        SIN_TRIGGERS
      ]
    },
    multas: {
      resumen: 'Multas por incumplimiento registradas sobre el CRE de despacho.',
      items: [
        PAN('MultasPorIncumplimiento.aspx', 'Página que contiene el control.'),
        UC('MultasPorInclumpliento.ascx.vb', '30-97', 'Carga del catálogo y de las multas del CRE (IDs 2, 4, 5, 6, 8, 9); TC por defecto 7,07.'),
        UC('MultasPorInclumpliento.ascx.vb', '179-238', 'btnCalcular_Click: fórmulas, incluida la filtración con 15 %.'),
        UC('MultasPorInclumpliento.ascx.vb', '272-330', 'btnRegistrar_Click: bloqueo según el estado de la conciliación; borra y reinserta.'),
        VB('AdmUtilitariosConciliacion.DevolverEstadoConciliacion', 'BF/AdmUtilitariosConciliacion.vb:880-892', 'Estado de la conciliación que contiene el despacho.'),
        VB('AdmUtilitariosConciliacion.DevolverSumaEntregaDespacho', 'BF/AdmUtilitariosConciliacion.vb:438-448', 'Volumen entregado para la multa por filtración.'),
        P('CargarCREsDespachos', 'Despachos del transportista y mes, y detalle del CRE.'),
        F('TotalMultasPorIncumplimiento', 'Total en Bs por CRE (Sus × TC; filtración por total).'),
        T('Multa', 'Catálogo: valor, moneda, tipo, habilitado.'), T('MultaPorIncumplimiento', 'Multas registradas por CRE.'),
        AUDITORIA, SIN_TRIGGERS
      ]
    },
    sinconciliar: {
      resumen: 'Selecciona recepciones pendientes, calcula cada línea y genera la conciliación.',
      items: [
        PAN('DetalleSinConciliar.aspx', 'Página.'),
        UC('DetalleSinConciliar.ascx.vb', '7-44', 'Áreas y tipos de conciliación permitidos por usuario (CONFIGURACION_CONCILIACIONES); sin permiso → SinAcceso.aspx.'),
        UC('DetalleSinConciliar.ascx.vb', '1413-1439', 'InicializarMonedaConciliacion.'),
        UC('DetalleSinConciliar.ascx.vb', '1442-1665', 'CargarDetalleCisternas: prorrateo, tarifa, admisible, balance, C/D, flete, precio y total.'),
        UC('DetalleSinConciliar.ascx.vb', '1666-1692', 'ObtenerValorA2Decimales (truncado a 2 decimales).'),
        UC('DetalleSinConciliar.ascx.vb', '2002-2115', 'DatosCorrectos: moneda, selección y control presupuestario.'),
        UC('DetalleSinConciliar.ascx.vb', '2117-2244', 'ExisteEnConciliacion y GenerarConciliacionCisterna (INSERT cabecera y detalle).'),
        UC('DetalleSinConciliar.ascx.vb', '1979-2000', 'PROCESAR_CONCILIACION: totales iniciales.'),
        VB('AdmUtilitariosConciliacion (redondeos)', 'BF/AdmUtilitariosConciliacion.vb:934-995', 'RedondearHaciaAdelante y RedondearHaciaAdelanteAdmisible.'),
        P('DetalleDeCisternasSinConciliar', 'Modo "Transportistas" (agrupa, 90 días, contrato vigente, excluye ID 77) y modo "Recepciones".'),
        F('MC_ExisteContratoVigente', 'Filtra transportistas con contrato.'), P('MC_ObtenerMonedaContratoEmpresa', 'Moneda del contrato.'),
        P('MC_ObtenerEjecucionContratoMarco', 'Ejecutado del contrato marco.'), F('_RPT_ObtenerTipoDeCambio', 'TC a la fecha fin para el control presupuestario.'),
        F('MC_DevolverTarifaVigente_OT', 'Tarifa y admisible.'), F('MC_ExisteRutaConTarifaVigenteAsociada_OT', 'Tarifa asociada.'), P('ObtenerPrecioProducto', 'Precio de multa.'),
        P('ObtenerTotalesConciliacion', 'Totales por producto.'), P('NroConc_Proximo', 'Número de conciliación global.'),
        T('CRE', 'Recepciones y despachos.'), T('CREAsociacion', 'Asociación.'), T('ConciliacionCisterna', 'Cabecera insertada.'), T('ConciliacionCisternaDetalle', 'Detalle insertado.'),
        T('CONFIGURACION_CONCILIACIONES', 'Permisos de área y tipo por usuario.'), T('NroConciliacionProximo', 'Contador.'),
        T('MC_Contrato', 'Contrato y contrato marco.'), T('MC_ContratoMarco', 'Control de presupuesto.'), T('MC_ContratoMarcoPresupuesto', 'Programado.'),
        AUDITORIA, SIN_TRIGGERS
      ]
    },
    conciliaciones: {
      resumen: 'Revisión, ajustes, procesamiento y estados de la conciliación de cisterna.',
      items: [
        PAN('ConciliacionCisterna.aspx', 'Página.'),
        UC('ConciliacionCisterna.ascx.vb', '134-136', 'Actividad "Cambiar Tarifa" para mostrar el botón.'),
        UC('ConciliacionCisterna.ascx.vb', '151-166', 'CargarEstadosOtorgados: la lista de acciones solo ofrece "Rechazar Conciliacion", "Solicitar Aprob. Transportista", "Transportista Aprueba" y "Transportista Rechaza" si el usuario tiene la actividad; "Solicitar Aprobacion LOG", "Solicitar Liberacion" y "Liberar Conciliacion" están comentadas.'),
        UC('ConciliacionCisterna.ascx.vb', '256-497', 'btnCargar_Click: carga con CargarConciliacionCisterna.'),
        UC('ConciliacionCisterna.ascx.vb', '779-874', 'CargarDetalle: multas por CRE en la primera línea de cada despacho.'),
        UC('ConciliacionCisterna.ascx.vb', '1027-1140', 'Totales por recepción, por producto (compensación) y de cabecera.'),
        UC('ConciliacionCisterna.ascx.vb', '1151-1296', 'btnProcesar_Click: borra y reinserta el detalle; umbral 50.000.'),
        UC('ConciliacionCisterna.ascx.vb', '1319-1429', 'btnCalcular_Click: liberar capacidad, tarifa especial, liberar merma.'),
        UC('ConciliacionCisterna.ascx.vb', '1439-1629', 'btnEstado_Click: transiciones, SAP y alertas.'),
        UC('ConciliacionCisterna.ascx.vb', '1836-1897', 'Cambio a tarifa PRINCIPAL o ALTERNA.'),
        P('CargarConciliacionCisterna', 'Listado por transportista, mes, año, área y quincena.'), P('ObtenerMontosDeConciliacion', 'Flete, mermas, multa transporte, MC, DC, carro guía y casos.'),
        F('MC_ObtenerMultaDescuentoAplicado', 'Monto de recargos por tipo (CCIST, MC, DC), con filtración aparte.'), F('TotalMultasPorIncumplimiento', 'Multas por CRE.'),
        P('FacturasPendienteAPagar', 'Bloqueo por facturas impagas > 50.000.'),
        T('ConciliacionCisterna', 'Estado, totales, facturas, usuarios por estado, FacturasPagadas.'), T('ConciliacionCisternaDetalle', 'Líneas y ajustes (LiberarCapacidad, LiberarMerma, TarifaEspecialBs).'),
        T('ConciliacionPeriodo', '1ra / 2da quincena.'), T('Anio', 'Año de la conciliación.'),
        SEGURIDAD, AUDITORIA, SIN_TRIGGERS
      ]
    },
    ot: {
      resumen: 'Pantalla unificada de cisterna, barcaza y vagón con permisos finos por usuario. Estudio completo en CONCILIACION_OTROS_TRANSPORTES_V1.md.',
      items: [
        PAN('ConciliacionOtrosTransportes.aspx', 'Página.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '66-110', 'Tipos y áreas permitidos (CONFIGURACION_CONCILIACIONES); sin permiso → SinAcceso.aspx.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '112-221', 'InicializarPermisos: botones Aprobar/Rechazar por estado y edición según PuedeProcesar, PuedeLiberarMerma, PuedeLiberarCapacidad, PuedeCambiarTarifa, PuedeColocarTarifaEspecial, PuedeEditarFechas.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '247-269', 'Rango de fechas por quincena o mes.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '307-419', 'btnActualizar_Click: cabecera, totales y lista de tarifas P/A1…/0 por recepción.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '421-507', 'Excluir recepción y sus recargos.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '533-591', 'PROCESAR_CONCILIACION (neto con multa transporte) y columna Totales.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '593-775', 'btnProcesar_Click: liberar capacidad, tarifa, tarifa especial, liberar merma; barcaza con compensación de capacidad.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '863-916', 'Selección de fila, recargos y apertura del nuevo convoy.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '918-1276', 'Aprobar por tipo: estados, SAP, correos; facturas impagas en Pendiente de Aprobacion.'),
        UC('ConciliacionOtrosTransportes.ascx.vb', '1356-1394', 'Rechazar sin verificar SAP.'),
        PAN('ConciliacionOTDetalle.aspx', 'Nuevo convoy.'),
        UC('ConciliacionOTDetalle.ascx.vb', '462-664', 'Cálculo de líneas de cisterna (igual a DetalleSinConciliar).'),
        UC('ConciliacionOTDetalle.ascx.vb', '202-402', 'Barcaza: sin prorrateo; capacidad máxima del bone.'),
        UC('ConciliacionOTDetalle.ascx.vb', '695-922', 'Vagón: kg, peso específico, flete por toneladas.'),
        UC('ConciliacionOTDetalle.ascx.vb', '1003-1097', 'Agrega líneas a la conciliación existente; rechaza duplicados.'),
        P('CARGAR_DATOS_CONCILIACION_OT', 'CABECERA: conciliaciones del periodo; DETALLE: una fila por recepción con sumas y promedios.'),
        P('MC_ObtenerPrioridadesTarifas', 'Tarifas vigentes de todas las prioridades para la lista.'), F('ObtenerTarifaAsociadaSHR', 'Ruta de la hoja de ruta (preselección comentada).'),
        P('MC_ObtenerContratoMarco', 'Contrato marco para el registro SAP.'), P('ObtenerMontosDeConciliacion', 'Columna Totales.'), P('ObtenerTotalesConciliacion', 'Totales por producto.'),
        P('FacturasPendienteAPagar', 'Bloqueo de facturas impagas.'), P('DetalleDeCisternasSinConciliar', 'Recepciones del nuevo convoy (modo "Recepciones").'),
        P('DetalleDeBarcazasSinConciliar', 'Recepciones de barcaza.'), P('DetalleDeVagonesSinConciliar', 'Recepciones de vagón.'),
        T('CONFIGURACION_CONCILIACIONES', 'Permisos Puede* por usuario, tipo y área.'), T('ConciliacionCisterna', 'Cabecera.'), T('ConciliacionCisternaDetalle', 'Líneas.'),
        T('ConciliacionBarcaza', 'Cabecera barcaza.'), T('ConciliacionBarcazaDetalle', 'Compensación de capacidad.'), T('ConciliacionVagon', 'Cabecera vagón (CostoFormularios).'), T('ConciliacionVagonDetalle', 'Kg y toneladas.'),
        T('BarcazaBone', 'Capacidad en época baja.'), T('Vagon', 'Código de vagón.'), T('ConciliacionArea', 'Destinatarios del correo de pedido.'), T('Alerta', 'Destinatarios de alertas de factura.'),
        T('MC_MultaDescuentoConciliacion', 'Recargos borrados al excluir una recepción.'), T('SAP_ConciliacionMaster', 'Registro SAP al aprobar.'),
        SEGURIDAD, AUDITORIA, SIN_TRIGGERS
      ]
    },
    recargos: {
      resumen: 'Multas y descuentos contractuales, casos especiales y cobros de carro guía de la conciliación.',
      items: [
        PAN('MultaDescuentoConciliacion.aspx', 'Ventana abierta desde "Asociar recargo" (ConciliacionCisterna.ascx.vb:1944-1965).'),
        VB('MultaDescuentoConciliacion.aspx.vb', 'LOGISTICA/MultaDescuentoConciliacion.aspx.vb:139-321', 'Multas y descuentos vigentes y liberados para la empresa por aplicabilidad (CRE_D, CRE_R, conciliación).'),
        VB('MultaDescuentoConciliacion.aspx.vb', 'LOGISTICA/MultaDescuentoConciliacion.aspx.vb:349-455', 'Casos especiales y cobros por carro guía de la quincena.'),
        VB('MultaDescuentoConciliacion.aspx.vb', 'LOGISTICA/MultaDescuentoConciliacion.aspx.vb:486-576', 'Registro de carro guía y casos especiales (≥ 50.000 → factura impaga).'),
        P('MC_CargarMultasYDescuentosConciliacion', 'Multas o descuentos aplicables a la conciliación.'), P('MC_CargarMultasParaCRE', 'Multas aplicables por CRE.'),
        P('CasosConciliacionCisterna', 'Casos especiales registrados.'), P('CG_CargarCobrosCarroGuiaParaConciliacion', 'Cobros de carro guía del periodo.'), P('CG_CargarIDsParaRegistroConciliacion', 'IDs de cobros a vincular.'),
        F('MC_ObtenerMultaDescuentoAplicado', 'Total por tipo de recargo.'), F('MC_ExisteMultaDescuentoEnConciliacion', 'Control de duplicados.'),
        T('MC_MultasDescuentos', 'Catálogo contractual (tipo, aplicabilidad, vigencia).'), T('MC_MultasDescuentosDetalle', 'Concepto, sigla, monto, estado.'), T('MC_MultasDescuentosDetalleEmpresas', 'Empresas a las que aplica.'),
        T('MC_MultaDescuentoConciliacion', 'Recargos aplicados a la conciliación.'), T('DetalleCasosConciliacionCisterna', 'Casos especiales.'), T('Multa', 'Casos especiales (MultaTipo = "Caso Especial").'),
        T('CG_CobroCarroGuia', 'Cobros de carro guía.'), T('CG_ConciliacionCarroGuia', 'Carro guía en la conciliación.'), T('CG_ConciliacionEmpresaCobro', 'Vínculo con los cobros.'),
        AUDITORIA, SIN_TRIGGERS
      ]
    },
    sap: {
      resumen: 'En este código la conciliación llega a "Liberado" desde la sincronización con SAP: pedido → liberación del pedido → hoja de entrada de servicio → liberación de la hoja.',
      items: [
        UC('ConciliacionCisterna.ascx.vb', '1486-1520', 'Al aprobar el transportista: SAP_ConciliacionMaster/Detail en "Sin Registrar en SAP".'),
        VB('AdmUtilitariosConciliacion.InsertConciliacionMaster / InsertConciliacionDetalle', 'BF/AdmUtilitariosConciliacion.vb:1193-1331', 'Tipo CT/CTI, texto de periodo y detalle por producto.'),
        PAN('Sincronizaciones_To_SAP.aspx', 'Sincronización de conciliaciones a SAP.'),
        UC('Sincronizaciones_To_SAP.ascx.vb', '141-293', 'Crear pedido → SAP "Pendiente de Liberación" y conciliación "Pendiente de Aprobacion". Exige código SAP, condición de pago, moneda y credenciales SAP.'),
        UC('Sincronizaciones_To_SAP.ascx.vb', '294-441', 'Liberar pedido → "Pendiente Hoja de Entrada de Servicio".'),
        UC('Sincronizaciones_To_SAP.ascx.vb', '442-548', 'Registrar hoja de entrada → "Pendiente de Liberación de Hoja".'),
        UC('Sincronizaciones_To_SAP.ascx.vb', '549-687', 'Liberar hoja → SAP "Aceptado" y conciliación "Liberado".'),
        UC('Sincronizaciones_To_SAP.ascx.vb', '688-813', 'Anular pedido (conciliación vuelve a "En Elaboracion"), anular hoja y anular aceptación (la conciliación no cambia).'),
        VB('SincronizadorSAP', 'LOGISTICA/App_Code/SincronizadorSAP.vb:34, 274, 934, 1003, 1056', 'Llamadas RFC a SAP con ERPConnect.'),
        VB('AdmSyncSAP', 'BF/AdmSyncSAP.vb', 'Anulaciones en SAP.'),
        PAN('ContabilizacionDeConciliaciones.aspx', 'Conciliaciones liberadas y su pedido.'), UC('ContabilizacionDeConciliaciones.ascx.vb', '14-33', 'CargarConciliacionesSinContabilizar.'),
        P('ObtenerFletesConciliacion', 'Detalle por producto: flete, volumen, CeBe, cuenta.'), F('ObtenerCuentaContableVigente', 'Cuenta por fecha, producto, tipo y nacionalidad.'),
        P('CargarConciliacionesSinContabilizar', 'Liberadas con su documento de pedido.'), P('FacturasPendienteAPagar', 'Facturas impagas mayores al umbral.'), F('ObtenerPeriodoTxtConciliacion', 'Texto del periodo.'),
        T('SAP_ConciliacionMaster', 'EstadoSincronizacion, DocumentoCreacion, HojaDeEntrada…'), T('SAP_ConciliacionDetail', 'Líneas por producto.'), T('SINC_ConfiguracionServicio', 'Grupo de compra y código de liberación.'),
        T('CuentaContable', 'Cuentas.'), T('CuentaContableVigencia', 'Vigencias.'), T('CuentaContableProductoTipoConciliacion', 'Cuenta por producto y tipo.'),
        T('MedioTransportePropietario', 'MedioTransporteCodigoSAP, MedioTransporteCondicionPago.'),
        EXT('SAP (ERPConnect)', 'Sistema externo', 'Pedido de compra, liberación, hoja de entrada de servicio y aceptación.'),
        SIN_TRIGGERS
      ]
    },
    portal: {
      resumen: 'Consulta de conciliaciones del transportista; aprobación y rechazo con las actividades de seguridad.',
      items: [
        PAN('ConciliacionCisternaTransportista.aspx', 'Página del transportista.'), UC('ConciliacionCisternaTransportista.ascx.vb', '65-133', 'Transportistas del usuario y listado de conciliaciones.'),
        VB('AdmUtilitariosConciliacion.CargarTransportistasXUsuario', 'BF/AdmUtilitariosConciliacion.vb:32-36', 'Empresas vinculadas al usuario (TransportistaUsuario).'),
        UC('ConciliacionCisterna.ascx.vb', '1461-1537', '"Transportista Aprueba" / "Transportista Rechaza" (requieren la actividad en la seguridad externa).'),
        W('vwConciliacionesPorTransportista', 'Conciliaciones con nombres de usuarios tomados de YPFBRSeguridad.dbo.Usuario.'),
        P('ConciliacionesPorEmpresa', 'Conciliaciones por empresa, mes y estado.'),
        T('TransportistaUsuario', 'Relación usuario ↔ transportista.'), T('ConciliacionCisterna', 'UsuarioAprobacionTrans, UsuarioRechazoTrans.'),
        EXT('YPFBRSeguridad.dbo.Usuario', 'Base de seguridad (consulta cruzada desde la vista)', 'Nombre de los usuarios.'), SEGURIDAD, SIN_TRIGGERS
      ]
    },
    destino: {
      resumen: 'Propuesta: no existe en V1. Fuentes en DESTINO y en el legado para integrarla.',
      items: [
        EXT('Oferta y postulación', 'SILOG_DESTINO (PROG_LOG_BACKEND, Programacion/Ofertas)', 'Oferta con ruta; hoy usa NodoGeografico.'),
        EXT('NodoGeografico / TipoNodo', 'SILOG_DESTINO/PROG_LOG_BACKEND/src/YPFBR.PDL.Domain/Maestros', 'A reemplazar por Localidad del legado.'),
        EXT('LocalidadController, OrdenDespachoDetalleController, CREOrdenDespachoController', 'SILOG_LEGACY_BACKEND/src/Api/ApiSilog/Controllers', 'Destino de la nominación en LEGACY.'),
        T('OrdenDespachoDetalle', 'Donde llegaría la tarifa adjudicada (columna nueva propuesta).'), T('SolicitudHRDetalle', 'Antecedente en V1: TarifaOTID asociada al viaje.'),
        SIN_TRIGGERS
      ]
    },
    guion: { resumen: 'Escenarios de prueba del prototipo: no existen en V1.', items: [] },
    inicio: { resumen: 'Vista general del prototipo; cada paso enlaza a la vista con sus fuentes.', items: [] },
    reglas: { resumen: 'Cada regla indica su evidencia en la columna correspondiente.', items: [] },
    ejemplos: { resumen: 'Mismas fórmulas que DetalleSinConciliar.ascx.vb:1442-1665 y ConciliacionCisterna.ascx.vb:1319-1429.', items: [] },
    mejoras: { resumen: 'Defectos detectados en las fuentes citadas en cada vista.', items: [] },
    glosario: { resumen: 'Términos tomados de nombres de tablas, columnas y pantallas de V1.', items: [] },
    bitacora: { resumen: 'Equivalente propuesto a SILOG_Auditoria, con usuario y contexto.', items: [AUDITORIA] },
    fuentes: { resumen: 'Catálogo completo de objetos de V1 citados por el prototipo.', items: [] }
  };

  // Origen de columnas de las grillas: clave → [origen en V1, cálculo o nota]
  SILOG.COLUMNAS = {
    lote: ['Lote.LoteCodigo (vía DatosCRE) → ConciliacionCisternaDetalle.Lote', ''],
    placa: ['Cisterna.CisternaPlaca → ConciliacionCisternaDetalle.NumeroCisterna', ''],
    planViaje: ['CRE.CREAdmViaje → ConciliacionCisternaDetalle.AdmViaje', ''],
    fechaCarga: ['CRE.CREFecha (despacho) → ConciliacionCisternaDetalle.FechaCarga', ''],
    fechaDespacho: ['CRE.CREFechaDespacho (despacho) → FechaDespacho', ''],
    fechaEnDestino: ['CRE.CREFechaDespacho (recepción) → FechaEnDestino', ''],
    fechaDescarga: ['CRE.CREFecha (recepción) → FechaDescarga', ''],
    origen: ['CRE.CREPlantaOrigen (despacho) → Localidad → ConciliacionCisternaDetalle.Origen', ''],
    destino: ['CRE.CREPlantaDestino (recepción) → Localidad → ConciliacionCisternaDetalle.Destino', ''],
    volDesp: ['CRE.CREVolumenConsolidadoLTS (despacho) → DespachoLts', 'Prorrateado si el despacho tiene varias recepciones (DetalleSinConciliar.ascx.vb:1540-1545).'],
    volRec: ['CRE.CREVolumenConsolidadoLTS (recepción) → RecepcionLts', 'Solo en la última línea de la recepción.'],
    creDesp: ['CRE.CRENumero (despacho) → DespachoCRENumero; CREID → DespachoCREID', ''],
    creRec: ['CRE.CRENumero (recepción) → RecepcionCRENumero; CREID → RecepcionCREID', ''],
    tarifa: ['MC_TarifaOT.Tarifa / 1000 → ConciliacionCisternaDetalle.Tarifa', 'MC_DevolverTarifaVigente_OT o tarifa asociada (DetalleSinConciliar.ascx.vb:1551-1576).'],
    fuenteTarifa: ['No se guarda en V1 (TarifaOTID existe pero queda vacío)', 'Columna agregada por el prototipo (defecto D5).'],
    totalFlete: ['ConciliacionCisternaDetalle.TotalFlete', 'RedHU(RecepcionLts × Tarifa, 2) (DetalleSinConciliar.ascx.vb:1602).'],
    admPorc: ['MC_TarifaOT.Admisible → MermaAdmisiblePorcentual', ''],
    admLts: ['ConciliacionCisternaDetalle.MermaAdmisibleLTS', 'RedAdm(Trunc2(VolDesp × Adm% / 100)) (DetalleSinConciliar.ascx.vb:1583-1584).'],
    balanceLote: ['ConciliacionCisternaDetalle.BalanceLote', 'VR − Σ VolDesp (DetalleSinConciliar.ascx.vb:1589).'],
    admLote: ['ConciliacionCisternaDetalle.AdmisibleLote', 'Σ admisibles de la recepción.'],
    cdLts: ['ConciliacionCisternaDetalle.CreditoDebitoPorLote', 'DetalleSinConciliar.ascx.vb:1592-1600.'],
    pu: ['ProductoPrecio.PPTnacional → PrecioUnitarioBs', 'ObtenerPrecioProducto.'],
    precioMulta: ['ProductoPrecio.PrecioMulta (o MA_PrecioProductoImportado.Precio/1000) → PrecioMultaBs', 'ObtenerPrecioProducto.'],
    cdBs: ['ConciliacionCisternaDetalle.DebitoCreditoBs', 'RedHU(C/D L × Precio multa, 2) (DetalleSinConciliar.ascx.vb:1628).'],
    totalFacturar: ['ConciliacionCisternaDetalle.TotalFacturar', 'RedHU(Flete + C/D Bs, 2); al recalcular ConciliacionCisterna.ascx.vb:1377-1415.'],
    multasCRE: ['MultaPorIncumplimiento (dbo.TotalMultasPorIncumplimiento) — no se guarda en el detalle', 'Se muestra en la primera línea de cada despacho (ConciliacionCisterna.ascx.vb:807-813).'],
    liberarCapacidad: ['ConciliacionCisternaDetalle.LiberarCapacidad', 'ConciliacionCisterna.ascx.vb:1331-1354.'],
    tarifaEspecial: ['ConciliacionCisternaDetalle.TarifaEspecialBs', 'ConciliacionCisterna.ascx.vb:1357-1370.'],
    liberarMerma: ['ConciliacionCisternaDetalle.LiberarMerma', 'ConciliacionCisterna.ascx.vb:1379-1394; ObtenerTotalesConciliacion.'],
    observacion: ['ConciliacionCisternaDetalle.Observacion', ''],
    // Cabecera de conciliación
    numero: ['ConciliacionCisterna.NumeroConciliacion', 'NroConc_Proximo.'],
    estado: ['ConciliacionCisterna.Estado', ''],
    netoFlete: ['ConciliacionCisterna.NetoFleteFacturable', ''],
    mermas: ['ConciliacionCisterna.TotalMultaMerma', ''],
    multaTransp: ['ConciliacionCisterna.TotalMultaPorIncumplimiento ← ObtenerMontosDeConciliacion [Multa Transporte]', ''],
    neto: ['ConciliacionCisterna.NetoConciliado', ''],
    moneda: ['ConciliacionCisterna.ConciliacionMoneda ← MC_ObtenerMonedaContratoEmpresa', ''],
    sap: ['SAP_ConciliacionMaster.EstadoSincronizacion', ''],
    // Tarifario
    tOrigen: ['MC_TarifaOT.LocalidadOrigenID', ''], tDestino: ['MC_TarifaOT.LocalidadDestinoID', ''], tProducto: ['MC_TarifaOT.ProductoID', ''],
    tTarifa: ['MC_TarifaOT.Tarifa (por m³)', ''], tAdmisible: ['MC_TarifaOT.Admisible', ''], tPrioridad: ['MC_TarifaOT.Prioridad', ''],
    tDesde: ['MC_ContratoHistorial.VigenciaInicio', 'MC_TarifaOT no tiene vigencia propia: usa la de la versión del contrato.'], tEstado: ['MC_TarifaOT.Estado y AprobacionTarifa', ''],
    // CRE y órdenes
    creNumero: ['CRE.CRENumero', 'NroCREProximo.'], creLote: ['Lote.LoteCodigo', 'DetalleOrdenDespacho.ascx.vb:1279.'], odEstado: ['OrdenDeDespacho.Estado', ''],
    odVolumen: ['OrdenDespachoDetalle.Volumen', ''], odHoja: ['OrdenDespachoDetalle.NroHojaDeRuta', ''], odTarifa: ['SolicitudHRDetalle.TarifaOTID', 'Tarifa adjudicada: columna propuesta, no existe en V1.']
  };

  // Lista plana de todos los objetos citados, con las vistas que los usan.
  SILOG.catalogoFuentes = () => {
    const mapa = new Map();
    Object.entries(SILOG.FUENTES).forEach(([vista, f]) => f.items.forEach(it => {
      const clave = it[0] + '|' + it[1];
      if (!mapa.has(clave)) mapa.set(clave, { tipo: it[0], nombre: it[1], ubicacion: SILOG.ubicacionFuente(it), archivo: SILOG.archivoFuente(it), usos: [], vistas: new Set() });
      const x = mapa.get(clave);
      x.vistas.add(vista);
      if (it[3] && !x.usos.includes(it[3])) x.usos.push(it[3]);
    }));
    return [...mapa.values()];
  };
  SILOG.ubicacionFuente = it => {
    if (PREFIJO[it[0]]) return L[it[1]] ? `Script SQL, línea ${L[it[1]]}` : 'Script SQL';
    return it[2] || '';
  };
  // SILOG.SIN_SQL (publicación sin la carpeta EXTRACCION_SQL_CONCILIACIONES): sin enlaces a las copias SQL.
  SILOG.archivoFuente = it => !SILOG.SIN_SQL && PREFIJO[it[0]] && L[it[1]] ? `../EXTRACCION_SQL_CONCILIACIONES/${PREFIJO[it[0]]}__${it[1]}.sql` : null;
})();

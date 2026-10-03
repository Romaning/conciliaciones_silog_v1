/*
 * Vistas del prototipo. Cada función devuelve HTML a partir del estado; no modifica datos.
 * Las interacciones usan atributos data-accion / data-cambio que resuelve app.js.
 */
window.SILOG = window.SILOG || {};

(function (V) {
  const M = SILOG.motor;
  const E = SILOG.estado;
  const st = () => E.st;
  const vs = () => SILOG.app.vs;
  const modo = () => E.ui.modo;

  // ───────────────────────── utilidades de presentación ─────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  V.esc = esc;
  const N = M.fmtN, B = M.fmtB, F = M.fmtF;
  const opts = (lista, sel, val = x => x.id, txt = x => x.nombre, vacio) =>
    (vacio ? `<option value="">${esc(vacio)}</option>` : '') +
    lista.map(x => `<option value="${esc(val(x))}" ${String(val(x)) === String(sel) ? 'selected' : ''}>${esc(txt(x))}</option>`).join('');
  const loc = id => M.porId(st().localidades, id) || {};
  const prod = id => M.porId(st().productos, id) || {};
  const trans = id => M.porId(st().transportistas, id) || {};
  const cis = id => M.porId(st().cisternas, id) || {};
  const AREAS = { 1: 'RSCZ', 2: 'RCBA', 3: 'Todas' };
  const claseEstado = e => 'est-' + String(e || '').toLowerCase().replace(/[^a-z]+/g, '-');
  const badge = e => `<span class="badge ${claseEstado(e)}">${esc(e)}</span>`;
  const neg = v => `<span class="${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${B(v)}</span>`;
  const periodoTxt = c => `${c.quincena === 1 ? '1ra' : '2da'} quincena ${M.MESES[c.mes]} ${c.anio}`;
  const traza = (lineas, titulo = '¿Cómo se calculó?') => lineas && lineas.length
    ? `<details class="traza"><summary data-ayuda="traza">${esc(titulo)}</summary><ol>${lineas.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>` : '';
  const nota = (txt, tipo = 'info') => `<div class="nota nota-${tipo}">${txt}</div>`;
  const cabecera = (titulo, subtitulo, replica) => `
    <header class="vista-cab">
      <h1>${esc(titulo)}</h1>
      ${subtitulo ? `<p class="sub">${subtitulo}</p>` : ''}
      ${replica ? `<p class="replica"><span>Replica en V1:</span> ${replica}</p>` : ''}
    </header>`;
  // Encabezado de columna con su origen en V1: siempre en el título emergente; visible si se activa "Ver origen de columnas".
  const th = (label, clave, clase) => {
    const o = SILOG.COLUMNAS[clave];
    const t = o ? `Origen en V1: ${o[0]}${o[1] ? ' · ' + o[1] : ''}` : '';
    return `<th${clase ? ` class="${clase}"` : ''}${t ? ` title="${esc(t)}"` : ''}>${label}${o ? '<span class="marca-origen" aria-hidden="true">ⓘ</span>' : ''}${o && E.ui.verOrigen ? `<small class="origen">${esc(o[0])}${o[1] ? '<br>' + esc(o[1]) : ''}</small>` : ''}</th>`;
  };
  V.th = th;
  const ORDEN_TIPOS = ['Pantalla', 'Control de usuario', 'Código VB', 'Procedimiento', 'Función', 'Vista', 'Tabla', 'Trigger', 'Otra base o sistema', 'Prototipo'];
  V.tablaFuentes = items => `<table class="tabla fuentes-tabla"><thead><tr><th>Tipo</th><th>Objeto</th><th>Ubicación</th><th>Uso en esta parte</th></tr></thead><tbody>
    ${[...items].sort((a, b) => ORDEN_TIPOS.indexOf(a[0]) - ORDEN_TIPOS.indexOf(b[0])).map(it => {
      const archivo = SILOG.archivoFuente(it);
      return `<tr><td class="nowrap"><span class="tag tipo-${esc(it[0]).toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(it[0])}</span></td>
        <td class="mono">${archivo ? `<a href="${archivo}" target="_blank" rel="noopener" title="Abrir el objeto extraído del script SQL">${esc(it[1])}</a>` : esc(it[1])}</td>
        <td class="mono">${esc(SILOG.ubicacionFuente(it))}</td><td>${esc(it[3] || '')}</td></tr>`; }).join('')}
    </tbody></table>`;
  V.panelIntro = vista => {
    const i = (SILOG.INTRO_VISTAS || {})[vista];
    if (!i) return '';
    const cerrada = (E.ui.introCerrada || {})[vista];
    const lista = (t, xs) => xs && xs.length ? `<h3>${t}</h3><ul>${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    return `<details class="intro" data-intro="${vista}" ${cerrada ? '' : 'open'}>
      <summary data-ayuda="introPanel"><strong>Cómo usar esta pantalla</strong> · ${esc(i.proposito.split('.')[0])}.</summary>
      <div class="intro-cuerpo">
        <p>${esc(i.proposito)}</p>
        <p class="intro-meta"><span><strong>Quién la usa:</strong> ${esc(i.quien)}</span><span><strong>Cuándo:</strong> ${esc(i.cuando)}</span></p>
        <div class="intro-cols">
          <div><h3>Pasos</h3><ol>${i.pasos.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>
          <div>${lista('Qué observar', i.observar)}${lista('Lección para el sistema nuevo', i.ux)}</div>
        </div>
        <p class="ayuda">¿Dudas sobre un botón? Activa "? Ayuda" en la cabecera y haz clic sobre él. ¿Quieres que te guíe? Pulsa "▶ Guía".</p>
      </div></details>`;
  };

  V.panelFuentes = vista => {
    const f = SILOG.FUENTES[vista];
    if (!f) return '';
    const n = f.items.length;
    return `<details class="fuentes" ${E.ui.fuentesAbiertas ? 'open' : ''}>
      <summary data-ayuda="fuentesPanel"><strong>Fuentes en SILOG_V1</strong> · ${n ? n + ' objetos: pantallas, código, procedimientos, funciones, vistas, tablas y triggers' : 'no aplica'}</summary>
      <p class="ayuda">${esc(f.resumen)}</p>
      ${n ? V.tablaFuentes(f.items) : ''}
      <p class="ayuda">Código relativo a <code>SILOG_V1/</code> (BF = SYSLOGDISENO/Working Version/SYSLOGISTICABusinessFramework). Líneas del script = <code>SSCC/YPFBRLogistica_SVMRSCDBWSD_14122020.sql</code>. Catálogo completo en <a href="#fuentes">Fuentes y trazabilidad</a>.</p>
    </details>`;
  };

  const modoNota = (v1, prop) => modo() === 'V1'
    ? nota(`<strong>Modo V1.</strong> ${v1}`, 'v1') : nota(`<strong>Modo propuesto.</strong> ${prop}`, 'prop');

  // ───────────────────────── catálogo de reglas y defectos ─────────────────────────
  V.REGLAS = [
    ['RN-TAR-01', 'Tarifa vigente', 'Se usa la tarifa de la empresa, origen, destino, producto y prioridad PRINCIPAL cuyo contrato está LIBERADO, activa y aprobada, con la fecha entre su inicio y el fin del contrato; la de inicio más reciente. Sin tarifa → 0.', 'C', 'SQL MC_DevolverTarifaVigente_OT (línea 10224)', 'tarifario'],
    ['RN-TAR-02', 'Fecha y ruta de la búsqueda', 'Fecha del CRE de recepción; origen del despacho; destino de la recepción.', 'C', 'DetalleSinConciliar.ascx.vb:1556-1559', 'simulador'],
    ['RN-TAR-03', 'Tarifa asociada a la hoja de ruta', 'Si la solicitud de hoja de ruta del viaje tiene TarifaOTID, se usa esa tarifa y su admisible.', 'C', 'MC_ExisteRutaConTarifaVigenteAsociada_OT (10520); DetalleSinConciliar.ascx.vb:1552-1576', 'ordenes'],
    ['RN-TAR-04', 'Cambio manual de tarifa', 'En la conciliación se puede elegir la tarifa PRINCIPAL o ALTERNA vigente, o una tarifa especial.', 'C', 'ConciliacionCisterna.ascx.vb:1836-1897, 1357-1370', 'conciliaciones'],
    ['RN-TAR-05', 'Dónde nace la tarifa', 'MC_TarifaOT se carga en la versión del contrato (ContratoDetalle); al liberarse la versión (actividades MC Puede Solicitar AP / LB / Liberar) la tarifa queda aprobada.', 'C', 'ContratoDetalle.ascx.vb:1304-1392, 1908-1980; PanelDeSistema.ascx.vb:1845-1870', 'tarifario'],
    ['RN-TAR-06', 'Contrato usado no se revierte', 'Una versión de contrato con conciliaciones no se puede volver a elaboración.', 'C', 'ContratoDetalle.ascx.vb:1948-1966; MC_ExisteEnConciliacion', 'tarifario'],
    ['RN-OD-01', 'Aprobación de la orden', 'Asigna número correlativo por terminal y envía la nómina autorizada de carga a cada transportista.', 'C', 'DetalleOrdenDespacho.ascx.vb:1565-1629', 'ordenes'],
    ['RN-OD-02', 'Liberación de la orden', 'Requiere al menos un CRE; si no, se debe anular.', 'C', 'DetalleOrdenDespacho.ascx.vb:1630-1663', 'ordenes'],
    ['RN-OD-03', 'Selección para crear CRE', 'Mismo producto, misma empresa, mismo destino y misma ruta; barcaza y vagón uno solo.', 'C', 'DetalleOrdenDespacho.ascx.vb:1474-1540', 'ordenes'],
    ['RN-OD-04', 'CRE de despacho', 'Crea lote OT-CIS-{prod}-{n}-{aa}-{planta}, CRE tipo 3, vínculo CREOrdenDespacho y hoja de ruta EN TRANSITO.', 'C', 'DetalleOrdenDespacho.ascx.vb:1259-1429', 'cre'],
    ['RN-CRE-01', 'Asociación despacho–recepción', 'Una recepción puede consolidar varios despachos y un despacho repartirse en varias recepciones (CREAsociacion).', 'C', 'CRECisterna.ascx.vb:2625', 'cre'],
    ['RN-CRE-02', 'Volumen conciliado', 'CREVolumenConsolidadoLTS (o kilos según la unidad del producto).', 'C', 'DetalleDeCisternasSinConciliar', 'cre'],
    ['RN-CRE-03', 'CRE vigentes', 'Solo EstadoID = 1.', 'C', 'DetalleDeCisternasSinConciliar', 'sinconciliar'],
    ['RN-MUL-01', 'Multas por CRE editables', 'Solo si la conciliación del despacho no existe o está En Elaboracion.', 'C', 'MultasPorInclumpliento.ascx.vb:272-282', 'multas'],
    ['RN-MUL-02', 'Cálculo de multas por CRE', 'MDR × días, MNC × conductores, MAC/MOP/MNT fijas, MPF = ((MPF×TC)×1,15/1000)×entregado; Sus × TC.', 'C', 'MultasPorInclumpliento.ascx.vb:179-238', 'multas'],
    ['RN-GEN-01', 'Recepciones sin conciliar', 'Tipo 8 vigente, asociada, no conciliada, del área, de los últimos 90 días, transportista con contrato vigente.', 'C', 'DetalleDeCisternasSinConciliar (54696)', 'sinconciliar'],
    ['RN-GEN-02', 'Agrupación', 'Por transportista, área y quincena (día < 16 → 1ra).', 'C', 'DetalleDeCisternasSinConciliar', 'sinconciliar'],
    ['RN-GEN-03', 'Moneda obligatoria', 'Debe existir moneda del contrato vigente para el periodo.', 'C', 'DetalleSinConciliar.ascx.vb:1413-1439, 2011-2016', 'sinconciliar'],
    ['RN-GEN-04', 'Selección mínima', 'Al menos una empresa y una recepción.', 'C', 'DetalleSinConciliar.ascx.vb:2017-2026, 2109-2114', 'sinconciliar'],
    ['RN-GEN-05', 'Control presupuestario', 'Ejecutado del año + monto de la conciliación ≤ programado del contrato marco que controla presupuesto.', 'C', 'DetalleSinConciliar.ascx.vb:2028-2103', 'sinconciliar'],
    ['RN-GEN-06', 'Sin duplicados', 'Si un par despacho–recepción ya está conciliado se revierte toda la generación.', 'C', 'DetalleSinConciliar.ascx.vb:2179-2183', 'sinconciliar'],
    ['RN-GEN-07', 'Numeración global', 'Contador NroConc_Proximo compartido por todos los tipos de conciliación.', 'C', 'NroConc_Proximo (62505)', 'conciliaciones'],
    ['RN-GEN-08', 'Totales iniciales', 'Flete = Σ flete; mermas = Σ por producto de C/D negativos; neto = flete + mermas.', 'C', 'DetalleSinConciliar.ascx.vb:1979-2000; ObtenerTotalesConciliacion (67784)', 'conciliaciones'],
    ['RN-CAL-01', 'Prorrateo del despacho', 'Si el despacho tiene varias recepciones: CInt(VD × VR / ΣVR).', 'C', 'DetalleSinConciliar.ascx.vb:1540-1545', 'ejemplos'],
    ['RN-CAL-02', 'Admisible', 'Trunc2(VolDesp × Adm% / 100) y redondeo: sube si la parte decimal > 0,49.', 'C', 'DetalleSinConciliar.ascx.vb:1583-1587; AdmUtilitariosConciliacion.vb:972-995', 'ejemplos'],
    ['RN-CAL-03', 'Crédito/débito', 'Balance = VR − ΣVolDesp. > 0 → demasía; |balance| > admisible → balance + admisible; si no, 0.', 'C', 'DetalleSinConciliar.ascx.vb:1588-1600', 'ejemplos'],
    ['RN-CAL-04', 'Flete', 'Volumen recibido × tarifa por litro, solo en la última línea de la recepción, redondeo half-up.', 'C', 'DetalleSinConciliar.ascx.vb:1601-1602', 'ejemplos'],
    ['RN-CAL-05', 'Valorización de la merma', 'C/D Lts × precio de multa vigente a la fecha de carga; importados con precio importado.', 'C', 'DetalleSinConciliar.ascx.vb:1610-1629; ObtenerPrecioProducto (67290)', 'precios'],
    ['RN-AJU-01', 'Liberar capacidad', 'Base del flete = capacidad − volumen despachado acumulado + volumen recibido.', 'C/I', 'ConciliacionCisterna.ascx.vb:1331-1354', 'conciliaciones'],
    ['RN-AJU-02', 'Liberar merma', 'La línea no aporta su C/D; en contabilización se excluye la recepción entera.', 'C', 'ConciliacionCisterna.ascx.vb:1379-1394; ObtenerTotalesConciliacion', 'conciliaciones'],
    ['RN-TOT-01', 'Totales por recepción', 'Flete, mermas no liberadas, multas por CRE y neto.', 'C', 'ConciliacionCisterna.ascx.vb:1027-1059', 'conciliaciones'],
    ['RN-TOT-02', 'Compensación por producto', 'Si la suma de mermas de un producto es positiva, se toma 0: la demasía compensa pero no se paga.', 'C', 'ConciliacionCisterna.ascx.vb:1119-1140', 'conciliaciones'],
    ['RN-TOT-03', 'Neto de cabecera', 'Flete + mermas + multa transporte (recargo CCIST).', 'C', 'ConciliacionCisterna.ascx.vb:1061-1089; ObtenerMontosDeConciliacion (66652)', 'conciliaciones'],
    ['RN-TOT-04', 'Umbral de facturas', 'Mermas o multas > 50.000 dejan la conciliación con factura impaga.', 'C', 'ConciliacionCisterna.ascx.vb:1174-1176', 'sap'],
    ['RN-EST-00', 'Acciones ofrecidas', 'La lista solo ofrece Solicitar Aprob. Transportista, Transportista Aprueba/Rechaza y Rechazar, según actividades; las demás están comentadas.', 'C', 'ConciliacionCisterna.ascx.vb:151-166', 'conciliaciones'],
    ['RN-EST-01', 'Edición', 'Solo En Elaboracion; con aprobación del transportista solo facturas.', 'C', 'ConciliacionCisterna.ascx.vb:1163-1284', 'conciliaciones'],
    ['RN-EST-02', 'Aprobación del transportista', 'Genera cabecera y detalle SAP "Sin Registrar en SAP" y alertas de facturas y pedido.', 'C', 'ConciliacionCisterna.ascx.vb:1461-1529', 'portal'],
    ['RN-EST-03', 'Facturas para aprobación LOG', 'Números de factura obligatorios si hay mermas o multas.', 'C', 'ConciliacionCisterna.ascx.vb:1299-1317, 1538-1552', 'conciliaciones'],
    ['RN-EST-04', 'Bloqueo por facturas impagas', 'No se solicita liberación si el transportista tiene facturas > umbral impagas.', 'C', 'FacturasPendienteAPagar (55255)', 'sap'],
    ['RN-EST-05', 'Reversión tardía', 'Solo "Gerente de Dist. y Ventas" y solo si SAP está "Sin Registrar en SAP".', 'C', 'ConciliacionCisterna.ascx.vb:1581-1615', 'conciliaciones'],
    ['RN-SAP-02', 'Circuito SAP', 'Crear pedido → conciliación Pendiente de Aprobacion; liberar pedido; registrar y liberar hoja de entrada → Aceptado y conciliación Liberado; anular pedido → En Elaboracion.', 'C', 'Sincronizaciones_To_SAP.ascx.vb:141-813', 'sap'],
    ['RN-SAP-01', 'Registro SAP', 'Tipo TERRESTRE (CT) o INTERNACIONAL (CTI); detalle por producto con flete, volumen, CeBe y cuenta vigente.', 'C', 'AdmUtilitariosConciliacion.vb:1193-1331; ObtenerFletesConciliacion (65447)', 'sap']
  ];
  V.DEFECTOS = [
    ['D1', 'Cálculo duplicado en dos pantallas, con diferencias.', 'Motor único de dominio, probado con los ejemplos.', 'motor.js; Ejemplos'],
    ['D2', 'Persistencia leyendo celdas renderizadas y HTML de enlaces.', 'Persistir desde el modelo, nunca desde la UI.', 'Estado separado de las vistas'],
    ['D3', 'SQL concatenado (inyección).', 'Consultas parametrizadas / ORM.', 'Diseño LEGACY'],
    ['D4', 'Producto guardado como texto.', 'Referencias por ID; textos solo para mostrar.', 'Líneas con productoId'],
    ['D5', 'TarifaOTID no se guarda.', 'Guardar tarifa y su fuente (adjudicada, asociada, contrato, especial).', 'Columna "Fuente" de la tarifa'],
    ['D6', 'Procesar borra y reinserta el detalle.', 'Ajustes como registros auditables; líneas inmutables.', 'Ajustes con auditoría (modo propuesto)'],
    ['D7', 'Estados en texto y rol fijo en el código.', 'Máquina de estados declarada y permisos de SEGURIDAD-EXTERNA.', 'Permisos por rol (modo propuesto)'],
    ['D8', 'IDs fijos (transportistas 47/77, área 3, multas 9/12/17).', 'Parámetros y atributos de catálogo.', 'Parámetros visibles'],
    ['D9', 'Ventana fija de 90 días oculta viajes.', 'Sin ventana; alerta por antigüedad.', 'Detalle sin conciliar (modo propuesto)'],
    ['D10', 'Prorrateo con redondeo bancario sin ajuste.', 'Resto mayor.', 'Ejemplos (prorrateo)'],
    ['D11', 'Redondeo manipulando cadenas.', 'Aritmética decimal con política única.', 'motor.js'],
    ['D12', 'Total de línea desactualizado si C/D ≥ 0.', 'Recalcular siempre.', 'Conciliación: marca "desactualizado"'],
    ['D13', 'Dos mecanismos de multas; solo uno en el neto.', 'Recargos tipificados que entran al neto.', 'Recargos y totales'],
    ['D14', 'Errores silenciados.', 'Errores visibles y registrados.', 'Mensajes del prototipo'],
    ['D15', 'ID por MAX(ID).', 'Identidad devuelta por la inserción.', 'Diseño LEGACY'],
    ['D16', '@Moneda nula para barcaza y vagón.', 'Moneda desde el contrato en todos los tipos.', 'Diseño LEGACY'],
    ['D17', 'Volumen contable distinto a la base del flete.', 'Usar la misma base.', 'SAP (detalle)'],
    ['D18', 'TC 7,07 y umbral 50.000 fijos.', 'Tipo de cambio oficial por fecha; umbral parametrizable.', 'SAP: umbral editable'],
    ['D19', 'Aprobación del transportista sin validar la empresa.', 'Portal autenticado y vinculado a la empresa; disputa por línea.', 'Portal del transportista'],
    ['D20', 'Anular aceptación u hoja en SAP no revierte la conciliación (queda Liberado).', 'Estado de la conciliación sincronizado con el de SAP.', 'Contabilización y SAP: "Anular aceptación"'],
    ['D21', 'Transiciones programadas pero no ofrecidas; reglas dormidas (facturas impagas).', 'Eliminar código muerto o activar las reglas de forma explícita.', 'Acciones "comentadas en V1" en la conciliación'],
    ['D22', 'Otros Transportes: la aprobación "del transportista" la hace logística con PuedeSolicitarAprobacion.', 'Aprobación en el portal del transportista.', 'Conciliación Otros Transportes: segundo Aprobar'],
    ['D23', 'Otros Transportes: FacturasCorrectas usa nombres inexistentes (TotalMultaPorInclumplimiento, txtFacturaInclumplimiento).', 'Pruebas automáticas sobre las validaciones.', 'Documento Otros Transportes §9'],
    ['D24', 'Vagón usa el tipo de contrato de cisterna al obtener montos.', 'Tipo de contrato desde la conciliación.', 'Documento Otros Transportes §9'],
    ['D25', 'Otros Transportes rechaza sin verificar el estado SAP.', 'Bloquear el rechazo si hay pedido en SAP.', 'Conciliación Otros Transportes: Rechazar tras aprobar'],
    ['D27', 'El detalle promedia la tarifa de las líneas de una recepción y la reescribe en todas.', 'Tarifa por línea con su fuente.', 'Marca "prom." en la lista de tarifas'],
    ['D28', '"Liberar merma" se ve marcado solo si todas las líneas lo tienen.', 'Ajuste por recepción explícito.', 'Detalle por recepción'],
    ['D29', 'El total mostrado por fila suma todos los recargos; el NetoConciliado guardado no.', 'Un solo neto calculado por el motor.', 'Marca "guardado" en la columna Totales'],
    ['D30', 'Nuevo convoy agrega recepciones sin validar contrato, moneda ni presupuesto.', 'Las mismas validaciones que la generación.', 'Nuevo convoy'],
    ['D31', 'Barcaza no prorratea despachos repartidos en varias recepciones.', 'Prorrateo común a todos los medios.', 'Documento Otros Transportes §6'],
    ['D32', 'Origen y destino del detalle se buscan por nombre de localidad.', 'Referencias por ID.', 'Documento Otros Transportes §5']
  ];

  // ───────────────────────── A. Entender ─────────────────────────
  V.inicio = () => {
    const s = st();
    const sinConc = M.recepcionesSinConciliar(s, 3, modo()).grupos.reduce((n, g) => n + g.recepciones.length, 0);
    const desp = s.cres.filter(c => c.tipo === 3);
    const transito = desp.filter(d => !M.recepcionesDe(s, d.id).length).length;
    const porEstado = M.ESTADOS.map(e => [e, s.conciliaciones.filter(c => c.estado === e).length]);
    const pasos = [
      ['tarifario', '1. Contrato y tarifa por ruta', `${s.tarifas.filter(t => t.estado).length} tarifas activas`, 'Localidad origen → destino, producto, Bs/m³, admisible %.'],
      ['ordenes', '2. Orden de despacho', `${s.ordenes.length} órdenes`, 'Terminal, transportista, cisterna, destino y volumen; aprobación y nómina.'],
      ['cre', '3. CRE de despacho', `${desp.length} despachos, ${transito} en tránsito`, 'Lote, volumen cargado, hoja de ruta en tránsito.'],
      ['cre', '4. CRE de recepción', `${s.cres.filter(c => c.tipo === 8).length} recepciones`, 'Volumen recibido y asociación con despachos.'],
      ['multas', '5. Multas por CRE', `${new Set(s.multasCRE.map(m => m.creId)).size} CRE con multas`, 'Retrasos, conductores, filtraciones.'],
      ['sinconciliar', '6. Detalle sin conciliar', `${sinConc} recepciones disponibles`, 'Por transportista y quincena.'],
      ['conciliaciones', '7. Conciliación', `${s.conciliaciones.length} conciliaciones`, 'Flete − mermas − multas; ajustes y estados.'],
      ['portal', '8. Aprobación del transportista', `${s.conciliaciones.filter(c => c.estado === 'En Aprobacion de Transportista').length} esperando`, 'Aprueba o rechaza; genera registro SAP.'],
      ['sap', '9. SAP y facturas', `${s.conciliaciones.filter(c => c.sap).length} con registro SAP`, 'Pedido, facturas, liberación.']
    ];
    return `${cabecera('Conciliaciones de transporte en SILOG_V1', 'Prototipo navegable para entender cómo nace, se calcula y se aprueba una conciliación de cisternas, y cómo debería funcionar en la reingeniería.')}
    ${nota('Datos ficticios. Este prototipo no es el sistema ni se conecta a ninguna base de datos. Las reglas están documentadas en <code>CONCILIACIONES_V1_REGLAS_Y_FLUJO.md</code>.', 'aviso')}
    <section class="flujo">${pasos.map(p => `
      <a class="paso" href="#${p[0]}"><span class="paso-t">${p[1]}</span><span class="paso-n">${p[2]}</span><span class="paso-d">${p[3]}</span></a>`).join('<span class="flecha" aria-hidden="true">→</span>')}
    </section>
    <div class="grid2">
      <section class="tarjeta"><h2>Conciliaciones por estado</h2>
        <table class="tabla"><tbody>${porEstado.map(([e, n]) => `<tr><td>${badge(e)}</td><td class="num">${n}</td></tr>`).join('')}</tbody></table>
      </section>
      <section class="tarjeta"><h2>Recorrido sugerido</h2><ol class="pasos-guia">
        <li><a href="#simulador">Simulador</a>: elija una ruta y vea qué tarifa y admisible se aplican; ejecute un viaje.</li>
        <li><a href="#sinconciliar">Detalle sin conciliar</a>: vea la grilla de V1 y genere la conciliación de la 2da quincena de septiembre de Transportes Cóndor Andino.</li>
        <li><a href="#conciliaciones">Conciliación cisterna</a>: abra "¿Cómo se calculó?", pruebe liberar capacidad, tarifa especial y liberar merma; procese y avance de estado.</li>
        <li><a href="#portal">Portal del transportista</a> y <a href="#sap">SAP</a>: aprobación, registro SAP, facturas y liberación.</li>
        <li>Cambie a <strong>Modo propuesto</strong> en la cabecera y repita: compare resultados y validaciones.</li>
        <li><a href="#destino">Flujo propuesto DESTINO → LEGACY</a>: tarifa por ruta en la oferta, ranking por tarifa y nominación a orden de despacho.</li>
      </ol></section>
    </div>`;
  };

  function mapa(origenId, destinoId) {
    const W = 520, H = 400;
    const px = l => [(l.lon + 71) / 9 * W, (l.lat + 15.8) / -6.5 * H];
    const s = st();
    const o = loc(origenId), d = loc(destinoId);
    let ruta = '';
    if (o.id && d.id && o.id !== d.id) {
      const [x1, y1] = px(o), [x2, y2] = px(d);
      ruta = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ruta"/><circle cx="${x2}" cy="${y2}" r="9" class="destino-halo"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="mapa" role="img" aria-label="Mapa esquemático de localidades">
      <rect x="0" y="0" width="${W}" height="${H}" rx="10" class="mapa-fondo"/>
      ${ruta}
      ${s.localidades.map(l => { const [x, y] = px(l); const sel = l.id === o.id || l.id === d.id;
        return `<g class="loc ${sel ? 'sel' : ''} ${l.nacional ? 'ext' : ''}"><circle cx="${x}" cy="${y}" r="${l.tipo === 'Refinería' ? 7 : 5}"/><text x="${x + 10}" y="${y + 4}">${esc(l.codigo)}</text></g>`; }).join('')}
      <text x="12" y="${H - 12}" class="mapa-nota">Esquema aproximado; no a escala.</text>
    </svg>`;
  }

  V.simulador = () => {
    const s = st(), v = vs().sim;
    const c = cis(v.cisternaId);
    const transId = c.transportistaId;
    const q = { transportistaId: transId, origenId: Number(v.origenId), destinoId: Number(v.destinoId), productoId: Number(v.productoId), fecha: v.fechaRecepcion };
    const principal = M.tarifaVigente(s, q);
    const alterna = M.tarifaVigente(s, Object.assign({}, q, { prioridad: 'ALTERNA' }));
    const todas = s.tarifas.filter(t => t.origenId === q.origenId && t.destinoId === q.destinoId && t.productoId === q.productoId);
    const precio = M.precioMulta(s, q.productoId, v.fechaDespacho, q.origenId);
    const calc = principal ? M.calculadora({ despachos: [v.volDespacho], recepciones: String(v.volRecepcion).split(/[;,\s]+/), tarifaM3: principal.tarifa, admisible: principal.admisible, precioMulta: precio.precioMulta }, modo()) : null;
    return `${cabecera('Simulador "de dónde a dónde"', 'Elija la cisterna, el producto y la ruta. El simulador busca la tarifa como lo hace V1 y calcula una vista previa de la conciliación del viaje.', '<code>DetalleOrdenDespacho.aspx</code> + <code>CRECisterna.aspx</code> + búsqueda <code>MC_DevolverTarifaVigente_OT</code>')}
    <div class="grid2">
      <section class="tarjeta">
        <h2>Viaje</h2>
        <div class="form">
          <label>Cisterna (transportista)<select data-cambio="sim.cisternaId" data-ayuda="simCisterna">${opts(s.cisternas, v.cisternaId, x => x.id, x => `${x.placa} · ${trans(x.transportistaId).nombre} · ${N(x.capacidad)} L`)}</select></label>
          <label>Producto<select data-cambio="sim.productoId">${opts(s.productos, v.productoId)}</select></label>
          <label>Origen (terminal de carga)<select data-cambio="sim.origenId" data-ayuda="simRuta">${opts(s.localidades, v.origenId, x => x.id, x => `${x.codigo} · ${x.nombre}`)}</select></label>
          <label>Destino (planta receptora)<select data-cambio="sim.destinoId" data-ayuda="simRuta">${opts(s.localidades, v.destinoId, x => x.id, x => `${x.codigo} · ${x.nombre}`)}</select></label>
          <label>Fecha de despacho<input type="date" data-cambio="sim.fechaDespacho" value="${esc(v.fechaDespacho)}"></label>
          <label>Volumen despachado (L)<input type="number" min="1" data-cambio="sim.volDespacho" data-ayuda="simVolumen" value="${esc(v.volDespacho)}"></label>
          <label>Fecha de recepción<input type="date" data-cambio="sim.fechaRecepcion" value="${esc(v.fechaRecepcion)}"></label>
          <label>Volumen recibido (L; varios tanques separados por coma)<input type="text" data-cambio="sim.volRecepcion" data-ayuda="simVolumen" value="${esc(v.volRecepcion)}"></label>
        </div>
        <div class="acciones"><button class="btn primario" data-accion="viajeCompleto" data-ayuda="simEjecutar">Ejecutar viaje completo</button></div>
        <p class="ayuda">Crea una orden de despacho aprobada, el CRE de despacho con su lote, el CRE de recepción y la asociación. El viaje queda listo en "Detalle sin conciliar".</p>
      </section>
      <section class="tarjeta">
        <h2>${esc(loc(v.origenId).codigo)} → ${esc(loc(v.destinoId).codigo)}</h2>
        ${mapa(v.origenId, v.destinoId)}
        <p class="ayuda">Área de conciliación del viaje: <strong>${AREAS[loc(v.origenId).area]}</strong> (se define por la localidad de origen).${loc(v.origenId).nacional ? ' Origen extranjero: conciliación TERRESTRE INTERNACIONAL y precio de multa importado.' : ''}</p>
      </section>
    </div>
    <section class="tarjeta">
      <h2 data-ayuda="simTarifas">Tarifas de la ruta para ${esc(prod(v.productoId).nombre)}</h2>
      ${todas.length ? `<table class="tabla"><thead><tr><th>#</th><th>Transportista</th><th>Contrato</th><th>Prioridad</th><th class="num">Bs/m³</th><th class="num">Admisible %</th><th>Desde</th><th>Hasta (contrato)</th><th>Estado</th><th>Aplicada</th></tr></thead><tbody>
      ${todas.map(t => { const ct = M.porId(s.contratos, t.contratoId); const apl = principal && t.id === principal.id ? 'PRINCIPAL vigente' : alterna && t.id === alterna.id ? 'ALTERNA vigente' : '';
        return `<tr class="${apl ? 'resaltada' : ''}"><td>${t.id}</td><td>${esc(trans(ct.transportistaId).nombre)}</td><td>${esc(ct.numero)}</td><td>${t.prioridad}</td><td class="num">${B(t.tarifa)}</td><td class="num">${t.admisible}</td><td>${F(t.vigInicio)}</td><td>${F(ct.vigFin)}</td><td>${t.estado ? 'Activa' : 'Baja'}</td><td>${apl}</td></tr>`; }).join('')}
      </tbody></table>` : nota('No hay ninguna tarifa para esta ruta y producto. En V1 la conciliación tendría flete 0.', 'error')}
      ${principal ? nota(`Para <strong>${esc(trans(transId).nombre)}</strong> a la fecha de recepción ${F(v.fechaRecepcion)}: tarifa PRINCIPAL #${principal.id} = ${B(principal.tarifa)} Bs/m³ (${(principal.tarifa / 1000).toFixed(5)} Bs/L), admisible ${principal.admisible} %. Precio de multa: ${precio.precioMulta} Bs/L (${esc(precio.fuente)}).`, 'ok')
        : nota(`<strong>${esc(trans(transId).nombre)}</strong> no tiene tarifa PRINCIPAL vigente para esta ruta, producto y fecha. V1 devolvería 0 (flete 0).`, 'error')}
    </section>
    ${calc && !calc.error ? `<section class="tarjeta"><h2>Vista previa de la conciliación del viaje</h2>
      <table class="tabla"><thead><tr><th class="num">Recibido</th><th class="num">Despacho imputado</th><th class="num">Admisible</th><th class="num">Balance</th><th class="num">C/D L</th><th class="num">Flete</th><th class="num">C/D Bs</th><th class="num">Total</th></tr></thead><tbody>
      ${calc.resultados.map(r => `<tr><td class="num">${N(r.vr)}</td><td class="num">${N(r.sumaDesp)}</td><td class="num">${N(r.admLote)}</td><td class="num">${N(r.balance)}</td><td class="num">${N(r.cd)}</td><td class="num">${B(r.flete)}</td><td class="num">${neg(r.cdBs)}</td><td class="num"><strong>${B(r.total)}</strong></td></tr>`).join('')}
      </tbody></table>${calc.resultados.map(r => traza(r.pasos, `Pasos para la recepción de ${N(r.vr)} L`)).join('')}</section>` : calc && calc.error ? nota(esc(calc.error), 'error') : ''}`;
  };

  // ───────────────────────── B. Origen ─────────────────────────
  V.localidades = () => {
    const s = st();
    return `${cabecera('Localidades', 'Maestro de plantas, refinerías y terminales. Es la referencia geográfica que DESTINO debe usar en lugar de sus nodos.', 'Tabla <code>Localidad</code> + <code>AreaInfluencia</code>; LEGACY-BACKEND expone <code>LocalidadController</code>')}
    <div class="grid2"><section class="tarjeta"><table class="tabla"><thead><tr><th>ID</th><th>Código</th><th>Código CRE</th><th>Nombre</th><th>Tipo</th><th>Nacionalidad</th><th>Área de conciliación</th></tr></thead><tbody>
    ${s.localidades.map(l => `<tr><td>${l.id}</td><td><strong>${esc(l.codigo)}</strong></td><td>${esc(l.codigoCRE)}</td><td>${esc(l.nombre)}</td><td>${esc(l.tipo)}</td><td>${l.nacional ? 'Extranjera (1)' : 'Nacional (0)'}</td><td>${AREAS[l.area]}</td></tr>`).join('')}
    </tbody></table>${nota('El área de una conciliación de cisterna se toma de la localidad de <strong>origen</strong> del viaje (SitioIDConciliaciones: 1 = RSCZ, 2 = RCBA). Una terminal extranjera convierte la conciliación en TERRESTRE INTERNACIONAL.')}</section>
    <section class="tarjeta">${mapa(null, null)}</section></div>`;
  };

  V.tarifario = () => {
    const s = st(), v = vs().tar;
    const contratos = s.contratos.filter(c => !v.transportistaId || c.transportistaId === Number(v.transportistaId));
    const tarifas = s.tarifas.filter(t => contratos.some(c => c.id === t.contratoId));
    return `${cabecera('Contratos y tarifario por ruta', 'Cada tarifa pertenece a una versión de contrato y define la ruta (localidad origen → destino), el producto, la tarifa por m³, el admisible y la prioridad.', '<code>ContratoDetalle.aspx</code> (tarifas dentro de la versión del contrato) y <code>PanelDeSistema</code> (aprobación de tarifas pendientes); tablas <code>MC_Contrato</code>, <code>MC_ContratoHistorial</code>, <code>MC_TarifaOT</code>. <code>TarifarioOtrosTransportes.aspx</code> es un tarifario anterior que la conciliación no usa.')}
    ${nota('En V1 la tarifa se carga dentro de una versión (adenda) del contrato. La versión recorre EN ELABORACION → PENDIENTE DE APROBACION → PENDIENTE DE LIBERACION → LIBERADO con las actividades "MC Puede Solicitar AP", "MC Puede Solicitar LB" y "MC Puede Liberar"; al liberarse, sus tarifas quedan aprobadas (AprobacionTarifa = 1). Una versión ya usada en una conciliación no se puede revertir. El prototipo simplifica: agrega o da de baja tarifas directamente.')}
    <div class="filtros"><label>Transportista<select data-cambio="tar.transportistaId">${opts(s.transportistas, v.transportistaId, x => x.id, x => x.nombre, 'Todos')}</select></label></div>
    <section class="tarjeta"><h2>Contratos</h2><table class="tabla"><thead><tr><th>Contrato</th><th>Transportista</th><th>Moneda</th><th>Vigencia</th><th>Estado</th><th>Contrato marco</th><th class="num">Programado año</th><th class="num">Ejecutado año</th></tr></thead><tbody>
    ${contratos.map(c => `<tr><td>${esc(c.numero)}</td><td>${esc(trans(c.transportistaId).nombre)}</td><td>${c.moneda}</td><td>${F(c.vigInicio)} – ${F(c.vigFin)}</td><td>${c.estado}</td><td>${c.marco ? esc(c.marco.numero) + (c.marco.controlaPresupuesto ? ' (controla presupuesto)' : '') : '—'}</td><td class="num">${c.marco ? B(c.marco.programado[2026] || 0) : ''}</td><td class="num">${c.marco ? B(c.marco.ejecutado[2026] || 0) : ''}</td></tr>`).join('')}
    </tbody></table></section>
    <section class="tarjeta"><h2>Tarifas (MC_TarifaOT)</h2><table class="tabla"><thead><tr><th>#</th><th>Contrato</th>${th('Origen', 'tOrigen')}${th('Destino', 'tDestino')}${th('Producto', 'tProducto')}${th('Bs/m³', 'tTarifa', 'num')}<th class="num">Bs/L</th>${th('Admisible %', 'tAdmisible', 'num')}${th('Prioridad', 'tPrioridad')}${th('Desde', 'tDesde')}${th('Estado', 'tEstado')}<th></th></tr></thead><tbody>
    ${tarifas.map(t => `<tr class="${t.estado ? '' : 'inactiva'}"><td>${t.id}</td><td>${esc(M.porId(s.contratos, t.contratoId).numero)}</td><td>${esc(loc(t.origenId).codigo)}</td><td>${esc(loc(t.destinoId).codigo)}</td><td>${esc(prod(t.productoId).codigo)}</td><td class="num">${B(t.tarifa)}</td><td class="num">${(t.tarifa / 1000).toFixed(5)}</td><td class="num">${t.admisible}</td><td>${t.prioridad}</td><td>${F(t.vigInicio)}</td><td>${t.estado ? 'Activa' : 'Baja'}</td><td><button class="btn chico" data-accion="alternarTarifa" data-ayuda="tarBaja" data-id="${t.id}">${t.estado ? 'Dar de baja' : 'Activar'}</button></td></tr>`).join('')}
    </tbody></table>${nota('Pruebe dar de baja la tarifa #101 (RCBA → SNK, gasolina, Cóndor Andino) y vuelva a "Detalle sin conciliar": V1 buscará otra tarifa vigente y, si no hay, pondrá flete 0.')}</section>
    <section class="tarjeta"><h2>Agregar tarifa</h2><div class="form form-linea">
      <label>Contrato<select id="nt-contrato">${opts(s.contratos, '', x => x.id, x => `${x.numero} · ${trans(x.transportistaId).nombre}`)}</select></label>
      <label>Origen<select id="nt-origen">${opts(s.localidades, 2, x => x.id, x => x.codigo)}</select></label>
      <label>Destino<select id="nt-destino">${opts(s.localidades, 6, x => x.id, x => x.codigo)}</select></label>
      <label>Producto<select id="nt-producto">${opts(s.productos, 1)}</select></label>
      <label>Bs/m³<input id="nt-tarifa" type="number" step="0.01" value="235"></label>
      <label>Admisible %<input id="nt-admisible" type="number" step="0.01" value="0.30"></label>
      <label>Prioridad<select id="nt-prioridad"><option>PRINCIPAL</option><option>ALTERNA</option></select></label>
      <label>Desde<input id="nt-desde" type="date" value="2026-01-01"></label>
      <button class="btn primario" data-accion="agregarTarifa" data-ayuda="tarAgregar">Agregar</button></div></section>`;
  };

  V.precios = () => {
    const s = st();
    return `${cabecera('Precios de producto', 'El precio de multa valoriza las mermas no admisibles. Se toma el vigente a la fecha de carga del despacho.', 'Tablas <code>ProductoPrecio</code> y <code>MA_PrecioProductoImportado</code>; procedimiento <code>ObtenerPrecioProducto</code>')}
    <section class="tarjeta"><h2>Nacionales</h2><table class="tabla"><thead><tr><th>Producto</th><th>Vigente desde</th><th class="num">PPT nacional (Bs/L)</th><th class="num">Precio de multa (Bs/L)</th></tr></thead><tbody>
    ${s.precios.map(p => `<tr><td>${esc(prod(p.productoId).nombre)}</td><td>${F(p.vigInicio)}</td><td class="num">${p.ppt}</td><td class="num">${p.precioMulta}</td></tr>`).join('')}</tbody></table></section>
    <section class="tarjeta"><h2>Importados</h2><table class="tabla"><thead><tr><th>Producto</th><th>Vigencia</th><th class="num">Precio por m³</th><th>Moneda</th><th class="num">TC</th><th class="num">Precio de multa por L</th></tr></thead><tbody>
    ${s.preciosImportados.map(p => `<tr><td>${esc(prod(p.productoId).nombre)}</td><td>${F(p.vigInicio)} – ${F(p.vigFin)}</td><td class="num">${B(p.precio)}</td><td>${p.moneda}</td><td class="num">${p.tc}</td><td class="num">${(p.precio / 1000).toFixed(4)}</td></tr>`).join('')}</tbody></table>
    ${nota('Si el origen del despacho es una localidad extranjera, V1 usa el precio importado / 1000 y, si la moneda del transportista difiere, lo multiplica por el TC.')}</section>`;
  };

  V.ordenes = () => {
    const s = st(), v = vs().ord;
    const o = v.ordenId ? M.porId(s.ordenes, v.ordenId) : null;
    const lista = [...s.ordenes].sort((a, b) => b.id - a.id);
    const detalle = o ? (() => {
      const tarifasRuta = s.tarifas.filter(t => t.origenId === o.terminalId && t.estado);
      return `<section class="tarjeta">
      <div class="cab-detalle"><h2>Orden ${o.nro ? 'N° ' + o.nro : '#' + o.id} · ${esc(loc(o.terminalId).nombre)} · ${F(o.fecha)}</h2>${badge(o.estado)}<span class="origen-orden">${esc(o.origen)}</span></div>
      <table class="tabla"><thead><tr><th></th><th>Destino</th><th>Producto</th><th>Transportista</th><th>Placa</th><th>Conductor</th>${th('Volumen', 'odVolumen', 'num')}${th('Hoja de ruta', 'odHoja')}${th('Tarifa del viaje', 'odTarifa')}${th('CRE despacho', 'creDesp')}<th></th></tr></thead><tbody>
      ${o.detalles.map(d => { const cre = d.creDespachoId ? M.porId(s.cres, d.creDespachoId) : null; const ta = d.tarifaAsociadaId ? M.porId(s.tarifas, d.tarifaAsociadaId) : null;
        return `<tr><td>${cre ? '' : `<input type="checkbox" data-sel="ord.sel" data-ayuda="ordSel" value="${d.id}" ${v.sel.includes(d.id) ? 'checked' : ''} aria-label="Seleccionar detalle">`}</td><td>${esc(loc(d.destinoId).codigo)}</td><td>${esc(prod(d.productoId).codigo)}</td><td>${esc(trans(d.transportistaId).nombre)}</td><td>${esc(cis(d.cisternaId).placa)}</td><td>${esc((M.porId(s.conductores, d.conductorId) || {}).nombre)}</td><td class="num">${N(d.volumen)}</td><td>${d.hojaRuta}</td>
        <td>${d.tarifaAdjudicada ? `<span class="tag prop">Adjudicada ${B(d.tarifaAdjudicada)} Bs/m³</span>` : ta ? `<span class="tag">Asociada #${ta.id} ${ta.prioridad} ${B(ta.tarifa)}</span>` : '<span class="tenue">Por vigencia</span>'}</td>
        <td>${cre ? esc(cre.numero) : '—'}</td><td>${!cre && o.estado === 'EN ELABORACION' ? `<button class="btn chico" data-accion="quitarDetalle" data-id="${d.id}">Quitar</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="11" class="tenue">Sin detalle.</td></tr>'}
      </tbody></table>
      <div class="acciones">
        <select id="ord-accion">${E.ACCIONES_ORDEN.map(a => `<option>${a.accion}</option>`).join('')}</select>
        <button class="btn" data-accion="estadoOrden" data-ayuda="ordEstado">Cambiar estado</button>
        <span class="sep"></span>
        <label class="inline">Fecha CRE <input type="date" id="ord-fechacre" value="${esc(o.fecha)}"></label>
        <button class="btn primario" data-accion="crearCREs" data-ayuda="ordCRE">Crear CRE de los seleccionados</button>
      </div>
      ${o.estado === 'EN ELABORACION' ? `<h3>Agregar detalle</h3><div class="form form-linea">
        <label>Destino<select id="od-destino">${opts(s.localidades.filter(l => l.id !== o.terminalId), '', x => x.id, x => x.codigo)}</select></label>
        <label>Producto<select id="od-producto">${opts(s.productos, 1)}</select></label>
        <label>Cisterna<select id="od-cisterna">${opts(s.cisternas, '', x => x.id, x => `${x.placa} · ${trans(x.transportistaId).nombre}`)}</select></label>
        <label>Conductor<select id="od-conductor">${opts(s.conductores, '', x => x.id, x => `${x.nombre} · ${trans(x.transportistaId).nombre}`)}</select></label>
        <label>Volumen (L)<input id="od-volumen" type="number" value="30000"></label>
        <label>Tarifa asociada (hoja de ruta)<select id="od-tarifa">${opts(tarifasRuta, '', x => x.id, x => `#${x.id} → ${loc(x.destinoId).codigo} ${prod(x.productoId).codigo} ${x.prioridad} ${x.tarifa}`, 'Ninguna (por vigencia)')}</select></label>
        <button class="btn primario" data-accion="agregarDetalle" data-ayuda="ordDetalle">Agregar</button></div>` : ''}
      <h3>Historial</h3><ul class="historial">${o.historial.map(h => `<li>${F(h.fecha)} · ${esc(h.usuario)} · ${badge(h.estado)}</li>`).join('') || '<li class="tenue">Creada con el escenario.</li>'}</ul>
      ${nota('Estados: EN ELABORACION → PENDIENTE DE APROBACION → APROBADO (número y nómina por correo) → LIBERADO (requiere al menos un CRE). Para crear CRE juntos deben coincidir producto, empresa y destino (RN-OD-03).')}
    </section>`; })() : nota('Seleccione una orden de la lista o cree una nueva.');
    return `${cabecera('Órdenes de despacho', 'La orden autoriza la carga de cada cisterna en una terminal hacia un destino. De ella nace el CRE de despacho.', '<code>OrdenesDeDespacho.aspx</code> y <code>DetalleOrdenDespacho.aspx</code>')}
    <div class="grid-lista">
      <section class="tarjeta"><h2>Órdenes</h2>
        <table class="tabla seleccionable"><thead><tr><th>N°</th><th>Terminal</th><th>Fecha</th><th>Estado</th><th class="num">Detalles</th></tr></thead><tbody>
        ${lista.map(x => `<tr class="${o && x.id === o.id ? 'activa' : ''}" data-accion="verOrden" data-id="${x.id}" tabindex="0"><td>${x.nro || '#' + x.id}</td><td>${esc(loc(x.terminalId).codigo)}</td><td>${F(x.fecha)}</td><td>${badge(x.estado)}</td><td class="num">${x.detalles.length}</td></tr>`).join('')}
        </tbody></table>
        <h3>Nueva orden</h3><div class="form form-linea">
          <label>Terminal<select id="no-terminal">${opts(s.localidades.filter(l => l.tipo !== 'Planta'), 2, x => x.id, x => x.codigo)}</select></label>
          <label>Fecha<input id="no-fecha" type="date" value="${s.hoy}"></label>
          <button class="btn primario" data-accion="crearOrden" data-ayuda="ordCrear">Crear</button></div>
      </section>
      ${detalle}
    </div>`;
  };

  V.cre = () => {
    const s = st(), v = vs().cre;
    const desp = s.cres.filter(c => c.tipo === 3).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const recs = s.cres.filter(c => c.tipo === 8).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const estadoDesp = d => { const r = M.recepcionesDe(s, d.id); if (!r.length) return '<span class="tag aviso">En tránsito</span>';
      const c = r.map(x => M.recepcionConciliada(s, x.id)).find(Boolean); return c ? `<span class="tag ok">Conciliado N° ${c.numero}</span>` : `<span class="tag">Recepcionado (${r.length})</span>`; };
    return `${cabecera('CRE de despacho y de recepción', 'El CRE es el certificado de cada operación. El despacho (tipo 3) registra lo cargado; la recepción (tipo 8) lo recibido. La conciliación compara ambos.', '<code>CRECisterna.aspx</code>, tablas <code>CRE</code>, <code>Lote</code>, <code>CREAsociacion</code>')}
    <section class="tarjeta"><h2>Despachos</h2><table class="tabla"><thead><tr><th></th>${th('CRE', 'creNumero')}${th('Fecha', 'fechaCarga')}${th('Lote', 'creLote')}${th('Plan de viaje', 'planViaje')}${th('Origen', 'origen')}${th('Destino', 'destino')}<th>Producto</th>${th('Placa', 'placa')}<th>Transportista</th>${th('Volumen', 'volDesp', 'num')}<th>Situación</th></tr></thead><tbody>
    ${desp.map(d => { const enTransito = !M.recepcionesDe(s, d.id).length; return `<tr><td>${enTransito ? `<input type="checkbox" data-sel="cre.sel" data-ayuda="creSel" value="${d.id}" ${v.sel.includes(d.id) ? 'checked' : ''} aria-label="Seleccionar despacho">` : ''}</td><td>${esc(d.numero)}</td><td>${F(d.fecha)}</td><td class="mono">${esc(d.loteCodigo)}</td><td class="mono">${esc(d.planViaje)}</td><td>${esc(loc(d.origenId).codigo)}</td><td>${esc(loc(d.destinoId).codigo)}</td><td>${esc(prod(d.productoId).codigo)}</td><td>${esc(cis(d.cisternaId).placa)}</td><td>${esc(trans(cis(d.cisternaId).transportistaId).nombre)}</td><td class="num">${N(d.volumen)}</td><td>${estadoDesp(d)}</td></tr>`; }).join('')}
    </tbody></table>
    <h3>Registrar recepción de los despachos seleccionados</h3><div class="form form-linea">
      <label>Fecha de recepción<input type="date" id="rec-fecha" value="${s.hoy}"></label>
      <label>Volumen recibido (L; uno por tanque, separados por coma)<input id="rec-vol" type="text" placeholder="29880 o 18000, 11900"></label>
      <button class="btn primario" data-accion="registrarRecepcion" data-ayuda="creRecepcion">Registrar recepción</button></div>
    ${nota('Varios despachos de la misma cisterna en una recepción = consolidación (ejemplo 4). Un despacho en varios volúmenes = reparto en varios tanques (ejemplo 5).')}</section>
    <section class="tarjeta"><h2>Recepciones y su asociación</h2><table class="tabla"><thead><tr><th>CRE recepción</th><th>Fecha</th><th>Destino</th><th>Producto</th><th>Placa</th><th class="num">Volumen</th><th>Despachos asociados</th><th>Conciliación</th></tr></thead><tbody>
    ${recs.map(r => { const c = M.recepcionConciliada(s, r.id); return `<tr><td>${esc(r.numero)}</td><td>${F(r.fecha)}</td><td>${esc(loc(r.destinoId).codigo)}</td><td>${esc(prod(r.productoId).codigo)}</td><td>${esc(cis(r.cisternaId).placa)}</td><td class="num">${N(r.volumen)}</td><td>${M.despachosDe(s, r.id).map(d => `${esc(d.numero)} (${N(d.volumen)})`).join(', ')}</td><td>${c ? `<a href="#conciliaciones" data-accion="verConc" data-id="${c.id}">N° ${c.numero}</a>` : '<span class="tenue">Sin conciliar</span>'}</td></tr>`; }).join('')}
    </tbody></table></section>`;
  };

  V.multas = () => {
    const s = st(), v = vs().mul;
    const desp = s.cres.filter(c => c.tipo === 3).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const d = (v.creId && M.porId(s.cres, v.creId)) || desp[0];
    if (!d) return `${cabecera('Multas por incumplimiento por CRE', '', '<code>MultasPorInclumpliento.aspx</code>')}${nota('Este escenario todavía no tiene CRE de despacho. Créelos desde una orden de despacho o con el simulador.')}`;
    const reg = s.multasCRE.filter(m => m.creId === d.id);
    const entrada = id => { if (v.entradas && v.entradas[id] !== undefined && v.creId === d.id) return v.entradas[id]; const r = reg.find(m => m.multaId === id); return r ? r.entrada : ''; };
    const tc = v.tc || s.tc;
    let total = 0;
    const filas = s.multasCatalogo.map(m => {
      const e = entrada(m.id);
      const t = M.calcularMultaCRE(m, m.base === 'fijo' ? !!e : m.base === 'filtracion' ? (e ? (e === true ? m.valor : e) : 0) : e, Number(tc), d.volumen);
      total += t;
      const campo = m.base === 'cantidad'
        ? `<input type="number" min="0" data-multa="${m.id}" value="${esc(e)}" aria-label="${esc(m.unidad)}"> ${esc(m.unidad)}`
        : m.base === 'fijo' ? `<input type="checkbox" data-multa="${m.id}" ${e ? 'checked' : ''} aria-label="Aplicar">`
          : `<input type="checkbox" data-multa="${m.id}" ${e ? 'checked' : ''} aria-label="Aplicar"> MPF ${m.valor} Sus/m³`;
      return `<tr><td><strong>${m.sigla}</strong> · ${esc(m.nombre)}</td><td class="num">${m.valor}</td><td>${m.moneda}</td><td>${campo}</td><td class="num">${B(t)}</td></tr>`;
    }).join('');
    const conc = s.conciliaciones.find(c => c.lineas.some(l => l.despachoId === d.id));
    return `${cabecera('Multas por incumplimiento por CRE', 'Se registran sobre el CRE de despacho y se muestran en la primera línea de ese despacho en la conciliación.', '<code>MultasPorInclumpliento.aspx</code>, tablas <code>Multa</code> y <code>MultaPorIncumplimiento</code>')}
    <section class="tarjeta"><div class="form form-linea">
      <label>CRE de despacho<select data-cambio="mul.creId" data-ayuda="mulCRE">${opts(desp, d.id, x => x.id, x => `${x.numero} · ${F(x.fecha)} · ${cis(x.cisternaId).placa} · ${trans(cis(x.cisternaId).transportistaId).nombre}`)}</select></label>
      <label>Tipo de cambio<input type="number" step="0.01" data-cambio="mul.tc" value="${esc(tc)}"></label></div>
      <p class="ayuda">Volumen entregado: ${N(d.volumen)} L. ${conc ? `Conciliación N° ${conc.numero}: ${badge(conc.estado)}` : 'Aún no conciliado.'}</p>
      <table class="tabla"><thead><tr><th>Multa</th><th class="num">Valor</th><th>Moneda</th><th>Cantidad / aplica</th><th class="num">Total Bs</th></tr></thead><tbody>${filas}
      <tr class="total"><td colspan="4">Total multas</td><td class="num">${B(total)}</td></tr></tbody></table>
      <div class="acciones"><button class="btn primario" data-accion="registrarMultas" data-ayuda="mulRegistrar" data-id="${d.id}">Registrar</button></div>
      ${modoNota('El tipo de cambio de la pantalla original viene fijo en 7,07; aquí se usa el del escenario (6,96). Valores de multas ilustrativos. Existe un segundo mecanismo de multas contractuales (Recargos); solo ese entra al neto de la conciliación.', 'Las multas por CRE y las contractuales se tratan como recargos tipificados y todas entran al neto.')}
    </section>`;
  };

  // ───────────────────────── C. Conciliación ─────────────────────────
  const COLS_V1 = [['Lote', 'lote'], ['Placa', 'placa'], ['Plan de viaje', 'planViaje'], ['Carga', 'fechaCarga'], ['Despacho', 'fechaDespacho'], ['En destino', 'fechaEnDestino'], ['Descarga', 'fechaDescarga'],
    ['Origen', 'origen'], ['Destino', 'destino'], ['Vol. desp.', 'volDesp'], ['Vol. recep.', 'volRec'], ['CRE desp.', 'creDesp'], ['CRE rec.', 'creRec'], ['Tarifa Bs/L', 'tarifa'], ['Fuente tarifa', 'fuenteTarifa'],
    ['Total flete', 'totalFlete'], ['Adm. %', 'admPorc'], ['Adm. L', 'admLts'], ['Bal. lote L', 'balanceLote'], ['Adm. lote L', 'admLote'], ['C/D L', 'cdLts'], ['P.U.', 'pu'], ['Precio multa', 'precioMulta'], ['C/D Bs', 'cdBs'], ['Total a facturar', 'totalFacturar']];
  const filaLineaBase = l => `<tr>
    <td class="mono">${esc(l.lote)}</td><td>${esc(l.placa)}</td><td class="mono">${esc(l.planViaje)}</td><td>${F(l.fechaCarga)}</td><td>${F(l.fechaDespacho)}</td><td>${F(l.fechaEnDestino)}</td><td>${F(l.fechaDescarga)}</td>
    <td>${esc(loc(l.origenId).codigo)}</td><td>${esc(loc(l.destinoId).codigo)}</td><td class="num">${N(l.volDesp)}</td><td class="num">${N(l.volRec)}</td><td>${esc(l.creDespacho)}</td><td>${esc(l.creRecepcion)}</td>
    <td class="num">${l.tarifa.toFixed(5)}</td><td><span class="tag ${l.tarifaFuente === 'SIN TARIFA' ? 'error' : l.tarifaFuente === 'ADJUDICADA' ? 'prop' : ''}">${esc(l.tarifaFuente)}</span></td><td class="num">${B(l.totalFlete)}</td>
    <td class="num">${l.admPorc}</td><td class="num">${N(l.admLts)}</td><td class="num">${N(l.balanceLote)}</td><td class="num">${N(l.admLote)}</td><td class="num">${N(l.cdLts)}</td><td class="num">${l.ppt}</td><td class="num">${l.precioMulta}</td><td class="num">${neg(l.cdBs)}</td><td class="num"><strong>${B(l.totalFacturar)}</strong></td></tr>
    <tr class="fila-traza"><td colspan="${COLS_V1.length}">${traza(l.traza)}</td></tr>`;

  V.sinconciliar = () => {
    const s = st(), v = vs().sc;
    const area = Number(v.area);
    const { grupos, ocultas } = M.recepcionesSinConciliar(s, area, modo());
    grupos.forEach(g => { if (!v.sel[g.clave]) v.sel[g.clave] = { marcado: false, moneda: g.contrato ? g.contrato.moneda : '', recepciones: g.recepciones.map(r => r.recepcion.id) }; });
    return `${cabecera('Detalle sin conciliar', 'Recepciones de cisterna ya asociadas a sus despachos que todavía no están en ninguna conciliación. Se agrupan por transportista y quincena; el cálculo de cada línea se hace aquí.', '<code>DetalleSinConciliar.aspx</code> (tipo de transporte Cisterna); procedimiento <code>DetalleDeCisternasSinConciliar</code>')}
    <div class="filtros"><label>Tipo de transporte<select disabled><option>Cisterna</option></select></label>
      <label>Área<select data-cambio="sc.area" data-ayuda="scArea">${[1, 2, 3].map(a => `<option value="${a}" ${a === area ? 'selected' : ''}>${AREAS[a]}</option>`).join('')}</select></label>
      <button class="btn primario" data-accion="generar" data-ayuda="scGenerar">Generar</button></div>
    ${modoNota('Se ocultan recepciones de más de 90 días y de transportistas sin contrato vigente (RN-GEN-01). La tarifa se busca por la fecha de recepción.', 'No se oculta nada: las recepciones antiguas o sin contrato se muestran con alerta para decidir. La tarifa adjudicada en DESTINO tiene prioridad.')}
    ${grupos.length ? grupos.map(g => { const sel = v.sel[g.clave]; const tr = trans(g.transportistaId);
      return `<section class="tarjeta grupo">
        <div class="cab-grupo"><label class="inline"><input type="checkbox" data-ayuda="scGrupo" data-grupo="${esc(g.clave)}" ${sel.marcado ? 'checked' : ''}> <strong>${esc(tr.nombre)}</strong></label>
          <span>${AREAS[g.area]}</span><span>${g.quincena === 1 ? '1ra' : '2da'} Quincena</span><span>${M.MESES[g.mes]} ${g.anio}</span>
          <label class="inline">Moneda <select data-ayuda="scMoneda" data-moneda="${esc(g.clave)}">${g.contrato ? `<option ${sel.moneda === g.contrato.moneda ? 'selected' : ''}>${g.contrato.moneda}</option>` : '<option value="">(sin moneda)</option>'}</select></label>
          <span class="tenue">Contrato ${g.contrato ? esc(g.contrato.numero) + (g.contrato.marco ? ' · marco ' + esc(g.contrato.marco.numero) : '') : '—'}</span></div>
        ${g.alertas.map(a => nota(esc(a), 'aviso')).join('')}
        ${g.recepciones.map(r => { const tot = r.lineas.reduce((a, l) => ({ flete: a.flete + l.totalFlete, cd: a.cd + l.cdBs, total: a.total + l.totalFacturar }), { flete: 0, cd: 0, total: 0 });
          return `<div class="recepcion"><div class="cab-rec"><label class="inline"><input type="checkbox" data-ayuda="scRecepcion" data-rec="${esc(g.clave)}" value="${r.recepcion.id}" ${sel.recepciones.includes(r.recepcion.id) ? 'checked' : ''}> CRE recepción <strong>${esc(r.recepcion.numero)}</strong></label>
            <span>${esc(prod(r.recepcion.productoId).nombre)}</span><span>${F(r.recepcion.fecha)}</span><span>Despachos ${N(r.sumaDesp)} L</span><span>Recepción ${N(r.recepcion.volumen)} L</span><span>Balance ${N(r.recepcion.volumen - r.sumaDesp)} L</span><span>Total ${B(tot.total)}</span></div>
            <div class="tabla-scroll"><table class="tabla densa"><thead><tr>${COLS_V1.map(c => th(c[0], c[1])).join('')}</tr></thead><tbody>${r.lineas.map(filaLineaBase).join('')}</tbody></table></div></div>`; }).join('')}
      </section>`; }).join('') : nota('No hay recepciones pendientes de conciliar en esta área.')}
    ${ocultas.length ? `<section class="tarjeta"><h2>Recepciones que V1 no muestra</h2><table class="tabla"><thead><tr><th>CRE</th><th>Fecha</th><th>Transportista</th><th class="num">Volumen</th><th>Motivo</th></tr></thead><tbody>
      ${ocultas.map(o => `<tr><td>${esc(o.rec.numero)}</td><td>${F(o.rec.fecha)}</td><td>${esc(trans(M.transportistaDeCRE(s, o.rec)).nombre)}</td><td class="num">${N(o.rec.volumen)}</td><td>${o.motivos.map(esc).join('; ')}</td></tr>`).join('')}
      </tbody></table>${nota('Estas recepciones no aparecen en la pantalla original: un viaje antiguo nunca se concilia en el sistema (defecto D9).', 'aviso')}</section>` : ''}`;
  };

  V.conciliaciones = () => {
    const s = st(), v = vs().conc;
    const lista = s.conciliaciones.filter(c => (!v.estado || c.estado === v.estado) && (!v.transportistaId || c.transportistaId === Number(v.transportistaId))).sort((a, b) => b.numero - a.numero);
    const c = v.concId ? M.porId(s.conciliaciones, v.concId) : null;
    return `${cabecera('Conciliación cisterna', 'Revise el cálculo, aplique ajustes, procese y avance la conciliación por sus estados.', '<code>ConciliacionCisterna.aspx</code> (control <code>ConciliacionCisterna.ascx</code>)')}
    <div class="filtros"><label>Estado<select data-cambio="conc.estado"><option value="">Todos</option>${M.ESTADOS.map(e => `<option ${e === v.estado ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
      <label>Transportista<select data-cambio="conc.transportistaId">${opts(s.transportistas, v.transportistaId, x => x.id, x => x.nombre, 'Todos')}</select></label></div>
    <section class="tarjeta"><table class="tabla seleccionable"><thead><tr>${th('N°', 'numero')}<th>Transportista</th><th>Área</th><th>Periodo</th>${th('Estado', 'estado')}${th('Neto flete', 'netoFlete', 'num')}${th('Mermas', 'mermas', 'num')}${th('Multa transp.', 'multaTransp', 'num')}${th('Neto conciliado', 'neto', 'num')}${th('Moneda', 'moneda')}${th('SAP', 'sap')}</tr></thead><tbody>
    ${lista.map(x => { const d = M.recalcular(s, x, modo()); return `<tr class="${c && c.id === x.id ? 'activa' : ''}" data-accion="verConc" data-ayuda="concFila" data-id="${x.id}" tabindex="0"><td>${x.numero}</td><td>${esc(trans(x.transportistaId).nombre)}</td><td>${AREAS[x.area]}</td><td>${periodoTxt(x)}</td><td>${badge(x.estado)}</td><td class="num">${B(d.cab.flete)}</td><td class="num">${neg(d.cab.mermas)}</td><td class="num">${neg(d.cab.multaTransporte)}</td><td class="num"><strong>${B(d.cab.neto)}</strong></td><td>${x.moneda}</td><td>${x.sap ? esc(x.sap.estado) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="11" class="tenue">No hay conciliaciones con estos filtros. Genérelas en "Detalle sin conciliar".</td></tr>'}
    </tbody></table></section>
    ${c ? V.detalleConciliacion(c) : nota('Seleccione una conciliación para ver su detalle.')}`;
  };

  V.detalleConciliacion = (c, soloLectura) => {
    const s = st();
    const d = M.recalcular(s, c, modo());
    const editable = !soloLectura && c.estado === 'En Elaboracion';
    const k = d.cab;
    const filaTot = (txt, val, entra) => `<tr class="${entra ? '' : 'fuera'}"><td>${txt}</td><td class="num">${neg(val)}</td><td>${entra ? 'Entra al neto' : 'Informativo'}</td></tr>`;
    const totales = `<table class="tabla"><tbody>
      ${filaTot('Neto flete facturable', k.flete, true)}
      ${filaTot('Total multa mermas (compensadas por producto)', k.mermas, true)}
      ${filaTot('Multa transporte (recargo CCIST)', k.multaTransporte, true)}
      ${filaTot('Multas por CRE (MultaPorIncumplimiento)', k.multasCRE, modo() === 'PROPUESTO')}
      ${filaTot('Multa de conciliación (MC)', k.multaConciliacion, modo() === 'PROPUESTO')}
      ${filaTot('Descuento de conciliación (DC)', k.descuentoConciliacion, modo() === 'PROPUESTO')}
      ${filaTot('Casos especiales', k.casosEspeciales, modo() === 'PROPUESTO')}
      ${filaTot('Carro guía', k.carroGuia, modo() === 'PROPUESTO')}
      <tr class="total"><td>Neto conciliado (${c.moneda})</td><td class="num">${B(k.neto)}</td><td></td></tr></tbody></table>
      <p class="ayuda">${esc(k.formula)}</p>`;
    const productos = `<table class="tabla"><thead><tr><th>Producto</th><th class="num">Flete</th><th class="num">Mermas brutas</th><th class="num">Mermas aplicadas</th><th class="num">Volumen</th></tr></thead><tbody>
      ${Object.values(d.productos).map(p => `<tr><td>${esc(prod(p.productoId).nombre)}</td><td class="num">${B(p.flete)}</td><td class="num">${neg(p.mermasBrutas)}</td><td class="num">${neg(p.mermas)}${p.compensado ? ' <span class="tag">demasía compensada → 0</span>' : ''}</td><td class="num">${N(p.volumen)}</td></tr>`).join('')}</tbody></table>`;
    const grupos = d.grupos.map(g => `<div class="recepcion"><div class="cab-rec"><span>CRE recepción <strong>${esc(g.recepcion.numero)}</strong></span><span>${esc(prod(g.productoId).nombre)}</span><span>Despachos ${N(g.tot.despachos)} L</span><span>Recepciones ${N(g.tot.recepciones)} L</span><span>Flete ${B(g.tot.flete)}</span><span>Mermas ${neg(g.tot.mermas)}</span><span>Multas CRE ${neg(g.tot.multasIn)}</span><span>Neto ${B(g.tot.neto)}</span></div>
      <div class="tabla-scroll"><table class="tabla densa"><thead><tr>${th('Lote', 'lote')}${th('Placa', 'placa')}${th('CRE desp.', 'creDesp')}${th('Origen → destino', 'origen')}${th('Vol. desp.', 'volDesp', 'num')}${th('Vol. recep.', 'volRec', 'num')}${th('Tarifa', 'tarifa', 'num')}${th('Fuente', 'fuenteTarifa')}${th('Adm. L', 'admLts', 'num')}${th('Bal. lote', 'balanceLote', 'num')}${th('C/D L', 'cdLts', 'num')}${th('Precio multa', 'precioMulta', 'num')}${th('C/D Bs', 'cdBs', 'num')}${th('Multas CRE', 'multasCRE', 'num')}${th('Total flete', 'totalFlete', 'num')}${th('Total a facturar', 'totalFacturar', 'num')}${th('Liberar capacidad', 'liberarCapacidad')}${th('Tarifa especial', 'tarifaEspecial')}${th('Liberar merma', 'liberarMerma')}${th('Observación', 'observacion')}${editable ? '<th>Cambiar tarifa</th>' : ''}${c.disputas && Object.keys(c.disputas).length ? '<th>Disputa</th>' : ''}</tr></thead><tbody>
      ${g.lineas.map(l => `<tr class="${l.desactualizado ? 'desactualizada' : ''}"><td class="mono">${esc(l.lote)}</td><td>${esc(l.placa)}</td><td>${esc(l.creDespacho)}</td><td>${esc(loc(l.origenId).codigo)} → ${esc(loc(l.destinoId).codigo)}</td><td class="num">${N(l.volDesp)}</td><td class="num">${N(l.volRec)}</td>
        <td class="num">${l.tarifaAplicada.toFixed(5)}</td><td><span class="tag ${l.tarifaFuente === 'SIN TARIFA' ? 'error' : l.tarifaFuente === 'ADJUDICADA' ? 'prop' : ''}">${esc(l.ajuste.tarifaEspecial ? 'ESPECIAL' : l.tarifaFuente)}</span></td><td class="num">${N(l.admLts)}</td><td class="num">${N(l.balanceLote)}</td><td class="num">${N(l.cdLts)}</td><td class="num">${l.precioMulta}</td><td class="num">${neg(l.cdBs)}</td><td class="num">${neg(l.multasIn)}</td><td class="num">${B(l.totalFlete)}</td>
        <td class="num"><strong>${B(l.totalFacturar)}</strong>${l.desactualizado ? ' <span class="tag aviso" title="V1 no recalcula esta celda cuando el C/D es mayor o igual a cero (D12)">desactualizado</span>' : ''}</td>
        <td>${l.ultima ? `<input type="number" class="in-chico" data-ajuste="liberarCapacidad" data-ayuda="ajCapacidad" data-key="${l.key}" value="${esc(l.ajuste.liberarCapacidad || '')}" ${editable ? '' : 'disabled'} aria-label="Liberar capacidad">` : ''}</td>
        <td><input type="number" step="0.00001" class="in-chico" data-ajuste="tarifaEspecial" data-ayuda="ajTarifaEsp" data-key="${l.key}" value="${esc(l.ajuste.tarifaEspecial || '')}" ${editable ? '' : 'disabled'} aria-label="Tarifa especial"></td>
        <td><input type="checkbox" data-ajuste="liberarMerma" data-ayuda="ajMerma" data-key="${l.key}" ${l.liberarMerma ? 'checked' : ''} ${editable ? '' : 'disabled'} aria-label="Liberar merma"></td>
        <td><input type="text" class="in-obs" data-ajuste="observacion" data-key="${l.key}" value="${esc(l.ajuste.observacion || '')}" ${editable ? '' : 'disabled'} aria-label="Observación"></td>
        ${editable ? `<td class="nowrap"><button class="btn chico" data-accion="cambiarTarifa" data-ayuda="ajTarifaPA" data-key="${l.key}" data-prioridad="PRINCIPAL">P</button><button class="btn chico" data-accion="cambiarTarifa" data-ayuda="ajTarifaPA" data-key="${l.key}" data-prioridad="ALTERNA">A</button></td>` : ''}
        ${c.disputas && Object.keys(c.disputas).length ? `<td>${esc(c.disputas[l.key] || '')}</td>` : ''}</tr>
        <tr class="fila-traza"><td colspan="22">${traza(l.traza.concat(l.trazaAjuste), '¿Cómo se calculó esta línea?')}${modo() === 'PROPUESTO' && l.ajuste.auditoria ? traza(l.ajuste.auditoria.map(a => `${a.fecha} · ${a.usuario}: ${a.campo} = ${a.valor}`), 'Auditoría de ajustes') : ''}</td></tr>`).join('')}
      </tbody></table></div></div>`).join('');
    const acciones = soloLectura ? '' : `<div class="acciones barra">
      <label class="inline">Acción <select id="conc-accion" data-ayuda="concAccion">
        <optgroup label="Ofrecidas por V1 (si el usuario tiene la actividad)">${M.ACCIONES.filter(a => a.ofrecidaV1).map(a => `<option>${a.accion}</option>`).join('')}</optgroup>
        <optgroup label="${modo() === 'V1' ? 'En el código pero no ofrecidas en V1 (comentadas)' : 'Propuesta: transiciones manuales'}">${M.ACCIONES.filter(a => !a.ofrecidaV1).map(a => `<option>${a.accion}</option>`).join('')}</optgroup>
      </select></label>
      <button class="btn primario" data-accion="transicion" data-ayuda="concCambiar">Cambiar estado</button>
      <span class="sep"></span>
      <button class="btn" data-accion="procesar" data-ayuda="concProcesar">Calcular y procesar</button>
      <a class="btn" href="#recargos">Recargos</a>
      <label class="inline">Factura por mermas <input id="f-mermas" value="${esc(c.facturaMermas)}" data-factura="facturaMermas" data-ayuda="concFacturas"></label>
      <label class="inline">Factura por incumplimiento <input id="f-inc" value="${esc(c.facturaIncumplimiento)}" data-factura="facturaIncumplimiento" data-ayuda="concFacturas"></label>
    </div>`;
    return `<section class="tarjeta detalle-conc">
      <div class="cab-detalle"><h2>Conciliación N° ${c.numero} · ${esc(trans(c.transportistaId).nombre)}</h2>${badge(c.estado)}
        <span>${AREAS[c.area]} · ${periodoTxt(c)} · ${c.moneda}${c.nroContratoMarco ? ' · Contrato marco ' + esc(c.nroContratoMarco) : ''}</span>
        ${c.facturasPagadas === false ? '<span class="tag error">Factura pendiente de pago</span>' : ''}</div>
      ${acciones}
      ${modoNota('La lista de V1 solo ofrece 4 acciones y cada una exige la actividad correspondiente en la seguridad externa (ConciliacionCisterna.ascx.vb:151-166); el prototipo no simula actividades por usuario. Tras la aprobación del transportista la conciliación avanza desde <a href="#sap">SAP</a>: el pedido la pasa a "Pendiente de Aprobacion" y la liberación de la hoja de entrada, a "Liberado". "Solicitar Aprobacion LOG", "Solicitar Liberacion" y "Liberar Conciliacion" existen en el código pero están comentadas en la lista.', `Cada transición exige un rol. Rol actual: <strong>${esc(E.ui.rol)}</strong>. Cámbielo en la cabecera.`)}
      <div class="grid2"><div><h3 data-ayuda="concTotales">Totales</h3>${totales}</div><div><h3 data-ayuda="concProductos">Por producto (RN-TOT-02)</h3>${productos}
        <h3>Historial</h3><ul class="historial">${c.historial.map(h => `<li>${F(h.fecha)} · ${esc(h.usuario)} · ${esc(h.accion)} ${badge(h.estado)}</li>`).join('')}</ul></div></div>
      <h3>Detalle por recepción y despacho</h3>${grupos}
    </section>`;
  };

  // InicializarRangoFechas (líneas 247-269): quincena en cisterna, mes completo en barcaza y vagón.
  V.otRango = v => {
    const [pi, pf] = v.tipo === 'Cisterna' ? M.periodoQuincena(Number(v.anio), Number(v.mes), Number(v.quincena))
      : [M.periodoQuincena(Number(v.anio), Number(v.mes), 1)[0], M.periodoQuincena(Number(v.anio), Number(v.mes), 2)[1]];
    return [v.fi || pi, v.ff || pf];
  };

  // ───────────────────────── Otros Transportes: asistente, origen de fila ─────────────────────────
  const np = (n, t) => `<span class="num-paso"${t ? ` title="${esc(t)}"` : ''}>${n}</span>`;
  V.OT_CORRECCIONES = [
    '¿La cisterna tomó una ruta alterna autorizada (bloqueo, desvío)? → columna Tarifa: elige A1. Si se acordó otro precio, escríbelo en "Tarifa especial".',
    '¿Faltó producto por una causa ajena al transportista (medidor descalibrado, error de la planta)? → marca "Lib. merma".',
    '¿La terminal no llenó la cisterna por falta de producto? → escribe la capacidad de la cisterna en "Lib. capacidad L".',
    '¿Una recepción no debe pagarse todavía (reclamo, precinto roto, investigación)? → 🗑 excluir.',
    '¿Falta una recepción del periodo (se registró tarde)? → "Nuevo convoy".',
    '¿No sabes de dónde sale un número? → 🔎 en la fila.'
  ];
  // Pasos visibles en la pantalla; los marcados como "fuera" se hacen en otra pantalla.
  V.OT_PASOS = [['filtrar', '1', 'Filtrar'], ['marcar', '2', 'Marcar'], ['revisar', '3', 'Revisar y corregir'], ['procesar', '4', 'Procesar'],
    ['enviar', '5', 'Enviar ✔'], ['aceptar', '6', 'Acepta el transportista ✔'], ['facturas', '7', 'Facturas'], ['pedido', 'SAP', 'Pedido', true],
    ['liberacion', '8', 'Liberación ✔'], ['sap', 'SAP', 'Hoja y aceptación', true], ['fin', '✓', 'Liberado', true]];

  // Qué debe hacer el usuario ahora en la pantalla, según permisos, filtros, selección y estado.
  V.otSiguiente = (s, v, p, lista, c) => {
    const R = (paso, titulo, hacer, sel, porque, alternativas, extra) => ({ paso, titulo, hacer, sel, porque, alternativas: alternativas || [], extra: extra || '' });
    if (!E.tieneAccesoOT()) return R('acceso', 'Tu usuario no tiene acceso', `El rol "${E.ui.rol}" no tiene ningún permiso en CONFIGURACION_CONCILIACIONES. Cambia "Usuario simulado" (cabecera) a Analista LOG o Jefe LOG.`, '#rol', 'En V1 el usuario sin permisos es enviado a SinAcceso.aspx.');
    if (v.tipo !== 'Cisterna') return R('filtrar', 'Elige el tipo "Cisterna"', 'El prototipo solo tiene datos de cisternas. Las reglas de barcaza y vagón, con ejemplos, están en "Otros Transportes: de principio a fin".', '[data-cambio="ot.tipo"]');
    if (!lista.length) {
      const periodos = [...new Map(s.conciliaciones.map(x => [`${x.area}|${x.anio}|${x.mes}|${x.quincena}`, x])).values()];
      return R('filtrar', 'No hay conciliaciones con estos filtros', 'Cambia área, mes o quincena, o usa un atajo. Si la conciliación aún no existe, se genera en "Detalle sin conciliar": esta pantalla no crea conciliaciones.', '.filtros', 'La lista muestra solo las conciliaciones del tipo, área y periodo elegidos.',
        [], periodos.length ? `<p class="atajos"><strong>Periodos con conciliaciones:</strong> ${periodos.map(x => `<button class="btn chico" data-accion="otIrPeriodo" data-id="${x.id}">${AREAS[x.area]} · ${periodoTxt(x)}</button>`).join(' ')}</p>` : '<p class="atajos"><a class="btn chico primario" href="#sinconciliar">Ir a Detalle sin conciliar</a></p>');
    }
    if (!c) {
      const pref = lista.find(x => x.estado === 'En Elaboracion') || lista[0];
      return R('marcar', 'Marca una conciliación', `Marca la casilla de la fila N° ${pref.numero} (${pref.estado}).`, `[data-ot-sel="${pref.id}"]`, 'Al marcarla se abre su detalle por recepción y los botones de trabajo.');
    }
    const b = M.otBotones(c.estado, p);
    const aprobar = `[data-accion="otAprobar"][data-id="${c.id}"]`;
    const rechazo = 'Si el transportista no está de acuerdo: ✖ Rechazar (permiso PuedeRechazarConciliacion: Jefe LOG o Gerente). Vuelve a "En Elaboracion" para corregir.';
    const otroRol = (permiso, roles) => R(null, 'Tu rol no tiene este botón', `Falta el permiso ${permiso}. Cambia "Usuario simulado" a ${roles}.`, '#rol', 'Cada botón depende del estado de la conciliación y de un permiso Puede*. Revisa la tabla de permisos al pie.');
    switch (c.estado) {
      case 'En Elaboracion':
        if (v.convoy) return R('revisar', 'Elige las recepciones del nuevo convoy', 'Marca las recepciones que faltaban y pulsa "Aceptar" (o "Cancelar").', '[data-accion="otAgregar"]', 'Solo aparecen recepciones del mismo transportista y área, sin conciliar, dentro del rango de fechas.');
        if (Object.keys(v.edits || {}).length) return R('procesar', 'Tienes cambios sin guardar', 'Pulsa "Procesar" para guardarlos y recalcular el flete y el neto.', '[data-accion="otProcesar"]', 'Como en V1, los cambios de la grilla solo se guardan al procesar.');
        if (!c.procesada) return R('revisar', 'Revisa cada fila y corrige lo necesario', 'Lee las filas del detalle (una por recepción). Si algo no corresponde, corrígelo según las alternativas; si todo está bien, pulsa "Procesar".', '[data-accion="otProcesar"]', 'Procesar guarda los ajustes y calcula el neto que verá el transportista.', V.OT_CORRECCIONES);
        return b.aprobar ? R('enviar', 'Envíala al transportista', `Pulsa ✔ en la fila de la N° ${c.numero}.`, aprobar, 'Pasa a "En Aprobacion de Transportista" y ya no se puede editar.', ['¿Falta corregir algo? Corrige y vuelve a pulsar "Procesar".'].concat(V.OT_CORRECCIONES))
          : Object.assign(otroRol('PuedeSolicitarAprobacion', 'Analista LOG o Jefe LOG'), { paso: 'enviar' });
      case 'En Aprobacion de Transportista':
        return b.aprobar ? R('aceptar', 'Registra la aceptación del transportista', `Pulsa ✔ en la N° ${c.numero}. En V1 lo hace un usuario de logística en nombre del transportista (defecto D22).`, aprobar, 'Crea el registro SAP "Sin Registrar en SAP", envía el correo para crear el pedido y las alertas de factura.', [rechazo])
          : Object.assign(otroRol('PuedeSolicitarAprobacion', 'Analista LOG o Jefe LOG'), { paso: 'aceptar' });
      case 'Aprobada Por Transportista': {
        const k = M.recalcular(s, c, 'V1').cab;
        if (k.mermas && !c.facturaMermas) return R('facturas', 'Registra la factura por mermas', `Escribe el número de factura en "Factura mermas" de la N° ${c.numero} y sal del campo (Tab).`, `[data-ot-factura="facturaMermas"][data-id="${c.id}"]`, `Se descontaron ${B(-k.mermas)} Bs de mermas: el transportista las paga con una factura.`, [rechazo]);
        if (k.multaTransporte && !c.facturaIncumplimiento) return R('facturas', 'Registra la factura por incumplimiento', `Escribe el número de factura en "Factura incumplimiento" de la N° ${c.numero}.`, `[data-ot-factura="facturaIncumplimiento"][data-id="${c.id}"]`, `Hay multas de transporte por ${B(-k.multaTransporte)} Bs.`, [rechazo]);
        return R('pedido', 'Sigue en SAP: crea el pedido', `Esta pantalla ya no tiene ✔ para la N° ${c.numero}. Ve a "Contabilización y SAP", pulsa su fila y luego "Crear pedido".`, '#ot-ir-sap', 'El pedido de compra la pasa a "Pendiente de Aprobacion" y vuelve aquí para solicitar la liberación.', [rechazo]);
      }
      case 'Pendiente de Aprobacion':
        return b.aprobar ? R('liberacion', 'Solicita la liberación', `Pulsa ✔ en la N° ${c.numero}.`, aprobar, 'Último control de logística. V1 cancela la solicitud si el transportista tiene facturas impagas mayores al umbral.', ['Si aparece el bloqueo de facturas: en "Contabilización y SAP" pulsa la conciliación indicada, "Marcar facturas pagadas", y vuelve.'])
          : Object.assign(otroRol('PuedeSolicitarLiberacion', 'Jefe LOG o Gerente de Dist. y Ventas'), { paso: 'liberacion', porque: 'Separación de funciones: quien prepara la conciliación no la libera.' });
      case 'Pendiente de Liberacion':
        return R('sap', 'Termina en SAP', 'Ve a "Contabilización y SAP", pulsa la fila de la conciliación y, en orden: "Liberar pedido", "Registrar hoja de entrada" y "Liberar hoja".', '#ot-ir-sap', 'Al liberar la hoja de entrada, la conciliación queda "Liberado". En Otros Transportes ya no hay nada más que hacer.');
      default:
        return R('fin', '¡Conciliación terminada!', 'Está "Liberado": el pago lo hace Finanzas a partir de SAP. Mira el resultado y lo que sigue en el camino completo.', '#ot-ir-mapa', 'No quedan acciones en SILOG para esta conciliación.');
    }
  };

  const asistenteOT = sig => {
    V.otSigActual = sig;
    const idx = V.OT_PASOS.findIndex(x => x[0] === sig.paso);
    return `<section class="tarjeta asistente" aria-live="polite">
      <div class="asistente-cab"><strong data-ayuda="otAsistente">¿Qué hago ahora?</strong><a id="ot-ir-mapa" class="btn chico" href="#otmapa">Ver el camino completo: de dónde viene y a dónde va</a></div>
      <ol class="ot-pasos" aria-label="Pasos en esta pantalla">${V.OT_PASOS.map((x, i) => `<li class="${idx >= 0 && i < idx ? 'hecho' : i === idx ? 'actual' : ''}${x[3] ? ' fuera' : ''}"${i === idx ? ' aria-current="step"' : ''}><span>${idx >= 0 && i < idx ? '✔' : x[1]}</span>${esc(x[2])}</li>`).join('')}</ol>
      <div class="asistente-ahora">
        <p class="ahora-titulo">${esc(sig.titulo)}</p>
        <p>${esc(sig.hacer)}</p>
        ${sig.porque ? `<p class="tenue"><strong>Por qué:</strong> ${esc(sig.porque)}</p>` : ''}
        ${sig.extra}
        <div class="acciones">${sig.sel ? '<button class="btn chico primario" data-accion="otDonde">Mostrar dónde</button>' : ''}${['pedido', 'sap'].includes(sig.paso) ? '<a id="ot-ir-sap" class="btn chico" href="#sap">Ir a Contabilización y SAP</a>' : ''}</div>
      </div>
      ${sig.alternativas.length ? `<details class="alternativas"><summary>Alternativas en este momento (${sig.alternativas.length})</summary><ul>${sig.alternativas.map(a => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}
      <p class="ayuda">Los números ${np(1)} ${np(2)} ${np(3)}… de la pantalla marcan dónde se hace cada paso. "SAP" se hace en otra pantalla y vuelve aquí.</p>
    </section>`;
  };

  // "¿De dónde viene esta fila?": cadena de origen de una recepción de la conciliación.
  const dec5 = v => Number(v).toFixed(5).replace('.', ',');
  V.otOrigen = (s, c, f) => {
    const ls = f.lineas, rec = f.rec, ult = ls[ls.length - 1];
    const items = [];
    const desps = ls.map(l => M.porId(s.cres, l.despachoId));
    desps.forEach((d, i) => {
      const z = s.ordenes.flatMap(o => o.detalles.map(x => ({ o, x }))).find(y => y.x.creDespachoId === d.id);
      if (z) items.push(['Orden de despacho', `${esc(loc(z.o.terminalId).codigo)}-${z.o.nro || 's/n'} del ${F(z.o.fecha)} (${esc(z.o.estado)}). Detalle: ${esc(loc(z.x.destinoId).codigo)}, ${esc(prod(z.x.productoId).codigo)}, ${N(z.x.volumen)} L autorizados, hoja de ruta ${z.x.hojaRuta}${z.x.nota ? `. Nota: ${esc(z.x.nota.replace(/\.$/, ''))}` : ''}.`, 'OrdenDeDespacho, OrdenDespachoDetalle · DetalleOrdenDespacho.aspx', 'ordenes']);
      if (i === 0) { const ci = cis(d.cisternaId), co = M.porId(s.conductores, d.conductorId) || {};
        items.push(['Transportista y cisterna', `${esc(trans(ci.transportistaId).nombre)} · placa ${esc(ci.placa)} (${N(ci.capacidad)} L) · conductor ${esc(co.nombre || '')}.`, 'MedioTransportePropietario, Cisterna, Conductor', 'ordenes']); }
      items.push([`CRE de despacho${desps.length > 1 ? ` ${i + 1} de ${desps.length}` : ''}`, `${esc(d.numero)} del ${F(d.fecha)}: ${N(d.volumen)} L cargados en ${esc(loc(d.origenId).codigo)}; lote ${esc(d.loteCodigo)}.`, 'CRE (TipoCRE 3), Lote · lado A de la comparación', 'cre']);
    });
    items.push(['CRE de recepción', `${esc(rec.numero)} del ${F(rec.fecha)}: ${N(rec.volumen)} L recibidos en ${esc(loc(rec.destinoId).codigo)}.`, 'CRE (TipoCRE 8) asociado por CREAsociacion · lado B', 'cre']);
    const contrato = M.contratoVigente(s, c.transportistaId, rec.fecha);
    const t0 = M.porId(s.tarifas, ult.tarifaId);
    items.push(['Contrato y tarifa', `Contrato ${esc(contrato ? contrato.numero : '—')}. Al generar: ${t0 ? `tarifa #${t0.id} ${t0.prioridad} ${N(t0.tarifa)} Bs/m³ (${dec5(t0.tarifa / 1000)} Bs/L), admisible ${N(t0.admisible)} %, vigente desde ${F(t0.vigInicio)}` : 'sin tarifa vigente (flete 0)'}. Aplicada ahora: ${dec5(ult.tarifa)} Bs/L (${esc(ult.tarifaFuente)}).`, 'MC_Contrato, MC_ContratoHistorial, MC_TarifaOT · MC_DevolverTarifaVigente_OT; la lista P/A1/0 sale de MC_ObtenerPrioridadesTarifas', 'tarifario']);
    items.push(['Precio de multa', `${N(ult.precioMulta)} Bs/L (${esc(ult.precioFuente)}).`, 'ProductoPrecio (MA_PrecioProductoImportado si el origen es extranjero) · ObtenerPrecioProducto', 'precios']);
    const multas = s.multasCRE.filter(m => desps.some(d => d.id === m.creId));
    if (multas.length) items.push(['Multas por CRE', `${multas.map(m => `${esc((M.porId(s.multasCatalogo, m.multaId) || {}).nombre)}: ${B(m.total)} Bs`).join('; ')}. En V1 son informativas: no entran al neto (D13).`, 'Multa, MultaPorIncumplimiento', 'multas']);
    const a = ls.map(l => (c.ajustes || {})[l.key] || {});
    const aj = [a.every(x => x.liberarMerma) && 'merma liberada', a.some(x => x.liberarCapacidad) && `capacidad liberada a ${N(a.reduce((t, x) => t + Number(x.liberarCapacidad || 0), 0))} L`,
      a.some(x => x.tarifaEspecial) && 'tarifa especial', a.some(x => x.observacion) && `observación "${esc(a.map(x => x.observacion).filter(Boolean).join(' '))}"`, /^LISTA/.test(ult.tarifaFuente) && `tarifa cambiada en la lista (${esc(ult.tarifaFuente)})`].filter(Boolean);
    items.push(['Ajustes en esta conciliación', aj.length ? aj.join(', ') + '.' : 'Ninguno.', 'ConciliacionCisternaDetalle: LiberarMerma, LiberarCapacidad, Tarifa, TarifaEspecialBs, Observacion · se guardan al Procesar', 'ot']);
    const d = M.recalcular(s, c, 'V1').grupos.find(g => g.recepcionId === rec.id);
    const pasos = [].concat(...ls.map(l => l.traza || [])).concat(...(d ? d.lineas.map(l => l.trazaAjuste) : []));
    return `<div class="origen-cadena"><h4>¿De dónde viene la fila ${esc(rec.numero)}?</h4>
      <ol class="cadena-origen">${items.map((x, i) => `<li><span class="cad-n">${i + 1}</span><div><strong>${x[0]}</strong> ${x[1]}<br><span class="cad-fuente">${esc(x[2])}</span> · <a href="#${x[3]}">ver pantalla</a></div></li>`).join('')}</ol>
      <h4>Cálculo paso a paso</h4><ol class="cadena-calculo">${pasos.map(t => `<li>${esc(t)}</li>`).join('')}<li><strong>Flete actual de la fila: ${B(f.flete)} Bs${f.liberarMerma ? '; C/D liberado (no se descuenta)' : `; C/D ${B(f.cdBs)} Bs`}.</strong></li></ol>
      <p class="ayuda">Se guarda en <code>ConciliacionCisternaDetalle</code> (${ls.length} línea${ls.length > 1 ? 's' : ''}, una por despacho) y esta pantalla la lee con <code>CARGAR_DATOS_CONCILIACION_OT 'DETALLE'</code>, que agrupa las líneas en una fila por recepción (sumas y promedios).</p></div>`;
  };

  // Conciliación Otros Transportes (ConciliacionOtrosTransportes.aspx + ConciliacionOTDetalle.aspx)
  V.ot = () => {
    const s = st(), v = vs().ot, p = E.permisosOT();
    const cab = cabecera('Conciliación Otros Transportes', 'Pantalla unificada para revisar, editar y hacer avanzar conciliaciones de cisterna, barcaza y vagón, con permisos finos por usuario. No crea conciliaciones: "Nuevo convoy" agrega recepciones a una existente.', '<code>ConciliacionOtrosTransportes.aspx</code> y <code>ConciliacionOTDetalle.aspx</code>; procedimiento <code>CARGAR_DATOS_CONCILIACION_OT</code>');
    const permisos = `<details class="tarjeta permisos-ot"><summary data-ayuda="otPermisos"><strong>Permisos por usuario (CONFIGURACION_CONCILIACIONES simulada)</strong> · rol actual: ${esc(E.ui.rol)}</summary>
      <div class="tabla-scroll"><table class="tabla densa"><thead><tr><th>Rol</th>${M.PERMISOS_OT.map(x => `<th>${esc(x.replace('Puede', ''))}</th>`).join('')}</tr></thead><tbody>
      ${Object.keys(s.permisosOT).map(r => `<tr class="${r === E.ui.rol ? 'activa' : ''}"><td class="nowrap">${esc(r)}</td>${M.PERMISOS_OT.map(x => `<td><input type="checkbox" data-permiso="${x}" data-rol="${esc(r)}" ${s.permisosOT[r][x] ? 'checked' : ''} aria-label="${esc(x)} para ${esc(r)}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div><p class="ayuda">En V1 los permisos se guardan por usuario, tipo de conciliación y área. Aquí se simulan por rol y aplican a todas las áreas.</p></details>`;
    if (!E.tieneAccesoOT()) return `${cab}${asistenteOT(V.otSiguiente(s, v, p, [], null))}${nota('<strong>SinAcceso.aspx</strong>: el usuario no tiene ninguna fila en CONFIGURACION_CONCILIACIONES para este tipo y área (CargarTipoDeConciliacionesPermitidas, líneas 66-87). Cambie el rol en la cabecera o asigne permisos abajo.', 'error')}${permisos}`;
    const [fi, ff] = V.otRango(v);
    const filtros = `<div class="filtros">
      <label>Tipo de transporte<select data-cambio="ot.tipo">${['Cisterna', 'Barcaza', 'Vagon'].map(t => `<option ${t === v.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Área<select data-cambio="ot.area">${[1, 2].map(a => `<option value="${a}" ${a === Number(v.area) ? 'selected' : ''}>${AREAS[a]}</option>`).join('')}</select></label>
      <label>Transportista<select data-cambio="ot.transportistaId"><option value="0">(Todos)</option>${opts(s.transportistas, v.transportistaId)}</select></label>
      <label>Mes<select data-cambio="ot.mes">${M.MESES.slice(1).map((m, i) => `<option value="${i + 1}" ${i + 1 === Number(v.mes) ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label>Año<select data-cambio="ot.anio">${[2025, 2026].map(a => `<option ${a === Number(v.anio) ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      ${v.tipo === 'Cisterna' ? `<label>Quincena<select data-cambio="ot.quincena"><option value="1" ${Number(v.quincena) === 1 ? 'selected' : ''}>1ra Quincena</option><option value="2" ${Number(v.quincena) === 2 ? 'selected' : ''}>2da Quincena</option></select></label>` : ''}
      <label>Fecha inicio<input type="date" data-cambio="ot.fi" value="${fi}" ${p.PuedeEditarFechas ? '' : 'disabled'}></label>
      <label>Fecha fin<input type="date" data-cambio="ot.ff" value="${ff}" ${p.PuedeEditarFechas ? '' : 'disabled'}></label></div>`;
    if (v.tipo !== 'Cisterna') return `${cab}${asistenteOT(V.otSiguiente(s, v, p, [], null))}${filtros}${nota(`El prototipo no tiene ${v.tipo === 'Barcaza' ? 'barcazas ni bones' : 'vagones'} en sus datos. Las reglas propias están documentadas en <code>CONCILIACION_OTROS_TRANSPORTES_V1.md</code>: ${v.tipo === 'Barcaza' ? 'sin prorrateo de despachos, compensación de capacidad con % y capacidad máxima del bone (§6)' : 'flete por toneladas recibidas, merma calculada en litros y kg pero no cobrada, costo de formularios 28,5 por vagón (§7)'}.`, 'aviso')}${permisos}`;
    const lista = s.conciliaciones.filter(c => c.mes === Number(v.mes) && c.anio === Number(v.anio) && c.area === Number(v.area) && c.quincena === Number(v.quincena) &&
      (!Number(v.transportistaId) || c.transportistaId === Number(v.transportistaId))).sort((a, b) => a.numero - b.numero);
    const c = v.concId ? lista.find(x => x.id === v.concId) : null;
    const sig = V.otSiguiente(s, v, p, lista, c);
    const filasCab = lista.map(x => {
      const b = M.otBotones(x.estado, p), t = M.otTotales(s, x), ed = x.estado === 'Aprobada Por Transportista' || x.estado === 'En Elaboracion';
      return `<tr class="${c && c.id === x.id ? 'activa' : ''}">
        <td><input type="checkbox" data-ayuda="otSel" data-ot-sel="${x.id}" ${c && c.id === x.id ? 'checked' : ''} aria-label="Seleccionar conciliación ${x.numero}"></td>
        <td><strong>${esc(trans(x.transportistaId).nombre.toUpperCase())}</strong><br><span class="tenue"># ${x.numero} - ${AREAS[x.area]} ${x.moneda === 'Bs' ? 'BOB' : 'USD'}</span></td>
        <td>${badge(x.estado)}</td>
        <td>${b.aprobar ? `<button class="btn chico primario" data-accion="otAprobar" data-ayuda="otAprobar" data-id="${x.id}" title="Aprobar">✔</button>` : ''}</td>
        <td>${b.rechazar ? `<button class="btn chico" data-accion="otRechazar" data-ayuda="otRechazar" data-id="${x.id}" title="Rechazar">✖</button>` : ''}</td>
        <td><input class="in-chico" value="${esc(x.facturaMermas)}" data-ot-factura="facturaMermas" data-id="${x.id}" ${ed ? '' : 'disabled'} aria-label="Factura por mermas"></td>
        <td><input class="in-chico" value="${esc(x.facturaIncumplimiento)}" data-ot-factura="facturaIncumplimiento" data-id="${x.id}" ${ed ? '' : 'disabled'} aria-label="Factura por incumplimiento"></td>
        <td><table class="mini">${t.filas.map(f => `<tr><td>${esc(f[0])}</td><td class="num">${B(f[1])}</td></tr>`).join('')}<tr class="total"><td>Neto Conciliado</td><td class="num">${B(t.neto)}</td></tr></table>
          ${t.neto !== t.netoGuardado ? `<span class="tag aviso" title="El total mostrado suma todos los recargos; NetoConciliado guardado no (D29)">guardado ${B(t.netoGuardado)}</span>` : ''}</td></tr>`;
    }).join('');
    let detalle = '';
    if (c) {
      const editable = c.estado === 'En Elaboracion';
      const ed = v.edits;
      const filas = M.otFilas(s, c);
      detalle = `<section class="tarjeta"><div class="cab-detalle"><h2>N° ${c.numero} · detalle por recepción</h2>${badge(c.estado)}</div>
        <p class="paso-ui">${np(3, 'Paso 3')} Revisa cada fila (una por recepción); ${editable ? 'corrige con las columnas editables, 🗑 o "Nuevo convoy"' : 'ya no es editable en este estado'}. ${np(4, 'Paso 4')} "Procesar" guarda y recalcula. 🔎 explica de dónde viene cada dato.</p>
        <div class="acciones">${p.PuedeProcesar ? '<button class="btn primario" data-accion="otProcesar" data-ayuda="otProcesar"><span class="num-paso">4</span> Procesar</button>' : ''}
          ${p.PuedeProcesar && editable ? '<button class="btn" data-accion="otConvoy" data-ayuda="otConvoy">Nuevo convoy</button>' : ''}
          ${p.PuedeProcesar ? '<a class="btn" href="#recargos">Ver recargos</a>' : ''}</div>
        <div class="tabla-scroll"><table class="tabla densa"><thead><tr>${editable ? '<th></th>' : ''}<th>Origen</th><th>Recepción</th><th>Tiempo</th><th>Tramo</th>${th('Despacho', 'volDesp', 'num')}${th('Recepción', 'volRec', 'num')}${th('Balance', 'balanceLote', 'num')}${th('Adm.', 'admLts', 'num')}${th('C/D L', 'cdLts', 'num')}${th('P. multa', 'precioMulta', 'num')}${th('C/D Bs', 'cdBs', 'num')}${th('Lib. merma', 'liberarMerma')}${th('Lib. capacidad L', 'liberarCapacidad')}${th('Tarifa', 'tarifa')}${th('Tarifa especial', 'tarifaEspecial')}${th('Flete', 'totalFlete', 'num')}${th('Observación', 'observacion')}</tr></thead><tbody>
        ${filas.map(f => {
          const e = ed[f.recepcionId] || {};
          const opciones = M.otOpcionesTarifa(s, c, f.rec);
          const tarSel = e.tarifa !== undefined ? Number(e.tarifa) : f.tarifa;
          if (!opciones.some(o => o.valor === tarSel)) opciones.unshift({ etiqueta: f.tarifaPromediada ? 'prom.' : 'guardada', valor: tarSel });
          const dis = permiso => editable && p[permiso] ? '' : 'disabled';
          return `<tr>${editable ? `<td><button class="btn chico" data-accion="otExcluir" data-ayuda="otExcluir" data-rec="${f.recepcionId}" title="Excluir recepción">🗑</button></td>` : ''}
            <td><button class="btn chico" data-accion="otOrigen" data-ayuda="otOrigen" data-rec="${f.recepcionId}" aria-expanded="${v.origen === f.recepcionId}" title="¿De dónde viene esta fila?">🔎</button></td>
            <td class="nowrap"><strong>${esc(f.rec.numero)}</strong><br>${esc(f.producto)} - ${f.admPorc}% · ${esc(f.placa)}</td>
            <td class="nowrap">${F(f.fechaCarga)}<br>${F(f.fechaDescarga)}</td><td class="nowrap">${esc(f.tramo)}</td>
            <td class="num">${N(f.despacho)}</td><td class="num">${N(f.recepcion)}</td><td class="num">${N(f.balance)}</td><td class="num">${N(f.admLts)}</td><td class="num">${N(f.cdLts)}</td><td class="num">${f.precioMulta}</td>
            <td class="num ${f.liberarMerma ? 'tachado' : ''}">${neg(f.cdBs)}</td>
            <td><input type="checkbox" data-ot-edit="liberarMerma" data-ot-rec="${f.recepcionId}" ${(e.liberarMerma !== undefined ? e.liberarMerma : f.liberarMerma) ? 'checked' : ''} ${dis('PuedeLiberarMerma')} aria-label="Liberar merma"></td>
            <td><input type="number" class="in-chico" data-ot-edit="liberarCapacidad" data-ot-rec="${f.recepcionId}" value="${esc(e.liberarCapacidad !== undefined ? e.liberarCapacidad : (f.liberarCapacidad || ''))}" ${dis('PuedeLiberarCapacidad')} aria-label="Liberar capacidad"></td>
            <td><select data-ayuda="otTarifa" data-ot-edit="tarifa" data-ot-rec="${f.recepcionId}" ${dis('PuedeCambiarTarifa')} aria-label="Tarifa">${opciones.map(o => `<option value="${o.valor}" data-etiqueta="${o.etiqueta}" ${o.valor === tarSel ? 'selected' : ''}>${o.valor.toFixed(5)} ${o.etiqueta}</option>`).join('')}</select>${f.tarifaPromediada ? ' <span class="tag aviso" title="Las líneas tienen tarifas distintas: V1 muestra y guarda el promedio (D27)">prom.</span>' : ''}</td>
            <td><input type="number" step="0.00001" class="in-chico" data-ot-edit="tarifaEspecial" data-ot-rec="${f.recepcionId}" value="${esc(e.tarifaEspecial !== undefined ? e.tarifaEspecial : (f.tarifaEspecial || ''))}" ${dis('PuedeColocarTarifaEspecial')} aria-label="Tarifa especial"></td>
            <td class="num"><strong>${B(f.flete)}</strong></td>
            <td><input class="in-obs" data-ot-edit="observacion" data-ot-rec="${f.recepcionId}" value="${esc(e.observacion !== undefined ? e.observacion : f.observacion)}" ${editable ? '' : 'disabled'} aria-label="Observación"></td></tr>${v.origen === f.recepcionId ? `<tr class="fila-origen"><td colspan="${editable ? 18 : 17}">${V.otOrigen(s, c, f)}</td></tr>` : ''}`;
        }).join('')}</tbody></table></div>
        <p class="ayuda">Los cambios se guardan al pulsar Procesar (como en V1). Una fila agrupa las líneas de la recepción: sumas, precio y tarifa promediados, y "liberar merma" marcado solo si todas las líneas lo tienen.</p>
        ${v.convoy ? (() => {
          const cand = M.otCandidatas(s, c, fi, ff);
          return `<div class="convoy"><h3>Nuevo convoy · ${esc(trans(c.transportistaId).nombre)} · ${AREAS[c.area]} · ${F(fi)} – ${F(ff)}</h3>
            ${cand.length ? `<table class="tabla densa"><thead><tr><th></th><th>CRE recepción</th><th>Producto</th><th>Fecha</th><th class="num">Despachos</th><th class="num">Recepción</th><th class="num">C/D Bs</th><th class="num">Flete</th></tr></thead><tbody>
            ${cand.map(r => { const u = r.lineas[r.lineas.length - 1]; return `<tr><td><input type="checkbox" data-convoy="${r.recepcion.id}" ${v.convoySel.includes(r.recepcion.id) ? 'checked' : ''} aria-label="Agregar ${esc(r.recepcion.numero)}"></td><td>${esc(r.recepcion.numero)}</td><td>${esc(prod(r.recepcion.productoId).codigo)}</td><td>${F(r.recepcion.fecha)}</td><td class="num">${N(r.sumaDesp)}</td><td class="num">${N(r.recepcion.volumen)}</td><td class="num">${neg(r.lineas.reduce((x, l) => x + l.cdBs, 0))}</td><td class="num">${B(u.totalFlete)}</td></tr>`; }).join('')}</tbody></table>
            <div class="acciones"><button class="btn primario" data-accion="otAgregar">Aceptar</button><button class="btn" data-accion="otConvoy">Cancelar</button></div>`
            : nota('No hay recepciones del transportista en el área y el rango de fechas que no estén conciliadas.')}
            <p class="ayuda">Sin ventana de 90 días y sin control de contrato, moneda ni presupuesto (D30).</p></div>`; })() : ''}
      </section>`;
    }
    return `${cab}${modoNota('Botones por fila según el estado y los permisos del usuario. "Aprobar" en "En Aprobacion de Transportista" lo pulsa un usuario de logística (D22). Después de "Aprobada Por Transportista" avanza con el pedido en SAP.', 'Los mismos datos; en la reingeniería el transportista aprobaría desde su portal y el rechazo verificaría SAP.')}
      ${asistenteOT(sig)}
      <p class="paso-ui">${np(1, 'Paso 1')} Filtra el tipo, el área y el periodo.</p>
      ${filtros}
      <section class="tarjeta"><div class="tabla-scroll"><table class="tabla seleccionable"><thead><tr><th>${np(2, 'Paso 2: marca la conciliación')}</th><th>Transportista</th><th>Estado</th><th>Aprobar ${np('5·6·8', 'Pasos 5, 6 y 8: el mismo botón ✔ según el estado')}</th><th>Rechazar</th><th>Factura mermas ${np(7, 'Paso 7')}</th><th>Factura incumplimiento</th><th>Totales</th></tr></thead><tbody>
      ${filasCab || `<tr><td colspan="8" class="tenue">No hay conciliaciones de ${M.MESES[v.mes]} ${v.anio}${v.tipo === 'Cisterna' ? ', ' + (Number(v.quincena) === 1 ? '1ra' : '2da') + ' quincena' : ''}, área ${AREAS[v.area]}.</td></tr>`}
      </tbody></table></div><p class="ayuda">Marque una conciliación para ver su detalle, procesar o agregar un convoy.</p></section>
      ${detalle}${permisos}`;
  };

  // Otros Transportes de principio a fin: etapas, alternativas, resultado final y origen de cada dato.
  V.otmapa = () => {
    const s = st(), v = vs().otm;
    const todas = [...s.conciliaciones].sort((a, b) => b.numero - a.numero);
    const c = v.concId ? M.porId(s.conciliaciones, Number(v.concId)) || null : null;
    const actual = SILOG.otEtapaActual(s, c);
    const k = c ? M.recalcular(s, c, 'V1').cab : null;
    const CARRIL = { antes: 'Otra pantalla · así nace', ot: 'En Otros Transportes', despues: 'Otra pantalla · SAP y pago' };
    const etapas = SILOG.OT_ETAPAS.map(e => {
      const estado = e.n < actual ? 'hecho' : e.n === actual ? 'aqui' : 'pend';
      const dato = c && e.n < actual && e.dato ? e.dato(s, c) : '';
      return `${e.inicioOT ? '<li class="ot-marca">▼ AQUÍ EMPIEZA el trabajo en "Conciliación Otros Transportes": la conciliación ya existe y llega "En Elaboracion"</li>' : ''}
        <li class="ot-etapa carril-${e.carril} ${estado}">
        <span class="ot-n" aria-hidden="true">${estado === 'hecho' ? '✔' : e.n}</span>
        <div class="ot-cuerpo">
          <div class="ot-tit"><strong>${e.n}. ${esc(e.titulo)}</strong> <span class="tag carril">${CARRIL[e.carril]}</span>${e.opcional ? ' <span class="tag">opcional</span>' : ''}${e.vuelve ? ' <span class="tag">sale y vuelve a Otros Transportes</span>' : ''}${estado === 'aqui' ? ' <span class="tag aqui">Estás aquí</span>' : estado === 'hecho' ? ' <span class="tag ok">Hecho</span>' : ''}</div>
          <dl class="ot-dl"><dt>Quién</dt><dd>${esc(e.quien)}</dd><dt>Pantalla V1</dt><dd class="mono">${esc(e.v1)}</dd><dt>Entra</dt><dd>${esc(e.entra)}</dd><dt>Sale</dt><dd>${esc(e.sale)}</dd><dt>Dónde queda</dt><dd class="mono">${esc(e.tablas)}</dd><dt>Para qué</dt><dd>${esc(e.para)}</dd></dl>
          ${dato ? `<p class="ot-dato"><strong>Dato real de la N° ${c.numero}:</strong> ${esc(dato)}</p>` : ''}
          <a class="btn chico${estado === 'aqui' ? ' primario' : ''}" href="#${e.vista}">Ir a ${esc(V.NOMBRES_VISTA[e.vista] || e.vista)}</a>
        </div></li>
        ${e.finOT ? '<li class="ot-marca fin">▲ AQUÍ TERMINA el trabajo en Otros Transportes: lo que sigue ocurre en SAP y en Finanzas</li>' : ''}`;
    }).join('');
    const ALT = [
      ['La cisterna tomó una ruta alterna autorizada (bloqueo, desvío)', 'Columna Tarifa: elegir A1 (ALTERNA); 0 si no corresponde pagar', 'PuedeCambiarTarifa', 'El flete se recalcula con la tarifa elegida al Procesar.'],
      ['Se acordó un precio distinto por un caso excepcional', 'Tarifa especial (Bs/L)', 'PuedeColocarTarifaEspecial', 'Reemplaza la tarifa de la recepción.'],
      ['Faltó producto sin culpa del transportista (medidor descalibrado, error de la planta)', 'Marcar "Lib. merma"', 'PuedeLiberarMerma', 'El C/D de la recepción no se descuenta (se ve tachado).'],
      ['La terminal no llenó la cisterna (falta de producto)', '"Lib. capacidad L" = capacidad de la cisterna', 'PuedeLiberarCapacidad', 'Base del flete = capacidad − despachado + recibido.'],
      ['Una recepción no debe pagarse todavía (reclamo, precinto roto, investigación)', '🗑 Excluir recepción', 'PuedeProcesar, en elaboración', 'Sale con sus recargos y vuelve a "sin conciliar".'],
      ['Falta una recepción del periodo (registrada tarde o excluida antes)', '"Nuevo convoy"', 'PuedeProcesar, en elaboración', 'Se agrega sin volver a validar contrato, moneda ni presupuesto (D30).'],
      ['El transportista no está de acuerdo con el monto', '✖ Rechazar', 'PuedeRechazarConciliacion (Jefe LOG, Gerente)', 'Vuelve a "En Elaboracion"; V1 no revisa si ya hay registro en SAP (D25).'],
      ['El transportista debe facturas por mermas o multas mayores al umbral', 'Bloqueo automático al solicitar la liberación', 'FacturasPendienteAPagar', 'Se cancela la solicitud hasta que las facturas figuren pagadas.'],
      ['El pedido SAP se anuló', 'Anular pedido (Contabilización y SAP)', 'Sincronizaciones_To_SAP', 'La conciliación vuelve a "En Elaboracion".'],
      ['Un usuario no ve un botón', 'Revisar los permisos al pie de Otros Transportes', 'CONFIGURACION_CONCILIACIONES', 'Cada botón depende del estado y de un permiso Puede*.']
    ];
    const DATOS = [
      ['Transportista, N°, área, moneda', 'Al generar la conciliación', 'ConciliacionCisterna', 'Transportista dueño de la cisterna; área del origen; moneda del contrato.'],
      ['Estado', 'Botones ✔ / ✖ y circuito SAP', 'ConciliacionCisterna.Estado', 'Etapas 11 a 16.'],
      ['Recepción (N°, producto, placa)', 'Planta de destino: CRE de recepción', 'CRE (TipoCRE 8), Producto, Cisterna', ''],
      ['Tiempo y tramo', 'Fechas y localidades de los CRE', 'CRE, Localidad', 'V1 busca origen y destino por nombre (D32).'],
      ['Despacho (L)', 'Terminal: CRE de despacho', 'CRE (TipoCRE 3), CREAsociacion', 'Si un despacho va a varias recepciones se reparte en proporción (redondeo bancario).'],
      ['Recepción (L)', 'Planta: CRE de recepción', 'CRE.CREVolumenConsolidadoLTS', ''],
      ['Balance', 'Calculado', 'ConciliacionCisternaDetalle', 'Recibido − despachado.'],
      ['Adm. (L)', 'Calculado con el % de la tarifa', 'MC_TarifaOT.Admisible', 'Despachado × % / 100, truncado y redondeado.'],
      ['C/D L', 'Calculado', 'ConciliacionCisternaDetalle', 'Demasía si el balance es positivo; si la falta supera el admisible, falta + admisible; si no, 0.'],
      ['P. multa', 'Precio de producto vigente', 'ProductoPrecio / MA_PrecioProductoImportado', ''],
      ['C/D Bs', 'Calculado', 'ConciliacionCisternaDetalle', 'C/D L × precio de multa; por producto, las demasías compensan las mermas.'],
      ['Tarifa', 'Contrato del transportista', 'MC_TarifaOT (Bs/m³ ÷ 1000)', 'En la fila se muestra el promedio de sus líneas (D27).'],
      ['Flete', 'Calculado', 'ConciliacionCisternaDetalle.TotalFlete', 'Recibido (o base de capacidad liberada) × tarifa.'],
      ['Totales de la fila', 'ObtenerMontosDeConciliacion', 'ConciliacionCisterna, MC_MultaDescuentoConciliacion', 'Suma todos los conceptos; el neto guardado solo flete + mermas + multa de transporte (D29).']
    ];
    return `${cabecera('Otros Transportes: de principio a fin', 'De dónde vienen los datos, dónde empieza y dónde termina el trabajo en "Conciliación Otros Transportes", qué alternativas hay en cada momento y qué se obtiene al final.')}
    <section class="tarjeta"><h2>¿Para qué existe?</h2><div class="grid3">
      <div><strong>Pagar el flete correcto</strong><p>Por cada viaje de la quincena se paga lo recibido × la tarifa del contrato, con los ajustes que correspondan.</p></div>
      <div><strong>Cobrar lo que se perdió</strong><p>Si llegó menos producto del tolerado (admisible), la diferencia se descuenta al precio de multa y se factura al transportista.</p></div>
      <div><strong>Registrarlo en SAP</strong><p>Pedido de compra y hoja de entrada de servicio, para que Finanzas pague y el gasto quede contabilizado.</p></div></div>
      <p class="ayuda">Una conciliación = un transportista + un área (RSCZ o RCBA) + una quincena + una moneda. "Conciliación Otros Transportes" es la pantalla donde se revisa, se corrige y se aprueba: no crea conciliaciones ni paga.</p></section>
    <section class="tarjeta"><h2>El camino, etapa por etapa</h2>
      ${todas.length ? `<div class="filtros"><label>Sigue una conciliación<select data-cambio="otm.concId"><option value="">Ninguna: el camino desde el principio</option>${todas.map(x => `<option value="${x.id}" ${c && x.id === c.id ? 'selected' : ''}>N° ${x.numero} · ${esc(trans(x.transportistaId).nombre)} · ${AREAS[x.area]} · ${periodoTxt(x)} · ${esc(x.estado)}</option>`).join('')}</select></label></div>
        ${c ? `<p>La N° ${c.numero} está en <strong>${esc(c.estado)}</strong>: etapa ${actual} de 17, "${esc(SILOG.OT_ETAPAS[actual - 1].titulo)}". ${actual >= 7 && actual <= 15 && actual !== 14 ? `<button class="btn chico primario" data-accion="otmTrabajar" data-id="${c.id}">Abrirla en Otros Transportes</button>` : ''}</p>`
          : '<p>Sin conciliación elegida: las etapas 1 a 5 se ven hechas (ya hay tarifas, órdenes y CRE) y la siguiente es la 6, "Generar la conciliación". Elige una conciliación para ver en qué etapa está y sus datos reales.</p>'}`
        : nota('Aún no hay conciliaciones en este escenario: el camino está en la etapa 6, "Generar la conciliación". Las etapas 1 a 5 se ven como hechas si ya existen tarifas, órdenes y CRE.')}
      <div class="ot-leyenda"><span class="tag carril-antes">Otra pantalla · así nace</span><span class="tag carril-ot">En Otros Transportes</span><span class="tag carril-despues">Otra pantalla · SAP y pago</span></div>
      <ol class="ot-linea">${etapas}</ol></section>
    <section class="tarjeta"><h2>Caminos alternativos: qué hacer si…</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Situación</th><th>Qué hacer</th><th>Permiso o mecanismo</th><th>Efecto</th></tr></thead><tbody>
      ${ALT.map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td><td class="mono">${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="tarjeta ot-resultado"><div class="grid2"><div><h2>Resultado final esperado</h2><ul>
      <li>Conciliación en <strong>Liberado</strong> con su neto conciliado guardado (flete + mermas + multa de transporte).</li>
      <li>En SAP: <strong>pedido de compra</strong> y <strong>hoja de entrada de servicio aceptada</strong> por el flete de cada producto, con su cuenta contable y CeBe.</li>
      <li>Factura por mermas (y por incumplimiento, si corresponde) registrada para cobrar al transportista.</li>
      <li>Ejecución del contrato marco actualizada con el flete conciliado.</li>
      ${c ? `<li>Para la N° ${c.numero} (${esc(c.estado)}): neto ${B(k.neto)} ${esc(c.moneda)} = flete ${B(k.flete)} ${k.mermas < 0 ? '−' : '+'} mermas ${B(Math.abs(k.mermas))}${k.multaTransporte ? ` − multa de transporte ${B(Math.abs(k.multaTransporte))}` : ''}.</li>` : ''}</ul></div>
      <div><h2>Qué sigue después</h2><ul>
      <li>Finanzas paga al transportista contra su factura de flete y la hoja de entrada aceptada [I: ocurre fuera de SILOG].</li>
      <li>El transportista paga la factura por mermas; mientras no lo haga y supere el umbral, V1 bloquea la liberación de sus siguientes conciliaciones.</li>
      <li>Las recepciones excluidas siguen "sin conciliar": se agregan con "Nuevo convoy" o entran en otra conciliación.</li>
      <li>Reportes de control: BalanceOtrosTransporte.aspx, RecepcionesOT.aspx y DespachosOT.aspx.</li>
      <li>La quincena siguiente vuelve a empezar en la etapa 2 con nuevas órdenes.</li></ul></div></div></section>
    <section class="tarjeta"><h2>De dónde viene cada dato de la pantalla</h2><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Dato en Otros Transportes</th><th>Dónde nace</th><th>Tabla o fuente</th><th>Cálculo o advertencia</th></tr></thead><tbody>
      ${DATOS.map(x => `<tr><td><strong>${esc(x[0])}</strong></td><td>${esc(x[1])}</td><td class="mono">${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`).join('')}</tbody></table></div>
      <p class="ayuda">En la pantalla, el botón 🔎 de cada fila muestra esta cadena con los datos reales de esa recepción.</p></section>
    <section class="tarjeta"><h2>¿Y barcaza y vagón?</h2><div class="grid2">
      <div><h3>Barcaza (ejemplo ilustrativo)</h3><p>Un bone con capacidad de 1.000.000 L en época baja se despacha con 950.000 L y se reciben 948.000 L; tarifa 50 Bs/m³ (0,05 Bs/L).</p><ul>
        <li>Flete = 948.000 × 0,05 = 47.400,00 Bs.</li>
        <li>Compensación de capacidad (100 %): 1.000.000 − 950.000 = 50.000 L, porque lo recibido es menor que la capacidad → 50.000 × 0,05 = 2.500,00 Bs que se suman al flete.</li>
        <li>Sin prorrateo: si el despacho se descarga en dos recepciones, cuenta completo en cada una (D31).</li></ul></div>
      <div><h3>Vagón (ejemplo ilustrativo)</h3><p>Un vagón entrega 33.950 kg de diésel; tarifa 120 Bs por tonelada.</p><ul>
        <li>Toneladas = 33.950 / 1.000 = 33,95 t; flete = 33,95 × 120 = 4.074,00 Bs (la tarifa no se divide entre 1000).</li>
        <li>La merma se calcula en litros y kg, pero no se cobra (se fuerza a 0).</li>
        <li>Costo de formularios: 28,5 por vagón.</li></ul></div></div>
      ${nota('Las reglas están comprobadas en el código de V1 (<code>CONCILIACION_OTROS_TRANSPORTES_V1.md</code> §6 y §7); los números son ilustrativos porque el prototipo no tiene barcazas ni vagones en sus datos.')}</section>`;
  };

  V.recargos = () => {
    const s = st(), v = vs().conc;
    const recientes = [...s.conciliaciones].sort((a, b) => b.numero - a.numero);
    const conc = v.concId ? M.porId(s.conciliaciones, v.concId) : recientes.find(c => c.estado === 'En Elaboracion') || recientes[0];
    if (!conc) return `${cabecera('Recargos de la conciliación', '', '<code>MultaDescuentoConciliacion.aspx</code>')}${nota('No hay una conciliación seleccionada. Abra una en "Conciliación cisterna".')}`;
    const editable = conc.estado === 'En Elaboracion';
    const cat = s.recargosCatalogo.filter(r => r.empresas.includes(conc.transportistaId));
    const despachos = [...new Set(conc.lineas.map(l => l.despachoId))].map(id => M.porId(s.cres, id));
    const aplicado = (catId, creId) => conc.recargos.some(r => r.catalogoId === catId && (r.creId || null) === (creId || null));
    const d = M.recalcular(s, conc, modo());
    return `${cabecera(`Recargos · Conciliación N° ${conc.numero}`, `${esc(trans(conc.transportistaId).nombre)} · ${periodoTxt(conc)} · ${badge(conc.estado)}`, '<code>MultaDescuentoConciliacion.aspx</code>; tablas <code>MC_MultasDescuentos</code>, <code>MC_MultaDescuentoConciliacion</code>, <code>DetalleCasosConciliacionCisterna</code>, <code>CG_ConciliacionCarroGuia</code>')}
    ${editable ? '' : nota('La conciliación no está en elaboración: los recargos son de solo lectura.', 'aviso')}
    <section class="tarjeta"><h2>Multas y descuentos contractuales</h2>
      ${cat.length ? cat.map(r => r.aplicabilidad === 'CONC'
        ? `<div class="recargo"><label class="inline"><input type="checkbox" data-accion="alternarRecargo" data-ayuda="recContractual" data-cat="${r.id}" ${aplicado(r.id) ? 'checked' : ''} ${editable ? '' : 'disabled'}> <strong>${esc(r.tipo)} a la conciliación</strong> · ${esc(r.concepto)} · ${B(r.monto)} ${r.moneda}</label></div>`
        : `<div class="recargo"><strong>${esc(r.tipo)} ${r.aplicabilidad === 'CRE_D' ? 'al despacho' : 'a la recepción'}</strong> · ${esc(r.concepto)} · ${B(r.monto)} ${r.moneda} por CRE
          <div class="chips">${despachos.map(dp => `<label class="chip"><input type="checkbox" data-accion="alternarRecargo" data-ayuda="recContractual" data-cat="${r.id}" data-cre="${dp.id}" ${aplicado(r.id, dp.id) ? 'checked' : ''} ${editable ? '' : 'disabled'}> ${esc(dp.numero)}</label>`).join('')}</div></div>`).join('')
        : nota('No hay recargos contractuales liberados para esta empresa en el periodo.')}
    </section>
    <section class="tarjeta"><h2>Casos especiales y carro guía</h2>
      <table class="tabla"><thead><tr><th>Tipo</th><th>Concepto</th><th class="num">Monto</th><th>Factura</th><th>Factura pagada</th><th></th></tr></thead><tbody>
      ${conc.recargos.filter(r => ['CASO', 'CG'].includes(r.tipo)).map(r => `<tr><td>${r.tipo === 'CG' ? 'Carro guía' : 'Caso especial'}</td><td>${esc(r.concepto)}</td><td class="num">${B(r.monto)}</td><td>${esc(r.factura)}</td><td>${r.facturaPagada === false ? '<span class="tag error">No (≥ umbral)</span>' : 'Sí'}</td><td>${editable ? `<button class="btn chico" data-accion="quitarRecargo" data-id="${r.id}">Quitar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="tenue">Sin registros.</td></tr>'}
      </tbody></table>
      ${editable ? `<div class="form form-linea"><label>Tipo<select id="cs-tipo"><option value="CASO">Caso especial</option><option value="CG">Carro guía</option></select></label>
        <label>Caso<select id="cs-caso">${opts(s.casosEspecialesCatalogo, 17)}</select></label>
        <label>Monto (Bs)<input id="cs-monto" type="number" value="1500"></label><label>N° factura<input id="cs-factura"></label>
        <button class="btn primario" data-accion="agregarCaso" data-ayuda="recCaso">Agregar</button></div>` : ''}
    </section>
    <section class="tarjeta"><h2>Efecto en el neto</h2>
      <table class="tabla"><tbody><tr><td>Multa transporte (CCIST)</td><td class="num">${neg(d.cab.multaTransporte)}</td><td>Entra al neto en ambos modos</td></tr>
      <tr><td>Multa de conciliación (MC)</td><td class="num">${neg(d.cab.multaConciliacion)}</td><td>${modo() === 'V1' ? 'Informativo en V1' : 'Entra al neto'}</td></tr>
      <tr><td>Descuento de conciliación (DC)</td><td class="num">${neg(d.cab.descuentoConciliacion)}</td><td>${modo() === 'V1' ? 'Informativo en V1' : 'Entra al neto'}</td></tr>
      <tr><td>Casos especiales</td><td class="num">${neg(d.cab.casosEspeciales)}</td><td>${modo() === 'V1' ? 'Informativo en V1' : 'Entra al neto'}</td></tr>
      <tr><td>Carro guía</td><td class="num">${neg(d.cab.carroGuia)}</td><td>${modo() === 'V1' ? 'Informativo en V1' : 'Entra al neto'}</td></tr>
      <tr class="total"><td>Neto conciliado</td><td class="num">${B(d.cab.neto)}</td><td></td></tr></tbody></table>
      ${nota('[I] En V1 solo la multa de transporte entra en <code>NetoConciliado</code>; los demás montos se devuelven por separado en <code>ObtenerMontosDeConciliacion</code> y se deben verificar en los reportes.')}</section>`;
  };

  V.sap = () => {
    const s = st(), v = vs().conc;
    const conSap = s.conciliaciones.filter(c => c.sap).sort((a, b) => b.numero - a.numero);
    const c = v.concId && M.porId(s.conciliaciones, v.concId) && M.porId(s.conciliaciones, v.concId).sap ? M.porId(s.conciliaciones, v.concId) : conSap[0];
    const pasoSap = e => M.SAP_ESTADOS.indexOf(e);
    return `${cabecera('Contabilización y SAP', 'Cuando el transportista aprueba, V1 prepara la cabecera y el detalle por producto. Luego, desde la sincronización con SAP, se crea y libera el pedido, se registra y libera la hoja de entrada de servicio; al aceptarse, la conciliación queda "Liberado".', '<code>Sincronizaciones_To_SAP.aspx</code> y <code>ContabilizacionDeConciliaciones.aspx</code>; tablas <code>SAP_ConciliacionMaster</code> y <code>SAP_ConciliacionDetail</code>; conexión a SAP con ERPConnect (<code>App_Code/SincronizadorSAP.vb</code>)')}
    <section class="tarjeta"><table class="tabla seleccionable"><thead><tr><th>Conciliación</th><th>Transportista</th>${th('Estado', 'estado')}<th>Texto SAP</th><th>Tipo</th><th>Moneda</th>${th('Sincronización', 'sap')}<th>Pedido</th><th>Hoja</th><th>Facturas</th></tr></thead><tbody>
    ${conSap.map(x => `<tr class="${c && c.id === x.id ? 'activa' : ''}" data-accion="verConc" data-id="${x.id}" data-ir="sap" tabindex="0"><td>N° ${x.numero}</td><td>${esc(trans(x.transportistaId).nombre)}</td><td>${badge(x.estado)}</td><td class="mono">${esc(x.sap.texto)}</td><td>${esc(x.sap.tipo)} (${x.sap.codigo})</td><td>${x.sap.moneda}</td><td>${esc(x.sap.estado)}</td><td class="mono">${esc(x.sap.pedido || '')}</td><td class="mono">${esc(x.sap.hoja || '')}</td><td>${x.facturasPagadas === false ? '<span class="tag error">Pendiente</span>' : 'Al día'}</td></tr>`).join('') || '<tr><td colspan="10" class="tenue">Ninguna conciliación tiene aún aprobación del transportista.</td></tr>'}
    </tbody></table></section>
    ${c ? `<section class="tarjeta"><h2>N° ${c.numero} · ${esc(trans(c.transportistaId).nombre)} ${badge(c.estado)}</h2>
      <ol class="circuito-sap">${M.SAP_ESTADOS.map((e, i) => `<li class="${i < pasoSap(c.sap.estado) ? 'hecho' : i === pasoSap(c.sap.estado) ? 'actual' : ''}">${esc(e)}</li>`).join('')}</ol>
      <div class="acciones">${M.SAP_ACCIONES.map(a => `<button class="btn ${a.accion.startsWith('Anular') ? '' : 'primario'}" data-accion="sapAccion" data-ayuda="sapBoton" data-a="${esc(a.accion)}" ${a.desde.includes(c.sap.estado) ? '' : 'disabled'} title="${esc(a.ref)}">${esc(a.accion)}</button>`).join('')}</div>
      <p class="ayuda">Crear pedido pasa la conciliación a "Pendiente de Aprobacion"; liberar la hoja la pasa a "Liberado"; anular el pedido la devuelve a "En Elaboracion". Anular la aceptación o la hoja no cambia la conciliación (queda "Liberado" aunque SAP haya anulado la aceptación).</p>
      <h3>Detalle SAP</h3>
      <p>Periodo ${F(c.sap.periodoInicial)} – ${F(c.sap.periodoFinal)} · ${esc(c.sap.tipo)} · ${c.sap.moneda}</p>
      <table class="tabla"><thead><tr><th>Ítem</th><th>Producto</th><th class="num">Flete</th><th class="num">Volumen</th><th>CeBe</th><th>Cuenta contable</th></tr></thead><tbody>
      ${c.sap.detalle.map(d => `<tr><td>${d.item}</td><td>${esc(d.producto)}</td><td class="num">${B(d.flete)}</td><td class="num">${N(d.volumen)}</td><td>${esc(d.cebe)}</td><td>${esc(d.cuenta)}</td></tr>`).join('')}</tbody></table>
      <div class="acciones"><button class="btn" data-accion="facturasPagadas" data-ayuda="sapPagadas">Marcar facturas pagadas</button></div>
      ${nota('Una conciliación con registro SAP distinto de "Sin Registrar en SAP" no se puede revertir, ni siquiera por el gerente (RN-EST-05): primero hay que anular hasta el pedido.')}</section>` : ''}
    <section class="tarjeta"><h2>Umbral de facturas impagas</h2><div class="form form-linea"><label>Umbral (solo para simular)<input type="number" id="umbral" value="${s.umbralFacturas}"></label><button class="btn" data-accion="umbral">Aplicar</button></div>
      ${nota('En V1 el umbral es 50.000 fijo en el código (D18). La validación vive en "Solicitar Liberacion", una acción que la lista de V1 no ofrece en esta versión (comentada): en la práctica la regla no se aplica (RN-EST-04).')}</section>`;
  };

  V.portal = () => {
    const s = st(), v = vs().portal;
    const tId = Number(v.transportistaId);
    const lista = s.conciliaciones.filter(c => c.transportistaId === tId).sort((a, b) => b.numero - a.numero);
    const c = v.concId ? lista.find(x => x.id === v.concId) : lista.find(x => x.estado === 'En Aprobacion de Transportista') || lista[0];
    return `${cabecera('Portal del transportista', 'El transportista revisa sus conciliaciones y las aprueba o rechaza.', '<code>ConciliacionCisternaTransportista.aspx</code> y las acciones "Transportista Aprueba/Rechaza"')}
    <div class="filtros"><label>Empresa<select data-cambio="portal.transportistaId">${opts(s.transportistas, tId)}</select></label></div>
    ${modoNota('V1 no comprueba que quien aprueba pertenezca a la empresa (D19): cualquier rol puede aprobar.', 'Solo el rol Transportista puede aprobar o rechazar, y puede disputar líneas con un motivo antes de rechazar.')}
    <section class="tarjeta"><table class="tabla seleccionable"><thead><tr><th>N°</th><th>Periodo</th><th>Estado</th><th class="num">Neto</th></tr></thead><tbody>
    ${lista.map(x => `<tr class="${c && c.id === x.id ? 'activa' : ''}" data-accion="verPortal" data-id="${x.id}" tabindex="0"><td>${x.numero}</td><td>${periodoTxt(x)}</td><td>${badge(x.estado)}</td><td class="num">${B(M.recalcular(s, x, modo()).cab.neto)}</td></tr>`).join('') || '<tr><td colspan="4" class="tenue">Sin conciliaciones.</td></tr>'}
    </tbody></table></section>
    ${c ? `<div class="acciones"><button class="btn primario" data-accion="portalTransicion" data-id="${c.id}" data-a="Transportista Aprueba" data-ayuda="portalAprobar">Aprobar</button><button class="btn" data-accion="portalTransicion" data-id="${c.id}" data-a="Transportista Rechaza">Rechazar</button></div>
      ${modo() === 'PROPUESTO' && c.estado === 'En Aprobacion de Transportista' ? `<section class="tarjeta"><h2>Disputar una línea</h2><div class="form form-linea"><label>Línea<select id="disp-key">${c.lineas.map(l => `<option value="${l.key}">${esc(l.creDespacho)} → ${esc(l.creRecepcion)}</option>`).join('')}</select></label><label>Motivo<input id="disp-motivo" placeholder="Ej.: el volumen recibido fue 29.900 L"></label><button class="btn" data-accion="disputar" data-id="${c.id}">Registrar disputa</button></div></section>` : ''}
      ${V.detalleConciliacion(c, true)}` : ''}`;
  };

  // ───────────────────────── D. Conocimiento y propuesta ─────────────────────────
  V.destino = () => {
    const s = st();
    const of = s.ofertas[0];
    const ranking = E.rankingOferta(of);
    const orden = of.ordenId ? M.porId(s.ordenes, of.ordenId) : null;
    return `${cabecera('Flujo propuesto: DESTINO → LEGACY', 'Cómo la tarifa por ruta de la oferta y la tarifa propuesta en la postulación llegan hasta la conciliación.')}
    <section class="tarjeta cadena"><ol class="cadena-pasos">
      <li><strong>Oferta (DESTINO)</strong><span>Ruta = localidad origen → destino del legado, producto, volumen, periodo y tarifa referencial.</span></li>
      <li><strong>Postulación (DESTINO)</strong><span>Cada empresa propone su tarifa y su capacidad.</span></li>
      <li><strong>Ranking y nominación (DESTINO)</strong><span>Se ordena por tarifa y se asigna volumen hasta cubrir la oferta.</span></li>
      <li><strong>Orden de despacho (LEGACY)</strong><span>Cada detalle lleva la <em>tarifa adjudicada</em>.</span></li>
      <li><strong>Viaje y conciliación (LEGACY)</strong><span>La conciliación usa la tarifa del viaje; el contrato es respaldo.</span></li>
    </ol></section>
    <div class="grid2"><section class="tarjeta"><h2>Oferta ${esc(of.codigo)} ${badge(of.estado)}</h2>
      <dl class="ficha"><dt>Ruta</dt><dd>${esc(loc(of.origenId).nombre)} → ${esc(loc(of.destinoId).nombre)}</dd><dt>Producto</dt><dd>${esc(prod(of.productoId).nombre)}</dd><dt>Volumen</dt><dd>${N(of.volumen)} L</dd><dt>Periodo</dt><dd>${F(of.fechaInicio)} – ${F(of.fechaFin)}</dd><dt>Tarifa referencial</dt><dd>${B(of.tarifaReferencial)} Bs/m³</dd></dl>
      ${mapa(of.origenId, of.destinoId)}</section>
    <section class="tarjeta"><h2>Postulaciones</h2><table class="tabla"><thead><tr><th>Empresa</th><th class="num">Cisternas</th><th class="num">Volumen ofrecido</th><th class="num">Tarifa propuesta Bs/m³</th><th>Tarifa en contrato</th><th>Estado</th></tr></thead><tbody>
      ${of.postulaciones.map(p => { const ct = M.contratoVigente(s, p.transportistaId, of.fechaInicio); const tv = ct ? M.tarifaVigente(s, { transportistaId: p.transportistaId, origenId: of.origenId, destinoId: of.destinoId, productoId: of.productoId, fecha: of.fechaInicio }) : null;
        return `<tr><td>${esc(trans(p.transportistaId).nombre)}</td><td class="num">${p.cisternas}</td><td class="num">${N(p.volumen)}</td><td class="num"><input type="number" class="in-chico" data-ayuda="destTarifa" data-postulacion="${p.id}" value="${p.tarifa}" ${of.estado === 'PUBLICADA' ? '' : 'disabled'} aria-label="Tarifa propuesta"></td><td>${tv ? B(tv.tarifa) : '<span class="tag error">Sin tarifa</span>'}</td><td>${esc(p.estado)}</td></tr>`; }).join('')}
      </tbody></table>
      <h3>Ranking por tarifa</h3><table class="tabla"><thead><tr><th>Puesto</th><th>Empresa</th><th class="num">Tarifa</th><th class="num">vs. referencial</th></tr></thead><tbody>
      ${ranking.map(p => `<tr><td>${p.puesto}</td><td>${esc(trans(p.transportistaId).nombre)}</td><td class="num">${B(p.tarifa)}</td><td class="num">${neg(of.tarifaReferencial - p.tarifa)}</td></tr>`).join('')}</tbody></table>
      <div class="acciones">${of.estado === 'PUBLICADA' ? '<button class="btn primario" data-accion="nominar" data-ayuda="destNominar">Nominar y enviar a LEGACY</button>' : `<a class="btn" href="#ordenes" data-accion="verOrden" data-id="${orden.id}">Ver orden de despacho #${orden.id}</a>`}</div>
      ${nota('Logística Altiplano no tiene tarifa de contrato para esta ruta. Si gana y luego se concilia en <strong>modo V1</strong>, el flete será 0 (sin tarifa vigente). En <strong>modo propuesto</strong> se usa la tarifa adjudicada.', 'aviso')}
    </section></div>
    <section class="tarjeta"><h2>Contrato mínimo entre DESTINO y LEGACY</h2><table class="tabla"><thead><tr><th>Dato</th><th>Origen</th><th>Uso en LEGACY</th></tr></thead><tbody>
      <tr><td>Localidad origen y destino (IDs del legado)</td><td>Oferta</td><td>Orden de despacho, área, búsqueda de tarifa de respaldo</td></tr>
      <tr><td>Producto</td><td>Oferta</td><td>Lote, CRE, precio de multa</td></tr>
      <tr><td>Transportista, cisterna, conductor</td><td>Postulación nominada</td><td>Detalle de la orden</td></tr>
      <tr><td>Volumen asignado</td><td>Nominación</td><td>Volumen autorizado del detalle</td></tr>
      <tr><td>Tarifa adjudicada y admisible</td><td>Postulación nominada / contrato</td><td>Línea de conciliación con fuente ADJUDICADA</td></tr>
      <tr><td>Identificador de oferta y postulación</td><td>DESTINO</td><td>Trazabilidad oferta → conciliación</td></tr></tbody></table></section>`;
  };

  V.reglas = () => {
    const f = (vs().reglas.filtro || '').toLowerCase();
    const lista = V.REGLAS.filter(r => !f || r.join(' ').toLowerCase().includes(f));
    return `${cabecera('Reglas de negocio', 'Catálogo de reglas de V1 implementadas en el prototipo. [C] comprobada en código; [I] inferida.')}
    <div class="filtros"><label>Buscar<input type="search" data-cambio="reglas.filtro" value="${esc(vs().reglas.filtro || '')}" placeholder="tarifa, merma, estado…"></label></div>
    <section class="tarjeta"><table class="tabla"><thead><tr><th>Código</th><th>Regla</th><th>Descripción</th><th>Nivel</th><th>Evidencia</th><th>Dónde verla</th></tr></thead><tbody>
    ${lista.map(r => `<tr><td class="nowrap"><strong>${r[0]}</strong></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>[${r[3]}]</td><td class="mono">${esc(r[4])}</td><td><a href="#${r[5]}">Abrir</a></td></tr>`).join('')}
    </tbody></table></section>`;
  };

  V.EJEMPLOS = [
    { n: 'Ejemplo 1: merma mayor que el admisible', historia: 'Una cisterna de 30.000 L de gasolina sale de la refinería de Cochabamba a la planta Senkata. Al descargar, la medición da 29.880 L: faltan 120 L. El contrato tolera 0,30 % (90 L); los 30 L restantes se cobran al transportista al precio de multa.', despachos: '30000', recepciones: '29880', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79 },
    { n: 'Ejemplo 2: merma dentro del admisible', historia: 'Mismo viaje, pero llegan 29.950 L. Faltan 50 L, menos que los 90 L tolerados (evaporación normal, temperatura). No se cobra nada y se paga el flete completo de lo recibido.', despachos: '30000', recepciones: '29950', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79 },
    { n: 'Ejemplo 3: demasía', historia: 'Llegan 30.040 L: 40 L MÁS de lo cargado (diferencia de temperatura o de instrumento). La demasía no se le paga al transportista, pero puede compensar mermas de otros viajes del mismo producto en la quincena.', despachos: '30000', recepciones: '30040', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79 },
    { n: 'Ejemplo 4: dos despachos consolidados', historia: 'Una cisterna con dos compartimientos se carga en dos operaciones de 15.000 L (dos CRE de despacho) y descarga todo junto en un tanque (una recepción de 29.900 L). El admisible se suma (45 + 45) y el balance se calcula una sola vez.', despachos: '15000, 15000', recepciones: '29900', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79 },
    { n: 'Ejemplo 5: un despacho en dos recepciones', historia: 'Una cisterna de 30.000 L descarga en dos tanques de la planta (18.000 y 11.900 L): son dos CRE de recepción. V1 reparte el despacho en proporción a lo recibido para calcular cada merma.', despachos: '30000', recepciones: '18000, 11900', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79 },
    { n: 'Ejemplo 6: liberar capacidad', historia: 'La terminal solo pudo cargar 29.500 L en una cisterna de 30.000 L (falta de producto). Como el transportista puso el camión completo, logística libera la capacidad: se paga el flete como si fuera llena, descontando la pérdida.', despachos: '29500', recepciones: '29450', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79, liberarCapacidad: 30000 },
    { n: 'Ejemplo 7: tarifa especial', historia: 'Por un bloqueo de carretera, el transportista tomó un desvío largo y se acordó pagar 0,23 Bs/L en vez de 0,21. El analista escribe la tarifa especial en la línea.', despachos: '30000', recepciones: '29880', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79, tarifaEspecial: 0.23 },
    { n: 'Ejemplo 7b: liberar merma', historia: 'La merma de 30 L se debió a un medidor de la planta mal calibrado (no fue culpa del transportista). Logística libera la merma: no se cobra.', despachos: '30000', recepciones: '29880', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79, liberarMerma: true },
    { n: 'Prorrateo con diferencia de redondeo', historia: 'Un despacho de 29.999 L se reparte en dos tanques iguales. El redondeo bancario de V1 imputa 15.000 a cada uno (30.000 en total): aparece 1 litro que no existe. La propuesta reparte 15.000 y 14.999.', despachos: '30001', recepciones: '15000, 15000', tarifaM3: 210, admisible: 0.30, precioMulta: 4.79 }
  ];
  V.ejemplos = () => {
    const e = vs().ej;
    const r1 = M.calculadora({ despachos: String(e.despachos).split(/[;,\s]+/), recepciones: String(e.recepciones).split(/[;,\s]+/), tarifaM3: e.tarifaM3, admisible: e.admisible, precioMulta: e.precioMulta, liberarCapacidad: e.liberarCapacidad, tarifaEspecial: e.tarifaEspecial, liberarMerma: e.liberarMerma }, 'V1');
    const r2 = M.calculadora({ despachos: String(e.despachos).split(/[;,\s]+/), recepciones: String(e.recepciones).split(/[;,\s]+/), tarifaM3: e.tarifaM3, admisible: e.admisible, precioMulta: e.precioMulta, liberarCapacidad: e.liberarCapacidad, tarifaEspecial: e.tarifaEspecial, liberarMerma: e.liberarMerma }, 'PROPUESTO');
    const tabla = (r, titulo) => r.error ? nota(esc(r.error), 'error') : `<h3>${titulo}</h3><table class="tabla"><thead><tr><th class="num">Recepción</th><th class="num">Despachos imputados</th><th class="num">Admisible</th><th class="num">Balance</th><th class="num">C/D L</th><th class="num">Base flete</th><th class="num">Flete</th><th class="num">C/D Bs</th><th class="num">Total</th></tr></thead><tbody>
      ${r.resultados.map(x => `<tr><td class="num">${N(x.vr)}</td><td class="num">${x.lineas.map(l => N(l.vol)).join(' + ')} = ${N(x.sumaDesp)}</td><td class="num">${N(x.admLote)}</td><td class="num">${N(x.balance)}</td><td class="num">${N(x.cd)}</td><td class="num">${N(x.baseFlete)}</td><td class="num">${B(x.flete)}</td><td class="num">${neg(x.cdBs)}</td><td class="num"><strong>${B(x.total)}</strong></td></tr>`).join('')}
      </tbody></table>${r.resultados.map(x => traza(x.pasos, `Pasos · recepción ${N(x.vr)} L`)).join('')}`;
    const difiere = !r1.error && !r2.error && JSON.stringify(r1.resultados.map(x => x.sumaDesp)) !== JSON.stringify(r2.resultados.map(x => x.sumaDesp));
    return `${cabecera('Ejemplos de cálculo', 'Calculadora paso a paso de una recepción con sus despachos, con las mismas fórmulas que el motor. Los ejemplos coinciden con la sección 5 del documento.')}
    <div class="chips">${V.EJEMPLOS.map((x, i) => `<button class="btn chico" data-accion="ejemplo" data-id="${i}">${esc(x.n)}</button>`).join('')}</div>
    ${e.historia ? nota(`<strong>${esc(e.n)}.</strong> ${esc(e.historia)}`, 'ok') : ''}
    <section class="tarjeta"><div class="form form-linea">
      <label>Despachos (L)<input data-cambio="ej.despachos" value="${esc(e.despachos)}"></label>
      <label>Recepciones (L)<input data-cambio="ej.recepciones" value="${esc(e.recepciones)}"></label>
      <label>Tarifa Bs/m³<input type="number" data-cambio="ej.tarifaM3" value="${esc(e.tarifaM3)}"></label>
      <label>Admisible %<input type="number" step="0.01" data-cambio="ej.admisible" value="${esc(e.admisible)}"></label>
      <label>Precio multa Bs/L<input type="number" step="0.01" data-cambio="ej.precioMulta" value="${esc(e.precioMulta)}"></label>
      <label>Liberar capacidad<input type="number" data-cambio="ej.liberarCapacidad" value="${esc(e.liberarCapacidad || '')}"></label>
      <label>Tarifa especial Bs/L<input type="number" step="0.00001" data-cambio="ej.tarifaEspecial" value="${esc(e.tarifaEspecial || '')}"></label>
      <label class="inline"><input type="checkbox" data-cambio="ej.liberarMerma" ${e.liberarMerma ? 'checked' : ''}> Liberar merma</label></div></section>
    <section class="tarjeta">${tabla(r1, 'Resultado según V1')}${difiere ? tabla(r2, 'Resultado con la propuesta (prorrateo por resto mayor)') + nota('El prorrateo de V1 no conserva el volumen total del despacho; la propuesta sí.', 'aviso') : ''}</section>`;
  };

  V.mejoras = () => `${cabecera('Defectos de V1 y propuesta', 'Hallazgos del análisis del código y cómo deberían resolverse en la reingeniería de LEGACY.')}
    <section class="tarjeta"><table class="tabla"><thead><tr><th>#</th><th>Defecto en V1</th><th>Propuesta</th><th>Dónde se ve en el prototipo</th></tr></thead><tbody>
    ${V.DEFECTOS.map(d => `<tr><td><strong>${d[0]}</strong></td><td>${esc(d[1])}</td><td>${esc(d[2])}</td><td>${esc(d[3])}</td></tr>`).join('')}</tbody></table></section>
    <section class="tarjeta"><h2>Qué cambia el modo propuesto</h2><ul class="lista">
      <li>Tarifa adjudicada en DESTINO con prioridad sobre la búsqueda por vigencia; la fuente de la tarifa siempre visible.</li>
      <li>Prorrateo por resto mayor: la suma de los despachos imputados coincide con el despacho.</li>
      <li>Sin ventana de 90 días: las recepciones antiguas o sin contrato se muestran con alerta.</li>
      <li>"Total a facturar" siempre recalculado.</li>
      <li>Todas las multas, descuentos, casos especiales y carro guía entran al neto como líneas tipificadas.</li>
      <li>Ajustes con auditoría de usuario y fecha.</li>
      <li>Permisos por transición y rol; el transportista disputa líneas.</li></ul></section>`;

  V.glosario = () => {
    const g = [
      ['CRE', 'Certificado de recepción/entrega: documento de cada operación de carga o descarga con sus mediciones.'],
      ['CRE de despacho (tipo 3)', 'Carga de la cisterna en la terminal de origen.'],
      ['CRE de recepción (tipo 8)', 'Descarga de la cisterna en la planta de destino.'],
      ['Lote', 'Agrupación diaria de despachos de un producto en una terminal (OT-CIS-…).'],
      ['Plan de viaje (AdmViaje)', 'Identificador administrativo del viaje.'],
      ['Admisible', 'Porcentaje de merma que el contrato tolera sin cobrar al transportista.'],
      ['Merma', 'Pérdida de volumen entre despacho y recepción.'],
      ['Demasía', 'Volumen recibido mayor al despachado.'],
      ['C/D', 'Crédito/débito: diferencia que se valoriza después de aplicar el admisible.'],
      ['Precio de multa', 'Precio por litro con el que se cobra la merma no admisible.'],
      ['PPT', 'Precio del producto en terminal.'],
      ['Quincena', 'Periodo de conciliación de cisternas: 1–15 o 16–fin de mes.'],
      ['Área de conciliación', 'RSCZ o RCBA, según la localidad de origen.'],
      ['Liberar capacidad', 'Ajuste que paga el flete sobre la capacidad de la cisterna descontando la pérdida.'],
      ['Liberar merma', 'Ajuste que perdona la merma de una línea.'],
      ['Tarifa especial', 'Tarifa por litro digitada que reemplaza a la de contrato.'],
      ['Recargo CCIST', 'Multa contractual de transporte en cisternas.'],
      ['MC / DC', 'Multa / descuento contractual aplicado a la conciliación completa.'],
      ['Contrato marco', 'Contrato con presupuesto anual que controla cuánto se puede conciliar.'],
      ['CeBe', 'Centro de beneficio SAP del producto.'],
      ['Tarifa adjudicada', 'Propuesta: tarifa ganadora en la postulación de DESTINO, que viaja hasta la conciliación.']
    ];
    return `${cabecera('Glosario', '')}<section class="tarjeta"><dl class="glosario">${g.map(x => `<dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd>`).join('')}</dl></section>`;
  };

  V.NOMBRES_VISTA = {
    inicio: 'Mapa del proceso', simulador: 'Simulador', localidades: 'Localidades', tarifario: 'Contratos y tarifario', precios: 'Precios',
    ordenes: 'Órdenes de despacho', cre: 'CRE despacho y recepción', multas: 'Multas por CRE', sinconciliar: 'Detalle sin conciliar',
    conciliaciones: 'Conciliación cisterna', ot: 'Conciliación Otros Transportes', otmapa: 'Otros Transportes: de principio a fin', recargos: 'Recargos', sap: 'Contabilización y SAP', portal: 'Portal del transportista',
    destino: 'Flujo DESTINO → LEGACY', fuentes: 'Fuentes y trazabilidad', guion: 'Guion del escenario', reglas: 'Reglas', ejemplos: 'Ejemplos de cálculo', mejoras: 'Defectos y propuesta', glosario: 'Glosario', bitacora: 'Bitácora'
  };

  V.guion = () => {
    const esc = SILOG.escenarioPorId(E.ui.escenario);
    const hechos = (E.ui.guion && E.ui.guion[esc.id]) || [];
    return `${cabecera(`Guion del escenario: ${esc.nombre}`, esc.objetivo)}
    <div class="acciones">
      <button class="btn primario" data-accion="tourIniciar">▶ Iniciar recorrido guiado</button>
      <button class="btn" data-accion="reiniciar">Reiniciar este escenario</button>
      <span class="ayuda">Vuelve a los datos iniciales del escenario y desmarca los pasos. Para cambiar de escenario use el selector de la cabecera.</span>
    </div>
    ${esc.ajustes ? nota(`<strong>Ajustes propios del escenario:</strong> ${esc_(esc.ajustes)}`, 'aviso') : ''}
    ${nota(`Empiece en <strong>modo V1</strong> y con el rol <strong>Analista LOG</strong>, salvo que el paso indique otra cosa. Los resultados esperados se verifican automáticamente con <code>node pruebas/verificar_escenarios.js</code>.`)}
    <section class="tarjeta"><table class="tabla guion"><thead><tr><th>Hecho</th><th>#</th><th>Vista</th><th>Qué hacer</th><th>Resultado esperado</th></tr></thead><tbody>
    ${esc.guion.map((p, i) => `<tr class="${hechos.includes(i) ? 'hecho' : ''}"><td><input type="checkbox" data-paso="${i}" ${hechos.includes(i) ? 'checked' : ''} aria-label="Marcar paso ${i + 1} como hecho"></td><td>${i + 1}</td>
      <td class="nowrap"><a href="#${p.vista}">${esc_(V.NOMBRES_VISTA[p.vista] || p.vista)}</a></td><td>${esc_(p.paso)}</td><td>${esc_(p.esperado)}</td></tr>`).join('')}
    </tbody></table><p class="ayuda">${hechos.length} de ${esc.guion.length} pasos marcados.</p></section>
    <section class="tarjeta"><h2>Todos los escenarios</h2><table class="tabla"><thead><tr><th>Escenario</th><th>Objetivo</th><th class="num">Pasos</th><th></th></tr></thead><tbody>
    ${SILOG.ESCENARIOS.map(e => `<tr class="${e.id === esc.id ? 'activa' : ''}"><td class="nowrap"><strong>${esc_(e.nombre)}</strong></td><td>${esc_(e.objetivo)}</td><td class="num">${e.guion.length}</td><td>${e.id === esc.id ? '<span class="tag ok">Activo</span>' : `<button class="btn chico" data-accion="cargarEscenario" data-id="${e.id}">Cargar</button>`}</td></tr>`).join('')}
    </tbody></table></section>`;
  };
  const esc_ = esc;

  V.fuentes = () => {
    const f = (vs().fuentes || {});
    const tipo = f.tipo || '', texto = (f.texto || '').toLowerCase();
    const todos = SILOG.catalogoFuentes();
    const lista = todos.filter(x => (!tipo || x.tipo === tipo) && (!texto || (x.nombre + ' ' + x.ubicacion + ' ' + x.usos.join(' ')).toLowerCase().includes(texto)))
      .sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo) || a.nombre.localeCompare(b.nombre));
    const cuenta = t => todos.filter(x => x.tipo === t).length;
    return `${cabecera('Fuentes y trazabilidad', 'Todos los objetos de SILOG_V1 de los que se extrajo la información del prototipo, con su ubicación exacta y las vistas que los usan.')}
    <div class="chips">${ORDEN_TIPOS.filter(cuenta).map(t => `<span class="tag tipo-${t.toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(t)}: ${cuenta(t)}</span>`).join('')}</div>
    <div class="filtros"><label>Tipo<select data-cambio="fuentes.tipo"><option value="">Todos</option>${ORDEN_TIPOS.filter(cuenta).map(t => `<option ${t === tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Buscar<input type="search" data-cambio="fuentes.texto" value="${esc(f.texto || '')}" placeholder="CRE, tarifa, MC_…"></label>
      <label class="inline"><input type="checkbox" data-cambio="ui.verOrigen" ${E.ui.verOrigen ? 'checked' : ''}> Ver origen de columnas en las grillas</label>
      <label class="inline"><input type="checkbox" data-cambio="ui.fuentesAbiertas" ${E.ui.fuentesAbiertas ? 'checked' : ''}> Abrir el panel de fuentes en cada vista</label></div>
    ${nota('<strong>Triggers:</strong> no existen. Se buscó <code>CREATE/ALTER/ENABLE/DISABLE TRIGGER</code> en los dos scripts SQL de <code>SSCC</code>, en los scripts de sprint y en todo el código de V1. La auditoría y los efectos secundarios se programan en el código (por ejemplo, <code>INSERT</code> en <code>SILOG_Auditoria</code> desde <code>AdmUtilitariosConciliacion</code>).', 'aviso')}
    <section class="tarjeta"><table class="tabla fuentes-tabla"><thead><tr><th>Tipo</th><th>Objeto</th><th>Ubicación</th><th>Uso</th><th>Vistas del prototipo</th></tr></thead><tbody>
    ${lista.map(x => `<tr><td class="nowrap"><span class="tag tipo-${x.tipo.toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(x.tipo)}</span></td>
      <td class="mono">${x.archivo ? `<a href="${x.archivo}" target="_blank" rel="noopener">${esc(x.nombre)}</a>` : esc(x.nombre)}</td><td class="mono">${esc(x.ubicacion)}</td>
      <td>${x.usos.map(esc).join('<br>')}</td><td>${[...x.vistas].map(v => `<a href="#${v}">${esc(V.NOMBRES_VISTA[v] || v)}</a>`).join(', ')}</td></tr>`).join('')}
    </tbody></table><p class="ayuda">${lista.length} de ${todos.length} objetos. ${SILOG.SIN_SQL ? 'Esta publicación no incluye las copias de los objetos SQL: se indica el nombre del objeto y la línea donde empieza en el script de la base de datos de V1.' : 'Los enlaces abren la copia del objeto en <code>EXTRACCION_SQL_CONCILIACIONES</code> (requiere abrir el prototipo desde <code>DOCUMENTACION_SILOG_V1_ORIGINAL</code>, ver README).'}</p></section>
    <section class="tarjeta"><h2>Origen de las columnas de las grillas</h2><table class="tabla"><thead><tr><th>Columna</th><th>Origen en V1</th><th>Cálculo o nota</th></tr></thead><tbody>
    ${Object.entries(SILOG.COLUMNAS).map(([k, o]) => `<tr><td class="mono">${esc(k)}</td><td class="mono">${esc(o[0])}</td><td>${esc(o[1])}</td></tr>`).join('')}</tbody></table></section>`;
  };

  V.bitacora = () => `${cabecera('Bitácora', 'Acciones realizadas en el prototipo, con usuario, rol y modo.')}
    <section class="tarjeta"><table class="tabla"><thead><tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Modo</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>
    ${st().bitacora.map(b => `<tr><td class="nowrap">${esc(b.fecha)}</td><td>${esc(b.usuario)}</td><td>${esc(b.rol)}</td><td>${esc(b.modo)}</td><td>${esc(b.accion)}</td><td>${esc(b.detalle)}</td></tr>`).join('')}
    </tbody></table></section>`;
})(SILOG.vistas = {});

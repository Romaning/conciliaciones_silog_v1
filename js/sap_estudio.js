/* SAP del recorrido conectado. Solo simulación local; ninguna llamada RFC, SQL o credencial real. */
(function (S) {
  const B = SILOG.conciliacionesEstudio, F = SILOG.facturasEstudio, M = SILOG.motor;
  const buscar = (m, n) => m.recorridoConciliaciones.lista.find(c => c.id === Number(n));
  const tiene = (ctx, p) => ctx?.permisos?.[p] === true;
  const error = msg => ({ ok: false, msg }), ok = (msg, id) => ({ ok: true, msg, id });
  const texto = n => String(n ?? '').trim();
  S.PASOS = ['Preparación desde conformidad', 'Crear pedido', 'Aprobación interna y liberar pedido', 'Registrar hoja de servicio', 'Aceptar o liberar hoja', 'Anular en orden inverso', 'Errores y recuperación propuesta', 'Trazabilidad completa'];
  S.PERMISOS = ['Acceso SAP (simulado)', 'Liberar Conciliacion', 'Anular Pedido ZDIN', 'PuedeSolicitarLiberacion', 'Recuperar sincronización (propuesta)'];
  S.ACCIONES = M.SAP_ACCIONES;
  S.preparar = m => {
    F.preparar(m);
    return m.recorridoSAP ||= { version: 1, siguiente: 1, pedido: 4500000001, hoja: 1000000001, archivados: [] };
  };
  const registrar = (m, c, ctx, accion, detalle) => {
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion, estado: c.estado, detalle });
    SILOG.hojasRutaEstudio.registrarEvento(m, ctx, accion, `Conciliación #${c.id} / nº ${c.numero}. ${detalle}`);
  };
  // Captura solo resultados persistidos del cálculo, no otra copia del CRE ni un recálculo al crear pedido.
  S.fotografiarCalculo = (c, r) => {
    c.detalleCalculoSAP = r.filas.map(f => ({ recepcionId: f.recepcionId, productoId: f.productoId, flete: f.flete, recibido: f.recibido, compensacionL: f.compensacionL || 0,
      volumenSAP: c.medio === 1 ? c.lineas.filter(l => l.recepcionId === f.recepcionId).reduce((n, l) => n + (c.ajustes[l.key]?.liberarCapacidad || l.volRec), 0) : f.recibido + (c.medio === 2 ? f.compensacionL : 0) }));
    c.costoFormulariosSAP = r.formularios;
  };
  S.prepararExpediente = (m, cId, ctx, recuperacionAnterior = false) => {
    const c = buscar(m, cId); if (!c || c.estado !== 'Aprobada Por Transportista') return error('La preparación corresponde a la conformidad registrada de esta conciliación.');
    if (recuperacionAnterior && !tiene(ctx, 'Acceso SAP (simulado)')) return error('Falta acceso SAP de práctica.');
    const x = S.preparar(m);
    if (c.sapEstudio && c.sapEstudio.estado !== 'Sin Registrar en SAP') return error('V1 no reemplaza un registro que ya está en proceso de sincronización.');
    if (c.sapEstudio?.incidencia) return error('Hay una operación remota pendiente de aclarar. No debe reemplazarse ni reintentarse a ciegas (guardia local de estudio).');
    if (!c.lineas.length) return error('Sin detalle no puede obtenerse el período ni el flete.');
    if (!c.detalleCalculoSAP) {
      const r = B.evaluar(m, c);
      if (r.flete !== c.totales.flete) return error('Guardado anterior sin detalle de cálculo: el flete actual difiere del guardado. Devuelve a elaboración y procesa antes de reconstruir; no se inventará la fotografía SAP.');
      S.fotografiarCalculo(c, r);
      c.avisos.push('Adaptación del guardado anterior: detalle SAP reconstruido con flete coincidente. No es una lectura real de SAP_ConciliacionDetail.');
    }
    const porProducto = new Map();
    for (const f of c.detalleCalculoSAP) {
      const p = porProducto.get(f.productoId) || { productoId: f.productoId, total: 0, volumen: 0, concepto: 'Producto' };
      p.total += f.flete; p.volumen += f.volumenSAP; porProducto.set(f.productoId, p);
    }
    const filas = [...porProducto.values()].map(p => ({ ...p, total: M.redHU(p.total), volumen: M.redHU(p.volumen, 0) }));
    if (c.medio === 3 && c.costoFormulariosSAP > 0) filas.push({ productoId: c.lineas[0].productoId, total: c.costoFormulariosSAP, volumen: 0, concepto: 'Costo Form.' });
    const inicio = c.lineas.map(l => l.fechaCarga).filter(Boolean).sort()[0], fin = c.lineas.map(l => l.fechaDescarga).filter(Boolean).sort().at(-1);
    if (!inicio || !fin) return error('Faltan fechas del detalle para MIN(FechaDespacho)/MAX(FechaDescarga).');
    const codigo = { 1: 'CT', 2: 'CB', 3: 'CF' }[c.medio];
    if (!codigo) return error('Este estudio cubre cisterna nacional, barcaza y vagón. No sustituye otros servicios SAP.');
    if (c.sapEstudio) x.archivados.push(structuredClone(c.sapEstudio));
    c.sapEstudio = { id: x.siguiente++, conciliacionId: c.id, empresaId: c.transportistaId, codigo, moneda: c.moneda === 'Bs' ? 'BOB' : 'USD', inicio, fin,
      estado: 'Sin Registrar en SAP', pedido: '', liberacion: '', hoja: '', aceptacion: '', mensajeCreacion: '', mensajeLiberacion: '', mensajeHoja: '', mensajeHojaLiberacion: '',
      proveedorSAP: '', condicionPago: '', grupoCompra: '', codigoLiberacion: '', contratoMarco: '', fechaContabilizacion: m.hoy,
      detalles: filas.filter(p => p.total > 0).map((p, i) => ({ ...p, id: i + 1, ceBe: '', cuenta: '', pckg: '', linea: '' })), remoto: { pedido: '', liberacion: '', hoja: '', aceptacion: '' }, intentos: [] };
    c.siguientePaso = { nombre: 'Crear pedido SAP con la misma conciliación', pendiente: true, simulado: true };
    registrar(m, c, ctx, 'Preparar SAP_ConciliacionMaster/Detail (simulado)', `Registro #${c.sapEstudio.id}. ${recuperacionAnterior ? 'Adaptación explícita de conformidad previa.' : 'Preparado al registrar conformidad, como V1.'} Sin pedido remoto.`);
    return ok('Preparación local lista. Todavía no hay pedido SAP. Completa los maestros auxiliares de práctica.', c.id);
  };
  S.configurar = (m, cId, datos, ctx) => {
    const c = buscar(m, cId), s = c?.sapEstudio;
    if (!s || s.estado !== 'Sin Registrar en SAP' || s.incidencia || !tiene(ctx, 'Acceso SAP (simulado)')) return error('Configura antes de crear pedido y sin una operación remota incierta.');
    const limites = { proveedorSAP: 10, condicionPago: 4, grupoCompra: 3, codigoLiberacion: 2 };
    for (const [k, max] of Object.entries(limites)) if (!texto(datos[k]) || texto(datos[k]).length > max) return error(`Revisa ${k}: obligatorio, hasta ${max} caracteres en este ejercicio.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaContabilizacion) || !Number.isFinite(Date.parse(datos.fechaContabilizacion)) || new Date(datos.fechaContabilizacion + 'T00:00:00Z').toISOString().slice(0, 10) !== datos.fechaContabilizacion) return error('Introduce una fecha contable válida.');
    const ds = s.detalles.map(d => ({ ...d, ceBe: texto(datos[`ceBe_${d.id}`]), cuenta: texto(datos[`cuenta_${d.id}`]) }));
    if (ds.some(d => !d.ceBe || d.ceBe.length > 30 || !d.cuenta || d.cuenta.length > 10)) return error('Cada posición requiere CeBe y cuenta contable (hasta 30 y 10 caracteres).');
    if (ds.some(d => d.ceBe === 'DISTRIBUIR')) return error('DISTRIBUIR requiere Obtener_Distribucion_Insumo_Pedido por fecha. Esta rama se explica, pero no se inventa un reparto en el simulador.');
    Object.assign(s, Object.fromEntries(Object.keys(limites).map(k => [k, texto(datos[k])])), { fechaContabilizacion: datos.fechaContabilizacion, detalles: ds });
    registrar(m, c, ctx, 'Configurar dependencias SAP ficticias', 'Proveedor/condición de pago, servicio y cuentas por posición. No cambia el contrato, CRE o flete.');
    return ok('Datos auxiliares de práctica guardados. No se cambió ningún maestro real.', c.id);
  };
  S.ejemploConfiguracion = (m, cId) => {
    const s = buscar(m, cId)?.sapEstudio;
    if (!s) return {};
    return { proveedorSAP: '1000203001', condicionPago: 'Z030', grupoCompra: 'GTR', codigoLiberacion: '10', fechaContabilizacion: m.hoy,
      ...Object.fromEntries(s.detalles.flatMap(d => [[`ceBe_${d.id}`, 'R10190-100'], [`cuenta_${d.id}`, '620100001']])) };
  };
  S.total = s => M.redHU((s?.detalles || []).reduce((n, d) => n + d.total, 0));
  S.interpretarLiberacionPedido = (estado, indicador, retorno, mensajes) => estado === 'X' && indicador === 'L' && retorno === '0' && !mensajes.length ? 'SI' : '';
  S.interpretarAceptacion = filas => ({ resultado: filas.at(-1)?.numero === '103' ? 'SI' : '', mensaje: filas.filter(r => r.numero !== '103').map(r => r.mensaje).join('/') });
  S.payload = (m, cId, accion) => {
    const c = buscar(m, cId), s = c?.sapEstudio; if (!s) return null;
    const detalles = s.detalles.map((d, i) => ({ productoId: d.productoId, concepto: d.concepto, GR_PRICE: d.total, QUANTITY: 1, BASE_UOM: 'SER', volumenInformativo: d.volumen,
      unidadTextoV1: s.codigo === 'CF' && d.volumen ? 'TN (el SQL selecciona RecepcionLts: revisar unidad)' : 'L', GL_ACCOUNT: '0' + d.cuenta, PROFIT_CTR: d.ceBe, PCKG_NO: '0000000002', LINE_NO: String(i + 2).padStart(10, '0'),
      ...(accion === 'Registrar hoja de entrada' ? { vinculoPrevisto: 'PLN_PCKG/PLN_LINE desde BAPI_PO_GETDETAIL por índice, no desde el detalle local' } : {}) }));
    return { simulacion: true, conciliacionId: c.id, SAPConciliacionID: s.id, accion, RFC: ({ 'Crear pedido': 'BAPI_PO_CREATE1', 'Liberar pedido': 'BAPI_PO_RELEASE', 'Registrar hoja de entrada': 'BAPI_ENTRYSHEET_CREATE', 'Liberar hoja': 'BAPI_ENTRYSHEET_RELEASE', 'Anular aceptación': 'BAPI_ENTRYSHEET_RESET_RELEASE', 'Anular hoja': 'BAPI_ENTRYSHEET_DELETE', 'Anular pedido': 'BAPI_PO_CHANGE' })[accion],
      pedido: s.pedido, hoja: s.hoja, REL_CODE: s.codigoLiberacion, proveedor: s.proveedorSAP, condicionPago: s.condicionPago, moneda: s.moneda, grupoCompra: s.grupoCompra,
      fechaContable: s.fechaContabilizacion, periodoServicio: [s.inicio, s.fin], totalFlete: S.total(s), netoConciliadoNoEnviadoComoPrecio: F.foto(c).neto,
      posicionPedido: '00010', DOC_TYPE: s.contratoMarco ? 'ZPCS' : s.grupoCompra === 'G15' ? 'ZSRS' : 'ZPDS', detalles };
  };
  S.validar = (m, cId, accion, ctx) => {
    const c = buscar(m, cId), s = c?.sapEstudio, def = S.ACCIONES.find(a => a.accion === accion);
    if (!s || !def) return error('Selecciona un registro SAP preparado y una acción conocida.');
    if (!tiene(ctx, 'Acceso SAP (simulado)') || ctx.externo) return error('Sin acceso de práctica o ambiente APP_EXTERNA: V1 oculta las acciones de escritura.');
    if (s.incidencia) return error('Operación remota sin confirmar localmente. La guardia de este prototipo impide reintentar a ciegas; estudia recuperación propuesta.');
    if (!def.desde.includes(s.estado)) return error(`«${accion}» no corresponde a «${s.estado}». Se siguen los botones habilitados por V1, no una transición inventada.`);
    const permiso = accion.startsWith('Anular') ? 'Anular Pedido ZDIN' : accion !== 'Crear pedido' ? 'Liberar Conciliacion' : null;
    if (permiso && !tiene(ctx, permiso)) return error(`Falta ${permiso}.`);
    if (accion === 'Crear pedido') {
      const r = F.validarSAP(m, c.id); if (!r.ok) return r; // Guardia de pantalla V1, no una validación independiente del manejador VB.
      if (!['Aprobada Por Transportista', 'Pendiente de Aprobacion', 'Pendiente de Liberacion'].includes(c.estado)) return error('La conciliación debe continuar desde conformidad, no desde elaboración.');
      if (![s.proveedorSAP, s.condicionPago, s.moneda, s.grupoCompra, s.codigoLiberacion].every(Boolean) || !s.detalles.length || s.detalles.some(d => !d.ceBe || !d.cuenta)) return error('Faltan proveedor, pago, configuración de servicio o posiciones contables de práctica.');
    }
    if (accion === 'Registrar hoja de entrada' && s.liberacion !== 'SI') return error('V1 solo registra hoja cuando DocumentoLiberacion es SI.');
    return ok('Acción disponible según la pantalla V1.', c.id);
  };
  const cambioLocal = (s, c, accion, referencia, msg, ctx, fecha) => {
    s.estado = S.ACCIONES.find(a => a.accion === accion).hacia;
    if (accion === 'Crear pedido') { s.pedido = referencia; s.mensajeCreacion = msg; c.estado = 'Pendiente de Aprobacion'; }
    else if (accion === 'Liberar pedido') { s.liberacion = 'SI'; s.mensajeLiberacion = msg; }
    else if (accion === 'Registrar hoja de entrada') { s.hoja = referencia; s.mensajeHoja = msg; }
    else if (accion === 'Liberar hoja') { s.aceptacion = 'SI'; s.mensajeHoja = msg; c.estado = 'Liberado'; c.usuarioLiberacion = ctx.usuario; c.fechaLiberacion = fecha; }
    else if (accion === 'Anular aceptación') s.aceptacion = ''; // V1 no revierte c.estado: se conserva el defecto, visible en el diagnóstico.
    else if (accion === 'Anular hoja') { s.hoja = ''; s.aceptacion = ''; }
    else if (accion === 'Anular pedido') { s.pedido = ''; s.liberacion = ''; c.estado = 'En Elaboracion'; }
    // En V1 ambos campos reciben LlaveUsuario de SILOG, no la cuenta SAP introducida.
    if (!accion.startsWith('Anular')) { s.cuentaSAP = ctx.usuario; s.usuarioNombre = ctx.usuario; s.fecha = fecha; }
  };
  S.ejecutar = (m, cId, accion, ctx, escenario = 'correcto') => {
    const v = S.validar(m, cId, accion, ctx); if (!v.ok) return v;
    if (!['correcto', 'sinConexion', 'errorSAP', 'falloLocal'].includes(escenario)) return error('Escenario de respuesta desconocido.');
    const c = buscar(m, cId), s = c.sapEstudio, x = S.preparar(m), intento = { id: s.intentos.length + 1, accion, fecha: m.hoy, usuario: ctx.usuario, cuentaSAPSimulada: texto(ctx.cuentaSAP) || 'cuenta.sap.estudio', solicitud: S.payload(m, c.id, accion), estadoAntes: s.estado, conciliacionAntes: c.estado, escenario };
    s.intentos.push(intento);
    if (escenario === 'sinConexion' || escenario === 'errorSAP') {
      intento.respuesta = escenario === 'sinConexion' ? { error: 'Conexión de práctica no disponible; no se envió la BAPI.' } : { RETURN: [{ TYPE: 'E', NUMBER: '999', MESSAGE: 'Rechazo simulado: revisar autorización o datos contables.' }], documento: '' };
      intento.persistencia = 'Sin éxito remoto confirmado';
      // En el registro de hoja V1 sí conserva el mensaje fallido y la hoja vacía.
      if (accion === 'Registrar hoja de entrada' && escenario === 'errorSAP') s.mensajeHoja = intento.respuesta.RETURN[0].MESSAGE;
      registrar(m, c, ctx, 'Intento SAP fallido (simulado)', `${accion}: ${intento.persistencia}.`);
      return error(escenario === 'sinConexion' ? 'No hubo conexión. Los documentos permanecen intactos.' : 'SAP simulado rechazó la operación. No se avanzó de estado.');
    }
    const referencia = accion === 'Crear pedido' ? String(x.pedido++) : accion === 'Registrar hoja de entrada' ? String(x.hoja++) : accion.startsWith('Anular') ? ({ 'Anular pedido': 'PEDIDO ANULADO', 'Anular hoja': 'HOJA ANULADA', 'Anular aceptación': 'ACEPTACION DEL SERVICIO ANULADA' })[accion] : 'SI';
    intento.respuesta = { simulada: true, documento: referencia, mensaje: `${accion}: resultado de práctica confirmado`, commitSAP: true };
    const futura = structuredClone(s), copia = structuredClone(c);
    cambioLocal(futura, copia, accion, referencia, intento.respuesta.mensaje, ctx, m.hoy);
    Object.assign(s.remoto, { pedido: futura.pedido, liberacion: futura.liberacion, hoja: futura.hoja, aceptacion: futura.aceptacion });
    if (escenario === 'falloLocal') {
      s.incidencia = { intentoId: intento.id, accion, referencia, mensaje: intento.respuesta.mensaje, futura: { pedido: futura.pedido, liberacion: futura.liberacion, hoja: futura.hoja, aceptacion: futura.aceptacion }, usuario: ctx.usuario };
      intento.persistencia = 'Fallo SQL simulado después del COMMIT SAP';
      registrar(m, c, ctx, 'SAP confirmado / SILOG sin actualizar (simulado)', `${accion}; referencia ${referencia}. Rollback local no deshace el documento remoto.`);
      return error('Resultado remoto confirmado, pero no guardado en SILOG. No repitas la creación: revisa la discrepancia y la recuperación propuesta.');
    }
    cambioLocal(s, c, accion, referencia, intento.respuesta.mensaje, ctx, m.hoy); intento.persistencia = 'Guardado local simulado';
    c.siguientePaso = { nombre: s.estado === 'Aceptado' ? 'Pago externo por comprobar' : s.estado, pendiente: true, simulado: true };
    registrar(m, c, ctx, `SAP: ${accion} (simulado)`, `SAP #${s.id} → ${s.estado}; conciliación → ${c.estado}. Referencia ${referencia}. No acredita pago.`);
    return ok(`${accion}: SAP ${s.estado}; conciliación ${c.estado}. No se pagó el flete.`, c.id);
  };
  S.aprobarLOG = (m, cId, ctx) => {
    const c = buscar(m, cId);
    if (!c || c.estado !== 'Pendiente de Aprobacion' || !tiene(ctx, 'PuedeSolicitarLiberacion')) return error('Solicitar liberación interna requiere Pendiente de Aprobacion y PuedeSolicitarLiberacion.');
    if (c.medio === 1 && F.pendientes(m, c.id).length) return error('V1 bloquea: la empresa tiene cobros pendientes según FacturasPendienteAPagar. Revisa las filas, no el pago del flete.');
    c.estado = 'Pendiente de Liberacion'; registrar(m, c, ctx, 'Solicitar liberación interna V1', 'No libera el pedido ni acepta la hoja SAP. Para barcaza/vagón la rama revisada no consulta esa deuda.');
    return ok('Conciliación pendiente de liberación interna. El pedido SAP no cambió.', c.id);
  };
  S.recuperar = (m, cId, ctx) => {
    const c = buscar(m, cId), s = c?.sapEstudio, i = s?.incidencia;
    if (!i || ctx.externo || !tiene(ctx, 'Recuperar sincronización (propuesta)')) return error('Selecciona una discrepancia y el permiso de recuperación propuesto, fuera de APP_EXTERNA.');
    const esperado = i.futura;
    if (Object.entries(esperado).some(([k, v]) => s.remoto[k] !== v)) return error('El estado remoto simulado no coincide. No se puede confirmar la recuperación.');
    cambioLocal(s, c, i.accion, i.referencia, i.mensaje, { usuario: i.usuario }, m.hoy);
    s.intentos.find(t => t.id === i.intentoId).recuperacion = { usuario: ctx.usuario, fecha: m.hoy, propuesta: true };
    delete s.incidencia;
    c.siguientePaso = { nombre: s.estado === 'Aceptado' ? 'Pago externo por comprobar' : s.estado, pendiente: true, simulado: true };
    registrar(m, c, ctx, 'Recuperar resultado remoto (PROPUESTA)', 'Consulta del registro remoto ficticio y actualización local, sin otra BAPI. V1 no implementa esta recuperación.');
    return ok('Recuperación propuesta simulada sin crear otro documento. V1 no hace esto automáticamente.', c.id);
  };
  S.diagnosticos = c => {
    const s = c?.sapEstudio; if (!s) return ['La preparación SAP aún no existe para esta conciliación.'];
    const xs = ['Aceptado en SAP y Liberado en SILOG no significan Pagado. No se alteró FacturasPagadas.'];
    if (s.incidencia) xs.push('SAP y SILOG discrepan: el éxito remoto no tiene confirmación local. El historial permite estudiar qué ocurrió.');
    if (c.estado === 'Liberado' && s.estado !== 'Aceptado') xs.push('Inconsistencia reproducida de V1: conciliación Liberado, pero hoja sin aceptación vigente. Anular aceptación/hoja no devuelve el estado económico.');
    if (s.mensajeHoja && s.aceptacion) xs.push('V1 escribe el mensaje de aceptación en MensajeSAPHoja, sobreescribiendo el de registro; MensajeSAPHojaLiberacion queda sin actualizar. Aquí los intentos conservan ambos mensajes para estudiar la pérdida.');
    if (s.pedido && s.detalles.some(d => !d.pckg || !d.linea)) xs.push('En el código de creación revisado, GuardarPCKG_NO queda dentro de If NumPed=""; no se ejecuta en la rama normal con número. Se conservan vacíos locales y la hoja consulta BAPI_PO_GETDETAIL; no se finge que ese guardado ocurrió.');
    if (s.codigo === 'CF') xs.push('Vagón: ObtenerFletesConciliacion usa RecepcionLts en Volumen y el texto RFC dice TN. No se toma ese rótulo como conversión de litros a toneladas. Formularios es una línea aparte con volumen 0.');
    return xs;
  };
})(SILOG.sapEstudio = {});

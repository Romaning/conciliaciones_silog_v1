/* Facturas del mismo recorrido: referencias V1, control SQL y propuesta documental separados. */
window.SILOG = window.SILOG || {};
(function (F) {
  const B = SILOG.conciliacionesEstudio, M = SILOG.motor;
  const buscar = (m, n) => m.recorridoConciliaciones.lista.find(c => c.id === Number(n));
  const permiso = (ctx, p) => ctx?.permisos?.[p] === true;
  const error = msg => ({ ok: false, msg });
  const ok = (msg, id) => ({ ok: true, msg, id });
  const texto = s => String(s ?? '').trim();
  const sinNumero = s => !texto(s) || texto(s) === '-';
  const num = v => v == null ? 0 : Number(v);
  const registrar = (m, c, ctx, accion, detalle) => {
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion, estado: c.estado, detalle });
    SILOG.hojasRutaEstudio.registrarEvento(m, ctx, accion, `Conciliación #${c.id} / nº ${c.numero}. ${detalle}`);
  };
  F.PASOS = ['Distinguir las facturas', 'Registrar referencias V1', 'Verificar requisito para SAP', 'Revisar cobros pendientes', 'Ensayar mejora documental', 'Seguir la trazabilidad'];
  F.PERMISOS = ['PuedeProcesar', 'Acceso a FacturasDelTransportista (simulado)', 'Capturar documento de servicio (propuesta)'];
  F.preparar = m => {
    const x = B.preparar(m);
    x.lista.forEach(c => {
      // NULL no equivale a pagada ni a impaga: SQL FacturasPagadas=0 no selecciona NULL.
      c.facturacion ||= { mermas: '', incumplimiento: '', facturasPagadas: null };
      if (!('facturasPagadas' in c.facturacion)) c.facturacion.facturasPagadas = null;
    });
    return x;
  };
  F.foto = c => {
    const t = c.totales || {}, merma = num(t.merma), flete = num(t.flete);
    const derivada = c.medio === 1 && t.multaTransporte == null;
    // Adaptación explícita de guardados anteriores del puente, cuya fórmula era flete+merma+inc.
    const incumplimiento = c.medio === 1 ? num(t.multaTransporte ?? M.redHU(num(t.neto) - flete - merma)) : 0;
    return { flete, merma, incumplimiento, neto: num(t.neto), derivada };
  };
  F.guardarReferencias = (m, cId, datos, ctx) => {
    const c = buscar(m, cId);
    if (!c || !permiso(ctx, 'PuedeProcesar')) return error('Selecciona la conciliación y habilita PuedeProcesar, como el botón Procesar de V1.');
    if (c.estado !== 'Aprobada Por Transportista') return error('En la pantalla Otros Transportes, guardar estas referencias con Procesar corresponde al estado Aprobada Por Transportista.');
    if (c.medio === 3) return error('V1 rechaza Procesar en este estado para vagón. La pantalla anterior de vagones tiene otra rama; no se habilita aquí silenciosamente.');
    const mer = texto(datos.mermas), inc = texto(datos.incumplimiento);
    if (mer.length > 20 || inc.length > 20) return error('Los controles de Otros Transportes admiten hasta 20 caracteres por referencia.');
    const antes = { mermas: c.facturacion.mermas, incumplimiento: c.facturacion.incumplimiento };
    Object.assign(c.facturacion, { mermas: mer, incumplimiento: inc });
    registrar(m, c, ctx, 'Guardar referencias de facturas V1', JSON.stringify({ antes, despues: { mermas: mer, incumplimiento: inc } }));
    return ok('Referencias guardadas en la misma conciliación. No cambian importes, estado, pago ni documentos CRE.', c.id);
  };
  F.validarCamposSAP = (medio, p, f) => {
    if (medio === 3) return { ok: true, aplica: false, faltan: [], msg: 'La pantalla SAP solo invoca dbo.FacturasCorrectas para CT y CB, no para vagón. Esto no acredita factura recibida ni habilita una integración real.' };
    const faltan = [];
    // SQL compara decimales <> 0, NO CInt, ni > 50000, ni el neto del flete.
    if (p.merma !== 0 && sinNumero(f.mermas)) faltan.push('Referencia de factura por mermas');
    if (medio === 1 && p.incumplimiento !== 0 && sinNumero(f.incumplimiento)) faltan.push('Referencia de factura por incumplimiento');
    return { ok: !faltan.length, aplica: true, faltan, msg: faltan.length ? 'Faltan referencias: ' + faltan.join('; ') : 'Cumple solo el requisito documental de dbo.FacturasCorrectas. No prueba pago, autenticidad fiscal ni creación de pedido SAP.' };
  };
  F.validarSAP = (m, cId) => {
    const c = buscar(m, cId); if (!c) return error('No existe la conciliación seleccionada en este recorrido.');
    return F.validarCamposSAP(c.medio, F.foto(c), c.facturacion);
  };
  F.diagnosticarLOG = c => ({ ok: false, alcanzable: false,
    msg: c.medio === 1 ? 'En Aprobada Por Transportista no se ofrece Aprobar en InicializarPermisos. La rama programada lee TotalMultaPorInclumplimiento (columna mal escrita) y después txtFacturaInclumplimiento (control mal escrito). No se fuerza la transición.' : 'No se ofrece Aprobar desde Aprobada Por Transportista. La rama programada de barcaza/vagón intenta escribir NumeroFacturaPorMermas/NumeroFacturaPorIncumplimiento, nombres que no corresponden a sus tablas. No se inventa una continuación exitosa.' });
  F.pendientes = (m, cId) => {
    const base = buscar(m, cId); if (!base) return [];
    if (base.medio !== 1) return []; // La rama ELSE del procedimiento no devuelve un SELECT de deudas.
    return m.recorridoConciliaciones.lista.filter(c => c.medio === 1 && c.transportistaId === base.transportistaId && c.estado != null && !['En Elaboracion', 'En Aprobacion de Transportista'].includes(c.estado)).flatMap(c => {
      const p = F.foto(c), lista = [];
      if (c.facturacion.facturasPagadas === false && (-p.merma > 50000 || -p.incumplimiento > 50000)) lista.push({ clave: `${c.id}:general`, conciliacionId: c.id, tipo: 'general', numero: c.numero, mes: c.mes, anio: c.anio, merma: p.merma, incumplimiento: p.incumplimiento, motivo: 'Multa Transporte y/o Incumplimiento de Contrato' });
      // DetalleCasos... no tiene PK en el script: conservar cada fila como UNION ALL, sin deduplicar.
      (c.recargos || []).filter(r => r.tipo === 'CASO' && Number(r.multaId) === 17 && r.facturaPagada === false && -num(r.montoAlmacenado) > 50000).forEach((r, i) => lista.push({ clave: `${c.id}:caso17:${i}`, conciliacionId: c.id, tipo: 'caso17', numero: c.numero, mes: c.mes, anio: c.anio, monto: r.montoAlmacenado, motivo: 'Multa Por Perdida de Producto Por Accidente' }));
      return lista;
    });
  };
  F.liberarCobros = (m, cId, claves, ctx) => {
    if (!permiso(ctx, 'Acceso a FacturasDelTransportista (simulado)')) return error('Falta el acceso de práctica a la pantalla. No es un permiso nuevo atribuido a V1.');
    const disponibles = F.pendientes(m, cId);
    if (!Array.isArray(claves) || !claves.length || new Set(claves).size !== claves.length || claves.some(k => !disponibles.some(r => r.clave === k))) return error('Selecciona filas vigentes de cobros pendientes de la misma empresa.');
    // Guardia local antes de mutar. V1 confirma una transacción por fila, no un lote atómico.
    for (const clave of claves) {
      const fila = disponibles.find(r => r.clave === clave), c = buscar(m, fila.conciliacionId);
      if (fila.tipo === 'general') c.facturacion.facturasPagadas = true;
      else (c.recargos || []).filter(r => r.tipo === 'CASO' && Number(r.multaId) === 17).forEach(r => { r.facturaPagada = true; });
      registrar(m, c, ctx, 'Liberar facturas y cerrar (marca V1)', fila.tipo === 'general' ? 'FacturasPagadas=1 para la cabecera completa; no es pago bancario del flete.' : 'FacturaPagada=1 para todos los casos MultaID=17 de esta conciliación.');
    }
    return ok('Marcas de cobro actualizadas. No se realizó un pago bancario ni se cambió el estado de conciliación.', Number(cId));
  };
  F.ensayarRutaAnterior = (m, cId, ctx) => {
    const c = buscar(m, cId);
    if (!c || c.medio !== 1 || c.estado !== 'En Elaboracion') return error('Esta comparación requiere cisterna en elaboración; no se aplica a barcaza o vagón.');
    const r = B.procesar(m, c.id, [], ctx); if (!r.ok) return r;
    const p = F.foto(c);
    c.facturacion.facturasPagadas = !(-p.merma > 50000 || -p.incumplimiento > 50000);
    registrar(m, c, ctx, 'Ensayo de ruta histórica ConciliacionCisterna', 'Se reproduce el cálculo de Sw y FacturasPagadas de :1166–1182. No es la rutina Otros Transportes ni reproduce su borrado/reinserción de detalle.');
    return ok('Ensayada la bandera de la pantalla antigua. No es una corrección automática de Otros Transportes.', c.id);
  };
  F.alertas = (m, c) => {
    if (c.medio === 3) return [];
    let actual; try { actual = B.evaluar(m, c); } catch (e) { return ['No se pudo evaluar la alerta: ' + e.message]; }
    return [F.foto(c).merma !== 0 ? 'Al registrar conformidad, V1 intenta avisar al grupo de facturación de merma del área.' : '', actual.recargos.transporte !== 0 ? 'Al registrar conformidad, V1 intenta avisar al grupo de incumplimiento contractual del área.' : ''].filter(Boolean);
  };
  F.proponerServicio = (m, cId, d, ctx) => {
    const c = buscar(m, cId);
    if (!c || !permiso(ctx, 'Capturar documento de servicio (propuesta)')) return error('Habilita el permiso simulado de la propuesta y selecciona una conciliación.');
    if (['En Elaboracion', 'En Aprobacion de Transportista'].includes(c.estado)) return error('Regla de esta propuesta: primero registrar la conformidad. No se atribuye esa validación a una rutina V1 no localizada.');
    const numero = texto(d.numero), total = typeof d.total === 'boolean' || !texto(d.total) ? NaN : Number(d.total), fecha = texto(d.fecha), moneda = texto(d.moneda);
    if (!numero || numero.length > 40 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha || !Number.isFinite(total) || total <= 0 || !['Bs', 'USD'].includes(moneda) || texto(d.nota).length > 500) return error('Propuesta: número de hasta 40 caracteres, fecha válida, total positivo, moneda Bs/USD y nota de hasta 500 caracteres.');
    const x = m.recorridoConciliaciones, anterior = c.facturacion.servicioPropuesto;
    const propuesta = { id: anterior?.id || `SERV-${c.id}`, conciliacionId: c.id, empresaId: c.transportistaId, numero, fecha, total: M.redHU(total), moneda, nota: texto(d.nota), revision: (anterior?.revision || 0) + 1, estado: 'Registrada para revisión (propuesta)', usuario: ctx.usuario, fechaRegistro: m.hoy };
    if (propuesta.total <= 0) return error('El total de la propuesta debe seguir siendo positivo al redondearlo a dos decimales.');
    c.facturacion.servicioPropuesto = propuesta;
    c.facturacion.versionesServicio ||= []; c.facturacion.versionesServicio.push(structuredClone(propuesta));
    registrar(m, c, ctx, 'Captura documental del servicio (propuesta)', JSON.stringify(propuesta));
    const duplicada = x.lista.some(cc => cc.id !== c.id && cc.transportistaId === c.transportistaId && cc.facturacion?.servicioPropuesto?.numero === numero);
    return ok('Propuesta guardada aparte de las referencias V1. No crea Factura Recepcionada, pago ni SAP.' + (duplicada ? ' Aviso: otra conciliación de esta empresa usa el mismo número; revisar si es factura compartida o duplicada.' : ''), c.id);
  };
  F.anularPropuesta = (m, cId, motivo, ctx) => {
    const c = buscar(m, cId), p = c?.facturacion.servicioPropuesto;
    if (!p || p.estado.startsWith('Anulada') || !permiso(ctx, 'Capturar documento de servicio (propuesta)') || !texto(motivo) || texto(motivo).length > 500) return error('La propuesta vigente requiere permiso y motivo de hasta 500 caracteres. No se anulan datos V1.');
    Object.assign(p, { estado: 'Anulada (propuesta)', motivo: texto(motivo), anuladoPor: ctx.usuario, fechaAnulacion: m.hoy, revision: p.revision + 1 });
    c.facturacion.versionesServicio.push(structuredClone(p)); registrar(m, c, ctx, 'Anular propuesta documental', texto(motivo));
    return ok('Propuesta anulada conservando versiones. Conciliación, referencias V1 y cobros intactos.', c.id);
  };
})(SILOG.facturasEstudio = {});

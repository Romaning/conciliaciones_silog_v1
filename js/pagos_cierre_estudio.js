/* Pago/cierre: lectura de V1 y laboratorio PROPUESTO separado. No existe conexión a SAP/Finanzas. */
(function (P) {
  const F = SILOG.facturasEstudio, S = SILOG.sapEstudio, M = SILOG.motor;
  const buscar = (m, id) => m.recorridoConciliaciones.lista.find(c => c.id === Number(id));
  const texto = v => String(v ?? '').trim(), tiene = (x, p) => x?.permisos?.[p] === true;
  const error = msg => ({ ok: false, msg }), ok = (msg, id) => ({ ok: true, msg, id });
  const fechaValida = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
  const moneda = v => v === 'Bs' ? 'BOB' : v;
  const centavos = v => {
    if (!/^\d+(\.\d{1,2})?$/.test(String(v))) return null;
    const [entero, decimal = ''] = String(v).split('.'), cents = BigInt(entero) * 100n + BigInt(decimal.padEnd(2, '0'));
    return cents > 0n && cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
  };
  const registrar = (m, c, ctx, accion, detalle) => {
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion, estado: c.estado, detalle });
    SILOG.hojasRutaEstudio.registrarEvento(m, ctx, accion, `Conciliación #${c.id}. ${detalle}`);
  };
  P.PASOS = ['Qué termina en V1', 'Pagos Logística y sus importes', 'Qué falta comprobar fuera de SILOG', 'Acordar seguimiento propuesto', 'Ensayar evidencia externa', 'Cierre y reapertura propuestos', 'Otros cierres que no son pago', 'Historial de la misma conciliación'];
  P.PERMISOS = ['Preparar seguimiento de pago (propuesta)', 'Consultar evidencia financiera (propuesta)', 'Cerrar seguimiento de pago (propuesta)', 'Reabrir seguimiento de pago (propuesta)'];
  P.preparar = m => F.preparar(m); // Entrar no crea pagos, planes ni una conciliación de reemplazo.
  P.foto = c => {
    const s = c.sapEstudio, f = c.facturacion?.servicioPropuesto;
    return { conciliacionId: c.id, revisionConciliacion: c.revision, medio: c.medio, empresaId: c.transportistaId, estado: c.estado, totales: structuredClone(c.totales),
      cre: c.lineas.map(l => [l.despachoId, l.recepcionId, l.procedencia?.contratoId, l.procedencia?.tarifaId]),
      ...((c.recargos || []).some(r => ['CG', 'CASO'].includes(r.tipo)) ? { recargosAdicionales: c.recargos.filter(r => ['CG', 'CASO'].includes(r.tipo)).map(r => [r.id, r.tipo, r.monto, r.montoAlmacenado, r.moneda, r.conversionPropuesta?.tc]) } : {}),
      sap: s ? { id: s.id, pedido: s.pedido, hoja: s.hoja, aceptacion: s.aceptacion, estado: s.estado, incidencia: !!s.incidencia, proveedor: s.proveedorSAP, moneda: s.moneda, totalPedido: S.total(s),
        operacionesConfirmadas: s.intentos.filter(t => t.persistencia === 'Guardado local simulado' || t.recuperacion).map(t => t.id) } : null,
      facturaPropuesta: f ? { id: f.id, revision: f.revision, numero: f.numero, fecha: f.fecha, total: f.total, moneda: moneda(f.moneda), estado: f.estado } : null };
  };
  const firma = c => JSON.stringify(P.foto(c));
  P.vigente = c => !!c?.pagoCierrePropuesto && c.pagoCierrePropuesto.firma === firma(c);
  P.requisitos = c => {
    if (!c) return ['Selecciona una conciliación del recorrido.'];
    const s = c.sapEstudio, f = c.facturacion?.servicioPropuesto, xs = [];
    if (c.estado !== 'Liberado' || s?.estado !== 'Aceptado' || s?.aceptacion !== 'SI' || !s?.pedido || !s?.hoja || s?.incidencia) xs.push('Propuesta: conciliación Liberado y hoja SAP Aceptado/SI, con pedido y sin operación incierta.');
    if (!f || f.estado.startsWith('Anulada')) xs.push('Propuesta: documento del servicio vigente en Facturas. No es una recepción fiscal V1 comprobada.');
    if (f && s && moneda(f.moneda) !== s.moneda) xs.push('Factura y pedido tienen monedas distintas. No se convierte ni se compara sin un tipo de cambio documentado.');
    return xs;
  };
  P.reporteV1 = c => {
    const f = F.foto(c), casos = c.medio === 1 ? (c.recargos || []).filter(r => r.tipo === 'CASO') : [];
    const completo = casos.every(r => r.montoAlmacenado === null || Number.isFinite(r.montoAlmacenado));
    const sumaCasos = completo ? M.redHU(casos.reduce((n, r) => n + (r.montoAlmacenado ?? 0), 0)) : null;
    return { flete: f.flete, merma: f.merma, incumplimiento: f.incumplimiento, neto: f.neto, casos: sumaCasos,
      netoReporte: sumaCasos === null ? null : M.redHU(f.neto + sumaCasos),
      aviso: completo ? 'Proyección del dataset por conciliación: NetoConciliado + SUM(Monto) de casos en cisterna, sin restar carro guía ni convertir moneda de casos. No consulta pagos ni filtra estado en estas tres ramas.' : 'Falta Monto persistido de un caso: no se sustituye por monto unitario ni se inventa el total del reporte.' };
  };
  const suma = p => {
    const n = (p?.movimientos || []).reduce((s, a) => s + BigInt(a.centavos) * (a.tipo === 'abono' ? 1n : -1n), 0n);
    return n <= BigInt(Number.MAX_SAFE_INTEGER) && n >= 0n ? Number(n) : NaN;
  };
  const firmaMovimientos = p => JSON.stringify(p.movimientos);
  P.resumen = (m, c) => {
    const p = c?.pagoCierrePropuesto;
    if (!p) return { estado: 'Pago no acreditado', actual: false, abonado: null, saldo: null, exceso: null, cierre: 'Sin cierre propuesto', puedeCerrar: false, avisos: [] };
    const vigente = P.vigente(c), actual = p.ultimaConsulta?.estado === 'disponible' && p.ultimaConsulta.fecha === m.hoy;
    const pagado = suma(p), restante = p.objetivoCentavos - pagado, cambios = !vigente || !!p.cierre && p.cierre.firmaMovimientos !== firmaMovimientos(p);
    let estado = !actual ? 'Información de pago no actualizada' : pagado === 0 ? p.movimientos.length ? 'Abonos revertidos (simulación)' : 'Sin abonos informados (simulación)' : restante > 0 ? 'Pago parcial (simulación)' : restante === 0 ? 'Importe cubierto (simulación)' : 'Exceso por aclarar (simulación)';
    if (!vigente) estado = 'Documentos cambiados: revisar evidencia';
    const cierre = !p.cierre || p.cierre.reabierto ? 'Abierto (propuesta)' : cambios ? 'Requiere reapertura (propuesta)' : !actual ? 'Cierre previo; verificación actual no disponible' : 'Cerrado en laboratorio (propuesta)';
    return { estado, actual, vigente, objetivo: p.objetivoCentavos / 100, abonado: pagado / 100, saldo: Math.max(0, restante) / 100, exceso: Math.max(0, -restante) / 100, cierre,
      puedeCerrar: vigente && actual && restante === 0 && pagado > 0 && (!p.cierre || !!p.cierre.reabierto),
      avisos: [!actual ? 'Sin consulta disponible del día simulado no se concluye impago ni saldo cero; se conserva la evidencia anterior.' : '', !vigente ? 'Cambió factura, conciliación o ciclo SAP después de acordar el seguimiento. El cierre anterior no se reactiva por volver a aceptar la hoja.' : '', cambios && p.cierre && !p.cierre.reabierto ? 'Hay un cierre anterior que debe reabrirse; no se borran sus evidencias.' : ''].filter(Boolean) };
  };
  P.acordar = (m, cId, datos = {}, ctx) => {
    const c = buscar(m, cId); if (!c || !tiene(ctx, P.PERMISOS[0])) return error('Falta conciliación o permiso de preparación propuesto.');
    const requisitos = P.requisitos(c); if (requisitos.length) return error(requisitos.join(' '));
    const importe = centavos(datos.importe), motivo = texto(datos.justificacion), referencia = texto(datos.referenciaFinanzas), anterior = c.pagoCierrePropuesto;
    if (importe === null || motivo.length < 5 || motivo.length > 500 || !referencia || referencia.length > 80) return error('Propuesta: importe positivo de hasta 2 decimales, referencia de Finanzas y justificación de 5–500 caracteres. No se toma el neto automáticamente.');
    if (anterior?.movimientos.length || anterior?.cierre && !anterior.cierre.reabierto) return error('No se reemplaza un plan con movimientos o cierre vigente. Primero aclara las evidencias; cambiar factura/importe requiere un tratamiento financiero, no borrar historial.');
    const versiones = anterior ? [...anterior.versiones, structuredClone({ ...anterior, versiones: [] })] : [];
    c.pagoCierrePropuesto = { propuesta: true, revision: (anterior?.revision || 0) + 1, versiones, foto: P.foto(c), firma: firma(c), objetivoCentavos: importe, moneda: c.sapEstudio.moneda,
      referenciaFinanzas: referencia, justificacion: motivo, usuario: ctx.usuario, fecha: m.hoy, movimientos: [], consultas: [], ultimaConsulta: null, cierre: null, cierresAnteriores: [] };
    registrar(m, c, ctx, 'Acordar seguimiento de pago (PROPUESTA)', `${importe / 100} ${c.sapEstudio.moneda}; referencia de práctica ${referencia}. No es una autorización ni orden de pago real.`);
    return ok('Seguimiento propuesto preparado. No se emitió pago, factura ni cambio de estado V1.', c.id);
  };
  // Esquema didáctico propuesto: no se atribuye a una RFC ni endpoint existente de V1.
  P.ejemplo = (m, c, caso) => {
    const p = c?.pagoCierrePropuesto; if (!p) return null;
    const monto = p.objetivoCentavos / 100, mitad = Math.max(1, Math.floor(p.objetivoCentavos / 2)) / 100;
    const cabecera = { simulada: true, esquema: 'evidencia-financiera-propuesta-v1', origen: 'SAP-FINANZAS-ESTUDIO', sociedad: 'SOC-ESTUDIO', ejercicio: Number(m.hoy.slice(0, 4)), conciliacionId: c.id, empresaId: c.transportistaId,
      pedido: p.foto.sap.pedido, hoja: p.foto.sap.hoja, facturaId: p.foto.facturaPropuesta.id, facturaRevision: p.foto.facturaPropuesta.revision, documentoContable: `FIN-C${c.id}-1`, moneda: p.moneda, estado: 'disponible', eventos: [] };
    const abono = (n, importe) => ({ eventoId: `ASIG-C${c.id}-${n}`, tipo: 'abono', importe, fecha: m.hoy, comprobante: `OP-${c.id}-${n}` });
    if (caso === 'total') cabecera.eventos = [abono(1, monto)];
    else if (caso === 'parcial') cabecera.eventos = [abono(1, mitad)];
    else if (caso === 'completar') cabecera.eventos = p.movimientos.length ? p.objetivoCentavos > suma(p) ? [abono(`COMPLETAR-${p.movimientos.length + 1}`, (p.objetivoCentavos - suma(p)) / 100)] : [] : [abono(1, mitad), abono(2, (p.objetivoCentavos - Math.round(mitad * 100)) / 100)].filter(e => e.importe > 0);
    else if (caso === 'reversion') {
      const activos = p.movimientos.filter(a => a.tipo === 'abono' && !p.movimientos.some(r => r.tipo === 'reversion' && r.revierteEventoId === a.eventoId && r.ambito === a.ambito));
      cabecera.eventos = activos.length ? activos.map(a => ({ eventoId: `REV-${a.eventoId}`, tipo: 'reversion', importe: a.centavos / 100, fecha: m.hoy, comprobante: `REV-${a.comprobante}`, revierteEventoId: a.eventoId })) : p.movimientos.length ? [] : [abono(1, monto), { eventoId: `REV-C${c.id}-1`, tipo: 'reversion', importe: monto, fecha: m.hoy, comprobante: `REV-OP-${c.id}-1`, revierteEventoId: `ASIG-C${c.id}-1` }];
    }
    else if (caso === 'sinInformacion' || caso === 'noDisponible') cabecera.estado = caso;
    else if (caso === 'exceso') cabecera.eventos = [{ ...abono('EXCESO', Math.max(100, monto + 100 - suma(p) / 100)) }];
    else if (caso !== 'sinAbonos') return null;
    return cabecera;
  };
  const ambito = d => JSON.stringify([d.origen, texto(d.sociedad), d.ejercicio]);
  const clave = (d, e) => JSON.stringify([d.origen, texto(d.sociedad), d.ejercicio, texto(e.eventoId)]);
  P.consultar = (m, cId, datos, ctx) => {
    const c = buscar(m, cId), p = c?.pagoCierrePropuesto;
    if (!p || !tiene(ctx, P.PERMISOS[1])) return error('Prepara el seguimiento y habilita el permiso de evidencia propuesta.');
    if (!P.vigente(c)) return error('La fotografía cambió. No se asociará una evidencia a otra factura, empresa o ciclo SAP.');
    const f = p.foto;
    if (!datos || datos.simulada !== true || datos.esquema !== 'evidencia-financiera-propuesta-v1' || datos.origen !== 'SAP-FINANZAS-ESTUDIO' || !texto(datos.sociedad) || !Number.isInteger(datos.ejercicio) || datos.conciliacionId !== c.id || datos.empresaId !== c.transportistaId || datos.pedido !== f.sap.pedido || datos.hoja !== f.sap.hoja || datos.facturaId !== f.facturaPropuesta.id || datos.facturaRevision !== f.facturaPropuesta.revision || datos.moneda !== p.moneda || !texto(datos.documentoContable) || !Array.isArray(datos.eventos) || !['disponible', 'sinInformacion', 'noDisponible'].includes(datos.estado)) return error('Evidencia de estudio inválida o ajena: revisa conciliación, empresa, pedido, hoja, factura/revisión, moneda y origen. No se mezclan monedas ni documentos.');
    if (datos.estado !== 'disponible' && datos.eventos.length) return error('Una consulta sin información/disponibilidad no puede confirmar movimientos.');
    const movimientos = structuredClone(p.movimientos), vistos = new Set();
    for (const e of datos.eventos) {
      if (!e || typeof e !== 'object' || Array.isArray(e)) return error('Cada movimiento debe ser un objeto de evidencia válido. No se guardó parte del lote.');
      const importe = centavos(e.importe), k = clave(datos, e);
      if (!texto(e.eventoId) || texto(e.eventoId).length > 80 || vistos.has(k) || !['abono', 'reversion'].includes(e.tipo) || importe === null || !fechaValida(e.fecha) || !texto(e.comprobante) || texto(e.comprobante).length > 80) return error('Movimiento inválido: identidad única por asignación, importe positivo de 2 decimales, fecha real y comprobante obligatorio.');
      vistos.add(k);
      const nuevo = { clave: k, ambito: ambito(datos), eventoId: texto(e.eventoId), tipo: e.tipo, centavos: importe, fecha: e.fecha, comprobante: texto(e.comprobante), revierteEventoId: e.tipo === 'reversion' ? texto(e.revierteEventoId) : '', documentoContable: texto(datos.documentoContable) };
      const previo = movimientos.find(a => a.clave === k);
      if (previo) { if (JSON.stringify(previo) !== JSON.stringify(nuevo)) return error('El mismo evento llegó con datos distintos. No se reemplaza una evidencia financiera ya registrada.'); continue; }
      const otras = m.recorridoConciliaciones.lista.filter(cc => cc.id !== c.id).flatMap(cc => cc.pagoCierrePropuesto?.movimientos || []);
      if (otras.some(a => a.clave === k)) return error('Esta asignación de pago ya pertenece a otra conciliación. Un pago compartido necesita asignaciones diferentes, no duplicarlo.');
      if (e.tipo === 'reversion') {
        const original = movimientos.find(a => a.eventoId === nuevo.revierteEventoId && a.tipo === 'abono' && a.ambito === nuevo.ambito);
        if (!original || original.centavos !== importe || movimientos.some(a => a.tipo === 'reversion' && a.revierteEventoId === original.eventoId && a.ambito === nuevo.ambito)) return error('Reversión propuesta inválida: requiere abono existente, su mismo importe y no haber sido revertido antes. No se borra el abono.');
      }
      movimientos.push(nuevo);
    }
    if (!Number.isSafeInteger(suma({ movimientos }))) return error('El total supera la precisión de centavos admitida por el laboratorio. No se guardó parte del lote.');
    const consulta = { id: p.consultas.length + 1, fecha: m.hoy, usuario: ctx.usuario, estado: datos.estado, respuesta: structuredClone(datos) };
    p.movimientos = movimientos; p.consultas.push(consulta); p.ultimaConsulta = { id: consulta.id, fecha: m.hoy, estado: datos.estado };
    registrar(m, c, ctx, 'Recibir evidencia financiera SIMULADA (PROPUESTA)', `${datos.estado}; ${datos.eventos.length} evento(s) recibidos; ${movimientos.length} movimientos únicos conservados. No se ejecutó una transferencia.`);
    return ok('Evidencia de práctica recibida. Pago/cierre propuestos separados del estado V1 y de FacturasPagadas.', c.id);
  };
  P.cerrar = (m, cId, datos = {}, ctx) => {
    const c = buscar(m, cId), p = c?.pagoCierrePropuesto, r = P.resumen(m, c);
    if (!p || !tiene(ctx, P.PERMISOS[2]) || !r.puedeCerrar) return error('Propuesta: cierre requiere documentos vigentes, evidencia disponible del día simulado e importe exactamente cubierto, sin exceso. Un cierre desactualizado debe reabrirse.');
    if (datos.revisado !== true || texto(datos.notaCobros).length < 5 || texto(datos.notaCobros).length > 500) return error('Confirma la revisión y explica por separado la situación de cobros/deducciones; no se compensan multas automáticamente.');
    if (p.cierre) p.cierresAnteriores.push(structuredClone(p.cierre));
    p.cierre = { propuesta: true, usuario: ctx.usuario, fecha: m.hoy, notaCobros: texto(datos.notaCobros), firmaMovimientos: firmaMovimientos(p), consultaId: p.ultimaConsulta.id, foto: structuredClone(p.foto), importe: r.abonado, moneda: p.moneda, reabierto: false };
    registrar(m, c, ctx, 'Cerrar seguimiento del flete (PROPUESTA)', `${r.abonado} ${p.moneda}. Es cierre del seguimiento simulado, no cierre mensual ni certificado bancario. Cobros: ${texto(datos.notaCobros)}`);
    return ok('Cierre propuesto del seguimiento registrado. Conciliación V1 sigue Liberado; no se alteraron cobros, CRE ni cierre mensual.', c.id);
  };
  P.reabrir = (m, cId, motivo, ctx) => {
    const c = buscar(m, cId), p = c?.pagoCierrePropuesto;
    if (!p?.cierre || p.cierre.reabierto || !tiene(ctx, P.PERMISOS[3]) || texto(motivo).length < 5 || texto(motivo).length > 500) return error('Reapertura propuesta requiere cierre previo, permiso y motivo de 5–500 caracteres.');
    Object.assign(p.cierre, { reabierto: true, motivoReapertura: texto(motivo), reabiertoPor: ctx.usuario, fechaReapertura: m.hoy });
    registrar(m, c, ctx, 'Reabrir seguimiento (PROPUESTA)', texto(motivo)); return ok('Seguimiento reabierto conservando pagos y cierre anterior. No revierte SAP ni realiza pagos.', c.id);
  };
  P.cierreMesV1 = ({ documentosSAP, estadosMovimiento, tieneConfiguracion }) => {
    const saleDelSub = documentosSAP.some(n => n !== null); // IS NOT NULL OR <> '' también toma cadena vacía.
    const admiteCerrar = tieneConfiguracion && estadosMovimiento.length > 0 && estadosMovimiento.every(e => e !== null && !['Abierto', 'Cerrado Con Observacion'].includes(e));
    return { saleDelSub, cambiaMesSegunValidador: !!admiteCerrar, continuaLlamador: true,
      explicacion: saleDelSub ? 'PROCESAR_DIFERENCIAS sale por documento SAP (incluso vacío), pero el llamador sigue a CAMBIAR_ESTADO. No es un cierre financiero de la conciliación.' : 'El cierre valida movimientos por localidad/producto y genera diferencias del mes; no verifica que el flete de esta conciliación esté pagado.' };
  };
})(SILOG.pagosCierreEstudio = {});

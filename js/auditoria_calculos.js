/* Lectura pura: explica resultados del motor, sin editar conciliaciones ni llamar a V1. */
window.SILOG = window.SILOG || {};
(function (A) {
  const M = SILOG.motor;
  const n = M.fmtN, b = M.fmtB;
  const suma = xs => M.redHU(xs.reduce((s, x) => s + Number(x), 0));
  const expresion = xs => xs.length ? xs.map(x => b(x)).join(' + ') : '0,00';
  const dato = (clave, titulo, valor, unidad, pasos, fuente) => ({ clave, titulo, valor, unidad, pasos, fuente });
  const SQL = 'ObtenerTotalesConciliacion + ConciliacionOtrosTransportes.ascx.vb:533-566';

  A.linea = (st, l, g) => {
    const desp = M.porId(st.cres, l.despachoId), recs = M.recepcionesDe(st, desp.id);
    const rec = g.recepcion, ajuste = l.ajuste || {};
    const base = l.ultima ? l.baseFlete : 0;
    const merma = l.liberarMerma ? 0 : l.cdBs;
    const netoActualizado = M.redHU(l.totalFlete + merma + l.multasIn);
    const admBruto = l.volDesp * l.admPorc / 100;
    return [
      dato('volDesp', 'Volumen despachado asignado', l.volDesp, 'L', [
        `CRE ${desp.numero}: volumen original ${n(desp.volumen)} L.`,
        recs.length > 1 ? `Reparto: ${n(desp.volumen)} × ${n(rec.volumen)} / ${n(recs.reduce((s, r) => s + r.volumen, 0))} = ${n(desp.volumen * rec.volumen / recs.reduce((s, r) => s + r.volumen, 0))} L antes de redondear.` : 'Una recepción: se asigna el despacho completo.',
        `Resultado guardado al generar: ${n(l.volDesp)} L. La política V1 es CInt bancario; la propuesta usa resto mayor. Cambiar el modo no regenera automáticamente líneas ya guardadas.`
      ], 'DetalleSinConciliar.ascx.vb:1540-1545'),
      dato('volRec', 'Volumen recibido de la línea', l.volRec, 'L', [
        `Recepción ${rec.numero}: ${n(rec.volumen)} L.`,
        l.ultima ? 'Solo la última línea contiene el volumen de recepción para no duplicarlo.' : 'Esta no es la última línea: 0 L; el total se guarda en la última.'
      ], 'DetalleSinConciliar.ascx.vb:1588-1602'),
      dato('tarifa', 'Tarifa aplicada', l.tarifaAplicada, 'Bs/L', [
        `Fuente registrada: ${l.tarifaFuente}; tarifa de línea ${l.tarifa.toFixed(5)} Bs/L.`,
        `Conversión de catálogo: ${b(l.tarifaM3)} Bs/m³ / 1.000 L/m³.`,
        ajuste.tarifaEspecial ? `Tarifa especial: ${Number(ajuste.tarifaEspecial).toFixed(5)} Bs/L reemplaza la anterior para el flete.` : 'No hay tarifa especial: se usa la tarifa guardada de la línea.',
        'OT muestra un promedio cuando una recepción tiene varias tarifas; Procesar puede reescribir ese promedio en las líneas (D27).'
      ], 'MC_DevolverTarifaVigente_OT; CARGAR_DATOS_CONCILIACION_OT; OT:620-657'),
      dato('admisible', 'Merma admisible por despacho', l.admLts, 'L', [
        `${n(l.volDesp)} L × ${l.admPorc}% / 100 = ${admBruto.toFixed(4)} L.`,
        `Truncar a dos decimales: ${M.trunc2(admBruto)}; redondeo admisible (> 0,49): ${n(l.admLts)} L.`,
        `Admisible de la recepción: ${g.lineas.map(x => n(x.admLts)).join(' + ')} = ${n(g.lineas.reduce((s, x) => s + x.admLts, 0))} L.`
      ], 'AdmUtilitariosConciliacion.vb:972-995; DetalleSinConciliar:1583-1587'),
      dato('balance', 'Balance de la recepción', l.balanceLote, 'L', [
        l.ultima ? `${n(rec.volumen)} recibidos − ${n(g.tot.despachos)} despachados = ${n(l.balanceLote)} L.` : 'Balance 0 en esta línea: el balance consolidado está en la última línea.',
        'Negativo: falta producto. Positivo: demasía. No confundir volumen físico con monto monetario.'
      ], 'DetalleSinConciliar.ascx.vb:1588-1600'),
      dato('cdLts', 'Crédito/débito físico', l.cdLts, 'L', [
        ...(!l.ultima ? ['0 L en líneas no finales.'] : [
          `Balance ${n(l.balanceLote)} L; admisible acumulado ${n(l.admLote)} L.`,
          l.balanceLote > 0 ? 'Demasía: C/D = balance.' : -l.balanceLote > l.admLote ? `Faltante mayor al admisible: ${n(l.balanceLote)} + ${n(l.admLote)} = ${n(l.cdLts)} L.` : 'Faltante dentro del admisible: C/D = 0 L.'
        ]),
        'C/D es el ajuste después del admisible, no el balance completo. El nombre no demuestra una nota de crédito/débito contable.',
        SILOG.creditoDebito ? SILOG.creditoDebito.reglaEnPalabras(l.cdLts) : 'El signo describe faltante no admisible o demasía compensable.'
      ], 'DetalleSinConciliar.ascx.vb:1588-1600'),
      dato('precio', 'Precio para valorizar el C/D', l.precioMulta, 'Bs/L en estos datos', [
        `Precio guardado: ${l.precioMulta}; fuente: ${l.precioFuente}.`,
        `Fecha de carga ${l.fechaCarga}, producto ID ${l.productoId}, origen ID ${l.origenId}.`,
        'V1 busca precio nacional o importado vigente. Los escenarios importados del prototipo simplifican moneda/TC: no validan conversión financiera real.'
      ], 'ObtenerPrecioProducto; ProductoPrecio; MA_PrecioProductoImportado'),
      dato('cdBs', 'Crédito/débito monetario', l.cdBs, 'Bs', [
        `${n(l.cdLts)} L × ${l.precioMulta} Bs/L = ${(l.cdLts * l.precioMulta).toFixed(5)} Bs.`,
        `Redondear half-up a 2 decimales = ${b(l.cdBs)} Bs.`,
        l.liberarMerma ? 'Merma liberada: el C/D físico permanece en el historial, pero su aporte de línea al neto es 0.' : 'Aporte de línea al neto: el monto firmado completo.',
        'Después se compensa por producto. En el SQL de OT cualquier liberación excluye toda la recepción (D35).',
        'Se usa el precio del producto, no la tarifa de flete. El saldo positivo final por producto se limita a cero: no premio ni pago adicional.'
      ], 'DetalleSinConciliar.ascx.vb:1610-1629; ObtenerTotalesConciliacion'),
      dato('baseFlete', 'Base que se remunera', base, 'L', [
        !l.ultima ? '0 L: se paga el flete una sola vez en la última línea.' : ajuste.liberarCapacidad ? `${n(ajuste.liberarCapacidad)} capacidad − ${n(g.tot.despachos)} despachados + ${n(l.volRec)} recibidos = ${n(base)} L.` : `${n(l.volRec)} L recibidos; sin liberar capacidad.`,
        'No es necesariamente la capacidad ni el volumen que se enviará como cantidad a SAP (D17).'
      ], 'ConciliacionOtrosTransportes.ascx.vb:620-657'),
      dato('flete', 'Flete de la línea', l.totalFlete, 'Bs', [
        `${n(base)} L × ${l.tarifaAplicada.toFixed(5)} Bs/L = ${(base * l.tarifaAplicada).toFixed(5)} Bs.`,
        `Half-up(importe, 2) = ${b(l.totalFlete)} Bs.`
      ], 'ConciliacionOtrosTransportes.ascx.vb:620-657'),
      dato('multas', 'Multas CRE asignadas a esta línea', l.multasIn, 'Bs', [
        `CRE despacho ${desp.numero}: multas registradas ${b(M.totalMultasCRE(st, desp.id))} Bs.`,
        l.multasIn ? `Primer encuentro de este despacho: descuento −${b(M.totalMultasCRE(st, desp.id))} Bs.` : 'Sin multas o despacho ya contado en otra línea de esta conciliación: aporte 0.',
        'En cabecera estas multas ya están incluidas en Multa Transporte; no descontarlas otra vez.'
      ], 'MC_ObtenerMultaDescuentoAplicado: @MontoMultaAnterior, DISTINCT DespachoCREID'),
      dato('totalLinea', 'Total a facturar mostrado en la línea', l.totalFacturar, 'Bs', [
        `Recalculado coherente: ${b(l.totalFlete)} + ${b(merma)} + ${b(l.multasIn)} = ${b(netoActualizado)} Bs.`,
        `Mostrado por el modo actual: ${b(l.totalFacturar)} Bs.`,
        l.desactualizado ? `D12: diferencia ${b(l.totalFacturar - netoActualizado)} Bs. V1 no actualiza esa celda cuando C/D ≥ 0. Solución: recalcular siempre y persistir el mismo resultado.` : 'En esta línea ambos resultados coinciden.',
        'La suma de líneas no sustituye al neto de cabecera: aún falta la compensación por producto y otros recargos.'
      ], 'ConciliacionCisterna.ascx.vb:1379-1414 (no es la rutina de actualización de OT)')
    ];
  };

  A.conciliacion = (st, conc, modo) => {
    const d = M.recalcular(st, conc, modo), k = d.cab, sql = M.otCabecera(st, conc);
    const visual = M.otTotales(st, conc), guardado = conc.totales || {};
    const ls = d.grupos.flatMap(g => g.lineas), productos = Object.values(d.productos);
    const rows = [
      dato('flete', 'Flete recalculado', k.flete, 'Bs', [`Suma de fletes de las líneas: ${expresion(ls.map(l => l.totalFlete))} = ${b(k.flete)} Bs.`, 'Cada recepción se paga una sola vez; los recargos no son flete.'], SQL),
      dato('mermas', 'Mermas de cabecera (pantalla cisterna)', k.mermas, 'Bs', productos.flatMap(p => [
        `Producto ${M.nombreProd(st, p.productoId)}: ${expresion(d.grupos.filter(g => g.productoId === p.productoId).map(g => g.tot.mermas))} = ${b(p.mermasBrutas)} Bs.`,
        `Aplicar mínimo(0, ${b(p.mermasBrutas)}) = ${b(p.mermas)} Bs; las demasías compensan, pero un saldo positivo no se paga.`
      ]).concat(`Suma de productos = ${b(k.mermas)} Bs.`), 'ConciliacionCisterna.ascx.vb:1119-1140'),
      dato('mermasOT', 'Mermas para Procesar en Otros Transportes', sql.mermas, 'Bs', d.grupos.map(g =>
        `${g.recepcion.numero}: ΣC/D ${b(suma(g.lineas.map(l => l.cdBs)))}; ${g.lineas.some(l => l.liberarMerma) ? 'alguna línea liberada → 0 para TODA la recepción' : 'sin liberación → conservar C/D'}.`
      ).concat(`Agrupar por producto, tomar solo saldo negativo y sumar = ${b(sql.mermas)} Bs.`, 'Con liberaciones mezcladas puede diferir de la pantalla cisterna. No es otro cobro: son dos algoritmos del legado.'), SQL),
      ...productos.map(p => dato('volumen-' + p.productoId, 'Volumen contable de ' + M.nombreProd(st, p.productoId), p.volumen, 'L', [
        ...ls.filter(l => l.productoId === p.productoId && l.ultima).map(l => `${l.creRecepcion}: ${l.ajuste.liberarCapacidad ? `capacidad liberada ${n(l.ajuste.liberarCapacidad)}` : `recepción ${n(l.volRec)}`} L.`),
        `Sumar cantidades anteriores = ${n(p.volumen)} L. La base remunerada suma ${n(ls.filter(l => l.productoId === p.productoId).reduce((s, l) => s + l.baseFlete, 0))} L.`,
        'Si difieren, estudiar D17 antes de enviar cantidades e importes a SAP.'
      ], 'ObtenerFletesConciliacion; AdmUtilitariosConciliacion:1193-1331')),
      dato('multasCRE', 'Desglose: multas de CRE', k.multasCRE, 'Bs', [
        `Despachos distintos: ${[...new Set(ls.map(l => l.despachoId))].map(id => M.porId(st.cres, id).numero).join(', ')}.`,
        `Suma de aportes sin duplicar despacho: ${expresion(ls.map(l => l.multasIn))} = ${b(k.multasCRE)} Bs.`,
        'Este subtotal está DENTRO de Multa Transporte, tanto en V1 procesado como en la propuesta.'
      ], 'MC_ObtenerMultaDescuentoAplicado: @MontoMultaAnterior'),
      dato('multaContractual', 'Desglose: recargos contractuales CCIST', k.multaContractual, 'Bs', (conc.recargos || []).filter(r => r.tipo === 'CCIST').flatMap(r => SILOG.multasContractuales
        ? [`${r.concepto} · CREID ${r.creId || 'sin CRE'}.`, ...SILOG.multasContractuales.calcular(st, conc, r, modo).pasos]
        : [`${r.concepto}: −(${b(r.monto)} × ${r.cantidad == null ? 1 : r.cantidad}) Bs.`]).concat(`Suma contractual = ${b(k.multaContractual)} Bs. Se consolida con las multas clásicas, no se descuenta dos veces.`), 'MC_ObtenerMultaDescuentoAplicado'),
      dato('multaTransporte', 'Multa Transporte consolidada', k.multaTransporte, 'Bs', [`Contractuales ${b(k.multaContractual)} + multas CRE ${b(k.multasCRE)} = ${b(k.multaTransporte)} Bs.`, 'Usar SOLO este consolidado al sumar el neto. No sumar además el desglose CRE.'], 'ObtenerMontosDeConciliacion + MC_ObtenerMultaDescuentoAplicado'),
      ...[['multaConciliacion', 'MC', 'Multa de conciliación'], ['descuentoConciliacion', 'DC', 'Descuento de conciliación'], ['carroGuia', 'CG', 'Carro guía'], ['casosEspeciales', 'CASO', 'Casos especiales']].map(([key, tipo, label]) => dato(key, label, k[key], 'Bs',
        (conc.recargos || []).filter(r => r.tipo === tipo).map(r => tipo === 'CASO'
          ? `${r.concepto}: monto firmado guardado ${b(r.montoAlmacenado == null ? -r.monto : r.montoAlmacenado)} Bs (${r.montoAlmacenado == null ? 'alias del descuento positivo de los escenarios antiguos' : 'se respeta el signo, no se invierte por defecto'}).`
          : `${r.concepto}: −${b(r.monto)} × ${r.cantidad == null ? 1 : r.cantidad} Bs.`
        ).concat(`Total ${b(k[key])} Bs. ${tipo === 'CASO' ? 'SQL SUM(Monto): positivo suma, negativo descuenta.' : 'La columna de montos convierte el cobro a descuento con signo negativo.'} Entra al total visual OT, pero no al neto persistido V1 de cisterna.`), 'ObtenerMontosDeConciliacion; MultaDescuentoConciliacion.aspx.vb:545-576')),
      dato('netoCisterna', 'Neto recalculado en pantalla cisterna', k.neto, 'Bs', [`${b(k.flete)} + ${b(k.mermas)} + ${b(k.multaTransporte)}${modo === 'PROPUESTO' ? ` + ${b(k.multaConciliacion)} + ${b(k.descuentoConciliacion)} + ${b(k.casosEspeciales)} + ${b(k.carroGuia)}` : ''} = ${b(k.neto)} Bs.`, k.formula], 'ConciliacionCisterna.ascx.vb:1061-1089'),
      dato('netoOT', 'Neto que guardaría Procesar de OT ahora', sql.neto, 'Bs', [`${b(sql.flete)} flete + ${b(sql.mermas)} mermas SQL + ${b(sql.multaTransporte)} incumplimientos = ${b(sql.neto)} Bs.`, 'Recalculado no significa ya guardado: hace falta Procesar.'], SQL),
      dato('netoGuardado', 'Neto realmente guardado en el prototipo', visual.netoGuardado, 'moneda declarada: ' + conc.moneda, [
        visual.netoGuardado == null ? 'No existe una instantánea: no inventar un neto guardado.' : `conc.totales.neto = ${b(visual.netoGuardado)}; no se obtiene recalculando.`,
        guardado.faseCalculo === 'GENERACION' ? 'Generación V1: guarda flete + merma; incorpora incumplimientos al procesar.' : 'Instantánea procesada o histórica simulada. Ajustes, recargos o una revisión anterior del motor pueden dejarla desactualizada; consultar no la sobrescribe.',
        `Flete guardado ${b(guardado.flete)}, merma guardada ${b(guardado.mermas)}, incumplimientos guardados ${b(guardado.multaTransporte)}.`
      ], 'ConciliacionCisterna / DetalleSinConciliar; instantánea local del prototipo'),
      dato('netoVisual', 'Neto mostrado en la columna Totales de OT', visual.neto, 'moneda declarada: ' + conc.moneda, visual.conceptos.map(([label, valor]) =>
        `${label}: ${b(valor)} → CInt = ${M.cintBancario(valor)} → ${M.cintBancario(valor) !== 0 ? 'se suma el decimal ORIGINAL' : 'se omite de la tabla y de la suma'}.`
      ).concat(`Sumar solo conceptos visibles: ${expresion(visual.filas.map(f => f[1]))} = ${b(visual.neto)}.`, 'Flete/merma proceden de la cabecera guardada; los recargos se consultan en vivo. No equivale necesariamente al NetoConciliado persistido.'), 'ConciliacionOtrosTransportes.ascx.vb:568-591; ObtenerMontosDeConciliacion')
    ];
    const omitidos = suma(visual.omitidos.map(f => f[1]));
    const extras = suma([k.multaConciliacion, k.descuentoConciliacion, k.casosEspeciales, k.carroGuia]);
    const puente = visual.netoGuardado == null ? null : [
      dato('baseGuardada', 'Base guardada menos neto guardado', M.redHU(Number(guardado.flete || 0) + Number(guardado.mermas || 0) + Number(guardado.multaTransporte || 0) - visual.netoGuardado), 'Bs', ['Detecta una instantánea inicial, propuesta o antigua que no coincide con la fórmula V1 procesada.'], SQL),
      dato('incumplimientoEnVivo', 'Multa Transporte actual menos guardada', M.redHU(k.multaTransporte - Number(guardado.multaTransporte || 0)), 'Bs', [`${b(k.multaTransporte)} − (${b(guardado.multaTransporte)})`], 'MC_ObtenerMultaDescuentoAplicado'),
      dato('extras', 'MC + DC + casos + carro guía', extras, 'Bs', [`${b(k.multaConciliacion)} + ${b(k.descuentoConciliacion)} + ${b(k.casosEspeciales)} + ${b(k.carroGuia)}`], 'ObtenerMontosDeConciliacion'),
      dato('omitidos', 'Restar conceptos omitidos por CInt', -omitidos, 'Bs', [`−(${expresion(visual.omitidos.map(f => f[1]))})`], 'OT:568-591')
    ];
    return { d, sql, visual, rows, puente,
      diferencia: visual.netoGuardado == null ? null : M.redHU(visual.neto - visual.netoGuardado),
      comprobacionPuente: puente == null ? null : suma(puente.map(x => x.valor)),
      incidencias: [
        ...(ls.some(l => l.desactualizado) ? ['D12'] : []),
        ...(d.grupos.some(g => g.lineas.some(l => l.liberarMerma) && !g.lineas.every(l => l.liberarMerma)) ? ['D28', 'D35'] : []),
        ...(extras !== 0 ? ['D29'] : []),
        ...(visual.omitidos.length ? ['D34'] : []),
        ...(ls.some(l => l.ultima && Number(l.ajuste.liberarCapacidad) && l.baseFlete !== Number(l.ajuste.liberarCapacidad)) ? ['D17'] : []),
        ...(st.conciliaciones.some(c => c.id !== conc.id && c.lineas.some(l => ls.some(x => x.despachoId === l.despachoId) && M.totalMultasCRE(st, l.despachoId) !== 0)) ? ['D36'] : []),
        ...(conc.moneda !== 'Bs' ? ['LIMITACION_MONEDA'] : [])
      ] };
  };

  A.multasCRE = (st, creId) => st.multasCRE.filter(m => m.creId === creId).map((m, i) => {
    const cat = M.porId(st.multasCatalogo, m.multaId) || {}, desp = M.porId(st.cres, creId);
    const cambio = m.moneda === 'Sus' ? m.tc : 1;
    const formula = cat.base === 'filtracion'
      ? `((${m.entrada === true ? m.valor : m.entrada} × TC ${m.tc}) × 1,15 / 1.000) × ${n(desp.volumen)} L`
      : cat.base === 'fijo' ? `${m.valor} × ${cambio}` : `|${m.entrada}| × ${m.valor} × ${cambio}`;
    return dato('multa-' + i, cat.nombre || 'Multa registrada', m.total, 'Bs', [
      `Base registrada: ${m.valor} ${m.moneda}; cantidad/entrada: ${m.entrada}; TC: ${m.tc}.`,
      `${formula} → half-up a dos decimales = ${b(m.total)} Bs (registro simulado).`,
      'MultaPorIncumplimiento almacena cantidad, valor, TC y TotalMultas. SQL ID 9 usa TotalMultas × TC si Sus; otras multas usan |cantidad| × valor × TC.',
      'La UI y SQL no necesariamente convierten en la misma etapa. El demo conserva total en Bs para no aplicar TC dos veces.',
      'Se descuenta una vez por CRE distinto dentro de Multa Transporte de la conciliación.'
    ], 'MultasPorInclumpliento.ascx.vb:179-238; TotalMultasPorIncumplimiento; MC_ObtenerMultaDescuentoAplicado');
  });

  A.multaPrevia = (m, entrada, tc, volumen, total) => {
    const cambio = m.moneda === 'Sus' ? tc : 1;
    const base = entrada === true ? m.valor : Number(entrada || 0);
    const pasos = m.base === 'filtracion' ? [`Filtración aplicada: ${!!entrada}. Base MPF ${base}; TC ${tc}; volumen ${n(volumen)} L.`, `(${base} × ${tc}) × 1,15 / 1.000 × ${n(volumen)} = ${b(total)} Bs.`]
      : m.base === 'fijo' ? [`Aplicar multa: ${!!entrada}; ${m.valor} ${m.moneda} × ${cambio} = ${b(total)} Bs si se aplica, o 0 si no se aplica.`]
        : [`Cantidad ${base} × valor ${m.valor} ${m.moneda} × conversión ${cambio} = ${b(total)} Bs.`];
    return dato('multaPrevia-' + m.id, 'Cálculo previo de ' + m.nombre, total, 'Bs', pasos.concat('Half-up a 2 decimales. Es el cálculo visible de los campos actuales, no una multa nueva guardada. Pulsar Registrar para persistir.', 'Después se consolida en Multa Transporte; no descontar el subtotal CRE otra vez.'), 'motor.calcularMultaCRE; MultasPorInclumpliento:179-238');
  };

  A.caso = r => {
    const firmado = r.tipo === 'CG' ? Number(r.monto) : Number(r.montoAlmacenado == null ? -r.monto : r.montoAlmacenado);
    return dato('caso-' + r.id, r.tipo === 'CG' ? 'Monto de carro guía y su descuento' : 'Monto firmado del caso especial', firmado, 'Bs', [
      `Importe ingresado ${b(r.monto)}; valor guardado/interpretado ${b(firmado)}.`,
      r.tipo === 'CG' ? `SUM(Monto) se invierte para descontar: −(${b(firmado)}) = ${b(-firmado)} Bs de aporte.` : `SQL suma directamente Monto: ${b(firmado)} Bs ${firmado < 0 ? 'descuenta' : 'suma'}. No invertir el signo otra vez.`,
      'En V1 entra al total visual de OT, no al neto persistido de cisterna; en la propuesta se integra al neto único.'
    ], 'ObtenerMontosDeConciliacion; MultaDescuentoConciliacion:545-576');
  };

  // Explicar la fila agrupada de OT sin confundir promedio de precios con valoración.
  A.filaOT = (st, conc, f) => {
    const ls = f.lineas, g = { recepcion: f.rec, tot: { despachos: f.despacho }, lineas: ls };
    const sumCampo = campo => ls.map(l => n(l[campo])).join(' + ') || '0';
    const sumMoneda = campo => expresion(ls.map(l => l[campo]));
    const detalle = campo => ls.flatMap(l => {
      const x = A.linea(st, l, g).find(x => x.clave === campo);
      return [`CRE ${l.creDespacho}:`, ...(x ? x.pasos : [])];
    });
    const fuente = 'CARGAR_DATOS_CONCILIACION_OT DETALLE; ConciliacionOtrosTransportes:620-657';
    const pendiente = 'Se explican los datos guardados de la fila. Los controles editados no cambian este resultado hasta Procesar.';
    return [
      dato('despacho', 'Despacho de esta recepción', f.despacho, 'L', [`Σ despachos asignados: ${sumCampo('volDesp')} = ${n(f.despacho)} L.`, ...detalle('volDesp')], fuente),
      dato('recepcion', 'Recepción consolidada', f.recepcion, 'L', [`Σ volumen recibido de líneas: ${sumCampo('volRec')} = ${n(f.recepcion)} L.`, 'El volumen se guarda solo en la última línea; las anteriores tienen 0.'], fuente),
      dato('balance', 'Balance físico agrupado', f.balance, 'L', [`${n(f.recepcion)} recibidos − ${n(f.despacho)} despachados = ${n(f.balance)} L.`, ...detalle('balance')], fuente),
      dato('admLts', 'Admisible acumulado', f.admLts, 'L', [`Σ admisibles: ${sumCampo('admLts')} = ${n(f.admLts)} L.`, ...detalle('admisible')], fuente),
      dato('cdLts', 'Crédito/débito físico agrupado', f.cdLts, 'L', [`Σ C/D de líneas: ${sumCampo('cdLts')} = ${n(f.cdLts)} L.`, ...detalle('cdLts')], fuente),
      dato('precioMulta', 'Precio promedio mostrado en OT', f.precioMulta, 'Bs/L del escenario', [`(${ls.map(l => l.precioMulta).join(' + ')}) / ${ls.length} = ${ls.reduce((v, l) => v + l.precioMulta, 0) / ls.length}; redondeado en el demo a 2 decimales: ${f.precioMulta}.`, 'No valorar el C/D multiplicando por este promedio: el monto Bs se suma desde las líneas, con sus precios y fechas propios.', ...detalle('precio')], fuente),
      dato('cdBs', 'C/D monetario de esta recepción', f.cdBs, 'Bs', [`Σ C/D monetarios: ${sumMoneda('cdBs')} = ${b(f.cdBs)} Bs.`, ...detalle('cdBs'), 'La casilla solo aparece marcada si todas las líneas liberan merma; SQL excluye la recepción si alguna libera. Revisar D28/D35.', pendiente], fuente),
      dato('tarifa', 'Tarifa promedio de líneas guardadas', f.tarifa, 'Bs/L', [`(${ls.map(l => l.tarifa.toFixed(5)).join(' + ')}) / ${ls.length} = ${f.tarifa.toFixed(5)} Bs/L tras redondear a 5 decimales.`, f.tarifaPromediada ? 'D27: hay tarifas distintas. El promedio no representa necesariamente la tarifa del flete de la última línea.' : 'Las líneas tienen la misma tarifa.', 'Procesar usa la tarifa seleccionada o la especial, no necesariamente este promedio.', pendiente], fuente),
      dato('flete', 'Flete de esta recepción', f.flete, 'Bs', [`Σ fletes de líneas: ${sumMoneda('totalFlete')} = ${b(f.flete)} Bs.`, ...detalle('flete'), ...detalle('baseFlete'), pendiente], fuente),
      dato('liberarCapacidad', 'Liberar capacidad: base remunerada', f.liberarCapacidad, 'L guardados', [...detalle('baseFlete'), pendiente], fuente),
      dato('tarifaEspecial', 'Tarifa especial guardada', f.tarifaEspecial, 'Bs/L', [f.tarifaEspecial ? `Especial ${f.tarifaEspecial.toFixed(5)} Bs/L; reemplaza la seleccionada para el flete.` : 'No hay tarifa especial: se usa la seleccionada.', ...detalle('flete'), pendiente], fuente),
      dato('liberarMerma', 'Alcance de liberar merma', f.liberarMerma ? 1 : 0, 'casilla guardada (1=sí)', [`${ls.filter(l => l.liberarMerma).length} de ${ls.length} líneas liberadas.`, 'OT marca solo si TODAS están liberadas; la pantalla cisterna excluye por línea y SQL OT por recepción si ALGUNA está liberada.', 'Solución D28/D35: acordar un único alcance y mostrar el caso parcial explícitamente.', pendiente], fuente)
    ];
  };

  A.producto = (st, conc, p, grupos) => {
    const gs = grupos.filter(g => g.productoId === p.productoId);
    return [
      dato('flete', 'Flete de ' + M.nombreProd(st, p.productoId), p.flete, 'Bs', [`Σ flete de recepciones: ${expresion(gs.map(g => g.tot.flete))} = ${b(p.flete)} Bs.`], 'ConciliacionCisterna:1119-1140'),
      dato('mermasBrutas', 'C/D bruto por producto', p.mermasBrutas, 'Bs', [`Σ C/D no liberado por línea: ${expresion(gs.map(g => g.tot.mermas))} = ${b(p.mermasBrutas)} Bs.`, 'Solo compensa recepciones de este producto; no mezcla productos distintos.'], 'ConciliacionCisterna:1119-1140'),
      dato('mermas', 'Merma aplicada por producto', p.mermas, 'Bs', [`mínimo(0, ${b(p.mermasBrutas)}) = ${b(p.mermas)} Bs.`, 'Demasía positiva compensa faltantes pero el saldo positivo final no se paga.'], 'ConciliacionCisterna:1119-1140'),
      dato('volumen', 'Volumen contable del producto', p.volumen, 'L', gs.flatMap(g => g.lineas.filter(l => l.ultima).map(l => `${l.creRecepcion}: ${n(l.ajuste.liberarCapacidad || l.volRec)} L (${l.ajuste.liberarCapacidad ? 'capacidad liberada directa' : 'recibidos'}).`)).concat(`Suma = ${n(p.volumen)} L. Puede diferir de la base remunerada por D17.`), 'ObtenerFletesConciliacion')
    ];
  };

  A.conceptoOT = (st, conc, etiqueta, valor, informe) => {
    const r = informe || A.conciliacion(st, conc, 'V1');
    const claves = { 'Flete Facturable': 'flete', 'Multa Merma': 'mermasOT', 'Multa Transporte': 'multaTransporte', 'Multa Conc.': 'multaConciliacion', 'Descuento Conc.': 'descuentoConciliacion', 'Carro Guía': 'carroGuia', 'Casos Especiales': 'casosEspeciales' };
    const origen = r.rows.find(x => x.clave === claves[etiqueta]);
    return dato(claves[etiqueta], etiqueta + ' mostrado en Totales OT', valor, conc.moneda, [
      ...(etiqueta === 'Flete Facturable' || etiqueta === 'Multa Merma' ? [`La columna lee el monto guardado ${b(valor)}. El recálculo actual es ${b(origen.valor)}; no se reemplaza la instantánea al consultar.`] : []),
      ...(origen ? origen.pasos : []),
      `CInt(${b(valor)}) = ${M.cintBancario(valor)}; si no es 0, se suma el decimal original ${b(valor)} al total visual.`,
      'Los recargos se consultan en vivo; flete y merma proceden de la cabecera guardada. El panel completo permite comparar los netos.'
    ], 'ObtenerMontosDeConciliacion; ConciliacionOtrosTransportes:568-591');
  };

  A.presupuesto = (st, g) => {
    const contrato = g.contrato, marco = contrato && contrato.marco;
    if (!marco || !marco.controlaPresupuesto) return [];
    const programado = Number(marco.programado[g.anio] || 0), ejecutado = Number(marco.ejecutado[g.anio] || 0);
    const preliminar = suma(g.recepciones.flatMap(r => r.lineas.map(l => l.totalFacturar)));
    return [
      dato('programado', 'Presupuesto programado del año', programado, 'Bs del escenario', [`Contrato marco ${marco.numero}, año ${g.anio}: dato configurado ${b(programado)}.`, 'No es un importe calculado; proviene de la programación. Ausencia/0 bloquea según el demo V1.'], 'DetalleSinConciliar:2028-2103'),
      dato('ejecutado', 'Ejecución presupuestaria cargada', ejecutado, 'Bs del escenario', [`Dato del escenario: ${b(ejecutado)}.`, 'En V1 procede de MC_ObtenerEjecucionContratoMarco. El demo simplifica su actualización al liberar; no replica la consulta financiera.'], 'MC_ObtenerEjecucionContratoMarco'),
      dato('montoTentativo', 'Monto preliminar para validar el grupo completo', preliminar, 'Bs', [`Σ TotalFacturar de sus líneas = ${expresion(g.recepciones.flatMap(r => r.lineas.map(l => l.totalFacturar)))} = ${b(preliminar)}.`, 'Si desmarcas recepciones, Generar valida solo las seleccionadas; esta ficha muestra TODO el grupo.'], 'motor.validarGeneracion (simplificación del prototipo)'),
      dato('saldo', 'Saldo presupuestario previo', M.redHU(programado - ejecutado), 'Bs', [`${b(programado)} − ${b(ejecutado)} = ${b(programado - ejecutado)}.`, `Comparación del grupo completo: ${b(ejecutado)} + ${b(preliminar)} ${ejecutado + preliminar > programado ? '>' : '≤'} ${b(programado)}.`, 'Saldo de presupuesto no equivale a flete ni a neto conciliado.'], 'DetalleSinConciliar:2028-2103')
    ];
  };

  A.sap = (st, conc, item) => {
    const producto = st.productos.find(p => p.nombre === item.producto);
    const ls = M.recalcular(st, conc, 'V1').grupos.flatMap(g => g.lineas).filter(l => producto && l.productoId === producto.id);
    const cantidades = ls.filter(l => l.ultima).map(l => Number(l.ajuste.liberarCapacidad || l.volRec));
    return [
      dato('sapFlete-' + item.item, `Ítem ${item.item} · ${item.producto} · importe`, item.flete, conc.sap.moneda, [
        `Origen actual por producto: Σ fletes = ${expresion(ls.map(l => l.totalFlete))} = ${b(suma(ls.map(l => l.totalFlete)))}.`,
        `Instantánea del detalle SAP: ${b(item.flete)}. ${Math.abs(suma(ls.map(l => l.totalFlete)) - item.flete) < 0.005 ? 'Coincide con los fletes actuales.' : 'Difiere: el documento es una instantánea anterior; consultar no lo actualiza.'}`,
        'No suma automáticamente C/D, multas ni otros recargos. No equivale necesariamente al neto a liquidar.',
        'Producto se identifica aquí con el nombre del detalle SAP simulado; el modelo definitivo debe guardar su ID.'
      ], 'ObtenerFletesConciliacion; AdmUtilitariosConciliacion:1193-1331'),
      dato('sapCantidad-' + item.item, `Ítem ${item.item} · cantidad`, item.volumen, 'L del escenario', [
        `Lectura contable actual: ${cantidades.map(n).join(' + ') || '0'} = ${n(cantidades.reduce((v, x) => v + x, 0))} L.`,
        `Cantidad registrada en SAP: ${n(item.volumen)} L.`,
        `Base remunerada actual: ${n(ls.reduce((v, l) => v + l.baseFlete, 0))} L. Capacidad liberada directa puede diferir de base = capacidad − despacho + recepción (D17).`,
        'Comparar cantidad e importe antes de liberar el documento. La simulación no envía nada a SAP.'
      ], 'ObtenerFletesConciliacion')
    ];
  };

  // Ejemplos calculados, no conciliaciones persistidas ni reglas aprobadas para DESTINO.
  A.barcaza = e => {
    // btnProcesar_Click usa CInt para los volúmenes del grid y ValueInt para estos controles.
    const recibido = M.cintBancario(e.recibido), despachado = M.cintBancario(e.despachado);
    const capacidad = M.cintBancario(e.capacidad), porcentaje = M.cintBancario(e.porcentaje);
    const tarifa = e.tarifaEspecial > 0 ? e.tarifaEspecial : e.tarifa;
    const activa = capacidad > 0 && porcentaje > 0, conserva = capacidad <= 0;
    const maximo = activa ? (porcentaje === 100 ? capacidad : M.cintBancario(porcentaje * capacidad / 100)) : 0;
    const comp = conserva ? Number(e.compensacionGuardadaL || 0) : !activa ? 0 : porcentaje === 100 ? (recibido < capacidad ? capacidad - despachado : 0) : (despachado > maximo ? 0 : maximo - despachado);
    const flete = M.redHU(recibido * tarifa), compensacion = conserva ? Number(e.compensacionGuardadaBs || 0) : M.redHU(comp * tarifa);
    return [
      dato('maximo', 'Volumen máximo compensable', maximo, 'L', [activa ? `${porcentaje}% × ${n(capacidad)} / 100${porcentaje === 100 ? '' : ' → entero bancario'} = ${n(maximo)} L.` : 'Sin capacidad positiva o sin porcentaje positivo: no se calcula un nuevo máximo.'], 'ConciliacionOtrosTransportes.ascx.vb:659-725'),
      dato('compL', 'Compensación de capacidad', comp, 'L', [conserva ? `Capacidad 0: el UPDATE de V1 no modifica CompensacionCapacidadLts. Se conserva la fotografía anterior: ${n(comp)} L.` : !activa ? 'Capacidad positiva y porcentaje 0: V1 escribe compensación 0.' : porcentaje === 100 ? `CInt(recibido) ${n(recibido)} < capacidad ${n(capacidad)}: ${recibido < capacidad ? `${n(capacidad)} − CInt(despachado) ${n(despachado)}` : 'no, usar 0'} = ${n(comp)} L.` : `CInt(despachado) ${n(despachado)} > máximo ${n(maximo)}: ${despachado > maximo ? 'sí, usar 0' : `no, ${n(maximo)} − ${n(despachado)}`} = ${n(comp)} L.`, 'Al 100%, V1 puede producir compensación negativa si el despacho supera la capacidad. Se reproduce para estudiar el riesgo, no como regla recomendada.'], 'ConciliacionOtrosTransportes.ascx.vb:659-725'),
      dato('flete', 'Flete por recepción', flete, 'Bs', [`CInt(${n(e.recibido)}) = ${n(recibido)} L; VB redondea mitades al entero par.`, `${n(recibido)} L × ${tarifa} Bs/L → half-up = ${b(flete)} Bs.`, e.tarifaEspecial > 0 ? 'Se usa tarifa especial positiva en lugar de la seleccionada.' : 'Sin tarifa especial positiva: se usa la tarifa seleccionada.'], 'ConciliacionOtrosTransportes.ascx.vb:659-725'),
      dato('compBs', 'Compensación monetaria', compensacion, 'Bs', [conserva ? `El UPDATE tampoco modifica CompensacionCapacidadBs: conserva ${b(compensacion)} Bs, sin revalorizarlo con la tarifa actual.` : `${n(comp)} L × ${tarifa} Bs/L → half-up = ${b(compensacion)} Bs.`], 'ConciliacionOtrosTransportes.ascx.vb:659-725'),
      dato('fleteTotal', 'Flete facturable con compensación', M.redHU(flete + compensacion), 'Bs', [`${b(flete)} + ${b(compensacion)} = ${b(flete + compensacion)} Bs.`, 'A este subtotal falta sumar merma por producto para el neto guardado de barcaza. Los recargos CBARC/MC/DC están en el total visual, no en esa fórmula persistida.'], 'ObtenerTotalesConciliacion; OT:533-566')
    ];
  };
  A.vagon = e => {
    const toneladas = M.redHU(e.kilos / 1000), flete = M.redHU(toneladas * e.tarifa), costo = M.redHU(e.filas * 28.5);
    const incluidos = [flete, costo].filter(x => M.cintBancario(x) !== 0), visual = M.redHU(incluidos.reduce((s, x) => s + x, 0));
    return [
      dato('densidad', 'Peso específico de referencia', 141.5 / (e.api + 131.5) * 0.999016, 'kg/L aprox.', [`141,5 / (API ${e.api} + 131,5) × 0,999016.`, 'La recepción aporta sus kilos consolidados; no reemplazarlos por una estimación de este ejemplo.'], 'ConciliacionOTDetalle.ascx.vb:695-928; PesoEspecífico'),
      dato('toneladas', 'Toneladas recibidas', toneladas, 't', [`${n(e.kilos)} kg / 1.000 = ${e.kilos / 1000} t → half-up a dos decimales = ${b(toneladas)} t.`], 'ConciliacionOTDetalle.ascx.vb:695-922'),
      dato('flete', 'Flete y neto persistido de vagón', flete, 'Bs', [`${b(toneladas)} t × ${e.tarifa} Bs/t → half-up = ${b(flete)} Bs.`, 'No dividir la tarifa por 1.000 otra vez. C/D se puede calcular físicamente pero SQL fuerza el monto de merma a 0.'], 'ObtenerTotalesConciliacion; OT:533-566'),
      dato('formularios', 'Costo de formularios', costo, 'Bs', [`${e.filas} FILAS de detalle × 28,50 = ${b(costo)} Bs.`, 'V1 cuenta filas, no necesariamente vagones distintos. El total visual SUMA este importe positivo; el neto persistido es solo flete. Verificar la intención del negocio antes de decidir signo o unidad de cobro.'], 'ConciliacionOtrosTransportes.ascx.vb:533-566; ObtenerMontosDeConciliacion'),
      dato('visual', 'Total visual de ejemplo sin recargos', visual, 'Bs', [`V1 incluye cada concepto solo si CInt(importe) ≠ 0; después suma su decimal original.`, `${incluidos.map(b).join(' + ') || '0'} = ${b(visual)} Bs.`, 'Ejemplo aislado: no crea vagones ni llama a SAP.'], 'ObtenerMontosDeConciliacion; OT:568-591')
    ];
  };
  A.recargosEjemplo = () => [
    dato('ordinarioV1', 'Recargo ordinario con conversión V1', M.redHU(50 * 2 / 6.96), 'BOB según la rama SQL', ['50 USD × cantidad 2 = 100 USD.', 'Rama ordinaria, destino BOB diferente del origen: SQL hace 100 / TC 6,96 = 14,37 BOB.', 'D33: la rama usa destino, mientras MPF/EHR usan origen. Si TC = BOB por USD, debería multiplicarse: 100 × 6,96 = 696,00 BOB. Confirmar convención del TC antes de corregir.'], 'MC_ObtenerMultaDescuentoAplicado: @Monto'),
    dato('mpf', 'Filtración contractual MPF', M.redHU(4.22 / 1000 * 25000 * 1.15 * 6.96), 'BOB', ['4,22 USD/m³ / 1.000 × cantidad 25.000 L × 1,15 = 121,325 USD.', 'Origen USD y destino BOB: × TC 6,96 = 844,422 → 844,42 BOB.', 'No sumarlo de nuevo si representa el mismo incidente que la multa CRE ID 9. SQL distingue registros, no incidentes.'], 'MC_ObtenerMultaDescuentoAplicado: @MontoFiltracion'),
    dato('ehr', 'Extravío EHR porcentual', M.redHU(1 / 100 * 30000 * 1.3), 'BOB', ['Monto 1% / 100 × cantidad 30.000 L × PPT 1,30 BOB/L = 390,00 BOB.', 'PPT procede del producto y fecha del CRE; % se interpreta como BOB después de valorizar.', 'MPF/EHR usan subconsulta escalar agrupada por moneda/TC. Varios grupos pueden generar error; agregar resultados explícitamente (D37).'], 'MC_ObtenerMultaDescuentoAplicado: @MontoExtravio')
  ];
})(SILOG.auditoria = {});

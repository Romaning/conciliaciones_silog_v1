/* Carro guía/casos especiales del MISMO expediente. VB/SQL histórico y ensayos propuestos separados. */
(function (N) {
  const M = SILOG.motor, num = v => typeof v === 'number' || typeof v === 'string' && v.trim() ? Number(v) : NaN;
  const texto = v => typeof v === 'string' ? v.trim() : '';
  const error = msg => ({ ok: false, msg }), ok = (msg, id) => ({ ok: true, msg, id });
  const tiene = (ctx, p) => ctx?.permisos?.[p] === true;
  const buscar = (m, n) => m.recorridoConciliaciones?.lista.find(c => c.id === Number(n));
  const dinero = v => Number.isFinite(num(v)) && Math.abs(num(v)) <= 1e10 && M.redHU(num(v)) === num(v);
  const fecha = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
  N.PERMISOS = ['Gestionar recargos adicionales (acceso simulado)', 'Preparar cobros CG (simulación de origen)'];
  N.preparar = m => m.recorridoAdicionales ||= { version: 1, siguiente: 1, siguienteCobro: 1, siguienteDetalle: 1,
    empresasGuia: [{ id: 9501, nombre: 'Escoltas del Altiplano SRL · ficticia', placa: '6314-UBK' }],
    catalogoCasos: [{ id: 12, nombre: 'Caso especial genérico · práctica', habilitado: true }, { id: 17, nombre: 'Pérdida de producto por accidente', habilitado: true }],
    cobros: [], detallesEmpresa: [], enlacesCG: [], historial: [] };
  N.casos = c => (c?.recargos || []).filter(r => r.tipo === 'CASO');
  N.carros = c => (c?.recargos || []).filter(r => r.tipo === 'CG');
  N.control = (m, n, ctx, origen = false) => {
    const c = buscar(m, n);
    return !c || c.medio !== 1 ? error('Selecciona una conciliación de cisterna del mismo recorrido. Esta captura CCIST no se extiende a barcaza/vagón.') :
      !tiene(ctx, N.PERMISOS[origen ? 1 : 0]) ? error('Falta el acceso simulado de esta operación; no se alteraron datos.') :
      !origen && c.estado !== 'En Elaboracion' ? error('Modificar importes requiere elaboración en este laboratorio. Es una guardia local; el formulario V1 usa Upd y no vuelve a validar aquí el estado.') : { ok: true, c };
  };
  const registrar = (m, c, ctx, accion, detalle) => {
    N.preparar(m).historial.push({ fecha: m.hoy, usuario: ctx.usuario, conciliacionId: c.id, accion, detalle });
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion, estado: c.estado, detalle });
    SILOG.hojasRutaEstudio.registrarEvento(m, ctx, accion, `Conciliación #${c.id}. ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`);
  };
  N.periodo = c => {
    const mes = String(c.mes).padStart(2, '0'), finMes = new Date(Date.UTC(c.anio, c.mes, 0)).getUTCDate();
    return { inicio: `${c.anio}-${mes}-${c.quincena === 2 ? '16' : '01'}`, fin: `${c.anio}-${mes}-${c.quincena === 2 ? finMes : '15'}` };
  };
  N.repartir = (costo, participaciones) => {
    if (!dinero(costo) || num(costo) <= 0 || !Array.isArray(participaciones) || !participaciones.length || participaciones.some(p => !p || !Number.isInteger(p.empresaId) || !Number.isInteger(p.cantidad) || p.cantidad < 1) || new Set(participaciones.map(p => p.empresaId)).size !== participaciones.length) return error('Revisa costo positivo de dos decimales y cantidades enteras por empresa.');
    const total = participaciones.reduce((n, p) => n + p.cantidad, 0);
    if (!Number.isSafeInteger(total)) return error('Cantidad fuera de la precisión del laboratorio.');
    const filas = participaciones.map(p => ({ ...p, sinRedondear: num(costo) * p.cantidad / total, monto: M.redHU(num(costo) * p.cantidad / total) }));
    return { ok: true, costo: num(costo), total, filas, suma: M.redHU(filas.reduce((n, p) => n + p.monto, 0)), residuo: M.redHU(filas.reduce((n, p) => n + p.monto, 0) - num(costo)) };
  };
  N.detallesOrden = m => m.ordenes.filter(o => o.medioId === 1 && ['APROBADO', 'LIBERADO'].includes(o.estado)).flatMap(o => o.detalles.map(d => ({ ...d, ordenId: o.id, origenId: o.origenId, empresaId: m.unidades.find(u => u.id === d.unidadId)?.empresaId })));
  N.crearCobro = (m, cId, datos, ctx) => {
    const control = N.control(m, cId, ctx, true); if (!control.ok) return control;
    const x = N.preparar(m), c = control.c, ds = datos?.detalleIds, guia = x.empresasGuia.find(e => e.id === Number(datos?.empresaGuiaId));
    if (!guia || !fecha(datos?.fecha) || !Array.isArray(ds) || !ds.length || new Set(ds.map(Number)).size !== ds.length || !dinero(datos?.costo) || num(datos.costo) <= 0 || !dinero(datos?.especial ?? 0) || num(datos.especial ?? 0) < 0) return error('Revisa empresa de carro guía, fecha, tarifa/costo y detalles de orden distintos.');
    const filas = ds.map(n => N.detallesOrden(m).find(d => d.id === Number(n)));
    if (filas.some(d => !d || !d.empresaId || !m.recorridoConciliaciones.areas.find(a => a.id === c.area)?.origenes.includes(d.origenId))) return error('Selecciona detalles de órdenes aprobadas de cisterna y del área del ejercicio. No se inventan IDs de un programa externo.');
    const cantidades = new Map(); filas.forEach(d => cantidades.set(d.empresaId, (cantidades.get(d.empresaId) || 0) + 1));
    const reparto = N.repartir(num(datos.especial ?? 0) > 0 ? num(datos.especial) : num(datos.costo), [...cantidades].map(([empresaId, cantidad]) => ({ empresaId, cantidad })));
    if (!reparto.ok) return reparto;
    const cobro = { id: x.siguienteCobro++, empresaGuiaId: guia.id, fecha: datos.fecha, area: c.area, estado: 'EN ELABORACION', detalleIds: filas.map(d => d.id), costo: num(datos.costo), especial: num(datos.especial ?? 0), reparto, origenSimulado: true, ejercicioId: m.ejercicioId };
    x.cobros.push(cobro); for (const f of reparto.filas) if (f.monto !== 0) x.detallesEmpresa.push({ id: x.siguienteDetalle++, cobroId: cobro.id, empresaId: f.empresaId, monto: f.monto });
    registrar(m, c, ctx, 'Preparar origen CG simulado', cobro);
    return ok('Origen de práctica en elaboración. Activar lo ofrece para seleccionar; todavía no descuenta nada en la conciliación. No reproduce todo el módulo CG de V1.', cobro.id);
  };
  N.estadoCobro = (m, cId, cobroId, accion, ctx) => {
    const v = N.control(m, cId, ctx, true); if (!v.ok) return v;
    const x = N.preparar(m), r = x.cobros.find(r => r.id === Number(cobroId));
    if (!r || !['activar', 'anular'].includes(accion)) return error('Selecciona un cobro existente del ejercicio.');
    if (accion === 'activar' && r.estado !== 'EN ELABORACION') return error('Activa un cobro en elaboración; no se reactiva un anulado en silencio.');
    if (accion === 'anular' && (x.enlacesCG.some(e => x.detallesEmpresa.some(d => d.id === e.detalleCobroId && d.cobroId === r.id)) || r.conciliadoProveedor)) return error('V1 impide anular un cobro vinculado a una conciliación de cisterna o del proveedor de carro guía.');
    r.estado = accion === 'activar' ? 'ACTIVO' : 'ANULADO'; registrar(m, v.c, ctx, 'Cambiar origen CG', { cobroId: r.id, estado: r.estado });
    return ok('Estado del origen actualizado; no se modificaron netos, CRE ni SAP.', r.id);
  };
  N.idsRegistroCG = (m, c, empresaGuiaId) => {
    const x = N.preparar(m), fin = N.periodo(c).fin;
    return x.detallesEmpresa.filter(d => d.empresaId === c.transportistaId && !x.enlacesCG.some(e => e.detalleCobroId === d.id && e.conciliacionId !== c.id) && x.cobros.some(r => r.id === d.cobroId && r.estado === 'ACTIVO' && r.empresaGuiaId === empresaGuiaId && r.area === c.area && r.fecha <= fin));
  };
  N.filasCG = (m, c) => {
    const x = N.preparar(m), guardadas = N.carros(c).map(r => ({ clave: `guardada:${r.id}`, guardada: true, empresaGuiaId: r.empresaGuiaId, monto: r.monto, factura: r.factura || '', observacion: r.observacion || '', registroId: r.id }));
    if (c.medio !== 1 || c.estado !== 'En Elaboracion') return c.medio === 1 ? guardadas : [];
    const pendientes = [];
    for (const e of x.empresasGuia) {
      const ds = N.idsRegistroCG(m, c, e.id).filter(d => !x.enlacesCG.some(v => v.detalleCobroId === d.id));
      if (ds.length) pendientes.push({ clave: `pendiente:${e.id}`, empresaGuiaId: e.id, monto: M.redHU(ds.reduce((n, d) => n + d.monto, 0)), detalleIds: ds.map(d => d.id), guardada: false, factura: '', observacion: '' });
    }
    return [...guardadas, ...pendientes];
  };
  N.guardarCG = (m, cId, seleccion, ctx) => {
    const v = N.control(m, cId, ctx); if (!v.ok) return v;
    const c = v.c, x = N.preparar(m), disponibles = N.filasCG(m, c);
    if (!Array.isArray(seleccion) || seleccion.some(e => !e || typeof e !== 'object') || new Set(seleccion.map(e => e.clave)).size !== seleccion.length) return error('Selecciona filas distintas de carro guía.');
    const filas = [], enlaces = [];
    for (const e of seleccion) {
      const r = disponibles.find(r => r.clave === e.clave), factura = texto(e.factura), observacion = texto(e.observacion);
      if (!r || factura.length > 20 || observacion.length > 800) return error('Fila no disponible, factura de más de 20 caracteres u observación de más de 800.');
      const ds = N.idsRegistroCG(m, c, r.empresaGuiaId), actual = M.redHU(ds.reduce((n, d) => n + d.monto, 0));
      if (!ds.length) return error('El cobro dejó de estar activo/disponible; no se reemplazó nada.');
      if (ctx.modo === 'PROPUESTO' && (filas.some(f => f.empresaGuiaId === r.empresaGuiaId) || actual !== r.monto)) return error('PROPUESTA: la fila guardada y los cobros actuales no coinciden, o se repite la empresa guía. Retira la selección y revisa el grupo pendiente antes de consolidar.');
      const registro = { id: `AD-CG-${x.siguiente + filas.length}`, tipo: 'CG', origenAdicional: true, empresaGuiaId: r.empresaGuiaId, concepto: 'Cobro por carro guía', monto: r.monto, moneda: 'Bs', factura, observacion, adjunto: null, detalleCobroIds: ds.map(d => d.id), totalOrigenAlGuardar: actual };
      filas.push(registro); ds.forEach(d => enlaces.push({ conciliacionId: c.id, detalleCobroId: d.id }));
    }
    const antes = structuredClone(N.carros(c)); x.siguiente += filas.length;
    c.recargos = [...c.recargos.filter(r => r.tipo !== 'CG'), ...filas];
    x.enlacesCG = [...x.enlacesCG.filter(e => e.conciliacionId !== c.id), ...enlaces];
    registrar(m, c, ctx, 'Reemplazar selección carro guía (V1)', { antes, despues: filas });
    return ok('Carro guía registrado por conciliación. Se reemplazan selección/enlaces y se reinician adjuntos como V1; no cambia el neto guardado ni SAP.', c.id);
  };
  N.guardarCasos = (m, cId, entradas, ctx) => {
    const v = N.control(m, cId, ctx); if (!v.ok) return v;
    const c = v.c, x = N.preparar(m), nuevas = [];
    if (!Array.isArray(entradas) || entradas.some(e => !e || typeof e !== 'object' || Array.isArray(e))) return error('Usa una lista válida de casos especiales.');
    for (const d of entradas) {
      const cat = x.catalogoCasos.find(k => k.id === Number(d.multaId)), monto = num(d.monto), volumen = num(d.volumen ?? 0), productoId = Number(d.productoId ?? 0), observacion = texto(d.observacion), factura = texto(d.factura), tcPropuesto = num(d.tcPropuesto ?? 0);
      if (!cat || !dinero(monto) || !Number.isFinite(volumen) || M.cintBancario(volumen) < -2147483648 || M.cintBancario(volumen) > 2147483647 || ![0, ...c.lineas.map(l => l.productoId)].includes(productoId) || !['Bs.', '$us'].includes(d.moneda) || observacion.length > 800 || factura.length > 50 || texto(d.fuenteTC).length > 150) return error('Revisa concepto, monto firmado de dos decimales, volumen int, producto de esta conciliación, moneda, observación, factura y fuente del TC (hasta 150 caracteres).');
      if (monto === 0) continue; // Registrar V1 omite filas con monto cero.
      if (ctx.modo === 'PROPUESTO' && (volumen < 0 || !Number.isInteger(volumen) || !observacion || d.moneda === '$us' && (!dinero(tcPropuesto) || tcPropuesto <= 0 || !texto(d.fuenteTC) || Math.abs(monto * tcPropuesto) * 100 > Number.MAX_SAFE_INTEGER))) return error('PROPUESTA: documenta el motivo, volumen entero no negativo y TC positivo con fuente si es USD, dentro de la precisión monetaria del laboratorio. Es una validación nueva; no se atribuye a V1.');
      nuevas.push({ id: `AD-CASO-${x.siguiente + nuevas.length}`, tipo: 'CASO', origenAdicional: true, multaId: cat.id, casoId: cat.id, concepto: cat.nombre, monto: Math.abs(monto), montoAlmacenado: monto, moneda: d.moneda, tc: 0, volumen: M.cintBancario(volumen), productoId, observacion, factura, adjunto: null, facturaPagada: -monto < 50000,
        conversionPropuesta: d.moneda === '$us' && dinero(tcPropuesto) && tcPropuesto > 0 && texto(d.fuenteTC) ? { tc: tcPropuesto, fuente: texto(d.fuenteTC), fecha: m.hoy, propuesta: true } : null });
    }
    const antes = structuredClone(N.casos(c)); x.siguiente += nuevas.length;
    c.recargos = [...c.recargos.filter(r => r.tipo !== 'CASO'), ...nuevas];
    registrar(m, c, ctx, 'Reemplazar casos especiales (V1)', { antes, despues: nuevas });
    return ok('Casos guardados con signo, TC=0 y FacturaPagada según V1. Volumen no multiplica Monto. Se reinician marcas/adjuntos; neto guardado y SAP no cambian.', c.id);
  };
  N.eliminarCaso = (m, cId, registroId, ctx) => {
    const v = N.control(m, cId, ctx); if (!v.ok) return v;
    const c = v.c, r = N.casos(c).find(r => registroId != null && r.id != null && String(r.id) === String(registroId)); if (!r) return error('El caso no pertenece a esta conciliación.');
    const eliminar = q => q.tipo === 'CASO' && (ctx.modo === 'PROPUESTO' ? q.id === r.id : q.multaId === r.multaId && q.montoAlmacenado === r.montoAlmacenado);
    const antes = structuredClone(c.recargos.filter(eliminar)); c.recargos = c.recargos.filter(q => !eliminar(q));
    registrar(m, c, ctx, 'Eliminar caso especial', { modo: ctx.modo, antes });
    return ok(`Se retiraron ${antes.length} fila(s). V1 identifica por conciliación/concepto/monto; Propuesto usa la identidad local de una fila.`, c.id);
  };
  N.adjunto = (m, cId, registroId, nombre, ctx) => {
    const v = N.control(m, cId, ctx); if (!v.ok) return v;
    const c = v.c, r = c.recargos.find(r => registroId != null && r.id != null && String(r.id) === String(registroId)), n = texto(nombre);
    if (!r || !['CG', 'CASO'].includes(r.tipo) || n.length > 150 || n && !/\.[a-z0-9]{1,10}$/i.test(n)) return error('Selecciona una aplicación CG/caso y un nombre de archivo válido, o déjalo vacío para retirar la referencia.');
    const filas = c.recargos.filter(q => ctx.modo === 'PROPUESTO' ? q.id === r.id : q.tipo === r.tipo && (q.tipo === 'CASO' ? q.multaId === r.multaId : q.empresaGuiaId === r.empresaGuiaId));
    filas.forEach(q => { q.adjunto = n || null; }); registrar(m, c, ctx, 'Referencia de adjunto simulada', { ids: filas.map(r => r.id), nombre: n, modo: ctx.modo });
    return ok(`${filas.length} fila(s) con referencia actualizada. No se subió ningún archivo; V1 actualiza por concepto/empresa, Propuesto por fila.`, c.id);
  };
  N.facturaCG = (m, cId, registroId, factura, observacion, ctx) => {
    const c = buscar(m, cId), r = N.carros(c).find(r => registroId != null && r.id != null && String(r.id) === String(registroId));
    if (!c || c.medio !== 1 || c.estado !== 'Aprobada Por Transportista' || !tiene(ctx, N.PERMISOS[0]) || !r || texto(factura).length > 20 || texto(observacion).length > 800) return error('Modificar factura CG requiere cisterna aprobada por transportista, acceso y referencia de hasta 20 caracteres.');
    const filas = N.carros(c).filter(q => q.empresaGuiaId === r.empresaGuiaId);
    filas.forEach(q => { q.factura = texto(factura); q.observacion = texto(observacion); }); registrar(m, c, ctx, 'Modificar referencia factura CG (V1)', { empresaGuiaId: r.empresaGuiaId, filas: filas.length });
    return ok('Referencia/observación CG modificadas por empresa como V1. No se cambió el importe, el estado ni SAP.', c.id);
  };
  N.resumen = (m, c) => {
    const casos = N.casos(c), cg = N.carros(c), totalCasos = M.redHU(casos.reduce((n, r) => n + (Number.isFinite(r.montoAlmacenado) ? r.montoAlmacenado : 0), 0)), carroGuia = -M.redHU(cg.reduce((n, r) => n + r.monto, 0));
    const faltanImportes = casos.some(r => !Number.isFinite(r.montoAlmacenado));
    const normalizados = casos.map(r => r.moneda === 'Bs.' || r.moneda === 'Bs' || r.moneda === 'BOB' ? r.montoAlmacenado : r.conversionPropuesta?.tc > 0 && Math.abs(r.montoAlmacenado * r.conversionPropuesta.tc) * 100 <= Number.MAX_SAFE_INTEGER ? M.redHU(r.montoAlmacenado * r.conversionPropuesta.tc) : null);
    const avisos = [casos.some(r => !['Bs.', 'Bs', 'BOB'].includes(r.moneda)) ? 'V1 suma Monto de casos sin convertir moneda y Registrar guarda TC=0. Mezclar USD y Bs no produce un total económico comparable.' : '', faltanImportes ? 'Guardado anterior sin Monto persistido: no se reconstruye el caso a partir del monto unitario.' : '', casos.some(r => -r.montoAlmacenado === 50000) ? 'Exactamente 50.000: Registrar deja FacturaPagada=0 (>=), pero FacturasPendienteAPagar exige >50.000 y no devuelve esa fila.' : '', casos.some(r => r.facturaPagada === false && Number(r.multaId) !== 17) ? 'La consulta de cobros pendientes sólo selecciona casos MultaID=17; otros casos pueden quedar con marca 0 sin aparecer.' : '', cg.some(r => r.totalOrigenAlGuardar != null && r.totalOrigenAlGuardar !== r.monto) ? 'Monto CG fotografiado distinto de la suma de IDs vinculados: V1 conserva el importe de la grilla y registra IDs consultados de nuevo.' : '', casos.some(r => r.volumen < 0) ? 'Hay volumen negativo en un caso: V1 lo almacena como int, aunque no lo utiliza para multiplicar Monto.' : ''];
    return { casos, cg, totalCasos: faltanImportes ? null : totalCasos, carroGuia, casosNormalizados: normalizados.some(n => n === null || !Number.isFinite(n)) ? null : M.redHU(normalizados.reduce((n, v) => n + v, 0)), mezclaMonedas: casos.some(r => !['Bs.', 'Bs', 'BOB'].includes(r.moneda)), avisos: [...avisos, casos.some(r => Number(r.multaId) === 17) && c.totales?.merma < 0 ? 'Caso 17 por pérdida y merma monetaria coexisten: compara el hecho, producto y respaldo para no cobrar dos veces la misma pérdida. V1 no los deduplica por incidente.' : ''].filter(Boolean) };
  };
  N.firma = (m, c) => JSON.stringify({ ejercicio: m.ejercicioId, cabecera: [c.id, c.medio, c.transportistaId, c.area, c.anio, c.mes, c.quincena, c.revision], estado: c.estado, recargos: c.recargos, fuente: N.preparar(m) });
})(SILOG.recargosAdicionalesEstudio = {});

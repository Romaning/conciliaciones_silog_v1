/* Continuación del mismo estudioOrdenes. No exporta/copias de CRE al simulador general. */
window.SILOG = window.SILOG || {};
(function (B) {
  const M = SILOG.motor, C = SILOG.contratosEstudio, R = SILOG.creEstudio;
  const id = (xs, n) => xs.find(x => x.id === Number(n));
  const error = msg => ({ ok: false, msg }), ok = (msg, n) => ({ ok: true, msg, id: n });
  const numero = n => (typeof n === 'number' || typeof n === 'string' && n.trim()) && Number.isFinite(Number(n)) ? Number(n) : NaN;
  const fecha = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const tiene = (ctx, p) => ctx?.permisos?.[p] === true;
  const evento = (m, ctx, accion, detalle) => SILOG.hojasRutaEstudio.registrarEvento(m, ctx, accion, detalle);
  B.PASOS = ['Entender la conexión', 'Verificar datos de cálculo', 'Detalle sin conciliar', 'Revisar conciliación generada', 'Recargos e incidentes', 'Ajustar y procesar', 'Conformidad y trazabilidad'];
  B.PERMISOS = ['Acceso al área y tipo (simulado)', ...M.PERMISOS_OT, 'MC Aplicar Multa Descuento', 'MC Puede Solicitar AP', 'MC Puede Solicitar LB', 'MC Puede Liberar', 'MC Puede Rechazar Contrato', ...(SILOG.multasCREEstudio ? [SILOG.multasCREEstudio.PERMISOS[1]] : []), ...(SILOG.recargosAdicionalesEstudio?.PERMISOS || [])];
  B.tipo = medio => ({ 1: 'Cisterna', 2: 'Barcaza', 3: 'Vagon' })[medio];
  B.ascendencia = (m, recepcionId, despachoIds, productoId) => {
    const filas = m.ordenes.flatMap(o => o.detalles.map(d => ({ o, d }))), detalles = [], faltantes = [];
    if (!despachoIds.length) faltantes.push('Sin despachos asociados comprobados para esta recepción.');
    for (const n of despachoIds) {
      const cre = id(m.cres, n);
      if (!cre) { faltantes.push(`CRE despacho #${n} inexistente`); continue; }
      if (!cre.detalleIds?.length) faltantes.push(`Sin detalles declarados en despacho #${n}`);
      for (const detalleId of cre.detalleIds || []) {
        const fila = filas.find(f => f.d.id === detalleId && f.d.productoId === productoId);
        if (!fila || !m.enlaces.some(e => e.detalleId === detalleId && e.creId === n && e.recepcionId === recepcionId)) {
          faltantes.push(`Sin vínculo comprobado despacho #${n} / detalle #${detalleId} / recepción #${recepcionId}`); continue;
        }
        detalles.push(fila);
      }
    }
    const solicitudes = [];
    for (const { d } of detalles) if (d.solicitudId) {
      const s = id(m.solicitudes, d.solicitudId), f = s?.detalles.find(f => f.id === d.solicitudDetalleId && f.productoId === productoId);
      if (f) solicitudes.push({ solicitudId: s.id, lineaId: f.id, hojaId: SILOG.hojasRutaEstudio.hoja(m, s.id)?.id ?? null });
      else faltantes.push(`Línea SHR no comprobada en detalle de orden #${d.id}`);
    }
    const unicos = xs => [...new Set(xs)];
    return { despachoIds: [...despachoIds], ordenIds: unicos(detalles.map(f => f.o.id)), detalleIds: unicos(detalles.map(f => f.d.id)),
      solicitudIds: unicos(solicitudes.map(s => s.solicitudId)), solicitudes: [...new Map(solicitudes.map(s => [`${s.solicitudId}:${s.lineaId}`, s])).values()],
      comprobada: !faltantes.length, faltantes };
  };
  B.precisarProcedencia = (m, l) => {
    const p = l.procedencia || {}, ds = [...new Set(m.recorridoCRE.asociaciones.filter(a => a.recepcionId === l.recepcionId).map(a => a.despachoId))];
    const propia = B.ascendencia(m, l.recepcionId, [l.despachoId], l.productoId), grupo = B.ascendencia(m, l.recepcionId, ds, l.productoId);
    return { ...p, version: 2, ...propia, grupoRecepcion: grupo,
      seleccionTarifa: 'Una tarifa económica por recepción según la rama V1; no se cambia al precisar la ascendencia.' };
  };
  B.preparar = m => {
    R.preparar(m);
    SILOG.multasCREEstudio?.preparar(m);
    SILOG.recargosAdicionalesEstudio?.preparar(m);
    const x = m.recorridoConciliaciones || (m.recorridoConciliaciones = { version: 1, siguiente: 1, numero: 30001, lista: [], precios: [], datosCRE: {},
      areas: [{ id: 1, nombre: 'RCBA · área de práctica', origenes: [703] }, { id: 2, nombre: 'RSCZ · área de práctica', origenes: [701] }],
      multasContractuales: [], recargosCatalogo: [], tiposContratoMultas: [1, 2, 3].map(n => ({ id: n, medio: B.tipo(n), nombre: B.tipo(n) })), proximoIdAplicacionContractual: 1 });
    for (const c of x.lista) for (const l of c.lineas) if (l.procedencia?.version !== 2) {
      l.procedenciaGrupoAnterior = structuredClone(l.procedencia || {});
      l.procedencia = B.precisarProcedencia(m, l);
      const aviso = 'Trazabilidad del guardado anterior adaptada por IDs: se separan despacho y grupo de recepción. No se recalcularon litros, tarifa, netos ni SAP.';
      c.avisos ||= []; if (!c.avisos.includes(aviso)) c.avisos.push(aviso);
    }
    C.sincronizarUsos(m); return x;
  };
  B.contextoCalculo = m => {
    const x = m.recorridoConciliaciones, cat = m.contratos;
    // Proyección efímera para REUTILIZAR el motor. Ningún CRE nuevo se persiste ni renumera aquí.
    return { hoy: m.hoy, sinCatalogoMultasPrecargado: true, transportistas: m.empresas,
      localidades: cat.localidades.map(l => ({ ...l, nacional: 0, area: x.areas.find(a => a.origenes.includes(l.id))?.id })), productos: cat.productos,
      cisternas: m.unidades.map(u => ({ ...u, placa: u.codigo, transportistaId: u.empresaId })),
      contratos: cat.contratos.map(c => { const f = C.fechas(cat, c.id); return { ...c, transportistaId: c.empresaId, vigInicio: f.inicio, vigFin: f.fin, tipoContratoId: c.medioId, estado: cat.historiales.some(h => h.contratoId === c.id && h.estado === 'LIBERADO') ? 'LIBERADO' : 'EN ELABORACION' }; }),
      tarifas: cat.tarifas.map(t => { const h = id(cat.historiales, t.historialId), c = h && id(cat.contratos, h.contratoId), r = id(cat.rutas, t.rutaId); return { ...t, contratoId: c?.id, origenId: r?.origenId, destinoId: r?.destinoId, prioridad: r?.prioridad, estado: t.activa, vigInicio: h?.inicio }; }),
      ordenes: m.ordenes.map(o => ({ ...o, detalles: o.detalles.map(d => ({ ...d, tarifaAsociadaId: d.tarifaId })) })),
      cres: m.cres.map(c => ({ ...c, tipo: c.tipoId, cisternaId: c.unidadId, planViaje: c.planViaje || null, loteCodigo: id(m.lotes, c.loteId)?.codigo, ordenDetalleId: c.detalleIds?.[0] })),
      asociaciones: m.recorridoCRE.asociaciones.filter(a => id(m.cres, a.despachoId)?.estadoId === 1 && id(m.cres, a.recepcionId)?.estadoId === 1),
      precios: x.precios, preciosImportados: [], multasCRE: SILOG.multasCREEstudio?.proyectar(m) || [], conciliaciones: x.lista, multasContractuales: x.multasContractuales, recargosCatalogo: x.recargosCatalogo, tiposContratoMultas: x.tiposContratoMultas,
      proximoIdAplicacionContractual: x.proximoIdAplicacionContractual };
  };
  B.conciliada = (m, rId) => m.recorridoConciliaciones?.lista.find(c => c.lineas.some(l => l.recepcionId === Number(rId)));
  B.firma = (m, recepcionIds) => {
    const ds = new Set(m.recorridoCRE.asociaciones.filter(a => recepcionIds.includes(a.recepcionId)).map(a => a.despachoId));
    const as = m.recorridoCRE.asociaciones.filter(a => ds.has(a.despachoId)), ids = new Set([...ds, ...as.map(a => a.recepcionId)]);
    return JSON.stringify({ documentos: m.cres.filter(c => ids.has(c.id)), asociaciones: as, enlaces: m.enlaces.filter(e => ds.has(e.creId)) });
  };
  B.precio = (m, d, ctx) => {
    const x = m.recorridoConciliaciones;
    if (!tiene(ctx, 'Acceso al área y tipo (simulado)') || !id(m.contratos.productos, d.productoId) || !fecha(d.fecha) || d.fecha > m.hoy || !(numero(d.ppt) >= 0) || !(numero(d.precioMulta) >= 0)) return error('Revisa acceso, producto, fecha no futura y precios positivos o cero, expresados en Bs/L.');
    x.precios = x.precios.filter(p => !(p.productoId === Number(d.productoId) && p.vigInicio === d.fecha)); x.precios.push({ productoId: Number(d.productoId), vigInicio: d.fecha, ppt: Number(d.ppt), precioMulta: Number(d.precioMulta), simulado: true });
    evento(m, ctx, 'Precio de producto de práctica', `Producto #${d.productoId}, desde ${d.fecha}: PPT ${d.ppt} Bs/L, precio multa ${d.precioMulta} Bs/L. No modifica fotos de conciliaciones existentes.`); return ok('Precio de práctica guardado, sin alterar CRE.');
  };
  B.datosTecnicos = (m, creId, d, ctx) => {
    const c = id(m.cres, creId), x = m.recorridoConciliaciones;
    if (!tiene(ctx, 'Acceso al área y tipo (simulado)') || !c || c.estadoId !== 1 || R.medio(c) !== 3 || !(numero(d.kilos) >= 0) || numero(d.kilos) > 2147483647 || !String(d.autorizacion || '').trim() || String(d.autorizacion).trim().length > 10) return error('Vagón: CRE activo, kilos consolidados no negativos y autorización/control de despacho de hasta 10 caracteres. No se convierten litros a kilos.');
    if (x.lista.some(a => a.lineas.some(l => l.despachoId === c.id || l.recepcionId === c.id))) return error('El dato técnico ya está fotografiado en una conciliación. No se modifica retrospectivamente.');
    x.datosCRE[c.id] = { kilos: Number(d.kilos), autorizacion: d.autorizacion.trim(), usuario: ctx.usuario, fecha: m.hoy, simulado: true };
    evento(m, ctx, 'Completar datos de vagón', `CRE #${c.id}: ${d.kilos} kg, control ${d.autorizacion}. Litros originales intactos.`); return ok('Dato técnico de práctica asociado al mismo ID de CRE.');
  };
  B.calcularRecepcion = (m, recepcionId, opciones = {}) => {
    const rec = id(m.cres, recepcionId), x = m.recorridoConciliaciones;
    if (!R.esRecepcion(rec) || rec.estadoId !== 1) return error('Solo una recepción activa puede calcularse.');
    const ds = [...new Map(R.despachosDe(m, rec.id).map(d => [d.id, d])).values()];
    if (!ds.length || ds.some(d => d.estadoId !== 1 || !Number.isFinite(d.volumen))) return error('Falta asociación con un despacho activo y medido.');
    const medio = R.medio(rec), empresaId = id(m.unidades, rec.unidadId)?.empresaId;
    if (ds.some(d => R.medio(d) !== medio || d.origenId !== rec.origenId || d.destinoId !== rec.destinoId || d.productoId !== rec.productoId || id(m.unidades, d.unidadId)?.empresaId !== empresaId || d.fecha > rec.fecha)) return error('Relaciones inconsistentes de empresa, medio, producto, ruta o fecha; no se infiere por placa.');
    const detalles = m.ordenes.flatMap(o => o.detalles).filter(d => ds.some(c => c.detalleIds.includes(d.id)) && d.productoId === rec.productoId);
    if (ds.some(d => d.detalleIds.some(n => !m.enlaces.some(e => e.detalleId === n && e.creId === d.id && e.recepcionId === rec.id)))) return error('Falta un vínculo CREOrdenDespacho despacho/detalle/recepción.');
    const tarifas = [...new Set(detalles.map(d => d.tarifaId).filter(n => id(m.contratos.tarifas, n)?.activa))];
    let t = id(m.contratos.tarifas, tarifas[0]), h = t && id(m.contratos.historiales, t.historialId), c = h && id(m.contratos.contratos, h.contratoId);
    if (!t) { const q = C.consultar(m.contratos, { empresaId, origenId: rec.origenId, destinoId: rec.destinoId, productoId: rec.productoId, fecha: rec.fecha, prioridad: 'PRINCIPAL' }); if (!q.ok && !opciones.nuevoConvoy) return error(q.msg); t = q.elegida?.t; h = q.elegida?.h; c = q.elegida?.c; }
    const vigentes = m.contratos.contratos.filter(cc => { const f = C.fechas(m.contratos, cc.id); return cc.empresaId === empresaId && cc.medioId === medio && f.inicio <= rec.fecha && f.fin >= rec.fecha; });
    if (vigentes.length !== 1 && !opciones.nuevoConvoy) return error('La consulta de contrato/moneda no tiene una coincidencia única en la fecha de recepción.');
    c = c || vigentes[0];
    if (c && !['Bs', 'BOB'].includes(c.moneda)) return error('Cobertura pendiente del prototipo conectado: moneda USD. No es un rechazo de V1 ni se interpretan dólares como Bs.');
    const ctx = B.contextoCalculo(m);
    // Una tarifa asociada por recepción como en V1. La proyección no modifica las órdenes.
    ctx.ordenes.forEach(o => o.detalles.forEach(d => { if (detalles.some(a => a.id === d.id)) d.tarifaAsociadaId = t?.id || null; }));
    // ConciliacionOTDetalle reparte cisterna, pero toma el despacho completo en barcaza/vagón.
    if (opciones.nuevoConvoy && medio !== 1) ctx.asociaciones = ctx.asociaciones.filter(a => !ds.some(d => d.id === a.despachoId) || a.recepcionId === rec.id);
    let calc = M.calcularRecepcion(ctx, id(ctx.cres, rec.id), 'V1');
    const tarifa = t ? (medio === 3 ? t.tarifa : tarifas.length ? t.tarifa / 1000 : M.redHU(M.redHU(t.tarifa, 5) / 1000, 5)) : 0;
    const avisos = [];
    if (opciones.nuevoConvoy && vigentes.length !== 1) avisos.push('Nuevo convoy V1 no repite el control inicial de contrato/moneda. Se conserva la tarifa asociada o cero cuando no se encuentra; no acredita un contrato vigente.');
    if (opciones.nuevoConvoy && medio !== 1 && ds.some(d => R.recepcionesDe(m, d.id).length > 1)) avisos.push('Nuevo convoy de barcaza/vagón usa el despacho completo, no el prorrateo de cisterna. Varias recepciones pueden repetir la base despachada.');
    if (ds.some(d => m.recorridoCRE.asociaciones.filter(a => a.despachoId === d.id && a.recepcionId === rec.id).length > 1)) avisos.push('Hay asociaciones duplicadas del mismo par de CRE. V1 obtiene despachos DISTINCT pero cuenta filas para repartir; el denominador puede distorsionar los litros asignados. No se corrige silenciosamente el cálculo histórico.');
    if (tarifas.length > 1) avisos.push(`V1 usa TOP 1 sin ORDER BY entre tarifas ${tarifas.join(', ')}. El ejercicio muestra la primera encontrada (#${tarifas[0]}); SQL podría devolver otra.`);
    if (R.balance(m, rec.id).abierto) avisos.push('V1 permite listar esta recepción aunque siga abierta la parcial. El prorrateo puede cambiar cuando se active otra recepción; se conserva la foto ya generada.');
    if (!t) avisos.push('Sin tarifa: V1 genera flete cero. No significa transporte gratuito.');
    if (ds.some(d => !x.precios.some(p => p.productoId === rec.productoId && p.vigInicio <= d.fecha))) avisos.push('Falta precio de producto a la fecha de carga: C/D monetario y PPT serán cero en V1.');
    if (medio === 3) {
      if ([...ds, rec].some(d => !x.datosCRE[d.id])) return error('Faltan kilos y control de despacho del vagón. Completa los datos explícitos del CRE antes de conciliar.');
      const aut = x.datosCRE[rec.id].autorizacion;
      if (ds.some(d => x.datosCRE[d.id].autorizacion !== aut)) return error('El control de despacho/autorización del vagón no coincide entre despacho y recepción.');
      calc.lineas.forEach(l => { const ultima = l.ultima; Object.assign(l, { tarifa, tarifaM3: null, unidadTarifa: 'Bs/t', kilosDespacho: x.datosCRE[l.despachoId].kilos, kilosRecepcion: ultima ? x.datosCRE[rec.id].kilos : 0, toneladas: ultima ? M.redHU(x.datosCRE[rec.id].kilos / 1000) : 0, cdBs: 0 }); l.totalFlete = ultima ? M.redHU(l.toneladas * tarifa) : 0; l.totalFacturar = l.totalFlete; l.traza = [`Vagón: ${l.kilosRecepcion} kg / 1000 → ${l.toneladas} t redondeadas; × ${tarifa} Bs/t = ${l.totalFlete} Bs.`, 'La merma monetaria de vagón se fuerza a cero en ObtenerTotalesConciliacion. Litros, kilos y toneladas son magnitudes distintas.']; });
    }
    calc.lineas.forEach(l => {
      l.procedencia = { tarifaId: t?.id || null, historialId: h?.id || null, contratoId: c?.id || null, empresaId,
        asociada: !!tarifas.length, importeOriginal: t?.tarifa || 0, unidadOriginal: medio === 3 ? 'Bs/t' : 'Bs/m³', monedaOriginal: c?.moneda || null };
      l.procedencia = B.precisarProcedencia(m, l);
    });
    return { ok: true, rec, medio, empresaId, contratoId: c?.id || null, contratoUnico: vigentes.length === 1, moneda: 'Bs', lineas: calc.lineas, avisos, autorizacion: x.datosCRE[rec.id]?.autorizacion || '' };
  };
  B.pendientes = m => {
    const grupos = new Map(), excluidas = [];
    m.cres.filter(R.esRecepcion).forEach(rec => {
      let motivo = rec.estadoId !== 1 ? 'Previo o inactivo: falta activar recepción.' : B.conciliada(m, rec.id) ? `Ya incluida en conciliación #${B.conciliada(m, rec.id).id} (NOT IN RecepcionCREID).` : rec.fecha > m.hoy ? 'Recepción futura respecto al día simulado.' : '';
      const area = m.recorridoConciliaciones.areas.find(a => a.origenes.includes(rec.origenId));
      if (!motivo && !area) motivo = 'Origen sin área de conciliación en el catálogo de práctica.';
      const r = !motivo && B.calcularRecepcion(m, rec.id);
      if (!motivo && !r.ok) motivo = r.msg;
      if (motivo) { excluidas.push({ rec, motivo }); return; }
      const mes = rec.fecha.slice(0, 7), q = r.medio === 1 ? M.quincena(rec.fecha) : 0;
      const clave = `${r.medio}|${r.empresaId}|${area.id}|${mes}|${q}|${r.medio === 1 ? '' : rec.destinoId}|${r.medio === 3 ? rec.productoId + '|' + r.autorizacion : ''}`;
      if (!grupos.has(clave)) grupos.set(clave, { clave, medio: r.medio, empresaId: r.empresaId, areaId: area.id, mes, quincena: q, moneda: r.moneda, recepciones: [] });
      grupos.get(clave).recepciones.push(r);
    });
    const visibles = [...grupos.values()].filter(g => { if (g.recepciones.some(r => r.rec.fecha >= M.sumarDias(m.hoy, -90))) return true; g.recepciones.forEach(r => excluidas.push({ rec: r.rec, motivo: 'Grupo fuera de los últimos 90 días de la consulta Transportistas V1.' })); return false; });
    return { grupos: visibles, excluidas };
  };
  B.evaluar = (m, c) => {
    const ctx = B.contextoCalculo(m), d = M.recalcular(ctx, c, 'V1'), tipoRecargo = { 1: 'CCIST', 2: 'CBARC', 3: 'CVAG' }[c.medio];
    const suma = t => SILOG.multasContractuales.sumar(ctx, c, t, 'V1');
    const filas = d.grupos.map(g => {
      const ls = c.lineas.filter(l => l.recepcionId === g.recepcionId), u = ls.at(-1), aj = c.ajustes[u.key] || {};
      let flete = g.tot.flete, compensacion = 0, compensacionL = 0, toneladas = null;
      if (c.medio === 2) { const fichas = SILOG.auditoria.barcaza({ despachado: g.tot.despachos, recibido: g.tot.recepciones, tarifa: aj.tarifaSeleccionada ?? u.tarifa, tarifaEspecial: aj.tarifaEspecial || 0, capacidad: aj.liberarCapacidad || 0, porcentaje: aj.porcentaje || 0, compensacionGuardadaL: aj.compensacionGuardadaL || 0, compensacionGuardadaBs: aj.compensacionGuardadaBs || 0 }); flete = fichas.find(f => f.clave === 'fleteTotal').valor; compensacion = fichas.find(f => f.clave === 'compBs').valor; compensacionL = fichas.find(f => f.clave === 'compL').valor; }
      if (c.medio === 3) { toneladas = u.toneladas; flete = M.redHU(toneladas * u.tarifa); }
      return { recepcionId: g.recepcionId, productoId: g.productoId, lineas: g.lineas, despachado: g.tot.despachos, recibido: g.tot.recepciones, flete, compensacion, compensacionL, toneladas,
        cdBs: c.medio === 3 || g.lineas.some(l => l.liberarMerma) ? 0 : g.lineas.reduce((s, l) => s + l.cdBs, 0) };
    });
    const productos = {};
    filas.forEach(f => { productos[f.productoId] = (productos[f.productoId] || 0) + f.cdBs; });
    const flete = M.redHU(filas.reduce((n, f) => n + f.flete, 0)), merma = M.redHU(Object.values(productos).reduce((n, v) => n + Math.min(0, v), 0));
    const multasCRE = SILOG.multasCREEstudio?.resumen(m, c) || { subtotal: 0, registros: [], avisos: [], duplicados: [] };
    const contractual = suma(tipoRecargo);
    const recargos = { transporte: -M.redHU(contractual + (c.medio === 1 ? multasCRE.subtotal : 0)), multaConciliacion: -suma('MC'), descuento: -suma('DC') };
    const formularios = c.medio === 3 ? M.redHU(c.lineas.length * 28.5) : 0;
    const neto = M.redHU(flete + merma + (c.medio === 1 ? recargos.transporte : 0));
    const adicionales = c.medio === 1 && SILOG.recargosAdicionalesEstudio ? SILOG.recargosAdicionalesEstudio.resumen(m, c) : { carroGuia: 0, totalCasos: 0, casosNormalizados: 0, avisos: [], mezclaMonedas: false };
    const conceptos = [['Flete facturable', flete], ['Multa merma', merma], ['Multa transporte', recargos.transporte], ['Multa conciliación', recargos.multaConciliacion], ['Descuento conciliación', recargos.descuento], ...(c.medio === 1 ? [['Carro Guía', adicionales.carroGuia], ['Casos Especiales', adicionales.totalCasos]] : []), ['Formularios vagón', formularios]];
    const netoVisual = adicionales.totalCasos === null ? null : M.redHU(conceptos.filter(f => M.cintBancario(f[1]) !== 0).reduce((n, f) => n + f[1], 0));
    const netoPropuesto = adicionales.casosNormalizados === null ? null : M.redHU(neto + recargos.multaConciliacion + recargos.descuento + adicionales.carroGuia + adicionales.casosNormalizados + formularios);
    return { ok: true, filas, flete, merma, recargos, multasCRE, adicionales, netoPropuesto, multasContractualesTransporte: contractual, formularios, neto, netoVisual, conceptos, avisos: [...new Set([...c.avisos, ...multasCRE.avisos, ...adicionales.avisos, ...(c.firma && c.firma !== B.firma(m, [...new Set(c.lineas.map(l => l.recepcionId))]) ? ['Los documentos/asociaciones fuente cambiaron después de generar. V1 procesa el detalle fotografiado; no se sustituyen sus litros con los del CRE actual.'] : []), ...(neto !== netoVisual ? ['El total visual OT difiere del neto persistido V1 por sus conceptos y filtros. No se mezclan ambos importes.'] : []), ...(c.medio !== 1 && c.recargos.length ? ['D16: la función histórica no inicializa moneda en todas las ramas de otros medios. Se muestra la rama didáctica de recargos, no una certificación del resultado real de SQL.'] : [])])] };
  };
  B.generar = (m, clave, ids, aceptarCeros, ctx) => {
    if (!tiene(ctx, 'Acceso al área y tipo (simulado)')) return error('Falta acceso simulado al área/tipo (CONFIGURACION_CONCILIACIONES).');
    const g = B.pendientes(m).grupos.find(g => g.clave === clave), x = m.recorridoConciliaciones;
    if (!g || !Array.isArray(ids) || !ids.length || new Set(ids.map(Number)).size !== ids.length) return error('Actualiza los pendientes y selecciona recepciones distintas de un mismo grupo.');
    const rs = ids.map(n => g.recepciones.find(r => r.rec.id === Number(n)));
    if (rs.some(r => !r)) return error('Alguna recepción ya no pertenece al grupo disponible.');
    if (!Number.isInteger(x.numero) || x.numero < 1 || x.numero >= 2147483647) return error('El contador de conciliaciones no puede incrementarse dentro de int.');
    const lineas = rs.flatMap(r => r.lineas).map((l, i) => ({ ...structuredClone(l), id: i + 1 }));
    const contratoIds = [...new Set(lineas.map(l => l.procedencia.contratoId))];
    if (contratoIds.some(n => id(m.contratos.contratos, n)?.marcoId)) return error('Cobertura pendiente: presupuesto y ejecución del contrato marco. V1 sí permite generar cuando cumple ese control; no se simula como un rechazo permanente.');
    const c = { id: x.siguiente, numero: x.numero, tipo: B.tipo(g.medio), medio: g.medio, transportistaId: g.empresaId, area: g.areaId, mes: Number(g.mes.slice(5)), anio: Number(g.mes.slice(0, 4)), quincena: g.quincena, contratoId: contratoIds.length === 1 ? contratoIds[0] : null, moneda: 'Bs', fecha: m.hoy, estado: 'En Elaboracion', lineas, ajustes: {}, recargos: [], avisos: [...new Set(rs.flatMap(r => r.avisos))], historial: [], revision: 1, procesada: false };
    const evaluacion = B.evaluar(m, c); if (!Number.isFinite(evaluacion.neto)) return error('El cálculo no produjo importes finitos.');
    // DetalleSinConciliar guarda inicialmente flete + merma. OT consulta multas actuales y
    // Procesar las consolida después; no atribuir el neto calculado actual a esa foto inicial.
    c.totales = { flete: evaluacion.flete, merma: evaluacion.merma, neto: M.redHU(evaluacion.flete + evaluacion.merma), ...(c.medio === 1 ? { multaTransporte: 0 } : {}) }; c.firma = B.firma(m, ids.map(Number));
    SILOG.sapEstudio?.fotografiarCalculo(c, evaluacion);
    x.siguiente++; x.numero++; x.lista.push(c); C.sincronizarUsos(m);
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: 'Generada desde Detalle sin conciliar', estado: c.estado });
    evento(m, ctx, 'Generar conciliación conectada', `${c.tipo} #${c.id}, número ${c.numero}, En Elaboracion. CRE de recepción ${ids.join(', ')}; conserva los CRE originales y fotografía ${lineas.length} pares despacho/recepción.`);
    return ok('Conciliación generada en elaboración. Puedes revisar recargos y ajustes, procesar el cálculo o continuar a conformidad según V1.', c.id);
  };
  B.procesar = (m, cId, cambios, ctx) => {
    const c = id(m.recorridoConciliaciones.lista, cId);
    if (!c || c.estado !== 'En Elaboracion' || !tiene(ctx, 'PuedeProcesar')) return error('Procesar requiere conciliación en elaboración y PuedeProcesar.');
    if (ctx.modo === 'PROPUESTO' && SILOG.multasCREEstudio?.duplicados(m, c).length) return error('PROPUESTA: hay una referencia de incidente repetida entre aplicaciones. Aclara la fuente correcta antes de procesar; V1 las sumaría.');
    const copia = structuredClone(c), vistos = new Set();
    for (const d of cambios || []) {
      const ls = copia.lineas.filter(l => l.recepcionId === Number(d.recepcionId)), u = ls.at(-1), actual = u && (copia.ajustes[u.key] || {});
      if (!u || vistos.has(u.recepcionId)) return error('Ajuste repetido o recepción ajena.'); vistos.add(u.recepcionId);
      const merma = d.liberarMerma === true, capacidad = numero(d.capacidad ?? 0), especial = numero(d.especial ?? 0), porcentaje = numero(d.porcentaje ?? 0), observacion = String(d.observacion || '').trim();
      if (!Number.isInteger(capacidad) || capacidad < 0 || capacidad > 2147483647 || !(especial >= 0) || !(porcentaje >= 0 && porcentaje <= 100) || observacion.length > 500) return error('Revisa capacidad entera no negativa, tarifa especial, porcentaje 0–100 y observación de hasta 500 caracteres.');
      for (const [cambio, permiso] of [[merma !== !!actual.liberarMerma, 'PuedeLiberarMerma'], [capacidad !== (actual.liberarCapacidad || 0) || porcentaje !== (actual.porcentaje || 0), 'PuedeLiberarCapacidad'], [especial !== (actual.tarifaEspecial || 0), 'PuedeColocarTarifaEspecial']]) if (cambio && !tiene(ctx, permiso)) return error(`Falta ${permiso} para ese ajuste.`);
      if (c.medio === 3 && (merma || capacidad || especial || porcentaje)) return error('La rama de procesamiento V1 de vagón no aplica estos controles de cisterna/barcaza.');
      ls.forEach(l => { copia.ajustes[l.key] = { ...(copia.ajustes[l.key] || {}), liberarMerma: merma, observacion }; });
      copia.ajustes[u.key] = { ...copia.ajustes[u.key], liberarCapacidad: capacidad, tarifaEspecial: especial, porcentaje, compensacionGuardadaL: actual.compensacionGuardadaL || 0, compensacionGuardadaBs: actual.compensacionGuardadaBs || 0 };
    }
    let r; try { r = B.evaluar(m, copia); } catch (e) { return error(e.message); }
    if (!Number.isFinite(r.neto)) return error('No se puede guardar un importe no finito.');
    if (copia.medio === 2) r.filas.forEach(f => { const u = copia.lineas.filter(l => l.recepcionId === f.recepcionId).at(-1), a = copia.ajustes[u.key]; if (a?.liberarCapacidad > 0) { a.compensacionGuardadaL = f.compensacionL; a.compensacionGuardadaBs = f.compensacion; } });
    copia.procesada = true; copia.revision++; copia.totales = { flete: r.flete, merma: r.merma, neto: r.neto, netoVisual: r.netoVisual, ...(copia.medio === 1 ? { multaTransporte: r.recargos.transporte || 0 } : {}) }; copia.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: 'Procesar y guardar cálculo', estado: copia.estado });
    copia.multasCREFotografia = { fecha: m.hoy, usuario: ctx.usuario, subtotal: r.multasCRE.subtotal, registros: structuredClone(r.multasCRE.registros) };
    SILOG.sapEstudio?.fotografiarCalculo(copia, r);
    Object.assign(c, copia); evento(m, ctx, 'Procesar conciliación conectada', `Conciliación #${c.id}: neto guardado ${r.neto} Bs, visual ${r.netoVisual} Bs. CRE originales intactos.`); return ok('Cálculos y ajustes guardados. No se alteraron litros de despacho o recepción.', c.id);
  };
  B.cambiar = (m, cId, accion, ctx) => {
    const c = id(m.recorridoConciliaciones.lista, cId);
    if (!c) return error('Selecciona una conciliación generada.');
    if (c.sapEstudio?.incidencia) return error('Guardia local propuesta: aclara primero el resultado SAP remoto sin confirmar antes de cambiar el estado económico. V1 no implementa esta recuperación.');
    const reglas = { enviar: ['En Elaboracion', 'En Aprobacion de Transportista', 'PuedeSolicitarAprobacion'], aceptar: ['En Aprobacion de Transportista', 'Aprobada Por Transportista', 'PuedeSolicitarAprobacion'] };
    if (accion === 'rechazar') {
      if (!tiene(ctx, 'PuedeRechazarConciliacion') || !['En Aprobacion de Transportista', 'Aprobada Por Transportista'].includes(c.estado)) return error('El rechazo requiere permiso y conformidad pendiente/registrada.');
      c.estado = 'En Elaboracion'; c.procesada = false;
    } else {
      const r = reglas[accion]; if (!r || c.estado !== r[0] || !tiene(ctx, r[2])) return error('Respeta el estado y permiso de la acción según InicializarPermisos de V1.');
      c.estado = r[1]; if (accion === 'aceptar') c.siguientePaso = { nombre: 'Preparar sincronización SAP, cuentas/facturas y aprobación interna', pendiente: true, simulado: true };
    }
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion, estado: c.estado }); evento(m, ctx, 'Decisión conciliación', `#${c.id} → ${c.estado}. La orden, solicitud y HR no cambian de estado.`);
    if (accion === 'aceptar' && SILOG.sapEstudio) {
      const sap = SILOG.sapEstudio.prepararExpediente(m, c.id, ctx);
      if (!sap.ok) c.avisos.push('Preparación SAP incompleta: ' + sap.msg);
    }
    return ok(`Conciliación ${c.estado}.`, c.id);
  };
  B.excluir = (m, cId, recepcionId, ctx) => {
    const x = m.recorridoConciliaciones, c = id(x.lista, cId), ls = c?.lineas.filter(l => l.recepcionId === Number(recepcionId));
    if (!c || c.estado !== 'En Elaboracion' || !tiene(ctx, 'PuedeProcesar') || !ls.length) return error('Excluir requiere la recepción de una conciliación en elaboración y acceso de procesamiento.');
    const cres = new Set([Number(recepcionId), ...ls.map(l => l.despachoId)]);
    const copia = structuredClone(c); copia.lineas = copia.lineas.filter(l => l.recepcionId !== Number(recepcionId)); copia.recargos = copia.recargos.filter(r => !cres.has(r.creId));
    let r; try { r = B.evaluar(m, copia); } catch (e) { return error(e.message); }
    c.lineas = copia.lineas;
    C.sincronizarUsos(m);
    // btnEliminar V1 borra aplicaciones por CREID, sin limitar ConciliacionID: hacerlo visible.
    x.lista.forEach(cc => { cc.recargos = cc.recargos.filter(r => !cres.has(r.creId)); });
    c.totales = { flete: r.flete, merma: r.merma, neto: r.neto, ...(c.medio === 1 ? { multaTransporte: r.recargos.transporte || 0 } : {}) }; c.firma = B.firma(m, [...new Set(c.lineas.map(l => l.recepcionId))]);
    SILOG.sapEstudio?.fotografiarCalculo(c, r);
    c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: `Excluir recepción #${recepcionId} y sus aplicaciones de recargo por CREID (comportamiento V1)`, estado: c.estado });
    evento(m, ctx, 'Excluir CRE de conciliación', `Recepción #${recepcionId} fuera del detalle de #${c.id}; vuelve a pendientes si reúne los filtros. CRE originales no borrados.`); return ok('CRE excluido del detalle. La cabecera se conserva y sus totales se reprocesan como en V1.', c.id);
  };
  B.multas = (m, metodo, args, ctx) => {
    const x = m.recorridoConciliaciones, copia = structuredClone(B.contextoCalculo(m));
    const permitidos = ['guardarCabecera', 'guardarDetalle', 'asociarEmpresas', 'cambiarEstado', 'aplicarCRE'];
    if (!permitidos.includes(metodo)) return error('Operación de recargo no admitida.');
    if (metodo === 'aplicarCRE' && SILOG.multasCREEstudio) {
      const v = SILOG.multasCREEstudio.validarMC(m, id(x.lista, args[0]), args[1], args[2], ctx); if (!v.ok) return v;
      if (args[2].some(e => e.referencia) && !ctx.permisos?.[SILOG.multasCREEstudio.PERMISOS[1]]) return error('Falta el permiso local para identificar incidentes (propuesta); no se cambió la aplicación MC.');
    }
    let r; try { r = SILOG.multasContractuales[metodo](copia, ...args, { ...ctx, modo: 'V1' }); } catch (e) { return error(e.message); }
    if (!r.ok) return r;
    for (const nombre of ['multasContractuales', 'recargosCatalogo', 'tiposContratoMultas', 'proximoIdAplicacionContractual']) x[nombre] = copia[nombre];
    if (metodo === 'aplicarCRE') { const c = id(x.lista, args[0]), mod = id(copia.conciliaciones, c.id); c.recargos = mod.recargos; c.historial = mod.historial; c.procesada = false;
      if (SILOG.multasCREEstudio) for (const r of c.recargos.filter(r => r.creId === Number(args[1]))) { const entrada = args[2].find(e => Number(e.id) === r.catalogoId); if (entrada?.referencia) SILOG.multasCREEstudio.etiquetar(m, 'MC', r.id, entrada.referencia, ctx); }
    }
    evento(m, ctx, 'Recargo del recorrido conectado', `${metodo}: ${r.msg}`); return r;
  };
})(SILOG.conciliacionesEstudio = {});

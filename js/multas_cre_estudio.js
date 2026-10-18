/* MultaPorIncumplimiento sobre los CRE del expediente. V1 y propuestas nunca comparten importes guardados. */
(function (L) {
  const M = SILOG.motor, R = SILOG.creEstudio;
  const error = msg => ({ ok: false, msg }), id = (xs, n) => xs.find(x => x.id === Number(n));
  const num = n => typeof n === 'number' || typeof n === 'string' && n.trim() !== '' ? Number(n) : NaN;
  const banco = n => M.cintBancario(n * 100) / 100;
  const ref = v => typeof v === 'string' ? v.trim().toUpperCase() : '';
  L.PERMISOS = ['Registrar multas CRE (acceso simulado)', 'Identificar incidentes (propuesta)'];
  L.TC_PANTALLA_V1 = 7.07; // Literal observado, NO cotización actual.
  L.preparar = m => m.recorridoMultasCRE ||= { version: 1, siguiente: 1, catalogo: SILOG.nuevoCatalogoMultasCRE(), registros: [], referencias: {}, historial: [] };
  L.usos = (m, creId) => (m.recorridoConciliaciones?.lista || []).filter(c => c.lineas.some(l => l.despachoId === Number(creId)));
  L.control = (m, creId) => {
    const cre = id(m.cres, creId), usos = L.usos(m, creId);
    return { cre, usos, editable: !!cre && cre.tipoId === 3 && cre.estadoId === 1 && usos.every(c => c.estado === 'En Elaboracion'),
      motivo: !cre || cre.tipoId !== 3 || cre.estadoId !== 1 ? 'Selecciona un despacho activo de cisterna del mismo recorrido. La fuente V1 revisada no cubre barcaza/vagón ni recepción.' : usos.some(c => c.estado !== 'En Elaboracion') ? 'Hay una conciliación de este despacho fuera de elaboración: devuelve por su flujo válido antes de modificar. Con varias parciales, esta protección revisa todas; V1 consulta el estado sin ordenar.' : 'Sin conciliar o en elaboración: se puede reemplazar el registro de multas de este despacho.' };
  };
  L.calcular = (m, creId, entrada) => {
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return error('Selecciona un concepto y sus datos de cálculo.');
    const x = L.preparar(m), d = id(x.catalogo, entrada.multaId), cre = id(m.cres, creId), tc = num(entrada.tc);
    if (!d || !cre || cre.tipoId !== 3 || cre.estadoId !== 1 || !Number.isFinite(tc) || tc <= 0 || tc > 999.99 || M.redHU(tc) !== tc) return error('Revisa despacho cisterna activo, concepto y TC positivo de hasta 2 decimales (decimal(5,2) V1).');
    const cantidad = d.base === 'cantidad' ? num(entrada.cantidad) : 1;
    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 32767) return error('Cantidad de práctica entera no negativa, máximo smallint 32767. V1 acepta textos numéricos más laxos: esta validación evita errores de persistencia, no cambia silenciosamente un signo.');
    const entrega = (m.recorridoCRE?.asociaciones || []).some(a => a.despachoId === cre.id) ? cre.volumen : 0;
    const parametro = d.base === 'filtracion' ? num(entrada.mpf ?? d.valor) : d.valor;
    if (!Number.isFinite(parametro) || parametro < 0) return error('El parámetro MPF de práctica debe ser numérico no negativo.');
    const factor = d.moneda === 'Sus' ? tc : 1, pasos = [], avisos = [];
    let pantalla, totalGuardado, cantidadV1 = d.base === 'cantidad' ? cantidad : -1;
    if (d.base === 'filtracion') {
      pantalla = banco(parametro * tc * 1.15 / 1000 * entrega);
      totalGuardado = M.redHU(pantalla * factor, 4);
      pasos.push(`Calcular V1: (${parametro} × TC ${tc} × 1,15 / 1000) × ${entrega} L = ${pantalla} Bs (Decimal.Round al par).`, `Registrar V1: ${pantalla}${d.moneda === 'Sus' ? ' × TC ' + tc : ''} = TotalMultas ${totalGuardado}.`);
      avisos.push('Filtración V1 usa TC en Calcular y vuelve a multiplicar si Moneda=Sus al registrar; SQL vuelve a usar TC. No se corrige ni se certifica esta conversión como una regla correcta.');
      if (!entrega) avisos.push('Sin asociación de recepción, DevolverSumaEntregaDespacho deja Entregado=0. La filtración queda cero; no demuestra ausencia del incidente.');
      pasos.push('Entregado es el volumen del despacho cuando existe una asociación; no los litros recibidos ni la suma de todas las recepciones. La selección de recepción V1 no tiene ORDER BY.');
    } else {
      const base = d.valor * cantidad * factor; pantalla = base; totalGuardado = M.redHU(base, 4);
      pasos.push(`${d.valor} ${d.moneda} × ${cantidad}${d.moneda === 'Sus' ? ' × TC ' + tc : ''} = ${base} Bs.`, `Registrar guarda Cantidad=${cantidadV1}${cantidadV1 === -1 ? ' (CInt(True) de VB; SQL toma su valor absoluto)' : ''}; TotalMultas=${totalGuardado}.`);
    }
    const aporteSinRedondear = d.base === 'filtracion' ? totalGuardado * factor : Math.abs(cantidadV1) * d.valor * factor;
    const propuesto = M.redHU((d.base === 'filtracion' ? parametro / 1000 * 1.15 * entrega : d.valor * cantidad) * factor);
    if ([pantalla, totalGuardado, aporteSinRedondear, propuesto].some(n => !Number.isFinite(n) || Math.abs(n) * 10000 > Number.MAX_SAFE_INTEGER)) return error('El importe supera la precisión monetaria de este laboratorio JavaScript. No se simula como un resultado SQL comprobado.');
    pasos.push(`SQL MC_ObtenerMultaDescuentoAplicado: ${d.base === 'filtracion' ? `TotalMultas ${totalGuardado}${d.moneda === 'Sus' ? ' × TC ' + tc : ''}` : `ABS(${cantidadV1}) × ${d.valor}${d.moneda === 'Sus' ? ' × TC ' + tc : ''}`} = ${aporteSinRedondear} Bs antes del redondeo agregado.`, 'Ese aporte integra Multa Transporte; no se resta además como un segundo subtotal.');
    return { ok: true, multaId: d.id, creId: cre.id, concepto: d.nombre, sigla: d.sigla, base: d.base, valor: d.valor, moneda: d.moneda, tc,
      cantidad: cantidadV1, cantidadIngresada: cantidad, parametroFiltracion: parametro, volumenEntrega: entrega,
      pantalla, totalGuardado, aporteSinRedondear, aporteSQL: M.redHU(aporteSinRedondear), propuesto,
      pasos, avisos, referenciaPropuesta: ref(entrada.referencia) };
  };
  L.refDe = (m, origen, registroId) => L.preparar(m).referencias[`${origen}:${registroId}`]?.referencia || '';
  L.aplicaciones = (m, c) => {
    if (!c || c.medio !== 1) return [];
    const ds = new Set(c.lineas.map(l => l.despachoId));
    const propias = L.preparar(m).registros.filter(r => ds.has(r.creId)).map(r => ({ ...r, origen: 'CRE', referencia: L.refDe(m, 'CRE', r.id) }));
    const mc = c.recargos.filter(r => r.tipo === 'CCIST').map(r => ({ ...r, origen: 'MC', referencia: L.refDe(m, 'MC', r.id) }));
    return [...propias, ...mc];
  };
  L.duplicados = (m, c) => {
    const grupos = new Map();
    for (const r of L.aplicaciones(m, c)) if (r.referencia) { const k = `${r.creId}:${r.referencia}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r); }
    return [...grupos.values()].filter(g => g.length > 1);
  };
  L.validarMC = (m, c, creId, entradas, ctx) => {
    if (!Array.isArray(entradas) || entradas.some(e => !e || typeof e !== 'object' || Array.isArray(e))) return error('Las aplicaciones deben ser una lista válida de conceptos.');
    if (ctx?.modo !== 'PROPUESTO') return { ok: true };
    const propios = L.aplicaciones(m, c).filter(r => r.origen === 'CRE' && r.creId === Number(creId));
    const vistos = new Set();
    for (const e of entradas) { const referencia = ref(e.referencia);
      if (!referencia || referencia.length > 80) return error('PROPUESTA: ingresa una referencia del incidente de hasta 80 caracteres; no es un campo V1.');
      if (vistos.has(referencia) || propios.some(r => r.referencia === referencia)) return error('PROPUESTA: el mismo incidente ya está identificado en ese CRE. Revisa cuál fuente corresponde; no se cobra ni se elimina una en silencio.');
      vistos.add(referencia);
    } return { ok: true };
  };
  L.etiquetar = (m, origen, registroId, referencia, ctx) => {
    if (!ctx?.permisos?.[L.PERMISOS[1]]) return error('Falta permiso local para identificar incidentes (propuesta).');
    const x = L.preparar(m), r = origen === 'CRE' ? id(x.registros, registroId) : origen === 'MC' ? (m.recorridoConciliaciones?.lista || []).flatMap(c => c.recargos).find(r => r.id === Number(registroId)) : null;
    const t = ref(referencia); if (!r || !t || t.length > 80) return error('Selecciona una aplicación existente del recorrido y una referencia de hasta 80 caracteres.');
    x.referencias[`${origen}:${r.id}`] = { referencia: t, propuesta: true, usuario: ctx.usuario, fecha: m.hoy };
    x.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: 'Identificar incidente (PROPUESTA)', origen, registroId: r.id, referencia: t });
    return { ok: true, msg: 'Referencia de estudio guardada aparte; no existe en V1, no elimina ni cambia importes históricos.' };
  };
  L.guardar = (m, creId, entradas, ctx) => {
    const x = L.preparar(m), control = L.control(m, creId);
    if (!ctx?.permisos?.[L.PERMISOS[0]] || !control.editable) return error(!control.editable ? control.motivo : 'Falta acceso local simulado para registrar multas por CRE.');
    if (!Array.isArray(entradas) || entradas.some(e => !e || typeof e !== 'object' || Array.isArray(e)) || new Set(entradas.map(e => Number(e.multaId))).size !== entradas.length) return error('Usa una lista de conceptos válidos, sin repetir uno en la selección del mismo CRE.');
    const nuevas = [], refs = new Set();
    for (const e of entradas) {
      const r = L.calcular(m, creId, e); if (!r.ok) return r;
      if (r.referenciaPropuesta.length > 80) return error('La referencia propuesta no admite más de 80 caracteres.');
      if (r.referenciaPropuesta && !ctx.permisos?.[L.PERMISOS[1]]) return error('Falta permiso para guardar la identificación propuesta del incidente. No se modificaron las multas.');
      if (ctx.modo === 'PROPUESTO') {
        if (!r.referenciaPropuesta) return error('PROPUESTA: identifica el incidente antes de registrar, sin atribuir ese campo a V1.');
        if (refs.has(r.referenciaPropuesta) || control.usos.some(c => L.aplicaciones(m, c).some(a => a.origen === 'MC' && a.creId === Number(creId) && a.referencia === r.referenciaPropuesta))) return error('PROPUESTA: hay otra aplicación del mismo incidente en este CRE. No se duplicó el cargo.');
        refs.add(r.referenciaPropuesta);
      }
      nuevas.push(r);
    }
    const antes = x.registros.filter(r => r.creId === Number(creId));
    const actuales = nuevas.map(r => ({ ...r, id: x.siguiente++, fecha: m.hoy, usuario: ctx.usuario }));
    x.registros = [...x.registros.filter(r => r.creId !== Number(creId)), ...actuales];
    for (const r of actuales) if (r.referenciaPropuesta) x.referencias[`CRE:${r.id}`] = { referencia: r.referenciaPropuesta, propuesta: true, fecha: m.hoy, usuario: ctx.usuario };
    x.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: 'Reemplazar multas por CRE (V1); historial adicional de estudio', creId: Number(creId), antes: structuredClone(antes), despues: structuredClone(actuales) });
    for (const c of control.usos) { c.procesada = false; c.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: `Multas por CRE #${creId} registradas; neto guardado sin recalcular`, estado: c.estado }); }
    SILOG.hojasRutaEstudio.registrarEvento(m, ctx, 'Registrar multas por CRE', `Despacho #${creId}: ${actuales.length} concepto(s). No modifica aplicaciones MC, CRE, netos guardados ni SAP.`);
    return { ok: true, msg: 'Selección reemplazada por CRE como en V1. Consulta el desglose y pulsa Procesar para guardar el neto de la conciliación.', id: Number(creId) };
  };
  L.resumen = (m, c) => {
    const rs = L.aplicaciones(m, c).filter(r => r.origen === 'CRE'), duplicados = L.duplicados(m, c);
    const subtotal = M.redHU(rs.reduce((s, r) => s + r.aporteSinRedondear, 0));
    return { registros: rs, subtotal, duplicados, sinIdentificar: L.aplicaciones(m, c).filter(r => !r.referencia).length,
      avisos: [rs.length && c.recargos.some(r => r.tipo === 'CCIST') ? 'Coexisten fuentes CRE y MC: revisar incidentes. No significa automáticamente que sean duplicados.' : '', duplicados.length ? 'Referencia de incidente repetida: V1 suma ambas fuentes; la protección propuesta exige aclarar antes de un nuevo procesamiento.' : '', ...rs.flatMap(r => r.avisos), ...rs.flatMap(r => L.usos(m, r.creId).length > 1 ? [`Despacho #${r.creId} incluido en varias conciliaciones: DISTINCT evita repetirlo dentro de una, no entre parciales de diferentes conciliaciones.`] : [])].filter(Boolean) };
  };
  L.proyectar = m => L.preparar(m).registros.map(r => ({ ...r, total: r.aporteSinRedondear }));
})(SILOG.multasCREEstudio = {});

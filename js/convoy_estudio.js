/* ConciliacionOTDetalle: añade pares a la MISMA cabecera. No crea ni modifica CRE. */
(function (N) {
  const B = SILOG.conciliacionesEstudio, R = SILOG.creEstudio, M = SILOG.motor;
  const buscar = (m, n) => m.recorridoConciliaciones.lista.find(c => c.id === Number(n));
  const error = msg => ({ ok: false, msg });
  const fecha = f => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) && Number.isFinite(Date.parse(f)) && new Date(f).toISOString().slice(0, 10) === f;
  N.EVIDENCIA = {
    existe: 'Nuevo convoy abre ConciliacionOTDetalle con IDC, empresa, medio, área y fechas de la pantalla. Lista recepciones activas asociadas, aún no conciliadas. Inserta sus pares y recalcula la cabecera en una transacción, sin crear otro número.',
    fuente: 'ConciliacionOtrosTransportes.ascx.vb:785–916; ConciliacionOTDetalle.ascx.vb:202–399,462–661,695–919,932–1289; DetalleDeCisternas/Barcazas/VagonesSinConciliar (Recepciones).',
    problema: 'El selector no repite contrato, moneda, presupuesto ni agrupación inicial. Inserta desde celdas HTML; MAX(detalle)+1 se calcula antes de la transacción. El formulario receptor no revalida explícitamente el estado/permiso al guardar. Las fotos de parciales anteriores no se reconstruyen; una demasía puede compensar mermas del mismo producto.',
    propuesta: 'Guardar IDs y valores tipados, unicidad del par y numeración concurrente; validar estado, permiso, contrato/moneda/período y dependencias financieras en servidor. Comparar e informar el efecto por producto y versionar todos los repartos afectados. Estas protecciones adicionales no se atribuyen a V1.'
  };
  N.periodo = c => {
    const inicio = `${c.anio}-${String(c.mes).padStart(2, '0')}-${c.medio === 1 && c.quincena === 2 ? '16' : '01'}`;
    const dia = c.medio === 1 && c.quincena === 1 ? 15 : new Date(Date.UTC(c.anio, c.mes, 0)).getUTCDate();
    return { inicio, fin: `${c.anio}-${String(c.mes).padStart(2, '0')}-${dia}` };
  };
  N.candidatas = (m, cId, inicio, fin) => {
    const c = buscar(m, cId);
    if (!c || !fecha(inicio) || !fecha(fin) || inicio > fin) return error('Selecciona una conciliación y un rango válido de fechas de recepción.');
    const filas = [], excluidas = [];
    for (const rec of m.cres.filter(R.esRecepcion)) {
      const unidad = m.unidades.find(u => u.id === rec.unidadId), area = m.recorridoConciliaciones.areas.find(a => a.origenes.includes(rec.origenId));
      const incluida = B.conciliada(m, rec.id);
      let motivo = R.medio(rec) !== c.medio ? 'Otro medio de transporte.' : unidad?.empresaId !== c.transportistaId ? 'Otra empresa transportista.' : area?.id !== c.area ? 'Otro origen/área de conciliación.' : rec.estadoId !== 1 ? 'CRE previo/inactivo.' : incluida ? `Ya conciliada en #${incluida.id}; NOT IN RecepcionCREID.` : rec.fecha < inicio || rec.fecha > fin ? 'Fuera del rango de recepción elegido.' : !m.recorridoCRE.asociaciones.some(a => a.recepcionId === rec.id) ? 'Sin despacho asociado.' : '';
      let r;
      if (!motivo) { r = B.calcularRecepcion(m, rec.id, { nuevoConvoy: true }); if (!r.ok) motivo = r.msg; }
      if (motivo) { excluidas.push({ rec, motivo }); continue; }
      filas.push(r);
    }
    filas.sort((a, b) => a.rec.productoId - b.rec.productoId || a.rec.fecha.localeCompare(b.rec.fecha) || a.rec.id - b.rec.id);
    return { ok: true, filas, excluidas };
  };
  const producto = (c, r) => {
    const acumulado = new Map();
    for (const f of r.filas) {
      const a = acumulado.get(f.productoId) || { productoId: f.productoId, cd: 0, flete: 0 };
      a.cd += f.cdBs; a.flete += f.flete; acumulado.set(f.productoId, a);
    }
    return [...acumulado.values()].map(p => ({ ...p, cd: M.redHU(p.cd), merma: M.redHU(Math.min(0, p.cd)), flete: M.redHU(p.flete) }));
  };
  N.firma = (m, cId, inicio, fin, ids, ctx) => {
    const c = buscar(m, cId), p = N.candidatas(m, cId, inicio, fin);
    return JSON.stringify({ ejercicio: m.ejercicioId, cabecera: c, inicio, fin, ids, usuario: ctx?.usuario, modo: ctx?.modo,
      permisos: ctx?.permisos, fuentes: B.firma(m, [...new Set([...(c?.lineas.map(l => l.recepcionId) || []), ...ids])]),
      calculos: p.ok ? p.filas.filter(r => ids.includes(r.rec.id)) : [], multas: SILOG.multasCREEstudio?.proyectar(m) });
  };
  N.previsualizar = (m, cId, inicio, fin, ids, ctx) => {
    const c = buscar(m, cId);
    // Guardia local explícita: la ventana V1 sólo lo expone así, pero su receptor no lo comprueba.
    if (!c || c.estado !== 'En Elaboracion' || ctx?.permisos?.PuedeProcesar !== true || ctx?.permisos?.['Acceso al área y tipo (simulado)'] !== true) return error('Nuevo convoy requiere selección en elaboración, acceso al área/tipo y PuedeProcesar. Es una guardia local que también protege el receptor del prototipo.');
    if (!Array.isArray(ids) || !ids.length || ids.some(n => !Number.isSafeInteger(n) || n < 1) || new Set(ids).size !== ids.length) return error('Selecciona al menos una recepción distinta por su ID.');
    const q = N.candidatas(m, cId, inicio, fin); if (!q.ok) return q;
    const rs = ids.map(n => q.filas.find(r => r.rec.id === n));
    if (rs.some(r => !r)) return error('Una recepción ya no está disponible en el rango, empresa, área o medio elegidos. Actualiza la selección.');
    if (ctx.modo === 'PROPUESTO') {
      const p = N.periodo(c);
      if (rs.some(r => !r.contratoUnico || !r.contratoId || r.lineas.some(l => !l.procedencia.tarifaId))) return error('PROPUESTA: aclara contrato vigente único y tarifa antes de añadir. V1 no repite este control.');
      if (rs.some(r => r.rec.fecha < p.inicio || r.rec.fecha > p.fin)) return error('PROPUESTA: la recepción no pertenece al período de cabecera. Requiere una decisión explícita de negocio.');
      if (c.sapEstudio || c.pagoCierrePropuesto || c.facturacion?.servicioPropuesto) return error('PROPUESTA: revisa o revierte las dependencias SAP/factura/acuerdo antes de modificar la base económica.');
      if (rs.some(r => r.lineas.some(l => m.contratos.contratos.find(k => k.id === l.procedencia.contratoId)?.marcoId))) return error('Cobertura pendiente: comprobación del presupuesto marco para la propuesta. No se finge que fue validado.');
    }
    const copia = structuredClone(c), antes = B.evaluar(m, c), previos = structuredClone(c.totales);
    let siguiente = Math.max(0, ...c.lineas.map(l => l.id)) + 1;
    const nuevas = rs.flatMap(r => r.lineas).map(l => ({ ...structuredClone(l), id: siguiente++, origenIncorporacion: 'Nuevo convoy' }));
    if (nuevas.some(l => !Number.isSafeInteger(l.id) || l.id > 2147483647)) return error('El identificador de detalle no cabe en int.');
    // Verificación global del par en el mismo medio; el receptor V1 la hace en su transacción.
    if (nuevas.some(l => m.recorridoConciliaciones.lista.some(cc => cc.medio === c.medio && cc.lineas.some(a => a.despachoId === l.despachoId && a.recepcionId === l.recepcionId)))) return error('Un par despacho/recepción ya existe: se cancela todo el lote.');
    copia.lineas.push(...nuevas);
    copia.avisos = [...new Set([...copia.avisos, ...rs.flatMap(r => r.avisos)])];
    const despues = B.evaluar(m, copia);
    if (![despues.flete, despues.merma, despues.neto].every(Number.isFinite)) return error('El cálculo no es finito; no se añade ningún detalle.');
    const avisos = [...new Set([...despues.avisos,
      ...(rs.some(r => r.rec.fecha < N.periodo(c).inicio || r.rec.fecha > N.periodo(c).fin) ? ['V1 admite el rango de pantalla sin cambiar mes/quincena de cabecera; puedes mezclar períodos.'] : []),
      ...(c.sapEstudio ? ['Existe preparación SAP: Nuevo convoy no actualiza SAP_ConciliacionMaster/Detail ni un pedido remoto. Contrasta y vuelve a preparar sólo cuando corresponda.'] : []),
      'La merma se agrega por producto y sólo un saldo negativo descuenta. Una demasía puede compensar un faltante del mismo producto, no de otro.',
      'Los detalles anteriores y sus ajustes no se reconstruyen. Si aparecieron nuevas parciales, verifica la suma de litros de todas las fotografías del mismo despacho.'
    ])];
    return { ok: true, copia, nuevas, rs, antes, despues, previos, productosAntes: producto(c, antes), productosDespues: producto(copia, despues), avisos,
      firma: N.firma(m, cId, inicio, fin, ids, ctx) };
  };
  N.agregar = (m, cId, inicio, fin, ids, ctx, firma) => {
    const r = N.previsualizar(m, cId, inicio, fin, ids, ctx); if (!r.ok) return r;
    if (!firma || firma !== r.firma) return error('Cambió la conciliación, selección, contexto o fuente desde la vista previa. Vuelve a comparar antes de confirmar (protección local propuesta).');
    const c = buscar(m, cId), copia = r.copia;
    copia.totales = { flete: r.despues.flete, merma: r.despues.merma, neto: r.despues.neto, netoVisual: r.despues.netoVisual, ...(c.medio === 1 ? { multaTransporte: r.despues.recargos.transporte } : {}) };
    copia.revision++; copia.procesada = true;
    // Sólo ampliar una foto cuya fuente anterior sigue intacta. Nunca ocultar parciales viejas.
    const anteriores = [...new Set(c.lineas.map(l => l.recepcionId))];
    if (c.firma === B.firma(m, anteriores)) copia.firma = B.firma(m, [...anteriores, ...ids]);
    (copia.convoys ||= []).push({ id: (copia.convoys?.length || 0) + 1, inicio, fin, recepcionIds: [...ids], detalleIds: r.nuevas.map(l => l.id),
      fecha: m.hoy, usuario: ctx.usuario, antes: r.previos, despues: structuredClone(copia.totales), productosAntes: r.productosAntes, productosDespues: r.productosDespues });
    copia.historial.push({ fecha: m.hoy, usuario: ctx.usuario, accion: 'Nuevo convoy: agregar recepciones ' + ids.join(', ') + ' y recalcular cabecera', estado: copia.estado });
    // Foto local para preparar SAP en una conformidad posterior; NO toca un registro SAP existente.
    SILOG.sapEstudio?.fotografiarCalculo(copia, r.despues);
    Object.assign(c, copia); SILOG.contratosEstudio.sincronizarUsos(m);
    SILOG.hojasRutaEstudio.registrarEvento(m, ctx, 'Nuevo convoy conectado', `Conciliación #${c.id} / nº ${c.numero}: ${ids.join(', ')}. ${r.nuevas.length} pares añadidos; neto ${r.previos.neto} → ${c.totales.neto}. Sin nueva cabecera ni cambio de CRE.`);
    return { ok: true, id: c.id, msg: 'Recepciones agregadas a la misma conciliación y cabecera recalculada. Los CRE y detalles anteriores se conservaron.' };
  };
  for (const nombre of ['candidatas', 'previsualizar']) {
    const operar = N[nombre];
    N[nombre] = (...args) => {
      try { return operar(...args); }
      catch (e) { return error('No se pudo comparar Nuevo convoy: ' + e.message + '. No se guardó ningún detalle.'); }
    };
  }
})(SILOG.convoyEstudio = {});

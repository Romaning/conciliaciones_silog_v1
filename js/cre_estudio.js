/* Ciclo CRE sobre estudioOrdenes: mismos IDs, sin copiar viajes al simulador anterior. */
window.SILOG = window.SILOG || {};
(function (R) {
  const O = SILOG.ordenesEstudio, M = SILOG.motor;
  R.PASOS = ['Comprender los documentos', 'Revisar el despacho', 'Preparar la recepción', 'Medir y activar la recepción', 'Balance y trazabilidad'];
  // Tipos documentales observados en V1, no IDs de unidades ni empresas de producción.
  R.TIPOS = [{ medioId: 1, despacho: 3, recepcion: 8 }, { medioId: 2, despacho: 5, recepcion: 13 }, { medioId: 3, despacho: 4, recepcion: 9 }];
  const id = (xs, n) => xs.find(x => x.id === Number(n));
  const error = msg => ({ ok: false, msg });
  const ok = (msg, n) => ({ ok: true, msg, id: n });
  const fecha = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const numero = n => (typeof n === 'number' || typeof n === 'string' && n.trim() !== '') && Number.isFinite(Number(n)) ? Number(n) : NaN;
  const litros = n => Number.isInteger(numero(n)) && numero(n) >= 0 && numero(n) <= 2147483647;
  const permite = ctx => ctx?.permisos?.['Modificar Orden'] === true;
  const registrar = (m, ctx, accion, detalle) => m.eventos.unshift({ secuencia: m.eventos.length + 1, fecha: m.hoy, usuario: ctx?.usuario || 'estudiante', accion, detalle });
  R.esDespacho = c => !!c && R.TIPOS.some(t => t.despacho === c.tipoId);
  R.esRecepcion = c => !!c && R.TIPOS.some(t => t.recepcion === c.tipoId);
  R.medio = c => R.TIPOS.find(t => t.despacho === c?.tipoId || t.recepcion === c?.tipoId)?.medioId;
  R.preparar = m => {
    if (!m.recorridoCRE) m.recorridoCRE = { version: 1, siguienteAsociacion: 1, asociaciones: [], parciales: [], ceroAutorizado: [],
      controles: { periodoAbierto: true, movimientoAbierto: true, brevetVigente: true, precintosValidos: true, saldoLitros: 500000 },
      cuentas: [{ id: 2, nombre: 'Disponible para distribución' }, { id: 3, nombre: 'Producto en custodia' }],
      tanquesDestino: [{ id: 4201, nombre: 'TK-201 · Potosí · GES', localidadId: 702, productoId: 801, medios: [1, 2, 3], medicionId: 1 }, { id: 4202, nombre: 'TK-202 · Potosí · DO', localidadId: 702, productoId: 802, medios: [1, 2, 3], medicionId: 1 }, { id: 4302, nombre: 'TK-302 · Senkata · GES', localidadId: 703, productoId: 801, medios: [1], medicionId: 1 }],
      plantasParciales: [{ localidadId: 702, productoId: 801, tipoId: 8 }] };
    return m.recorridoCRE;
  };
  R.recepcionesDe = (m, despachoId) => (m.recorridoCRE?.asociaciones || []).filter(a => a.despachoId === Number(despachoId)).map(a => id(m.cres, a.recepcionId)).filter(c => R.esRecepcion(c) && c.estadoId === 1);
  R.despachosDe = (m, recepcionId) => (m.recorridoCRE?.asociaciones || []).filter(a => a.recepcionId === Number(recepcionId)).map(a => id(m.cres, a.despachoId)).filter(R.esDespacho);
  R.lideres = (m, despachoIds) => {
    const detalles = m.ordenes.flatMap(o => o.detalles), ds = m.cres.filter(c => R.esDespacho(c) && despachoIds.includes(c.id));
    const ids = new Set(ds.flatMap(c => c.detalleIds.map(n => id(detalles, n)?.unidadId)));
    return m.unidades.filter(u => ids.has(u.id));
  };
  R.pendiente = (m, c, excluirId) => m.cres.some(r => R.esRecepcion(r) && r.estadoId === 2 && !r.reservaDescartada && r.id !== Number(excluirId) && r.despachoIds.includes(c.id));
  R.estadoDespacho = (m, c) => c.estadoId !== 1 ? 'Todavía sin activar' : R.pendiente(m, c) ? 'Recepción en preparación' : (m.recorridoCRE?.parciales || []).includes(c.id) ? 'Parcial habilitada' : R.recepcionesDe(m, c.id).length ? 'Recepción final registrada' : 'Pendiente de recepción';
  R.medicion = d => {
    d = d || {};
    if (d.modo === 'MEDIDOR') {
      const inicial = numero(d.inicial), final = numero(d.final), factor = numero(d.factor);
      if (!litros(inicial) || !litros(final) || final < inicial || !(factor > 0 && factor <= 2)) return error('Medidor: lecturas enteras no negativas, final no menor que inicial y factor mayor que 0 hasta 2 en este ejercicio.');
      const finalCorregido = M.redHU(final * factor, 0), volumen = finalCorregido - inicial;
      if (!litros(volumen)) return error('La diferencia corregida no produce litros válidos. Revisa las lecturas y el factor.');
      return { ok: true, volumen, dato: { modo: 'MEDIDOR', inicial, final, factor, finalCorregido }, formula: `${final} × ${factor} = ${finalCorregido} L finales corregidos; ${finalCorregido} − ${inicial} = ${volumen} L. La lectura inicial ya está corregida.` };
    }
    if (d.modo && d.modo !== 'CONSOLIDADO') return error('Selecciona volumen consolidado o medidor en este laboratorio. Tanque y balanza requieren datos técnicos no simulados.');
    if (!litros(d.volumen)) return error('Introduce litros consolidados enteros, no negativos y dentro de int.');
    return { ok: true, volumen: Number(d.volumen), dato: { modo: 'CONSOLIDADO', volumen: Number(d.volumen) }, formula: 'Dato consolidado introducido por el operador; no se calculan tablas de Tanques, densidad/API ni factores ASTM.' };
  };
  function controles(m, c, volumen) {
    const x = m.recorridoCRE?.controles;
    if (!x) return error('Inicializa el recorrido CRE antes de operar.');
    if (!x.periodoAbierto || !x.movimientoAbierto) return error('Periodo o movimiento de producto cerrado en la simulación. V1 consulta ajuste mensual y movimiento abierto.');
    if (!x.brevetVigente || !x.precintosValidos) return error('Revisa la licencia del conductor y los precintos en los controles simulados.');
    if (R.esDespacho(c) && R.medio(c) === 1 && volumen > numero(x.saldoLitros)) return error('La cuenta disponible simulada no tiene saldo suficiente para el despacho.');
    return ok('Controles simulados correctos.');
  }
  R.activarDespacho = (m, creId, datos, ctx) => {
    const c = id(m.cres, creId);
    if (!R.esDespacho(c)) return error('Selecciona un CRE de despacho, no una recepción.');
    const r = R.medicion(typeof datos === 'object' && datos ? datos : { volumen: datos }); if (!r.ok) return r;
    if (r.dato.modo === 'MEDIDOR' && c.medicionId !== 1) return error('El CRE no tiene configurada medición por medidor. Introduce el consolidado calculado externamente para tanque/balanza.');
    const control = controles(m, c, r.volumen); if (!control.ok) return control;
    if (!fecha(c.fecha) || c.fecha > m.hoy) return error('El CRE de despacho no puede tener fecha futura.');
    const result = O.activarCRE(m, c.id, r.volumen, ctx);
    if (result.ok) { c.medicion = r.dato; c.medicionFormula = r.formula; }
    return result;
  };
  R.validarDespachos = (m, ids, dia, excluirId) => {
    if (!fecha(dia) || dia > m.hoy) return error('La recepción necesita una fecha válida no futura respecto al día simulado.');
    if (!Array.isArray(ids) || !ids.length || new Set(ids.map(Number)).size !== ids.length) return error('Selecciona al menos un despacho distinto.');
    const ds = ids.map(n => id(m.cres, n));
    if (ds.some(c => !R.esDespacho(c) || c.estadoId !== 1)) return error('Solo se reciben CRE de despacho activos. Un previo no es un despacho.');
    const primero = ds[0];
    for (const [campo, nombre] of [['origenId', 'origen'], ['destinoId', 'destino'], ['productoId', 'producto'], ['loteId', 'lote']]) if (ds.some(c => c[campo] !== primero[campo])) return error(`Los despachos deben compartir ${nombre}; no se mezclan recorridos o lotes distintos.`);
    if (ds.some(c => R.medio(c) !== R.medio(primero))) return error('Los despachos deben ser del mismo medio de transporte.');
    const empresa = id(m.unidades, primero.unidadId)?.empresaId;
    if (!empresa || ds.some(c => id(m.unidades, c.unidadId)?.empresaId !== empresa)) return error('Los despachos deben pertenecer a la misma empresa.');
    if (ds.some(c => !fecha(c.fecha) || dia < c.fecha)) return error('La recepción no puede ser anterior a ninguno de los despachos seleccionados.');
    if (ds.some(c => R.pendiente(m, c, excluirId))) return error('Un despacho ya está reservado por otro previo de recepción del ejercicio.');
    if (ds.some(c => R.recepcionesDe(m, c.id).length && !(m.recorridoCRE?.parciales || []).includes(c.id))) return error('Ya existe recepción final: no se recibe de nuevo sin habilitación parcial.');
    if (R.medio(primero) !== 1 && ds.length !== 1) return error('El ejercicio de barcaza/bone o vagón recibe un despacho por vez; no reproduce agrupaciones múltiples de esos medios.');
    return { ok: true, despachos: ds };
  };
  R.crearRecepcion = (m, ids, d, ctx) => {
    d = d || {};
    if (!permite(ctx)) return error('Falta autorización simulada de operación (Modificar Orden en este laboratorio). No es una nueva actividad real de seguridad.');
    const val = R.validarDespachos(m, ids, d.fecha); if (!val.ok) return val;
    const ds = val.despachos, primero = ds[0], x = m.recorridoCRE;
    const tanque = x && id(x.tanquesDestino, d.tanqueId), medio = R.medio(primero);
    if (!tanque || tanque.localidadId !== primero.destinoId || tanque.productoId !== primero.productoId || !tanque.medios.includes(medio) || ![0, 1, 2].includes(tanque.medicionId)) return error('Selecciona tanque del destino/producto con tipo de medición configurado para el medio.');
    const lider = id(m.unidades, d.liderId);
    if (!lider || !R.lideres(m, ds.map(c => c.id)).some(u => u.id === lider.id)) return error('La unidad líder debe estar entre los detalles de los despachos seleccionados.');
    const detalleIds = [...new Set(ds.flatMap(c => c.detalleIds))];
    const detalleLider = m.ordenes.flatMap(o => o.detalles).find(d => detalleIds.includes(d.id) && d.unidadId === lider.id);
    if (ds.some(c => c.detalleIds.some(n => !m.enlaces.some(e => e.detalleId === n && e.creId === c.id)))) return error('Falta la relación persistida con el detalle de orden. No se adivina por número ni por placa.');
    const c = { id: m.siguiente.cre++, tipoId: R.TIPOS.find(t => t.medioId === medio).recepcion, ordenId: null, ordenIds: [...new Set(ds.map(c => c.ordenId))], detalleIds, despachoIds: ds.map(c => c.id), origenId: primero.origenId, destinoId: primero.destinoId, productoId: primero.productoId, loteId: primero.loteId, tanqueId: tanque.id, medicionId: tanque.medicionId, unidadId: lider.id, conductorId: detalleLider.conductorId, fecha: d.fecha, estadoId: 2, numero: 0, volumen: null };
    m.cres.push(c); registrar(m, ctx, 'Preparar CRE de recepción', `CRE #${c.id}, tipo ${c.tipoId}, EstadoID=2/número 0; despachos ${c.despachoIds.join(', ')}; todavía sin CREAsociacion ni volumen recibido.`);
    return ok('Recepción en borrador, conectada con los despachos elegidos. Falta medir, distribuir y activar.', c.id);
  };
  R.activarRecepcion = (m, creId, d, ctx) => {
    d = d || {};
    const c = id(m.cres, creId), x = m.recorridoCRE;
    if (!permite(ctx) || !R.esRecepcion(c) || c.estadoId !== 2 || c.reservaDescartada) return error('Solo se activa un previo de recepción vigente con autorización simulada.');
    const dia = d.fecha || c.fecha, val = R.validarDespachos(m, c.despachoIds, dia, c.id); if (!val.ok) return val;
    const r = R.medicion(d); if (!r.ok) return r;
    if (r.dato.modo === 'MEDIDOR' && c.medicionId !== 1) return error('El tanque de destino no tiene medición por medidor; usa un consolidado calculado fuera de este laboratorio.');
    const parcial = d.parcial === true || d.parcial === 'true';
    if (parcial && (R.medio(c) !== 1 || !x.plantasParciales.some(p => p.localidadId === c.destinoId && p.productoId === c.productoId && p.tipoId === c.tipoId))) return error('Parcial de recepción solo se practica para cisterna en planta/producto/tipo configurados (CREPlantasParciales). No es OrdenDespachoParcial.');
    if (r.volumen === 0 && (R.medio(c) !== 1 || c.despachoIds.length !== 1 || !x.ceroAutorizado.includes(c.despachoIds[0]) || parcial)) return error('Volumen cero requiere cisterna, un solo despacho y autorización simulada AUT_CRE_VOLUMEN_CERO; no se usa para abrir otra parcial.');
    const control = controles(m, c, r.volumen); if (!control.ok) return control;
    const distribucion = d.distribucion;
    if (!Array.isArray(distribucion) || !distribucion.length || distribucion.some(f => !id(x.cuentas, f.cuentaId) || !litros(f.volumen)) || new Set(distribucion.map(f => Number(f.cuentaId))).size !== distribucion.length || distribucion.reduce((n, f) => n + Number(f.volumen), 0) !== r.volumen) return error('Las cuentas de distribución deben existir, no repetirse y sumar exactamente los litros recibidos.');
    if (!Number.isInteger(m.siguiente.numeroCRE) || m.siguiente.numeroCRE >= 2147483647) return error('El contador global CRE no puede incrementarse dentro de int.');
    const pares = c.despachoIds.flatMap(despachoId => {
      const ds = id(m.cres, despachoId);
      return ds.detalleIds.map(detalleId => ({ despachoId, detalleId, enlace: m.enlaces.find(e => e.detalleId === detalleId && e.creId === despachoId && e.recepcionId == null) }));
    });
    if (pares.some(p => !m.enlaces.some(e => e.creId === p.despachoId && e.detalleId === p.detalleId))) return error('Desapareció un vínculo con la orden. No se activó ni se consumió un número.');
    c.fecha = dia; c.estadoId = 1; c.numero = m.siguiente.numeroCRE++; c.volumen = r.volumen; c.medicion = r.dato; c.medicionFormula = r.formula; c.parcial = parcial;
    c.distribucion = distribucion.map(f => ({ cuentaId: Number(f.cuentaId), volumen: Number(f.volumen) }));
    c.despachoIds.forEach(despachoId => { x.asociaciones.push({ id: x.siguienteAsociacion++, despachoId, recepcionId: c.id }); x.parciales = x.parciales.filter(n => n !== despachoId); if (parcial) x.parciales.push(despachoId); });
    pares.forEach(p => { if (p.enlace) p.enlace.recepcionId = c.id; else m.enlaces.push({ detalleId: p.detalleId, creId: p.despachoId, recepcionId: c.id }); });
    if (!parcial) c.detalleIds.forEach(n => {
      const ds = m.ordenes.flatMap(o => o.detalles).find(d => d.id === n), s = ds && id(m.solicitudes, ds.solicitudId);
      if (s) SILOG.hojasRutaEstudio.recibir(m, s.id, dia, ctx);
    });
    registrar(m, ctx, 'Activar CRE de recepción', `CRE #${c.id} número ${c.numero}: ${c.volumen} L; ${c.despachoIds.length} CREAsociacion; ${pares.length} enlaces de orden; ${parcial ? 'CRERecepcionParcial habilitada' : 'recepción final, parcial retirada'}. No se calculan flete ni multas.`);
    return ok('Recepción activa y vinculada por IDs a los despachos y sus órdenes.' + (parcial ? ' Se permite otra recepción de esos despachos.' : ' Recepción final registrada; una diferencia no equivale automáticamente a una multa.'), c.id);
  };
  R.descartarReserva = (m, creId, ctx) => {
    const c = id(m.cres, creId);
    if (!permite(ctx) || !c || c.estadoId !== 2 || c.reservaDescartada) return error('Solo se descarta una reserva de borrador del ejercicio, nunca un CRE activo.');
    c.reservaDescartada = true; registrar(m, ctx, 'Descartar reserva didáctica', `CRE #${c.id} conserva su ID y EstadoID=2; se libera la reserva local. No se atribuye a V1 un nuevo estado de anulación.`); return ok('Reserva descartada solo en el ejercicio; no afecta documentos activos.');
  };
  R.balance = (m, creId) => {
    const c = id(m.cres, creId); if (!c || c.estadoId !== 1) return error('El balance exige un CRE activo. Un borrador no aporta litros.');
    // Componente conexo completo: sumar una sola vez cada despacho y cada recepción, incluso en N×M.
    const dIds = new Set(R.esDespacho(c) ? [c.id] : []), rIds = new Set(R.esRecepcion(c) ? [c.id] : []);
    let cambio = true;
    while (cambio) {
      cambio = false;
      (m.recorridoCRE?.asociaciones || []).forEach(a => {
        if (id(m.cres, a.despachoId)?.estadoId !== 1 || id(m.cres, a.recepcionId)?.estadoId !== 1) return;
        if (dIds.has(a.despachoId) || rIds.has(a.recepcionId)) {
          if (!dIds.has(a.despachoId)) { dIds.add(a.despachoId); cambio = true; }
          if (!rIds.has(a.recepcionId)) { rIds.add(a.recepcionId); cambio = true; }
        }
      });
    }
    const despachos = [...dIds].map(n => id(m.cres, n)), recepciones = [...rIds].map(n => id(m.cres, n));
    const despachado = despachos.reduce((n, c) => n + c.volumen, 0), recibido = recepciones.reduce((n, c) => n + c.volumen, 0);
    return { ok: true, despachos, recepciones, despachado, recibido, diferencia: recibido - despachado, abierto: despachos.some(c => !R.recepcionesDe(m, c.id).length || (m.recorridoCRE?.parciales || []).includes(c.id)) };
  };
})(SILOG.creEstudio = {});

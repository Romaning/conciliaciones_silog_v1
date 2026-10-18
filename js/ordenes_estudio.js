/* Órdenes V1: ejercicio aislado. No genera documentos en SILOG ni sustituye mediciones. */
window.SILOG = window.SILOG || {};
(function (O) {
  const C = SILOG.contratosEstudio;
  O.PASOS = ['Entender la orden', 'Preparar y guardar', 'Solicitar y aprobar', 'Preparar el CRE', 'Activar el despacho', 'Liberar y habilitar parcial', 'Seguir las relaciones'];
  O.PERMISOS = ['Modificar Orden', 'Solicitar Aprobacion OD', 'Aprobar OD', 'Rechazar OD', 'Liberar OD', 'Habilitar Parcial OD', 'Inhabilitar Parcial OD', 'Anular Orden'];
  O.ESTADOS = ['EN ELABORACION', 'PENDIENTE DE APROBACION', 'APROBADO', 'LIBERADO', 'ANULADO'];
  const error = msg => ({ ok: false, msg });
  const ok = (msg, id) => ({ ok: true, msg, id });
  const porId = (xs, id) => xs.find(x => x.id === Number(id));
  const copia = x => structuredClone(x);
  const fecha = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const entero = n => String(n ?? '').trim() !== '' && Number.isInteger(Number(n)) && Number(n) > 0 && Number(n) <= 2147483647;
  const permite = (ctx, p) => ctx?.permisos?.[p] === true;
  const evento = (m, ctx, accion, detalle) => m.eventos.unshift({ secuencia: m.eventos.length + 1, fecha: m.hoy, usuario: ctx?.usuario || 'estudiante', accion, detalle });
  O.nuevo = (contratos, opciones = {}) => {
    const catalogo = C.identificar(contratos || C.casoCompleto());
    const m = { version: 1, ejercicioId: C.identidad(), hoy: catalogo.hoy || '2026-10-02', contratos: catalogo, siguiente: { orden: 1, detalle: 1, cre: 1, lote: 5, numeroCRE: 981124 },
      terminales: [{ id: 701, codigo: 'ORU', variable: false, medios: [1, 2, 3], proximo: 28389 }, { id: 703, codigo: 'SEN', variable: true, medios: [1], proximo: 7401 }],
      medios: [{ id: 1, nombre: 'Cisterna', tipoCRE: 3 }, { id: 2, nombre: 'Barcaza', tipoCRE: 5 }, { id: 3, nombre: 'Vagón', tipoCRE: 4 }],
      empresas: [...copia(catalogo.empresas), { id: 503, nombre: 'Navegación del Mamoré SRL', medioId: 2 }, { id: 504, nombre: 'Operadora Ferroviaria Andina SA', medioId: 3 }],
      unidades: [{ id: 1001, codigo: '5726-ZNF', empresaId: 501, medioId: 1, capacidad: 35500, activa: true }, { id: 1002, codigo: '2548-YYL', empresaId: 501, medioId: 1, capacidad: 34000, activa: true }, { id: 1003, codigo: '4244-ZRY', empresaId: 502, medioId: 1, capacidad: 34000, activa: true }, { id: 2001, codigo: 'MAMORÉ · BONE-01', empresaId: 503, medioId: 2, barcazaId: 200, capacidad: 180000, activa: true }, { id: 3001, codigo: 'FCA-1062', empresaId: 504, medioId: 3, capacidad: null, activa: true }],
      conductores: [{ id: 1101, nombre: 'Wilson Ramos Yapticona', empresaId: 501, activo: true }, { id: 1102, nombre: 'Osvaldo Cotrina Cruz', empresaId: 501, activo: true }, { id: 1103, nombre: 'Miguel Morales Sandoval', empresaId: 502, activo: true }, { id: 2101, nombre: 'Luis Arce Suárez', empresaId: 503, activo: true }, { id: 3101, nombre: 'Jorge Rojas Mamani', empresaId: 504, activo: true }],
      tramosSinHR: [{ origenId: 703, destinoId: 702, productos: [801, 802] }, { origenId: 701, destinoId: 703, productos: [801] }],
      tanques: [{ id: 4101, nombre: 'TK-101 · Gasolina Especial', origenId: 701, productoId: 801, medios: [1, 2, 3], medicionId: 1 }, { id: 4102, nombre: 'TK-102 · Diésel Oil', origenId: 701, productoId: 802, medios: [1, 2, 3], medicionId: 1 }, { id: 4301, nombre: 'TK-301 · Gasolina Especial', origenId: 703, productoId: 801, medios: [1], medicionId: 1 }],
      solicitudes: [], ordenes: [], cres: [], lotes: [
        { id: 1, codigo: 'OT-CIS-GES-148-26-ORU', origenId: 701, productoId: 801, medioId: 1, fecha: '2026-10-02' },
        { id: 2, codigo: 'OT-BAR-GES-27-26-ORU', origenId: 701, productoId: 801, medioId: 2, fecha: '2026-10-02' },
        { id: 3, codigo: 'OT-VAG-DO-39-26-ORU', origenId: 701, productoId: 802, medioId: 3, fecha: '2026-10-02' },
        { id: 4, codigo: 'OT-CIS-DO-92-26-ORU', origenId: 701, productoId: 802, medioId: 1, fecha: '2026-10-02' }
      ], enlaces: [], correos: [], eventos: [] };
    (opciones.ejemplos === false ? [] : [[6001, 1001, 1101, 801, 901, 34000], [6002, 1002, 1102, 801, 901, 33000], [6003, 1003, 1103, 801, 901, 34000], [6004, 1002, 1102, 801, 902, 33000], [6005, 2001, 2101, 801, 901, 150000], [6006, 3001, 3101, 802, 901, 50000]]).forEach(([id, unidadId, conductorId, productoId, rutaId, volumen]) => {
      const u = porId(m.unidades, unidadId), r = catalogo.rutas.find(x => x.id === rutaId);
      const consulta = u.medioId === 1 && r ? C.consultar(catalogo, { empresaId: u.empresaId, origenId: 701, destinoId: 702, productoId, prioridad: r.prioridad, fecha: m.hoy }) : null;
      m.solicitudes.push({ id, numero: id + 80000, hoja: id + 90000, origenId: 701, destinoId: 702, medioId: u.medioId, unidadId, conductorId, productoId, rutaId: u.medioId === 1 ? rutaId : null, volumen, estado: 'TRAMITADA', tarifaId: consulta?.elegida?.t.id || null });
    });
    SILOG.hojasRutaEstudio.preparar(m);
    return m;
  };
  O.preparar = st => {
    const m = st.estudioOrdenes || (st.estudioOrdenes = O.nuevo(st.estudioContratos));
    C.identificar(m.contratos); m.ejercicioId ||= C.identidad();
    // JSON no preserva alias de objetos: restablecer sólo una identidad explícita compartida.
    // Guardados antiguos con dos catálogos sin identidad se mantienen separados, sin fusionar IDs.
    if (!st.estudioContratos || st.estudioContratos.catalogoId === m.contratos.catalogoId) st.estudioContratos = m.contratos;
    SILOG.hojasRutaEstudio.preparar(m); return m;
  };
  O.reemplazar = (st, catalogo, ctx, motivo = 'Nuevo ejercicio', opciones = {}) => {
    const anterior = st.estudioOrdenes;
    if (anterior && catalogo && C.identificar(catalogo).catalogoId === C.identificar(anterior.contratos).catalogoId)
      return ok('Contratos ya compartidos: no se reemplazó ningún documento del recorrido.', anterior.ejercicioId);
    const nuevo = O.nuevo(catalogo, opciones);
    if (anterior) (st.recorridosArchivadosOT ||= []).push({ id: C.identidad(), fecha: anterior.hoy, usuario: ctx.usuario,
      motivo, modelo: copia(anterior) });
    if (!st.estudioContratos || st.estudioContratos === anterior?.contratos || st.estudioContratos.catalogoId === anterior?.contratos.catalogoId)
      st.estudioContratos = nuevo.contratos;
    st.estudioOrdenes = nuevo;
    return ok(`Nuevo recorrido activo. ${anterior ? 'El anterior, incluidas conciliaciones, recargos, facturas, SAP y pago/cierre, quedó archivado y puede restaurarse.' : 'No había recorrido anterior.'} Los escenarios generales no cambiaron.`, nuevo.ejercicioId);
  };
  O.restaurar = (st, archivoId, ctx) => {
    const archivo = (st.recorridosArchivadosOT || []).find(a => a.id === archivoId);
    if (!archivo) return error('El archivo del recorrido no existe. No se cambió el ejercicio activo.');
    const anterior = st.estudioOrdenes, restaurado = copia(archivo.modelo);
    if (anterior) st.recorridosArchivadosOT.push({ id: C.identidad(), fecha: anterior.hoy, usuario: ctx.usuario,
      motivo: 'Conservado antes de restaurar otro recorrido', modelo: copia(anterior) });
    if (!st.estudioContratos || st.estudioContratos.catalogoId === anterior?.contratos.catalogoId || st.estudioContratos.catalogoId === restaurado.contratos.catalogoId)
      st.estudioContratos = restaurado.contratos;
    st.estudioOrdenes = restaurado; O.preparar(st); SILOG.conciliacionesEstudio?.preparar(restaurado);
    return ok('Recorrido restaurado con sus mismos IDs, contratos y fotografías. El anterior sigue archivado. No se llamó a V1 ni SAP.', restaurado.ejercicioId);
  };
  O.cabecera = (m, d) => {
    const t = porId(m.terminales, d.origenId);
    if (!t || !t.medios.includes(Number(d.medioId))) return error('La terminal no tiene ese medio configurado para despacho (OperacionPlantaDetalle/TipoCRE).');
    if (!fecha(d.fecha) || d.fecha < m.hoy) return error('La fecha de la nueva orden debe ser válida y no anterior al día simulado.');
    return { ok: true, cab: { origenId: t.id, medioId: Number(d.medioId), fecha: d.fecha, variable: t.variable } };
  };
  O.detalle = (m, cab, d) => {
    const solicitud = d.solicitudId ? porId(m.solicitudes, d.solicitudId) : null;
    if (d.solicitudId && !solicitud) return error('La solicitud seleccionada no existe.');
    const H = SILOG.hojasRutaEstudio;
    if (solicitud) { const r = H.elegible(m, solicitud.id, cab.fecha, cab.origenId, cab.medioId); if (!r.ok) return r; }
    const linea = solicitud && (d.solicitudDetalleId ? porId(solicitud.detalles, d.solicitudDetalleId) : solicitud.detalles.length === 1 ? solicitud.detalles[0] : null);
    if (solicitud && !linea) return error('Selecciona la línea/producto de SolicitudHRDetalle; una SHR con dos productos no equivale a una sola fila.');
    const f = solicitud ? { ...solicitud, ...linea } : d, u = porId(m.unidades, f.unidadId), c = porId(m.conductores, f.conductorId), destinoId = Number(f.destinoId);
    if (!u || !u.activa || u.medioId !== cab.medioId || !c || !c.activo || c.empresaId !== u.empresaId) return error('Selecciona unidad y conductor activos de la misma empresa y del medio de la orden.');
    if (!porId(m.contratos.productos, f.productoId) || !porId(m.contratos.localidades, destinoId) || destinoId === cab.origenId) return error('Producto y destino deben existir; origen y destino deben ser distintos.');
    if (!entero(f.volumen)) return error('El volumen programado debe ser un entero positivo en litros dentro del rango int de V1.');
    if (!solicitud) {
      if (cab.medioId !== 1 || !m.tramosSinHR.some(t => t.origenId === cab.origenId && t.destinoId === destinoId && t.productos.includes(Number(f.productoId)))) return error('La adición manual de este ejercicio requiere cisterna y tramo/producto configurado sin hoja de ruta. Otros medios se incorporan desde una SHR.');
      // El control histórico solo comprueba empresa/tipo/fechas, no una tarifa de esa ruta.
      if (!cab.variable && !m.contratos.contratos.some(c => {
        const vig = C.fechas(m.contratos, c.id);
        return c.empresaId === u.empresaId && c.medioId === cab.medioId && vig.inicio && cab.fecha >= vig.inicio && cab.fecha <= vig.fin;
      })) return error('No hay contrato vigente para la empresa en la fecha de la orden. No se está exigiendo una tarifa por ruta: son controles distintos.');
    }
    return { ok: true, detalle: { destinoId, productoId: Number(f.productoId), empresaId: u.empresaId, unidadId: u.id, conductorId: c.id, volumen: Number(f.volumen), solicitudId: solicitud?.id || null, solicitudDetalleId: linea?.id || null, nroSolicitud: solicitud?.numero || -1, hoja: solicitud ? H.hoja(m, solicitud.id).numero : -1, rutaId: solicitud?.rutaId || null, tarifaId: linea?.tarifaId || null } };
  };
  O.crear = (m, d, filas, ctx) => {
    if (!permite(ctx, 'Modificar Orden')) return error('Falta la actividad Modificar Orden en los permisos simulados.');
    const r = O.cabecera(m, d); if (!r.ok) return r;
    const cab = r.cab;
    if (m.ordenes.some(o => o.origenId === cab.origenId && o.medioId === cab.medioId && !['LIBERADO', 'ANULADO'].includes(o.estado))) return error('Primero libera o anula la orden pendiente de esa terminal y ese medio. La fecha no elimina este bloqueo V1.');
    if (!Array.isArray(filas) || !filas.length) return error('Agrega al menos un detalle antes de guardar: V1 no guarda una cabecera vacía.');
    const detalles = [];
    for (const fila of filas) {
      const dr = O.detalle(m, cab, fila); if (!dr.ok) return dr;
      if (!cab.variable && detalles.some(x => x.unidadId === dr.detalle.unidadId) && [1, 3].includes(cab.medioId)) return error('No se puede repetir la placa/código en una orden normal de cisterna o vagón.');
      if (dr.detalle.solicitudId && detalles.some(x => x.solicitudId === dr.detalle.solicitudId && x.solicitudDetalleId === dr.detalle.solicitudDetalleId)) return error('No se importa dos veces la misma línea de solicitud.');
      if (dr.detalle.solicitudId) { const uso = SILOG.hojasRutaEstudio.validarDetalleOrden(m, dr.detalle.solicitudId, dr.detalle.solicitudDetalleId); if (!uso.ok) return uso; }
      detalles.push(dr.detalle);
    }
    const o = { id: m.siguiente.orden++, ...cab, numero: 0, estado: O.ESTADOS[0], parcial: false, detalles: detalles.map(x => ({ ...x, id: m.siguiente.detalle++ })) };
    m.ordenes.push(o); evento(m, ctx, 'Guardar orden', `OrdenDeDespacho #${o.id}; ${o.detalles.length} OrdenDespachoDetalle; OrdenDespachoParcial.Estado=0. NroOrden=0 hasta aprobar.`);
    return ok('Orden guardada en elaboración, todavía sin número autorizado ni CRE.', o.id);
  };
  O.activos = (m, detalleId) => [...new Map(m.enlaces.filter(e => e.detalleId === detalleId).map(e => porId(m.cres, e.creId)).filter(c => c?.estadoId === 1).map(c => [c.id, c])).values()];
  O.resumen = (m, o) => ({ programados: o?.detalles.length || 0, ejecutados: o?.detalles.filter(d => O.activos(m, d.id).length).length || 0, litros: o?.detalles.reduce((n, d) => n + d.volumen, 0) || 0 });
  O.cambiar = (m, id, accion, ctx) => {
    const o = porId(m.ordenes, id); if (!o) return error('Selecciona una orden guardada.');
    const reglas = {
      solicitar: { permiso: 'Solicitar Aprobacion OD', desde: ['EN ELABORACION'], hasta: 'PENDIENTE DE APROBACION' },
      aprobar: { permiso: 'Aprobar OD', desde: ['PENDIENTE DE APROBACION'], hasta: 'APROBADO' },
      rechazar: { permiso: 'Rechazar OD', desde: ['PENDIENTE DE APROBACION'], hasta: 'EN ELABORACION' },
      liberar: { permiso: 'Liberar OD', desde: ['APROBADO'], hasta: 'LIBERADO' },
      habilitar: { permiso: 'Habilitar Parcial OD', desde: ['APROBADO', 'LIBERADO'], hasta: 'APROBADO' },
      inhabilitar: { permiso: 'Inhabilitar Parcial OD', desde: ['APROBADO', 'LIBERADO'], hasta: null },
      anular: { permiso: 'Anular Orden', desde: ['EN ELABORACION', 'PENDIENTE DE APROBACION', 'APROBADO'], hasta: 'ANULADO' }
    };
    const r = reglas[accion]; if (!r || !permite(ctx, r.permiso)) return error('Falta la actividad de esa acción en los permisos simulados.');
    if (!r.desde.includes(o.estado)) return error(`No se puede ${accion} desde ${o.estado}.`);
    const resumen = O.resumen(m, o);
    if (accion === 'solicitar' && !o.detalles.length) return error('La orden no tiene detalles.');
    if (accion === 'liberar' && !resumen.ejecutados) return error('No existe al menos un CRE activo. Sin despacho debe anularse la orden.');
    if (accion === 'anular' && (resumen.ejecutados || m.enlaces.some(e => o.detalles.some(d => d.id === e.detalleId) && porId(m.cres, e.recepcionId)?.estadoId === 1))) return error('No puede anularse: existe un CRE de despacho o recepción activo relacionado con el detalle.');
    if (accion === 'habilitar' && resumen.ejecutados === resumen.programados) return error('No quedan detalles pendientes para habilitar parcialmente.');
    if (accion === 'aprobar') {
      const t = porId(m.terminales, o.origenId);
      if (!entero(t.proximo) || t.proximo === 2147483647) return error('El contador del ejercicio no puede incrementarse sin desbordar int. V1 no implementa cambio automático de serie.');
      o.numero = t.proximo++;
      [...new Set(o.detalles.map(d => d.empresaId))].forEach(empresaId => m.correos.push({ ordenId: o.id, empresaId, asunto: 'Nómina Autorizada de Carga', enviado: false, simulado: true }));
    }
    if (r.hasta) o.estado = r.hasta;
    if (accion === 'habilitar') o.parcial = true;
    if (['liberar', 'inhabilitar', 'anular'].includes(accion)) o.parcial = false;
    evento(m, ctx, r.permiso, `Orden #${o.id} → ${o.estado}; NroOrden ${o.numero}; parcial=${o.parcial ? 1 : 0}. ${resumen.ejecutados}/${resumen.programados} detalles con CRE activo.`);
    return ok(`Orden en ${o.estado}.` + (accion === 'aprobar' ? ' Número asignado por terminal; correo solo simulado.' : accion === 'liberar' ? ' Liberada no significa que todos hayan despachado ni que exista recepción o conciliación.' : ''), o.id);
  };
  O.quitar = (m, id, detalleId, ctx) => {
    const o = porId(m.ordenes, id), d = o && porId(o.detalles, detalleId);
    if (!d || !permite(ctx, 'Modificar Orden') || !(o.estado === 'EN ELABORACION' || o.variable && o.estado === 'APROBADO')) return error('Solo se quitan detalles en elaboración o en la rama variable aprobada.');
    if (O.activos(m, d.id).length || m.cres.some(c => c.estadoId === 2 && !c.reservaDescartada && c.detalleIds.includes(d.id))) return error('No se quita un detalle con CRE activo o previo reservado en el ejercicio.');
    o.detalles = o.detalles.filter(x => x.id !== d.id); evento(m, ctx, 'Quitar detalle', `Orden #${o.id}, detalle #${d.id}.`); return ok('Detalle quitado del ejercicio.');
  };
  O.agregar = (m, id, datos, ctx) => {
    const o = porId(m.ordenes, id);
    if (!o || !permite(ctx, 'Modificar Orden') || !(o.estado === 'EN ELABORACION' || o.variable && o.estado === 'APROBADO')) return error('Solo se agregan detalles en elaboración o en la rama variable aprobada.');
    const r = O.detalle(m, o, datos); if (!r.ok) return r;
    const d = r.detalle;
    if (!o.variable && [1, 3].includes(o.medioId) && o.detalles.some(x => x.unidadId === d.unidadId)) return error('La placa/código ya está en esta orden normal.');
    if (d.solicitudId) { const uso = SILOG.hojasRutaEstudio.validarDetalleOrden(m, d.solicitudId, d.solicitudDetalleId, o.id); if (!uso.ok) return uso; }
    d.id = m.siguiente.detalle++; o.detalles.push(d);
    evento(m, ctx, 'Agregar detalle', `Orden #${o.id}, OrdenDespachoDetalle #${d.id}.`); return ok('Detalle agregado.', d.id);
  };
  O.validarSeleccion = (m, id, ids) => {
    const o = porId(m.ordenes, id);
    if (!o || o.estado !== 'APROBADO') return error('La orden debe estar APROBADO para iniciar el CRE.');
    if (o.fecha > m.hoy || o.fecha !== m.hoy && !o.parcial) return error('Fuera de la fecha de la orden se requiere habilitación parcial; una orden futura todavía no se despacha.');
    if (!Array.isArray(ids) || !ids.length || new Set(ids.map(Number)).size !== ids.length) return error('Selecciona detalles distintos de la orden.');
    const ds = ids.map(x => porId(o.detalles, x));
    if (ds.some(d => !d)) return error('Hay un detalle que no pertenece a esta orden.');
    if (ds.some(d => O.activos(m, d.id).length || m.cres.some(c => c.estadoId === 2 && !c.reservaDescartada && c.detalleIds.includes(d.id)))) return error('Algún detalle ya tiene CRE activo o previo reservado en el ejercicio.');
    const primero = ds[0];
    for (const [campo, label] of [['productoId', 'producto'], ['empresaId', 'empresa'], ['destinoId', 'destino']]) if (ds.some(d => d[campo] !== primero[campo])) return error(`Selecciona despachos del mismo ${label}.`);
    // La falta de SHR en la primera fila produce una consulta dudosa en V1: aquí no se inventa ruta.
    if (ds.some(d => d.rutaId !== primero.rutaId)) return error('Selecciona despachos con la misma ruta; el ejercicio no equipara una ruta desconocida con otra conocida.');
    if ((o.variable || o.medioId !== 1) && ds.length !== 1) return error('Orden variable, barcaza y vagón: selecciona un solo detalle por creación.');
    for (const d of ds.filter(d => d.solicitudId)) { const hr = SILOG.hojasRutaEstudio.elegible(m, d.solicitudId, m.hoy, o.origenId, o.medioId); if (!hr.ok) return hr; }
    return { ok: true, orden: o, detalles: ds };
  };
  O.prepararCRE = (m, id, ids, d, ctx) => {
    const r = O.validarSeleccion(m, id, ids); if (!r.ok) return r;
    const o = r.orden, ds = r.detalles, primero = ds[0];
    d = d || {};
    if (!permite(ctx, 'Modificar Orden')) return error('Protección del ejercicio: falta permiso simulado para ejecutar el despacho. V1 controla esta pantalla por acceso operativo.');
    const tanque = porId(m.tanques, d.tanqueId);
    if (!tanque || tanque.origenId !== o.origenId || tanque.productoId !== primero.productoId || !tanque.medios.includes(o.medioId) || ![0, 1, 2].includes(tanque.medicionId)) return error('Selecciona tanque del origen/producto y medición configurada para el tipo de CRE.');
    const u = porId(m.unidades, d.unidadId);
    if (!u || !ds.some(x => x.unidadId === u.id)) return error('Selecciona la unidad representativa entre los detalles elegidos. V1 cisterna permite varias filas y una unidad en el CRE.');
    if (o.variable && o.medioId !== 1) return error('La creación directa variable estudiada solo inserta CisternaID/TipoCREID=3; no se extiende a otros medios.');
    if (m.siguiente.numeroCRE >= 2147483647) return error('El contador CRE del ejercicio debe poder incrementarse dentro de int.');
    let lote = o.variable ? m.lotes.find(x => x.origenId === o.origenId && x.productoId === primero.productoId && x.medioId === o.medioId && x.fecha === m.hoy) : porId(m.lotes, d.loteId);
    if (!o.variable && (!lote || lote.origenId !== o.origenId || lote.productoId !== primero.productoId || lote.medioId !== o.medioId)) return error('Selecciona un lote compatible de origen, producto y medio. CREPrevioOT exige lote, no lo crea al aprobar la orden.');
    if (!lote) { lote = { id: m.siguiente.lote++, codigo: `OT-${o.medioId === 1 ? 'CIS' : o.medioId === 2 ? 'BAR' : 'VAG'}-${porId(m.contratos.productos, primero.productoId).codigo}-${m.siguiente.lote - 1}-${Number(m.hoy.slice(0, 4)) - 2000}-${porId(m.terminales, o.origenId).codigo}`, origenId: o.origenId, productoId: primero.productoId, medioId: o.medioId, fecha: m.hoy }; m.lotes.push(lote); }
    const cre = { id: m.siguiente.cre++, ordenId: o.id, detalleIds: ds.map(x => x.id), tipoId: porId(m.medios, o.medioId).tipoCRE, unidadId: u.id, conductorId: ds.find(x => x.unidadId === u.id).conductorId, origenId: o.origenId, destinoId: primero.destinoId, productoId: primero.productoId, tanqueId: tanque.id, medicionId: tanque.medicionId, loteId: lote.id, fecha: m.hoy, estadoId: o.variable ? 1 : 2, numero: o.variable ? m.siguiente.numeroCRE++ : 0, volumen: o.variable ? primero.volumen : null };
    m.cres.push(cre);
    if (o.variable) enlazar(m, cre, ctx);
    evento(m, ctx, o.variable ? 'Crear CRE variable' : 'Preparar CRE normal', `CRE #${cre.id}, EstadoID=${cre.estadoId}, número=${cre.numero}; ${ds.length} detalles seleccionados. ${o.variable ? 'Con relación activa.' : 'Previo sin relación persistida hasta activar.'}`);
    return ok(o.variable ? 'CRE variable activo: volumen programado copiado y relación creada. No es el camino del CRE normal.' : 'CRE previo creado con EstadoID=2 y número 0. Falta simular la activación; todavía no cuenta como despacho ejecutado.', cre.id);
  };
  function enlazar(m, cre, ctx) {
    cre.detalleIds.forEach(detalleId => {
      m.enlaces.push({ detalleId, creId: cre.id, recepcionId: null });
      const o = porId(m.ordenes, cre.ordenId), d = porId(o.detalles, detalleId), s = porId(m.solicitudes, d.solicitudId);
      if (s) SILOG.hojasRutaEstudio.despachar(m, s.id, ctx);
    });
  }
  O.activarCRE = (m, id, volumen, ctx) => {
    const cre = porId(m.cres, id), o = cre && porId(m.ordenes, cre.ordenId);
    if (!permite(ctx, 'Modificar Orden') || !cre || cre.estadoId !== 2 || cre.reservaDescartada || cre.despachoIds || !o || o.estado !== 'APROBADO') return error('Solo se activa un CRE previo de despacho de una orden aprobada y con permiso simulado.');
    if (!entero(volumen)) return error('Introduce volumen consolidado positivo en litros. Es una entrada didáctica: aquí no se calculan temperatura, API ni factores de medición.');
    if (cre.detalleIds.some(id => !porId(o.detalles, id) || O.activos(m, id).length)) return error('Un detalle desapareció o ya se vinculó a otro CRE activo. No se duplica la relación.');
    for (const d of o.detalles.filter(d => cre.detalleIds.includes(d.id) && d.solicitudId)) { const hr = SILOG.hojasRutaEstudio.elegible(m, d.solicitudId, m.hoy, o.origenId, o.medioId); if (!hr.ok) return hr; }
    if (m.siguiente.numeroCRE >= 2147483647) return error('El contador CRE no puede incrementarse dentro de int.');
    cre.estadoId = 1; cre.numero = m.siguiente.numeroCRE++; cre.volumen = Number(volumen); enlazar(m, cre, ctx);
    evento(m, ctx, 'Activar CRE de estudio', `CRE #${cre.id} número ${cre.numero}; ${cre.volumen} L consolidados; CREOrdenDespacho por ${cre.detalleIds.length} detalles; HR → EN TRANSITO. No se ha registrado recepción ni flete.`);
    return ok('CRE activo y relacionado. El volumen consolidado no se confunde con la suma programada.', cre.id);
  };
  O.avanzarDia = (m, dia, ctx) => {
    if (!fecha(dia) || dia < m.hoy) return error('Usa una fecha válida igual o posterior al día simulado.');
    m.hoy = dia; m.contratos.hoy = dia; evento(m, ctx, 'Cambiar día del ejercicio', dia); return ok('Día simulado actualizado para el recorrido y su catálogo compartido.');
  };
})(SILOG.ordenesEstudio = {});

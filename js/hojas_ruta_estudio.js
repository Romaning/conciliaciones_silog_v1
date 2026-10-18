/* Solicitud y HR son documentos distintos. Este modelo solo opera datos del navegador. */
window.SILOG = window.SILOG || {};
(function (H) {
  const C = SILOG.contratosEstudio;
  const id = (xs, n) => xs.find(x => x.id === Number(n));
  const error = msg => ({ ok: false, msg }), ok = (msg, n) => ({ ok: true, msg, id: n });
  const permite = (ctx, p) => ctx?.permisos?.[p] === true;
  const entero = n => (typeof n === 'number' || typeof n === 'string' && n.trim() !== '') && Number.isInteger(Number(n)) && Number(n) > 0 && Number(n) <= 2147483647;
  const fecha = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const dias = (d, n) => SILOG.motor.sumarDias(d, n);
  H.PERMISOS = ['Crear SHR', 'Anular SHR', 'Imprimir SHR', 'Registrar HR', 'Habilitar CRES HR', 'Acceso administrativo simulado'];
  H.SOLICITUD = ['ACTIVO', 'UTILIZADO', 'ANULADO'];
  H.HOJA = ['TRAMITADA', 'EN TRANSITO', 'UTILIZADA', 'VENCIDA', 'NO UTILIZADA', 'EN IMPORTACION', 'NO CONCILIADA', 'DESCARGADA'];
  H.PASOS = ['Distinguir documentos', 'Requisitos y contrato', 'Activar solicitud', 'Registrar hoja de ruta', 'Incorporar a la orden', 'Despacho y recepción', 'Cierre y excepciones', 'Trazabilidad'];
  H.registrarEvento = (m, ctx, accion, detalle) => m.eventos.unshift({ secuencia: m.eventos.length + 1, fecha: m.hoy, usuario: ctx?.usuario || 'estudiante', accion, detalle });
  H.preparar = m => {
    if (m.recorridoHR?.version === 1) return m.recorridoHR;
    const x = m.recorridoHR = { version: 1, siguienteSolicitud: Math.max(6000, ...m.solicitudes.map(s => s.id)) + 1, siguienteNumero: Math.max(86000, ...m.solicitudes.map(s => s.numero)) + 1, siguienteHoja: 1,
      hojas: [], retiradas: [], controles: { accesoOrigen: true, representante: true, licencias: true, conductor: true, aduana: true },
      registros: m.terminales.flatMap(t => m.contratos.productos.map(p => ({ id: t.id * 10 + p.id, origenId: t.id, productoId: p.id, codigo: `RA-2026-${t.codigo}-${p.codigo}`, inicio: '2026-01-01', fin: '2026-12-31', volumenMes: 2000000, activo: true }))),
      // Importes de práctica, NO extraídos de una tabla de producción.
      costos: [{ desde: 1, hasta: 35000, bs: 20 }, { desde: 35001, hasta: 200000, bs: 50 }], origenHabilitadoPractica: false };
    m.solicitudes.forEach(s => {
      const anterior = s.estado;
      s.detalles = s.detalles || [{ id: 1, productoId: s.productoId, volumen: s.volumen, tarifaId: s.tarifaId || null, registroId: null }];
      delete s.productoId; delete s.volumen; delete s.tarifaId;
      s.inicio = s.inicio || m.hoy; s.fin = s.fin || dias(s.inicio, 15);
      s.identificador = s.identificador || `TRA_${s.inicio.slice(8)}${s.inicio.slice(5, 7)}${s.inicio.slice(0, 4)}_#${s.numero}`;
      s.ejemploPreparado = true;
      if (s.hoja > 0) {
        x.hojas.push({ id: x.siguienteHoja++, solicitudId: s.id, numeroSolicitud: s.numero, numero: s.hoja, estado: H.HOJA.includes(anterior) ? anterior : 'TRAMITADA', inicio: s.inicio, fin: s.vigenciaFin || s.fin, deposito: String(700000 + s.id), cantidadCRE: s.detalles.length, importadaEjemplo: true });
        s.estado = anterior === 'ANULADO' ? 'ANULADO' : 'UTILIZADO';
      } else s.estado = anterior === 'ANULADO' ? 'ANULADO' : 'ACTIVO';
      delete s.hoja; delete s.vigenciaFin;
    });
    // IDs de órdenes/CRE y referencias existentes se conservan al abrir un guardado anterior.
    m.ordenes.forEach(o => o.detalles.forEach(d => { if (d.solicitudId && !d.solicitudDetalleId) d.solicitudDetalleId = id(m.solicitudes, d.solicitudId)?.detalles.find(f => f.productoId === d.productoId)?.id || null; }));
    return x;
  };
  H.hoja = (m, solicitudId) => m.recorridoHR.hojas.find(h => h.solicitudId === Number(solicitudId));
  H.usos = (m, solicitudId) => [...new Set(m.enlaces.filter(e => m.ordenes.some(o => o.detalles.some(d => d.id === e.detalleId && d.solicitudId === Number(solicitudId)))).map(e => e.creId).filter(n => id(m.cres, n)?.estadoId === 1))];
  H.costo = (m, litros) => {
    const xs = m.recorridoHR.costos, tramo = xs.find(x => litros >= x.desde && litros <= x.hasta);
    if (!xs.length) return error('Falta la tabla simulada CostoSolicitudHojaRuta.');
    return { ok: true, valor: tramo ? tramo.bs : Math.max(...xs.map(x => x.bs)) + Math.trunc(litros / 1000 - 35), formula: tramo ? `${litros} L dentro de ${tramo.desde}–${tramo.hasta}: ${tramo.bs} Bs` : `máximo costo + truncar(${litros}/1000 − 35)` };
  };
  H.tarifas = (m, s, f, empresaId) => m.contratos.tarifas.filter(t => {
    const h = id(m.contratos.historiales, t.historialId), c = h && id(m.contratos.contratos, h.contratoId), r = id(m.contratos.rutas, t.rutaId);
    return c?.empresaId === empresaId && c.medioId === Number(s.medioId) && r?.origenId === Number(s.origenId) && r.destinoId === Number(s.destinoId) && t.rutaId === Number(s.rutaId) && t.productoId === Number(f.productoId) && t.activa && t.aprobada && h.estado === 'LIBERADO' && h.inicio <= s.inicio && C.fechas(m.contratos, c.id).fin >= s.inicio;
  });
  H.consumo = (m, registroId, inicio) => m.solicitudes.filter(s => s.estado !== 'ANULADO' && s.inicio.slice(0, 7) === inicio.slice(0, 7)).flatMap(s => s.detalles).filter(f => f.registroId === Number(registroId)).reduce((n, f) => n + f.volumen, 0);
  H.validar = (m, d, ctx) => {
    if (!permite(ctx, 'Crear SHR')) return error('Falta Crear SHR en las actividades simuladas.');
    if (!fecha(d.inicio) || d.inicio < m.hoy) return error('La vigencia de la solicitud debe comenzar hoy o después.');
    const fin = dias(d.inicio, 15), x = m.recorridoHR, u = id(m.unidades, d.unidadId), conductor = id(m.conductores, d.conductorId), ruta = id(m.contratos.rutas, d.rutaId);
    if (!u?.activa || u.medioId !== Number(d.medioId) || !conductor?.activo || conductor.empresaId !== u.empresaId) return error('Selecciona recurso y conductor activos de la misma empresa y del medio solicitado.');
    if (!ruta || ruta.medioId !== u.medioId || ruta.origenId !== Number(d.origenId) || ruta.destinoId !== Number(d.destinoId) || ruta.activa === false) return error('Selecciona una ruta activa del origen, destino y medio; no se supone que la ruta inversa sea igual.');
    if (!x.controles.accesoOrigen || !x.controles.representante) return error('Falta autorización simulada sobre el origen o representante legal. Revisa Requisitos.');
    if (m.solicitudes.some(s => s.origenId === Number(d.origenId) && s.estado === 'ACTIVO' && !H.hoja(m, s.id) && s.inicio <= dias(m.hoy, -4))) return error('Hay una solicitud ACTIVO sin hoja con cuatro días o más desde su inicio en ese origen; tramítala o anúlala primero.');
    if (!x.controles.licencias || !x.controles.conductor) return error('Las licencias o los requisitos del conductor no cubren el fin de la solicitud (+15 días). Son respuestas externas simuladas.');
    if (ruta.internacional && !x.controles.aduana) return error('Ruta internacional: falta una RA aduanera única y su autorización del recurso/producto.');
    const contratos = m.contratos.contratos.filter(c => { const vig = C.fechas(m.contratos, c.id); return c.empresaId === u.empresaId && c.medioId === u.medioId && vig.inicio <= d.inicio && vig.fin >= d.inicio; });
    if (!contratos.length) return error('No existe contrato vigente de transporte de esa empresa en la fecha de inicio.');
    if (contratos.length !== 1) return error('Hay más de un contrato vigente: resuelve la ambigüedad antes de activar; no se elige uno arbitrariamente.');
    const filas = d.detalles;
    if (!Array.isArray(filas) || !filas.length || filas.length > (u.medioId === 1 ? 2 : 1)) return error('Agrega uno o dos productos para cisterna; barcaza/vagón admiten uno en esta solicitud V1.');
    if (new Set(filas.map(f => Number(f.productoId))).size !== filas.length) return error('No repitas el mismo producto en los detalles.');
    const detalles = [];
    for (const f of filas) {
      if (!entero(f.volumen)) return error('Cada volumen solicitado debe ser positivo, entero y estar dentro de int.');
      const ra = id(x.registros, f.registroId);
      if (!ra?.activo || ra.origenId !== Number(d.origenId) || ra.productoId !== Number(f.productoId) || d.inicio < ra.inicio || fin > ra.fin) return error('El registro y producto autorizado deben estar activos en el origen y cubrir toda la solicitud.');
      if (H.consumo(m, ra.id, d.inicio) + Number(f.volumen) > ra.volumenMes) return error('El volumen solicitado excede el cupo mensual simulado del producto autorizado RA.');
      let tarifaId = null;
      if (contratos[0].controlaRuta !== false) {
        const ts = H.tarifas(m, d, f, u.empresaId);
        if (!ts.length) return error('ControlaRuta: no hay tarifa aprobada y liberada para empresa, producto y ruta seleccionada.');
        if (ts.length > 1) return error('ControlaRuta: varias tarifas coinciden. La función escalar V1 puede fallar (contrato/adenda superpuestos); corrige la parametrización, no selecciones una en silencio.');
        tarifaId = ts[0].id;
      }
      detalles.push({ id: detalles.length + 1, registroId: ra.id, productoId: Number(f.productoId), volumen: Number(f.volumen), tarifaId });
    }
    const costo = H.costo(m, detalles.reduce((n, f) => n + f.volumen, 0)); if (!costo.ok) return costo;
    return { ok: true, datos: { origenId: Number(d.origenId), destinoId: Number(d.destinoId), medioId: u.medioId, unidadId: u.id, conductorId: conductor.id, rutaId: ruta.id, inicio: d.inicio, fin, contratoId: contratos[0].id, detalles, costoBs: costo.valor, formulaCosto: costo.formula } };
  };
  H.activar = (m, d, ctx) => {
    const r = H.validar(m, d, ctx); if (!r.ok) return r;
    const x = m.recorridoHR;
    if (!entero(x.siguienteNumero) || x.siguienteNumero === 2147483647) return error('El contador de solicitudes no puede incrementarse dentro de int.');
    const s = { id: x.siguienteSolicitud++, numero: x.siguienteNumero++, ...r.datos, estado: 'ACTIVO', usuario: ctx.usuario || 'estudiante', fecha: m.hoy };
    s.identificador = `TRA_${s.inicio.slice(8)}${s.inicio.slice(5, 7)}${s.inicio.slice(0, 4)}_#${s.numero}`;
    m.solicitudes.push(s); H.registrarEvento(m, ctx, 'Activar solicitud', `SolicitudHojaRutaID #${s.id}, ${s.identificador}, ACTIVO, sin HR; ${s.detalles.length} SolicitudHRDetalle. Costo de trámite ${s.costoBs} Bs, no flete.`);
    return ok('Solicitud ACTIVO. Falta tramitar y registrar la hoja; todavía no se puede importar a una orden.', s.id);
  };
  H.tieneOrden = (m, sId) => m.ordenes.some(o => o.estado !== 'ANULADO' && o.detalles.some(d => d.solicitudId === Number(sId)));
  H.registrar = (m, sId, d, ctx) => {
    const s = id(m.solicitudes, sId), h = H.hoja(m, sId), x = m.recorridoHR;
    if (!permite(ctx, 'Registrar HR') || !s || s.estado === 'ANULADO') return error('Se requiere Registrar HR y una solicitud no anulada.');
    if (h && (h.estado !== 'TRAMITADA' || H.tieneOrden(m, sId))) return error('Solo se corrige una HR TRAMITADA que aún no esté en una orden vigente.');
    if (!entero(d.numero) || !/^\d+$/.test(String(d.deposito)) || BigInt(d.deposito) < 1n || BigInt(d.deposito) > 9223372036854775807n) return error('Ingresa número de HR positivo int y depósito positivo bigint (hasta 19 dígitos); el depósito se conserva como texto exacto.');
    if (!fecha(d.inicio) || !fecha(d.fin) || d.inicio > d.fin || d.inicio < s.inicio || d.fin > s.fin) return error('La vigencia de HR debe ser válida y estar completamente dentro de la solicitud.');
    if (x.hojas.some(a => a.solicitudId !== s.id && a.numero === Number(d.numero))) return error('Ese número de hoja ya pertenece a otra solicitud.');
    const deposito = BigInt(d.deposito).toString();
    if (x.hojas.some(a => a.solicitudId !== s.id && a.deposito === deposito)) return error('El depósito ya fue registrado en otra hoja.');
    const datos = { numero: Number(d.numero), deposito, inicio: d.inicio, fin: d.fin, estado: 'TRAMITADA', usuarioTramite: ctx.usuario || 'estudiante', fechaTramite: m.hoy };
    if (h) Object.assign(h, datos); else x.hojas.push({ id: x.siguienteHoja++, solicitudId: s.id, numeroSolicitud: s.numero, cantidadCRE: s.detalles.length, ...datos });
    s.estado = 'UTILIZADO'; s.usuarioUtilizacion = ctx.usuario || 'estudiante'; s.fechaUtilizacion = m.hoy;
    H.registrarEvento(m, ctx, 'Registrar hoja de ruta', `Solicitud #${s.id} UTILIZADO → HojaRutaCRE #${H.hoja(m, s.id).id}, HR ${datos.numero} TRAMITADA; cupo ${H.hoja(m, s.id).cantidadCRE} CRE.`);
    return ok('Solicitud UTILIZADO y hoja TRAMITADA. No equivale a despacho ejecutado.', s.id);
  };
  H.elegible = (m, sId, dia, origenId, medioId) => {
    const s = id(m.solicitudes, sId), h = H.hoja(m, sId);
    if (!s || s.estado !== 'UTILIZADO' || !h) return error('Solicitud sin HR registrada o anulada. Se requiere solicitud UTILIZADO y hoja elegible.');
    if (s.origenId !== Number(origenId) || s.medioId !== Number(medioId)) return error('El origen o medio no coincide con la orden.');
    if (!fecha(dia) || dia < h.inicio || dia > h.fin) return error('La fecha está fuera de la vigencia de la hoja de ruta.');
    if (['DESCARGADA', 'NO UTILIZADA', 'VENCIDA'].includes(h.estado)) return error(`La hoja ${h.estado} no se usa para un nuevo despacho.`);
    if (!H.HOJA.includes(h.estado) || H.usos(m, sId).length >= h.cantidadCRE) return error('Se agotó CantidadCRE de la hoja; habilitar parcial de la orden no amplía ese cupo.');
    return { ok: true, solicitud: s, hoja: h };
  };
  H.validarDetalleOrden = (m, sId, lineaId, ordenId) => {
    const ocupada = m.ordenes.some(o => o.estado !== 'ANULADO' && o.detalles.some(d => d.solicitudId === Number(sId) && d.solicitudDetalleId === Number(lineaId) && (!SILOG.ordenesEstudio.activos(m, d.id).length || o.id === ordenId)));
    return ocupada ? error('La línea de solicitud ya está pendiente en otra orden no anulada o ya figura en esta orden.') : { ok: true };
  };
  H.despachar = (m, sId, ctx) => { const h = H.hoja(m, sId); if (h) { h.estado = 'EN TRANSITO'; h.usuarioTransito = ctx?.usuario || 'estudiante'; h.fechaTransito = m.hoy; H.registrarEvento(m, ctx, 'Hoja en tránsito', `HR ${h.numero} → EN TRANSITO; solicitud #${sId} permanece UTILIZADO.`); } };
  H.recibir = (m, sId, dia, ctx) => {
    const h = H.hoja(m, sId); if (!h) return;
    const usos = H.usos(m, sId);
    const s = id(m.solicitudes, sId);
    if (s.detalles.some(f => !m.ordenes.some(o => o.detalles.some(d => d.solicitudId === s.id && d.solicitudDetalleId === f.id && SILOG.ordenesEstudio.activos(m, d.id).length)))) return;
    if (usos.some(n => !(m.recorridoCRE?.asociaciones || []).some(a => a.despachoId === n && id(m.cres, a.recepcionId)?.estadoId === 1) || m.recorridoCRE?.parciales.includes(n))) return;
    h.estado = h.fin < dia ? 'VENCIDA' : 'UTILIZADA'; h.usuarioRecepcion = ctx?.usuario || 'estudiante'; h.fechaRecepcion = dia;
    H.registrarEvento(m, ctx, 'Recepción final de hoja', `HR ${h.numero} → ${h.estado}; solicitud permanece UTILIZADO. Protección: no cerrar si otro despacho relacionado sigue abierto.`);
  };
  H.cambiar = (m, sId, estado, observacion, ctx) => {
    const s = id(m.solicitudes, sId), h = H.hoja(m, sId);
    if (!permite(ctx, 'Registrar HR') || !h || s?.estado === 'ANULADO') return error('Se requiere hoja existente, solicitud no anulada y Registrar HR.');
    const desde = { 'NO UTILIZADA': ['TRAMITADA'], 'EN IMPORTACION': ['TRAMITADA'], 'NO CONCILIADA': ['NO UTILIZADA', 'UTILIZADA', 'VENCIDA', 'EN IMPORTACION'], DESCARGADA: ['UTILIZADA', 'VENCIDA', 'NO UTILIZADA', 'EN IMPORTACION', 'NO CONCILIADA'] };
    if (!desde[estado]?.includes(h.estado)) return error(`No se permite ${h.estado} → ${estado} en HojasDeRuta.btnEstado.`);
    if (typeof observacion !== 'string' || !observacion.trim() || observacion.length > 500) return error('Ingresa una observación de hasta 500 caracteres (protección didáctica de trazabilidad).');
    const abierto = H.usos(m, sId).some(n => !(m.recorridoCRE?.asociaciones || []).some(a => a.despachoId === n && id(m.cres, a.recepcionId)?.estadoId === 1) || m.recorridoCRE?.parciales.includes(n));
    if (abierto && estado === 'DESCARGADA') return error('Protección adicional: no cerrar administrativamente mientras exista despacho pendiente de recepción final.');
    const anterior = h.estado; h.estado = estado; h.observacion = observacion.trim(); h.usuarioCambio = ctx.usuario || 'estudiante'; h.fechaCambio = m.hoy;
    H.registrarEvento(m, ctx, 'Cambiar estado de HR', `HR ${h.numero}: ${anterior} → ${estado}. ${h.observacion}`); return ok(`HR ${estado}. El estado de la solicitud no cambia.`, sId);
  };
  H.anularSolicitud = (m, sId, ctx) => {
    const s = id(m.solicitudes, sId);
    if (!permite(ctx, 'Anular SHR') || !s || s.estado !== 'ACTIVO') return error('Anular SHR exige actividad y solicitud ACTIVO. Para una UTILIZADO revisa primero la reversión administrativa permitida.');
    if (H.tieneOrden(m, sId)) return error('No se anula: existe una orden no anulada.');
    s.estado = 'ANULADO'; s.usuarioAnulacion = ctx.usuario || 'estudiante'; s.fechaAnulacion = m.hoy;
    H.registrarEvento(m, ctx, 'Anular solicitud', `Solicitud #${s.id} → ANULADO; conserva detalles e identidad.`); return ok('Solicitud anulada sin eliminarla.', s.id);
  };
  H.revertir = (m, sId, ctx) => {
    const s = id(m.solicitudes, sId), h = H.hoja(m, sId), x = m.recorridoHR;
    if (!permite(ctx, 'Acceso administrativo simulado') || s?.estado !== 'UTILIZADO' || h?.estado !== 'TRAMITADA' || H.tieneOrden(m, sId)) return error('Reversión administrativa: solo solicitud UTILIZADO + HR TRAMITADA, sin orden no anulada y con acceso administrativo simulado.');
    x.retiradas.push({ ...structuredClone(h), usuarioRetiro: ctx.usuario || 'estudiante', fechaRetiro: m.hoy }); x.hojas = x.hojas.filter(a => a.id !== h.id); s.estado = 'ACTIVO';
    H.registrarEvento(m, ctx, 'Quitar hoja de ruta', `HR ${h.numero} retirada; solicitud #${s.id} ACTIVO sin HR. V1 elimina HojaRutaCRE y registra CambiosAdministrativos; aquí queda copia de auditoría, no un estado inventado ANULADA de HR.`);
    return ok('Registro HR retirado; la misma solicitud vuelve a ACTIVO. Se conserva copia en auditoría local.', sId);
  };
  H.habilitar = (m, sId, cantidad, ctx) => {
    const s = id(m.solicitudes, sId), h = H.hoja(m, sId);
    if (!permite(ctx, 'Habilitar CRES HR') || !h || s?.estado === 'ANULADO') return error('Se requiere Habilitar CRES HR y hoja existente de solicitud no anulada.');
    if (![103, 104, 89, 101].includes(s.origenId) && !m.recorridoHR.origenHabilitadoPractica) return error('V1 limita esta pantalla a orígenes 103, 104, 89, 101. Este origen ficticio no pertenece a ellos; habilita explícitamente la equivalencia solo de práctica.');
    if (['DESCARGADA', 'NO UTILIZADA'].includes(h.estado) || !entero(cantidad) || Number(cantidad) > 32767 || Number(cantidad) < H.usos(m, sId).length) return error('CantidadCRE debe ser smallint positivo, al menos igual a los CRE distintos relacionados; no se habilitan DESCARGADA ni NO UTILIZADA.');
    h.cantidadCRE = Number(cantidad); h.usuarioModificacion = ctx?.usuario || 'estudiante'; h.fechaModificacion = m.hoy;
    H.registrarEvento(m, ctx, 'Habilitar cupo de CRE', `HR ${h.numero}: CantidadCRE=${h.cantidadCRE}; estado y vigencia NO cambian.`); return ok('Cupo actualizado, sin reactivar ni prorrogar la hoja.', sId);
  };
  H.adjuntar = (m, sId, nombre, ctx) => {
    const h = H.hoja(m, sId);
    if (!permite(ctx, 'Registrar HR') || !h || typeof nombre !== 'string' || nombre.length > 150 || !/\.(docx?|xlsx?|pptx?|zip|jpg|pdf|rar)$/i.test(nombre)) return error('Selecciona una hoja y un nombre de archivo permitido (hasta 150 caracteres).');
    h.adjunto = { nombre, simulado: true, usuario: ctx.usuario || 'estudiante', fecha: m.hoy }; H.registrarEvento(m, ctx, 'Adjuntar respaldo simulado', `HR ${h.numero}: ${nombre}. Solo metadatos, no se subió un archivo.`); return ok('Nombre de respaldo guardado; no contiene un archivo real.', sId);
  };
  H.otrosMedios = (m, ctx) => {
    if (!permite(ctx, 'Acceso administrativo simulado')) return error('Se requiere acceso administrativo simulado para añadir el caso de práctica.');
    const c = m.contratos, cc = { ...ctx, modo: 'PROPUESTO', permisos: Object.fromEntries(C.PERMISOS.map(p => [p, true])) };
    [2, 3].forEach(medioId => {
      const empresa = m.empresas.find(e => e.medioId === medioId);
      if (!c.empresas.some(e => e.id === empresa.id)) c.empresas.push(structuredClone(empresa));
      if (!c.medios.some(e => e.id === medioId)) c.medios.push({ id: medioId, nombre: id(m.medios, medioId).nombre, unidad: medioId === 3 ? 't' : 'm³', unidadCalculo: medioId === 3 ? 'kg' : 'L' });
      const rutaId = 903 + medioId;
      if (!id(c.rutas, rutaId)) c.rutas.push({ id: rutaId, medioId, origenId: 701, destinoId: 702, prioridad: 'PRINCIPAL', nombre: `${medioId === 2 ? 'Barcaza' : 'Vagón'} · corredor ficticio de estudio`, activa: true });
      if (!c.contratos.some(a => a.empresaId === empresa.id)) { const r = C.crear(c, { empresaId: empresa.id, numero: `ESTUDIO-${medioId}-2026`, inicio: '2026-01-01', fin: '2026-12-31', moneda: 'Bs' }, cc); if (r.ok) { C.guardarTarifas(c, r.id, [{ rutaId, productoId: medioId === 2 ? 801 : 802, tarifa: 200, admisible: 0.3 }], cc); for (let i = 0; i < 3; i++) C.avanzar(c, r.id, cc); } }
    });
    H.registrarEvento(m, ctx, 'Añadir condiciones ficticias', 'Contratos, versiones y tarifas de barcaza/vagón añadidos al catálogo compartido de este recorrido de estudio. El corredor y sus importes no representan una ruta operativa real.');
    return ok('Condiciones ficticias de otros medios preparadas; todavía debes activar su solicitud y registrar la HR.');
  };
})(SILOG.hojasRutaEstudio = {});

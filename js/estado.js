/*
 * Estado del prototipo y acciones de negocio. Cada acción valida con el motor, modifica el
 * estado, registra la bitácora y guarda en localStorage (si está disponible).
 * Las acciones devuelven { ok, msg }.
 */
window.SILOG = window.SILOG || {};

(function (E) {
  const M = SILOG.motor;
  const CLAVE = 'silog-v1-prototipo-conciliaciones-v5';
  E.st = null;
  E.ui = { modo: 'V1', rol: 'Analista LOG', usuario: 'analista01', escenario: 'GENERAL', guion: {} };

  const USUARIOS = { 'Analista LOG': 'analista01', 'Jefe LOG': 'jefelog01', 'Gerente de Dist. y Ventas': 'gerente01', 'Transportista': 'transp01' };

  // ───────────────────────── persistencia ─────────────────────────
  E.guardar = () => {
    try { localStorage.setItem(CLAVE, JSON.stringify({ st: E.st, ui: E.ui })); } catch (e) { /* sin almacenamiento */ }
  };
  E.cargar = () => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.st && d.st.version === 5) { E.st = d.st; E.ui = Object.assign(E.ui, d.ui || {}); return; }
      }
    } catch (e) { /* sin almacenamiento */ }
    E.reiniciar(true);
  };

  const ok = msg => ({ ok: true, msg });
  const error = msg => ({ ok: false, msg });
  const sigId = lista => lista.reduce((m, x) => Math.max(m, x.id), 0) + 1;

  E.log = (accion, detalle) => {
    E.st.bitacora.unshift({ fecha: new Date().toISOString().slice(0, 19).replace('T', ' '), usuario: E.ui.usuario, rol: E.ui.rol, modo: E.ui.modo, accion, detalle });
    if (E.st.bitacora.length > 300) E.st.bitacora.length = 300;
  };

  E.setModo = modo => { E.ui.modo = modo; E.guardar(); return ok(`Modo ${modo === 'V1' ? 'V1 (comportamiento actual)' : 'propuesto'} activado.`); };
  E.setRol = rol => { E.ui.rol = rol; E.ui.usuario = USUARIOS[rol]; E.guardar(); return ok(`Usuario simulado: ${E.ui.usuario} (${rol}).`); };

  // ───────────────────────── creación de registros ─────────────────────────
  function crearLote(terminalId, productoId, fecha) {
    const st = E.st;
    const existente = st.lotes.find(l => l.localidadId === terminalId && l.productoId === productoId && l.fecha === fecha);
    if (existente) return existente;
    const correlativo = st.lotes.filter(l => l.localidadId === terminalId && l.productoId === productoId).length + 1;
    const prod = M.porId(st.productos, productoId), loc = M.porId(st.localidades, terminalId);
    const lote = { id: sigId(st.lotes), codigo: `OT-CIS-${prod.codigo}-${correlativo}-${fecha.slice(2, 4)}-${loc.codigo}`, localidadId: terminalId, productoId, fecha };
    st.lotes.push(lote);
    return lote;
  }

  function crearCREDespacho(orden, det, fecha) {
    const st = E.st;
    const terminal = M.porId(st.localidades, orden.terminalId);
    const lote = crearLote(orden.terminalId, det.productoId, fecha);
    const cre = {
      id: sigId(st.cres), numero: `${terminal.codigoCRE}-${st.nroCREProximo++}`, tipo: 3, estadoId: 1,
      fecha, fechaDespacho: fecha, productoId: det.productoId, cisternaId: det.cisternaId, conductorId: det.conductorId,
      origenId: orden.terminalId, destinoId: det.destinoId, volumen: det.volumen, loteCodigo: lote.codigo,
      planViaje: `PV-${String(orden.nro).padStart(4, '0')}-${det.id}`, ordenDetalleId: det.id
    };
    st.cres.push(cre);
    det.creDespachoId = cre.id;
    return cre;
  }

  function crearRecepciones(despachos, volumenes, fecha) {
    const st = E.st;
    const d0 = despachos[0];
    const destino = M.porId(st.localidades, d0.destinoId);
    return volumenes.map(vol => {
      const rec = {
        id: sigId(st.cres), numero: `${destino.codigoCRE}-${st.nroCREProximo++}`, tipo: 8, estadoId: 1,
        fecha, fechaLlegada: fecha, productoId: d0.productoId, cisternaId: d0.cisternaId,
        origenId: d0.origenId, destinoId: d0.destinoId, volumen: vol, loteCodigo: d0.loteCodigo
      };
      st.cres.push(rec);
      despachos.forEach(d => st.asociaciones.push({ recepcionId: rec.id, despachoId: d.id }));
      return rec;
    });
  }

  function nuevaOrden(terminalId, fecha, estado) {
    const st = E.st;
    const o = { id: sigId(st.ordenes), nro: null, terminalId, fecha, estado: estado || 'EN ELABORACION', detalles: [], historial: [], origen: 'SILOG' };
    if (estado && estado !== 'EN ELABORACION' && estado !== 'PENDIENTE DE APROBACION') o.nro = st.nroOrdenProximo[terminalId]++;
    st.ordenes.push(o);
    return o;
  }

  function nuevoDetalle(orden, d) {
    const st = E.st;
    const id = st.ordenes.reduce((m, o) => Math.max(m, ...o.detalles.map(x => x.id), 0), 0) + 1;
    const det = Object.assign({ id, hojaRuta: 50000 + id, creDespachoId: null, tarifaAsociadaId: null, tarifaAdjudicada: null }, d);
    orden.detalles.push(det);
    return det;
  }

  // ───────────────────────── construcción de escenarios ─────────────────────────
  // Construye desde cero el escenario indicado (o el elegido en la cabecera) y lo deja como estado actual.
  E.reiniciar = (silencioso, escenarioId) => {
    const esc = SILOG.escenarioPorId(escenarioId || E.ui.escenario || 'GENERAL');
    E.ui.escenario = esc.id;
    E.ui.guion = E.ui.guion || {};
    E.ui.guion[esc.id] = [];
    E.ui.visitadas = [];
    E.ui.tour = { activo: !!esc.tour && !!(E.ui.tour && E.ui.tour.activo), paso: 0 };
    E.st = SILOG.crearEscenario();
    const st = E.st;
    st.escenarioId = esc.id;
    if (esc.preparar) esc.preparar(st, M);

    // Viajes ya ocurridos: orden liberada, CRE de despacho, recepciones y multas por CRE.
    const ordenes = {};
    let pendientes = [];
    (esc.viajes || []).forEach(v => {
      if (!ordenes[v.orden]) ordenes[v.orden] = nuevaOrden(v.terminal, v.fecha, 'LIBERADO');
      const o = ordenes[v.orden];
      const cis = M.porId(st.cisternas, v.cisterna);
      const conductor = v.conductor || st.conductores.find(c => c.transportistaId === cis.transportistaId).id;
      const det = nuevoDetalle(o, { destinoId: v.destino, productoId: v.producto, transportistaId: cis.transportistaId, cisternaId: v.cisterna, conductorId: conductor, volumen: v.vol, nota: v.nota });
      if (v.tarifaAsociada) {
        const c = M.contratoVigente(st, cis.transportistaId, v.fecha);
        const ta = st.tarifas.find(t => t.contratoId === c.id && t.origenId === v.terminal && t.destinoId === v.destino && t.productoId === v.producto && t.prioridad === v.tarifaAsociada);
        det.tarifaAsociadaId = ta ? ta.id : null;
      }
      const desp = crearCREDespacho(o, det, v.fecha);
      desp.historico = v.historico || null;
      (v.multas || []).forEach(mu => {
        const m = st.multasCatalogo.find(x => x.id === mu.id);
        st.multasCRE.push({ creId: desp.id, multaId: m.id, entrada: mu.entrada, valor: m.valor, moneda: m.moneda, tc: st.tc, total: M.calcularMultaCRE(m, mu.entrada, st.tc, desp.volumen) });
      });
      if (v.grupo) pendientes.push(desp);
      if (v.rec) crearRecepciones([desp], v.rec.map(r => r.vol), v.rec[0].fecha);
      if (v.recGrupo) { crearRecepciones(pendientes, v.recGrupo.map(r => r.vol), v.recGrupo[0].fecha); pendientes = []; }
    });

    // Órdenes sin CRE, para recorrer sus estados.
    (esc.ordenes || []).forEach(od => {
      const o = nuevaOrden(od.terminal, od.fecha, od.estado);
      od.detalles.forEach(d => {
        const cis = M.porId(st.cisternas, d.cisterna);
        nuevoDetalle(o, { destinoId: d.destino, productoId: d.producto, transportistaId: cis.transportistaId, cisternaId: cis.id,
          conductorId: d.conductor || st.conductores.find(c => c.transportistaId === cis.transportistaId).id, volumen: d.vol });
      });
      o.historial.push({ fecha: st.hoy, usuario: 'analista01', estado: o.estado });
    });

    // Conciliaciones históricas: se generan con el motor (modo V1) y se llevan al estado indicado.
    (esc.historicos || []).forEach(h => {
      const marcadas = st.cres.filter(c => c.tipo === 8 && M.despachosDe(st, c.id).some(d => d.historico === h.marca)).map(c => c.id);
      const g = M.recepcionesSinConciliar(st, 3, 'PROPUESTO').grupos.find(x => x.recepciones.some(r => marcadas.includes(r.recepcion.id)));
      if (!g) return;
      const recs = M.recepcionesSinConciliar(st, 3, 'V1').grupos.find(x => x.clave === g.clave).recepciones.filter(r => marcadas.includes(r.recepcion.id));
      const conc = construirConciliacion(g, recs, 'Bs', 'V1', h.numero);
      conc.fecha = M.sumarDias(M.periodoQuincena(g.anio, g.mes, g.quincena)[1], 2);
      conc.historial = [{ fecha: conc.fecha, usuario: 'analista01', accion: 'Generada', estado: 'En Elaboracion' }];
      M.ESTADOS.slice(1, M.ESTADOS.indexOf(h.estado) + 1).forEach((e, i) =>
        conc.historial.push({ fecha: M.sumarDias(conc.fecha, i + 1), usuario: e.includes('Transportista') ? 'transp01' : 'jefelog01', accion: '→ ' + e, estado: e }));
      conc.estado = h.estado;
      (h.recargos || []).forEach(catId => {
        const cat = st.recargosCatalogo.find(r => r.id === catId);
        conc.recargos.push({ id: catId, tipo: 'CCIST', catalogoId: catId, concepto: cat.concepto, monto: cat.monto, creId: conc.lineas[0].despachoId, factura: '' });
      });
      if (h.facturaMermas) conc.facturaMermas = h.facturaMermas;
      const deriv = M.recalcular(st, conc, 'V1');
      conc.totales = deriv.cab;
      if (h.facturasPagadas === false) conc.facturasPagadas = false;
      if (M.ESTADOS.indexOf(h.estado) >= 2) conc.sap = M.generarSAP(st, conc, deriv);
      if (conc.sap && h.sap) conc.sap.estado = h.sap;
      st.conciliaciones.push(conc);
    });

    st.ofertas.push(JSON.parse(JSON.stringify(SILOG.ofertaInicial)));
    E.log('Escenario', `Escenario cargado: ${esc.nombre}.`);
    E.guardar();
    return silencioso ? null : ok(`Escenario reiniciado: ${esc.nombre}.`);
  };

  E.cargarEscenario = id => E.reiniciar(false, id);
  E.marcarPaso = (indice, hecho) => {
    const lista = E.ui.guion[E.ui.escenario] || (E.ui.guion[E.ui.escenario] = []);
    E.ui.guion[E.ui.escenario] = hecho ? [...new Set(lista.concat(indice))] : lista.filter(i => i !== indice);
    E.guardar();
  };

  function construirConciliacion(grupo, recepcionesSel, moneda, modo, numero) {
    const st = E.st;
    const c = grupo.contrato;
    const conc = {
      id: sigId(st.conciliaciones), numero: numero || st.nroConcProximo++, transportistaId: grupo.transportistaId,
      area: grupo.area, anio: grupo.anio, mes: grupo.mes, quincena: grupo.quincena, moneda,
      contratoId: c ? c.id : null, nroContratoMarco: c && c.marco ? c.marco.numero : null,
      estado: 'En Elaboracion', fecha: st.hoy, generadoEn: modo,
      lineas: [].concat(...recepcionesSel.map(r => r.lineas.map(l => Object.assign({}, l)))),
      ajustes: {}, recargos: [], historial: [], facturaMermas: '', facturaIncumplimiento: '', facturasPagadas: true, sap: null, disputas: {}
    };
    conc.totales = M.recalcular(st, conc, modo).cab;
    return conc;
  }

  // ───────────────────────── tarifario ─────────────────────────
  E.agregarTarifa = d => {
    const st = E.st;
    const c = M.porId(st.contratos, d.contratoId);
    if (!c) return error('Seleccione un contrato.');
    if (Number(d.origenId) === Number(d.destinoId)) return error('El origen y el destino deben ser distintos.');
    if (!(Number(d.tarifa) > 0)) return error('La tarifa debe ser mayor a 0.');
    const t = { id: sigId(st.tarifas), contratoId: c.id, origenId: Number(d.origenId), destinoId: Number(d.destinoId), productoId: Number(d.productoId),
      tarifa: Number(d.tarifa), admisible: Number(d.admisible) || 0, prioridad: d.prioridad || 'PRINCIPAL', vigInicio: d.vigInicio || c.vigInicio, estado: true, aprobada: true };
    st.tarifas.push(t);
    E.log('Tarifa', `Tarifa #${t.id} ${M.nombreLoc(st, t.origenId)}→${M.nombreLoc(st, t.destinoId)} ${t.tarifa} Bs/m³ agregada al contrato ${c.numero}.`);
    E.guardar();
    return ok(`Tarifa #${t.id} registrada.`);
  };
  E.alternarTarifa = id => {
    const t = M.porId(E.st.tarifas, id);
    t.estado = !t.estado;
    E.log('Tarifa', `Tarifa #${t.id} ${t.estado ? 'activada' : 'dada de baja'}.`);
    E.guardar();
    return ok(`Tarifa #${t.id} ${t.estado ? 'activada' : 'dada de baja'}.`);
  };

  // ───────────────────────── órdenes de despacho (RN-OD) ─────────────────────────
  E.crearOrden = d => {
    if (!d.terminalId || !d.fecha) return error('Indique terminal y fecha.');
    const o = nuevaOrden(Number(d.terminalId), d.fecha);
    o.historial.push({ fecha: E.st.hoy, usuario: E.ui.usuario, estado: o.estado });
    E.log('Orden de despacho', `Orden #${o.id} creada en ${M.nombreLoc(E.st, o.terminalId)}.`);
    E.guardar();
    return Object.assign(ok(`Orden creada (id ${o.id}). Agregue el detalle.`), { id: o.id });
  };
  E.agregarDetalleOrden = (ordenId, d) => {
    const st = E.st;
    const o = M.porId(st.ordenes, ordenId);
    if (o.estado !== 'EN ELABORACION') return error('Solo se agrega detalle a órdenes EN ELABORACION.');
    const cis = M.porId(st.cisternas, d.cisternaId);
    if (!d.destinoId || !d.productoId || !cis || !d.conductorId) return error('Complete destino, producto, cisterna y conductor.');
    if (Number(d.destinoId) === o.terminalId) return error('El destino debe ser distinto de la terminal de origen.');
    const vol = Number(d.volumen);
    if (!(vol > 0)) return error('DEBE INGRESAR EL VOLUMEN');
    if (vol > cis.capacidad) return error(`El volumen supera la capacidad de la cisterna (${M.fmtN(cis.capacidad)} L).`);
    nuevoDetalle(o, { destinoId: Number(d.destinoId), productoId: Number(d.productoId), transportistaId: cis.transportistaId, cisternaId: cis.id, conductorId: Number(d.conductorId), volumen: vol, tarifaAsociadaId: d.tarifaAsociadaId ? Number(d.tarifaAsociadaId) : null });
    E.log('Orden de despacho', `Detalle agregado a la orden #${o.id}: ${cis.placa}, ${M.fmtN(vol)} L.`);
    E.guardar();
    return ok('Detalle agregado.');
  };
  E.quitarDetalleOrden = (ordenId, detId) => {
    const o = M.porId(E.st.ordenes, ordenId);
    const d = o.detalles.find(x => x.id === detId);
    if (d.creDespachoId) return error('El detalle ya tiene CRE.');
    o.detalles = o.detalles.filter(x => x.id !== detId);
    E.guardar();
    return ok('Detalle eliminado.');
  };
  E.ACCIONES_ORDEN = [
    { accion: 'Solicitar Aprobacion', desde: 'EN ELABORACION', hacia: 'PENDIENTE DE APROBACION' },
    { accion: 'Aprobar Orden Despacho', desde: 'PENDIENTE DE APROBACION', hacia: 'APROBADO' },
    { accion: 'Rechazar Orden Despacho', desde: 'PENDIENTE DE APROBACION', hacia: 'EN ELABORACION' },
    { accion: 'Liberar Orden Despacho', desde: 'APROBADO', hacia: 'LIBERADO' }
  ];
  E.estadoOrden = (ordenId, accion) => {
    const st = E.st;
    const o = M.porId(st.ordenes, ordenId);
    const def = E.ACCIONES_ORDEN.find(a => a.accion === accion);
    if (o.estado !== def.desde) return error(`NO PUEDE '${accion.toUpperCase()}' POR QUE EL ESTADO DE LA ORDEN DE DESPACHO SE ENCUENTRA '${o.estado}'`);
    if (accion === 'Solicitar Aprobacion' && !o.detalles.length) return error('La orden no tiene detalle.');
    if (accion === 'Liberar Orden Despacho' && !o.detalles.some(d => d.creDespachoId)) return error('NO EXISTE AL MENOS UN CRE EN EL DETALLE DE LA ORDEN DE DESPACHO, DEBE DE ANULAR LA ORDEN');
    o.estado = def.hacia;
    let extra = '';
    if (accion === 'Aprobar Orden Despacho') {
      o.nro = st.nroOrdenProximo[o.terminalId] = (st.nroOrdenProximo[o.terminalId] || 1);
      st.nroOrdenProximo[o.terminalId]++;
      const empresas = [...new Set(o.detalles.map(d => d.transportistaId))].map(id => M.porId(st.transportistas, id));
      extra = ` Correo "Nómina Autorizada de Carga" enviado a: ${empresas.map(e => e.correo).join(', ')}.`;
    }
    o.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, estado: o.estado });
    E.log('Orden de despacho', `Orden #${o.id}: ${accion} → ${o.estado}.${extra}`);
    E.guardar();
    return ok(`Orden ${o.nro ? 'N° ' + o.nro : '#' + o.id} en estado ${o.estado}.${extra}`);
  };
  E.crearCREs = (ordenId, detIds, fecha) => {
    const st = E.st;
    const o = M.porId(st.ordenes, ordenId);
    if (!['APROBADO'].includes(o.estado)) return error('Solo se crean CRE de órdenes APROBADAS.');
    const dets = o.detalles.filter(d => detIds.includes(d.id) && !d.creDespachoId);
    if (!dets.length) return error('DEBE SELECCIONAR AL MENOS UN DESPACHO');
    const p = dets[0];
    if (dets.some(d => d.productoId !== p.productoId)) return error('DEBE SELECCIONAR DESPACHOS DEL MISMO PRODUCTO');
    if (dets.some(d => d.transportistaId !== p.transportistaId)) return error('DEBE SELECCIONAR DESPACHOS DE LA MISMA EMPRESA');
    if (dets.some(d => d.destinoId !== p.destinoId)) return error('DEBE SELECCIONAR DESPACHOS AL MISMO DESTINO');
    const creados = dets.map(d => crearCREDespacho(o, d, fecha || o.fecha));
    E.log('CRE', `CRE de despacho ${creados.map(c => c.numero).join(', ')} creados desde la orden N° ${o.nro}; hoja de ruta EN TRANSITO.`);
    E.guardar();
    return ok(`CRE creados: ${creados.map(c => c.numero).join(', ')}.`);
  };

  // ───────────────────────── recepción (RN-CRE-01) ─────────────────────────
  E.registrarRecepcion = (despIds, volumenesTexto, fecha) => {
    const st = E.st;
    const desp = despIds.map(id => M.porId(st.cres, id));
    if (!desp.length) return error('Seleccione al menos un despacho en tránsito.');
    if (desp.some(d => d.productoId !== desp[0].productoId || d.destinoId !== desp[0].destinoId || d.cisternaId !== desp[0].cisternaId))
      return error('Los despachos a recepcionar juntos deben tener la misma cisterna, producto y destino.');
    const vols = String(volumenesTexto).split(/[;,\s]+/).map(Number).filter(v => v > 0);
    if (!vols.length) return error('Indique el volumen recibido (uno por tanque, separados por coma).');
    if (desp.length > 1 && vols.length > 1) return error('V1 no admite varios despachos repartidos en varias recepciones a la vez.');
    if (!fecha) return error('Indique la fecha de recepción.');
    if (desp.some(d => fecha < d.fecha)) return error('La recepción no puede ser anterior al despacho.');
    const recs = crearRecepciones(desp, vols, fecha);
    E.log('CRE', `Recepción ${recs.map(r => r.numero).join(', ')} asociada a ${desp.map(d => d.numero).join(', ')}.`);
    E.guardar();
    return ok(`Recepción registrada: ${recs.map(r => r.numero + ' (' + M.fmtN(r.volumen) + ' L)').join(', ')}.`);
  };

  // ───────────────────────── multas por CRE (RN-MUL) ─────────────────────────
  E.registrarMultasCRE = (creId, entradas, tc) => {
    const st = E.st;
    const conc = st.conciliaciones.find(c => c.lineas.some(l => l.despachoId === creId));
    if (conc && conc.estado !== 'En Elaboracion') return error(`La conciliación N° ${conc.numero} que contiene este despacho está "${conc.estado}"; no se pueden modificar sus multas.`);
    const desp = M.porId(st.cres, creId);
    st.multasCRE = st.multasCRE.filter(m => m.creId !== creId);
    let total = 0;
    st.multasCatalogo.forEach(m => {
      const e = entradas[m.id];
      if (!e) return;
      const t = M.calcularMultaCRE(m, e, Number(tc), desp.volumen);
      if (t) { st.multasCRE.push({ creId, multaId: m.id, entrada: e, valor: m.valor, moneda: m.moneda, tc: Number(tc), total: t }); total += t; }
    });
    E.log('Multas por CRE', `CRE ${desp.numero}: total ${M.fmtB(total)} Bs.`);
    E.guardar();
    return ok(`Multas registradas para ${desp.numero}: ${M.fmtB(total)} Bs.`);
  };

  // ───────────────────────── generación (RN-GEN) ─────────────────────────
  E.generar = (area, selecciones) => {
    const st = E.st;
    const modo = E.ui.modo;
    const { grupos } = M.recepcionesSinConciliar(st, area, modo);
    const elegidos = selecciones.filter(s => s.marcado);
    if (!elegidos.length) return error('DEBE SELECCIONAR COMO MÍNIMO UNA EMPRESA.');
    const nuevas = [];
    for (const s of elegidos) {
      const g = grupos.find(x => x.clave === s.clave);
      if (!g) return error('El grupo ya no está disponible; actualice la vista.');
      const recs = g.recepciones.filter(r => s.recepciones.includes(r.recepcion.id));
      const err = M.validarGeneracion(st, g, recs, s.moneda);
      if (err) { nuevas.forEach(n => { st.conciliaciones = st.conciliaciones.filter(c => c !== n); }); return error(err); }
      const conc = construirConciliacion(g, recs, s.moneda, modo);
      conc.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, accion: 'Generada', estado: 'En Elaboracion' });
      st.conciliaciones.push(conc);
      nuevas.push(conc);
    }
    E.log('Conciliación', `Generadas: ${nuevas.map(c => 'N° ' + c.numero).join(', ')}.`);
    E.guardar();
    return Object.assign(ok(`CONCILIACIONES GENERADAS CORRECTAMENTE: ${nuevas.map(c => 'N° ' + c.numero).join(', ')}.`), { ids: nuevas.map(c => c.id) });
  };

  // ───────────────────────── edición de la conciliación ─────────────────────────
  E.ajustar = (concId, key, campo, valor) => {
    const conc = M.porId(E.st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error("LA CONCILIACIÓN NO PUEDE MODIFICARSE YA QUE NO SE ENCUENTRA 'EN ELABORACIÓN'..");
    conc.ajustes[key] = conc.ajustes[key] || {};
    if (campo === 'liberarMerma') conc.ajustes[key][campo] = !!valor;
    else if (campo === 'observacion') conc.ajustes[key][campo] = valor;
    else {
      const n = valor === '' ? 0 : Number(valor);
      if (isNaN(n) || n < 0) return error(campo === 'tarifaEspecial' ? 'INTRODUZCA UN VALOR NUMÉRICO EN TARIFA ESPECIAL..' : 'INTRODUZCA UN VALOR NUMÉRICO EN EL CAMPO DE LIBERACIÓN DE CAPACIDAD..');
      conc.ajustes[key][campo] = n || 0;
    }
    if (E.ui.modo === 'PROPUESTO') {
      conc.ajustes[key].auditoria = conc.ajustes[key].auditoria || [];
      conc.ajustes[key].auditoria.push({ fecha: E.st.hoy, usuario: E.ui.usuario, campo, valor });
    }
    E.log('Ajuste', `Conc. N° ${conc.numero}, línea ${key}: ${campo} = ${valor}.`);
    E.guardar();
    return ok('Ajuste registrado y recalculado en pantalla. Pulse "Calcular y procesar" para guardar los totales de la conciliación.');
  };
  E.cambiarTarifaLinea = (concId, key, prioridad) => {
    const st = E.st;
    const conc = M.porId(st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error("LA CONCILIACIÓN NO PUEDE MODIFICARSE YA QUE NO SE ENCUENTRA 'EN ELABORACIÓN'..");
    const l = conc.lineas.find(x => x.key === key);
    const desp = M.porId(st.cres, l.despachoId), rec = M.porId(st.cres, l.recepcionId);
    const t = M.tarifaVigente(st, { transportistaId: conc.transportistaId, origenId: desp.origenId, destinoId: rec.destinoId, productoId: rec.productoId, fecha: rec.fecha, prioridad });
    if (!t) return error(`No existe tarifa ${prioridad} vigente para esta ruta.`);
    l.tarifa = t.tarifa / 1000; l.tarifaM3 = t.tarifa; l.tarifaFuente = 'CONTRATO ' + prioridad; l.tarifaId = t.id;
    if (l.ultima) { l.totalFlete = M.redHU(l.volRec * l.tarifa); l.totalFacturar = M.redHU(l.totalFlete + l.cdBs); }
    l.traza = l.traza.concat([`Tarifa cambiada manualmente a ${prioridad}: ${t.tarifa} Bs/m³.`]);
    E.log('Ajuste', `Conc. N° ${conc.numero}, línea ${key}: tarifa ${prioridad} ${t.tarifa} Bs/m³.`);
    E.guardar();
    return ok(`Tarifa ${prioridad} aplicada (${t.tarifa} Bs/m³).`);
  };
  E.facturas = (concId, campo, valor) => {
    const conc = M.porId(E.st.conciliaciones, concId);
    if (!['En Elaboracion', 'Aprobada Por Transportista'].includes(conc.estado)) return error('Los números de factura solo se registran en elaboración o con la aprobación del transportista.');
    conc[campo] = valor;
    E.guardar();
    return ok('Número de factura registrado.');
  };
  E.procesar = concId => {
    const st = E.st;
    const conc = M.porId(st.conciliaciones, concId);
    if (conc.estado === 'Aprobada Por Transportista') {
      E.log('Conciliación', `Conc. N° ${conc.numero}: números de factura registrados.`);
      E.guardar();
      return ok('NÚMERO DE FACTURA COMERCIAL REGISTRADO..');
    }
    if (conc.estado !== 'En Elaboracion') return error("LA CONCILIACIÓN NO PUEDE MODIFICARSE YA QUE NO SE ENCUENTRA 'EN ELABORACIÓN'..");
    const d = M.recalcular(st, conc, E.ui.modo);
    conc.totales = d.cab;
    conc.procesada = true;
    conc.facturasPagadas = !(Math.abs(d.cab.mermas) > st.umbralFacturas || Math.abs(d.cab.multaTransporte) > st.umbralFacturas);
    E.log('Conciliación', `Conc. N° ${conc.numero} procesada: neto ${M.fmtB(d.cab.neto)} ${conc.moneda}.${conc.facturasPagadas ? '' : ' Queda con factura impaga (supera el umbral).'}`);
    E.guardar();
    return ok('CONCILIACIÓN PROCESADA CORRECTAMENTE.' + (conc.facturasPagadas ? '' : ` Las mermas o multas superan ${M.fmtN(st.umbralFacturas)}: queda marcada con factura pendiente de pago.`));
  };

  E.transicion = (concId, accion) => {
    const st = E.st;
    const conc = M.porId(st.conciliaciones, concId);
    const deriv = M.recalcular(st, conc, E.ui.modo);
    const err = M.validarTransicion(st, conc, accion, E.ui.rol, E.ui.modo, deriv);
    if (err) return error(err);
    const def = M.ACCIONES.find(a => a.accion === accion);
    const notas = [];
    if (accion === 'Transportista Aprueba') {
      conc.sap = M.generarSAP(st, conc, deriv);
      notas.push(`SAP: cabecera ${conc.sap.texto} y ${conc.sap.detalle.length} líneas por producto en "Sin Registrar en SAP".`);
      if (deriv.cab.mermas) notas.push('Alerta enviada: emitir factura por mermas de transporte.');
      if (deriv.cab.multaTransporte) notas.push('Alerta enviada: emitir factura por incumplimiento de contrato.');
      notas.push('Alerta enviada: crear pedido en SAP.');
    }
    if (accion === 'Liberar Conciliacion') {
      const c = M.porId(st.contratos, conc.contratoId);
      if (c && c.marco) { c.marco.ejecutado[conc.anio] = M.redHU((c.marco.ejecutado[conc.anio] || 0) + deriv.cab.flete); notas.push(`Ejecución del contrato marco ${c.marco.numero} actualizada.`); }
    }
    if (accion === 'Rechazar Conciliacion' && ['Pendiente de Aprobacion', 'Pendiente de Liberacion', 'Liberado'].includes(conc.estado)) {
      notas.push('CONCILIACIÓN REVERTIDA AL ESTADO: \'EN ELABORACIÓN\', VERIFIQUE QUE LA CONCILIACIÓN TAMBIEN HAYA SIDO ANULADA EN SAP.');
    }
    if (E.ui.modo === 'V1' && !def.ofrecidaV1) notas.push('Atención: V1 no ofrece esta acción en la lista (está comentada en CargarEstadosOtorgados); el prototipo la ejecuta para mostrar su regla.');
    const antes = conc.estado;
    conc.estado = def.hacia;
    conc.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, accion, estado: conc.estado });
    E.log('Estado', `Conc. N° ${conc.numero}: ${antes} → ${conc.estado}. ${notas.join(' ')}`);
    E.guardar();
    return ok(`Conciliación N° ${conc.numero}: ${conc.estado}. ${notas.join(' ')}`);
  };

  // ───────────────────────── recargos (§4.6) ─────────────────────────
  E.alternarRecargo = (concId, catalogoId, creId) => {
    const st = E.st;
    const conc = M.porId(st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error('Los recargos solo se modifican con la conciliación en elaboración.');
    const cat = M.porId(st.recargosCatalogo, catalogoId);
    const tipo = cat.aplicabilidad === 'CONC' ? (cat.tipo === 'Multa' ? 'MC' : 'DC') : 'CCIST';
    const idx = conc.recargos.findIndex(r => r.catalogoId === cat.id && (r.creId || null) === (creId || null));
    if (idx >= 0) conc.recargos.splice(idx, 1);
    else conc.recargos.push({ id: Date.now(), tipo, catalogoId: cat.id, concepto: cat.concepto, monto: cat.monto, creId: creId || null, factura: '' });
    E.guardar();
    return ok(idx >= 0 ? 'Recargo quitado.' : 'Recargo aplicado.');
  };
  E.agregarCaso = (concId, d) => {
    const st = E.st;
    const conc = M.porId(st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error('Los casos especiales solo se modifican con la conciliación en elaboración.');
    const monto = Number(d.monto);
    if (!(monto > 0)) return error('Indique un monto mayor a 0.');
    const caso = M.porId(st.casosEspecialesCatalogo, d.casoId);
    conc.recargos.push({ id: Date.now(), tipo: d.tipo || 'CASO', casoId: caso ? caso.id : null, concepto: d.tipo === 'CG' ? 'Cobro por carro guía' : caso.nombre, monto, factura: d.factura || '', facturaPagada: monto < st.umbralFacturas });
    E.guardar();
    return ok('Registrado.');
  };
  E.quitarRecargo = (concId, id) => {
    const conc = M.porId(E.st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error('Solo en elaboración.');
    conc.recargos = conc.recargos.filter(r => r.id !== id);
    E.guardar();
    return ok('Quitado.');
  };

  // ───────────────────────── SAP y facturas ─────────────────────────
  // Circuito de Sincronizaciones_To_SAP: pedido, liberación, hoja de entrada de servicio y aceptación.
  E.sapAccion = (concId, accion) => {
    const st = E.st;
    const conc = M.porId(st.conciliaciones, concId);
    const err = M.validarSAP(st, conc, accion);
    if (err) return error(err);
    const def = M.SAP_ACCIONES.find(a => a.accion === accion);
    const antes = conc.estado;
    conc.sap.estado = def.hacia;
    if (accion === 'Crear pedido') conc.sap.pedido = '45000' + String(conc.numero).padStart(5, '0');
    if (accion === 'Registrar hoja de entrada') conc.sap.hoja = '10000' + String(conc.numero).padStart(5, '0');
    if (accion === 'Anular pedido') { conc.sap.pedido = ''; conc.sap.hoja = ''; }
    if (accion === 'Anular hoja') conc.sap.hoja = '';
    let nota = '';
    if (def.conc) {
      conc.estado = def.conc;
      conc.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, accion: 'SAP: ' + accion, estado: conc.estado });
      nota = ' Conciliación: ' + antes + ' → ' + conc.estado + '.';
      if (def.conc === 'Liberado') {
        const c = M.porId(st.contratos, conc.contratoId);
        if (c && c.marco) c.marco.ejecutado[conc.anio] = M.redHU((c.marco.ejecutado[conc.anio] || 0) + M.recalcular(st, conc, E.ui.modo).cab.flete);
      }
    } else if (accion === 'Anular aceptación') nota = ' La conciliación sigue "Liberado" (V1 no la revierte).';
    E.log('SAP', 'Conc. N° ' + conc.numero + ': ' + accion + ' → ' + def.hacia + '.' + nota);
    E.guardar();
    return ok('SAP: ' + accion + ' → "' + def.hacia + '".' + nota);
  };

  E.marcarFacturasPagadas = concId => {
    const conc = M.porId(E.st.conciliaciones, concId);
    conc.facturasPagadas = true;
    E.log('Facturas', `Conc. N° ${conc.numero}: facturas marcadas como pagadas.`);
    E.guardar();
    return ok('Facturas marcadas como pagadas.');
  };
  E.setUmbral = v => { E.st.umbralFacturas = Number(v) || 50000; E.guardar(); return ok(`Umbral de facturas: ${M.fmtN(E.st.umbralFacturas)}.`); };

  // ───────────────────────── portal del transportista (propuesta) ─────────────────────────
  E.disputar = (concId, key, motivo) => {
    const conc = M.porId(E.st.conciliaciones, concId);
    if (conc.estado !== 'En Aprobacion de Transportista') return error('Solo se disputan líneas en aprobación del transportista.');
    conc.disputas[key] = motivo;
    E.log('Disputa', `Conc. N° ${conc.numero}, línea ${key}: ${motivo}`);
    E.guardar();
    return ok('Disputa registrada; la conciliación vuelve a elaboración si se rechaza.');
  };

  // ───────────────────────── Conciliación Otros Transportes ─────────────────────────
  E.permisosOT = () => (E.st.permisosOT || {})[E.ui.rol] || {};
  E.tieneAccesoOT = () => M.PERMISOS_OT.some(p => E.permisosOT()[p]);
  E.setPermisoOT = (rol, permiso, valor) => {
    E.st.permisosOT[rol] = E.st.permisosOT[rol] || {};
    E.st.permisosOT[rol][permiso] = !!valor;
    E.guardar();
    return ok(`${permiso} ${valor ? 'otorgado a' : 'quitado a'} ${rol}.`);
  };
  const sinAcceso = () => error('SinAcceso.aspx: el usuario no tiene permisos en CONFIGURACION_CONCILIACIONES para este tipo y área.');
  function reprocesar(conc) { conc.totales = M.recalcular(E.st, conc, 'V1').cab; }

  // btnProcesar_Click (593-775). edits[recepcionId] = { liberarMerma, liberarCapacidad, tarifa, etiqueta, tarifaEspecial, observacion }.
  E.otProcesar = (concId, edits) => {
    const st = E.st, p = E.permisosOT();
    if (!E.tieneAccesoOT()) return sinAcceso();
    if (!p.PuedeProcesar) return error('El usuario no tiene el permiso PuedeProcesar (el botón no se muestra en V1).');
    const conc = M.porId(st.conciliaciones, concId);
    if (!conc) return error('DEBE SELECCIONAR UNA CONCILIACIÓN..');
    if (conc.estado === 'Aprobada Por Transportista') {
      E.log('Otros Transportes', `Conc. N° ${conc.numero}: datos de facturas actualizados.`);
      E.guardar();
      return ok('DATOS DE FACTURAS ACTUALIZADOS..');
    }
    if (conc.estado !== 'En Elaboracion') return error("LA CONCILIACIÓN NO PUEDE MODIFICARSE YA QUE NO SE ENCUENTRA 'EN ELABORACIÓN'.");
    M.otFilas(st, conc).forEach(f => {
      const e = edits[f.recepcionId] || {};
      const ls = conc.lineas.filter(l => l.recepcionId === f.recepcionId);
      const ult = ls[ls.length - 1];
      const volLib = Number(e.liberarCapacidad) > 0 ? Number(e.liberarCapacidad) : f.recepcion;
      const tarifa = e.tarifa !== undefined && e.tarifa !== '' ? Number(e.tarifa) : f.tarifa;
      ls.forEach(l => {
        conc.ajustes[l.key] = conc.ajustes[l.key] || {};
        conc.ajustes[l.key].liberarMerma = e.liberarMerma !== undefined ? !!e.liberarMerma : f.liberarMerma;
        if (l.tarifa !== tarifa) { l.tarifa = tarifa; l.tarifaM3 = M.redHU(tarifa * 1000, 2); l.tarifaFuente = 'LISTA ' + (e.etiqueta || 'P'); }
      });
      const a = conc.ajustes[ult.key];
      a.liberarCapacidad = volLib === f.recepcion ? 0 : volLib;
      a.tarifaEspecial = Number(e.tarifaEspecial) > 0 ? Number(e.tarifaEspecial) : 0;
      if (e.observacion !== undefined) a.observacion = e.observacion;
    });
    reprocesar(conc);
    conc.procesada = true;
    E.log('Otros Transportes', `Conc. N° ${conc.numero} procesada: neto ${M.fmtB(conc.totales.neto)}.`);
    E.guardar();
    return ok('CONCILIACIÓN PROCESADA CORRECTAMENTE.');
  };

  // btnEliminar_Click (421-507): excluye la recepción y los recargos de sus CRE.
  E.otExcluir = (concId, recId) => {
    const st = E.st;
    if (!E.tieneAccesoOT()) return sinAcceso();
    const conc = M.porId(st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error("LA CONCILIACIÓN NO PUEDE MODIFICARSE YA QUE NO SE ENCUENTRA 'EN ELABORACIÓN'.");
    const cres = new Set([recId].concat(conc.lineas.filter(l => l.recepcionId === recId).map(l => l.despachoId)));
    conc.lineas.filter(l => l.recepcionId === recId).forEach(l => delete conc.ajustes[l.key]);
    conc.lineas = conc.lineas.filter(l => l.recepcionId !== recId);
    conc.recargos = conc.recargos.filter(r => !(r.creId && cres.has(r.creId)));
    reprocesar(conc);
    const rec = M.porId(st.cres, recId);
    E.log('Otros Transportes', `Conc. N° ${conc.numero}: recepción ${rec.numero} excluida.`);
    E.guardar();
    return ok('CRE EXCLUIDO CORRECTAMENTE.');
  };

  // ConciliacionOTDetalle (1003-1097): agrega recepciones a una conciliación existente.
  E.otAgregar = (concId, recIds, fi, ff) => {
    const st = E.st;
    if (!E.tieneAccesoOT()) return sinAcceso();
    const conc = M.porId(st.conciliaciones, concId);
    if (conc.estado !== 'En Elaboracion') return error("LA CONCILIACIÓN NO PUEDE MODIFICARSE YA QUE NO SE ENCUENTRA 'EN ELABORACIÓN'.");
    if (!recIds.length) return error('DEBE SELECCIONAR COMO MÍNIMO UNA RECEPCIÓN.');
    const cand = M.otCandidatas(st, conc, fi, ff).filter(r => recIds.includes(r.recepcion.id));
    if (cand.length !== recIds.length) return error('UNO DE LAS RECEPCIONES YA FUE INCLUIDA EN UNA CONCILIACIÓN, SE CANCELÓ LA SOLICITUD.');
    cand.forEach(r => r.lineas.forEach(l => conc.lineas.push(Object.assign({}, l))));
    reprocesar(conc);
    E.log('Otros Transportes', `Conc. N° ${conc.numero}: nuevo convoy con ${cand.map(r => r.recepcion.numero).join(', ')}.`);
    E.guardar();
    return ok(`Nuevo convoy agregado: ${cand.map(r => r.recepcion.numero).join(', ')}.`);
  };

  // btnAprobar_Click → PROCESAR_CONCILIACION_CISTERNA (944-1065).
  E.otAprobar = concId => {
    const st = E.st, p = E.permisosOT();
    if (!E.tieneAccesoOT()) return sinAcceso();
    const conc = M.porId(st.conciliaciones, concId);
    if (!M.otBotones(conc.estado, p).aprobar) return error(`El botón Aprobar no está disponible para "${conc.estado}" con los permisos del usuario.`);
    const antes = conc.estado;
    const notas = [];
    if (conc.estado === 'En Elaboracion') conc.estado = 'En Aprobacion de Transportista';
    else if (conc.estado === 'En Aprobacion de Transportista') {
      const deriv = M.recalcular(st, conc, 'V1');
      conc.estado = 'Aprobada Por Transportista';
      conc.sap = M.generarSAP(st, conc, deriv);
      notas.push(`SAP "${conc.sap.texto}" en "Sin Registrar en SAP".`, 'Correo "APROBADA PARA CREAR PEDIDO EN SAP" a los usuarios del área con rol SAP "Solicitar Aprobacion".');
      if (deriv.cab.mermas) notas.push('Alerta: factura por mermas.');
      if (deriv.cab.multaTransporte) notas.push('Alerta: factura por incumplimiento.');
      notas.push('Atención: lo aprobó un usuario de logística, no el transportista (D22).');
    } else if (conc.estado === 'Pendiente de Aprobacion') {
      const pend = M.facturasPendientes(st, conc);
      if (pend.length) return error(`Se Canceló la Solicitud, Existen Conciliaciones Pendiente de su Pago de Factura Mayores a ${M.fmtN(st.umbralFacturas)}: [${pend.map(c => 'Multa Transporte y/o Incumplimiento de Contrato Conc. ' + c.numero + ' ' + M.MESES[c.mes] + '-' + c.anio).join(', ')}]`);
      conc.estado = 'Pendiente de Liberacion';
    }
    conc.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, accion: 'Aprobar (Otros Transportes)', estado: conc.estado });
    E.log('Otros Transportes', `Conc. N° ${conc.numero}: ${antes} → ${conc.estado}. ${notas.join(' ')}`);
    E.guardar();
    return ok(`Conciliación N° ${conc.numero}: ${conc.estado}. ${notas.join(' ')}`);
  };

  // btnRechazar_Click (1356-1394): vuelve a elaboración sin verificar SAP.
  E.otRechazar = concId => {
    const st = E.st, p = E.permisosOT();
    if (!E.tieneAccesoOT()) return sinAcceso();
    const conc = M.porId(st.conciliaciones, concId);
    if (!M.otBotones(conc.estado, p).rechazar) return error(`El botón Rechazar no está disponible para "${conc.estado}" con los permisos del usuario.`);
    const antes = conc.estado;
    conc.estado = 'En Elaboracion';
    conc.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, accion: 'Rechazar (Otros Transportes)', estado: conc.estado });
    const nota = conc.sap ? ` El registro SAP queda en "${conc.sap.estado}" (V1 no lo verifica, D25).` : '';
    E.log('Otros Transportes', `Conc. N° ${conc.numero}: ${antes} → En Elaboracion.${nota}`);
    E.guardar();
    return ok(`Conciliación N° ${conc.numero}: En Elaboracion.${nota}`);
  };

  // ───────────────────────── simulador: viaje completo ─────────────────────────
  E.viajeCompleto = d => {
    const st = E.st;
    const cis = M.porId(st.cisternas, d.cisternaId);
    if (!cis) return error('Seleccione la cisterna.');
    const vd = Number(d.volDespacho), fechaD = d.fechaDespacho, fechaR = d.fechaRecepcion;
    if (!(vd > 0) || vd > cis.capacidad) return error(`El volumen despachado debe estar entre 1 y ${M.fmtN(cis.capacidad)} L.`);
    if (Number(d.origenId) === Number(d.destinoId)) return error('El origen y el destino deben ser distintos.');
    if (!fechaD || !fechaR || fechaR < fechaD) return error('La recepción debe ser igual o posterior al despacho.');
    const conductor = st.conductores.find(c => c.transportistaId === cis.transportistaId);
    const o = nuevaOrden(Number(d.origenId), fechaD, 'APROBADO');
    const det = nuevoDetalle(o, { destinoId: Number(d.destinoId), productoId: Number(d.productoId), transportistaId: cis.transportistaId, cisternaId: cis.id, conductorId: conductor.id, volumen: vd, nota: 'Creado en el simulador' });
    const desp = crearCREDespacho(o, det, fechaD);
    const vols = String(d.volRecepcion).split(/[;,\s]+/).map(Number).filter(v => v > 0);
    const recs = vols.length ? crearRecepciones([desp], vols, fechaR) : [];
    o.estado = 'LIBERADO';
    o.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, estado: 'LIBERADO' });
    E.log('Simulador', `Viaje ${M.nombreLoc(st, o.terminalId)} → ${M.nombreLoc(st, det.destinoId)}: orden N° ${o.nro}, despacho ${desp.numero}, recepción ${recs.map(r => r.numero).join(', ') || 'pendiente'}.`);
    E.guardar();
    return ok(`Viaje registrado: orden N° ${o.nro} (${M.nombreLoc(st, o.terminalId)}), CRE despacho ${desp.numero}${recs.length ? ', CRE recepción ' + recs.map(r => r.numero).join(', ') : ' (en tránsito)'}. Ya aparece en "Detalle sin conciliar"${recs.length ? '' : ' cuando se recepcione'}.`);
  };

  // ───────────────────────── DESTINO: oferta, ranking y nominación (propuesta) ─────────────────────────
  E.tarifaPostulacion = (ofertaId, postId, tarifa) => {
    const o = M.porId(E.st.ofertas, ofertaId);
    if (o.estado !== 'PUBLICADA') return error('La oferta ya fue nominada.');
    const p = o.postulaciones.find(x => x.id === postId);
    p.tarifa = Number(tarifa) || 0;
    E.guardar();
    return ok('Tarifa propuesta actualizada.');
  };
  E.rankingOferta = oferta => [...oferta.postulaciones].filter(p => p.tarifa > 0)
    .sort((a, b) => a.tarifa - b.tarifa || b.cisternas - a.cisternas).map((p, i) => Object.assign({ puesto: i + 1 }, p));
  E.nominar = ofertaId => {
    const st = E.st;
    const of = M.porId(st.ofertas, ofertaId);
    if (of.estado !== 'PUBLICADA') return error('La oferta ya fue nominada.');
    const ranking = E.rankingOferta(of);
    let restante = of.volumen;
    const orden = nuevaOrden(of.origenId, of.fechaInicio, 'EN ELABORACION');
    orden.origen = 'DESTINO ' + of.codigo;
    ranking.forEach(p => {
      if (restante <= 0) { of.postulaciones.find(x => x.id === p.id).estado = 'NO NOMINADA'; return; }
      const cisternas = st.cisternas.filter(c => c.transportistaId === p.transportistaId).sort((a, b) => b.capacidad - a.capacidad);
      const conductor = st.conductores.find(c => c.transportistaId === p.transportistaId);
      let asignado = 0;
      for (const c of cisternas) {
        if (restante <= 0 || asignado >= p.volumen) break;
        const vol = Math.min(c.capacidad, restante, p.volumen - asignado);
        nuevoDetalle(orden, { destinoId: of.destinoId, productoId: of.productoId, transportistaId: p.transportistaId, cisternaId: c.id, conductorId: conductor.id, volumen: vol, tarifaAdjudicada: p.tarifa, admisibleAdjudicado: 0.30, nota: `Nominado desde ${of.codigo}, puesto ${p.puesto}` });
        restante -= vol; asignado += vol;
      }
      of.postulaciones.find(x => x.id === p.id).estado = asignado ? `NOMINADA (${M.fmtN(asignado)} L a ${p.tarifa} Bs/m³)` : 'NO NOMINADA';
    });
    of.estado = 'NOMINADA';
    of.ordenId = orden.id;
    orden.historial.push({ fecha: st.hoy, usuario: E.ui.usuario, estado: orden.estado });
    E.log('DESTINO → LEGACY', `Oferta ${of.codigo} nominada; orden de despacho #${orden.id} creada en LEGACY con tarifas adjudicadas.`);
    E.guardar();
    return Object.assign(ok(`Nominación registrada. Se creó la orden de despacho #${orden.id} EN ELABORACION con ${orden.detalles.length} detalles y la tarifa adjudicada de cada empresa.`), { ordenId: orden.id });
  };
})(SILOG.estado = {});

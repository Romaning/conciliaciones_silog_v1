/*
 * Motor de cálculo de conciliaciones de cisterna.
 * Replica las reglas de SILOG_V1 (modo 'V1') y aplica las mejoras propuestas (modo 'PROPUESTO').
 * Cada regla está descrita en CONCILIACIONES_V1_REGLAS_Y_FLUJO.md con su evidencia.
 * Este archivo no modifica el estado: solo calcula y valida.
 */
window.SILOG = window.SILOG || {};

(function (M) {
  const EPS = 1e-7;

  // ───────────────────────── utilidades ─────────────────────────
  M.porId = (lista, id) => lista.find(x => x.id === Number(id));
  M.diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  M.sumarDias = (fecha, dias) => {
    const d = new Date(Date.parse(fecha) + dias * 86400000);
    return d.toISOString().slice(0, 10);
  };
  M.quincena = fecha => (Number(fecha.slice(8, 10)) < 16 ? 1 : 2);
  M.periodoQuincena = (anio, mes, q) => {
    const fin = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const mm = String(mes).padStart(2, '0');
    return q === 1 ? [`${anio}-${mm}-01`, `${anio}-${mm}-15`] : [`${anio}-${mm}-16`, `${anio}-${mm}-${fin}`];
  };
  M.MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ───────────────────────── redondeos (§3.2) ─────────────────────────
  // ObtenerValorA2Decimales: trunca a 2 decimales.
  M.trunc2 = v => Math.sign(v) * Math.floor(Math.abs(v) * 100 + EPS) / 100;
  // RedondearHaciaAdelante(v, 2): punto medio hacia arriba (lejos de cero).
  M.redHU = (v, dec = 2) => {
    const f = Math.pow(10, dec);
    return Math.sign(v) * Math.round(Math.abs(v) * f + EPS) / f;
  };
  // RedondearHaciaAdelanteAdmisible: entero; sube si la parte decimal es > 0,49.
  M.redAdm = v => {
    const a = Math.abs(v);
    const frac = a - Math.floor(a);
    const r = frac > 0.49 + EPS ? Math.ceil(a) : Math.floor(a);
    return Math.sign(v) * r;
  };
  // CInt de VB: redondeo bancario (punto medio al par).
  M.cintBancario = v => {
    const f = Math.floor(v);
    const d = v - f;
    if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(v);
  };

  // ───────────────────────── contratos y tarifas ─────────────────────────
  // MC_ExisteContratoVigente / MC_ObtenerMonedaContratoEmpresa (simplificado).
  M.contratoVigente = (st, transportistaId, fecha) =>
    st.contratos.find(c => c.transportistaId === transportistaId && c.estado === 'LIBERADO' &&
      fecha >= c.vigInicio && fecha <= c.vigFin) || null;

  // RN-TAR-01: MC_DevolverTarifaVigente_OT.
  M.tarifaVigente = (st, q) => {
    const candidatas = st.tarifas.filter(t => {
      const c = M.porId(st.contratos, t.contratoId);
      return c && c.transportistaId === q.transportistaId && c.estado === 'LIBERADO' &&
        t.origenId === q.origenId && t.destinoId === q.destinoId && t.productoId === q.productoId &&
        t.prioridad === (q.prioridad || 'PRINCIPAL') && t.estado && t.aprobada &&
        q.fecha >= t.vigInicio && q.fecha <= c.vigFin;
    }).sort((a, b) => b.vigInicio.localeCompare(a.vigInicio));
    return candidatas[0] || null;
  };

  // Tarifa de una línea despacho–recepción. RN-TAR-02, RN-TAR-03 y propuesta §8.1.
  M.tarifaDelViaje = (st, desp, rec, modo) => {
    const traza = [];
    const det = desp.ordenDetalleId ? M.detalleOrden(st, desp.ordenDetalleId) : null;
    const trans = M.porId(st.cisternas, desp.cisternaId).transportistaId;
    const q = { transportistaId: trans, origenId: desp.origenId, destinoId: rec.destinoId, productoId: rec.productoId, fecha: rec.fecha };
    const vigente = M.tarifaVigente(st, q);
    if (modo === 'PROPUESTO' && det && det.tarifaAdjudicada) {
      traza.push(`Tarifa ADJUDICADA en la nominación de DESTINO: ${det.tarifaAdjudicada} Bs/m³.`);
      const adm = vigente ? vigente.admisible : (det.admisibleAdjudicado || 0.30);
      traza.push(vigente ? `Admisible tomado del contrato vigente: ${adm} %.` : `Sin tarifa de contrato: admisible de la oferta ${adm} %.`);
      return { tarifaM3: det.tarifaAdjudicada, tarifa: det.tarifaAdjudicada / 1000, admisible: adm, fuente: 'ADJUDICADA', tarifaId: null, traza };
    }
    if (det && det.tarifaAsociadaId) {
      const ta = M.porId(st.tarifas, det.tarifaAsociadaId);
      if (ta && ta.estado) {
        traza.push(`Hoja de ruta con tarifa asociada #${ta.id} (${ta.prioridad}): ${ta.tarifa} Bs/m³, admisible ${ta.admisible} % (RN-TAR-03).`);
        return { tarifaM3: ta.tarifa, tarifa: ta.tarifa / 1000, admisible: ta.admisible, fuente: 'ASOCIADA ' + ta.prioridad, tarifaId: ta.id, traza };
      }
    }
    traza.push(`Búsqueda por vigencia: empresa ${trans}, ${M.nombreLoc(st, q.origenId)} → ${M.nombreLoc(st, q.destinoId)}, producto ${M.nombreProd(st, q.productoId)}, fecha de recepción ${q.fecha}, prioridad PRINCIPAL (RN-TAR-01/02).`);
    if (!vigente) {
      traza.push('No hay tarifa vigente: V1 devuelve 0 y la línea queda con flete 0.');
      return { tarifaM3: 0, tarifa: 0, admisible: 0, fuente: 'SIN TARIFA', tarifaId: null, traza };
    }
    traza.push(`Tarifa #${vigente.id} del contrato ${M.porId(st.contratos, vigente.contratoId).numero}: ${vigente.tarifa} Bs/m³ → ${(vigente.tarifa / 1000).toFixed(5)} Bs/L; admisible ${vigente.admisible} %.`);
    return { tarifaM3: vigente.tarifa, tarifa: vigente.tarifa / 1000, admisible: vigente.admisible, fuente: 'CONTRATO PRINCIPAL', tarifaId: vigente.id, traza };
  };

  // ObtenerPrecioProducto: precio vigente a la fecha de carga; importado si el origen es extranjero.
  M.precioMulta = (st, productoId, fechaCarga, origenId) => {
    const origen = M.porId(st.localidades, origenId);
    if (origen && origen.nacional === 1) {
      const pi = st.preciosImportados.find(p => p.productoId === productoId && fechaCarga >= p.vigInicio && fechaCarga <= p.vigFin);
      if (!pi) return { ppt: 0, precioMulta: 0, fuente: 'Sin precio importado' };
      return { ppt: 0, precioMulta: M.redHU(pi.precio / 1000, 4), fuente: `Importado ${pi.precio} ${pi.moneda}/m³ desde ${pi.vigInicio}` };
    }
    const p = st.precios.filter(x => x.productoId === productoId && fechaCarga >= x.vigInicio)
      .sort((a, b) => b.vigInicio.localeCompare(a.vigInicio))[0];
    if (!p) return { ppt: 0, precioMulta: 0, fuente: 'Sin precio vigente' };
    return { ppt: p.ppt, precioMulta: p.precioMulta, fuente: `ProductoPrecio desde ${p.vigInicio}` };
  };

  // ───────────────────────── consultas de operación ─────────────────────────
  M.detalleOrden = (st, detalleId) => {
    for (const o of st.ordenes) {
      const d = o.detalles.find(x => x.id === detalleId);
      if (d) return Object.assign({ orden: o }, d);
    }
    return null;
  };
  M.nombreLoc = (st, id) => (M.porId(st.localidades, id) || {}).codigo || '?';
  M.nombreProd = (st, id) => (M.porId(st.productos, id) || {}).nombre || '?';
  M.transportistaDeCRE = (st, cre) => M.porId(st.cisternas, cre.cisternaId).transportistaId;
  M.despachosDe = (st, recId) => st.asociaciones.filter(a => a.recepcionId === recId).map(a => M.porId(st.cres, a.despachoId));
  M.recepcionesDe = (st, despId) => st.asociaciones.filter(a => a.despachoId === despId).map(a => M.porId(st.cres, a.recepcionId));
  M.recepcionConciliada = (st, recId) => st.conciliaciones.find(c => c.lineas.some(l => l.recepcionId === recId)) || null;
  M.totalMultasCRE = (st, creId) => st.multasCRE.filter(m => m.creId === creId).reduce((s, m) => s + m.total, 0);

  // ───────────────────────── prorrateo (Ejemplo 5) ─────────────────────────
  M.volumenDespachoEnRecepcion = (st, desp, rec, modo) => {
    const recs = M.recepcionesDe(st, desp.id);
    if (recs.length <= 1) return { vol: desp.volumen, traza: `Despacho con una sola recepción: ${M.fmtN(desp.volumen)} L.` };
    const total = recs.reduce((s, r) => s + r.volumen, 0);
    if (modo === 'PROPUESTO') {
      const base = recs.map(r => desp.volumen * r.volumen / total);
      const enteros = base.map(Math.floor);
      let resto = desp.volumen - enteros.reduce((s, v) => s + v, 0);
      const orden = base.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
      for (let k = 0; k < resto; k++) enteros[orden[k].i] += 1;
      const idx = recs.findIndex(r => r.id === rec.id);
      return { vol: enteros[idx], traza: `Prorrateo por resto mayor: ${M.fmtN(desp.volumen)} × ${M.fmtN(rec.volumen)} / ${M.fmtN(total)} = ${base[idx].toFixed(2)} → ${M.fmtN(enteros[idx])} L (la suma coincide con el despacho).` };
    }
    const porc = rec.volumen * 100 / total;
    const vol = M.cintBancario(desp.volumen * porc / 100);
    return { vol, traza: `Despacho en ${recs.length} recepciones: CInt(${M.fmtN(desp.volumen)} × ${porc.toFixed(4)} % ) = ${M.fmtN(vol)} L (redondeo bancario).` };
  };

  // ───────────────────────── cálculo por recepción (§3.2) ─────────────────────────
  M.calcularRecepcion = (st, rec, modo) => {
    // AdmUtilitariosConciliacion.CREidsEntregasSinConciliar usa DISTINCT(CREIDEntrega).
    // NumeroDeRecepciones, en cambio, cuenta/suma filas: conservar esa diferencia histórica.
    const despachos = [...new Map(M.despachosDe(st, rec.id).map(d => [d.id, d])).values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
    const lineas = [];
    let sumaDesp = 0, admLote = 0;
    despachos.forEach((desp, m) => {
      const ultima = m === despachos.length - 1;
      const traza = [];
      const pr = M.volumenDespachoEnRecepcion(st, desp, rec, modo);
      traza.push(pr.traza);
      const tar = M.tarifaDelViaje(st, desp, rec, modo);
      traza.push(...tar.traza);
      const precio = M.precioMulta(st, rec.productoId, desp.fecha, desp.origenId);
      const admLts = M.redAdm(M.trunc2(pr.vol * tar.admisible / 100));
      traza.push(`Admisible: ${M.fmtN(pr.vol)} × ${tar.admisible} % = ${(pr.vol * tar.admisible / 100).toFixed(4)} → trunc 2 dec → redondeo admisible = ${M.fmtN(admLts)} L.`);
      sumaDesp += pr.vol;
      admLote += admLts;
      const l = {
        key: `${rec.id}-${desp.id}`, recepcionId: rec.id, despachoId: desp.id, productoId: rec.productoId,
        lote: desp.loteCodigo, placa: M.porId(st.cisternas, desp.cisternaId).placa, planViaje: desp.planViaje,
        fechaCarga: desp.fecha, fechaDespacho: desp.fechaDespacho || desp.fecha, fechaEnDestino: rec.fechaLlegada || rec.fecha, fechaDescarga: rec.fecha,
        origenId: desp.origenId, destinoId: rec.destinoId, creDespacho: desp.numero, creRecepcion: rec.numero,
        volDesp: pr.vol, volRec: 0, ultima, tarifa: tar.tarifa, tarifaM3: tar.tarifaM3, tarifaFuente: tar.fuente, tarifaId: tar.tarifaId,
        admPorc: tar.admisible, admLts, balanceLote: 0, admLote: 0, cdLts: 0,
        ppt: precio.ppt, precioMulta: precio.precioMulta, precioFuente: precio.fuente, cdBs: 0, totalFlete: 0, totalFacturar: 0, traza
      };
      if (ultima) {
        const balance = rec.volumen - sumaDesp;
        let cd = 0;
        if (balance > 0) { cd = balance; traza.push(`Balance = ${M.fmtN(rec.volumen)} − ${M.fmtN(sumaDesp)} = +${M.fmtN(balance)} L: demasía, C/D = +${M.fmtN(cd)} L.`); }
        else if (-balance > admLote) { cd = balance + admLote; traza.push(`Balance = ${M.fmtN(rec.volumen)} − ${M.fmtN(sumaDesp)} = ${M.fmtN(balance)} L; supera el admisible de ${M.fmtN(admLote)} L → C/D = ${M.fmtN(balance)} + ${M.fmtN(admLote)} = ${M.fmtN(cd)} L.`); }
        else { traza.push(`Balance = ${M.fmtN(rec.volumen)} − ${M.fmtN(sumaDesp)} = ${M.fmtN(balance)} L; dentro del admisible de ${M.fmtN(admLote)} L → C/D = 0.`); }
        l.volRec = rec.volumen; l.balanceLote = balance; l.admLote = admLote; l.cdLts = cd;
        l.totalFlete = M.redHU(rec.volumen * tar.tarifa);
        traza.push(`Flete = ${M.fmtN(rec.volumen)} L recibidos × ${tar.tarifa.toFixed(5)} Bs/L = ${M.fmtB(l.totalFlete)} Bs (solo en la última línea de la recepción).`);
      }
      l.cdBs = M.redHU(l.cdLts * precio.precioMulta);
      if (l.cdLts) traza.push(`C/D Bs = ${M.fmtN(l.cdLts)} × ${precio.precioMulta} (${precio.fuente}) = ${M.fmtB(l.cdBs)} Bs.`);
      l.totalFacturar = M.redHU(l.totalFlete + l.cdBs);
      lineas.push(l);
    });
    return { recepcion: rec, lineas, sumaDesp, admLote };
  };

  // ───────────────────────── sin conciliar (RN-GEN-01, 02) ─────────────────────────
  M.recepcionesSinConciliar = (st, area, modo) => {
    const grupos = new Map();
    const ocultas = [];
    const limite = M.sumarDias(st.hoy, -90);
    st.cres.filter(c => c.tipo === 8 && c.estadoId === 1).forEach(rec => {
      if (!st.asociaciones.some(a => a.recepcionId === rec.id)) return;
      if (M.recepcionConciliada(st, rec.id)) return;
      const loc = M.porId(st.localidades, rec.origenId);
      if (area !== 3 && loc.area !== area) return;
      const trans = M.transportistaDeCRE(st, rec);
      const contrato = M.contratoVigente(st, trans, rec.fecha);
      const motivos = [];
      if (rec.fecha < limite) motivos.push('Recepción con más de 90 días');
      if (!contrato) motivos.push('Transportista sin contrato vigente a la fecha');
      if (modo === 'V1' && motivos.length) { ocultas.push({ rec, motivos }); return; }
      const anio = Number(rec.fecha.slice(0, 4)), mes = Number(rec.fecha.slice(5, 7)), q = M.quincena(rec.fecha);
      const clave = `${trans}|${loc.area}|${anio}|${mes}|${q}`;
      if (!grupos.has(clave)) grupos.set(clave, { clave, transportistaId: trans, area: loc.area, anio, mes, quincena: q, contrato, recepciones: [], alertas: [] });
      const g = grupos.get(clave);
      if (motivos.length) g.alertas.push(`${rec.numero}: ${motivos.join('; ')}`);
      g.recepciones.push(M.calcularRecepcion(st, rec, modo));
    });
    const lista = [...grupos.values()].sort((a, b) =>
      M.porId(st.transportistas, a.transportistaId).nombre.localeCompare(M.porId(st.transportistas, b.transportistaId).nombre) ||
      a.anio - b.anio || a.mes - b.mes || a.quincena - b.quincena);
    lista.forEach(g => g.recepciones.sort((a, b) => a.recepcion.productoId - b.recepcion.productoId || a.recepcion.fecha.localeCompare(b.recepcion.fecha)));
    return { grupos: lista, ocultas };
  };

  // RN-GEN-03..06.
  M.validarGeneracion = (st, grupo, recepcionesSel, moneda) => {
    if (!moneda) return 'LA CONCILIACIÓN A GENERAR NO CUENTA CON LA MONEDA.';
    if (!recepcionesSel.length) return 'DEBE SELECCIONAR COMO MÍNIMO UN TRANSPORTE EN LAS CONCILIACIONES QUE DESEA GENERAR.';
    for (const r of recepcionesSel) {
      if (M.recepcionConciliada(st, r.recepcion.id)) return 'UNO DE LAS CONCILIACIONES YA FUE GENERADA, SE CANCELÓ LA SOLICITUD.';
    }
    const c = grupo.contrato;
    if (c && c.marco && c.marco.controlaPresupuesto) {
      const prog = c.marco.programado[grupo.anio];
      if (!prog) return `NO EXISTE PROGRAMACIÓN PRESUPUESTARIA, PARA EL CONTRATO MARCO ${c.marco.numero}, NO PUEDE GENERAR LA CONCILIACIÓN.`;
      const monto = recepcionesSel.reduce((s, r) => s + r.lineas.reduce((x, l) => x + l.totalFacturar, 0), 0);
      const ejec = c.marco.ejecutado[grupo.anio] || 0;
      if (ejec + monto > prog) {
        return `EL MONTO DE LA CONCILIACIÓN + LA SUMA DE LA EJECUCIÓN PRESUPUESTARIA, EXCEDE EL MONTO PRESUPUESTADO PARA EL CONTRATO MARCO ${c.marco.numero}, NO PUEDE GENERAR LA CONCILIACIÓN. (Ejecutado ${M.fmtB(ejec)} + conciliación ${M.fmtB(monto)} > programado ${M.fmtB(prog)})`;
      }
    }
    return null;
  };

  // ───────────────────────── recálculo y totales (§4.1, RN-TOT) ─────────────────────────
  M.recalcular = (st, conc, modo) => {
    const aj = conc.ajustes || {};
    const multaVista = new Set();
    const grupos = [];
    const porRecepcion = new Map();
    conc.lineas.forEach(l => {
      if (!porRecepcion.has(l.recepcionId)) porRecepcion.set(l.recepcionId, []);
      porRecepcion.get(l.recepcionId).push(l);
    });
    porRecepcion.forEach((lineas, recepcionId) => {
      let acumDesp = 0;
      const dl = lineas.map(base => {
        const a = aj[base.key] || {};
        const d = Object.assign({}, base, { ajuste: a, trazaAjuste: [] });
        acumDesp += base.volDesp;
        const tarifa = a.tarifaEspecial ? Number(a.tarifaEspecial) : base.tarifa;
        if (a.tarifaEspecial) d.trazaAjuste.push(`Tarifa especial ${tarifa} Bs/L en lugar de ${base.tarifa.toFixed(5)}.`);
        if (base.ultima) {
          let baseFlete = base.volRec;
          if (a.liberarCapacidad) {
            baseFlete = Number(a.liberarCapacidad) - acumDesp + base.volRec;
            d.trazaAjuste.push(`Liberar capacidad: base = ${M.fmtN(a.liberarCapacidad)} − ${M.fmtN(acumDesp)} + ${M.fmtN(base.volRec)} = ${M.fmtN(baseFlete)} L.`);
          }
          d.baseFlete = baseFlete;
          d.totalFlete = M.redHU(baseFlete * tarifa);
        } else {
          d.baseFlete = 0;
          d.totalFlete = 0;
        }
        d.tarifaAplicada = tarifa;
        d.cdBs = M.redHU(base.cdLts * base.precioMulta);
        d.multasIn = 0;
        if (!multaVista.has(base.despachoId)) {
          multaVista.add(base.despachoId);
          d.multasIn = -M.redHU(M.totalMultasCRE(st, base.despachoId));
        }
        d.liberarMerma = !!a.liberarMerma;
        if (modo === 'PROPUESTO') {
          d.totalFacturar = M.redHU(d.totalFlete + (d.liberarMerma ? 0 : d.cdBs) + d.multasIn);
        } else if (d.liberarMerma) {
          d.totalFacturar = M.redHU(d.totalFlete + d.multasIn);
        } else if (d.cdBs < 0) {
          d.totalFacturar = M.redHU(d.totalFlete + d.cdBs + d.multasIn);
        } else {
          d.totalFacturar = base.totalFacturar; // D12: V1 no actualiza la línea cuando C/D ≥ 0
          d.desactualizado = M.redHU(d.totalFlete + d.cdBs + d.multasIn) !== base.totalFacturar;
        }
        return d;
      });
      const rec = M.porId(st.cres, recepcionId);
      const tot = {
        despachos: dl.reduce((s, l) => s + l.volDesp, 0),
        recepciones: dl.reduce((s, l) => s + l.volRec, 0),
        flete: M.redHU(dl.reduce((s, l) => s + l.totalFlete, 0)),
        mermas: M.redHU(dl.reduce((s, l) => s + (l.liberarMerma ? 0 : l.cdBs), 0)),
        multasIn: M.redHU(dl.reduce((s, l) => s + l.multasIn, 0))
      };
      tot.neto = M.redHU(tot.flete + tot.mermas + tot.multasIn);
      grupos.push({ recepcionId, recepcion: rec, productoId: rec.productoId, lineas: dl, tot });
    });

    // RN-TOT-02: compensación por producto.
    const productos = {};
    grupos.forEach(g => {
      const p = productos[g.productoId] || (productos[g.productoId] = { productoId: g.productoId, flete: 0, mermasBrutas: 0, volumen: 0, multasIn: 0 });
      p.flete = M.redHU(p.flete + g.tot.flete);
      p.mermasBrutas = M.redHU(p.mermasBrutas + g.tot.mermas);
      p.multasIn = M.redHU(p.multasIn + g.tot.multasIn);
      p.volumen += g.lineas.reduce((s, l) => s + (l.ultima ? (l.ajuste.liberarCapacidad ? Number(l.ajuste.liberarCapacidad) : l.volRec) : 0), 0);
    });
    Object.values(productos).forEach(p => { p.mermas = p.mermasBrutas > 0 ? 0 : p.mermasBrutas; p.compensado = p.mermasBrutas > 0; });

    const r = conc.recargos || [];
    const suma = tipo => SILOG.multasContractuales && ['CCIST', 'MC', 'DC'].includes(tipo)
      ? SILOG.multasContractuales.sumar(st, conc, tipo, modo)
      : M.redHU(r.filter(x => x.tipo === tipo).reduce((s, x) => s + Number(x.monto || 0) * Number(x.cantidad == null ? 1 : x.cantidad), 0));
    const multasCRE = M.redHU(Object.values(productos).reduce((s, p) => s + p.multasIn, 0));
    const cab = {
      flete: M.redHU(Object.values(productos).reduce((s, p) => s + p.flete, 0)),
      mermas: M.redHU(Object.values(productos).reduce((s, p) => s + p.mermas, 0)),
      multasCRE,
      multaContractual: -suma('CCIST'),
      // MC_ObtenerMultaDescuentoAplicado: CCIST + @MontoMultaAnterior (CRE distintos).
      // multasCRE es un DESGLOSE de multaTransporte, nunca otro descuento adicional.
      multaTransporte: M.redHU(-suma('CCIST') + multasCRE),
      multaConciliacion: -suma('MC'),
      descuentoConciliacion: -suma('DC'),
      // SQL suma el monto firmado guardado. Los escenarios antiguos modelaban un
      // importe positivo «a descontar»; el alias conserva su interpretación sin borrar datos.
      casosEspeciales: M.redHU(r.filter(x => x.tipo === 'CASO').reduce((s, x) => s + Number(x.montoAlmacenado == null ? -x.monto : x.montoAlmacenado), 0)),
      carroGuia: -suma('CG')
    };
    if (modo === 'PROPUESTO') {
      cab.neto = M.redHU(cab.flete + cab.mermas + cab.multaTransporte + cab.multaConciliacion + cab.descuentoConciliacion + cab.casosEspeciales + cab.carroGuia);
      cab.formula = 'Flete + mermas + multa transporte (contractual + CRE, una sola vez) + MC + DC + casos firmados + carro guía. Propuesta didáctica; requiere aprobación funcional.';
    } else {
      cab.neto = M.redHU(cab.flete + cab.mermas + cab.multaTransporte);
      cab.formula = 'Flete + mermas + multa transporte (CCIST contractual + multas por CRE distintos). MC, DC, casos y carro guía no entran al neto persistido de cisterna, pero sí al total visual de Otros Transportes (D29).';
    }
    return { grupos, productos, cab };
  };

  // ───────────────────────── estados (RN-EST) ─────────────────────────
  M.ESTADOS = ['En Elaboracion', 'En Aprobacion de Transportista', 'Aprobada Por Transportista', 'Pendiente de Aprobacion', 'Pendiente de Liberacion', 'Liberado'];
  M.ACCIONES = [
    // ofrecidaV1: la lista de acciones de ConciliacionCisterna.ascx.vb:151-166 solo carga estas cuatro (si el usuario
    // tiene la actividad). Las demás existen en btnEstado_Click pero están comentadas en la lista.
    { accion: 'Solicitar Aprob. Transportista', desde: ['En Elaboracion'], hacia: 'En Aprobacion de Transportista', roles: ['Analista LOG', 'Jefe LOG'], ofrecidaV1: true },
    { accion: 'Transportista Aprueba', desde: ['En Aprobacion de Transportista'], hacia: 'Aprobada Por Transportista', roles: ['Transportista'], ofrecidaV1: true },
    { accion: 'Transportista Rechaza', desde: ['En Aprobacion de Transportista'], hacia: 'En Elaboracion', roles: ['Transportista'], ofrecidaV1: true },
    { accion: 'Rechazar Conciliacion', desde: ['En Aprobacion de Transportista', 'Aprobada Por Transportista', 'Pendiente de Aprobacion', 'Pendiente de Liberacion', 'Liberado'], hacia: 'En Elaboracion', roles: ['Jefe LOG', 'Gerente de Dist. y Ventas'], ofrecidaV1: true },
    { accion: 'Solicitar Aprobacion LOG', desde: ['Aprobada Por Transportista'], hacia: 'Pendiente de Aprobacion', roles: ['Analista LOG', 'Jefe LOG'], ofrecidaV1: false },
    { accion: 'Solicitar Liberacion', desde: ['Pendiente de Aprobacion'], hacia: 'Pendiente de Liberacion', roles: ['Jefe LOG'], ofrecidaV1: false },
    { accion: 'Liberar Conciliacion', desde: ['Pendiente de Liberacion'], hacia: 'Liberado', roles: ['Gerente de Dist. y Ventas'], ofrecidaV1: false }
  ];

  // Circuito SAP de Sincronizaciones_To_SAP.ascx.vb. conc: nuevo estado de la conciliación, si cambia.
  M.SAP_ESTADOS = ['Sin Registrar en SAP', 'Pendiente de Liberación', 'Pendiente Hoja de Entrada de Servicio', 'Pendiente de Liberación de Hoja', 'Aceptado'];
  M.SAP_ACCIONES = [
    { accion: 'Crear pedido', desde: ['Sin Registrar en SAP'], hacia: 'Pendiente de Liberación', conc: 'Pendiente de Aprobacion', ref: 'Sincronizaciones_To_SAP.ascx.vb:141-293' },
    { accion: 'Liberar pedido', desde: ['Pendiente de Liberación'], hacia: 'Pendiente Hoja de Entrada de Servicio', ref: 'Sincronizaciones_To_SAP.ascx.vb:294-441' },
    { accion: 'Registrar hoja de entrada', desde: ['Pendiente Hoja de Entrada de Servicio'], hacia: 'Pendiente de Liberación de Hoja', ref: 'Sincronizaciones_To_SAP.ascx.vb:442-548' },
    { accion: 'Liberar hoja', desde: ['Pendiente de Liberación de Hoja'], hacia: 'Aceptado', conc: 'Liberado', ref: 'Sincronizaciones_To_SAP.ascx.vb:549-687' },
    { accion: 'Anular aceptación', desde: ['Aceptado'], hacia: 'Pendiente de Liberación de Hoja', ref: 'Sincronizaciones_To_SAP.ascx.vb:773-813 (la conciliación queda Liberado)' },
    { accion: 'Anular hoja', desde: ['Pendiente de Liberación de Hoja'], hacia: 'Pendiente Hoja de Entrada de Servicio', ref: 'Sincronizaciones_To_SAP.ascx.vb:738-772' },
    { accion: 'Anular pedido', desde: ['Pendiente de Liberación', 'Pendiente Hoja de Entrada de Servicio'], hacia: 'Sin Registrar en SAP', conc: 'En Elaboracion', ref: 'Sincronizaciones_To_SAP.ascx.vb:688-737' }
  ];
  M.validarSAP = (st, conc, accion) => {
    if (!conc.sap) return 'NO SE PROCESO PREVIAMENTE LA CONCILIACIÓN. (Requiere la aprobación del transportista.)';
    const def = M.SAP_ACCIONES.find(a => a.accion === accion);
    if (!def.desde.includes(conc.sap.estado)) return '"' + accion + '" requiere el estado SAP ' + def.desde.map(x => '"' + x + '"').join(' o ') + '; el actual es "' + conc.sap.estado + '".';
    if (accion === 'Crear pedido' && !conc.moneda) return 'LA CONCILIACIÓN NO TIENE UNA MONEDA.';
    return null;
  };

  M.facturasPendientes = (st, conc) => st.conciliaciones.filter(c =>
    c.transportistaId === conc.transportistaId && c.facturasPagadas === false &&
    !['En Elaboracion', 'En Aprobacion de Transportista'].includes(c.estado) &&
    (Math.abs(c.totales.mermas) > st.umbralFacturas || Math.abs(c.totales.multaTransporte) > st.umbralFacturas));

  // Devuelve null si la transición es válida o el mensaje de error.
  M.validarTransicion = (st, conc, accion, rol, modo, deriv) => {
    const def = M.ACCIONES.find(a => a.accion === accion);
    if (!def) return 'Acción desconocida.';
    if (modo === 'PROPUESTO' && !def.roles.includes(rol)) return `El rol "${rol}" no tiene permiso para "${accion}". Permitido para: ${def.roles.join(', ')}.`;
    if (!def.desde.includes(conc.estado)) {
      const msg = {
        'Solicitar Aprob. Transportista': "SE CANCELÓ LA SOLICITUD, EL ESTADO DE LA CONCILIACIÓN DEBE DE SER 'EN ELABORACIÓN'..",
        'Transportista Aprueba': "SE CANCELÓ LA SOLICITUD, EL ESTADO DE LA CONCILIACIÓN DEBE DE SER 'EN APROBACIÓN DE TRANSPORTISTA'..",
        'Transportista Rechaza': "SE CANCELÓ LA SOLICITUD, EL ESTADO DE LA CONCILIACIÓN DEBE DE SER 'EN APROBACIÓN DE TRANSPORTISTA'..",
        'Solicitar Aprobacion LOG': "SE CANCELÓ LA SOLICITUD, EL ESTADO DE LA CONCILIACIÓN DEBE DE SER 'APROBADA POR TRANSPORTISTA'.",
        'Solicitar Liberacion': "SE CANCELÓ LA SOLICITUD, EL ESTADO DE LA CONCILIACIÓN DEBE DE SER 'PENDIENTE DE APROBACIÓN'.",
        'Liberar Conciliacion': "SE CANCELÓ LA SOLICITUD, EL ESTADO DE LA CONCILIACIÓN DEBE DE SER 'PENDIENTE DE LIBERACIÓN'.",
        'Rechazar Conciliacion': 'NO PUEDE MODIFICAR EL ESTADO DE LA CONCILIACIÓN.'
      };
      return msg[accion];
    }
    if (accion === 'Solicitar Aprobacion LOG') {
      if (deriv.cab.mermas !== 0 && !(conc.facturaMermas || '').trim()) return 'Introduzca el Número de Factura por Mermas.';
      if (deriv.cab.multaTransporte !== 0 && !(conc.facturaIncumplimiento || '').trim()) return 'Introduzca el Número de Factura por Incumplimiento de Contrato.';
    }
    if (accion === 'Solicitar Liberacion') {
      const pend = M.facturasPendientes(st, conc);
      if (pend.length) return `SE CANCELÓ LA SOLICITUD, EXISTEN CONCILIACIONES PENDIENTES DE SU PAGO DE FACTURA MAYORES A ${M.fmtN(st.umbralFacturas)}: [${pend.map(c => 'Conc. ' + c.numero + ' ' + M.MESES[c.mes] + '-' + c.anio).join(', ')}]..`;
    }
    if (accion === 'Rechazar Conciliacion' && ['Pendiente de Aprobacion', 'Pendiente de Liberacion', 'Liberado'].includes(conc.estado)) {
      if (rol !== 'Gerente de Dist. y Ventas') return 'SU ROL NO PUEDE REVERTIR EL ESTADO ACTUAL DE LA CONCILIACIÓN, YA QUE PUEDE QUE LA CONCILIACIÓN SE ENCUENTRE SINCRONIZADA A SAP.';
      if (conc.sap && conc.sap.estado !== 'Sin Registrar en SAP') return 'LA CONCILIACIÓN QUE QUIERE REVERTIR EL ESTADO NO SE ENCUENTRA ANULADA EN SAP.';
    }
    return null;
  };

  // ───────────────────────── SAP (RN-SAP-01) ─────────────────────────
  M.generarSAP = (st, conc, deriv) => {
    const importado = conc.lineas.some(l => (M.porId(st.localidades, l.origenId) || {}).nacional === 1);
    const tipo = importado ? 'TERRESTRE INTERNACIONAL' : 'TERRESTRE';
    const codigo = importado ? 'CTI' : 'CT';
    const fechas = conc.lineas.map(l => l.fechaCarga).concat(conc.lineas.map(l => l.fechaDescarga)).sort();
    return {
      estado: 'Sin Registrar en SAP', tipo, codigo, moneda: conc.moneda === 'Bs' ? 'BOB' : 'USD',
      texto: `${codigo} ${conc.numero} ${conc.mes}/${String(conc.anio).slice(2)}`,
      periodoInicial: fechas[0], periodoFinal: fechas[fechas.length - 1],
      detalle: Object.values(deriv.productos).filter(p => p.flete > 0).map((p, i) => {
        const prod = M.porId(st.productos, p.productoId);
        return { item: i + 1, producto: prod.nombre, flete: p.flete, volumen: p.volumen, cebe: prod.cebe, cuenta: prod.cuenta };
      })
    };
  };

  // ───────────────────────── multas por CRE (§2.5) ─────────────────────────
  M.calcularMultaCRE = (multa, entrada, tc, volumenEntregado) => {
    const cambio = multa.moneda === 'Sus' ? tc : 1;
    if (multa.base === 'cantidad') return M.redHU(Number(entrada || 0) * multa.valor * cambio);
    if (multa.base === 'fijo') return entrada ? M.redHU(multa.valor * cambio) : 0;
    if (multa.base === 'filtracion') {
      if (!entrada) return 0;
      const mpf = Number(entrada === true ? multa.valor : entrada);
      return M.redHU((((mpf * tc) + (mpf * tc * 15 / 100)) / 1000) * volumenEntregado);
    }
    return 0;
  };

  // ───────────────────────── calculadora de ejemplos ─────────────────────────
  // Calcula un grupo aislado: N despachos → 1 recepción, o 1 despacho → N recepciones.
  M.calculadora = (e, modo) => {
    const desp = e.despachos.map(Number).filter(v => v > 0);
    const recs = e.recepciones.map(Number).filter(v => v > 0);
    if (!desp.length || !recs.length) return { error: 'Indique al menos un despacho y una recepción.' };
    if (desp.length > 1 && recs.length > 1) return { error: 'Esta calculadora simple requiere N despachos → 1 recepción o 1 despacho → N recepciones. Para N×M se necesita la matriz de asociaciones: consulte «Crédito/débito paso a paso».' };
    const tarifa = (Number(e.tarifaM3) || 0) / 1000;
    const adm = Number(e.admisible) || 0;
    const precio = Number(e.precioMulta) || 0;
    const resultados = [];
    recs.forEach((vr, ri) => {
      const pasos = [];
      let sumaDesp = 0, admLote = 0;
      const lineas = desp.map((vd, di) => {
        let vol = vd;
        if (recs.length > 1) {
          const total = recs.reduce((s, v) => s + v, 0);
          if (modo === 'PROPUESTO') {
            const base = recs.map(v => vd * v / total), ent = base.map(Math.floor);
            let resto = vd - ent.reduce((s, v) => s + v, 0);
            base.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f).slice(0, resto).forEach(o => ent[o.i]++);
            vol = ent[ri];
            pasos.push(`Despacho ${di + 1} prorrateado por resto mayor: ${M.fmtN(vol)} L.`);
          } else {
            vol = M.cintBancario(vd * (vr * 100 / total) / 100);
            pasos.push(`Despacho ${di + 1} prorrateado: CInt(${M.fmtN(vd)} × ${M.fmtN(vr)} / ${M.fmtN(total)}) = ${M.fmtN(vol)} L.`);
          }
        }
        const bruto = vol * adm / 100;
        const al = M.redAdm(M.trunc2(bruto));
        pasos.push(`Admisible despacho ${di + 1}: ${M.fmtN(vol)} × ${adm} % = ${bruto.toFixed(4)} → ${M.fmtN(al)} L.`);
        sumaDesp += vol; admLote += al;
        return { vol, adm: al };
      });
      const balance = vr - sumaDesp;
      let cd = 0;
      if (balance > 0) cd = balance; else if (-balance > admLote) cd = balance + admLote;
      pasos.push(`Balance: ${M.fmtN(vr)} − ${M.fmtN(sumaDesp)} = ${M.fmtN(balance)} L; admisible total ${M.fmtN(admLote)} L → C/D ${M.fmtN(cd)} L.`);
      let baseFlete = vr;
      if (Number(e.liberarCapacidad)) {
        baseFlete = Number(e.liberarCapacidad) - sumaDesp + vr;
        pasos.push(`Liberar capacidad: ${M.fmtN(e.liberarCapacidad)} − ${M.fmtN(sumaDesp)} + ${M.fmtN(vr)} = ${M.fmtN(baseFlete)} L.`);
      }
      const t = Number(e.tarifaEspecial) || tarifa;
      const flete = M.redHU(baseFlete * t);
      pasos.push(`Flete: ${M.fmtN(baseFlete)} × ${t.toFixed(5)} = ${M.fmtB(flete)} Bs.`);
      const cdBs = M.redHU(cd * precio);
      pasos.push(`C/D Bs: ${M.fmtN(cd)} × ${precio} = ${M.fmtB(cdBs)} Bs.`);
      const total = M.redHU(flete + (e.liberarMerma ? 0 : cdBs));
      pasos.push(`Total a facturar: ${M.fmtB(flete)} ${e.liberarMerma ? '(merma liberada)' : '+ ' + M.fmtB(cdBs)} = ${M.fmtB(total)} Bs.`);
      resultados.push({ vr, lineas, sumaDesp, admLote, balance, cd, baseFlete, flete, cdBs, total, pasos });
    });
    return { resultados };
  };

  // ───────────────────────── Conciliación Otros Transportes ─────────────────────────
  // ConciliacionOtrosTransportes.ascx.vb + CARGAR_DATOS_CONCILIACION_OT. Ver CONCILIACION_OTROS_TRANSPORTES_V1.md.
  M.PERMISOS_OT = ['PuedeProcesar', 'PuedeEditarFechas', 'PuedeSolicitarAprobacion', 'PuedeSolicitarLiberacion', 'PuedeRechazarConciliacion',
    'PuedeLiberarMerma', 'PuedeLiberarCapacidad', 'PuedeCambiarTarifa', 'PuedeColocarTarifaEspecial'];

  // Filas por recepción, como el modo DETALLE del procedimiento (sumas, promedios y "liberar merma" solo si todas).
  M.otFilas = (st, conc, modo) => {
    const d = M.recalcular(st, conc, modo || 'V1');
    const aj = conc.ajustes || {};
    return d.grupos.map(g => {
      const ls = g.lineas, n = ls.length, ult = ls[n - 1];
      const prod = M.porId(st.productos, g.productoId);
      const sum = f => ls.reduce((s, l) => s + Number(f(l) || 0), 0);
      return {
        recepcionId: g.recepcionId, rec: g.recepcion, productoId: g.productoId, producto: prod.codigo,
        admPorc: M.redHU(sum(l => l.admPorc) / n, 2), placa: ult.placa,
        fechaCarga: ls[0].fechaCarga, fechaDescarga: ult.fechaDescarga,
        tramo: `${M.nombreLoc(st, ls[0].origenId)} - ${M.nombreLoc(st, ult.destinoId)}`,
        despacho: sum(l => l.volDesp), recepcion: sum(l => l.volRec), balance: sum(l => l.balanceLote),
        admLts: sum(l => l.admLts), cdLts: sum(l => l.cdLts), precioMulta: M.redHU(sum(l => l.precioMulta) / n, 2), cdBs: M.redHU(sum(l => l.cdBs)),
        liberarMerma: ls.every(l => (aj[l.key] || {}).liberarMerma),
        liberarCapacidad: sum(l => (aj[l.key] || {}).liberarCapacidad),
        tarifa: M.redHU(sum(l => l.tarifa) / n, 5), tarifaPromediada: new Set(ls.map(l => l.tarifa)).size > 1,
        tarifaEspecial: sum(l => (aj[l.key] || {}).tarifaEspecial), flete: g.tot.flete,
        observacion: (aj[ult.key] || {}).observacion || '', lineas: ls
      };
    }).sort((a, b) => a.producto.localeCompare(b.producto));
  };

  // MC_ObtenerPrioridadesTarifas: principal y alternas vigentes ("P", "A1"…) más 0.
  M.otOpcionesTarifa = (st, conc, rec) => {
    const opciones = [];
    const c = st.contratos.filter(x => x.transportistaId === conc.transportistaId && x.estado === 'LIBERADO');
    const vig = st.tarifas.filter(t => c.some(x => x.id === t.contratoId && rec.fecha <= x.vigFin) && t.estado && t.aprobada &&
      t.origenId === rec.origenId && t.destinoId === rec.destinoId && t.productoId === rec.productoId && rec.fecha >= t.vigInicio);
    const principal = vig.filter(t => t.prioridad === 'PRINCIPAL').sort((a, b) => b.vigInicio.localeCompare(a.vigInicio))[0];
    if (principal) opciones.push({ etiqueta: 'P', valor: M.redHU(principal.tarifa / 1000, 5) });
    vig.filter(t => t.prioridad !== 'PRINCIPAL').forEach((t, i) => opciones.push({ etiqueta: 'A' + (i + 1), valor: M.redHU(t.tarifa / 1000, 5) }));
    opciones.push({ etiqueta: '0', valor: 0 });
    return opciones;
  };

  // Botones visibles por fila (InicializarPermisos, líneas 157-211).
  M.otBotones = (estado, p) => ({
    aprobar: (estado === 'En Elaboracion' || estado === 'En Aprobacion de Transportista') ? !!p.PuedeSolicitarAprobacion
      : estado === 'Pendiente de Aprobacion' ? !!p.PuedeSolicitarLiberacion : false,
    rechazar: (estado === 'En Aprobacion de Transportista' || estado === 'Aprobada Por Transportista') && !!p.PuedeRechazarConciliacion
  });

  // ObtenerTotalesConciliacion excluye TODA la recepción si alguna línea libera merma.
  // La otra pantalla calcula por línea; conservar ambas variantes hace visible D28/D35.
  M.otCabecera = (st, conc) => {
    const d = M.recalcular(st, conc, 'V1'), porProducto = {};
    d.grupos.forEach(g => {
      const cd = g.lineas.some(l => l.liberarMerma) ? 0 : g.lineas.reduce((s, l) => s + l.cdBs, 0);
      porProducto[g.productoId] = M.redHU((porProducto[g.productoId] || 0) + cd);
    });
    const k = Object.assign({}, d.cab);
    k.mermas = M.redHU(Object.values(porProducto).reduce((s, cd) => s + Math.min(0, cd), 0));
    k.neto = M.redHU(k.flete + k.mermas + k.multaTransporte);
    return k;
  };

  // ObtenerMontosDeConciliacion lee flete y merma de CABECERA guardada; recargos en vivo.
  // La UI VB omite conceptos si CInt(valor)=0 (no si valor=0).
  M.otTotales = (st, conc) => {
    const k = M.recalcular(st, conc, 'V1').cab;
    const guardado = conc.totales || {};
    const conceptos = [['Flete Facturable', Number(guardado.flete || 0)], ['Multa Merma', Number(guardado.mermas || 0)], ['Multa Transporte', k.multaTransporte], ['Multa Conc.', k.multaConciliacion],
      ['Descuento Conc.', k.descuentoConciliacion], ['Carro Guía', k.carroGuia], ['Casos Especiales', k.casosEspeciales]];
    const filas = conceptos.filter(f => M.cintBancario(f[1]) !== 0);
    return { filas, conceptos, omitidos: conceptos.filter(f => f[1] !== 0 && M.cintBancario(f[1]) === 0),
      neto: M.redHU(filas.reduce((s, f) => s + f[1], 0)), netoGuardado: guardado.neto == null ? null : Number(guardado.neto), netoRecalculado: M.otCabecera(st, conc).neto };
  };

  // Recepciones para "Nuevo convoy" (ConciliacionOTDetalle): sin ventana de 90 días ni control de contrato.
  M.otCandidatas = (st, conc, fi, ff) => st.cres.filter(r => r.tipo === 8 && r.estadoId === 1 && r.fecha >= fi && r.fecha <= ff &&
    st.asociaciones.some(a => a.recepcionId === r.id) && !M.recepcionConciliada(st, r.id) &&
    M.transportistaDeCRE(st, r) === conc.transportistaId && (M.porId(st.localidades, r.origenId) || {}).area === conc.area)
    .sort((a, b) => a.fecha.localeCompare(b.fecha)).map(r => M.calcularRecepcion(st, r, 'V1'));

  // ───────────────────────── formato ─────────────────────────
  M.fmtN = v => Number(v || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 });
  M.fmtB = v => Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  M.fmtF = f => f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '';
})(SILOG.motor = {});

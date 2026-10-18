/* Recorrido contractual comprobado contra VB/SQL de V1. Datos y permisos locales de estudio.
 * No consulta ni modifica V1, LEGACY, DESTINO o seguridad externa. Funciones sin DOM.
 */
window.SILOG = window.SILOG || {};
(function (C) {
  const M = SILOG.motor;
  C.ESTADOS = ['EN ELABORACION', 'PENDIENTE DE APROBACION', 'PENDIENTE DE LIBERACION', 'LIBERADO'];
  C.PERMISOS = ['MC Aplicar Multa Descuento', 'MC Puede Solicitar AP', 'MC Puede Solicitar LB', 'MC Puede Liberar', 'MC Puede Rechazar Contrato'];
  C.TC_V1 = 6.96; // MC_CargarMultasParaCRE devuelve este literal; no es una cotización actual.
  const siguienteId = xs => Math.max(0, ...xs.map(x => Number(x.id) || 0)) + 1;
  const fallo = msg => ({ ok: false, msg });
  const exito = (msg, id) => ({ ok: true, msg, id });
  const fechaValida = f => /^\d{4}-\d{2}-\d{2}$/.test(f || '') && !isNaN(Date.parse(f)) && new Date(f).toISOString().slice(0, 10) === f;
  const permiso = (ctx, p) => !!(ctx.permisos && ctx.permisos[p]);
  const sello = ctx => ({ usuario: ctx.usuario, fecha: new Date().toISOString() });
  const rangoValido = d => fechaValida(d.vigInicio) && fechaValida(d.vigFin) && d.vigInicio <= d.vigFin;
  C.preparar = st => {
    // Migración aditiva: conserva catálogos, aplicaciones e instantáneas del localStorage v5.
    st.multasContractuales = st.multasContractuales || [];
    st.tiposContratoMultas = st.tiposContratoMultas || [{ id: 1, nombre: 'Transporte en cisterna', medio: 'Cisterna' }, { id: 2, nombre: 'Transporte en barcaza', medio: 'Barcaza' }, { id: 3, nombre: 'Transporte en vagón', medio: 'Vagon' }];
    st.recargosCatalogo = st.recargosCatalogo || [];
    st.recargosCatalogo.forEach(d => {
      if (!d.cabeceraId) {
        const id = siguienteId(st.multasContractuales);
        st.multasContractuales.push({ id, tipoContratoId: 1, tipo: d.tipo, aplicabilidad: d.aplicabilidad === 'CONC' ? 'CONCILIACION' : d.aplicabilidad,
          denominacion: d.denominacion, vigInicio: '2026-01-01', vigFin: '2026-12-31', observacion: 'Definición ficticia precargada para estudio.' });
        Object.assign(d, { cabeceraId: id, sigla: 'DOC-' + d.id, vigInicio: '2026-01-01', vigFin: '2026-12-31', estado: 'LIBERADO', activo: true,
          historial: [], observacion: 'Precargado; no representa una aprobación real.' });
      }
      d.empresas = d.empresas || []; d.historial = d.historial || [];
      if (d.moneda === 'Bs') d.moneda = 'BOB';
    });
    if (!st.sinCatalogoMultasPrecargado && SILOG.incorporarMultasCaptura) SILOG.incorporarMultasCaptura(st);
  };
  C.cabecera = (st, detalle) => M.porId(st.multasContractuales || [], detalle.cabeceraId);
  C.rango = conc => {
    const inicio = (conc.lineas || []).map(l => l.fechaCarga).filter(Boolean).sort();
    const fin = (conc.lineas || []).map(l => l.fechaEnDestino).filter(Boolean).sort();
    return [inicio[0], fin[fin.length - 1]];
  };
  C.tipoContrato = (st, conc) => {
    const contrato = M.porId(st.contratos, conc.contratoId);
    return contrato && contrato.tipoContratoId || ((st.tiposContratoMultas || []).find(t => t.medio === conc.tipo) || {}).id;
  };
  C.cres = (st, conc, ambito) => [...new Set(conc.lineas.map(l => ambito === 'CRE_D' ? l.despachoId : l.recepcionId))].map(id => M.porId(st.cres, id)).filter(Boolean);
  C.empresasDisponibles = (st, h) => st.transportistas.filter(e => st.contratos.some(c => c.transportistaId === e.id &&
    (c.tipoContratoId || 1) === h.tipoContratoId && ((h.vigInicio >= c.vigInicio && h.vigInicio <= c.vigFin) || (h.vigFin >= c.vigInicio && h.vigFin <= c.vigFin))));
  C.elegibilidad = (st, conc, d, ambito, modo) => {
    const h = C.cabecera(st, d), [fi, ff] = C.rango(conc), motivos = [];
    if (!h || h.tipoContratoId !== C.tipoContrato(st, conc)) motivos.push('El tipo de contrato no coincide.');
    if (!h || h.aplicabilidad !== ambito) motivos.push('El recargo corresponde a otro ámbito (despacho, recepción o conciliación).');
    if (d.estado !== 'LIBERADO') motivos.push('El recargo todavía no está LIBERADO.');
    if (!d.empresas.includes(conc.transportistaId)) motivos.push('La empresa de la conciliación no está asociada al recargo.');
    if (!fi || !ff) motivos.push('Faltan fechas de carga/destino para evaluar la vigencia.');
    else if (fi < d.vigInicio || ff > d.vigFin) motivos.push('El periodo completo de carga a destino no cabe en la vigencia del recargo.');
    if (modo === 'PROPUESTO' && !d.activo) motivos.push('El recargo está inactivo (protección propuesta; el SQL de V1 no filtra Activo).');
    return { permitido: !motivos.length, motivos, aviso: !d.activo && modo === 'V1' ? 'V1 permite que aparezca inactivo: falta el filtro Activo en el SQL.' : '', fi, ff };
  };
  C.guardarCabecera = (st, datos, ctx) => {
    C.preparar(st);
    if (!permiso(ctx, C.PERMISOS[0])) return fallo('Falta el permiso MC Aplicar Multa Descuento (simulado).');
    const anterior = datos.id ? M.porId(st.multasContractuales, datos.id) : null;
    if (datos.id && !anterior) return fallo('No existe la definición seleccionada.');
    if (anterior && st.recargosCatalogo.some(d => d.cabeceraId === anterior.id && d.estado !== C.ESTADOS[0])) return fallo('V1 bloquea la cabecera cuando algún recargo ya salió de elaboración.');
    const d = { tipoContratoId: Number(datos.tipoContratoId), denominacion: String(datos.denominacion || '').trim(), tipo: datos.tipo,
      aplicabilidad: datos.aplicabilidad, vigInicio: datos.vigInicio, vigFin: datos.vigFin, observacion: String(datos.observacion || '') };
    if (!d.denominacion || !rangoValido(d)) return fallo('Ingrese denominación y fechas válidas; inicio no puede superar fin.');
    if (!M.porId(st.tiposContratoMultas, d.tipoContratoId) || !['Multa', 'Descuento'].includes(d.tipo) || !['CRE_D', 'CRE_R', 'CONCILIACION'].includes(d.aplicabilidad)) return fallo('Seleccione tipo de contrato, tipo y ámbito válidos.');
    if (d.tipo === 'Descuento' && d.aplicabilidad !== 'CONCILIACION') return fallo('V1 permite descuentos únicamente a la conciliación.');
    if (anterior && st.recargosCatalogo.some(x => x.cabeceraId === anterior.id && (x.vigInicio < d.vigInicio || x.vigFin > d.vigFin))) return fallo('No deje vigencias de recargos fuera de la cabecera (protección del prototipo).');
    const id = anterior ? anterior.id : siguienteId(st.multasContractuales);
    if (anterior) Object.assign(anterior, d, { modificacion: sello(ctx) });
    else st.multasContractuales.push(Object.assign({ id, registro: sello(ctx) }, d));
    return exito('Definición guardada. Todavía no se descontó ningún CRE.', id);
  };
  C.guardarDetalle = (st, datos, ctx) => {
    if (!permiso(ctx, C.PERMISOS[0])) return fallo('Falta el permiso MC Aplicar Multa Descuento (simulado).');
    const h = M.porId(st.multasContractuales, datos.cabeceraId), anterior = datos.id ? M.porId(st.recargosCatalogo, datos.id) : null;
    if (!h || datos.id && (!anterior || anterior.cabeceraId !== h.id)) return fallo('Seleccione una definición/recargo existente.');
    const d = { concepto: String(datos.concepto || '').trim(), sigla: String(datos.sigla || '').trim().toUpperCase(), monto: Number(datos.monto),
      moneda: datos.moneda, vigInicio: datos.vigInicio, vigFin: datos.vigFin, activo: datos.activo !== false, observacion: String(datos.observacion || '') };
    if (!d.concepto || !d.sigla || !Number.isFinite(d.monto) || d.monto <= 0 || !rangoValido(d)) return fallo('Concepto y sigla son obligatorios; monto mayor a cero y fechas válidas.');
    if (!['BOB', 'USD', '%', 'VAR'].includes(d.moneda)) return fallo('Moneda no admitida.');
    if (d.vigInicio < h.vigInicio || d.vigFin > h.vigFin) return fallo('La vigencia del recargo debe estar dentro de la definición.');
    if (anterior && anterior.estado !== C.ESTADOS[0] && ['concepto', 'sigla', 'monto', 'moneda', 'vigInicio', 'vigFin'].some(k => anterior[k] !== d[k])) return fallo('Después de elaboración solo puede cambiar Activo y Observaciones, como en el formulario de V1.');
    const id = anterior ? anterior.id : siguienteId(st.recargosCatalogo);
    if (anterior) Object.assign(anterior, d, { modificacion: sello(ctx) });
    else st.recargosCatalogo.push(Object.assign({ id, cabeceraId: h.id, empresas: [], estado: C.ESTADOS[0], historial: [], registro: sello(ctx) }, d));
    return exito('Recargo guardado. Falta asociar empresas y liberarlo antes de aplicarlo.', id);
  };
  C.asociarEmpresas = (st, id, ids, ctx) => {
    if (!permiso(ctx, C.PERMISOS[0])) return fallo('Falta el permiso MC Aplicar Multa Descuento (simulado).');
    const d = M.porId(st.recargosCatalogo, id);
    if (!d) return fallo('Seleccione un recargo.');
    const disponibles = C.empresasDisponibles(st, C.cabecera(st, d)).map(e => e.id);
    const lista = [...new Set(ids.map(Number))];
    if (lista.some(x => !disponibles.includes(x))) return fallo('Alguna empresa no tiene contrato del tipo/periodo ofrecido por la consulta simulada.');
    d.empresas = lista; d.asociacion = sello(ctx);
    return exito('Empresas asociadas. Esto NO aplica una multa al CRE.', id);
  };
  C.cambiarEstado = (st, id, revertir, ctx) => {
    const d = M.porId(st.recargosCatalogo, id);
    if (!d) return fallo('Seleccione un recargo.');
    const indice = C.ESTADOS.indexOf(d.estado), p = revertir ? C.PERMISOS[4] : C.PERMISOS[indice + 1];
    if (!p || !permiso(ctx, p)) return fallo('No tiene el permiso simulado necesario: ' + (p || 'el recargo ya está liberado') + '.');
    if (revertir && st.conciliaciones.some(c => c.recargos.some(r => r.catalogoId === id))) return fallo('REVERSIÓN DENEGADA: ya existe una conciliación asociada a la multa.');
    d.estado = revertir ? C.ESTADOS[0] : C.ESTADOS[indice + 1];
    d.historial.push(Object.assign({ estado: d.estado, accion: revertir ? 'Rechazar / volver a elaboración' : 'Avanzar', permiso: p }, sello(ctx)));
    return exito('Estado del recargo: ' + d.estado + '. No es el estado de la conciliación.', id);
  };
  C.calcular = (st, conc, r, modo) => {
    if (!r.catalogoId) { const base = Number(r.monto || 0) * Number(r.cantidad == null ? 1 : r.cantidad); return { total: M.redHU(base), sinRedondear: base, pasos: ['Recargo anterior sin definición: monto × cantidad.'] }; }
    const d = M.porId(st.recargosCatalogo, r.catalogoId), sigla = d && d.sigla, cantidad = Number(r.cantidad == null ? 1 : r.cantidad), monto = Number(r.monto);
    let moneda = r.moneda || (d && d.moneda) || 'BOB', base = monto * cantidad;
    const pasos = [`Monto ${monto} ${moneda} × cantidad ${cantidad}.`];
    if (sigla === 'MPF') { base = monto / 1000 * cantidad * 1.15; pasos.push(`MPF: ${monto} / 1.000 × ${cantidad} × 1,15 = ${base}.`); }
    if (sigla === 'EHR') {
      const cre = M.porId(st.cres, r.creId);
      const precio = cre && st.precios.filter(p => p.productoId === cre.productoId && p.vigInicio <= cre.fecha).sort((a, b) => b.vigInicio.localeCompare(a.vigInicio))[0];
      base = monto / 100 * cantidad * (precio ? precio.ppt : 0);
      pasos.push(`EHR: ${monto} / 100 × ${cantidad} L × PPT ${precio ? precio.ppt : 0} del producto/fecha del CRE = ${base}.`);
      if (!precio) pasos.push('Sin PPT: SQL utiliza cero; debe investigarse, no confundirse con ausencia de incidente.');
      if (moneda === '%') moneda = 'BOB';
    }
    if (moneda === 'Bs' || moneda === 'VAR' && (modo === 'PROPUESTO' || !['MPF', 'EHR'].includes(sigla))) moneda = 'BOB';
    const destino = conc.moneda === 'Bs' ? 'BOB' : conc.moneda === 'Sus' ? 'USD' : conc.moneda;
    if (moneda !== destino) {
      const tc = Number(r.tc || C.TC_V1);
      if (!Number.isFinite(tc) || tc <= 0) return { total: NaN, pasos: pasos.concat('TC inválido: no se puede convertir.') };
      const divide = modo === 'V1' && !['MPF', 'EHR'].includes(sigla) ? destino === 'BOB' : moneda === 'BOB';
      base = divide ? base / tc : base * tc;
      pasos.push(`${modo === 'V1' && !['MPF', 'EHR'].includes(sigla) ? 'Rama ordinaria V1 (D33)' : 'Conversión origen → destino'}: ${divide ? 'dividir' : 'multiplicar'} por TC ${tc}.`);
    }
    pasos.push(`Redondeo final: ${M.fmtB(M.redHU(base))} ${destino}; en el neto se descuenta.`);
    return { total: M.redHU(base), sinRedondear: base, pasos };
  };
  C.sumar = (st, conc, tipo, modo) => {
    const registros = conc.recargos.filter(r => r.tipo === tipo);
    if (modo === 'V1') {
      for (const sigla of ['MPF', 'EHR']) {
        const grupos = new Set(registros.filter(r => (M.porId(st.recargosCatalogo, r.catalogoId) || {}).sigla === sigla)
          .map(r => `${sigla === 'EHR' && r.moneda === '%' ? 'BOB' : r.moneda}|${r.tc}`));
        if (grupos.size > 1) throw new Error(`D37: ${sigla} tiene varios grupos de moneda/TC. La subconsulta escalar de V1 fallaría. En modo Propuesto se convierten y suman los grupos.`);
      }
    }
    // Cada variable SQL (@Monto, @MontoFiltracion, @MontoExtravio) redondea a 2 decimales.
    const ramas = { ordinario: 0, MPF: 0, EHR: 0 };
    const vistos = new Set();
    registros.forEach(r => {
      if (r.id && vistos.has(r.id)) return; // SELECT DISTINCT ID de aplicación, no por monto/concepto.
      if (r.id) vistos.add(r.id);
      const sigla = (M.porId(st.recargosCatalogo, r.catalogoId) || {}).sigla, rama = ['MPF', 'EHR'].includes(sigla) ? sigla : 'ordinario';
      const calc = C.calcular(st, conc, r, modo); ramas[rama] += calc.sinRedondear ?? calc.total;
    });
    return M.redHU(Object.values(ramas).reduce((s, n) => s + M.redHU(n), 0));
  };
  C.aplicarCRE = (st, concId, creId, entradas, ctx) => {
    if (!permiso(ctx, C.PERMISOS[0])) return fallo('Falta el permiso MC Aplicar Multa Descuento (simulado).');
    const c = M.porId(st.conciliaciones, concId), cre = M.porId(st.cres, creId);
    if (!c || c.estado !== 'En Elaboracion') return fallo('Seleccione una conciliación en elaboración (protección del prototipo).');
    const ambito = cre && [3, 4, 5].includes(cre.tipo) ? 'CRE_D' : 'CRE_R';
    if (!cre || !C.cres(st, c, ambito).some(x => x.id === creId)) return fallo('El CRE no pertenece a esta conciliación.');
    if (new Set(entradas.map(e => Number(e.id))).size !== entradas.length) return fallo('No repita un recargo en la misma aplicación.');
    const nuevas = [];
    for (const e of entradas) {
      const d = M.porId(st.recargosCatalogo, e.id);
      if (!d) return fallo('No existe el recargo seleccionado.');
      const v = C.elegibilidad(st, c, d, ambito, ctx.modo);
      if (!v.permitido) return fallo(v.motivos.join(' '));
      const monto = d.moneda === 'VAR' ? Number(e.monto) : d.monto, cantidad = Number(e.cantidad), tc = ctx.modo === 'V1' ? C.TC_V1 : Number(e.tc || st.tc);
      if (!Number.isFinite(monto) || monto <= 0 || !Number.isInteger(cantidad) || cantidad < 0 || !Number.isFinite(tc) || tc <= 0) return fallo('Monto mayor a cero, cantidad entera no negativa y TC positivo (protecciones del prototipo).');
      nuevas.push({ tipo: c.tipo === 'Barcaza' ? 'CBARC' : c.tipo === 'Vagon' ? 'CVAG' : 'CCIST', catalogoId: d.id, concepto: d.concepto, monto, moneda: d.moneda, tc, cantidad, creId, conciliacionId: c.id,
        observacion: '', factura: '', registro: sello(ctx) });
    }
    // VB borra por CREID sin filtrar ConciliacionID. Propuesto limita el reemplazo al contexto actual.
    const afectadas = ctx.modo === 'V1' ? st.conciliaciones : [c];
    const antes = afectadas.reduce((n, x) => n + x.recargos.filter(r => r.creId === creId && r.catalogoId).length, 0);
    let id = Math.max(st.proximoIdAplicacionContractual || 1, siguienteId(st.conciliaciones.flatMap(x => x.recargos)));
    afectadas.forEach(x => { x.recargos = x.recargos.filter(r => !(r.creId === creId && r.catalogoId)); });
    nuevas.forEach(r => c.recargos.push(Object.assign({ id: id++ }, r)));
    st.proximoIdAplicacionContractual = id; // No reutilizar identidades al reemplazar/borrar la selección.
    c.historial.push(Object.assign({ accion: `Multas contractuales CRE ${cre.numero}: ${nuevas.length} seleccionadas; reemplazadas ${antes}.`, estado: c.estado }, sello(ctx)));
    return exito(`${nuevas.length} recargos guardados para ${cre.numero}. Totales guardados no cambian hasta Procesar.`, c.id);
  };
})(SILOG.multasContractuales = {});

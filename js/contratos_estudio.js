/* Contratos de transporte V1: catálogo compartido del recorrido, no adaptador de producción.
 * Los catálogos y expedientes son ficticios; las operaciones citan VB/SQL en la vista. */
window.SILOG = window.SILOG || {};
(function (C) {
  const M = SILOG.motor;
  C.ESTADOS = ['EN ELABORACION', 'PENDIENTE DE APROBACION', 'PENDIENTE DE LIBERACION', 'LIBERADO'];
  C.PERMISOS = ['Registrar Contrato', 'Adicionar Adenda Contrato', 'Finalizar Contrato', 'MC Puede Solicitar AP', 'MC Puede Solicitar LB', 'MC Puede Liberar', 'MC Puede Rechazar Contrato'];
  C.PASOS = ['Entender las relaciones', 'Registrar contrato', 'Registrar tarifas', 'Aprobar y liberar', 'Crear una adenda', 'Consultar qué tarifa aplica', 'Uso y reversión'];
  const error = msg => ({ ok: false, msg });
  const ok = (msg, id) => ({ ok: true, msg, id });
  const porId = (xs, id) => xs.find(x => x.id === Number(id));
  const fecha = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const texto = s => typeof s === 'string' ? s.trim() : '';
  const numero = x => (typeof x === 'number' || typeof x === 'string' && x.trim() !== '') && Number.isFinite(Number(x)) ? Number(x) : NaN;
  const permite = (ctx, p) => ctx?.permisos?.[p] === true;
  const evento = (m, ctx, accion, detalle) => m.eventos.unshift({ fecha: m.hoy, usuario: ctx?.usuario || 'estudiante', accion, detalle });
  // Identidades internas del ejercicio; NO cambian números ni IDs documentales de V1.
  C.identidad = () => globalThis.crypto?.randomUUID?.() || `estudio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  C.identificar = m => { m.catalogoId ||= C.identidad(); m.usosConciliacion ||= []; return m; };
  C.nuevo = () => ({ version: 1, catalogoId: C.identidad(), hoy: '2026-10-02', siguiente: { contrato: 1, historial: 1, tarifa: 1, uso: 1 },
    empresas: [{ id: 501, nombre: 'Transportes Cóndor Andino SRL', medioId: 1 }, { id: 502, nombre: 'Cisternas del Oriente SA', medioId: 1 }],
    localidades: [{ id: 701, codigo: 'PLA-ORURO', nombre: 'Planta de Almacenaje Oruro' }, { id: 702, codigo: 'PLA-POTOSI', nombre: 'Planta de Almacenaje Potosí' }, { id: 703, codigo: 'PLA-SENKATA', nombre: 'Planta de Almacenaje Senkata' }],
    productos: [{ id: 801, codigo: 'GES', nombre: 'Gasolina Especial' }, { id: 802, codigo: 'DO', nombre: 'Diésel Oil' }],
    medios: [{ id: 1, nombre: 'Cisterna', unidad: 'm³', unidadCalculo: 'L' }],
    rutas: [{ id: 901, medioId: 1, origenId: 701, destinoId: 702, prioridad: 'PRINCIPAL', nombre: 'Oruro → Potosí · principal' }, { id: 902, medioId: 1, origenId: 701, destinoId: 702, prioridad: 'ALTERNA 1', nombre: 'Oruro → Potosí · alterna 1' }, { id: 903, medioId: 1, origenId: 702, destinoId: 701, prioridad: 'PRINCIPAL', nombre: 'Potosí → Oruro · principal' }, { id: 904, medioId: 1, origenId: 701, destinoId: 703, prioridad: 'PRINCIPAL', nombre: 'Oruro → Senkata · principal' }],
    marcos: [{ id: 601, numero: '4600002741', inicio: '2026-01-01', fin: '2027-12-31', datoSAP: 'CM' }],
    contratos: [], historiales: [], tarifas: [], usos: [], usosConciliacion: [], eventos: [] });
  C.preparar = st => C.identificar(st.estudioContratos || (st.estudioContratos = C.nuevo()));
  C.todosUsos = m => [...m.usos, ...(m.usosConciliacion || [])];
  C.usosActivos = m => C.todosUsos(m).filter(u => u.activo !== false);
  // Índice de trazabilidad derivado del detalle persistido, NO otro saldo o conciliación.
  // Se conserva la referencia retirada para explicar exclusiones sin duplicar el flete.
  C.sincronizarUsos = recorrido => {
    const m = C.identificar(recorrido.contratos), actuales = new Set();
    recorrido.ejercicioId ||= C.identidad();
    for (const c of recorrido.recorridoConciliaciones?.lista || []) for (const l of c.lineas) {
      const clave = `${recorrido.ejercicioId}:${c.id}:${l.id}`, p = l.procedencia || {};
      actuales.add(clave);
      if (!m.usosConciliacion.some(u => u.clave === clave)) m.usosConciliacion.push({
        clave, origen: 'CONCILIACION', ejercicioId: recorrido.ejercicioId, conciliacionId: c.id, numeroConciliacion: c.numero,
        lineaId: l.id, despachoId: l.despachoId, recepcionId: l.recepcionId, empresaId: c.transportistaId, medioId: c.medio,
        contratoId: p.contratoId ?? c.contratoId, historialId: p.historialId ?? null, tarifaId: p.tarifaId ?? null,
        fecha: l.fechaDescarga, volumen: l.volRec, tarifaAplicada: l.tarifa, flete: l.totalFlete, moneda: c.moneda,
        activo: true, fotografia: { ...structuredClone(p) }
      });
    }
    for (const u of m.usosConciliacion) if (u.ejercicioId === recorrido.ejercicioId && u.activo && !actuales.has(u.clave)) {
      u.activo = false; u.fechaRetiro = recorrido.hoy; u.motivoRetiro = 'La línea dejó de formar parte del detalle de la conciliación.';
    }
    return m.usosConciliacion;
  };
  C.historiales = (m, id) => m.historiales.filter(h => h.contratoId === Number(id)).sort((a, b) => a.secuencia - b.secuencia);
  C.fechas = (m, id) => {
    const hs = C.historiales(m, id), liberadas = hs.filter(h => h.estado === 'LIBERADO');
    if (hs.length === 1) return { inicio: hs[0].inicio, fin: hs[0].fin, aviso: hs[0].estado !== 'LIBERADO' ? 'Con una sola fila, MC_ObtenerFechaContrato devuelve sus fechas incluso sin liberar. La búsqueda de tarifa exige además LIBERADO y AprobacionTarifa.' : '' };
    if (!liberadas.length) return { inicio: null, fin: null, aviso: 'No hay versión liberada. V1 usa GETDATE()+10 años como fecha de respaldo; aquí se informa sin vigencia comprobada, no un contrato utilizable.' };
    const ultima = liberadas.at(-1), finales = liberadas.filter(h => h.opcion === 'FINALIZACION');
    if (ultima.opcion === 'FINALIZACION' && finales.length !== 1) return { inicio: null, fin: null, aviso: 'V1 usa una subconsulta escalar de finalización: varias finalizaciones liberadas pueden fallar. No se elige una arbitrariamente.' };
    return { inicio: liberadas.map(h => h.inicio).sort()[0], fin: ultima.opcion === 'FINALIZACION' ? ultima.fin : liberadas.map(h => h.fin).sort().at(-1), aviso: '' };
  };
  C.crear = (m, d, ctx) => {
    if (!permite(ctx, 'Registrar Contrato')) return error('Falta la actividad Registrar Contrato. Los permisos de este ejercicio son simulados.');
    const empresa = porId(m.empresas, d.empresaId), medio = empresa && porId(m.medios, empresa.medioId), numeroContrato = texto(d.numero);
    if (!empresa || !medio) return error('Selecciona una empresa y un medio del catálogo de este ejercicio.');
    if (!numeroContrato || numeroContrato.length > 30) return error('Ingresa un número de contrato de hasta 30 caracteres. El ejercicio exige número explícito; V1 también tiene una rama automática Count+1.');
    if (m.contratos.some(c => c.numero.toUpperCase() === numeroContrato.toUpperCase())) return error('El número de contrato ya existe en este ejercicio.');
    if (!fecha(d.inicio) || !fecha(d.fin) || d.inicio > d.fin) return error('Ingresa fechas válidas: el inicio no puede ser posterior al fin.');
    if (!['Bs', 'USD'].includes(d.moneda)) return error('Selecciona la moneda. Aquí no se simula conversión monetaria.');
    const marcoId = Number(d.marcoId || 0), marco = porId(m.marcos, marcoId);
    if (marcoId && (!marco || d.inicio < marco.inicio || d.fin > marco.fin)) return error('Las fechas deben estar dentro de las del contrato marco seleccionado.');
    if (marco && marco.datoSAP === 'CM' && m.contratos.some(c => c.marcoId === marco.id)) return error('El contrato marco CM ya está asociado a otro contrato.');
    const superpuesto = m.contratos.some(c => c.empresaId === empresa.id && C.historiales(m, c.id).some(h => h.opcion !== 'FINALIZACION' && d.inicio <= h.fin && d.fin >= h.inicio));
    // El procedimiento V1 termina en AND 1 = 2: su contador siempre resulta cero.
    // El modelo propuesto comprueba intervalos; no se presenta como una protección existente.
    if (superpuesto && ctx.modo === 'PROPUESTO') return error('Protección propuesta: ya hay un contrato de la misma empresa con fechas superpuestas. En el SQL V1 estudiado, AND 1 = 2 anula esta validación.');
    const contrato = { id: m.siguiente.contrato++, numero: numeroContrato, empresaId: empresa.id, medioId: medio.id, moneda: d.moneda, unidad: medio.unidad, marcoId: marcoId || null, fiscal: texto(d.fiscal) };
    const h = { id: m.siguiente.historial++, contratoId: contrato.id, secuencia: 1, opcion: 'CONTRATO', tipo: null, nroAdenda: null, inicio: d.inicio, fin: d.fin, observacion: '', adjunto: '', estado: C.ESTADOS[0] };
    m.contratos.push(contrato); m.historiales.push(h);
    evento(m, ctx, 'Registrar contrato', `${contrato.numero}: MC_Contrato #${contrato.id}, historial PK #${h.id}, secuencia 1. Forma de pago y fiscales solo se explican; no se crean sus tablas en este ejercicio.`);
    return ok('Contrato registrado en elaboración. Todavía no tiene tarifas aprobadas.' + (superpuesto ? ' Advertencia V1: se admitió un solapamiento porque MC_ExistenContratosVigentes termina en AND 1 = 2.' : ''), h.id);
  };
  C.guardarTarifas = (m, historialId, filas, ctx) => {
    const h = porId(m.historiales, historialId), c = h && porId(m.contratos, h.contratoId);
    if (!h || !c || h.estado !== C.ESTADOS[0] || h.opcion === 'FINALIZACION') return error('Selecciona un contrato/adenda en elaboración para registrar su matriz.');
    if (!Array.isArray(filas) || filas.length > 100) return error('La matriz del ejercicio admite hasta 100 filas.');
    const nuevas = [], claves = new Set();
    for (const f of filas) {
      const ruta = porId(m.rutas, f.rutaId), producto = porId(m.productos, f.productoId), tarifa = numero(f.tarifa), admisible = numero(f.admisible);
      if (!ruta || ruta.medioId !== c.medioId || !producto) return error('Cada fila debe tener un producto y una ruta parametrizada compatible con el medio.');
      if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 1000000) return error('La tarifa debe ser un número entre 0 y 1.000.000.');
      if (tarifa === 0) continue; // V1 omite filas de importe cero al reinsertar la matriz.
      if (!Number.isFinite(admisible) || admisible <= 0 || admisible > 100) return error('Con tarifa distinta de cero debes ingresar admisible positivo. El ejercicio limita el porcentaje a 100.');
      const clave = `${ruta.id}/${producto.id}`;
      if (claves.has(clave)) return error('La matriz repite una ruta/prioridad y producto. No se guardó ninguna fila.');
      claves.add(clave); nuevas.push({ historialId: h.id, rutaId: ruta.id, productoId: producto.id, tarifa, admisible, activa: true, aprobada: false });
    }
    const anteriores = m.tarifas.filter(t => t.historialId === h.id);
    if (anteriores.some(t => C.usosActivos(m).some(u => u.tarifaId === t.id))) return error('Protección del ejercicio: no se reemplazan IDs de tarifas con usos vigentes, aunque la versión haya vuelto a elaboración. Los usos retirados conservan su fotografía.');
    m.tarifas = m.tarifas.filter(t => t.historialId !== h.id).concat(nuevas.map(t => ({ ...t, id: m.siguiente.tarifa++ })));
    evento(m, ctx, 'Registrar matriz', `Historial PK #${h.id}: reemplaza ${anteriores.length} por ${nuevas.length} tarifas. V1 borra/reinserta en transacción; los IDs cambian. La selección explícita de versión evita depender de la primera fila del grid.`);
    return ok('Matriz guardada con AprobacionTarifa=0. Falta aprobar y liberar la versión.', h.id);
  };
  C.avanzar = (m, id, ctx) => {
    const h = porId(m.historiales, id), i = h && C.ESTADOS.indexOf(h.estado);
    if (!h || i < 0 || i >= C.ESTADOS.length - 1) return error('La versión no tiene una transición siguiente disponible.');
    const permiso = C.PERMISOS[3 + i];
    if (!permite(ctx, permiso)) return error(`Falta la actividad ${permiso}.`);
    h.estado = C.ESTADOS[i + 1];
    if (h.estado === 'LIBERADO') m.tarifas.filter(t => t.historialId === h.id).forEach(t => { t.aprobada = true; });
    evento(m, ctx, permiso, `Historial PK #${h.id} → ${h.estado}${h.estado === 'LIBERADO' ? '; AprobacionTarifa=1 en sus tarifas.' : '.'}`);
    return ok(`Versión en ${h.estado}.`, h.id);
  };
  C.adenda = (m, contratoId, d, ctx) => {
    const c = porId(m.contratos, contratoId), hs = C.historiales(m, contratoId), ultima = hs.at(-1);
    if (!c || !ultima || ultima.estado !== 'LIBERADO' || ultima.opcion === 'FINALIZACION') return error('Primero libera la última versión. No se agrega otra adenda tras una finalización en este ejercicio.');
    const finaliza = d.tipo === 'FINALIZACION';
    if (!permite(ctx, finaliza ? 'Finalizar Contrato' : 'Adicionar Adenda Contrato')) return error(`Falta la actividad ${finaliza ? 'Finalizar Contrato' : 'Adicionar Adenda Contrato'}.`);
    if (!['MCOND', 'ACONT', 'FINALIZACION'].includes(d.tipo)) return error('El ejercicio implementa MCOND, ACONT y la finalización; V1 carga MC_TipoAdenda dinámicamente.');
    const previas = hs.filter(h => h.opcion !== 'FINALIZACION'), finAnterior = previas.map(h => h.fin).sort().at(-1), inicioAnterior = previas.map(h => h.inicio).sort().at(-1);
    const inicio = d.tipo === 'ACONT' ? M.sumarDias(finAnterior, 1) : finaliza ? d.fin : d.inicio;
    const fin = d.tipo === 'MCOND' ? finAnterior : d.fin;
    if (!fecha(inicio) || !fecha(fin) || inicio > fin) return error('Las fechas de la adenda no son válidas.');
    if (d.tipo === 'MCOND' && (inicio < inicioAnterior || inicio > finAnterior)) return error('MCOND cambia condiciones dentro del periodo anterior y conserva su fecha final.');
    if (finaliza && (fin < hs.map(h => h.inicio).sort()[0] || fin >= hs.map(h => h.fin).sort().at(-1))) return error('La finalización debe estar entre el inicio del contrato y el día anterior a su fin.');
    const marco = porId(m.marcos, c.marcoId);
    if (marco && (inicio < marco.inicio || fin > marco.fin)) return error('La adenda debe quedar dentro del contrato marco.');
    if (C.usosActivos(m).some(u => (u.contratoId === c.id || porId(m.historiales, u.historialId)?.contratoId === c.id) && u.fecha >= fin)) return error('La comprobación de recepción conciliada detecta una fecha igual o posterior al fin propuesto. V1 hace este control al registrar el historial.');
    const h = { id: m.siguiente.historial++, contratoId: c.id, secuencia: Math.max(...hs.map(x => x.secuencia)) + 1, opcion: finaliza ? 'FINALIZACION' : 'ADENDA', tipo: finaliza ? null : d.tipo, nroAdenda: finaliza ? null : hs.filter(x => x.opcion === 'ADENDA').length + 1, inicio, fin, observacion: texto(d.observacion), adjunto: texto(d.adjunto), estado: C.ESTADOS[0] };
    m.historiales.push(h);
    evento(m, ctx, h.opcion, `Contrato #${c.id} conserva identidad. Nueva PK #${h.id}, secuencia ${h.secuencia}; ${inicio} a ${fin}. No se copiaron tarifas automáticamente.`);
    return ok(`${h.opcion} registrada en elaboración. No altera aún las tarifas aplicables.`, h.id);
  };
  C.consultar = (m, q) => {
    const empresa = porId(m.empresas, q.empresaId), origen = porId(m.localidades, q.origenId), destino = porId(m.localidades, q.destinoId), producto = porId(m.productos, q.productoId);
    if (!empresa || !origen || !destino || !producto || !fecha(q.fecha) || !m.rutas.some(r => r.prioridad === q.prioridad)) return error('Completa empresa, ruta dirigida, producto, prioridad y fecha de consulta.');
    const candidatos = m.tarifas.filter(t => porId(m.contratos, porId(m.historiales, t.historialId).contratoId).empresaId === empresa.id).map(t => {
      const h = porId(m.historiales, t.historialId), c = porId(m.contratos, h.contratoId), r = porId(m.rutas, t.rutaId), vig = C.fechas(m, c.id), motivos = [];
      if (r.origenId !== origen.id || r.destinoId !== destino.id) motivos.push('Origen/destino distintos: la ruta inversa no equivale.');
      if (t.productoId !== producto.id) motivos.push('Otro producto.');
      if (r.prioridad !== q.prioridad) motivos.push('Otra prioridad: no hay sustitución automática por alterna.');
      if (!t.activa) motivos.push('Estado de tarifa inactivo.');
      if (!t.aprobada) motivos.push('AprobacionTarifa=0.');
      if (h.estado !== 'LIBERADO') motivos.push('Versión no liberada.');
      if (!vig.fin || q.fecha < h.inicio || q.fecha > vig.fin) motivos.push('Fuera del inicio de la versión o del fin efectivo del contrato.');
      return { t, h, c, r, vig, motivos };
    });
    const elegibles = candidatos.filter(x => !x.motivos.length).sort((a, b) => b.h.inicio.localeCompare(a.h.inicio));
    if (elegibles.length > 1 && elegibles[0].h.inicio === elegibles[1].h.inicio) return { ok: false, msg: 'Empate de VigenciaInicio: TOP 1 de V1 no tiene desempate adicional. El ejercicio no inventa qué fila devolverá SQL.', candidatos, ambigua: true };
    const elegida = elegibles[0] || null;
    const divisor = elegida?.c.medioId === 3 ? 1 : 1000;
    return { ok: true, candidatos, elegida, divisor, tarifa: elegida ? M.redHU(M.redHU(elegida.t.tarifa, 5) / divisor, 5) : 0, aviso: elegida ? 'V1 ordena por inicio de vigencia descendente; el límite final procede del contrato, no necesariamente del fin de la versión que creó la tarifa. Usa decimal(18,5); la tarifa de vagón por tonelada no se divide entre 1.000.' : 'Sin coincidencia V1 devuelve 0. No significa transporte gratuito ni ausencia de contrato.', fecha: q.fecha };
  };
  C.registrarUso = (m, q, ctx) => {
    const r = C.consultar(m, q);
    if (!r.ok || !r.elegida) return error(r.msg || 'No hay tarifa comprobada para registrar un uso simulado.');
    const volumen = numero(q.volumen);
    if (!(volumen > 0 && volumen <= 100000000)) return error('Ingresa un volumen recibido positivo para el ejemplo de flete.');
    const x = r.elegida, uso = { id: m.siguiente.uso++, fecha: q.fecha, historialId: x.h.id, tarifaId: x.t.id, empresaId: x.c.empresaId, medioId: x.c.medioId, volumen, unidadVolumen: x.c.medioId === 3 ? 't' : 'L', tarifaAplicada: r.tarifa, flete: M.redHU(volumen * r.tarifa), moneda: x.c.moneda };
    m.usos.push(uso); evento(m, ctx, 'Uso didáctico de tarifa', `Uso #${uso.id}: tarifa #${uso.tarifaId} / historial #${uso.historialId}; flete ${uso.flete} ${uso.moneda}. No crea CRE ni conciliación real.`);
    return ok('Uso simulado registrado con sus relaciones. Es un ejemplo de flete, no una conciliación generada.', uso.id);
  };
  C.controlReversion = (m, id) => {
    const h = porId(m.historiales, id), c = h && porId(m.contratos, h.contratoId);
    if (!h || !c) return null;
    // Réplica del defecto comprobado: @FechaFin también se carga de VigenciaInicio.
    const activos = C.usosActivos(m), corresponde = u => u.historialId === h.id || u.origen === 'CONCILIACION' && !u.historialId && u.contratoId === c.id;
    const detectadosV1 = activos.filter(u => u.empresaId === c.empresaId && (u.medioId || c.medioId) === c.medioId && u.fecha === h.inicio);
    const relacionados = activos.filter(corresponde);
    return { detectadosV1, relacionados, retirados: C.todosUsos(m).filter(u => u.activo === false && corresponde(u)) };
  };
  C.revertir = (m, id, ctx) => {
    const h = porId(m.historiales, id), control = C.controlReversion(m, id);
    if (!h || h.estado === C.ESTADOS[0]) return error('Selecciona una versión que haya avanzado.');
    if (!permite(ctx, 'MC Puede Rechazar Contrato')) return error('Falta MC Puede Rechazar Contrato (la UI original oculta el control).');
    if (ctx.modo === 'PROPUESTO' ? control.relacionados.length || control.detectadosV1.length : control.detectadosV1.length) return error(ctx.modo === 'PROPUESTO' ? 'Protección propuesta: existen usos relacionados o detectados por fecha. No se revierte.' : 'V1 detecta una conciliación en el rango consultado y deniega la reversión.');
    h.estado = C.ESTADOS[0]; m.tarifas.filter(t => t.historialId === h.id).forEach(t => { t.aprobada = false; });
    evento(m, ctx, 'Revertir', `Historial #${h.id} vuelve a elaboración y sus tarifas a AprobacionTarifa=0.${control.relacionados.length ? ' Riesgo V1 reproducido: la consulta por fecha no encontró sus usos relacionados.' : ''}`);
    return ok('Versión devuelta a elaboración. Sus usos anteriores conservan la fotografía del flete.', h.id);
  };
  C.casoCompleto = () => {
    const m = C.nuevo(), ctx = { usuario: 'estudiante', modo: 'V1', permisos: Object.fromEntries(C.PERMISOS.map(p => [p, true])) };
    const crear = (empresaId, numeroContrato) => C.crear(m, { empresaId, numero: numeroContrato, inicio: '2026-01-01', fin: '2026-12-31', moneda: 'Bs' }, ctx).id;
    const liberar = id => { for (let i = 0; i < 3; i++) C.avanzar(m, id, ctx); };
    const h1 = crear(501, 'CIS-018-2026'), h2 = crear(502, 'CIS-027-2026');
    C.guardarTarifas(m, h1, [{ rutaId: 901, productoId: 801, tarifa: 210, admisible: 0.3 }, { rutaId: 902, productoId: 801, tarifa: 250, admisible: 0.3 }, { rutaId: 901, productoId: 802, tarifa: 180, admisible: 0.3 }], ctx);
    C.guardarTarifas(m, h2, [{ rutaId: 901, productoId: 801, tarifa: 230, admisible: 0.4 }], ctx); liberar(h1); liberar(h2);
    const h3 = C.adenda(m, 1, { tipo: 'MCOND', inicio: '2026-09-16', observacion: 'Cambio de tarifa de gasolina; no se cambia la tarifa de diésel.', adjunto: 'Adenda_01_CIS_018.pdf (nombre simulado)' }, ctx).id;
    C.guardarTarifas(m, h3, [{ rutaId: 901, productoId: 801, tarifa: 225, admisible: 0.3 }], ctx); liberar(h3);
    return m;
  };
})(SILOG.contratosEstudio = {});

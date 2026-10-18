/* Pruebas dirigidas sin navegador ni base de datos. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
let guardado;
global.localStorage = { getItem: () => guardado || null, setItem: (_, v) => { guardado = v; } };
const eventos = {};
global.document = { addEventListener: (tipo, fn) => (eventos[tipo] ||= []).push(fn) };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'contratos_estudio', 'ordenes_estudio', 'hojas_ruta_estudio', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'vistas_contratos_estudio', 'vistas_ordenes_estudio', 'app', 'control_ordenes_estudio'].forEach(f => require('../js/' + f + '.js'));
const O = SILOG.ordenesEstudio, C = SILOG.contratosEstudio, E = SILOG.estado, U = SILOG.estudioOrdenesUI, V = SILOG.vistas, A = SILOG.app;
const ctx = () => ({ usuario: 'estudiante', permisos: Object.fromEntries(O.PERMISOS.map(p => [p, true])) });
const cab = extra => ({ origenId: 701, medioId: 1, fecha: '2026-10-02', ...extra });
const manual = extra => ({ destinoId: 702, productoId: 801, unidadId: 1001, conductorId: 1101, volumen: 34000, ...extra });
const nuevo = (m, filas = [{ solicitudId: 6001 }, { solicitudId: 6002 }, { solicitudId: 6003 }], extra = {}) => { const r = O.crear(m, cab(extra), filas, ctx()); assert.ok(r.ok, r.msg); return m.ordenes.find(o => o.id === r.id); };
const aprobado = (m, o) => { assert.ok(O.cambiar(m, o.id, 'solicitar', ctx()).ok); assert.ok(O.cambiar(m, o.id, 'aprobar', ctx()).ok); };
const cre = (m, o, ids = [o.detalles[0].id], d = { tanqueId: 4101, unidadId: 1001 }) => { const r = O.prepararCRE(m, o.id, ids, { loteId: o.medioId, ...d }, ctx()); assert.ok(r.ok, r.msg); return m.cres.find(c => c.id === r.id); };
const atomico = (m, fn) => { const antes = JSON.stringify(m), r = fn(); assert.equal(r.ok, false, r.msg); assert.equal(JSON.stringify(m), antes, r.msg); return r; };
let total = 0;
const prueba = (nombre, fn) => { fn(); total++; console.log('OK ' + nombre); };

prueba('El ejercicio comparte el catálogo de contratos sin modificarlo al guardar una orden', () => {
  const contratos = C.casoCompleto(), antes = JSON.stringify(contratos), m = O.nuevo(contratos); nuevo(m);
  assert.equal(JSON.stringify(contratos), antes); assert.equal(m.contratos, contratos);
  m.contratos.tarifas[0].tarifa = 999; assert.equal(contratos.tarifas[0].tarifa, 999);
});
prueba('Guardar crea una cabecera numerada 0, detalles estables y parcial apagado', () => {
  const m = O.nuevo(), o = nuevo(m);
  assert.equal(o.estado, 'EN ELABORACION'); assert.equal(o.numero, 0); assert.equal(o.parcial, false);
  assert.deepEqual(o.detalles.map(d => d.id), [1, 2, 3]); assert.equal(m.cres.length, 0); assert.equal(m.terminales[0].proximo, 28389);
  assert.equal(o.detalles[0].tarifaId, 5); assert.equal(o.detalles[2].tarifaId, 4);
});
for (const extra of [{ origenId: 999 }, { medioId: 4 }, { fecha: '2026-02-30' }, { fecha: '2026-10-01' }, { origenId: 703, medioId: 3 }]) prueba('Cabecera inválida no escribe ' + JSON.stringify(extra), () => {
  const m = O.nuevo(); atomico(m, () => O.crear(m, cab(extra), [{ solicitudId: 6001 }], ctx()));
});
prueba('No se guarda vacía ni se crea sin permiso', () => {
  const m = O.nuevo(); atomico(m, () => O.crear(m, cab(), [], ctx()));
  atomico(m, () => O.crear(m, cab(), [{ solicitudId: 6001 }], { ...ctx(), permisos: {} }));
});
for (const solicitudId of [9999, 6005, 6006]) prueba('Solicitud ajena o medio incompatible no escribe ' + solicitudId, () => {
  const m = O.nuevo(); atomico(m, () => O.crear(m, cab(), [{ solicitudId }], ctx()));
});
prueba('SHR sin hoja tramitada se rechaza', () => { const m = O.nuevo(); m.solicitudes[0].estado = 'ACTIVO'; atomico(m, () => O.crear(m, cab(), [{ solicitudId: 6001 }], ctx())); });
prueba('No repite SHR ni placa en orden normal, incluso la segunda fila', () => {
  const m = O.nuevo(); atomico(m, () => O.crear(m, cab(), [{ solicitudId: 6001 }, { solicitudId: 6001 }], ctx()));
  atomico(m, () => O.crear(m, cab(), [{ solicitudId: 6002 }, { solicitudId: 6004 }], ctx()));
});
prueba('Bloqueo de pendiente es por terminal y medio, no fecha', () => {
  const m = O.nuevo(); nuevo(m); atomico(m, () => O.crear(m, cab({ fecha: '2026-10-03' }), [{ solicitudId: 6004 }], ctx()));
  assert.ok(O.crear(m, cab({ medioId: 2 }), [{ solicitudId: 6005 }], ctx()).ok);
});
prueba('Manual normal requiere contrato, tramo y producto, no tarifa universal', () => {
  const m = O.nuevo(), o = nuevo(m, [manual({ destinoId: 703 })]); assert.equal(o.detalles[0].tarifaId, null); assert.equal(o.detalles[0].hoja, -1);
  const vacio = O.nuevo(C.nuevo()); atomico(vacio, () => O.crear(vacio, cab(), [manual({ destinoId: 703 })], ctx()));
});
for (const extra of [{ volumen: 0 }, { volumen: -1 }, { volumen: Infinity }, { volumen: 'NaN' }, { volumen: '' }, { volumen: 3.5 }, { volumen: 2147483648 }, { conductorId: 1103 }, { destinoId: 703, productoId: 802 }, { destinoId: 701 }, { unidadId: 2001 }, { productoId: 999 }]) prueba('Detalle manual inválido es atómico ' + JSON.stringify(extra), () => {
  const m = O.nuevo(); atomico(m, () => O.crear(m, cab({ origenId: 703 }), [manual(extra)], ctx()));
});
prueba('Manual variable omite contrato, admite unidad repetida y no inventa tarifa', () => {
  const m = O.nuevo(C.nuevo()), o = nuevo(m, [manual(), manual()], { origenId: 703 });
  assert.equal(o.variable, true); assert.equal(o.detalles.length, 2); assert.equal(o.detalles[0].tarifaId, null);
});
prueba('Solicitud y rechazo no consumen número; aprobación sí y correo separado por empresa', () => {
  const m = O.nuevo(), o = nuevo(m);
  O.cambiar(m, o.id, 'solicitar', ctx()); assert.equal(o.numero, 0);
  O.cambiar(m, o.id, 'rechazar', ctx()); assert.equal(o.estado, 'EN ELABORACION'); assert.equal(o.numero, 0);
  aprobado(m, o); assert.equal(o.numero, 28389); assert.equal(m.terminales[0].proximo, 28390);
  assert.deepEqual(m.correos.map(x => x.empresaId), [501, 502]); assert.ok(m.correos.every(x => !x.enviado));
});
for (const accion of ['aprobar', 'rechazar', 'liberar', 'habilitar', 'inhabilitar', 'inventada']) prueba('Transición desde elaboración inválida ' + accion, () => {
  const m = O.nuevo(), o = nuevo(m); atomico(m, () => O.cambiar(m, o.id, accion, ctx()));
});
for (const [accion, permiso, preparar] of [
  ['solicitar', 'Solicitar Aprobacion OD', () => {}], ['aprobar', 'Aprobar OD', (m, o) => O.cambiar(m, o.id, 'solicitar', ctx())],
  ['rechazar', 'Rechazar OD', (m, o) => O.cambiar(m, o.id, 'solicitar', ctx())], ['anular', 'Anular Orden', () => {}],
  ['habilitar', 'Habilitar Parcial OD', aprobado], ['inhabilitar', 'Inhabilitar Parcial OD', aprobado], ['liberar', 'Liberar OD', aprobado]
]) prueba('Actividad independiente requerida ' + permiso, () => {
  const m = O.nuevo(), o = nuevo(m); preparar(m, o); const c = ctx(); c.permisos[permiso] = false; atomico(m, () => O.cambiar(m, o.id, accion, c));
});
prueba('No se libera sin CRE activo; tampoco basta un previo', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); atomico(m, () => O.cambiar(m, o.id, 'liberar', ctx()));
  cre(m, o); atomico(m, () => O.cambiar(m, o.id, 'liberar', ctx()));
});
for (const tipo of ['empresa', 'ruta', 'destino', 'producto']) prueba('Selección exige mismo ' + tipo, () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o);
  let ids = [o.detalles[0].id, o.detalles[1].id];
  if (tipo === 'empresa') ids = [o.detalles[0].id, o.detalles[2].id];
  if (tipo === 'ruta') o.detalles[1].rutaId = 902;
  if (tipo === 'destino') o.detalles[1].destinoId = 703;
  if (tipo === 'producto') o.detalles[1].productoId = 802;
  atomico(m, () => O.prepararCRE(m, o.id, ids, { tanqueId: 4101, unidadId: 1001 }, ctx()));
});
for (const ids of [[], [999], [1, 1]]) prueba('Selección inexistente o duplicada ' + JSON.stringify(ids), () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); atomico(m, () => O.prepararCRE(m, o.id, ids, { tanqueId: 4101, unidadId: 1001 }, ctx()));
});
for (const d of [{ tanqueId: 999, unidadId: 1001 }, { tanqueId: 4301, unidadId: 1001 }, { tanqueId: 4102, unidadId: 1001 }, { tanqueId: 4101, unidadId: 1003 }]) prueba('Tanque y unidad deben corresponder a selección ' + JSON.stringify(d), () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); atomico(m, () => O.prepararCRE(m, o.id, [1], d, ctx()));
});
prueba('Normal agrupa dos detalles compatibles en un solo previo y al activar relaciona ambos', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o, [1, 2]);
  assert.equal(c.estadoId, 2); assert.equal(c.numero, 0); assert.equal(c.volumen, null); assert.equal(m.enlaces.length, 0);
  assert.equal(O.resumen(m, o).ejecutados, 0); atomico(m, () => O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001 }, ctx()));
  assert.ok(O.activarCRE(m, c.id, 66950, ctx()).ok); assert.equal(c.numero, 981124); assert.equal(c.volumen, 66950);
  assert.deepEqual(m.enlaces.map(e => e.detalleId), [1, 2]); assert.equal(new Set(m.enlaces.map(e => e.creId)).size, 1);
  assert.equal(O.resumen(m, o).ejecutados, 2); assert.equal(m.solicitudes[0].estado, 'UTILIZADO'); assert.equal(SILOG.hojasRutaEstudio.hoja(m, 6001).estado, 'EN TRANSITO'); assert.equal(SILOG.hojasRutaEstudio.hoja(m, 6002).estado, 'EN TRANSITO');
  assert.ok(m.enlaces.every(e => e.recepcionId == null)); atomico(m, () => O.activarCRE(m, c.id, 66950, ctx()));
});
prueba('Volumen consolidado inválido no activa ni consume número', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o);
  for (const v of [0, -1, Infinity, 'texto', 2.5]) atomico(m, () => O.activarCRE(m, c.id, v, ctx()));
});
prueba('Anular no elimina, permite otra orden y bloquea activar un previo huérfano', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o);
  assert.ok(O.cambiar(m, o.id, 'anular', ctx()).ok); assert.equal(o.detalles.length, 3);
  atomico(m, () => O.activarCRE(m, c.id, 34000, ctx())); assert.ok(O.crear(m, cab(), [{ solicitudId: 6004 }], ctx()).ok);
});
prueba('Anular con despacho activo está bloqueado', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o); O.activarCRE(m, c.id, 34000, ctx()); atomico(m, () => O.cambiar(m, o.id, 'anular', ctx()));
});
prueba('Liberación incompleta y habilitación parcial reproducen las transiciones V1', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o); O.activarCRE(m, c.id, 33980, ctx());
  assert.ok(O.cambiar(m, o.id, 'liberar', ctx()).ok); assert.equal(o.estado, 'LIBERADO'); assert.equal(o.parcial, false); assert.equal(O.resumen(m, o).ejecutados, 1);
  assert.ok(O.avanzarDia(m, '2026-10-03', ctx()).ok); atomico(m, () => O.prepararCRE(m, o.id, [2], { tanqueId: 4101, unidadId: 1002 }, ctx()));
  const numero = o.numero; assert.ok(O.cambiar(m, o.id, 'habilitar', ctx()).ok); assert.equal(o.estado, 'APROBADO'); assert.equal(o.parcial, true); assert.equal(o.numero, numero);
  assert.ok(O.cambiar(m, o.id, 'inhabilitar', ctx()).ok); assert.equal(o.estado, 'APROBADO'); assert.equal(o.parcial, false);
  atomico(m, () => O.prepararCRE(m, o.id, [2], { tanqueId: 4101, unidadId: 1002 }, ctx()));
  O.cambiar(m, o.id, 'habilitar', ctx()); cre(m, o, [2], { tanqueId: 4101, unidadId: 1002 });
});
prueba('Orden futura no inicia CRE incluso con habilitación parcial', () => {
  const m = O.nuevo(), o = nuevo(m, [{ solicitudId: 6001 }], { fecha: '2026-10-03' }); aprobado(m, o); O.cambiar(m, o.id, 'habilitar', ctx());
  atomico(m, () => O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001 }, ctx()));
});
for (const [medioId, solicitudId, unidadId, tanqueId, tipoId] of [[2, 6005, 2001, 4101, 5], [3, 6006, 3001, 4102, 4]]) prueba('Creación por medio de transporte ' + medioId, () => {
  const m = O.nuevo(), o = nuevo(m, [{ solicitudId }], { medioId }); aprobado(m, o);
  const c = cre(m, o, [o.detalles[0].id], { tanqueId, unidadId }); assert.equal(c.tipoId, tipoId); assert.equal(c.estadoId, 2);
  O.activarCRE(m, c.id, 45000, ctx()); assert.equal(m.enlaces.length, 1);
});
prueba('Barcaza y vagón no permiten dos detalles en una creación', () => {
  for (const medioId of [2, 3]) {
    const m = O.nuevo(), o = nuevo(m, [{ solicitudId: medioId === 2 ? 6005 : 6006 }], { medioId });
    o.detalles.push({ ...o.detalles[0], id: 99 }); aprobado(m, o); atomico(m, () => O.prepararCRE(m, o.id, [o.detalles[0].id, 99], { tanqueId: 4101, unidadId: 2001 }, ctx()));
  }
});
prueba('Variable usa un detalle y su destino real, no la fila cero', () => {
  const m = O.nuevo(), o = nuevo(m, [manual({ unidadId: 1002, conductorId: 1102 }), manual()], { origenId: 703 }); aprobado(m, o);
  atomico(m, () => O.prepararCRE(m, o.id, [1, 2], { tanqueId: 4301, unidadId: 1001 }, ctx()));
  o.detalles[0].destinoId = 701;
  const c = cre(m, o, [2], { tanqueId: 4301, unidadId: 1001 }); assert.equal(c.destinoId, 702); assert.equal(c.estadoId, 1); assert.equal(c.volumen, 34000); assert.equal(m.enlaces[0].detalleId, 2);
});
prueba('Editar conserva IDs; al aprobar se bloquea edición normal', () => {
  const m = O.nuevo(), o = nuevo(m, [{ solicitudId: 6001 }]);
  assert.ok(O.agregar(m, o.id, { solicitudId: 6002 }, ctx()).ok); assert.equal(o.detalles[0].id, 1);
  assert.ok(O.quitar(m, o.id, 2, ctx()).ok); aprobado(m, o);
  atomico(m, () => O.quitar(m, o.id, 1, ctx())); atomico(m, () => O.agregar(m, o.id, { solicitudId: 6002 }, ctx()));
});
prueba('Variable aprobada agrega/quita solo detalles sin CRE reservado o activo', () => {
  const m = O.nuevo(), o = nuevo(m, [manual()], { origenId: 703 }); aprobado(m, o);
  const r = O.agregar(m, o.id, manual({ unidadId: 1002, conductorId: 1102 }), ctx()); assert.ok(r.ok);
  assert.ok(O.quitar(m, o.id, r.id, ctx()).ok); cre(m, o, [1], { tanqueId: 4301, unidadId: 1001 }); atomico(m, () => O.quitar(m, o.id, 1, ctx()));
});
prueba('Contador de orden y CRE se controla sin mutación parcial en el límite', () => {
  const m = O.nuevo(), o = nuevo(m); O.cambiar(m, o.id, 'solicitar', ctx()); m.terminales[0].proximo = 2147483647;
  atomico(m, () => O.cambiar(m, o.id, 'aprobar', ctx())); m.terminales[0].proximo = 10; O.cambiar(m, o.id, 'aprobar', ctx());
  m.siguiente.numeroCRE = 2147483647; atomico(m, () => O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001 }, ctx()));
});
prueba('Día simulado no retrocede y no afecta al escenario general', () => {
  const m = O.nuevo(); for (const d of ['2026-02-30', '2026-10-01']) atomico(m, () => O.avanzarDia(m, d, ctx()));
  assert.ok(O.avanzarDia(m, '2026-10-03', ctx()).ok);
});
E.reiniciar(true, 'O');
prueba('Renderiza siete pasos, enlaces desde contratos y el simulador anterior', () => {
  E.st.estudioOrdenes = O.nuevo(); A.vs.od = null; const m = U.modelo(), o = nuevo(m); U.vista().ordenId = o.id;
  for (let i = 0; i < 7; i++) { U.vista().paso = i; assert.match(V.ordenespasos(), new RegExp('Paso ' + (i + 1) + ' de 7')); }
  assert.match(V.contratos(), /href="#ordenespasos"/); assert.match(V.ordenes(), /href="#ordenespasos"/);
  assert.ok(A.MENU.flatMap(x => x[1]).some(x => x[0] === 'ordenespasos'));
});
prueba('Renderiza sin orden y escapa datos de empresas/eventos', () => {
  E.st.estudioOrdenes = O.nuevo(); A.vs.od = null;
  for (let i = 0; i < 7; i++) { U.vista().paso = i; assert.ok(V.ordenespasos().length > 1000); }
  const m = U.modelo(), o = nuevo(m); m.empresas[0].nombre = '<img src=x onerror=1>'; U.vista().ordenId = o.id; U.vista().paso = 1;
  assert.ok(!V.ordenespasos().includes('<img src=x')); assert.match(V.ordenespasos(), /&lt;img/);
});
prueba('Publicación sin SQL elimina enlaces que no existirán', () => {
  SILOG.SIN_SQL = true; assert.ok(!V.ordenespasos().includes('href="../EXTRACCION_SQL')); SILOG.SIN_SQL = false;
});
prueba('Persistencia aislada conserva IDs al serializar el estado', () => {
  const original = JSON.stringify(E.st.ordenes), m = U.modelo(); E.guardar(); const data = JSON.parse(guardado);
  assert.deepEqual(data.st.estudioOrdenes.ordenes, m.ordenes); assert.equal(JSON.stringify(E.st.ordenes), original);
});
prueba('Adaptador confirma reinicio dentro de página y permite cancelar', () => {
  let renders = 0; A.render = () => { renders++; }; A.notificar = r => { assert.ok(r.msg); };
  const click = accion => eventos.click.forEach(fn => fn({ target: { closest: s => s === '[data-od-accion]' ? { dataset: { odAccion: accion } } : null } }));
  const anterior = U.modelo(); click('reiniciar'); assert.equal(U.modelo(), anterior); assert.ok(U.vista().confirmacion);
  assert.match(V.ordenespasos(), /role="alertdialog"/); click('cancelar'); assert.equal(U.modelo(), anterior); assert.equal(U.vista().confirmacion, null);
  click('reiniciar'); click('confirmar'); assert.notEqual(U.modelo(), anterior); assert.equal(U.modelo().ordenes.length, 0); assert.ok(renders > 0);
});
prueba('Importar verifica el catálogo fuente antes de archivar y enlazarlo', () => {
  E.st.estudioContratos = C.casoCompleto(); const original = JSON.stringify(E.st.estudioContratos);
  const click = accion => eventos.click.forEach(fn => fn({ target: { closest: s => s === '[data-od-accion]' ? { dataset: { odAccion: accion } } : null } }));
  const previo = U.modelo(); click('importar'); E.st.estudioContratos.tarifas[0].tarifa = 500;
  click('confirmar'); assert.equal(U.modelo(), previo);
  click('importar'); click('confirmar'); assert.equal(U.modelo().contratos, E.st.estudioContratos);
  assert.equal(U.modelo().contratos.tarifas[0].tarifa, 500); assert.ok(E.st.recorridosArchivadosOT.length);
  E.st.estudioContratos = JSON.parse(original);
});
prueba('Recursos locales existen y nuevos scripts no invocan confirm nativo', () => {
  const raiz = path.join(__dirname, '..'), html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(?:\?[^" ]*)?"/g)) assert.ok(fs.existsSync(path.join(raiz, match[1])), match[1]);
  for (const archivo of ['ordenes_estudio', 'vistas_ordenes_estudio', 'control_ordenes_estudio']) assert.ok(!/\b(?:window\.)?confirm\s*\(/.test(fs.readFileSync(path.join(raiz, 'js', archivo + '.js'), 'utf8')));
  for (const match of V.ordenespasos().matchAll(/href="(\.\.\/EXTRACCION_SQL_CONCILIACIONES\/[^" ]+)"/g)) assert.ok(fs.existsSync(path.resolve(raiz, match[1])), match[1]);
});
prueba('Sin lote, con lote ajeno o sin medición no se crea previo', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o);
  for (const loteId of [undefined, 999, 2, 4]) atomico(m, () => O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001, loteId }, ctx()));
  m.tanques[0].medicionId = null; atomico(m, () => O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001, loteId: 1 }, ctx()));
});
prueba('Unidad o conductor inactivos se rechazan sin crear cabecera', () => {
  const m = O.nuevo(); m.unidades[0].activa = false; atomico(m, () => O.crear(m, cab(), [{ solicitudId: 6001 }], ctx()));
  m.unidades[0].activa = true; m.conductores[0].activo = false; atomico(m, () => O.crear(m, cab(), [{ solicitudId: 6001 }], ctx()));
});
prueba('Anulación también protege una recepción activa aunque el despacho ya no esté activo', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o); O.activarCRE(m, c.id, 34000, ctx());
  c.estadoId = 0; m.cres.push({ id: 99, estadoId: 1 }); m.enlaces[0].recepcionId = 99;
  atomico(m, () => O.cambiar(m, o.id, 'anular', ctx()));
});
prueba('Un CRE inactivo no cuenta como ejecutado ni permite liberar', () => {
  const m = O.nuevo(), o = nuevo(m); aprobado(m, o); const c = cre(m, o); O.activarCRE(m, c.id, 34000, ctx());
  c.estadoId = 0; assert.equal(O.resumen(m, o).ejecutados, 0); atomico(m, () => O.cambiar(m, o.id, 'liberar', ctx()));
});
prueba('Contadores de órdenes independientes por terminal y no por mes', () => {
  const m = O.nuevo(), a = nuevo(m); aprobado(m, a); const b = nuevo(m, [manual()], { origenId: 703 }); aprobado(m, b);
  assert.equal(a.numero, 28389); assert.equal(b.numero, 7401); assert.equal(m.terminales[0].proximo, 28390); assert.equal(m.terminales[1].proximo, 7402);
});
prueba('No se habilita parcial cuando todos los detalles tienen despacho activo', () => {
  const m = O.nuevo(), o = nuevo(m, [{ solicitudId: 6001 }]); aprobado(m, o); const c = cre(m, o); O.activarCRE(m, c.id, 34000, ctx());
  atomico(m, () => O.cambiar(m, o.id, 'habilitar', ctx()));
});
prueba('Contrato no liberado puede pasar la función de existencia V1 sin aportar tarifa aprobada', () => {
  const contratos = C.casoCompleto(); contratos.historiales.filter(h => h.contratoId === 2).forEach(h => { h.estado = 'EN ELABORACION'; });
  contratos.tarifas.filter(t => t.historialId === 2).forEach(t => { t.aprobada = false; });
  const m = O.nuevo(contratos), o = nuevo(m, [manual({ destinoId: 703, unidadId: 1003, conductorId: 1103 })]); assert.equal(o.detalles[0].tarifaId, null);
});
prueba('Adaptador permite guardar, decidir, seleccionar, preparar y activar un despacho', () => {
  E.st.estudioOrdenes = O.nuevo(); A.vs.od = null; const m = U.modelo(), v = U.vista();
  const click = (accion, extra = {}) => eventos.click.forEach(fn => fn({ target: { closest: s => s === '[data-od-accion]' ? { dataset: { odAccion: accion, ...extra } } : null } }));
  const submit = (tipo, datos, extra = {}) => {
    const form = { dataset: { odForm: tipo, ...extra }, elements: Object.entries(datos).map(([name, value]) => ({ name, value, disabled: false })) };
    eventos.submit.forEach(fn => fn({ preventDefault() {}, target: { closest: s => s === 'form[data-od-form]' ? form : null } }));
  };
  click('tresSolicitudes'); assert.equal(v.filas.length, 3); click('guardar'); assert.equal(v.paso, 2); assert.equal(m.ordenes.length, 1);
  click('solicitar'); click('aprobar'); assert.equal(m.ordenes[0].estado, 'APROBADO');
  const target = { dataset: { odDetalle: '1' }, checked: true, closest: s => s === '.od-estudio' ? {} : null };
  eventos.change.forEach(fn => fn({ target })); assert.deepEqual(v.seleccion, [1]);
  submit('cre', { tanqueId: '4101', unidadId: '1001', loteId: '1' }); assert.equal(v.paso, 4); assert.equal(m.cres[0].estadoId, 2);
  submit('activar', { volumen: '33980' }, { id: '1' }); assert.equal(m.cres[0].estadoId, 1); assert.equal(m.enlaces.length, 1);
  click('liberar'); assert.equal(m.ordenes[0].estado, 'LIBERADO');
});
prueba('Cabecera nueva no borra filas del borrador al cambiar de medio', () => {
  E.st.estudioOrdenes = O.nuevo(); A.vs.od = null; const v = U.vista(); v.filas = [{ solicitudId: 6001 }];
  const form = { dataset: { odForm: 'cabecera' }, elements: Object.entries(cab({ medioId: 2 })).map(([name, value]) => ({ name, value })) };
  eventos.submit.forEach(fn => fn({ preventDefault() {}, target: { closest: s => s === 'form[data-od-form]' ? form : null } }));
  assert.equal(v.filas.length, 1); assert.equal(v.cab.medioId, 1);
});
console.log(`\n${total}/${total} verificaciones de órdenes de despacho correctas.`);

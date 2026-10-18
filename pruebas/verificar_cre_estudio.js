/* Ciclo conectado: órdenes → despacho → recepción, sin navegador ni SQL Server. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
global.window = global;
let guardado;
global.localStorage = { getItem: () => guardado || null, setItem: (_, s) => { guardado = s; } };
const eventos = {};
global.document = { addEventListener: (tipo, fn) => (eventos[tipo] ||= []).push(fn) };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'contratos_estudio', 'ordenes_estudio', 'hojas_ruta_estudio', 'cre_estudio', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'vistas_contratos_estudio', 'vistas_ordenes_estudio', 'vistas_cre_estudio', 'app', 'control_ordenes_estudio', 'control_cre_estudio'].forEach(f => require('../js/' + f + '.js'));
const O = SILOG.ordenesEstudio, R = SILOG.creEstudio, E = SILOG.estado, A = SILOG.app, V = SILOG.vistas, U = SILOG.estudioCREUI, OU = SILOG.estudioOrdenesUI;
const ctx = () => ({ usuario: 'estudiante', permisos: Object.fromEntries(O.PERMISOS.map(p => [p, true])) });
const orden = (m, filas = [6001, 6002, 6003], extra = {}) => {
  const r = O.crear(m, { origenId: 701, medioId: 1, fecha: m.hoy, ...extra }, filas.map(solicitudId => ({ solicitudId })), ctx()); assert.ok(r.ok, r.msg);
  const o = m.ordenes.find(o => o.id === r.id); assert.ok(O.cambiar(m, o.id, 'solicitar', ctx()).ok); assert.ok(O.cambiar(m, o.id, 'aprobar', ctx()).ok); return o;
};
const base = () => { const m = O.nuevo(); R.preparar(m); return { m, o: orden(m) }; };
const despachar = (m, o, detalleId = o.detalles[0].id, volumen = 34000) => {
  const d = o.detalles.find(d => d.id === detalleId), medio = o.medioId;
  const r = O.prepararCRE(m, o.id, [d.id], { tanqueId: d.productoId === 802 ? 4102 : 4101, unidadId: d.unidadId, loteId: medio }, ctx()); assert.ok(r.ok, r.msg);
  assert.ok(R.activarDespacho(m, r.id, { volumen }, ctx()).ok); return m.cres.find(c => c.id === r.id);
};
const preparar = (m, ds, extra = {}) => {
  const p = ds[0], r = R.crearRecepcion(m, ds.map(c => c.id), { fecha: m.hoy, tanqueId: p.productoId === 802 ? 4202 : 4201, liderId: p.unidadId, ...extra }, ctx()); assert.ok(r.ok, r.msg); return m.cres.find(c => c.id === r.id);
};
const activar = (m, c, volumen = 33900, extra = {}) => R.activarRecepcion(m, c.id, { volumen, distribucion: [{ cuentaId: 2, volumen }], ...extra }, ctx());
const atomico = (m, fn) => { const antes = JSON.stringify(m), r = fn(); assert.equal(r.ok, false, r.msg); assert.equal(JSON.stringify(m), antes, r.msg); return r; };
let total = 0;
const prueba = (n, fn) => { fn(); total++; console.log('OK ' + n); };

prueba('Preparar conserva órdenes y despachos previos al nuevo módulo', () => {
  const m = O.nuevo(), o = orden(m), antes = JSON.stringify(o), ids = m.siguiente.cre; R.preparar(m); R.preparar(m);
  assert.equal(JSON.stringify(o), antes); assert.equal(m.siguiente.cre, ids); assert.equal(m.recorridoCRE.version, 1);
});
prueba('Un despacho activo conserva su orden y su ID al preparar recepción', () => {
  const { m, o } = base(), d = despachar(m, o), antes = JSON.stringify(d), c = preparar(m, [d]);
  assert.equal(JSON.stringify(d), antes); assert.equal(c.id, 2); assert.equal(c.tipoId, 8); assert.equal(c.estadoId, 2); assert.equal(c.numero, 0); assert.equal(c.volumen, null);
  assert.deepEqual(c.despachoIds, [d.id]); assert.equal(m.recorridoCRE.asociaciones.length, 0); assert.equal(m.enlaces[0].recepcionId, null);
  assert.equal(m.siguiente.numeroCRE, 981125);
});
prueba('Recepción activa crea ambas relaciones y un número global nuevo', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); assert.ok(activar(m, c).ok);
  assert.equal(d.volumen, 34000); assert.equal(c.volumen, 33900); assert.equal(c.numero, 981125); assert.equal(c.estadoId, 1);
  assert.deepEqual(m.recorridoCRE.asociaciones, [{ id: 1, despachoId: d.id, recepcionId: c.id }]); assert.equal(m.enlaces[0].recepcionId, c.id); assert.equal(m.solicitudes[0].estado, 'UTILIZADO'); assert.equal(SILOG.hojasRutaEstudio.hoja(m, 6001).estado, 'UTILIZADA');
  const b = R.balance(m, c.id); assert.deepEqual([b.despachado, b.recibido, b.diferencia, b.abierto], [34000, 33900, -100, false]);
});
prueba('Borradores no aportan litros al balance ni se reciben como despachos', () => {
  const { m, o } = base(), r = O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001, loteId: 1 }, ctx()); assert.ok(r.ok);
  atomico(m, () => R.crearRecepcion(m, [r.id], { fecha: m.hoy }, ctx())); assert.equal(R.balance(m, r.id).ok, false);
});
for (const ids of [[], [999], [1, 1]]) prueba('Selección inválida sin cambios ' + JSON.stringify(ids), () => {
  const { m, o } = base(); despachar(m, o); atomico(m, () => R.crearRecepcion(m, ids, { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, ctx()));
});
for (const fecha of ['2026-02-30', '2026-10-01', '2026-10-03', '', null]) prueba('Fecha de recepción inválida sin consumo ' + fecha, () => {
  const { m, o } = base(), d = despachar(m, o); atomico(m, () => R.crearRecepcion(m, [d.id], { fecha, tanqueId: 4201, liderId: 1001 }, ctx()));
});
for (const extra of [{ tanqueId: 999 }, { tanqueId: 4202 }, { tanqueId: 4302 }, { liderId: 1003 }, { liderId: 999 }]) prueba('Tanque o líder incorrectos ' + JSON.stringify(extra), () => {
  const { m, o } = base(), d = despachar(m, o); atomico(m, () => R.crearRecepcion(m, [d.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001, ...extra }, ctx()));
});
prueba('Sin medición configurada no crea recepción; tipo 0 de tanque sí es válido', () => {
  const { m, o } = base(), d = despachar(m, o); m.recorridoCRE.tanquesDestino[0].medicionId = null;
  atomico(m, () => R.crearRecepcion(m, [d.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, ctx()));
  m.recorridoCRE.tanquesDestino[0].medicionId = 0; assert.equal(preparar(m, [d]).medicionId, 0);
});
prueba('Permiso de ejercicio se exige antes de crear/activar', () => {
  const { m, o } = base(), d = despachar(m, o); atomico(m, () => R.crearRecepcion(m, [d.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, { permisos: {} }));
  const c = preparar(m, [d]); atomico(m, () => R.activarRecepcion(m, c.id, { volumen: 33900 }, { permisos: {} }));
});
prueba('Preparación y activación vuelven a validar vínculos verdaderos', () => {
  const { m, o } = base(), d = despachar(m, o); m.enlaces = []; atomico(m, () => R.crearRecepcion(m, [d.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, ctx()));
});
prueba('Otra reserva bloquea doble previo y descartar la libera sin borrar el documento', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]);
  atomico(m, () => R.crearRecepcion(m, [d.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, ctx()));
  assert.ok(R.descartarReserva(m, c.id, ctx()).ok); assert.equal(c.estadoId, 2); assert.equal(c.reservaDescartada, true); assert.equal(m.cres.length, 2);
  preparar(m, [d]); atomico(m, () => activar(m, c));
});
prueba('Descartar previo de despacho libera detalle; no se descartan activos', () => {
  const { m, o } = base(), r = O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001, loteId: 1 }, ctx());
  assert.ok(R.descartarReserva(m, r.id, ctx()).ok); despachar(m, o); atomico(m, () => R.descartarReserva(m, 2, ctx()));
});
prueba('Final registrada impide recibir dos veces y activar dos veces', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); assert.ok(activar(m, c).ok);
  atomico(m, () => activar(m, c)); atomico(m, () => R.crearRecepcion(m, [d.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, ctx()));
});
for (const volumen of [-1, 1.25, 2147483648, Infinity, '', 'texto', true]) prueba('Volumen inválido no activa ' + String(volumen), () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); atomico(m, () => activar(m, c, volumen));
});
for (const distribucion of [[], null, [{ cuentaId: 99, volumen: 33900 }], [{ cuentaId: 2, volumen: 33899 }], [{ cuentaId: 2, volumen: -1 }, { cuentaId: 3, volumen: 33901 }], [{ cuentaId: 2, volumen: 100 }, { cuentaId: 2, volumen: 33800 }]]) prueba('Distribución inválida es atómica ' + JSON.stringify(distribucion), () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); atomico(m, () => activar(m, c, 33900, { distribucion }));
});
prueba('Dos cuentas suman exactamente el recibido; no el volumen despachado', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); assert.ok(activar(m, c, 33900, { distribucion: [{ cuentaId: 2, volumen: 30000 }, { cuentaId: 3, volumen: 3900 }] }).ok);
  assert.equal(c.distribucion.length, 2); assert.equal(d.volumen, 34000);
});
for (const control of ['periodoAbierto', 'movimientoAbierto', 'brevetVigente', 'precintosValidos']) prueba('Control simulado bloquea activación ' + control, () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); m.recorridoCRE.controles[control] = false; atomico(m, () => activar(m, c));
});
prueba('Despacho valida saldo y fecha, sin alterar orden ni consumir número', () => {
  const { m, o } = base(), r = O.prepararCRE(m, o.id, [1], { tanqueId: 4101, unidadId: 1001, loteId: 1 }, ctx());
  m.recorridoCRE.controles.saldoLitros = 100; atomico(m, () => R.activarDespacho(m, r.id, 34000, ctx()));
  m.recorridoCRE.controles.saldoLitros = 500000; m.cres[0].fecha = '2026-10-03'; atomico(m, () => R.activarDespacho(m, r.id, 34000, ctx()));
});
prueba('Una recepción no puede activarse mediante el método de despacho', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); atomico(m, () => R.activarDespacho(m, c.id, 33900, ctx())); atomico(m, () => O.activarCRE(m, c.id, 33900, ctx()));
});
prueba('Dos despachos de cisterna crean una recepción y dos asociaciones', () => {
  const { m, o } = base(), a = despachar(m, o), b = despachar(m, o, 2, 33000), c = preparar(m, [a, b], { liderId: 1002 });
  assert.equal(c.conductorId, 1102); assert.ok(activar(m, c, 66850).ok); const r = R.balance(m, c.id);
  assert.deepEqual([r.despachado, r.recibido, r.diferencia], [67000, 66850, -150]); assert.equal(m.recorridoCRE.asociaciones.length, 2);
});
for (const campo of ['empresa', 'origenId', 'destinoId', 'productoId', 'loteId', 'medio']) prueba('No agrupa despachos incompatibles ' + campo, () => {
  const { m, o } = base(), a = despachar(m, o), b = despachar(m, o, campo === 'empresa' ? 3 : 2, 33000);
  if (campo === 'medio') b.tipoId = 5; else if (campo !== 'empresa') b[campo] = 999;
  atomico(m, () => R.crearRecepcion(m, [a.id, b.id], { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }, ctx()));
});
prueba('Fecha se compara con todos los despachos, no la última fila del grid', () => {
  const { m, o } = base(), a = despachar(m, o), b = despachar(m, o, 2, 33000); m.hoy = '2026-10-04'; b.fecha = '2026-10-04';
  atomico(m, () => R.crearRecepcion(m, [a.id, b.id], { fecha: '2026-10-03', tanqueId: 4201, liderId: 1001 }, ctx()));
});
prueba('Parcial permite otra recepción; la final cierra sin inferirlo de los litros', () => {
  const { m, o } = base(), d = despachar(m, o), a = preparar(m, [d]); assert.ok(activar(m, a, 10000, { parcial: true }).ok);
  assert.deepEqual(m.recorridoCRE.parciales, [d.id]); assert.equal(SILOG.hojasRutaEstudio.hoja(m, 6001).estado, 'EN TRANSITO'); assert.equal(R.balance(m, a.id).abierto, true);
  const b = preparar(m, [d]); assert.ok(activar(m, b, 23900).ok); assert.deepEqual(m.recorridoCRE.parciales, []); assert.equal(m.enlaces.length, 2); assert.equal(O.activos(m, 1).length, 1);
  assert.deepEqual([R.balance(m, a.id).despachado, R.balance(m, a.id).recibido, R.balance(m, a.id).diferencia], [34000, 33900, -100]);
  assert.equal(SILOG.hojasRutaEstudio.hoja(m, 6001).estado, 'UTILIZADA'); assert.equal(m.solicitudes[0].estado, 'UTILIZADO'); assert.equal(o.parcial, false);
});
prueba('La recepción parcial no significa aprobar parcialmente ni reabrir orden liberada', () => {
  const { m, o } = base(), d = despachar(m, o); O.cambiar(m, o.id, 'liberar', ctx()); const c = preparar(m, [d]); assert.ok(activar(m, c, 10000, { parcial: true }).ok);
  assert.equal(o.estado, 'LIBERADO'); assert.equal(o.parcial, false); assert.deepEqual(m.recorridoCRE.parciales, [d.id]);
});
prueba('Sin configuración de planta no se habilita parcial', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); m.recorridoCRE.plantasParciales = [];
  atomico(m, () => activar(m, c, 10000, { parcial: true }));
});
prueba('N×M recorre el grupo completo, no duplica despachos ni ignora la parcial anterior', () => {
  const { m, o } = base(), a = despachar(m, o), b = despachar(m, o, 2, 33000), r1 = preparar(m, [a]); assert.ok(activar(m, r1, 10000, { parcial: true }).ok);
  const r2 = preparar(m, [a, b]); assert.ok(activar(m, r2, 56900).ok);
  const r = R.balance(m, r2.id); assert.deepEqual([r.despachado, r.recibido, r.diferencia], [67000, 66900, -100]); assert.equal(r.despachos.length, 2); assert.equal(r.recepciones.length, 2);
  assert.equal(m.enlaces.length, 3); assert.ok(m.enlaces.some(e => e.detalleId === 2 && e.recepcionId === r2.id));
});
prueba('Varios detalles de orden en un despacho no duplican sus litros', () => {
  const { m, o } = base(), r = O.prepararCRE(m, o.id, [1, 2], { tanqueId: 4101, unidadId: 1001, loteId: 1 }, ctx()); assert.ok(r.ok);
  assert.ok(R.activarDespacho(m, r.id, 66900, ctx()).ok); const d = m.cres[0], c = preparar(m, [d], { liderId: 1002 }); assert.equal(c.conductorId, 1102); assert.ok(activar(m, c, 66800).ok);
  assert.equal(m.enlaces.length, 2); assert.equal(R.balance(m, c.id).despachado, 66900); assert.equal(R.balance(m, c.id).recibido, 66800);
});
prueba('Despachos compatibles de dos órdenes se reciben sin perder ninguna orden', () => {
  const m = O.nuevo(); R.preparar(m); const o1 = orden(m, [6001]), a = despachar(m, o1); O.cambiar(m, o1.id, 'liberar', ctx());
  const o2 = orden(m, [6002]), b = despachar(m, o2, o2.detalles[0].id, 33000), c = preparar(m, [a, b]); assert.ok(activar(m, c, 66900).ok);
  assert.deepEqual(c.ordenIds, [o1.id, o2.id]); assert.equal(m.enlaces.length, 2);
});
prueba('Volumen superior es demasía visible, no se recorta al despachado', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); assert.ok(activar(m, c, 34100).ok); assert.equal(R.balance(m, c.id).diferencia, 100);
});
prueba('Cero sin autorización bloquea; autorizado con cuenta cero permite final', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); atomico(m, () => activar(m, c, 0));
  m.recorridoCRE.ceroAutorizado.push(d.id); atomico(m, () => activar(m, c, 0, { parcial: true })); assert.ok(activar(m, c, 0).ok); assert.equal(R.balance(m, c.id).recibido, 0);
});
prueba('Cero autorizado no se extiende a un convoy', () => {
  const { m, o } = base(), a = despachar(m, o), b = despachar(m, o, 2, 33000), c = preparar(m, [a, b]); m.recorridoCRE.ceroAutorizado = [a.id, b.id]; atomico(m, () => activar(m, c, 0));
});
for (const [medioId, solicitudId, tipo] of [[2, 6005, 13], [3, 6006, 9]]) prueba('Recepción del medio ' + medioId + ' conserva tipo y recurso', () => {
  const m = O.nuevo(); R.preparar(m); const o = orden(m, [solicitudId], { medioId }), d = despachar(m, o, o.detalles[0].id, medioId === 2 ? 150000 : 50000), c = preparar(m, [d]);
  assert.equal(c.tipoId, tipo); assert.equal(c.unidadId, d.unidadId); atomico(m, () => activar(m, c, 40000, { parcial: true })); assert.ok(activar(m, c, medioId === 2 ? 149900 : 49900).ok);
});
prueba('Fecha HR vencida se distingue de UTILIZADA al finalizar', () => {
  const { m, o } = base(), d = despachar(m, o); SILOG.hojasRutaEstudio.hoja(m, 6001).fin = '2026-10-01'; const c = preparar(m, [d]); assert.ok(activar(m, c).ok); assert.equal(SILOG.hojasRutaEstudio.hoja(m, 6001).estado, 'VENCIDA'); assert.equal(m.solicitudes[0].estado, 'UTILIZADO');
});
prueba('No consume contador si falta un vínculo o llega al límite', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); m.enlaces = []; atomico(m, () => activar(m, c));
  m.enlaces = [{ detalleId: 1, creId: d.id, recepcionId: null }]; m.siguiente.numeroCRE = 2147483647; atomico(m, () => activar(m, c));
});
prueba('Medidor usa final corregida menos inicial ya corregida', () => {
  const r = R.medicion({ modo: 'MEDIDOR', inicial: 1000, final: 35000, factor: 0.999 }); assert.ok(r.ok); assert.equal(r.volumen, 33965); assert.match(r.formula, /34965/);
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); assert.ok(activar(m, c, 33965, { modo: 'MEDIDOR', inicial: 1000, final: 35000, factor: 0.999 }).ok); assert.equal(c.medicion.finalCorregido, 34965);
});
for (const d of [{ inicial: -1 }, { final: 100 }, { factor: 0 }, { factor: -1 }, { factor: 3 }, { inicial: '' }, { final: Infinity }]) prueba('Medidor inválido devuelve validación ' + JSON.stringify(d), () => {
  assert.equal(R.medicion({ modo: 'MEDIDOR', inicial: 1000, final: 35000, factor: 1, ...d }).ok, false);
});
prueba('Calcular y consultar balance no mutan relaciones ni sus entradas', () => {
  const { m, o } = base(), d = despachar(m, o), c = preparar(m, [d]); activar(m, c); const antes = JSON.stringify(m); R.balance(m, d.id); R.balance(m, c.id); R.medicion({ volumen: 100 }); assert.equal(JSON.stringify(m), antes);
});

E.reiniciar(true, 'O');
prueba('Renderiza cinco pasos vacíos y no crea viajes automáticamente', () => {
  E.st.estudioOrdenes = O.nuevo(); const m = U.modelo();
  for (let paso = 0; paso < 5; paso++) { U.vista().paso = paso; assert.match(V.crepasos(), new RegExp(`Paso ${paso + 1} de 5`)); }
  assert.equal(m.ordenes.length, 0); assert.equal(m.cres.length, 0);
});
prueba('Vistas conectadas muestran los mismos IDs y escapan nombres', () => {
  E.st.estudioOrdenes = O.nuevo(); const m = U.modelo(), o = orden(m); OU.vista().ordenId = o.id;
  const d = despachar(m, o), c = preparar(m, [d]); activar(m, c); U.vista().balanceId = c.id;
  for (let paso = 0; paso < 5; paso++) { U.vista().paso = paso; assert.ok(V.crepasos().includes('CRE de despacho y recepción')); }
  U.vista().paso = 4; assert.match(V.crepasos(), /CREIDDespacho #1/); assert.match(V.crepasos(), /CREIDRecepcion #2/);
  m.unidades[0].codigo = '<img src=x onerror=1>'; assert.ok(!V.crepasos().includes('<img src=x')); assert.match(V.crepasos(), /&lt;img/);
  assert.match(V.ordenespasos(), /href="#crepasos"/); assert.match(V.cre(), /href="#crepasos"/);
});
prueba('Recargar serialización conserva los CRE conectados sin tocar viajes anteriores', () => {
  const antes = JSON.stringify(E.st.cres); E.guardar(); const data = JSON.parse(guardado); assert.deepEqual(data.st.estudioOrdenes, U.modelo()); assert.equal(JSON.stringify(E.st.cres), antes);
});
prueba('Cambio de modelo tras reiniciar órdenes limpia la selección UI anterior', () => {
  U.vista().ids = [999]; E.st.estudioOrdenes = O.nuevo(); U.modelo(); assert.deepEqual(U.vista().ids, []);
});
prueba('Publicación sin SQL no genera enlaces documentales rotos', () => {
  SILOG.SIN_SQL = true; assert.ok(!V.crepasos().includes('href="../EXTRACCION_SQL')); SILOG.SIN_SQL = false;
  const raiz = path.join(__dirname, '..'); for (const hit of V.crepasos().matchAll(/href="(\.\.\/EXTRACCION_SQL_CONCILIACIONES\/[^" ]+)"/g)) assert.ok(fs.existsSync(path.resolve(raiz, hit[1])), hit[1]);
});
prueba('Adaptador ejecuta orden → despacho → previo → recepción con distribución', () => {
  A.render = () => {}; A.notificar = r => { assert.ok(r.msg); }; E.st.estudioOrdenes = O.nuevo(); const m = U.modelo(), o = orden(m); OU.vista().ordenId = o.id; despachar(m, o);
  const submit = (tipo, datos, extra = {}) => {
    const f = { dataset: { crForm: tipo, ...extra }, elements: Object.entries(datos).map(([name, value]) => ({ name, value, checked: value === true, type: typeof value === 'boolean' ? 'checkbox' : 'text' })) };
    eventos.submit.forEach(fn => fn({ preventDefault() {}, target: { closest: s => s === 'form[data-cr-form]' ? f : null } }));
  };
  U.vista().ids = [1]; submit('previo', { fecha: m.hoy, tanqueId: 4201, liderId: 1001 }); assert.equal(U.vista().paso, 3); assert.equal(U.vista().recepcionId, 2);
  submit('activarRecepcion', { fecha: m.hoy, modo: 'CONSOLIDADO', volumen: '33900', cuenta_2: '33900', cuenta_3: '', parcial: false }, { id: '2', clave: 'R2' });
  assert.equal(m.cres[1].estadoId, 1); assert.equal(U.vista().paso, 4); assert.equal(m.enlaces[0].recepcionId, 2);
});
prueba('Error del formulario conserva medición y no activa recepción', () => {
  E.st.estudioOrdenes = O.nuevo(); const m = U.modelo(), o = orden(m), d = despachar(m, o), c = preparar(m, [d]);
  const f = { dataset: { crForm: 'activarRecepcion', id: String(c.id), clave: 'R' + c.id }, elements: [{ name: 'volumen', value: '33900' }, { name: 'cuenta_2', value: '33800' }, { name: 'cuenta_3', value: '' }, { name: 'fecha', value: m.hoy }] };
  eventos.submit.forEach(fn => fn({ preventDefault() {}, target: { closest: s => s === 'form[data-cr-form]' ? f : null } }));
  assert.equal(c.estadoId, 2); assert.equal(U.vista().borradores['R' + c.id].volumen, '33900');
});
prueba('Descarte requiere confirmación interna y cancelar conserva reserva', () => {
  const m = U.modelo(), c = m.cres.find(c => R.esRecepcion(c));
  const click = accion => eventos.click.forEach(fn => fn({ target: { closest: s => s === '[data-cr-accion]' ? { dataset: { crAccion: accion, id: String(c.id) } } : null } }));
  click('descartar'); assert.match(V.crepasos(), /role="alertdialog"/); click('cancelarDescarte'); assert.equal(c.reservaDescartada, undefined);
  click('descartar'); click('confirmarDescarte'); assert.equal(c.reservaDescartada, true);
});
prueba('Recursos y rutas nuevos están registrados sin confirm nativo', () => {
  assert.ok(A.MENU.flatMap(g => g[1]).some(x => x[0] === 'crepasos'));
  const raiz = path.join(__dirname, '..'), html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  for (const hit of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(?:\?[^" ]*)?"/g)) assert.ok(fs.existsSync(path.join(raiz, hit[1])), hit[1]);
  for (const archivo of ['cre_estudio', 'vistas_cre_estudio', 'control_cre_estudio']) assert.ok(!/\b(?:window\.)?confirm\s*\(/.test(fs.readFileSync(path.join(raiz, 'js', archivo + '.js'), 'utf8')));
});
console.log(`\n${total}/${total} verificaciones del ciclo CRE conectado correctas.`);

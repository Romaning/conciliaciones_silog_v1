/* Pruebas focalizadas del segundo recorrido: configuración, autorización, CRE y cálculo. */
const assert = require('node:assert/strict');
global.window = global;
let almacen = null;
global.localStorage = { getItem: () => almacen, setItem: (_, v) => { almacen = v; } };
const eventos = [];
global.document = { addEventListener: (tipo, fn) => eventos.push({ tipo, fn }) };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'multas_contractuales', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'vistas_multas_contractuales', 'estudio_calculos', 'calculos_en_filas', 'estudio_creditodebito', 'app', 'control_multas_contractuales', 'recorrido_multas_ot'].forEach(f => require('../js/' + f + '.js'));
const E = SILOG.estado, C = SILOG.multasContractuales, M = SILOG.motor, V = SILOG.vistas, U = SILOG.controlMultas;
let total = 0;
const probar = (t, f) => { f(); total++; console.log('OK ' + t); };
const cerca = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} != ${b}`);
const ctx = { usuario: 'analista_prueba', modo: 'V1', permisos: Object.fromEntries(C.PERMISOS.map(p => [p, true])) };
E.reiniciar(true, 'F');
const g = M.recepcionesSinConciliar(E.st, 3, 'V1').grupos.find(x => x.transportistaId === 1);
assert.equal(E.generar(3, [{ clave: g.clave, marcado: true, moneda: g.contrato.moneda, recepciones: g.recepciones.map(x => x.recepcion.id) }]).ok, true);
const conc = E.st.conciliaciones.find(c => c.numero === 1001), creD = conc.lineas[0].despachoId, creR = conc.lineas[0].recepcionId;
const st = E.st;
const header = { denominacion: 'Condiciones documentales 2026', tipoContratoId: 1, tipo: 'Multa', aplicabilidad: 'CRE_D', vigInicio: '2026-01-01', vigFin: '2026-12-31' };
let hid, did;
const crear = (ambito, moneda = 'BOB', sigla = 'DOC', monto = 100) => {
  const h = C.guardarCabecera(st, { ...header, aplicabilidad: ambito }, ctx); assert.equal(h.ok, true);
  const d = C.guardarDetalle(st, { cabeceraId: h.id, concepto: 'Recargo ' + sigla, sigla, monto, moneda, vigInicio: header.vigInicio, vigFin: header.vigFin }, ctx); assert.equal(d.ok, true);
  assert.equal(C.asociarEmpresas(st, d.id, [1], ctx).ok, true);
  return { h: h.id, d: d.id };
};
const liberar = id => { for (let i = 0; i < 3; i++) assert.equal(C.cambiarEstado(st, id, false, ctx).ok, true); };
probar('Inicialización aditiva e idempotente de catálogos antiguos', () => {
  const ids = st.recargosCatalogo.map(d => d.id), n = st.multasContractuales.length;
  C.preparar(st); C.preparar(st); assert.deepEqual(st.recargosCatalogo.map(d => d.id), ids); assert.equal(st.multasContractuales.length, n);
});
probar('Regresión de multas clásicas: entran al neto una sola vez', () => cerca(M.recalcular(st, conc, 'V1').cab.neto, 7402.65));
probar('Definición rechaza datos vacíos y fechas imposibles', () => {
  assert.equal(C.guardarCabecera(st, { ...header, denominacion: '' }, ctx).ok, false);
  assert.equal(C.guardarCabecera(st, { ...header, vigInicio: '2026-02-30' }, ctx).ok, false);
});
probar('Descuento solo puede ser a la conciliación', () => assert.equal(C.guardarCabecera(st, { ...header, tipo: 'Descuento' }, ctx).ok, false));
probar('Permisos explícitos, sin inferir por rol', () => assert.equal(C.guardarCabecera(st, header, { ...ctx, permisos: {} }).ok, false));
probar('Configurar no crea aplicaciones ni cambia el neto', () => {
  const x = crear('CRE_D'); hid = x.h; did = x.d;
  assert.equal(conc.recargos.length, 0); cerca(M.recalcular(st, conc, 'V1').cab.neto, 7402.65);
});
probar('Recargo rechaza cero, negativo y vigencia fuera de cabecera', () => {
  const base = { cabeceraId: hid, concepto: 'X', sigla: 'X', moneda: 'BOB', vigInicio: header.vigInicio, vigFin: header.vigFin };
  for (const monto of [0, -1, NaN]) assert.equal(C.guardarDetalle(st, { ...base, monto }, ctx).ok, false);
  assert.equal(C.guardarDetalle(st, { ...base, monto: 1, vigFin: '2027-01-01' }, ctx).ok, false);
});
probar('Solo empresas ofrecidas por contrato/periodo; sin aplicación al CRE', () => {
  assert.equal(C.asociarEmpresas(st, did, [4], ctx).ok, false); assert.equal(conc.recargos.length, 0);
});
probar('Un recargo en elaboración no es elegible', () => assert.equal(C.elegibilidad(st, conc, M.porId(st.recargosCatalogo, did), 'CRE_D', 'V1').permitido, false));
probar('Cada transición requiere su actividad exacta', () => {
  assert.equal(C.cambiarEstado(st, did, false, { ...ctx, permisos: { [C.PERMISOS[0]]: true } }).ok, false);
  assert.equal(M.porId(st.recargosCatalogo, did).estado, 'EN ELABORACION');
});
probar('Tres transiciones con usuario/fecha/permiso hasta LIBERADO', () => {
  liberar(did); const d = M.porId(st.recargosCatalogo, did); assert.equal(d.estado, 'LIBERADO'); assert.equal(d.historial.length, 3);
  assert.equal(d.historial[2].usuario, ctx.usuario); assert.ok(d.historial[2].fecha); assert.equal(d.historial[2].permiso, C.PERMISOS[3]);
});
probar('Cabecera bloqueada fuera de elaboración', () => assert.equal(C.guardarCabecera(st, { ...header, id: hid, denominacion: 'Otra' }, ctx).ok, false));
probar('Fuera de elaboración solo Activo y Observaciones son editables', () => {
  const d = M.porId(st.recargosCatalogo, did);
  assert.equal(C.guardarDetalle(st, { ...d, cabeceraId: hid, monto: 200 }, ctx).ok, false);
  assert.equal(C.guardarDetalle(st, { ...d, cabeceraId: hid, observacion: 'Nueva observación' }, ctx).ok, true);
});
probar('Despacho y recepción se obtienen de sus relaciones, sin mezclarlos', () => {
  assert.ok(C.cres(st, conc, 'CRE_D').every(x => x.tipo === 3)); assert.ok(C.cres(st, conc, 'CRE_R').every(x => x.tipo === 8)); assert.notEqual(creD, creR);
});
probar('Elegibilidad explica ámbito, empresa, estado y vigencia', () => {
  const d = M.porId(st.recargosCatalogo, did);
  assert.equal(C.elegibilidad(st, conc, d, 'CRE_D', 'V1').permitido, true);
  assert.match(C.elegibilidad(st, conc, d, 'CRE_R', 'V1').motivos.join(''), /ámbito/);
  assert.match(C.elegibilidad(st, { ...conc, transportistaId: 2 }, d, 'CRE_D', 'V1').motivos.join(''), /empresa/);
  assert.match(C.elegibilidad(st, conc, { ...d, vigFin: C.rango(conc)[0] }, 'CRE_D', 'V1').motivos.join(''), /periodo/);
});
probar('Activo: riesgo V1 visible; Propuesto lo bloquea', () => {
  const d = { ...M.porId(st.recargosCatalogo, did), activo: false };
  assert.equal(C.elegibilidad(st, conc, d, 'CRE_D', 'V1').permitido, true);
  assert.match(C.elegibilidad(st, conc, d, 'CRE_D', 'V1').aviso, /inactivo/);
  assert.equal(C.elegibilidad(st, conc, d, 'CRE_D', 'PROPUESTO').permitido, false);
});
const guardado = conc.totales.neto;
probar('Guardar despacho persiste IDs, cantidad, moneda, TC y actor', () => {
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: 2 }], ctx).ok, true);
  const r = conc.recargos[0]; assert.equal(r.creId, creD); assert.equal(r.conciliacionId, conc.id); assert.equal(r.catalogoId, did);
  assert.equal(r.cantidad, 2); assert.equal(r.moneda, 'BOB'); assert.equal(r.tc, 6.96); assert.equal(r.registro.usuario, ctx.usuario);
});
probar('Aplicación afecta cálculo, no la instantánea hasta Procesar', () => {
  cerca(M.recalcular(st, conc, 'V1').cab.multaContractual, -200); cerca(M.recalcular(st, conc, 'V1').cab.neto, 7202.65); assert.equal(conc.totales.neto, guardado);
});
probar('Reversión denegada cuando ya existe una aplicación', () => assert.equal(C.cambiarEstado(st, did, true, ctx).ok, false));
probar('Datos inválidos no borran aplicaciones: validación atómica', () => {
  const antes = JSON.stringify(conc.recargos);
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: -1 }], ctx).ok, false);
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: 1.5 }], ctx).ok, false);
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: -99, cantidad: 1 }], ctx).ok, false);
  assert.equal(JSON.stringify(conc.recargos), antes);
});
probar('No permite CRE ajeno ni conciliación fuera de elaboración', () => {
  assert.equal(C.aplicarCRE(st, conc.id, -1, [], ctx).ok, false);
  const estado = conc.estado; conc.estado = 'Liberado'; assert.equal(C.aplicarCRE(st, conc.id, creD, [], ctx).ok, false); conc.estado = estado;
});
probar('Guardar reemplaza, no acumula duplicados', () => {
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: 1 }], ctx).ok, true); assert.equal(conc.recargos.length, 1);
  cerca(M.recalcular(st, conc, 'V1').cab.multaContractual, -100);
});
let recibo;
probar('Recargo VAR a recepción: registra otro CRE y su monto indicado', () => {
  recibo = crear('CRE_R', 'VAR', 'DOC-R', 50); liberar(recibo.d);
  assert.equal(C.aplicarCRE(st, conc.id, creR, [{ id: recibo.d, monto: 75, cantidad: 3 }], ctx).ok, true);
  cerca(M.recalcular(st, conc, 'V1').cab.multaContractual, -325);
});
probar('Guardar recepción no borra aplicaciones del despacho', () => assert.equal(conc.recargos.find(r => r.creId === creD).catalogoId, did));
probar('Monto fijo no se altera aunque un cliente lo envíe', () => {
  C.aplicarCRE(st, conc.id, creD, [{ id: did, monto: 999, cantidad: 1 }], ctx); assert.equal(conc.recargos.find(r => r.creId === creD).monto, 100);
});
probar('Ejemplos operativos MPF, EHR y conversión ordinaria', () => {
  const mpf = crear('CRE_D', 'USD', 'MPF', 4.22), ehr = crear('CRE_R', '%', 'EHR', 1), usd = crear('CRE_D', 'USD', 'ORD', 50);
  cerca(C.calcular(st, conc, { catalogoId: mpf.d, monto: 4.22, moneda: 'USD', cantidad: 25000, tc: 6.96, creId: creD }, 'V1').total, 844.42);
  cerca(C.calcular(st, conc, { catalogoId: ehr.d, monto: 1, moneda: '%', cantidad: 30000, tc: 6.96, creId: creR }, 'V1').total, 1122);
  const r = { catalogoId: usd.d, monto: 50, moneda: 'USD', cantidad: 2, tc: 6.96, creId: creD };
  cerca(C.calcular(st, conc, r, 'V1').total, 14.37); cerca(C.calcular(st, conc, r, 'PROPUESTO').total, 696);
});
probar('D37 se reproduce sin inventar neto; Propuesto suma grupos', () => {
  const mpf = st.recargosCatalogo.find(d => d.sigla === 'MPF');
  const c = { ...conc, recargos: [6.96, 7].map((tc, i) => ({ id: 900 + i, tipo: 'CCIST', catalogoId: mpf.id, moneda: 'USD', monto: 4.22, cantidad: 1000, tc, creId: creD })) };
  assert.throws(() => C.sumar(st, c, 'CCIST', 'V1'), /D37/); assert.ok(C.sumar(st, c, 'CCIST', 'PROPUESTO') > 0);
});
probar('Cantidad cero se mantiene en cero, no se sustituye por uno', () => cerca(C.calcular(st, conc, { catalogoId: did, monto: 100, moneda: 'BOB', cantidad: 0 }, 'V1').total, 0));
probar('Procesar persiste el neto nuevo', () => {
  const neto = M.recalcular(st, conc, 'V1').cab.neto; assert.equal(E.procesar(conc.id).ok, true); cerca(conc.totales.neto, neto);
});
probar('Al guardar vacío se quitan las multas; después se permite revertir', () => {
  assert.equal(C.aplicarCRE(st, conc.id, creD, [], ctx).ok, true); assert.equal(C.cambiarEstado(st, did, true, ctx).ok, true);
});
probar('V1 reemplaza por CREID en otra conciliación; Propuesto respeta ámbito', () => {
  liberar(did); const otra = { ...structuredClone(conc), id: 999, recargos: [{ id: 500, catalogoId: did, tipo: 'CCIST', creId: creD, monto: 100 }] }; st.conciliaciones.push(otra);
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: 1 }], { ...ctx, modo: 'PROPUESTO' }).ok, true); assert.equal(otra.recargos.length, 1);
  assert.equal(C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: 1 }], ctx).ok, true); assert.equal(otra.recargos.length, 0); st.conciliaciones.pop();
});
probar('Los seis pasos se renderizan con fuentes y sin excepciones', () => {
  Object.assign(U.vista(), { cabeceraId: hid, detalleId: did, concId: conc.id });
  for (let paso = 0; paso < 6; paso++) { U.vista().paso = paso; assert.match(V.multascontractuales(), /de la definición al CRE/); }
  assert.ok(SILOG.FUENTES.multascontractuales.items.some(x => x[1] === 'AdicionarMultaAlCRE.aspx.vb'));
});
probar('Recargos reutiliza la misma aplicación contractual y conserva otros conceptos', () => {
  SILOG.app.vs.conc.concId = conc.id; const html = V.recargos(); assert.match(html, /data-mc-form="aplicacion"/); assert.match(html, /Casos especiales y carro guía/);
});
probar('Selector de recepción muestra su número, no el del despacho', () => {
  Object.assign(U.vista(), { ambito: 'CRE_R', creId: creR, borrador: {} });
  const html = V.panelAplicacionContractual(conc); assert.match(html, new RegExp(M.porId(st.cres, creR).numero));
  assert.ok(!html.includes(`<option value="${creD}"`));
});
probar('Persistencia conserva datos y normaliza sin borrar el trabajo previo', () => {
  E.guardar(); const antes = JSON.stringify(E.st.conciliaciones); E.st = null; E.cargar(); assert.equal(JSON.stringify(E.st.conciliaciones), antes);
});
probar('Identidades de aplicaciones no se reutilizan después de quitar todas', () => {
  const antes = conc.recargos.find(r => r.creId === creD).id;
  C.aplicarCRE(st, conc.id, creD, [], ctx); C.aplicarCRE(st, conc.id, creD, [{ id: did, cantidad: 1 }], ctx);
  assert.ok(conc.recargos.find(r => r.creId === creD).id > antes);
});
probar('El total redondea la suma de una rama, no cada renglón antes de sumar', () => {
  const c = { ...conc, recargos: [1, 2].map(id => ({ id, tipo: 'CCIST', catalogoId: did, moneda: 'BOB', monto: 0.004, cantidad: 1 })) };
  cerca(C.sumar(st, c, 'CCIST', 'V1'), 0.01);
});
probar('La suma contractual evita registros repetidos por su ID persistido', () => {
  const r = { id: 1000, tipo: 'CCIST', catalogoId: did, moneda: 'BOB', monto: 100, cantidad: 2 };
  cerca(C.sumar(st, { ...conc, recargos: [r, { ...r }] }, 'CCIST', 'V1'), 200);
});
probar('Botones y formularios contractuales respetan el modo Ayuda', () => {
  assert.ok(SILOG.AYUDA.mcAplicacion); assert.ok(SILOG.AYUDA.mcrevertir);
  SILOG.app.vs.mc.paso = 4; assert.match(V.multascontractuales(), /data-ayuda="mcAplicacion"/);
});
probar('Otros Transportes abre Recargos con el ID de su conciliación seleccionada', () => {
  const c = M.porId(E.st.conciliaciones, conc.id);
  Object.assign(SILOG.app.vs.ot, { tipo: 'Cisterna', area: c.area, mes: c.mes, anio: c.anio, quincena: c.quincena, concId: c.id });
  assert.ok(V.ot().includes(`data-id="${c.id}" data-ir="recargos">Ver recargos`));
  assert.ok(V.panelAplicacionContractual(c).includes(`data-id="${c.id}" data-ir="multascontractuales"`));
});
const A = SILOG.app, R = SILOG.recorridoMultasOT;
let concOT, baseOT, numeroConciliacionesOT, vistaOT;
probar('La rama exige una conciliación existente, cisterna y en elaboración', () => {
  E.reiniciar(true, 'O'); E.setModo('V1'); E.setRol('Analista LOG');
  E.ui.permisosMultas = { ...ctx.permisos };
  assert.equal(R.preparar(-1).ok, false);
  assert.equal(SILOG.TOUR_OT[3].auto().ok, true);
  concOT = SILOG.TUTORIAL_OT.conc(E.st); baseOT = M.recalcular(E.st, concOT, 'V1').cab.neto;
  numeroConciliacionesOT = E.st.conciliaciones.length;
  const estado = concOT.estado; concOT.estado = 'Liberado';
  assert.equal(R.preparar(concOT.id).ok, false); concOT.estado = estado;
});
probar('La guía ofrece la rama sin desplazar los 22 pasos originales de OT', () => {
  assert.equal(SILOG.TOUR_OT.length, 22); assert.equal(SILOG.TOUR_OT[5].ramaMultas, true);
  A.vs.otm.concId = concOT.id;
  const html = V.otmapa();
  assert.ok(html.indexOf('9. Corregir') < html.indexOf('Rama: multas contractuales'));
  assert.ok(html.indexOf('Rama: multas contractuales') < html.indexOf('10. Procesar'));
  assert.ok(html.includes(`data-id="${concOT.id}">Recorrer multas contractuales`));
});
probar('Entrar a la rama conserva la conciliación, la guía y las ediciones pendientes de OT', () => {
  Object.assign(A.vs.ot, { concId: concOT.id, edits: { [concOT.lineas[0].recepcionId]: { liberarMerma: true } }, origen: concOT.lineas[0].recepcionId });
  vistaOT = structuredClone(A.vs.ot); E.ui.tour = { activo: true, paso: 5 };
  assert.equal(R.preparar(concOT.id).ok, true); assert.equal(R.preparar(concOT.id).ok, false);
  assert.equal(E.ui.ramaMultasOT.concId, concOT.id); assert.equal(A.pasosTour(), R.pasos);
  assert.equal(R.pasos.length, 6); assert.equal(E.st.conciliaciones.length, numeroConciliacionesOT);
});
R.pasos.forEach((p, i) => probar(`Rama OT paso ${i + 1}: ${p.titulo}`, () => {
  E.ui.tour.paso = i; p.preparar(); assert.equal(U.vista().concId, concOT.id);
  if (i === 3) {
    E.ui.permisosMultas[C.PERMISOS[1]] = false;
    assert.equal(p.auto().ok, false); assert.equal(p.hecho(), false);
    E.ui.permisosMultas[C.PERMISOS[1]] = true;
  }
  const r = p.auto(); assert.equal(r.ok, true, r.msg); assert.equal(p.hecho(), true);
  assert.equal(E.st.conciliaciones.length, numeroConciliacionesOT);
  assert.match(V.multascontractuales(), new RegExp(`Otros Transportes · conciliación N° ${concOT.numero}`));
}));
probar('El recargo de la rama se aplica al CRE relacionado y resta 200 sin duplicar clásicas', () => {
  const aplicada = concOT.recargos.find(r => r.catalogoId === U.vista().detalleId);
  assert.equal(aplicada.conciliacionId, concOT.id);
  assert.ok(concOT.lineas.some(l => l.recepcionId === aplicada.creId));
  cerca(concOT.totales.neto, baseOT - 200);
  assert.deepEqual(A.vs.ot.edits, vistaOT.edits);
});
probar('Recargar durante la rama recupera paso y selección contractual persistidos', () => {
  const seleccion = structuredClone(U.vista()); E.guardar(); A.vs.mc = null; E.st = null; E.cargar();
  concOT = SILOG.TUTORIAL_OT.conc(E.st);
  assert.equal(E.ui.tour.rama, 'MULTAS_OT'); assert.equal(E.ui.tour.paso, 5);
  assert.deepEqual(U.vista(), seleccion); assert.equal(E.ui.ramaMultasOT.concId, concOT.id);
});
probar('Volver restaura el paso principal y sus ediciones, sin crear otra conciliación', () => {
  global.location = { hash: '#multascontractuales' };
  R.volver(); assert.equal(location.hash, 'ot'); assert.equal(E.ui.ramaMultasOT, null);
  assert.deepEqual(E.ui.tour, { activo: true, paso: 5 }); assert.equal(A.pasosTour(), SILOG.TOUR_OT);
  assert.equal(A.vs.ot.concId, concOT.id); assert.deepEqual(A.vs.ot.edits, vistaOT.edits);
  assert.equal(A.vs.ot.origen, vistaOT.origen); assert.equal(E.st.conciliaciones.length, numeroConciliacionesOT);
});
probar('Cambiar de escenario elimina la rama y su guía sin arrastrar el contexto anterior', () => {
  assert.equal(R.preparar(concOT.id).ok, true); E.reiniciar(true, 'F');
  assert.equal(E.ui.ramaMultasOT, null); assert.equal(E.ui.tour.rama, undefined);
});
console.log(`\n${total}/${total} comprobaciones del recorrido contractual correctas. Sin SQL real ni seguridad externa.`);

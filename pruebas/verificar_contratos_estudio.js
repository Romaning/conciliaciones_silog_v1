/* Recorrido aislado: contratos, adendas, selección SQL reproducida y adaptador de UI. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
let guardado;
global.localStorage = { getItem: () => guardado || null, setItem: (_, data) => { guardado = data; } };
const eventos = {};
global.document = { addEventListener: (tipo, fn) => (eventos[tipo] ||= []).push(fn) };
global.addEventListener = () => {};
global.confirm = () => true;
['datos', 'escenarios', 'fuentes', 'motor', 'contratos_estudio', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'vistas_contratos_estudio', 'app', 'control_contratos_estudio'].forEach(f => require('../js/' + f + '.js'));
const C = SILOG.contratosEstudio, E = SILOG.estado, V = SILOG.vistas, U = SILOG.estudioContratosUI;
const ctx = () => ({ usuario: 'estudiante', modo: 'V1', permisos: Object.fromEntries(C.PERMISOS.map(p => [p, true])) });
const datos = extra => ({ empresaId: 501, numero: 'CIS-001-2026', inicio: '2026-01-01', fin: '2026-12-31', moneda: 'Bs', ...extra });
const fila = extra => ({ rutaId: 901, productoId: 801, tarifa: 210, admisible: 0.3, ...extra });
const q = extra => ({ empresaId: 501, origenId: 701, destinoId: 702, productoId: 801, prioridad: 'PRINCIPAL', fecha: '2026-09-20', volumen: 30000, ...extra });
const liberar = (m, id) => { for (let i = 0; i < 3; i++) assert.equal(C.avanzar(m, id, ctx()).ok, true); };
const base = () => { const m = C.nuevo(), r = C.crear(m, datos(), ctx()); assert.ok(r.ok); return m; };
const copia = x => structuredClone(x);
let total = 0;
const prueba = (nombre, fn) => { fn(); total++; console.log('OK ' + nombre); };

prueba('Registro conserva identidad y crea historial inicial separado', () => {
  const m = base(); assert.equal(m.contratos.length, 1); assert.equal(m.historiales.length, 1);
  assert.deepEqual([m.historiales[0].id, m.historiales[0].secuencia, m.historiales[0].opcion, m.historiales[0].estado], [1, 1, 'CONTRATO', 'EN ELABORACION']);
  assert.equal(m.tarifas.length, 0); assert.equal(C.consultar(m, q()).tarifa, 0);
});
for (const extra of [{ empresaId: 0 }, { numero: '' }, { numero: 'x'.repeat(31) }, { inicio: '2026-02-30' }, { inicio: '2027-01-01' }, { fin: '' }, { moneda: 'EUR' }, { marcoId: 999 }, { marcoId: 601, fin: '2028-01-01' }]) {
  prueba('Registro inválido es atómico ' + JSON.stringify(extra), () => { const m = C.nuevo(), antes = JSON.stringify(m); assert.equal(C.crear(m, datos(extra), ctx()).ok, false); assert.equal(JSON.stringify(m), antes); });
}
prueba('Número duplicado se bloquea; solapamiento V1 se admite con advertencia', () => {
  const m = base(); assert.equal(C.crear(m, datos({ empresaId: 502 }), ctx()).ok, false);
  const r = C.crear(m, datos({ numero: 'CIS-OTRO' }), ctx()); assert.equal(r.ok, true); assert.match(r.msg, /AND 1 = 2/);
});
prueba('Modo Propuesto bloquea solapamiento sin escribir nada', () => {
  const m = base(), antes = JSON.stringify(m);
  assert.equal(C.crear(m, datos({ numero: 'CIS-OTRO' }), { ...ctx(), modo: 'PROPUESTO' }).ok, false); assert.equal(JSON.stringify(m), antes);
});
prueba('Dos empresas pueden contratar la misma ruta y periodo con precios distintos', () => {
  const m = C.casoCompleto(); assert.equal(m.contratos.length, 2);
  assert.equal(C.consultar(m, q()).tarifa, 0.225); assert.equal(C.consultar(m, q({ empresaId: 502 })).tarifa, 0.23);
});
prueba('Contrato marco CM es opcional, comprueba fechas y no se reutiliza', () => {
  const m = C.nuevo(); assert.ok(C.crear(m, datos({ marcoId: 601 }), ctx()).ok);
  assert.equal(C.crear(m, datos({ empresaId: 502, numero: 'OTRO', marcoId: 601 }), ctx()).ok, false);
});
prueba('Permiso Registrar Contrato faltante no modifica estado', () => {
  const m = C.nuevo(), contexto = ctx(); contexto.permisos['Registrar Contrato'] = false;
  assert.equal(C.crear(m, datos(), contexto).ok, false); assert.equal(m.contratos.length, 0);
});
prueba('Matriz pendiente, tres transiciones y aprobación solo al liberar', () => {
  const m = base(); assert.ok(C.guardarTarifas(m, 1, [fila()], ctx()).ok);
  for (let i = 0; i < 3; i++) {
    assert.equal(C.consultar(m, q()).tarifa, 0); assert.equal(m.tarifas[0].aprobada, false);
    assert.ok(C.avanzar(m, 1, ctx()).ok); assert.equal(m.historiales[0].estado, C.ESTADOS[i + 1]);
  }
  assert.equal(m.tarifas[0].aprobada, true); assert.equal(C.consultar(m, q()).tarifa, 0.21);
  assert.equal(C.avanzar(m, 1, ctx()).ok, false);
});
for (let i = 0; i < 3; i++) prueba('Transición exige su propia actividad ' + i, () => {
  const m = base(); for (let j = 0; j < i; j++) C.avanzar(m, 1, ctx());
  const contexto = ctx(); contexto.permisos[C.PERMISOS[3 + i]] = false;
  const antes = JSON.stringify(m); assert.equal(C.avanzar(m, 1, contexto).ok, false); assert.equal(JSON.stringify(m), antes);
});
for (const rows of [[fila({ rutaId: 999 })], [fila({ productoId: 999 })], [fila({ tarifa: '' })], [fila({ tarifa: -1 })], [fila({ tarifa: Infinity })], [fila({ admisible: 0 })], [fila({ admisible: 101 })], [fila(), fila()]]) {
  prueba('Matriz inválida revierte todo ' + JSON.stringify(rows), () => {
    const m = base(); C.guardarTarifas(m, 1, [fila()], ctx()); const antes = JSON.stringify(m);
    assert.equal(C.guardarTarifas(m, 1, rows, ctx()).ok, false); assert.equal(JSON.stringify(m), antes);
  });
}
prueba('Tarifa cero omite fila y registrar reemplaza solo la versión elegida', () => {
  const m = base(); C.guardarTarifas(m, 1, [fila()], ctx()); const anterior = m.tarifas[0].id;
  C.guardarTarifas(m, 1, [fila({ tarifa: 225 }), fila({ rutaId: 902, tarifa: 0 })], ctx());
  assert.equal(m.tarifas.length, 1); assert.ok(m.tarifas[0].id > anterior); assert.equal(m.tarifas[0].tarifa, 225);
});
prueba('No se registra matriz sobre una versión liberada', () => {
  const m = base(); liberar(m, 1); assert.equal(C.guardarTarifas(m, 1, [fila()], ctx()).ok, false);
});
prueba('Adenda conserva ContratoID, usa PK global y secuencia propia; no copia tarifas', () => {
  const m = C.casoCompleto(); const h = m.historiales[2];
  assert.deepEqual([h.id, h.contratoId, h.secuencia, h.nroAdenda], [3, 1, 2, 1]);
  const r = C.adenda(m, 1, { tipo: 'ACONT', fin: '2027-03-31' }, ctx()); assert.ok(r.ok);
  assert.equal(m.historiales.at(-1).inicio, '2027-01-01'); assert.equal(m.tarifas.filter(t => t.historialId === r.id).length, 0);
});
prueba('MCOND conserva fin, permite cambio desde inicio anterior, rechaza fechas fuera', () => {
  const m = base(); liberar(m, 1);
  assert.equal(C.adenda(m, 1, { tipo: 'MCOND', inicio: '2025-12-31' }, ctx()).ok, false);
  assert.equal(C.adenda(m, 1, { tipo: 'MCOND', inicio: '2027-01-01' }, ctx()).ok, false);
  const r = C.adenda(m, 1, { tipo: 'MCOND', inicio: '2026-09-16', fin: '2028-01-01' }, ctx());
  assert.ok(r.ok); assert.equal(m.historiales.at(-1).fin, '2026-12-31');
});
prueba('No agregar adenda mientras la última está en elaboración ni sin permiso', () => {
  const m = base(); assert.equal(C.adenda(m, 1, { tipo: 'ACONT', fin: '2027-01-01' }, ctx()).ok, false);
  liberar(m, 1); const contexto = ctx(); contexto.permisos['Adicionar Adenda Contrato'] = false;
  assert.equal(C.adenda(m, 1, { tipo: 'ACONT', fin: '2027-01-01' }, contexto).ok, false);
});
prueba('Una adenda no liberada no reemplaza la tarifa anterior', () => {
  const m = base(); C.guardarTarifas(m, 1, [fila()], ctx()); liberar(m, 1);
  const r = C.adenda(m, 1, { tipo: 'MCOND', inicio: '2026-09-16' }, ctx()); C.guardarTarifas(m, r.id, [fila({ tarifa: 225 })], ctx());
  assert.equal(C.consultar(m, q()).tarifa, 0.21); liberar(m, r.id); assert.equal(C.consultar(m, q()).tarifa, 0.225);
});
for (const [fecha, precio] of [['2026-09-15', 0.21], ['2026-09-16', 0.225], ['2026-12-31', 0.225], ['2027-01-01', 0], ['2025-12-31', 0]]) prueba('Fecha ' + fecha + ' resuelve ' + precio, () => assert.equal(C.consultar(C.casoCompleto(), q({ fecha })).tarifa, precio));
prueba('Adenda cambia gasolina; diésel y alterna conservan tarifas anteriores', () => {
  const m = C.casoCompleto(); assert.equal(C.consultar(m, q({ productoId: 802 })).tarifa, 0.18);
  assert.equal(C.consultar(m, q({ prioridad: 'ALTERNA 1' })).tarifa, 0.25);
});
prueba('Ruta inversa, otro destino, tarifa inactiva y no aprobada se descartan', () => {
  const m = C.casoCompleto(); assert.equal(C.consultar(m, q({ origenId: 702, destinoId: 701 })).tarifa, 0);
  assert.equal(C.consultar(m, q({ destinoId: 703 })).tarifa, 0);
  m.tarifas.find(t => t.historialId === 3).activa = false; assert.equal(C.consultar(m, q()).tarifa, 0.21);
  m.tarifas.forEach(t => { t.aprobada = false; }); assert.equal(C.consultar(m, q()).tarifa, 0);
});
prueba('Extensión sin tarifas prolonga aplicación de tarifas de origen anterior', () => {
  const m = C.casoCompleto(); const r = C.adenda(m, 1, { tipo: 'ACONT', fin: '2027-03-31' }, ctx());
  assert.equal(C.consultar(m, q({ fecha: '2027-02-01' })).tarifa, 0);
  liberar(m, r.id); const c = C.consultar(m, q({ fecha: '2027-02-01' }));
  assert.equal(c.tarifa, 0.225); assert.equal(c.elegida.h.id, 3); assert.equal(c.elegida.h.fin, '2026-12-31'); assert.equal(c.elegida.vig.fin, '2027-03-31');
});
prueba('Empate de inicio no inventa resultado TOP 1', () => {
  const m = C.casoCompleto(); m.tarifas.push({ ...m.tarifas.find(t => t.historialId === 3), id: m.siguiente.tarifa++, tarifa: 240 });
  const r = C.consultar(m, q()); assert.equal(r.ok, false); assert.equal(r.ambigua, true);
});
prueba('La función devuelve cinco decimales y no convierte USD a Bs', () => {
  const m = base(); m.contratos[0].moneda = 'USD'; C.guardarTarifas(m, 1, [fila({ tarifa: 210.123456 })], ctx()); liberar(m, 1);
  assert.equal(C.consultar(m, q()).tarifa, 0.21012); C.registrarUso(m, q(), ctx()); assert.equal(m.usos[0].moneda, 'USD');
});
prueba('SQL redondea a cinco decimales antes y después de dividir la tarifa', () => {
  const m = base(); C.guardarTarifas(m, 1, [fila({ tarifa: 210.124999 })], ctx()); liberar(m, 1);
  assert.equal(C.consultar(m, q()).tarifa, 0.21013);
});
prueba('Consulta inválida no escribe estado ni devuelve una tarifa inventada', () => {
  const m = C.casoCompleto(), antes = JSON.stringify(m); assert.equal(C.consultar(m, q({ fecha: 'inválida' })).ok, false); assert.equal(JSON.stringify(m), antes);
});
prueba('Uso guarda IDs y fotografía del flete, no crea conciliaciones reales', () => {
  const m = C.casoCompleto(); assert.ok(C.registrarUso(m, q(), ctx()).ok);
  assert.deepEqual([m.usos[0].historialId, m.usos[0].tarifaId, m.usos[0].flete], [3, 5, 6750]);
  assert.equal(C.registrarUso(m, q({ volumen: -1 }), ctx()).ok, false);
  assert.equal(C.registrarUso(m, q({ origenId: 702, destinoId: 701 }), ctx()).ok, false);
});
prueba('V1 no detecta uso posterior al inicio: se reproduce y conserva la fotografía', () => {
  const m = C.casoCompleto(); C.registrarUso(m, q(), ctx()); const uso = copia(m.usos[0]);
  assert.equal(C.controlReversion(m, 3).detectadosV1.length, 0); assert.ok(C.revertir(m, 3, ctx()).ok);
  assert.equal(m.historiales[2].estado, 'EN ELABORACION'); assert.equal(m.tarifas.find(t => t.id === 5).aprobada, false);
  assert.deepEqual(m.usos[0], uso); assert.equal(C.consultar(m, q()).tarifa, 0.21);
  assert.equal(C.guardarTarifas(m, 3, [fila()], ctx()).ok, false);
});
prueba('Propuesto bloquea por relación y V1 bloquea uso en la fecha de inicio', () => {
  const m = C.casoCompleto(); C.registrarUso(m, q(), ctx());
  assert.equal(C.revertir(m, 3, { ...ctx(), modo: 'PROPUESTO' }).ok, false);
  const otro = C.casoCompleto(); C.registrarUso(otro, q({ fecha: '2026-09-16' }), ctx()); assert.equal(C.revertir(otro, 3, ctx()).ok, false);
});
prueba('Finalizar crea historial, solo afecta fecha tras liberar, no borra contrato', () => {
  const m = C.casoCompleto(), r = C.adenda(m, 1, { tipo: 'FINALIZACION', fin: '2026-11-30', observacion: 'Terminación anticipada' }, ctx());
  assert.ok(r.ok); assert.equal(C.fechas(m, 1).fin, '2026-12-31'); liberar(m, r.id);
  assert.equal(C.fechas(m, 1).fin, '2026-11-30'); assert.equal(C.consultar(m, q({ fecha: '2026-12-01' })).tarifa, 0); assert.equal(m.contratos.length, 2);
});
prueba('Finalizar antes del inicio o después de recepciones conciliadas se deniega', () => {
  const m = C.casoCompleto(); assert.equal(C.adenda(m, 1, { tipo: 'FINALIZACION', fin: '2025-12-31' }, ctx()).ok, false);
  C.registrarUso(m, q(), ctx()); assert.equal(C.adenda(m, 1, { tipo: 'FINALIZACION', fin: '2026-09-19' }, ctx()).ok, false);
});
prueba('Las fechas sin liberación muestran advertencia en vez de inventar contrato abierto', () => {
  const m = base(); assert.match(C.fechas(m, 1).aviso, /sola fila/);
  m.historiales.push({ ...m.historiales[0], id: 2, secuencia: 2 }); assert.equal(C.fechas(m, 1).fin, null);
});

E.reiniciar(true, 'O');
prueba('Modelo nuevo aislado y persistencia local conservan viajes anteriores', () => {
  const antes = JSON.stringify({ contratos: E.st.contratos, tarifas: E.st.tarifas, conciliaciones: E.st.conciliaciones, cres: E.st.cres });
  E.st.estudioContratos = C.casoCompleto(); E.guardar(); E.cargar();
  assert.equal(E.st.estudioContratos.historiales.length, 3);
  assert.equal(JSON.stringify({ contratos: E.st.contratos, tarifas: E.st.tarifas, conciliaciones: E.st.conciliaciones, cres: E.st.cres }), antes);
});
for (let paso = 0; paso < C.PASOS.length; paso++) prueba('Render del paso ' + (paso + 1) + ' conserva modelo y escapa datos', () => {
  U.vista().paso = paso; const m = U.modelo(); m.contratos[0].numero = '<script>prueba</script>';
  const antes = JSON.stringify(m), html = V.contratos();
  assert.match(html, /aria-current="step"/); assert.match(html, /Fuentes V1/); assert.ok(!html.includes('<script>prueba</script>')); assert.equal(JSON.stringify(m), antes);
});
prueba('Navegación y recursos nuevos disponibles sin SQL publicado', () => {
  assert.ok(SILOG.app.MENU.flatMap(g => g[1]).some(x => x[0] === 'contratos'));
  assert.match(V.tarifario(), /href="#contratos"/);
  SILOG.SIN_SQL = true; assert.ok(!V.contratos().includes('href="../EXTRACCION_SQL')); SILOG.SIN_SQL = false;
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const nombre of ['js/contratos_estudio.js', 'js/vistas_contratos_estudio.js', 'js/control_contratos_estudio.js', 'css/contratos-estudio.css']) { assert.ok(html.includes(nombre)); assert.ok(fs.existsSync(path.join(__dirname, '..', nombre))); }
});
prueba('Controlador registra contrato y permite editar matriz y avanzar sin recargar página', () => {
  E.st.estudioContratos = C.nuevo(); SILOG.app.vs.ct = null;
  const render = SILOG.app.render, notificar = SILOG.app.notificar; let ultima;
  SILOG.app.render = () => {}; SILOG.app.notificar = r => { ultima = r; };
  const enviar = (tipo, d) => {
    const f = { dataset: { ctForm: tipo }, elements: Object.entries(d).map(([name, value]) => ({ name, value, disabled: false })) };
    eventos.submit.at(-1)({ target: { closest: () => f }, preventDefault() {} });
  };
  enviar('contrato', datos()); assert.ok(ultima.ok); assert.equal(U.vista().paso, 2);
  enviar('fila', fila()); assert.equal(U.vista().filas.length, 1);
  const pulsar = a => eventos.click.at(-1)({ target: { closest: () => ({ dataset: { ctAccion: a } }) } });
  pulsar('guardarMatriz'); assert.equal(U.modelo().tarifas.length, 0); assert.match(V.contratos(), /role="alertdialog"/);
  pulsar('cancelarConfirmacion'); assert.equal(U.modelo().tarifas.length, 0);
  pulsar('guardarMatriz'); U.vista().filas[0].tarifa = 999;
  pulsar('confirmar'); assert.ok(ultima.ok); assert.equal(U.modelo().tarifas.length, 1); assert.equal(U.modelo().tarifas[0].tarifa, 210);
  for (let i = 0; i < 3; i++) pulsar('avanzar'); assert.equal(U.modelo().historiales[0].estado, 'LIBERADO');
  enviar('consulta', q()); assert.equal(U.vista().consulta.fecha, '2026-09-20');
  U.vista().paso = 1;
  enviar('contrato', datos({ numero: 'CONSERVAR-EL-BORRADOR', inicio: '2027-01-01', fin: '2026-12-31' }));
  assert.equal(ultima.ok, false); assert.match(V.contratos(), /value="CONSERVAR-EL-BORRADOR"/);
  SILOG.app.render = render; SILOG.app.notificar = notificar;
});
console.log(`\n${total}/${total} verificaciones de contratos, adendas y tarifas correctas.`);

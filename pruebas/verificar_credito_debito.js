/* Casos de estudio C/D: números, relaciones, mensajes y renderizado; sin SQL ni navegador. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const eventos = [];
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = { addEventListener: (tipo, fn) => eventos.push({ tipo, fn }) };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'calculos_en_filas', 'estudio_creditodebito', 'app'].forEach(f => require('../js/' + f + '.js'));
const C = SILOG.creditoDebito, M = SILOG.motor, V = SILOG.vistas, E = SILOG.estado;
E.reiniciar(true, 'I');
let total = 0;
const prueba = (titulo, fn) => { fn(); total++; console.log('OK ' + titulo); };
const cerca = (actual, esperado) => assert.ok(Math.abs(actual - esperado) < 0.005, `${actual} != ${esperado}`);
const caso = id => C.casos.find(c => c.id === id);
const calcular = (id, modo = 'V1') => C.evaluar(caso(id), modo);
const esperados = {
  'sin-diferencia': [6300, 0, 0, 0, 6300],
  'faltante-dentro': [6287.4, 0, 0, 0, 6287.4],
  'limite-admisible': [6281.1, 0, 0, 0, 6281.1],
  'faltante-fuera': [6274.8, -143.7, -143.7, -143.7, 6131.1],
  demasia: [6308.4, 191.6, 0, 0, 6308.4],
  'sin-tolerancia': [6279, -479, -479, -479, 5800],
  'dos-despachos': [6279, -47.9, -47.9, -47.9, 6231.1],
  'tres-despachos': [6237, -1005.9, -1005.9, -1005.9, 5231.1],
  'recepciones-parciales': [6279, -47.9, -47.9, -47.9, 6231.1],
  'residuo-redondeo': [6295.8, 0, 0, 0, 6295.8],
  'muchos-a-muchos': [6300, 0, 0, 0, 6300],
  'compensacion-parcial': [12579, -47.9, -47.9, -47.9, 12531.1],
  'compensacion-total': [12583.2, 47.9, 0, 0, 12583.2],
  'productos-distintos': [12583.2, 25.1, -143.7, -143.7, 12439.5],
  'merma-liberada': [6274.8, -143.7, 0, 0, 6274.8],
  'liberacion-mixta': [6279, -47.9, -47.9, 0, 6279],
  'capacidad-no-cd': [6279, -62.27, -62.27, -62.27, 6216.73],
  'tarifas-precios-distintos': [6709.5, -312, -312, -312, 6397.5],
  'precio-ausente': [6274.8, 0, 0, 0, 6274.8]
};
prueba('22 casos identificables y 8 conceptos de la explicación', () => { assert.equal(C.casos.length, 22); assert.equal(new Set(C.casos.map(c => c.id)).size, 22); assert.equal(C.conceptos.length, 8); });
for (const modo of ['V1', 'PROPUESTO']) {
  for (const [id, xs] of Object.entries(esperados)) {
    prueba('Resultados ' + modo + '/' + id, () => {
      const r = calcular(id, modo); assert.ok(!r.error && !r.nota);
      [r.d.cab.flete, r.bruto, r.d.cab.mermas, r.sql.mermas, r.sql.neto].forEach((x, i) => cerca(x, xs[i]));
    });
  }
  for (const c of C.casos) {
    prueba('Renderizar y explicar ' + modo + '/' + c.id, () => {
      E.ui.modo = modo; SILOG.app.vs.cd.casoId = c.id;
      const antes = JSON.stringify(E.st), html = V.creditodebito(); assert.equal(JSON.stringify(E.st), antes);
      assert.ok(!html.includes('NaN') && !html.includes('undefined'));
      assert.ok(html.includes(c.historia.replace(/&/g, '&amp;'))); assert.match(html, /Qué aprender:/);
      if (esperados[c.id]) { assert.match(html, /Del C\/D a la merma de cabecera/); assert.match(html, /data-accion="abrirCalculoFila"/); }
      else { assert.ok(!html.includes('Neto según SQL OT')); assert.match(html, /No se muestran ceros inventados/); }
    });
  }
}
E.ui.modo = 'V1';
prueba('Balance negativo dentro de tolerancia no se confunde con débito', () => {
  const l = calcular('faltante-dentro').d.grupos[0].lineas[0]; cerca(l.balanceLote, -60); cerca(l.cdLts, 0);
  assert.match(C.interpretar(l.balanceLote, l.cdLts), /dentro del admisible/);
});
prueba('Límite exacto: el cargo exige superar y no igualar admisible', () => {
  const l = calcular('limite-admisible').d.grupos[0].lineas[0]; cerca(l.balanceLote, -90); cerca(l.admLts, 90); cerca(l.cdLts, 0);
});
prueba('Cargo valoriza producto, no tarifa de flete', () => {
  const l = calcular('faltante-fuera').d.grupos[0].lineas[0]; cerca(l.cdLts, -30); cerca(l.precioMulta, 4.79); cerca(l.tarifaAplicada, 0.21); cerca(l.cdBs, -143.7);
});
prueba('Demasía positiva no suma premio a la cabecera', () => {
  const r = calcular('demasia'); cerca(r.d.grupos[0].lineas[0].cdLts, 40); cerca(r.bruto, 191.6); cerca(r.sql.mermas, 0); cerca(r.sql.neto, r.sql.flete);
});
prueba('Varios despachos: recibido y flete se contabilizan solo una vez', () => {
  const r = calcular('dos-despachos'), ls = r.d.grupos[0].lineas;
  cerca(ls.reduce((v, l) => v + l.volDesp, 0), 30000); cerca(ls.reduce((v, l) => v + l.volRec, 0), 29900);
  assert.equal(ls.filter(l => l.totalFlete !== 0).length, 1); cerca(ls[0].cdLts, 0); cerca(ls[1].cdLts, -10);
});
prueba('Tres despachos suman tolerancias individuales antes del ajuste', () => {
  const ls = calcular('tres-despachos').d.grupos[0].lineas; assert.deepEqual(ls.map(l => l.admLts), [30, 30, 30]); cerca(ls[2].cdLts, -210);
});
prueba('Recepciones parciales no reutilizan el despacho entero', () => {
  const r = calcular('recepciones-parciales'), ls = r.d.grupos.map(g => g.lineas[0]);
  assert.deepEqual(ls.map(l => l.volDesp), [18060, 11940]); assert.deepEqual(ls.map(l => l.cdLts), [-6, -4]); cerca(r.asignado, r.original);
});
prueba('Residuo V1 es advertido; resto mayor conserva el volumen', () => {
  const v1 = calcular('residuo-redondeo'), propuesto = calcular('residuo-redondeo', 'PROPUESTO');
  cerca(v1.original, 29999); cerca(v1.asignado, 30000); assert.ok(v1.advertencias.some(x => x.includes('D10')));
  cerca(propuesto.asignado, 29999); assert.deepEqual(propuesto.d.grupos.map(g => g.lineas[0].volDesp), [15000, 14999]);
});
prueba('N×M se calcula por sus asociaciones explícitas', () => {
  const r = calcular('muchos-a-muchos'); assert.deepEqual(r.d.grupos.map(g => g.lineas.map(l => l.volDesp)), [[9000, 9000], [6000, 6000]]);
  cerca(r.original, 30000); cerca(r.asignado, 30000); assert.ok(r.advertencias.some(x => x.includes('base real')));
});
prueba('Cambiar una asociación cambia el cálculo, no se infiere solo por volumen', () => {
  const c = structuredClone(caso('muchos-a-muchos')); c.recepciones[0].despachos = ['D1'];
  const r = C.evaluar(c); assert.ok(!r.error); assert.notEqual(r.d.grupos[0].tot.despachos, calcular('muchos-a-muchos').d.grupos[0].tot.despachos);
});
prueba('Compensación parcial reduce el cargo a 47,90, no paga la demasía aparte', () => cerca(calcular('compensacion-parcial').sql.mermas, -47.9));
prueba('Compensación total limita saldo positivo a cero', () => { const r = calcular('compensacion-total'); cerca(r.bruto, 47.9); cerca(r.sql.mermas, 0); });
prueba('No mezclar productos aunque el C/D bruto global sea positivo', () => {
  const r = calcular('productos-distintos'); assert.ok(r.bruto > 0); cerca(r.sql.mermas, -143.7); assert.equal(Object.values(r.d.productos).length, 2);
});
prueba('Liberar merma conserva diferencia física y elimina aporte monetario final', () => {
  const r = calcular('merma-liberada'); cerca(r.d.grupos[0].lineas[0].cdLts, -30); cerca(r.bruto, -143.7); cerca(r.sql.mermas, 0);
});
prueba('Liberación mixta reproduce las tres lecturas inconsistentes de V1', () => {
  const r = calcular('liberacion-mixta'); cerca(r.d.cab.mermas, -47.9); cerca(r.sql.mermas, 0);
  assert.equal(M.otFilas(r.st, r.conc)[0].liberarMerma, false); assert.ok(r.advertencias.some(x => x.includes('D28/D35')));
});
prueba('Capacidad remunerada no sustituye despacho físico para calcular C/D', () => {
  const l = calcular('capacidad-no-cd').d.grupos[0].lineas[0]; cerca(l.volDesp, 29000); cerca(l.baseFlete, 29900); cerca(l.cdLts, -13);
});
prueba('Tarifas y precios distintos: la última línea valoriza C/D, no el promedio', () => {
  const r = calcular('tarifas-precios-distintos'), ls = r.d.grupos[0].lineas;
  assert.deepEqual(ls.map(l => l.admLts), [45, 75]); cerca(ls[1].cdLts, -60); cerca(ls[1].precioMulta, 5.2); cerca(ls[1].cdBs, -312); cerca(ls[1].tarifaAplicada, 0.225);
  assert.ok(r.advertencias.some(x => x.includes('D27')));
});
prueba('Precio cero no oculta diferencia física ni se describe como condonación', () => {
  const r = calcular('precio-ausente'); cerca(r.d.grupos[0].lineas[0].cdLts, -30); cerca(r.bruto, 0);
  assert.ok(r.advertencias.some(x => x.includes('Precio cero')));
  SILOG.app.vs.cd.casoId = 'precio-ausente'; const html = V.creditodebito(); assert.match(html, /Valoración pendiente/);
  assert.ok(html.indexOf('Precio cero:') < html.indexOf('Neto según SQL OT'));
});
prueba('Recepción no asociada: error legible y sin resultado inventado', () => assert.match(calcular('recepcion-sin-asociacion').error, /no tiene despacho asociado/));
prueba('Despacho en tránsito no se toma como recibido cero', () => assert.match(calcular('despacho-sin-recepcion').error, /No hay recepción/));
prueba('Periodos distintos no se suman en una cabecera inventada', () => { const r = calcular('periodos-distintos'); assert.ok(r.nota); assert.equal(r.d, undefined); });
prueba('Datos ausentes no lanzan excepción ni crean ajuste cero', () => assert.match(C.evaluar(null).error, /Faltan documentos/));
const invalido = fn => { const c = structuredClone(caso('dos-despachos')); fn(c); return C.evaluar(c).error; };
prueba('Documento repetido se detecta', () => assert.match(invalido(c => c.despachos[1].id = c.despachos[0].id), /identificadores.*repetidos/));
prueba('Asociación duplicada se detecta', () => assert.match(invalido(c => c.recepciones[0].despachos.push('D1')), /asociación duplicada/));
prueba('Referencia inexistente se detecta', () => assert.match(invalido(c => c.recepciones[0].despachos.push('D99')), /inexistente/));
prueba('Matriz ausente se explica sin asumir vínculos', () => assert.match(invalido(c => delete c.recepciones[0].despachos), /Falta la matriz/));
prueba('Producto diferente en la misma recepción se rechaza en el ejemplo', () => assert.match(invalido(c => c.despachos[1].producto = 'DO'), /productos distintos/));
prueba('Producto desconocido no se inventa', () => assert.match(invalido(c => delete c.despachos[0].producto), /Falta identificar/));
prueba('Volumen cero del ejemplo no se interpreta como prueba de pérdida', () => assert.match(invalido(c => c.recepciones[0].litros = 0), /volumen positivo/));
prueba('Tarifa o precio inválido da mensaje, no NaN', () => assert.match(invalido(c => c.despachos[0].precio = NaN), /no negativos/));
prueba('El cálculo de casos no modifica catálogo ni estado activo', () => {
  const casosAntes = JSON.stringify(C.casos), estadoAntes = JSON.stringify(E.st);
  for (const c of C.casos) C.evaluar(c, 'V1'); assert.equal(JSON.stringify(C.casos), casosAntes); assert.equal(JSON.stringify(E.st), estadoAntes);
});
prueba('Las ayudas de fila C/D enlazan a la guía, las de flete no se confunden', () => {
  const r = calcular('faltante-fuera'), g = r.d.grupos[0];
  const xs = SILOG.auditoria.linea(r.st, g.lineas[0], g);
  assert.match(V.celdaCalculo('−30', xs.find(x => x.clave === 'cdLts')), /href="#creditodebito"/);
  assert.ok(!V.celdaCalculo('100', xs.find(x => x.clave === 'flete')).includes('href="#creditodebito"'));
});
prueba('OT, sin conciliar y ejemplos muestran la explicación antes de sus datos', () => {
  for (const ruta of ['ot', 'sinconciliar', 'ejemplos']) { const html = V[ruta](); assert.ok(html.indexOf('cd-resumen') > 0); assert.ok(html.indexOf('cd-resumen') < html.indexOf('<section class="tarjeta')); }
});
prueba('Detalle de cisterna incluye la guía junto al detalle por recepción', () => {
  const c = E.st.conciliaciones[0], html = V.detalleConciliacion(c, true); assert.ok(html.indexOf('cd-resumen') < html.indexOf('<h3>Detalle por recepción y despacho'));
});
prueba('Selección de caso solo cambia navegación/estudio, no negocio', () => {
  const estadoAntes = JSON.stringify(E.st), previo = SILOG.app.render; let renders = 0;
  SILOG.app.render = () => renders++;
  try { eventos.find(x => x.tipo === 'change').fn({ target: { id: '', type: 'select-one', dataset: { cambio: 'cd.casoId' }, value: 'dos-despachos' } }); assert.equal(SILOG.app.vs.cd.casoId, 'dos-despachos'); assert.equal(renders, 1); assert.equal(JSON.stringify(E.st), estadoAntes); }
  finally { SILOG.app.render = previo; }
});
prueba('Explicación conserva términos contables sin asumir una nota o préstamo', () => {
  const html = V.creditodebito(); assert.match(html, /No es un préstamo/); assert.match(html, /perspectiva/); assert.match(html, /No atribuir automáticamente la culpa/);
});
prueba('Textos de caso se escapan al renderizar', () => {
  const c = structuredClone(caso('faltante-fuera')); c.id = 'prueba-escape'; c.titulo = '<script>titulo</script>'; c.historia = '<img onerror="alert(1)">'; C.casos.push(c);
  try { SILOG.app.vs.cd.casoId = c.id; const html = V.creditodebito(); assert.ok(!html.includes('<script>titulo')); assert.match(html, /&lt;script&gt;/); assert.ok(!html.includes('<img onerror=')); }
  finally { C.casos.pop(); }
});
prueba('Cargar SIN_SQL no genera vínculos a copias SQL ausentes en la guía', () => { SILOG.SIN_SQL = true; try { assert.ok(!V.panelFuentes('creditodebito').includes('href="../EXTRACCION_SQL')); } finally { SILOG.SIN_SQL = false; } });
prueba('Recursos y orden de dependencias están en index.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const file of ['js/credito_debito.js', 'js/estudio_creditodebito.js', 'css/credito-debito.css']) { assert.ok(html.includes(file)); assert.ok(fs.existsSync(path.join(__dirname, '..', file))); }
  assert.ok(html.indexOf('js/credito_debito.js') > html.indexOf('js/motor.js')); assert.ok(html.indexOf('js/estudio_creditodebito.js') < html.indexOf('js/app.js'));
  assert.ok(SILOG.app.MENU.flatMap(x => x[1]).some(x => x[0] === 'creditodebito'));
});
console.log(`\n${total}/${total} verificaciones C/D correctas (sin SQL ni navegador).`);

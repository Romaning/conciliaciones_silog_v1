/* Ejercicios trazados a VB/SQL, sin base de datos ni generación de documentos. */
const assert = require('node:assert/strict');
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
const eventos = {};
global.document = { addEventListener: (evento, fn) => (eventos[evento] ||= []).push(fn) };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'credito_debito', 'auditoria_calculos', 'calculos_otros_medios', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'estudio_otros_medios', 'app'].forEach(f => require('../js/' + f + '.js'));
const L = SILOG.calculosOtrosMedios, V = SILOG.vistas, E = SILOG.estado;
let pruebas = 0;
const prueba = (nombre, fn) => { fn(); pruebas++; console.log('OK ' + nombre); };
const calcular = (tipo, extra = {}) => {
  const r = L.evaluar(tipo, { ...L.entradaInicial(tipo), ...extra });
  assert.equal(r.ok, true, JSON.stringify(r.errores)); return r;
};
const valor = (r, nombre) => r.fichas.find(x => x.clave === nombre).valor;

prueba('100%: flete con compensación 19.920; merma -208; ambos netos 19.712', () => {
  const r = calcular('barcaza');
  assert.equal(valor(r, 'compL'), 20000); assert.equal(valor(r, 'compBs'), 4000);
  assert.equal(valor(r, 'fleteTotal'), 19920);
  assert.equal(r.netoGuardado, 19712); assert.equal(r.netoVisual, 19712); assert.equal(r.diferencia, 0);
});
prueba('90%: máximo 90.000 y compensación 10.000, no 20.000', () => {
  const r = calcular('barcaza', { porcentaje: 90 });
  assert.equal(valor(r, 'maximo'), 90000); assert.equal(valor(r, 'compL'), 10000);
  assert.equal(r.netoGuardado, 17712);
});
prueba('Despacho supera máximo parcial: compensación cero', () => {
  assert.equal(valor(calcular('barcaza', { porcentaje: 90, despachado: 95000 }), 'compL'), 0);
});
prueba('Recepción igual a capacidad en rama 100%: no compensar', () => {
  assert.equal(valor(calcular('barcaza', { recibido: 100000 }), 'compL'), 0);
});
prueba('Rama 100% conserva resultado negativo V1 y advierte, no lo oculta', () => {
  const r = calcular('barcaza', { despachado: 105000, recibido: 99000 });
  assert.equal(valor(r, 'compL'), -5000); assert.equal(valor(r, 'compBs'), -1000);
  assert.ok(r.avisos.some(x => /compensación negativa/.test(x)));
});
prueba('Capacidad cero sin fotografía: no inventar compensación', () => {
  const r = calcular('barcaza', { capacidad: 0 });
  assert.equal(valor(r, 'compL'), 0); assert.equal(valor(r, 'fleteTotal'), 15920);
});
prueba('Capacidad cero conserva campos anteriores incluso con nueva tarifa', () => {
  const r = calcular('barcaza', { capacidad: 0, tarifa: 0.3, compensacionGuardadaL: 20000, compensacionGuardadaBs: 4000 });
  assert.equal(valor(r, 'compL'), 20000); assert.equal(valor(r, 'compBs'), 4000);
  assert.equal(valor(r, 'fleteTotal'), 27880);
  assert.ok(r.avisos.some(x => /quitar la capacidad/.test(x)));
});
prueba('Porcentaje cero con capacidad positiva sí limpia compensación previa', () => {
  const r = calcular('barcaza', { porcentaje: 0, compensacionGuardadaL: 20000, compensacionGuardadaBs: 4000 });
  assert.equal(valor(r, 'compL'), 0); assert.equal(valor(r, 'compBs'), 0);
});
prueba('CInt redondea litros .5 a entero par antes del flete y compensación', () => {
  const r = calcular('barcaza', { recibido: 79600.5, despachado: 80001.5 });
  assert.equal(valor(r, 'flete'), 15920); assert.equal(valor(r, 'compL'), 19998);
  assert.ok(r.avisos.some(x => /CInt/.test(x)));
});
prueba('Máximo parcial aplica conversión a entero bancario en empate', () => {
  assert.equal(valor(calcular('barcaza', { capacidad: 101, porcentaje: 50, despachado: 0 }), 'maximo'), 50);
});
prueba('Tarifa especial positiva sustituye la seleccionada', () => {
  const r = calcular('barcaza', { tarifaEspecial: 0.3 });
  assert.equal(valor(r, 'flete'), 23880); assert.equal(valor(r, 'compBs'), 6000);
});
prueba('Liberar merma y demasía positiva no agregan un crédito al neto', () => {
  assert.equal(calcular('barcaza', { liberarMerma: true }).netoGuardado, 19920);
  assert.equal(calcular('barcaza', { cdProducto: 208 }).netoGuardado, 19920);
});
prueba('Recargos firmados afectan total visual, no fórmula guardada de barcaza', () => {
  const r = calcular('barcaza', { multaTransporte: 100, multaConciliacion: 200, descuentoConciliacion: 50 });
  assert.equal(r.netoGuardado, 19712); assert.equal(r.netoVisual, 19362); assert.equal(r.diferencia, -350);
  assert.ok(r.avisos.some(x => /@Moneda/.test(x)));
});
prueba('Vagón: toneladas se redondean antes de multiplicar tarifa', () => {
  const r = calcular('vagon');
  assert.equal(valor(r, 'toneladas'), 24.57); assert.equal(r.netoGuardado, 1965.6);
  assert.equal(valor(r, 'formularios'), 57); assert.equal(r.netoVisual, 2022.6); assert.equal(r.diferencia, 57);
});
prueba('Formularios por filas, API no modifica flete de kilos ya medidos', () => {
  const a = calcular('vagon'), b = calcular('vagon', { filas: 3, api: 42 });
  assert.equal(a.netoGuardado, b.netoGuardado); assert.notEqual(valor(a, 'densidad'), valor(b, 'densidad'));
  assert.equal(valor(b, 'formularios'), 85.5);
});
for (const [monto, incluido] of [[0, false], [0.01, false], [0.49, false], [0.5, false], [0.51, true], [1.5, true]]) {
  prueba('Filtro CInt de V1 para descuento ' + monto, () => {
    const r = calcular('vagon', { descuentoConciliacion: monto });
    assert.equal(r.conceptos.at(-1).incluido, incluido);
    assert.equal(r.netoVisual, SILOG.motor.redHU(2022.6 - (incluido ? monto : 0)));
    assert.equal(r.sumaSinFiltro, SILOG.motor.redHU(2022.6 - monto));
  });
}
prueba('No sumar flete diminuto que V1 oculta: el neto guardado aún lo conserva', () => {
  const r = calcular('vagon', { kilos: 10, tarifa: 49, filas: 1 });
  assert.equal(r.netoGuardado, 0.49); assert.equal(r.netoVisual, 28.5);
  assert.equal(valor(r, 'visual'), 28.5);
});
prueba('Tarifa cero permite estudiar ausencia sin llamarla gratuidad', () => {
  const r = calcular('vagon', { tarifa: 0 }); assert.equal(r.netoGuardado, 0);
  assert.ok(r.avisos.some(x => /gratuito/.test(x)));
});
for (const invalido of ['', ' ', 'texto', NaN, Infinity, null, false, '<script>']) {
  prueba('Entrada inválida no produce totales: ' + String(invalido), () => {
    const r = L.evaluar('vagon', { ...L.entradaInicial('vagon'), kilos: invalido });
    assert.equal(r.ok, false); assert.ok(r.errores.length); assert.equal(r.netoVisual, undefined);
  });
}
prueba('Rechazar negativos, porcentajes fuera de rango, API singular y filas fraccionarias', () => {
  for (const [tipo, extra] of [['vagon', { kilos: -1 }], ['vagon', { api: -131.5 }], ['vagon', { filas: 1.5 }], ['vagon', { filas: 0 }], ['barcaza', { porcentaje: 101 }], ['barcaza', { porcentaje: -1 }], ['barcaza', { capacidad: 1.5 }], ['vagon', { tarifa: -1 }]]) {
    assert.equal(L.evaluar(tipo, { ...L.entradaInicial(tipo), ...extra }).ok, false);
  }
  assert.equal(L.evaluar('__proto__', {}).ok, false);
  assert.equal(L.evaluar('vagon', null).ok, false);
});
prueba('Seis casos precargados son válidos y no modifican datos transaccionales', () => {
  E.reiniciar(true, 'O'); const antes = JSON.stringify(E.st);
  L.CASOS.forEach(c => assert.equal(L.evaluar(c.tipo, c.datos).ok, true));
  V.laboratorioOtrosMedios(); assert.equal(JSON.stringify(E.st), antes);
});
prueba('Render accesible: unidades, ayuda por campo y comparación explícita', () => {
  const html = V.laboratorioOtrosMedios();
  assert.match(html, /aria-describedby="medio-vagon-kilos-ayuda"/);
  assert.match(html, /aria-live="polite"/); assert.match(html, /Neto que guardaría V1/);
  assert.match(html, /Neto mostrado en Totales/); assert.match(html, /código histórico V1/);
  assert.equal((html.match(/id="medio-/g) || []).length, (L.CAMPOS.barcaza.length + L.CAMPOS.vagon.length) * 2);
});
prueba('El laboratorio precede al panel de conciliación y no duplica ejemplos fijos', () => {
  const html = V.calculos();
  assert.equal((html.match(/id="laboratorio-otros-medios"/g) || []).length, 1);
  assert.ok(html.indexOf('id="laboratorio-otros-medios"') < html.indexOf('¿Cómo se llegó a cada importe?'));
  assert.ok(!html.includes('Barcaza: compensación al 90% y límite de despacho'));
});
prueba('SIN_SQL no publica enlaces SQL inexistentes', () => {
  SILOG.SIN_SQL = true; assert.ok(!V.laboratorioOtrosMedios().includes('href="../EXTRACCION_SQL')); SILOG.SIN_SQL = false;
});
prueba('Errores no reflejan HTML inyectado ni muestran totales anteriores', () => {
  const html = V.resultadosOtrosMedios('vagon', { ...L.entradaInicial('vagon'), kilos: '<script>alert(1)</script>' });
  assert.match(html, /No se calculó/); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('Neto que guardaría'));
});
prueba('Controlador: editar y cargar un caso actualiza solo los resultados', () => {
  const inputs = Object.fromEntries(L.CAMPOS.barcaza.map(c => [c.nombre, { value: String(L.entradaInicial('barcaza')[c.nombre]), type: 'number' }]));
  inputs.liberarMerma = { checked: false, type: 'checkbox' };
  const resultado = { innerHTML: '' }, estado = { textContent: '' };
  const form = { dataset: { estudioMedio: 'barcaza' }, elements: { namedItem: n => inputs[n] }, querySelector: s => s === '[data-estado-medio]' ? estado : resultado };
  eventos.input.at(-1)({ target: { closest: () => form } });
  assert.match(resultado.innerHTML, /19\.712,00/);
  assert.match(estado.textContent, /Resultados actualizados/);
  inputs.recibido.value = ''; eventos.input.at(-1)({ target: { closest: () => form } });
  assert.match(resultado.innerHTML, /No se calculó/);
  const boton = { dataset: { medioCaso: 'barcaza-anterior' }, closest: () => ({ querySelector: () => form }) };
  eventos.click.find(fn => fn.toString().includes('data-medio-caso'))({ target: { closest: () => boton } });
  assert.equal(Number(inputs.capacidad.value), 0); assert.match(resultado.innerHTML, /quitar la capacidad/);
  assert.equal(inputs.compensacionGuardadaBs.value, 4000);
});
console.log(`\n${pruebas} verificaciones del laboratorio de otros medios correctas.`);

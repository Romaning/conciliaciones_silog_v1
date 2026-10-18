/* Ayudas de celda: renderizado y controlador DOM aislado. No es una prueba visual de navegador. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const eventos = [];
class Nodo {
  constructor(tag, clase = '') { this.tagName = tag.toUpperCase(); this.className = clase; this.children = []; this.parentElement = null; this.dataset = {}; this.attributes = {}; this.colSpan = 1; this.value = ''; }
  get classList() { return { contains: c => this.className.split(' ').includes(c) }; }
  get cells() { return this.children.filter(x => ['TD', 'TH'].includes(x.tagName)); }
  get nextElementSibling() { return this.parentElement ? this.parentElement.children[this.parentElement.children.indexOf(this) + 1] || null : null; }
  matches(sel) {
    if (sel.includes(',')) return sel.split(',').some(x => this.matches(x.trim()));
    if (sel === 'tr[data-fila-calculo]') return this.tagName === 'TR' && 'filaCalculo' in this.dataset;
    if (sel === '[data-accion]') return !!this.dataset.accion;
    if (sel.startsWith('.')) return this.classList.contains(sel.slice(1));
    if (sel.includes('.')) { const [tag, cls] = sel.split('.'); return this.tagName === tag.toUpperCase() && this.classList.contains(cls); }
    return this.tagName === sel.toUpperCase();
  }
  closest(sel) { return this.matches(sel) ? this : this.parentElement && this.parentElement.closest(sel); }
  querySelector(sel) { for (const x of this.children) { if (x.matches(sel)) return x; const y = x.querySelector(sel); if (y) return y; } return null; }
  appendChild(x) { x.parentElement = this; this.children.push(x); return x; }
  after(x) { x.parentElement = this.parentElement; this.parentElement.children.splice(this.parentElement.children.indexOf(this) + 1, 0, x); }
  remove() { this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  focus(options) { this.focusOptions = options; }
  cloneNode(deep) { const c = new Nodo(this.tagName, this.className); Object.assign(c.attributes, this.attributes); if (deep) this.children.forEach(x => c.appendChild(x.cloneNode(true))); return c; }
}
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = { addEventListener: (tipo, fn, captura) => eventos.push({ tipo, fn, captura }), createElement: tag => new Nodo(tag) };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'calculos_en_filas', 'estudio_creditodebito', 'app'].forEach(f => require('../js/' + f + '.js'));
const M = SILOG.motor, A = SILOG.auditoria, E = SILOG.estado, V = SILOG.vistas, C = SILOG.calculosEnFilas;
let total = 0;
const prueba = (titulo, fn) => { fn(); total++; console.log('OK ' + titulo); };
const cerca = (valor, esperado) => assert.ok(Math.abs(valor - esperado) < 0.005, `${valor} != ${esperado}`);
E.reiniciar(true, 'I');
const c = E.st.conciliaciones.find(x => x.numero === 980);
SILOG.app.vs.conc.concId = c.id;
Object.assign(SILOG.app.vs.ot, { concId: c.id, area: c.area, mes: c.mes, anio: c.anio, quincena: c.quincena });
const primerPanel = html => html.split('<section class="tarjeta estudio" aria-label="Explicación')[0];

prueba('Cada celda expone botón accesible, controles y contenido escapado', () => {
  const x = { titulo: '<flete>', valor: 10, unidad: 'Bs', pasos: ['<script>dato</script>'], fuente: '<fuente>' };
  const html = V.celdaCalculo('10,00', x);
  assert.match(html, /type="button"/); assert.match(html, /aria-expanded="false"/); assert.match(html, /aria-controls="calculo-local-\d+"/);
  assert.match(html, /&lt;script&gt;/); assert.ok(!html.includes('<script>dato'));
});
prueba('Cada instancia obtiene un ID distinto sin modificar el estado de negocio', () => {
  const antes = JSON.stringify(E.st), x = { titulo: 'Flete', valor: 10, unidad: 'Bs', pasos: ['10'], fuente: 'SQL' };
  assert.notEqual(V.celdaCalculo('10', x).match(/aria-controls="([^"]+)"/)[1], V.celdaCalculo('10', x).match(/aria-controls="([^"]+)"/)[1]);
  assert.equal(JSON.stringify(E.st), antes);
});
prueba('Dato ausente conserva el valor y no inventa una fórmula', () => assert.equal(V.celdaCalculo('12,34', null), '12,34'));
prueba('Totales OT explican desde la fila exterior, no dentro de la minitabla', () => {
  const html = primerPanel(V.ot());
  assert.match(html, /<tr data-fila-calculo/); assert.match(html, /Ver cálculo: Flete Facturable mostrado en Totales OT/);
  assert.match(html, /Ver cálculo: Neto mostrado en la columna Totales de OT/);
});
prueba('Cada magnitud del detalle OT tiene ayuda en su celda, antes del panel inferior', () => {
  const html = primerPanel(V.ot());
  for (const titulo of ['Despacho de esta recepción', 'Recepción consolidada', 'Balance físico agrupado', 'Admisible acumulado', 'Crédito/débito físico agrupado', 'Precio promedio mostrado en OT', 'C/D monetario de esta recepción', 'Tarifa promedio de líneas guardadas', 'Flete de esta recepción', 'Liberar capacidad: base remunerada', 'Tarifa especial guardada', 'Alcance de liberar merma']) assert.ok(html.includes('Ver cálculo: ' + titulo), titulo);
});
prueba('Totales, productos y líneas de cisterna muestran ayudas locales', () => {
  const html = primerPanel(V.detalleConciliacion(c, false));
  for (const titulo of ['Flete recalculado', 'Multa Transporte consolidada', 'C/D bruto por producto', 'Merma aplicada por producto', 'Flete de la línea', 'Total a facturar mostrado en la línea']) assert.ok(html.includes('Ver cálculo: ' + titulo), titulo);
});
prueba('El detalle de solo lectura también permite consultar fórmulas', () => assert.match(primerPanel(V.detalleConciliacion(c, true)), /data-accion="abrirCalculoFila"/));
prueba('Detalle sin conciliar trae ayudas junto a sus importes y presupuesto', () => {
  const html = V.sinconciliar().split('<h2>Del cálculo preliminar')[0];
  assert.match(html, /Ver cálculo: Flete de la línea/); assert.match(html, /Ver cálculo: Total a facturar mostrado en la línea/);
  assert.match(html, /Presupuesto del grupo · ver importes y cálculos/);
});
prueba('Multas muestran cálculo previo de la fila y suma visible', () => {
  const html = V.multas().split('<h2>Cálculos de multas registradas')[0];
  assert.match(html, /Ver cálculo: Cálculo previo de/); assert.match(html, /Ver cálculo: Total de multas calculado en pantalla/);
});
prueba('Recargos explican su efecto al lado del monto', () => assert.match(primerPanel(V.recargos()), /Ver cálculo: Multa Transporte consolidada/));
prueba('Detalle SAP explica flete y cantidad en su propia fila', () => {
  const sap = E.st.conciliaciones.find(x => x.sap); SILOG.app.vs.conc.concId = sap.id;
  const html = V.sap().split('<h2>¿Cómo llegó este importe a SAP?')[0];
  assert.match(html, /Ver cálculo: Ítem 1/); assert.match(html, /· cantidad/); SILOG.app.vs.conc.concId = c.id;
});
prueba('Resumen por producto conserva montos y explica compensación', () => {
  const d = M.recalcular(E.st, c, 'V1'), p = Object.values(d.productos)[0], xs = A.producto(E.st, c, p, d.grupos);
  assert.equal(xs.length, 4); cerca(xs[0].valor, p.flete); cerca(xs[1].valor, p.mermasBrutas); cerca(xs[2].valor, Math.min(0, p.mermasBrutas));
});
prueba('Explicación OT se refiere al valor guardado aunque el cálculo actual difiera', () => {
  const copia = structuredClone(c); copia.totales.flete = 123;
  const x = A.conceptoOT(E.st, copia, 'Flete Facturable', 123);
  cerca(x.valor, 123); assert.match(x.pasos[0], /monto guardado/); assert.match(x.pasos[0], /no se reemplaza/);
});
prueba('Filas agregadas muestran la suma de C/D, no C/D × precio promedio', () => {
  const f = M.otFilas(E.st, c)[0], xs = A.filaOT(E.st, c, f);
  cerca(xs.find(x => x.clave === 'cdBs').valor, f.lineas.reduce((v, l) => v + l.cdBs, 0));
  assert.ok(xs.find(x => x.clave === 'precioMulta').pasos.some(x => x.includes('No valorar')));
  assert.ok(xs.find(x => x.clave === 'flete').pasos.some(x => x.includes('hasta Procesar')));
});
prueba('Filtración activada con booleano se explica con monto MPF numérico', () => {
  const multa = E.st.multasCatalogo.find(x => x.base === 'filtracion');
  const total = M.calcularMultaCRE(multa, true, 6.96, 25000);
  const x = A.multasCRE(Object.assign({}, E.st, { multasCRE: [{ creId: c.lineas[0].despachoId, multaId: multa.id, entrada: true, valor: multa.valor, moneda: multa.moneda, tc: 6.96, total }] }), c.lineas[0].despachoId)[0];
  assert.ok(!x.pasos.join(' ').includes('((true ×')); cerca(x.valor, 844.42);
});

function botonEn(fila) {
  const celda = fila.cells.at(-1), contenedor = celda.appendChild(new Nodo('span', 'calculo-celda'));
  const boton = contenedor.appendChild(new Nodo('button')); boton.dataset.accion = 'abrirCalculoFila'; boton.setAttribute('aria-expanded', 'false');
  const plantilla = contenedor.appendChild(new Nodo('template'));
  plantilla.content = new Nodo('section'); plantilla.content.appendChild(new Nodo('h3'));
  return boton;
}
const cuerpo = new Nodo('tbody'), fila = cuerpo.appendChild(new Nodo('tr'));
for (const span of [1, 1, 3]) { const td = fila.appendChild(new Nodo('td')); td.colSpan = span; }
const entrada = fila.cells[0].appendChild(new Nodo('input')); entrada.value = 'Edición sin procesar';
const boton = botonEn(fila), otro = botonEn(fila);
const despues = cuerpo.appendChild(new Nodo('tr', 'fila-traza'));
prueba('Abrir inserta inmediatamente debajo de la fila, con colspan real', () => {
  C.abrir(boton); assert.equal(fila.nextElementSibling.className, 'calculo-fila'); assert.equal(fila.nextElementSibling.cells[0].colSpan, 5);
  assert.equal(fila.nextElementSibling.nextElementSibling, despues); assert.equal(boton.getAttribute('aria-expanded'), 'true');
});
prueba('La explicación recibe foco sin desplazar el formulario', () => assert.deepEqual(fila.nextElementSibling.querySelector('h3').focusOptions, { preventScroll: true }));
prueba('Cambiar de cálculo sustituye solo la expansión de esa fila', () => {
  C.abrir(otro); assert.equal(cuerpo.children.filter(x => x.className === 'calculo-fila').length, 1);
  assert.equal(boton.getAttribute('aria-expanded'), 'false'); assert.equal(otro.getAttribute('aria-expanded'), 'true');
});
prueba('Cerrar vuelve al botón y conserva el texto de un campo sin guardar', () => {
  C.cerrar(fila.nextElementSibling); assert.equal(fila.nextElementSibling, despues); assert.equal(entrada.value, 'Edición sin procesar');
  assert.equal(otro.getAttribute('aria-expanded'), 'false'); assert.deepEqual(otro.focusOptions, { preventScroll: true });
});
prueba('Pulsar el mismo botón abre y vuelve a cerrar', () => { C.abrir(boton); C.abrir(boton); assert.equal(fila.nextElementSibling, despues); });
prueba('Escape cierra desde el contenido y devuelve el foco al importe', () => {
  const anterior = document.getElementById; document.getElementById = () => ({ hidden: false, innerHTML: '' });
  try { C.abrir(boton); eventos.find(x => x.tipo === 'keydown').fn({ key: 'Escape', target: fila.nextElementSibling.querySelector('h3'), preventDefault: () => {} }); assert.equal(fila.nextElementSibling, despues); assert.equal(boton.getAttribute('aria-expanded'), 'false'); assert.deepEqual(boton.focusOptions, { preventScroll: true }); }
  finally { document.getElementById = anterior; }
});
prueba('Minitabla elige la fila exterior y usa todas sus columnas', () => {
  const outer = cuerpo.appendChild(new Nodo('tr')); outer.dataset.filaCalculo = '';
  for (let i = 0; i < 8; i++) outer.appendChild(new Nodo('td'));
  const mini = outer.cells[7].appendChild(new Nodo('table')).appendChild(new Nodo('tbody')).appendChild(new Nodo('tr'));
  mini.appendChild(new Nodo('td')); mini.appendChild(new Nodo('td')); const btn = botonEn(mini);
  C.abrir(btn); assert.equal(outer.nextElementSibling.className, 'calculo-fila'); assert.equal(outer.nextElementSibling.cells[0].colSpan, 8); assert.equal(mini.nextElementSibling, null);
  C.cerrar(outer.nextElementSibling);
});
prueba('Evento de click no redibuja la vista, guarda datos ni selecciona la fila', () => {
  const antes = JSON.stringify(E.st), edicion = { tarifaEspecial: '0.55555' }; SILOG.app.vs.ot.edits = { prueba: edicion };
  const render = SILOG.app.render, guardar = E.guardar;
  SILOG.app.render = () => { throw new Error('No debe renderizar para leer'); }; E.guardar = () => { throw new Error('No debe guardar para leer'); };
  try { eventos.find(x => x.tipo === 'click' && !x.captura).fn({ target: boton }); assert.equal(JSON.stringify(E.st), antes); assert.equal(SILOG.app.vs.ot.edits.prueba, edicion); C.cerrar(fila.nextElementSibling); }
  finally { SILOG.app.render = render; E.guardar = guardar; }
});
prueba('Modo ayuda no intercepta la consulta local del cálculo', () => {
  E.ui.ayuda = true;
  try { eventos.find(x => x.tipo === 'click' && x.captura).fn({ target: boton, preventDefault: () => { throw new Error('No interceptar'); } }); }
  finally { E.ui.ayuda = false; }
});
prueba('El nuevo script se carga antes del controlador de la aplicación', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.indexOf('js/calculos_en_filas.js') > html.indexOf('js/estudio_calculos.js')); assert.ok(html.indexOf('js/calculos_en_filas.js') < html.indexOf('js/app.js'));
});
console.log(`\n${total}/${total} verificaciones correctas (renderizado y DOM aislado; sin navegador ni SQL).`);

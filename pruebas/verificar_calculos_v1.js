/* Regresiones numéricas y renderizado estático del material de estudio. No usa SQL ni navegador. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = { addEventListener: () => {} };
global.addEventListener = () => {};
['datos', 'escenarios', 'fuentes', 'motor', 'credito_debito', 'auditoria_calculos', 'tour', 'recorrido_ot', 'ayuda', 'estado', 'vistas', 'estudio_calculos', 'calculos_en_filas', 'estudio_creditodebito', 'app'].forEach(f => require('../js/' + f + '.js'));
const M = SILOG.motor, A = SILOG.auditoria, E = SILOG.estado, V = SILOG.vistas;
let total = 0;
const prueba = (label, fn) => { fn(); total++; console.log('OK ' + label); };
const cerca = (actual, esperado) => assert.ok(Math.abs(actual - esperado) < 0.005, `${actual} != ${esperado}`);
const inicio = id => { E.ui.modo = 'V1'; E.reiniciar(true, id); };
const generar = () => {
  const g = M.recepcionesSinConciliar(E.st, 3, 'V1').grupos.find(x => x.transportistaId === 1);
  assert.equal(E.generar(3, [{ clave: g.clave, marcado: true, moneda: g.contrato.moneda, recepciones: g.recepciones.map(r => r.recepcion.id) }]).ok, true);
  return E.st.conciliaciones.find(c => c.numero === 1001);
};

inicio('F');
let c = generar();
prueba('Generar guarda flete + merma; no finge haber procesado incumplimientos', () => cerca(c.totales.neto, 9639.07));
prueba('SQL CCIST incluye multas CRE, no son solo informativas', () => {
  const k = M.recalcular(E.st, c, 'V1').cab;
  cerca(k.multasCRE, -2236.42); cerca(k.multaTransporte, -2236.42); cerca(k.neto, 7402.65);
});
prueba('Procesar OT persiste los incumplimientos', () => {
  assert.equal(E.otProcesar(c.id, {}).ok, true); cerca(c.totales.neto, 7402.65);
});
prueba('Desglose CRE no se suma de nuevo en Propuesto', () => cerca(M.recalcular(E.st, c, 'PROPUESTO').cab.neto, 7402.65));
prueba('Recargos con cantidad multiplican la base; consolidación suma CRE una vez', () => {
  c.recargos.push({ tipo: 'CCIST', monto: 100, cantidad: 2, concepto: 'Cantidad ejemplo' });
  const k = M.recalcular(E.st, c, 'V1').cab;
  cerca(k.multaContractual, -200); cerca(k.multaTransporte, -2436.42); cerca(k.neto, 7202.65);
});
prueba('Casos respetan el signo firmado guardado: crédito y débito', () => {
  assert.equal(E.agregarCaso(c.id, { casoId: 17, monto: 1500, signo: -1 }).ok, true);
  assert.equal(E.agregarCaso(c.id, { casoId: 17, monto: 100, signo: 1 }).ok, true);
  cerca(M.recalcular(E.st, c, 'V1').cab.casosEspeciales, -1400);
});
prueba('Datos antiguos de casos no se borran ni cambian de sentido', () => {
  c.recargos.push({ tipo: 'CASO', monto: 50, concepto: 'Demo antiguo' });
  cerca(M.recalcular(E.st, c, 'V1').cab.casosEspeciales, -1450);
});
prueba('Total OT lee flete/merma de instantánea, no inventa neto guardado recalculado', () => {
  const t = M.otTotales(E.st, c);
  cerca(t.netoGuardado, 7402.65); cerca(t.netoRecalculado, 7202.65); cerca(t.neto, 5752.65);
});
prueba('Puente explica exactamente diferencia visual − guardado', () => {
  const a = A.conciliacion(E.st, c, 'V1'); cerca(a.diferencia, -1650); cerca(a.comprobacionPuente, -1650);
});
prueba('Cantidad cero no se sustituye por uno', () => {
  const copia = structuredClone(c); copia.recargos = [{ tipo: 'CCIST', monto: 100, cantidad: 0 }];
  cerca(M.recalcular(E.st, copia, 'V1').cab.multaContractual, 0);
});
prueba('Un crédito grande de caso especial no se marca como cobro impago', () => {
  const n = c.recargos.length;
  assert.equal(E.agregarCaso(c.id, { casoId: 17, monto: E.st.umbralFacturas + 1, signo: 1 }).ok, true);
  assert.equal(c.recargos.at(-1).facturaPagada, true); c.recargos.splice(n);
});
prueba('Caso inexistente devuelve validación legible, no excepción', () => assert.equal(E.agregarCaso(c.id, { casoId: -999, monto: 100 }).ok, false));
prueba('Flete cambiado no sobrescribe instantánea al consultar', () => {
  const copia = structuredClone(c), ultima = copia.lineas.find(x => x.ultima);
  copia.ajustes[ultima.key] = { tarifaEspecial: 0.5 };
  const t = M.otTotales(E.st, copia); cerca(t.conceptos[0][1], 9960);
  assert.notEqual(t.netoRecalculado, t.netoGuardado);
});
prueba('Consultar auditoría no modifica estado ni ajustes', () => {
  const antes = JSON.stringify(E.st); A.conciliacion(E.st, c, 'V1'); V.panelCalculos(c); assert.equal(JSON.stringify(E.st), antes);
});
prueba('No existe instantánea: informar Sin dato, no fingir cero ni recálculo', () => {
  const copia = structuredClone(c); delete copia.totales;
  assert.equal(A.conciliacion(E.st, copia, 'V1').visual.netoGuardado, null);
  assert.match(V.panelCalculos(copia), /Sin dato guardado/);
});

prueba('DISTINCT por despacho evita duplicar multas dentro de una conciliación', () => {
  const copia = structuredClone(c), base = copia.lineas[0];
  copia.lineas.push(Object.assign({}, base, { key: 'otra-linea', ultima: false, volRec: 0, cdLts: 0, cdBs: 0, totalFlete: 0 }));
  cerca(M.recalcular(E.st, copia, 'V1').cab.multasCRE, -2236.42);
});
prueba('Recepciones parciales en otra conciliación detectan riesgo de repetir multa', () => {
  const otra = structuredClone(c); otra.id = 98765; E.st.conciliaciones.push(otra);
  assert.ok(A.conciliacion(E.st, c, 'V1').incidencias.includes('D36'));
  E.st.conciliaciones.pop();
});

inicio('C'); c = generar();
const grupo = M.recalcular(E.st, c, 'V1').grupos.find(g => g.lineas.length > 1 && g.lineas.some(l => l.cdBs < 0));
prueba('Liberación mixta: UI suma por línea; SQL OT excluye toda recepción', () => {
  c.ajustes[grupo.lineas[0].key] = { liberarMerma: true };
  const d = M.recalcular(E.st, c, 'V1');
  assert.notEqual(M.otCabecera(E.st, c).mermas, d.cab.mermas);
  assert.ok(A.conciliacion(E.st, c, 'V1').incidencias.includes('D35'));
});
prueba('Procesar OT vuelve explícito el alcance por recepción y persiste cabecera SQL', () => {
  assert.equal(E.otProcesar(c.id, { [grupo.recepcionId]: { liberarMerma: true } }).ok, true);
  cerca(c.totales.mermas, M.otCabecera(E.st, c).mermas);
  assert.ok(!A.conciliacion(E.st, c, 'V1').incidencias.includes('D35'));
});

for (const importe of [0.01, 0.49, 0.5, -0.5, -0.51]) {
  prueba('CInt conserva comportamiento V1 visual con importe ' + importe, () => {
    const copia = structuredClone(c); copia.recargos = [{ tipo: 'CASO', monto: Math.abs(importe), montoAlmacenado: importe }];
    const t = M.otTotales(E.st, copia);
    assert.equal(t.filas.some(f => f[0] === 'Casos Especiales'), Math.abs(importe) > 0.5);
    const a = A.conciliacion(E.st, copia, 'V1'); cerca(a.diferencia, a.comprobacionPuente);
    assert.equal(a.incidencias.includes('D34'), Math.abs(importe) <= 0.5);
  });
}
prueba('Barcaza 100%: capacidad − despacho, no capacidad − recepción', () => {
  const xs = A.barcaza({ capacidad: 100000, despachado: 80000, recibido: 79600, porcentaje: 100, tarifa: 0.2 });
  cerca(xs.find(x => x.clave === 'compL').valor, 20000); cerca(xs.find(x => x.clave === 'fleteTotal').valor, 19920);
});
prueba('Barcaza 90%: aplica máximo y cálculo de compensación', () => {
  const xs = A.barcaza({ capacidad: 100000, despachado: 80000, recibido: 79600, porcentaje: 90, tarifa: 0.2 });
  cerca(xs.find(x => x.clave === 'compL').valor, 10000); cerca(xs.find(x => x.clave === 'fleteTotal').valor, 17920);
});
prueba('Barcaza despacho supera máximo: no compensar', () => cerca(A.barcaza({ capacidad: 100000, despachado: 95000, recibido: 94000, porcentaje: 90, tarifa: 0.2 }).find(x => x.clave === 'compL').valor, 0));
prueba('Barcaza recepción >= capacidad al 100%: no compensar', () => cerca(A.barcaza({ capacidad: 100000, despachado: 95000, recibido: 100000, porcentaje: 100, tarifa: 0.2 }).find(x => x.clave === 'compL').valor, 0));
prueba('Vagón: toneladas redondeadas, tarifa sin segunda división y costo por filas', () => {
  const xs = A.vagon({ kilos: 24567, api: 35, tarifa: 80, filas: 2 });
  cerca(xs.find(x => x.clave === 'toneladas').valor, 24.57); cerca(xs.find(x => x.clave === 'flete').valor, 1965.6);
  cerca(xs.find(x => x.clave === 'formularios').valor, 57); cerca(xs.find(x => x.clave === 'visual').valor, 2022.6);
});
prueba('Ejemplos contractual ordinario V1, MPF y EHR conservan fórmulas distintas', () => {
  const xs = A.recargosEjemplo(); cerca(xs[0].valor, 14.37); cerca(xs[1].valor, 844.42); cerca(xs[2].valor, 390);
});
prueba('Catálogo contiene 37 IDs únicos, cada uno con solución y verificación', () => {
  const xs = V.inconsistenciasCalculo(); assert.equal(xs.length, 37); assert.equal(new Set(xs.map(x => x[0])).size, 37);
  assert.ok(xs.every(x => x[1] && x[2])); assert.match(V.calculos(), /Cómo comprobarlo/);
});
prueba('Panel escapa texto externo al renderizar fórmulas', () => {
  const copia = structuredClone(c); copia.recargos.push({ tipo: 'CASO', monto: 1, concepto: '<script>peligro</script>' });
  const html = V.panelCalculos(copia); assert.ok(!html.includes('<script>peligro</script>')); assert.ok(html.includes('&lt;script&gt;'));
});
prueba('Publicación SIN_SQL no enlaza copias SQL ausentes', () => {
  SILOG.SIN_SQL = true; assert.ok(!V.panelCalculos(c).includes('href="../EXTRACCION_SQL')); SILOG.SIN_SQL = false;
});
prueba('Presupuesto expone dato de origen, monto preliminar y saldo calculado', () => {
  const g = { anio: 2026, contrato: { marco: { numero: 'PRUEBA', controlaPresupuesto: true, programado: { 2026: 1000 }, ejecutado: { 2026: 100 } } }, recepciones: [{ lineas: [{ totalFacturar: 200 }, { totalFacturar: 100 }] }] };
  const xs = A.presupuesto(E.st, g); assert.equal(xs.length, 4);
  cerca(xs[0].valor, 1000); cerca(xs[1].valor, 100); cerca(xs[2].valor, 300); cerca(xs[3].valor, 900);
});

inicio('I');
prueba('OT seleccionado incluye panel; filtros y permiso oculto no muestran datos ajenos', () => {
  const cI = E.st.conciliaciones.find(x => x.numero === 980);
  Object.assign(SILOG.app.vs.ot, { concId: cI.id, area: cI.area, anio: cI.anio, mes: cI.mes, quincena: cI.quincena });
  assert.match(V.ot(), /¿Cómo se llegó a cada importe/);
  SILOG.app.vs.ot.mes = 1; assert.ok(!V.ot().includes('¿Cómo se llegó a cada importe'));
  SILOG.app.vs.ot.mes = cI.mes; E.setRol('Transportista'); assert.ok(!V.ot().includes('¿Cómo se llegó a cada importe')); E.setRol('Analista LOG');
});
prueba('SAP explica flete por líneas y cantidad contable frente a base remunerada', () => {
  const cI = E.st.conciliaciones.find(x => x.sap);
  const xs = A.sap(E.st, cI, cI.sap.detalle[0]); assert.equal(xs.length, 2);
  assert.ok(xs.every(x => Number.isFinite(x.valor) && x.pasos.length >= 3));
});

// Probar la generación HTML de las vistas con el estado real de cada escenario, no un DOM ficticio completo.
for (const escenario of SILOG.ESCENARIOS) {
  inicio(escenario.id);
  for (const modo of ['V1', 'PROPUESTO']) {
    E.ui.modo = modo;
    for (const route of ['calculos', 'sinconciliar', 'conciliaciones', 'ot', 'recargos', 'multas', 'sap', 'mejoras']) {
      prueba(`Render estático ${escenario.id}/${modo}/${route}`, () => assert.equal(typeof V[route](), 'string'));
    }
    for (const conc of E.st.conciliaciones) {
      prueba(`Importes, puente y líneas trazables ${escenario.id}/${modo}/${conc.numero}`, () => {
        const r = A.conciliacion(E.st, conc, modo);
        assert.ok(r.rows.every(x => (x.valor === null || Number.isFinite(x.valor)) && x.pasos.length > 0 && x.fuente));
        cerca(r.diferencia, r.comprobacionPuente);
        for (const g of r.d.grupos) for (const l of g.lineas) assert.equal(A.linea(E.st, l, g).length, 12);
      });
    }
  }
}
prueba('Todos los recursos nuevos están referenciados en index y existen', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const file of ['js/auditoria_calculos.js', 'js/estudio_calculos.js', 'js/calculos_en_filas.js', 'js/credito_debito.js', 'js/estudio_creditodebito.js', 'css/estudio.css', 'css/credito-debito.css']) {
    assert.ok(html.includes(file)); assert.ok(fs.existsSync(path.join(__dirname, '..', file)));
  }
});
console.log(`\n${total}/${total} verificaciones correctas (sin SQL ni navegador).`);

/*
 * Verificación automática de los escenarios del prototipo.
 * Ejecuta, con el mismo motor y las mismas acciones que usa la interfaz, los pasos del guion de cada
 * escenario y compara con los resultados esperados que se muestran al usuario.
 *
 * Uso (desde la carpeta PROTOTIPO_CONCILIACIONES):
 *   node pruebas/verificar_escenarios.js
 */
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
['datos', 'escenarios', 'fuentes', 'motor', 'tour', 'recorrido_ot', 'ayuda', 'estado'].forEach(f => require(`../js/${f}.js`));
SILOG.app = { vs: { ord: {}, conc: {}, portal: {}, ot: {} } };

const M = SILOG.motor, E = SILOG.estado;
let total = 0, fallas = 0;
const resultados = [];

function check(escenario, desc, obtenido, esperado) {
  total++;
  const ok = typeof esperado === 'number' ? Math.abs(Number(obtenido) - esperado) < 0.005
    : esperado instanceof RegExp ? esperado.test(String(obtenido)) : obtenido === esperado;
  if (!ok) fallas++;
  resultados.push({ escenario, ok, desc, obtenido, esperado: String(esperado) });
}
const st = () => E.st;
const modo = m => { E.ui.modo = m; };
const rol = r => E.setRol(r);
const grupos = (area, m) => M.recepcionesSinConciliar(st(), area, m || E.ui.modo).grupos;
const grupo = (tId, area, m) => grupos(area || 3, m).find(g => g.transportistaId === tId);
const generar = (tIds, area) => {
  const sel = [].concat(tIds).map(t => { const g = grupo(t, area); return { clave: g.clave, marcado: true, moneda: g.contrato ? g.contrato.moneda : '', recepciones: g.recepciones.map(r => r.recepcion.id) }; });
  return E.generar(area || 3, sel);
};
const conc = n => st().conciliaciones.find(c => c.numero === n);
const cab = n => M.recalcular(st(), conc(n), E.ui.modo).cab;
const lineaPorRecepcion = (n, vol) => conc(n).lineas.filter(l => M.porId(st().cres, l.recepcionId).volumen === vol).pop();
const recVol = (g, vol) => g.recepciones.find(r => r.recepcion.volumen === vol);
const ultima = r => r.lineas[r.lineas.length - 1];
const despachoPorPlaca = (placa, fecha) => st().cres.find(c => c.tipo === 3 && M.porId(st().cisternas, c.cisternaId).placa === placa && (!fecha || c.fecha === fecha) && !M.recepcionesDe(st(), c.id).length);
const inicio = id => { E.ui.modo = 'V1'; E.setRol('Analista LOG'); E.reiniciar(true, id); };

// ───────────── Escenario general ─────────────
inicio('GENERAL');
check('0', 'Conciliaciones históricas', st().conciliaciones.map(c => c.numero + ' ' + c.estado).join(' | '), '998 Liberado | 1000 Aprobada Por Transportista');
check('0', 'Grupos sin conciliar (Todas)', grupos(3).length, 3);
check('0', 'Recepciones ocultas por V1', M.recepcionesSinConciliar(st(), 3, 'V1').ocultas.length, 2);
generar(1, 3);
check('0', 'N° 1001 neto flete', cab(1001).flete, 35569.65);
check('0', 'N° 1001 mermas', cab(1001).mermas, -225.13);
check('0', 'N° 1001 neto recalculado incluye multas CRE', cab(1001).neto, 34996.52);

// ───────────── A ─────────────
inicio('A');
let o = st().ordenes.find(x => x.estado === 'EN ELABORACION');
check('A', 'Solicitar aprobación de la orden', E.estadoOrden(o.id, 'Solicitar Aprobacion').ok && o.estado, 'PENDIENTE DE APROBACION');
let r = E.estadoOrden(o.id, 'Aprobar Orden Despacho');
check('A', 'Aprobar orden', o.estado + ' ' + /flota@oriente\.example/.test(r.msg), 'APROBADO true');
r = E.crearCREs(o.id, [o.detalles[0].id], '2026-09-28');
check('A', 'Crear CRE', r.msg, /CRE creados: SC-/);
E.estadoOrden(o.id, 'Liberar Orden Despacho');
check('A', 'Liberar orden', o.estado, 'LIBERADO');
r = E.registrarRecepcion([despachoPorPlaca('2233-YZA', '2026-09-28').id], '24950', '2026-09-29');
check('A', 'Registrar recepción', r.msg, /SU-\d+ \(24\.950 L\)/);
let g = grupo(2, 1);
check('A', 'Recepciones del grupo', g.recepciones.length, 4);
check('A', 'Fletes por recepción', g.recepciones.map(x => ultima(x).totalFlete).join(' '), '7844.28 6536.9 4442.88 7475');
generar(2, 1);
check('A', 'N° 1001 neto flete', cab(1001).flete, 26299.06);
check('A', 'N° 1001 mermas', cab(1001).mermas, -47.90);
check('A', 'N° 1001 neto', cab(1001).neto, 26251.16);
E.transicion(conc(1001).id, 'Solicitar Aprob. Transportista');
check('A', 'Estado tras solicitar', conc(1001).estado, 'En Aprobacion de Transportista');
E.transicion(conc(1001).id, 'Transportista Aprueba');
check('A', 'SAP texto', conc(1001).sap.texto, 'CT 1001 9/26');
check('A', 'SAP detalle', conc(1001).sap.detalle.map(d => `${d.flete}/${d.volumen}`).join(' '), '14381.18/54890 11917.88/54860');
E.ui.modo = 'V1';
r = E.sapAccion(conc(1001).id, 'Crear pedido');
check('A', 'Crear pedido', `${conc(1001).sap.estado} ${conc(1001).estado} ${!!conc(1001).sap.pedido}`, 'Pendiente de Liberación Pendiente de Aprobacion true');
E.sapAccion(conc(1001).id, 'Liberar pedido');
E.sapAccion(conc(1001).id, 'Registrar hoja de entrada');
check('A', 'Hoja registrada', `${conc(1001).sap.estado} ${!!conc(1001).sap.hoja}`, 'Pendiente de Liberación de Hoja true');
check('A', 'Acción SAP fuera de orden', E.sapAccion(conc(1001).id, 'Crear pedido').msg, /requiere el estado SAP "Sin Registrar en SAP"/);
E.sapAccion(conc(1001).id, 'Liberar hoja');
check('A', 'Estado final por SAP', `${conc(1001).sap.estado} ${conc(1001).estado}`, 'Aceptado Liberado');
inicio('A'); generar(2, 1);
E.transicion(conc(1001).id, 'Solicitar Aprob. Transportista'); E.transicion(conc(1001).id, 'Transportista Aprueba');
check('A', 'Ruta comentada: aprobación LOG sin factura', E.transicion(conc(1001).id, 'Solicitar Aprobacion LOG').msg, 'Introduzca el Número de Factura por Mermas.');
E.facturas(conc(1001).id, 'facturaMermas', 'F-001');
r = E.transicion(conc(1001).id, 'Solicitar Aprobacion LOG');
check('A', 'Ruta comentada: aviso de acción no ofrecida', `${conc(1001).estado} ${/V1 no ofrece esta acción/.test(r.msg)}`, 'Pendiente de Aprobacion true');
inicio('A'); modo('PROPUESTO');
o = st().ordenes.find(x => x.estado === 'EN ELABORACION');
g = grupo(2, 1); generar(2, 1);
['Solicitar Aprob. Transportista'].forEach(a => E.transicion(conc(1001).id, a));
rol('Transportista'); E.transicion(conc(1001).id, 'Transportista Aprueba');
rol('Analista LOG'); E.facturas(conc(1001).id, 'facturaMermas', 'F-1'); E.transicion(conc(1001).id, 'Solicitar Aprobacion LOG');
rol('Jefe LOG'); E.transicion(conc(1001).id, 'Solicitar Liberacion');
check('A', 'Propuesto: liberar como Jefe LOG', E.transicion(conc(1001).id, 'Liberar Conciliacion').msg, /no tiene permiso.*Gerente de Dist\. y Ventas/);

// ───────────── B ─────────────
inicio('B');
g = grupo(1, 2);
check('B', 'C/D de las 5 recepciones', g.recepciones.map(x => `${ultima(x).cdLts}/${ultima(x).cdBs}`).join(' '), '-30/-143.7 40/191.6 0/0 0/0 -137/-656.23');
check('B', 'Admisible B4 y B5', `${ultima(recVol(g, 29450)).admLote} ${ultima(recVol(g, 24800)).admLote}`, '89 63');
generar(1, 2);
const c = () => conc(1001).id;
check('B', 'N° 1001 neto flete', cab(1001).flete, 28727.60);
check('B', 'N° 1001 mermas', cab(1001).mermas, -656.23);
check('B', 'N° 1001 neto', cab(1001).neto, 28071.37);
E.ajustar(c(), lineaPorRecepcion(1001, 29880).key, 'tarifaEspecial', '0.23');
check('B', 'Tras tarifa especial', cab(1001).neto, 28668.97);
E.ajustar(c(), lineaPorRecepcion(1001, 29450).key, 'liberarCapacidad', '30000');
check('B', 'Tras liberar capacidad', cab(1001).neto, 28773.97);
E.ajustar(c(), lineaPorRecepcion(1001, 24800).key, 'liberarMerma', true);
check('B', 'Tras liberar merma diésel', cab(1001).neto, 29430.20);
E.ajustar(c(), lineaPorRecepcion(1001, 29880).key, 'liberarMerma', true);
check('B', 'Tras liberar merma gasolina (sin cambio)', cab(1001).neto, 29430.20);
E.ajustar(c(), lineaPorRecepcion(1001, 30040).key, 'tarifaEspecial', '0.22');
let d = M.recalcular(st(), conc(1001), 'V1');
let lin = d.grupos.flatMap(x => x.lineas).find(l => l.volRec === 30040);
check('B', 'V1: línea de demasía desactualizada', `${lin.totalFlete} ${lin.totalFacturar} ${lin.desactualizado}`, '6608.8 6500 true');
check('B', 'Neto tras tarifa especial en demasía', cab(1001).neto, 29730.60);
check('B', 'Procesar', E.procesar(c()).msg, 'CONCILIACIÓN PROCESADA CORRECTAMENTE.');
modo('PROPUESTO');
d = M.recalcular(st(), conc(1001), 'PROPUESTO');
lin = d.grupos.flatMap(x => x.lineas).find(l => l.volRec === 30040);
check('B', 'Propuesto: total de la línea de demasía', lin.totalFacturar, 6800.40);
check('B', 'Propuesto: neto', d.cab.neto, 29730.60);

// ───────────── C ─────────────
inicio('C');
g = grupo(1, 2);
let rc = recVol(g, 29900);
check('C', 'Consolidación 29.900', `${rc.lineas.length} ${rc.lineas.map(l => l.admLts).join('+')} ${ultima(rc).balanceLote} ${ultima(rc).cdLts} ${ultima(rc).cdBs} ${ultima(rc).totalFlete}`, '2 45+45 -100 -10 -47.9 6279');
const r18 = recVol(g, 18000), r11 = recVol(g, 11900);
check('C', 'Reparto 18.000 / 11.900', `${r18.lineas[0].volDesp}/${r11.lineas[0].volDesp} ${r18.lineas[0].admLts}/${r11.lineas[0].admLts} ${r18.lineas[0].cdBs}/${r11.lineas[0].cdBs} ${r18.lineas[0].totalFlete}/${r11.lineas[0].totalFlete}`, '18060/11940 54/36 -28.74/-19.16 3780/2499');
check('C', 'V1: redondeo 29.999 → 2 × 14.990', g.recepciones.filter(x => x.recepcion.volumen === 14990).map(x => x.lineas[0].volDesp).join('+'), '15000+15000');
check('C', 'Propuesto: resto mayor', grupo(1, 2, 'PROPUESTO').recepciones.filter(x => x.recepcion.volumen === 14990).map(x => x.lineas[0].volDesp).join('+'), '15000+14999');
rc = recVol(g, 14950);
check('C', 'Cisterna 15.000 con 2 × 7.500', `${rc.lineas.map(l => l.admLts).join('+')} ${ultima(rc).cdLts} ${ultima(rc).cdBs} ${ultima(rc).totalFlete}`, '23+23 -4 -19.16 3139.5');
generar(1, 2);
check('C', 'N° 1001 neto flete', cab(1001).flete, 21993.30);
check('C', 'N° 1001 mermas', cab(1001).mermas, -114.96);
check('C', 'N° 1001 neto', cab(1001).neto, 21878.34);

// ───────────── D ─────────────
inicio('D');
check('D', 'Grupos V1 RCBA', grupos(2).map(x => x.transportistaId).sort().join(','), '1,3');
check('D', 'Fletes Chaco oculto', M.recepcionesSinConciliar(st(), 2, 'V1').ocultas.map(x => x.motivos.join()).join(), 'Transportista sin contrato vigente a la fecha');
check('D', 'Bloqueo presupuesto Altiplano', generar(3, 2).msg, /Ejecutado 295\.000,00 \+ conciliación 6\.351,52 > programado 300\.000,00/);
check('D', 'Sin programación Cóndor', generar(1, 2).msg, /NO EXISTE PROGRAMACIÓN PRESUPUESTARIA, PARA EL CONTRATO MARCO CM-01\/2026/);
modo('PROPUESTO');
check('D', 'Propuesto: Chaco sin moneda', generar(4, 2).msg, 'LA CONCILIACIÓN A GENERAR NO CUENTA CON LA MONEDA.');
modo('V1');
const despQ1 = st().cres.find(x => x.tipo === 3 && x.fecha === '2026-09-03');
check('D', 'Multas bloqueadas por estado', E.registrarMultasCRE(despQ1.id, {}, 6.96).msg, /N° 900 .*"Pendiente de Aprobacion"/);
check('D', 'Facturas impagas', E.transicion(conc(900).id, 'Solicitar Liberacion').msg, /MAYORES A 500: \[Conc\. 900 Septiembre-2026\]/);
E.marcarFacturasPagadas(conc(900).id);
E.transicion(conc(900).id, 'Solicitar Liberacion');
check('D', 'Liberación tras pagar', conc(900).estado, 'Pendiente de Liberacion');
check('D', 'Reversión sin rol', E.transicion(conc(899).id, 'Rechazar Conciliacion').msg, /SU ROL NO PUEDE REVERTIR/);
rol('Gerente de Dist. y Ventas');
check('D', 'Reversión con SAP registrado', E.transicion(conc(899).id, 'Rechazar Conciliacion').msg, /NO SE ENCUENTRA ANULADA EN SAP/);
E.sapAccion(conc(899).id, 'Anular aceptación');
check('D', 'Anular aceptación no revierte la conciliación', `${conc(899).sap.estado} ${conc(899).estado}`, 'Pendiente de Liberación de Hoja Liberado');
E.sapAccion(conc(899).id, 'Anular hoja');
E.sapAccion(conc(899).id, 'Anular pedido');
check('D', 'Anular pedido devuelve a elaboración', `${conc(899).sap.estado} ${conc(899).estado}`, 'Sin Registrar en SAP En Elaboracion');
o = st().ordenes.find(x => x.estado === 'APROBADO');
check('D', 'Liberar orden sin CRE', E.estadoOrden(o.id, 'Liberar Orden Despacho').msg, /NO EXISTE AL MENOS UN CRE/);
check('D', 'Crear CRE con destinos distintos', E.crearCREs(o.id, o.detalles.map(x => x.id), '2026-09-30').msg, 'DEBE SELECCIONAR DESPACHOS AL MISMO DESTINO');
E.crearCREs(o.id, [o.detalles[0].id], '2026-09-30');
check('D', 'Recepción anterior al despacho', E.registrarRecepcion([o.detalles[0].creDespachoId], '29950', '2026-09-29').msg, 'La recepción no puede ser anterior al despacho.');

// ───────────── E ─────────────
inicio('E');
const t150 = st().tarifas.find(t => t.contratoId === 11 && t.origenId === 2 && t.destinoId === 4 && t.productoId === 1 && t.tarifa === 150);
check('E', 'Id de la tarifa 150 (RCBA → ORU)', t150.id, 104);
check('E', 'Simulador TJA sin tarifa', M.tarifaVigente(st(), { transportistaId: 1, origenId: 2, destinoId: 7, productoId: 1, fecha: '2026-10-01' }), null);
g = grupo(1, 2);
const tja = g.recepciones.find(x => x.recepcion.destinoId === 7);
check('E', 'TJA sin tarifa', `${ultima(tja).tarifaFuente} ${ultima(tja).totalFlete} ${ultima(tja).admPorc} ${ultima(tja).cdLts} ${ultima(tja).cdBs}`, 'SIN TARIFA 0 0 -50 -239.5');
const oru = g.recepciones.filter(x => x.recepcion.destinoId === 4);
check('E', 'ORU 19/09 y 21/09', oru.map(x => `${x.recepcion.fecha} ${ultima(x).tarifa} ${ultima(x).totalFlete}`).join(' | '), '2026-09-19 0.15 4492.5 | 2026-09-21 0.16 4792');
check('E', 'Tarifa asociada', `${ultima(recVol(g, 29970)).tarifaFuente} ${ultima(recVol(g, 29970)).tarifa} ${ultima(recVol(g, 29970)).totalFlete}`, 'ASOCIADA ALTERNA 0.225 6743.25');
E.alternarTarifa(101);
g = grupo(1, 2);
check('E', 'Baja de #101', `${ultima(recVol(g, 29880)).tarifaFuente} ${ultima(recVol(g, 29880)).totalFlete} ${ultima(recVol(g, 29970)).totalFlete}`, 'SIN TARIFA 0 6743.25');
E.alternarTarifa(101);
check('E', 'Reactivar #101', ultima(recVol(grupo(1, 2), 29880)).totalFlete, 6274.80);
generar(1, 2);
check('E', 'N° 1001 neto flete', cab(1001).flete, 22302.55);
check('E', 'N° 1001 mermas', cab(1001).mermas, -383.20);
check('E', 'N° 1001 neto', cab(1001).neto, 21919.35);
E.cambiarTarifaLinea(conc(1001).id, lineaPorRecepcion(1001, 29880).key, 'ALTERNA');
check('E', 'Alterna en 29.880', `${lineaPorRecepcion(1001, 29880).totalFlete} ${cab(1001).neto}`, '6723 22367.55');
generar(3, 2);
const l1002 = conc(1002).lineas[0];
check('E', 'Importación Arica', `${l1002.tarifa} ${l1002.admLts} ${l1002.cdLts} ${l1002.precioMulta} ${l1002.cdBs} ${l1002.totalFlete} ${cab(1002).neto}`, '0.41 150 -50 5.2 -260 12218 11958');
E.transicion(conc(1002).id, 'Solicitar Aprob. Transportista');
E.transicion(conc(1002).id, 'Transportista Aprueba');
check('E', 'SAP CTI', `${conc(1002).sap.texto} ${conc(1002).sap.tipo}`, 'CTI 1002 9/26 TERRESTRE INTERNACIONAL');

// ───────────── F ─────────────
inicio('F');
const dF1 = st().cres.find(x => x.tipo === 3 && x.fecha === '2026-09-17'), dF2 = st().cres.find(x => x.tipo === 3 && x.fecha === '2026-09-19');
check('F', 'Multas CRE 17/09', M.totalMultasCRE(st(), dF1.id), 1392);
check('F', 'MPF 19/09', M.totalMultasCRE(st(), dF2.id), 844.42);
generar(1, 2);
check('F', 'N° 1001 flete/mermas/neto/multas CRE', `${cab(1001).flete} ${cab(1001).mermas} ${cab(1001).neto} ${cab(1001).multasCRE}`, '9960 -320.93 7402.65 -2236.42');
E.alternarRecargo(conc(1001).id, 1, dF1.id); E.alternarRecargo(conc(1001).id, 1, dF2.id); E.alternarRecargo(conc(1001).id, 2, null);
E.agregarCaso(conc(1001).id, { tipo: 'CASO', casoId: 17, monto: 1500 }); E.agregarCaso(conc(1001).id, { tipo: 'CG', casoId: 17, monto: 300 });
check('F', 'Recargos con CRE consolidadas', `${cab(1001).multaTransporte} ${cab(1001).multaConciliacion} ${cab(1001).casosEspeciales} ${cab(1001).carroGuia}`, '-2436.42 -500 -1500 -300');
check('F', 'V1 neto con recargos', cab(1001).neto, 7202.65);
modo('PROPUESTO');
check('F', 'Propuesto neto con recargos', cab(1001).neto, 4902.65);
E.registrarMultasCRE(dF1.id, { 2: 2, 4: 1, 5: true }, 6.96);
check('F', 'Multas 17/09 con MAC', M.totalMultasCRE(st(), dF1.id), 4872);
check('F', 'Propuesto neto con MAC', cab(1001).neto, 1422.65);
modo('V1');
E.transicion(conc(1001).id, 'Solicitar Aprob. Transportista');
check('F', 'Multas bloqueadas tras solicitar aprobación', E.registrarMultasCRE(dF1.id, { 2: 2 }, 6.96).msg, /N° 1001 .*"En Aprobacion de Transportista"/);

// ───────────── G ─────────────
inicio('G');
const of = st().ofertas[0];
check('G', 'Ranking', E.rankingOferta(of).map(p => `${p.transportistaId}:${p.tarifa}`).join(' '), '3:219 1:228 2:235');
E.tarifaPostulacion(1, 2, 215);
check('G', 'Oriente a 215 sube al 1°', E.rankingOferta(of)[0].transportistaId, 2);
E.tarifaPostulacion(1, 2, 235);
r = E.nominar(1);
o = M.porId(st().ordenes, r.ordenId);
check('G', 'Nominación', o.detalles.map(x => `${x.transportistaId}:${x.volumen}@${x.tarifaAdjudicada}`).join(' ') + ' | ' + of.postulaciones.find(p => p.transportistaId === 2).estado, '3:30000@219 1:30000@228 1:30000@228 | NO NOMINADA');
E.estadoOrden(o.id, 'Solicitar Aprobacion');
r = E.estadoOrden(o.id, 'Aprobar Orden Despacho');
check('G', 'Correos de nómina', r.msg, /despachos@altiplano\.example, operaciones@condor\.example/);
check('G', 'CRE de empresas distintas', E.crearCREs(o.id, o.detalles.map(x => x.id), o.fecha).msg, 'DEBE SELECCIONAR DESPACHOS DE LA MISMA EMPRESA');
E.crearCREs(o.id, [o.detalles[0].id], o.fecha);
E.crearCREs(o.id, [o.detalles[1].id, o.detalles[2].id], o.fecha);
E.estadoOrden(o.id, 'Liberar Orden Despacho');
check('G', 'Orden liberada con 3 CRE', `${o.estado} ${o.detalles.filter(x => x.creDespachoId).length}`, 'LIBERADO 3');
[['9988-KLM', '29940'], ['2345-ABC', '29900'], ['3456-BCD', '29960']].forEach(([p, v]) => E.registrarRecepcion([despachoPorPlaca(p, '2026-10-05').id], v, '2026-10-06'));
g = grupo(1, 2);
check('G', 'V1 Cóndor', g.recepciones.map(x => `${ultima(x).tarifaFuente} ${ultima(x).totalFlete}`).join(' | '), 'CONTRATO PRINCIPAL 6877 | CONTRATO PRINCIPAL 6890.8');
check('G', 'V1 Altiplano', `${ultima(grupo(3, 2).recepciones[0]).tarifaFuente} ${ultima(grupo(3, 2).recepciones[0]).totalFlete} ${ultima(grupo(3, 2).recepciones[0]).cdLts} ${ultima(grupo(3, 2).recepciones[0]).cdBs}`, 'SIN TARIFA 0 -60 -287.4');
modo('PROPUESTO');
check('G', 'Propuesto Cóndor', grupo(1, 2).recepciones.map(x => `${ultima(x).tarifaFuente} ${ultima(x).totalFlete}`).join(' | '), 'ADJUDICADA 6817.2 | ADJUDICADA 6830.88');
check('G', 'Propuesto Altiplano', `${ultima(grupo(3, 2).recepciones[0]).totalFlete} ${ultima(grupo(3, 2).recepciones[0]).cdLts}`, '6556.86 0');
generar([3, 1], 2);
check('G', 'Generación propuesta', `${conc(1001).transportistaId} ${cab(1001).neto} | ${conc(1002).transportistaId} ${cab(1002).neto}`, '3 6556.86 | 1 13600.18');

// ───────────── H ─────────────
inicio('H');
check('H', 'Despachos y recepciones', `${st().cres.filter(x => x.tipo === 3).length} ${st().cres.filter(x => x.tipo === 8).length}`, '65 65');
check('H', 'Conciliaciones históricas', st().conciliaciones.map(x => `${x.numero} ${x.estado} ${x.lineas.length}`).join(' | '), SILOG.H_ESPERADO.historicas);
check('H', 'Netos históricos', st().conciliaciones.map(x => cab(x.numero).neto.toFixed(2)).join(' '), SILOG.H_ESPERADO.netos);
check('H', 'Grupos pendientes', grupos(3).map(x => `${x.transportistaId}:${x.recepciones.length}`).join(' '), SILOG.H_ESPERADO.pendientes);
r = generar([2, 3, 1], 3);
check('H', 'Generación de 3 conciliaciones', r.msg, /N° 1001, N° 1002, N° 1003/);
check('H', 'Netos generados', [1001, 1002, 1003].map(n => `${conc(n).transportistaId}:${cab(n).neto.toFixed(2)}`).join(' '), SILOG.H_ESPERADO.generados);
E.transicion(conc(952).id, 'Transportista Aprueba');
check('H', 'Aprobación N° 952', `${conc(952).estado} ${!!conc(952).sap}`, 'Aprobada Por Transportista true');

// ───────────── I: Otros Transportes ─────────────
inicio('I');
rol('Transportista');
check('I', 'Transportista sin acceso', E.otAprobar(conc(980).id).msg, /SinAcceso\.aspx/);
rol('Analista LOG');
const ot = () => M.otFilas(st(), conc(980));
check('I', 'Botones del Analista en elaboración', JSON.stringify(M.otBotones(conc(980).estado, E.permisosOT())), '{"aprobar":true,"rechazar":false}');
const tot = M.otTotales(st(), conc(980));
check('I', 'Columna Totales', tot.filas.map(f => f[0] + ' ' + f[1]).join(' | ') + ' | Neto ' + tot.neto, 'Flete Facturable 16253.6 | Multa Merma -656.23 | Neto 15597.37');
check('I', 'Filas por recepción', ot().map(f => `${f.producto} ${f.recepcion}`).join(' | '), 'DO 24800 | GE 29880 | GE 30040');
const fila = vol => ot().find(f => f.recepcion === vol);
check('I', 'Lista de tarifas GE', M.otOpcionesTarifa(st(), conc(980), fila(29880).rec).map(o => o.etiqueta + ':' + o.valor).join(' '), 'P:0.21 A1:0.225 0:0');
check('I', 'Lista de tarifas DO', M.otOpcionesTarifa(st(), conc(980), fila(24800).rec).map(o => o.etiqueta + ':' + o.valor).join(' '), 'P:0.148 0:0');
r = E.otProcesar(conc(980).id, { [fila(29880).recepcionId]: { tarifa: 0.225, etiqueta: 'A1' } });
check('I', 'Procesar con A1', `${r.msg} ${fila(29880).flete} ${cab(980).neto}`, 'CONCILIACIÓN PROCESADA CORRECTAMENTE. 6723 16045.57');
E.otProcesar(conc(980).id, { [fila(24800).recepcionId]: { liberarMerma: true } });
check('I', 'Liberar merma diésel', `${fila(24800).liberarMerma} ${cab(980).mermas} ${cab(980).neto}`, 'true 0 16701.8');
check('I', 'A1 se conserva al reprocesar', fila(29880).flete, 6723);
r = E.otExcluir(conc(980).id, fila(30040).recepcionId);
check('I', 'Excluir demasía', `${r.msg} ${ot().length} ${cab(980).mermas} ${cab(980).neto}`, 'CRE EXCLUIDO CORRECTAMENTE. 2 -143.7 10249.7');
const cands = M.otCandidatas(st(), conc(980), '2026-09-16', '2026-09-30');
check('I', 'Candidatas del nuevo convoy', cands.map(x => x.recepcion.volumen).join(' '), '30040 29950 29900');
r = E.otAgregar(conc(980).id, cands.map(x => x.recepcion.id), '2026-09-16', '2026-09-30');
check('I', 'Nuevo convoy', `${ot().length} ${cab(980).mermas} ${cab(980).neto}`, '5 0 29270.3');
E.otAprobar(conc(980).id);
r = E.otAprobar(conc(980).id);
check('I', 'Aprobar dos veces', `${conc(980).estado} ${!!conc(980).sap} ${/D22/.test(r.msg)}`, 'Aprobada Por Transportista true true');
check('I', 'Analista no puede rechazar', E.otRechazar(conc(980).id).ok, false);
rol('Jefe LOG');
r = E.otRechazar(conc(980).id);
check('I', 'Jefe LOG rechaza sin verificar SAP', `${conc(980).estado} ${/D25/.test(r.msg)}`, 'En Elaboracion true');
rol('Analista LOG');
check('I', 'Analista sin Aprobar en Pendiente de Aprobacion', M.otBotones(conc(981).estado, E.permisosOT()).aprobar, false);
rol('Jefe LOG');
check('I', 'Bloqueo de facturas en OT', E.otAprobar(conc(981).id).msg, /Mayores a 500: \[Multa Transporte y\/o Incumplimiento de Contrato Conc\. 981 Septiembre-2026\]/);
E.marcarFacturasPagadas(conc(981).id);
E.otAprobar(conc(981).id);
check('I', 'Pendiente de Liberacion tras pagar', conc(981).estado, 'Pendiente de Liberacion');

// ───────────── T: recorrido guiado ─────────────
inicio('T');
SILOG.estado.ui.visitadas = ['inicio'];
check('T', 'Escenario de aprendizaje vacío', `${st().ordenes.length} ${st().cres.length} ${st().conciliaciones.length}`, '0 0 0');
// El motor general no monta los módulos conectados. La guía publicada completa se prueba
// cargando index.html en verificar_tour_conectado.js, sin duplicar aquí otro recorrido T.
check('T', 'El escenario no precarga viajes de otro simulador', SILOG.escenarioPorId('T').viajes.length, 0);

// ───────────── O: Otros Transportes de principio a fin ─────────────
inicio('O');
SILOG.app.vs.ot = {};
const O = SILOG.TUTORIAL_OT;
check('O', 'Conciliaciones previas de la quincena', st().conciliaciones.map(c => `${c.numero} ${c.estado}`).join(' | '), '990 Liberado | 996 Aprobada Por Transportista | 997 En Aprobacion de Transportista');
check('O', 'Factura por mermas impaga de la N° 990', `${conc(990).facturasPagadas} ${M.fmtB(conc(990).totales.mermas)}`, 'false -1.963,90');
check('O', 'Despacho tardío sin recepción', `${!!O.despTarde(st())} ${O.recTarde(st())}`, 'true null');
check('O', 'Etapa sin conciliación: generar', SILOG.otEtapaActual(st(), null), 6);
let pasoO = true;
const pasoTexto = {};
SILOG.TOUR_OT.forEach((p, i) => {
  if (!p.hecho) return;
  if (!p.hecho(st(), SILOG.app) && p.auto) { const r = p.auto(); pasoTexto[i + 1] = r && r.msg; }
  if (!p.hecho(st(), SILOG.app)) { pasoO = false; check('O', `Paso ${i + 1} (${p.titulo})`, 'no cumplido', 'cumplido'); }
  const c = O.conc(st());
  if (i + 1 === 4) check('O', 'Generación: N° 1001 con 8 recepciones y 9 líneas', `${c.numero} ${new Set(c.lineas.map(l => l.recepcionId)).size} ${c.lineas.length} ${SILOG.otEtapaActual(st(), c)}`, '1001 8 9 8');
  if (i + 1 === 8) check('O', 'Tarifa A1 en la recepción de 29.910 L', M.otFilas(st(), c).find(f => f.recepcion === 29910).flete, 6729.75);
  if (i + 1 === 9) check('O', 'Merma de diésel liberada', M.recalcular(st(), c, 'V1').cab.mermas, -1652.55);
  if (i + 1 === 10) check('O', 'Capacidad liberada en Potosí', M.otFilas(st(), c).find(f => f.recepcion === 28470).flete, 6893.10);
  if (i + 1 === 11) check('O', 'Recepción excluida: mermas', M.recalcular(st(), c, 'V1').cab.mermas, -359.25);
  if (i + 1 === 13) check('O', 'Nuevo convoy: flete de la recepción tardía', M.otFilas(st(), c).find(f => f.recepcion === 29960).flete, 4494);
  if (i + 1 === 16) check('O', 'Etapa tras registrar la factura: pedido SAP', SILOG.otEtapaActual(st(), c), 14);
  if (i + 1 === 18) check('O', 'Bloqueo por factura impaga de la N° 990', pasoTexto[18], /Mayores a 1\.000: \[Multa Transporte y\/o Incumplimiento de Contrato Conc\. 990 Septiembre-2026\]/);
});
check('O', 'Todos los pasos del recorrido se cumplen con "Hazlo por mí"', pasoO, true);
const cO = O.conc(st());
const kO = M.recalcular(st(), cO, 'V1').cab;
check('O', 'Conciliación final', `${cO.numero} ${cO.estado} ${cO.sap.texto} ${cO.sap.estado} ${cO.sap.pedido} ${cO.sap.hoja} ${cO.facturaMermas}`, '1001 Liberado CT 1001 9/26 Aceptado 4500001001 1000001001 F-1001-M');
check('O', 'Flete final', kO.flete, 43785.37);
check('O', 'Neto V1 final', kO.neto, 43078.12);
check('O', 'Neto propuesto final', M.recalcular(st(), cO, 'PROPUESTO').cab.neto, 43078.12);
check('O', 'Etapa final: pago y cierre', SILOG.otEtapaActual(st(), cO), 17);

// ───────────── informe ─────────────
let actual = '';
resultados.forEach(x => {
  if (x.escenario !== actual) { actual = x.escenario; console.log(`\nEscenario ${actual}`); }
  console.log(`  ${x.ok ? 'OK   ' : 'FALLA'} ${x.desc}${x.ok ? '' : `\n         obtenido: ${x.obtenido}\n         esperado: ${x.esperado}`}`);
});
console.log(`\n${total - fallas}/${total} verificaciones correctas.`);
process.exitCode = fallas ? 1 : 0;

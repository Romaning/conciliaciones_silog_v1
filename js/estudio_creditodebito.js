/* Guía y casos C/D: componentes de lectura, independientes de conciliaciones guardadas. */
window.SILOG = window.SILOG || {};
(function (V) {
  const C = SILOG.creditoDebito, M = SILOG.motor, A = SILOG.auditoria;
  const esc = V.esc, n = M.fmtN, b = M.fmtB;
  const ficha = (titulo, valor, unidad, pasos) => ({ titulo, valor, unidad, pasos, fuente: C.fuente });
  const docs = caso => `<div class="cd-documentos"><div><h3>Despachos originales</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th>CRE</th><th>Producto</th><th class="num">Despacho L</th><th class="num">Adm. %</th><th class="num">Tarifa Bs/m³</th><th class="num">Precio Bs/L</th></tr></thead><tbody>${caso.despachos.map(d => `<tr><td>${esc(d.id)}</td><td>${esc(d.producto)}</td><td class="num">${n(d.litros)}</td><td class="num">${d.admisible}</td><td class="num">${b(d.tarifaM3)}</td><td class="num">${b(d.precio)}</td></tr>`).join('')}</tbody></table></div></div>
    <div><h3>Recepciones y sus asociaciones</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th>CRE</th><th>Producto</th><th class="num">Recibido L</th><th>Despachos asociados</th><th>Ajustes</th></tr></thead><tbody>${caso.recepciones.map(r => `<tr><td>${esc(r.id)}</td><td>${esc(r.producto)}</td><td class="num">${n(r.litros)}</td><td>${esc(r.despachos.join(' + ') || 'Sin asociación')}</td><td>${r.liberar && r.liberar.length ? 'Lib. merma: ' + esc(r.liberar.join(', ')) : r.capacidad ? 'Lib. capacidad: ' + n(r.capacidad) + ' L' : 'Ninguno'}${r.fecha ? '<br>' + M.fmtF(r.fecha) : ''}</td></tr>`).join('') || '<tr><td colspan="5">No hay recepción registrada.</td></tr>'}</tbody></table></div></div></div>`;
  const calculado = r => {
    const { caso, st, d, sql } = r;
    const productos = Object.values(d.productos);
    return `<section class="tarjeta cd-estudio"><h2>2. Balance, tolerancia y ajuste por recepción</h2>
      <p>Se calcula con el motor existente en modo <strong>${esc(SILOG.estado.ui.modo)}</strong>. Abra ⓘ en cada valor. Los C/D positivos/negativos se interpretan por su efecto sobre el transportista, no como asientos contables.</p>
      ${r.advertencias.map(x => `<p class="nota nota-aviso">${esc(x)}</p>`).join('')}
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Recepción</th><th class="num">Despacho asignado L</th><th class="num">Recibido L</th><th class="num">Admisible L</th><th class="num">Balance L</th><th class="num">C/D L</th><th class="num">C/D bruto Bs</th><th>Interpretación</th></tr></thead><tbody>
      ${d.grupos.map(g => {
        const f = M.otFilas(st, r.conc, SILOG.estado.ui.modo).find(x => x.recepcionId === g.recepcionId);
        const datos = Object.fromEntries(A.filaOT(st, r.conc, f).map(x => [x.clave, x]));
        return `<tr><td>${esc(g.recepcion.numero)}</td><td class="num">${V.celdaCalculo(n(f.despacho), datos.despacho)}</td><td class="num">${V.celdaCalculo(n(f.recepcion), datos.recepcion)}</td><td class="num">${V.celdaCalculo(n(f.admLts), datos.admLts)}</td><td class="num">${V.celdaCalculo(n(f.balance), datos.balance)}</td><td class="num">${V.celdaCalculo(n(f.cdLts), datos.cdLts)}</td><td class="num">${V.celdaCalculo(b(f.cdBs), datos.cdBs)}</td><td>${esc(C.interpretar(f.balance, f.cdLts))}${g.lineas.some(l => l.liberarMerma) ? '<br><span class="tag aviso">Hay liberación: revisar aporte al neto</span>' : ''}</td></tr>`;
      }).join('')}</tbody></table></div>
      <p class="nota nota-info"><strong>No atribuir automáticamente la culpa.</strong> El cálculo describe la diferencia; la causa, documentos y una posible liberación deben evaluarse por separado.</p>
      ${d.grupos.map(g => `<details class="cd-desglose" open><summary>${esc(g.recepcion.numero)}: paso a paso y líneas de despacho</summary>
        <ol>${g.lineas.flatMap(l => l.traza).map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Despacho → recepción</th><th class="num">Asignado L</th><th class="num">Adm. L</th><th class="num">Recibido de línea L</th><th class="num">C/D L</th><th class="num">Precio Bs/L</th><th class="num">C/D bruto Bs</th><th class="num">Flete Bs</th><th>Liberar merma</th></tr></thead><tbody>
          ${g.lineas.map(l => { const x = Object.fromEntries(A.linea(st, l, g).map(x => [x.clave, x])); return `<tr><td>${esc(l.creDespacho)} → ${esc(l.creRecepcion)}</td><td class="num">${V.celdaCalculo(n(l.volDesp), x.volDesp)}</td><td class="num">${V.celdaCalculo(n(l.admLts), x.admisible)}</td><td class="num">${V.celdaCalculo(n(l.volRec), x.volRec)}</td><td class="num">${V.celdaCalculo(n(l.cdLts), x.cdLts)}</td><td class="num">${V.celdaCalculo(b(l.precioMulta), x.precio)}</td><td class="num">${V.celdaCalculo(b(l.cdBs), x.cdBs)}</td><td class="num">${V.celdaCalculo(b(l.totalFlete), x.flete)}</td><td>${l.liberarMerma ? 'Sí' : 'No'}</td></tr>`; }).join('')}
        </tbody></table></div><p>En una recepción consolidada, volumen recibido, balance, C/D y flete se registran en la última línea. Las anteriores con cero no significan que sus despachos no existan.</p>
      </details>`).join('')}
      <p><strong>Conservación del despacho:</strong> original ${n(r.original)} L; asignado a recepciones ${n(r.asignado)} L. ${r.original === r.asignado ? 'Coinciden.' : 'No coinciden: estudiar el residuo de redondeo, no inventar litros físicos.'}</p>
    </section>
    <section class="tarjeta cd-estudio"><h2>3. Del C/D a la merma de cabecera</h2><p>Compensar <strong>dentro del mismo producto y de esta conciliación</strong>. El saldo positivo no se paga adicionalmente; un producto no cancela automáticamente otro.</p>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Producto</th><th class="num">C/D no liberado por línea Bs</th><th class="num">Merma aplicada UI Bs</th><th class="num">Merma aplicada SQL OT Bs</th><th>Conclusión</th></tr></thead><tbody>
        ${productos.map(p => {
          const xs = Object.fromEntries(A.producto(st, r.conc, p, d.grupos).map(x => [x.clave, x]));
          const gs = d.grupos.filter(g => g.productoId === p.productoId);
          const cdSql = M.redHU(gs.reduce((v, g) => v + (g.lineas.some(l => l.liberarMerma) ? 0 : g.lineas.reduce((s, l) => s + l.cdBs, 0)), 0));
          const mermaSql = Math.min(0, cdSql);
          return `<tr><td>${esc(M.nombreProd(st, p.productoId))}</td><td class="num">${V.celdaCalculo(b(p.mermasBrutas), xs.mermasBrutas)}</td><td class="num">${V.celdaCalculo(b(p.mermas), xs.mermas)}</td><td class="num">${V.celdaCalculo(b(mermaSql), ficha('Merma del producto en SQL OT', mermaSql, 'Bs', gs.map(g => `${g.recepcion.numero}: ${g.lineas.some(l => l.liberarMerma) ? 'alguna línea liberada → 0' : 'Σ C/D = ' + b(g.lineas.reduce((v, l) => v + l.cdBs, 0))}`).concat(`Sumar recepciones ${b(cdSql)}; mínimo(0, suma) = ${b(mermaSql)}.`)))}</td><td>${caso.despachos.some(d => d.producto === st.productos.find(x => x.id === p.productoId).codigo && d.precio === 0) ? 'Valoración pendiente: precio cero no demuestra ausencia de cargo' : p.mermasBrutas > 0 ? 'Demasía excedente → 0, no premio' : p.mermas < 0 ? 'Cargo pendiente tras compensación' : 'Sin cargo por esta regla'}</td></tr>`;
        }).join('')}</tbody></table></div>
      <table class="tabla"><tbody>
        <tr><td>Flete recalculado</td><td class="num">${V.celdaCalculo(b(d.cab.flete), ficha('Flete del ejemplo', d.cab.flete, 'Bs', d.grupos.map(g => `${g.recepcion.numero}: ${b(g.tot.flete)} Bs.`).concat('La tarifa remunera transporte; el precio de multa valoriza producto. No intercambiarlos.')))}</td></tr>
        <tr><td>Merma de cabecera UI por línea</td><td class="num">${V.celdaCalculo(b(d.cab.mermas), ficha('Merma de cabecera UI', d.cab.mermas, 'Bs', productos.map(p => `${M.nombreProd(st, p.productoId)}: ${b(p.mermas)} Bs.`).concat('Sumar mermas aplicadas por producto; se excluyen solo líneas liberadas.')))}</td></tr>
        <tr><td>Merma de cabecera SQL por recepción</td><td class="num">${V.celdaCalculo(b(sql.mermas), ficha('Merma de cabecera SQL OT', sql.mermas, 'Bs', ['Si alguna línea libera merma, esa recepción aporta 0.', 'Agrupar por producto, aplicar mínimo(0,suma) y sumar productos.', `Resultado: ${b(sql.mermas)} Bs.`]))}</td></tr>
        <tr class="total"><td>Neto según SQL OT, sin otros recargos</td><td class="num">${V.celdaCalculo(b(sql.neto), ficha('Neto calculado del ejemplo, no guardado', sql.neto, 'Bs', [`Flete ${b(sql.flete)} + merma ${b(sql.mermas)} = ${b(sql.neto)} Bs.`, 'No hay multas CRE/CCIST ni otros recargos en este ejemplo. No es una liquidación persistida ni un importe confirmado como pagado.']))}</td></tr>
      </tbody></table>
      <p class="nota nota-info">El C/D bruto total es ${b(r.bruto)} Bs. No sustituye a la merma final: pueden cambiar el resultado las liberaciones, los productos distintos y la limitación de saldos positivos.</p>
    </section>
    <section class="tarjeta cd-estudio"><h2>4. Qué comprobar y cómo resolverlo</h2><p>${esc(caso.aprender)}</p>
      <ul><li>Verificar CRE, producto, asociación, fecha, unidad y precio antes de aceptar el importe.</li><li>No duplicar el despacho completo en cada recepción ni el flete en cada línea consolidada.</li><li>Si hay merma liberada, definir un único alcance de ajuste para UI, SQL y reportes.</li><li>Un cero por falta de precio o recepción no demuestra ausencia de pérdida.</li><li>No mezclar periodos, productos o documentos de otras empresas para compensar.</li></ul>
      <p><a href="#mejoras">Consultar inconsistencias y soluciones</a> · <a href="#calculos">Comparar otros netos, multas y SAP</a></p></section>`;
  };

  V.resumenCreditoDebito = () => `<details class="cd-resumen"><summary><strong>¿Qué significan Balance, C/D L y C/D Bs?</strong> · guía con ${C.casos.length} casos</summary>
    <p>Balance muestra lo que sobra o falta. C/D L aplica el admisible: negativo es faltante no admisible, positivo es demasía compensable y cero es ausencia de ajuste cobrable por esta regla. C/D Bs valoriza con el precio del producto, no con la tarifa de flete.</p>
    <p>El positivo puede compensar faltantes del mismo producto, pero no genera premio. La liberación y el agrupamiento deciden el descuento final. «Crédito/débito» no demuestra una nota o asiento contable.</p><a class="btn chico" href="#creditodebito">Aprender crédito/débito paso a paso</a></details>`;

  V.creditodebito = () => {
    const id = (SILOG.app.vs.cd || {}).casoId || 'faltante-fuera';
    const caso = C.casos.find(x => x.id === id) || C.casos[0], r = C.evaluar(caso, SILOG.estado.ui.modo);
    const grupos = [...new Set(C.casos.map(x => x.grupo))];
    return `<header class="vista-cab"><h1>Crédito/débito paso a paso</h1><p class="sub">Entender faltantes, admisible, demasías y su efecto en la conciliación.</p></header>
      <section class="tarjeta cd-estudio"><h2>Del volumen al descuento</h2><ol class="cd-camino"><li><strong>Balance físico</strong><span>Recibido − despachado</span></li><li><strong>C/D en litros</strong><span>Aplicar tolerancia admisible</span></li><li><strong>C/D en Bs</strong><span>Litros × precio del producto</span></li><li><strong>Merma final</strong><span>Liberaciones + compensación por producto</span></li></ol>
        <div class="tabla-scroll"><table class="tabla"><thead><tr><th>C/D</th><th>Lectura desde el transportista</th><th>Efecto</th></tr></thead><tbody><tr><td>Negativo</td><td>Faltante no admisible: cargo calculado</td><td>Puede descontarse tras validar y compensar</td></tr><tr><td>Positivo</td><td>Demasía compensable</td><td>Compensa faltantes del mismo producto, no premio</td></tr><tr><td>Cero</td><td>Sin ajuste cobrable por esta regla</td><td>Puede haber faltante dentro del admisible</td></tr></tbody></table></div>
        <details class="cd-desglose" open><summary>Qué es, de dónde viene y para qué sirve</summary>${C.conceptos.map(x => `<h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p>`).join('')}</details>
        <p class="nota nota-aviso">Ejemplos ficticios e independientes del escenario activo. Cambiar el caso no crea CRE, no modifica conciliaciones, no guarda importes y no llama a SQL/SAP. Se conservan las unidades y fuentes de cada cálculo.</p>
      </section>
      <section class="tarjeta cd-estudio"><h2>1. Elegir y comprender un caso (${C.casos.length})</h2><label class="cd-selector">Caso de estudio<select data-cambio="cd.casoId">${grupos.map(g => `<optgroup label="${esc(g)}">${C.casos.filter(x => x.grupo === g).map(x => `<option value="${esc(x.id)}" ${x.id === caso.id ? 'selected' : ''}>${esc(x.titulo)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <h3>${esc(caso.titulo)}</h3><p>${esc(caso.historia)}</p><p><strong>Qué aprender:</strong> ${esc(caso.aprender)}</p>${docs(caso)}
      </section>
      ${r.error || r.nota ? `<section class="tarjeta cd-estudio"><h2>${r.nota ? 'No agrupar sin validar el periodo' : 'No concluir un cargo con datos incompletos'}</h2><p class="nota nota-aviso">${esc(r.error || r.nota)}</p><p>${esc(caso.aprender)}</p><p>No se muestran ceros inventados como si fueran un resultado conciliado.</p></section>` : calculado(r)}
      <section class="tarjeta cd-estudio"><h2>Límites que no deben confundirse</h2><ul><li>El flete remunera transporte; C/D valoriza una diferencia de producto. Las multas CRE/CCIST son otros conceptos.</li><li>El SQL de vagón fuerza merma monetaria de cabecera a 0. Estudiar toneladas/formularios en <a href="#calculos">Laboratorio de cálculos</a>; no aplicar automáticamente estas fórmulas por litro.</li><li>Barcaza comparte parte de la lógica, pero V1 no prorratea sus despachos parciales como cisterna (D31). Revisar su compensación de capacidad por separado.</li><li>N×M requiere asociaciones explícitas y validar reglas reales de registro. No deducir vínculos solo porque coinciden los volúmenes.</li></ul><p class="estudio-fuente">Evidencia: ${esc(C.fuente)}. <a href="#fuentes">Ver fuentes</a>.</p></section>`;
  };

  // La explicación queda también junto a los módulos y datos donde aparece C/D.
  for (const nombre of ['ot', 'sinconciliar', 'ejemplos']) {
    const original = V[nombre]; V[nombre] = () => original().replace('</header>', '</header>' + V.resumenCreditoDebito());
  }
  const detalle = V.detalleConciliacion;
  V.detalleConciliacion = (c, lectura) => detalle(c, lectura).replace('<h3>Detalle por recepción y despacho</h3>', V.resumenCreditoDebito() + '<h3>Detalle por recepción y despacho</h3>');

  SILOG.INTRO_VISTAS.creditodebito = { proposito: 'Estudiar qué significa cada signo de C/D y cómo se llega del documento al descuento final.', quien: 'Transportistas, conciliadores y desarrolladores.', cuando: 'Antes de interpretar un importe o investigar una diferencia.', pasos: ['Lee Balance → C/D L → C/D Bs → merma final.', 'Elige un caso: consolidación, reparto, compensación o ajuste.', 'Abre ⓘ en los importes; compara V1 y Propuesto en el residuo de redondeo.'], observar: ['Crédito/débito describe un ajuste: no es una nota contable ni un premio.', 'No se mezclan productos; una liberación parcial puede dar resultados distintos en UI/SQL.'], ux: ['Explicar junto al dato y no ocultar el caso sin información.'] };
  SILOG.FUENTES.creditodebito = { resumen: 'Ejemplos aislados sobre el motor existente; no ejecución de SQL ni documentos reales.', items: [
    ['Código VB', 'DetalleSinConciliar.ascx.vb', 'SILOG_V1/LOGISTICA/UserControls:1540-1629', 'Prorrateo, admisible, balance, C/D y valoración.'],
    ['Código VB', 'ConciliacionCisterna.ascx.vb', 'SILOG_V1/LOGISTICA/UserControls:1119-1140', 'Compensación por producto y saldo positivo limitado a cero.'],
    ['Procedimiento', 'ObtenerTotalesConciliacion', '', 'Liberación por recepción y merma de vagón cero.'],
    ['Prototipo', 'credito_debito.js', 'PROTOTIPO_CONCILIACIONES/js/credito_debito.js', 'Casos ficticios calculados con el motor existente, sin persistir.']
  ] };
})(SILOG.vistas);

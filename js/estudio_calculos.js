/* Presentación educativa reutilizable. No guarda resultados ni modifica las acciones de V1. */
window.SILOG = window.SILOG || {};
(function (V) {
  const M = SILOG.motor, A = SILOG.auditoria, E = SILOG.estado;
  const esc = V.esc, b = M.fmtB;
  const estado = () => E.st;
  const fuentes = {
    D1: 'DetalleSinConciliar / ConciliacionCisterna / ConciliacionOtrosTransportes',
    D2: 'ConciliacionCisterna.ascx.vb:1178-1284; OTDetalle:1024-1069',
    D3: 'MultaDescuentoConciliacion.aspx.vb:545-576', D4: 'ObtenerTotalesConciliacion: búsqueda por productonombre',
    D5: 'DetalleSinConciliar:2172-2178; columna TarifaOTID', D6: 'ConciliacionCisterna:1178-1284',
    D7: 'ConciliacionCisterna:1581-1615; OT:956', D8: 'MultasPorInclumpliento; ObtenerMontosDeConciliacion',
    D9: 'DetalleDeCisternasSinConciliar', D10: 'DetalleSinConciliar:1540-1545',
    D11: 'AdmUtilitariosConciliacion:972-995', D12: 'ConciliacionCisterna:1396-1414',
    D13: 'MC_ObtenerMultaDescuentoAplicado: @MontoMultaAnterior y CCIST',
    D14: 'ConciliacionOtrosTransportes:533-566, Catch', D15: 'OT:646, MAX(ConciliacionCisternaDetalleID)',
    D16: 'ObtenerMontosDeConciliacion: declaración @Moneda', D17: 'ObtenerFletesConciliacion; ajuste liberar capacidad',
    D18: 'MultasPorInclumpliento: TC; ConciliacionCisterna:1174-1176', D19: 'ConciliacionCisterna:1461-1529',
    D20: 'Sincronizaciones_To_SAP:738-813', D21: 'ConciliacionCisterna:151-166',
    D22: 'ConciliacionOtrosTransportes:184-190,956', D23: 'OT:1028,1289', D24: 'OT:1206-1207',
    D25: 'OT:1356-1394', D26: 'ConciliacionOTDetalle:1024-1069',
    D27: 'CARGAR_DATOS_CONCILIACION_OT DETALLE; OT:636,655-657',
    D28: 'CARGAR_DATOS_CONCILIACION_OT DETALLE: SUM(LiberarMerma)/COUNT',
    D29: 'OT:568-591 frente a OT:533-566', D30: 'ConciliacionOTDetalle:1003-1097',
    D31: 'ConciliacionOTDetalle:275', D32: 'CARGAR_DATOS_CONCILIACION_OT DETALLE',
    D33: 'MC_ObtenerMultaDescuentoAplicado: rama @Monto frente a MPF/EHR',
    D34: 'ConciliacionOtrosTransportes:568-591, CInt antes de sumar',
    D35: 'ObtenerTotalesConciliacion frente a ConciliacionCisterna:1027-1059',
    D36: 'MC_ObtenerMultaDescuentoAplicado: DISTINCT por conciliación, no global',
    D37: 'MC_ObtenerMultaDescuentoAplicado: subconsulta escalar GROUP BY TC, Moneda'
  };
  const verificaciones = {
    D1: 'Mismos datos y ajustes producen los mismos totales en todas las pantallas.',
    D2: 'Cambiar formato, idioma o HTML de una celda no cambia lo persistido.',
    D3: 'Comillas y entradas maliciosas no alteran la consulta; parámetros tipados.',
    D4: 'Renombrar un producto no rompe agrupación ni conciliación.',
    D5: 'Cada línea permite reconstruir tarifa, versión, vigencia, unidad y autorización.',
    D6: 'Reprocesar no pierde IDs, adjuntos, auditoría ni relaciones.',
    D7: 'Permisos externos combinados autorizan exactamente cada transición.',
    D8: 'Agregar un tipo o concepto no requiere cambiar un ID literal en el código.',
    D9: 'Un viaje antiguo pendiente permanece visible con motivo y advertencia.',
    D10: 'Σ despacho prorrateado = despacho original, incluso con empates.',
    D11: 'Casos de medio centavo y negativos siguen una política decimal documentada.',
    D12: 'C/D negativo, cero y positivo recalculan siempre TotalFacturar.',
    D13: 'Una multa CRE ya consolidada en Multa Transporte no se descuenta dos veces; identificar además el incidente para evitar duplicarlo como recargo contractual.',
    D14: 'Un error SQL muestra identificador técnico y revierte la transacción completa.',
    D15: 'Inserciones concurrentes recuperan exclusivamente el ID de su propia fila.',
    D16: 'Cisterna, barcaza y vagón resuelven moneda y TC antes de calcular.',
    D17: 'La cantidad y el importe de SAP coinciden con la base remunerada o su diferencia está explícitamente conciliada.',
    D18: 'TC se obtiene por fecha/fuente; probar importes justo debajo, en y encima del umbral.',
    D19: 'Un usuario de otra empresa no puede aprobar la conciliación ajena.',
    D20: 'Anular pedido, hoja o aceptación actualiza también el estado operativo coherente.',
    D21: 'Cada regla declarada tiene una transición alcanzable y una prueba.',
    D22: 'Registrar quién acepta realmente: transportista o delegado autorizado, no un nombre de estado engañoso.',
    D23: 'Las columnas y controles usados por cada validación existen y se prueban.',
    D24: 'La aprobación de vagón consulta el tipo correcto de contrato.',
    D25: 'Con pedido SAP activo el rechazo se bloquea o ejecuta una reversión coordinada.',
    D26: 'La inserción de Nuevo convoy usa datos del modelo, no textos renderizados.',
    D27: 'Tarifas distintas conservan sus importes; promedio solo informativo, nunca reescrito sin autorización.',
    D28: 'Mostrar tres situaciones: ninguna, todas y algunas líneas liberadas.',
    D29: 'Pantalla, base, reporte y documento financiero concuerdan; si hay importes separados, darles nombres distintos.',
    D30: 'Agregar convoy verifica contrato, moneda, presupuesto y duplicados igual que Generar.',
    D31: 'Repartir un despacho de barcaza no multiplica el volumen ni su admisible.',
    D32: 'Dos localidades homónimas conservan su identidad por ID.',
    D33: 'Convertir USD→BOB→USD recupera el importe con tolerancia de redondeo; TC > 0.',
    D34: '0,01; 0,49; 0,50; −0,50 y −0,51 no desaparecen del neto por CInt.',
    D35: 'Liberar una línea de un convoy da el mismo C/D en detalle, cabecera y reporte; decidir si el alcance es línea o recepción.',
    D36: 'Recepciones parciales en periodos diferentes no descuentan otra vez la misma multa ya aplicada; decidir asignación o prorrateo.',
    D37: 'MPF/EHR con dos TC o monedas devuelve una suma, no un error por varias filas.'
  };
  const nuevos = [
    ['D26', 'Nuevo convoy persiste desde celdas renderizadas.', 'Insertar desde un modelo tipado dentro de una transacción.', 'Es el mismo patrón de D2 en otro punto del flujo.'],
    ['D33', 'Conversión monetaria inconsistente entre recargo ordinario y MPF/EHR.', 'Definir unidad del TC y un único conversor por moneda origen/destino.', 'La fórmula puede invertir multiplicación/división. Confirmar la convención del TC.'],
    ['D34', 'CInt hace desaparecer importes pequeños del total visual.', 'No convertir a entero para decidir si sumar; sumar todos los decimales y ocultar solo cero exacto.', 'Un descuento de 0,50 puede no llegar al neto mostrado.'],
    ['D35', 'Liberar merma por línea y por recepción produce resultados distintos.', 'Acordar alcance del ajuste y reutilizar esa misma regla en UI, SQL y SAP.', 'Puede haber un descuento en una pantalla y 0 en otra.'],
    ['D36', 'Una multa de un despacho puede repetirse en conciliaciones de recepciones parciales.', 'Registrar qué multa/importe ya se aplicó; asignación o prorrateo explícito y auditable.', 'Riesgo inferido del SQL: DISTINCT evita duplicar dentro de una conciliación, no entre conciliaciones. Requiere decidir la política.'],
    ['D37', 'MPF/EHR pueden fallar si la subconsulta devuelve varios grupos moneda/TC.', 'Convertir cada grupo y sumar sus resultados antes del retorno escalar.', 'Riesgo estructural del SQL; no se ejecutó contra una base real.']
  ];
  const efectos = {
    D1: 'El mismo viaje puede tener importes distintos según la pantalla.', D2: 'Cambiar formato o HTML puede cambiar los datos guardados.',
    D3: 'Una entrada puede alterar consultas o datos.', D4: 'Renombrar el producto puede romper la contabilización.',
    D5: 'No se puede reconstruir qué precio fue autorizado.', D6: 'Se puede perder identidad, historial y adjuntos.',
    D7: 'Las transiciones y su autorización son difíciles de auditar.', D8: 'El comportamiento depende de IDs accidentales del catálogo.',
    D9: 'Viajes antiguos pendientes pueden quedar fuera de atención.', D10: 'La suma repartida puede perder o agregar litros.',
    D11: 'La cultura del servidor puede cambiar el resultado.', D12: 'Una línea conserva un importe anterior aunque cambie su flete.',
    D13: 'Se puede descontar dos veces un subtotal o un mismo incidente.', D14: 'Una falla puede parecer un cálculo válido o quedar sin diagnóstico.',
    D15: 'La operación puede recuperar el ID insertado por otro usuario.', D16: 'La conversión o consulta de recargos puede usar moneda nula.',
    D17: 'Cantidad e importe del documento financiero no representan la misma base.', D18: 'TC y límites pueden quedar obsoletos sin advertencia.',
    D19: 'Un actor ajeno podría aceptar por una empresa.', D20: 'Liberado puede quedar sin servicio aceptado en SAP.',
    D21: 'Una regla parece existir pero su camino no está disponible.', D22: 'El nombre del estado no demuestra quién aceptó realmente.',
    D23: 'La validación puede fallar antes de comprobar las facturas.', D24: 'La aprobación consulta importes de otro tipo de contrato.',
    D25: 'La operación puede revertirse mientras el documento financiero sigue vigente.', D26: 'Formatos visuales pueden alterar el convoy que se inserta.',
    D27: 'Reprocesar puede sustituir tarifas válidas por un promedio.', D28: 'La casilla oculta ajustes parciales existentes.',
    D29: 'El usuario ve como pagable un total diferente del persistido.', D30: 'Agregar viajes puede exceder límites que Generar habría bloqueado.',
    D31: 'Un despacho repartido puede contarse completo más de una vez.', D32: 'Localidades homónimas pueden confundirse.',
    D33: 'Multiplicar o dividir TC incorrectamente cambia fuertemente el cobro.', D34: 'Importes pequeños desaparecen del total visual.',
    D35: 'El mismo ajuste puede dar merma negativa en UI y cero en SQL.', D36: 'Riesgo inferido: volver a descontar la multa de un despacho en otro periodo.',
    D37: 'Riesgo inferido: cálculo de recargos falla al existir varios grupos TC/moneda.'
  };
  V.inconsistenciasCalculo = () => [...V.DEFECTOS, ...nuevos].sort((x, y) => Number(x[0].slice(1)) - Number(y[0].slice(1)));
  const ficha = x => `<details class="estudio-formula"><summary><span>${esc(x.titulo)}</span><strong>${x.valor == null ? 'Sin dato guardado' : esc(typeof x.valor === 'number' && x.unidad.startsWith('kg/L') ? x.valor.toFixed(6) : b(x.valor))} <small>${esc(x.unidad)}</small></strong></summary><ol>${x.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol><p class="estudio-fuente"><strong>Evidencia:</strong> ${esc(x.fuente)}</p></details>`;
  V.fichaCalculo = ficha;
  const tablaProblemas = activos => `<div class="tabla-scroll"><table class="tabla estudio-problemas"><thead><tr><th>ID / alcance</th><th>Inconsistencia y efecto</th><th>Qué hacer</th><th>Cómo comprobarlo / fuente</th></tr></thead><tbody>${V.inconsistenciasCalculo().map(x => `<tr class="${activos.includes(x[0]) ? 'estudio-detectado' : ''}"><td>${esc(x[0])}<br><span class="tag ${activos.includes(x[0]) ? 'aviso' : ''}">${activos.includes(x[0]) ? 'Detectable en esta conciliación' : 'Hallazgo V1 / depende del escenario'}</span></td><td>${esc(x[1])}<p><strong>Efecto:</strong> ${esc(efectos[x[0]])}</p><small>Estudio: ${esc(x[3])}</small></td><td>${esc(x[2])}</td><td>${esc(verificaciones[x[0]] || '')}<br><small class="estudio-fuente">${esc(fuentes[x[0]] || '')}</small></td></tr>`).join('')}</tbody></table></div>`;
  const fuenteSQL = nombre => SILOG.SIN_SQL ? `<code>${esc(nombre)}</code>` : `<a href="../EXTRACCION_SQL_CONCILIACIONES/${esc(nombre)}.sql" target="_blank" rel="noopener">${esc(nombre)}</a>`;

  V.panelCalculos = (c, origen = 'conciliación') => {
    const s = estado(), r = A.conciliacion(s, c, E.ui.modo);
    return `<section class="tarjeta estudio" aria-label="Explicación de cálculos de la conciliación ${esc(c.numero)}">
      <div class="cab-detalle"><h2>¿Cómo se llegó a cada importe? · N° ${esc(c.numero)}</h2><a href="#calculos" class="btn chico" data-accion="verCalculos" data-id="${c.id}">Laboratorio y catálogo de inconsistencias</a></div>
      <p>Lectura de ${esc(origen)}. Abre cada importe para ver fórmula, sustitución numérica, redondeo y fuente. <strong>Este panel no guarda ni corrige automáticamente datos.</strong></p>
      <div class="nota nota-info"><strong>No son el mismo neto.</strong> La recepción describe un viaje. La cabecera compensa por producto. La columna Totales de OT mezcla flete/merma guardados con recargos actuales. «Procesar» actualiza la cabecera, no convierte todos los conceptos en un único neto.</div>
      ${r.incidencias.length ? `<p class="nota nota-aviso">En este escenario: ${r.incidencias.map(esc).join(', ')}. ${r.incidencias.includes('LIMITACION_MONEDA') ? 'El demo calcula bases en Bs y no convierte todos los conceptos a la moneda declarada. No interpretar estos valores como una liquidación real en otra moneda.' : ''}</p>` : ''}
      <div class="estudio-resumen">${['netoGuardado', 'netoOT', 'netoVisual'].map(key => ficha(r.rows.find(x => x.clave === key))).join('')}</div>
      <details class="estudio-bloque" open><summary>1. De cada recepción al producto y a la cabecera</summary>${r.rows.filter(x => !['netoGuardado', 'netoOT', 'netoVisual'].includes(x.clave)).map(ficha).join('')}</details>
      <details class="estudio-bloque" open><summary>2. Explicar la diferencia entre total visual y neto guardado</summary>
        <p>${r.diferencia == null ? 'No se puede comparar: falta una instantánea guardada.' : `Total visual ${b(r.visual.neto)} − neto guardado ${b(r.visual.netoGuardado)} = <strong>${b(r.diferencia)}</strong>.`}</p>
        ${(r.puente || []).map(ficha).join('')}
        ${r.puente ? `<p class="nota nota-info">Suma de las diferencias anteriores = ${b(r.comprobacionPuente)}. ${Math.abs(r.comprobacionPuente - r.diferencia) < 0.005 ? 'Comprobación: coincide con la diferencia total.' : 'Advertencia: hay una diferencia adicional que requiere revisión.'}</p>` : ''}
        <p><strong>Cómo solucionarlo:</strong> primero acordar qué conceptos forman el neto pagable y cuáles se facturan por separado; después usar un cálculo único versionado en persistencia, UI, reportes y documentos financieros. No sumar el subtotal de multas CRE otra vez.</p>
      </details>
      <details class="estudio-bloque"><summary>3. Cada monto físico y monetario, recepción por recepción</summary>
        ${r.d.grupos.map(g => `<details class="estudio-recepcion"><summary>${esc(g.recepcion.numero)} · ${esc(M.nombreProd(s, g.productoId))} · neto recepción ${b(g.tot.neto)} Bs</summary>
          ${ficha({ titulo: 'Neto de esta recepción', valor: g.tot.neto, unidad: 'Bs', pasos: [`Flete ${b(g.tot.flete)} + C/D no liberado por línea ${b(g.tot.mermas)} + multas CRE asignadas ${b(g.tot.multasIn)} = ${b(g.tot.neto)} Bs.`, `Suma de TotalFacturar mostrado en sus líneas: ${b(M.redHU(g.lineas.reduce((v, l) => v + l.totalFacturar, 0)))} Bs. Puede diferir por D12.`, 'No incluye MC/DC/casos/carro guía ni la compensación final entre recepciones del mismo producto. No es el neto de toda la conciliación.'], fuente: 'ConciliacionCisterna.ascx.vb:1027-1059' })}
          ${g.lineas.map(l => `<details class="estudio-linea"><summary>${esc(l.creDespacho)} · ${esc(l.placa)} · flete ${b(l.totalFlete)} Bs</summary>${A.linea(s, l, g).map(ficha).join('')}</details>`).join('')}
        </details>`).join('')}
      </details>
      <details class="estudio-bloque"><summary>4. Multas CRE: cantidad, valor, TC y aporte al neto</summary>${[...new Set(c.lineas.map(l => l.despachoId))].map(id => `<h3>${esc(M.porId(s.cres, id).numero)}</h3>${A.multasCRE(s, id).map(ficha).join('') || '<p>Sin multas registradas.</p>'}`).join('')}</details>
      <details class="estudio-bloque"><summary>5. Todas las inconsistencias conocidas y su plan de solución (${V.inconsistenciasCalculo().length})</summary><p>«Detectable» no significa que ya esté corregida en V1. El prototipo conserva los defectos para estudiarlos; las propuestas no son decisiones aprobadas ni cambios en SILOG_DESTINO.</p>${tablaProblemas(r.incidencias)}</details>
      <p class="estudio-fuente">Fuentes principales: ${fuenteSQL('UserDefinedFunction__MC_ObtenerMultaDescuentoAplicado')}, ${fuenteSQL('StoredProcedure__ObtenerMontosDeConciliacion')}, ${fuenteSQL('StoredProcedure__ObtenerTotalesConciliacion')}. <a href="#fuentes">Consultar catálogo de fuentes</a>.</p>
    </section>`;
  };

  V.ejemplosCalculoOT = () => `<section class="tarjeta estudio"><h2>Recargos especiales · ejemplos numéricos</h2><p class="nota nota-aviso">Ejemplos didácticos calculados desde las fórmulas del código. No se ejecuta SQL. Montos y TC son ficticios. Sin IVA ni conceptos fiscales adicionales no verificados.</p>
    <details class="estudio-bloque"><summary>Recargos contractuales: ordinario, MPF, EHR y conversión monetaria</summary>${A.recargosEjemplo().map(ficha).join('')}<p>Los grupos se convierten antes de sumar; después la columna Multa Transporte/MC/DC invierte el signo para descontar. La fórmula CRE ID 9 y MPF contractual corresponden a registros distintos: revisar si representan un mismo incidente.</p></details>
  </section>`;

  V.calculos = () => {
    const s = estado(), v = SILOG.app.vs.cal;
    const lista = [...s.conciliaciones].sort((x, y) => y.numero - x.numero);
    const c = M.porId(lista, v.concId) || lista[0];
    return `<header class="vista-cab"><h1>Laboratorio de cálculos de conciliación</h1><p class="sub">De documentos físicos a netos, inconsistencias y soluciones. Cálculos trazables, sin cambiar datos.</p></header>
      <section class="tarjeta estudio"><h2>Cómo estudiar de principio a fin</h2><ol><li>Carga el escenario <strong>O. Otros Transportes de principio a fin</strong> en la cabecera y sigue <a href="#otmapa">el recorrido completo</a>.</li><li>Revisa contrato/tarifa, precio del producto, orden, despacho, recepción y multas. El prototipo usa datos ficticios.</li><li>Genera en <a href="#sinconciliar">Detalle sin conciliar</a>; revisa la instantánea inicial antes de procesar.</li><li>Selecciona y corrige en <a href="#ot">Otros Transportes</a>. Tras Procesar, vuelve a comparar los tres netos.</li><li>Agrega recargos, acepta, revisa facturas y sigue <a href="#sap">SAP</a>. Cantidad y flete SAP no son automáticamente el neto pagable.</li><li>Abre las fórmulas y el catálogo de inconsistencias. Cambia al modo Propuesto para comparar, no para afirmar que V1 está corregido.</li></ol>
      <label>Conciliación a estudiar<select data-cambio="cal.concId">${lista.map(x => `<option value="${x.id}" ${c && c.id === x.id ? 'selected' : ''}>N° ${x.numero} · ${esc((M.porId(s.transportistas, x.transportistaId) || {}).nombre)} · ${esc(x.estado)}</option>`).join('')}</select></label></section>
      ${V.ejemplosCalculoOT()}
      ${c ? V.panelCalculos(c, 'laboratorio') : '<p class="nota nota-info">Genera primero una conciliación para estudiar sus importes concretos. El laboratorio de otros medios funciona sin generar documentos.</p>'}
      ${!c ? `<section class="tarjeta estudio"><h2>Inconsistencias conocidas</h2>${tablaProblemas([])}</section>` : ''}`;
  };

  // Mismo panel en todas las consultas de la conciliación, sin copiar el motor a la UI.
  const detalle = V.detalleConciliacion;
  V.detalleConciliacion = (c, soloLectura) => detalle(c, soloLectura) + V.panelCalculos(c, soloLectura ? 'consulta del transportista' : 'pantalla cisterna');
  const ot = V.ot;
  V.ot = () => {
    const v = SILOG.app.vs.ot, c = M.porId(estado().conciliaciones, v.concId);
    const visible = c && v.tipo === 'Cisterna' && c.mes === Number(v.mes) && c.anio === Number(v.anio) && c.area === Number(v.area) && c.quincena === Number(v.quincena) && (!Number(v.transportistaId) || c.transportistaId === Number(v.transportistaId));
    return ot() + (visible && E.tieneAccesoOT() ? V.panelCalculos(c, 'Otros Transportes') : '') + (v.tipo !== 'Cisterna' ? V.ejemplosCalculoOT() : '');
  };
  const recargos = V.recargos;
  V.recargos = () => {
    const lista = [...estado().conciliaciones].sort((x, y) => y.numero - x.numero);
    const c = M.porId(lista, SILOG.app.vs.conc.concId) || lista.find(x => x.estado === 'En Elaboracion') || lista[0];
    return recargos() + (c ? V.panelCalculos(c, 'recargos') : '') + V.ejemplosCalculoOT();
  };
  const multas = V.multas;
  V.multas = () => {
    const s = estado(), d = M.porId(s.cres, SILOG.app.vs.mul.creId) || s.cres.filter(x => x.tipo === 3).sort((x, y) => y.fecha.localeCompare(x.fecha))[0];
    return multas() + (d ? `<section class="tarjeta estudio"><h2>Cálculos de multas registradas · ${esc(d.numero)}</h2><p>Los campos editados no cambian el registro hasta pulsar Registrar. Estos desgloses muestran el dato ya guardado.</p>${A.multasCRE(s, d.id).map(ficha).join('') || '<p>Sin multas guardadas.</p>'}</section>` : '');
  };
  const sap = V.sap;
  V.sap = () => {
    const lista = estado().conciliaciones.filter(x => x.sap).sort((x, y) => y.numero - x.numero), c = M.porId(lista, SILOG.app.vs.conc.concId) || lista[0];
    return sap() + (c ? `<section class="tarjeta estudio"><h2>¿Cómo llegó este importe a SAP?</h2>${c.sap.detalle.flatMap(x => A.sap(estado(), c, x)).map(ficha).join('')}</section>` + V.panelCalculos(c, 'comparación con documento SAP') : '');
  };
  const sinConciliar = V.sinconciliar;
  V.sinconciliar = () => {
    const gs = M.recepcionesSinConciliar(estado(), Number(SILOG.app.vs.sc.area), E.ui.modo).grupos;
    return sinConciliar() + `<section class="tarjeta estudio"><h2>Del cálculo preliminar a la generación</h2><p>No hay aún un neto persistido por estos viajes. Se agrupan por empresa, área y quincena; la generación V1 guarda flete + merma por producto. Al Procesar OT se incorpora Multa Transporte. <a href="#calculos">Comparar después de generar</a>.</p>${gs.map(g => `<details class="estudio-bloque"><summary>${esc((M.porId(estado().transportistas, g.transportistaId) || {}).nombre)} · ${g.recepciones.length} recepciones</summary>${g.recepciones.map(r => {
      const d = M.recalcular(estado(), { lineas: r.lineas, ajustes: {}, recargos: [] }, E.ui.modo), gr = d.grupos[0];
      return `<details class="estudio-recepcion"><summary>${esc(r.recepcion.numero)}</summary><p>Lectura aislada antes de generar: las multas se integrarán por CRE distinto al procesar la conciliación completa; no sumar estos subtotales aislados si comparten despacho.</p>${gr.lineas.map(l => `<details class="estudio-linea"><summary>${esc(l.creDespacho)} · flete ${b(l.totalFlete)}</summary>${A.linea(estado(), l, gr).map(ficha).join('')}</details>`).join('')}</details>`;
    }).join('')}${A.presupuesto(estado(), g).map(ficha).join('')}</details>`).join('')}</section>`;
  };
  const mejoras = V.mejoras;
  V.mejoras = () => mejoras() + `<section class="tarjeta estudio"><h2>Plan de solución y comprobación de todos los hallazgos</h2><p>Inventario de hallazgos del código y riesgos deducidos. No se presenta como un diagnóstico de la base real ni como correcciones ya aplicadas a V1.</p>${tablaProblemas([])}</section>`;
})(SILOG.vistas);

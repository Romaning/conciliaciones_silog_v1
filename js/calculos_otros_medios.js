/* Laboratorio aislado: una recepción consolidada, un producto y moneda Bs.
 * Reproduce fórmulas V1; no crea conciliaciones ni aprueba políticas para DESTINO. */
window.SILOG = window.SILOG || {};
(function (L) {
  const M = SILOG.motor, A = SILOG.auditoria;
  const campo = (nombre, titulo, unidad, min, max, paso, ayuda) => ({ nombre, titulo, unidad, min, max, paso, ayuda });
  // Límites del ejercicio para trabajar con números finitos y dentro del CInt de VB.
  const volumen = 2147483647, importe = 1e12;
  const recargos = [
    campo('multaTransporte', 'Multa al transporte', 'Bs', 0, importe, 0.01, 'Importe positivo ya calculado y convertido. En el total se resta; aquí no se resuelve el contrato ni el TC.'),
    campo('multaConciliacion', 'Multa a la conciliación', 'Bs', 0, importe, 0.01, 'Otro descuento contractual (MC). No volver a incluir aquí una multa ya incluida en Transporte.'),
    campo('descuentoConciliacion', 'Descuento a la conciliación', 'Bs', 0, importe, 0.01, 'Descuento contractual (DC), distinto del débito por merma. Se introduce positivo y se resta.')
  ];
  L.CAMPOS = {
    barcaza: [
      campo('capacidad', 'Capacidad a compensar', 'L', 0, volumen, 1, 'Valor del control Liberar capacidad; no equivale a una lectura real de volumen. Cero permite estudiar qué conserva el UPDATE de V1.'),
      campo('porcentaje', 'Porcentaje de capacidad', '%', 0, 100, 1, '100% compara recepción con capacidad; un porcentaje menor compara despacho con el máximo calculado. Son ramas diferentes.'),
      campo('despachado', 'Volumen despachado consolidado', 'L', 0, volumen, 0.01, 'Volumen de los despachos de esta recepción. Al procesar, V1 aplica CInt (mitades al entero par). No se reparte aquí entre varias recepciones.'),
      campo('recibido', 'Volumen recibido consolidado', 'L', 0, volumen, 0.01, 'Volumen de la recepción. V1 lo convierte a entero antes de recalcular su flete.'),
      campo('tarifa', 'Tarifa seleccionada', 'Bs/L', 0, 10000, 0.00001, 'Tarifa ya expresada por litro. Si el contrato está en Bs/m³, dividir entre 1.000 antes de introducirla. Cero reproduce ausencia de tarifa, no una autorización de gratuidad.'),
      campo('tarifaEspecial', 'Tarifa especial', 'Bs/L', 0, 10000, 0.00001, 'Si es mayor que cero sustituye a la seleccionada en este procesamiento; cero deja la seleccionada.'),
      campo('cdProducto', 'C/D monetario ya calculado', 'Bs', -importe, importe, 0.01, 'Entrada independiente: cambiar litros no recalcula este importe. Ejemplo: balance -400 L + admisible 240 L = -160 L; × 1,30 Bs/L = -208 Bs. Negativo es débito; positivo es demasía.'),
      campo('compensacionGuardadaL', 'Compensación anterior guardada', 'L', -volumen, volumen, 1, 'Fotografía anterior de CompensacionCapacidadLts. Solo se conserva en este ejercicio cuando la capacidad ingresada es cero.'),
      campo('compensacionGuardadaBs', 'Compensación anterior guardada', 'Bs', -importe, importe, 0.01, 'Fotografía monetaria anterior independiente. Con capacidad cero, V1 no la borra ni la recalcula; incluso puede conservar un importe de otra tarifa.'),
      ...recargos
    ],
    vagon: [
      campo('kilos', 'Peso recibido consolidado', 'kg', 0, volumen, 0.01, 'Dato medido y consolidado del CRE de recepción. No se inventa a partir de litros o del API del ejemplo.'),
      campo('api', 'API corregido', '°API', -100, 150, 0.01, 'Permite estudiar el peso específico de referencia. No determina el flete cuando ya se tienen los kilos consolidados.'),
      campo('tarifa', 'Tarifa contractual', 'Bs/t', 0, 10000, 0.00001, 'Tarifa por tonelada. No se divide otra vez entre 1.000: primero se convierten los kg en toneladas.'),
      campo('filas', 'Filas de detalle guardadas', 'filas', 1, 100000, 1, 'COUNT(*) del detalle, no cantidad de códigos de vagón distintos. V1 multiplica por su valor histórico 28,50; no se afirma que siga siendo una tarifa vigente.'),
      ...recargos
    ]
  };
  const sinRecargos = { multaTransporte: 0, multaConciliacion: 0, descuentoConciliacion: 0 };
  const barcaza = { capacidad: 100000, porcentaje: 100, despachado: 80000, recibido: 79600, tarifa: 0.2, tarifaEspecial: 0, cdProducto: -208, liberarMerma: false, compensacionGuardadaL: 0, compensacionGuardadaBs: 0, ...sinRecargos };
  const vagon = { kilos: 24567, api: 35, tarifa: 80, filas: 2, ...sinRecargos };
  L.CASOS = [
    { id: 'barcaza-100', tipo: 'barcaza', titulo: 'Barcaza · compensar al 100%', datos: barcaza },
    { id: 'barcaza-90', tipo: 'barcaza', titulo: 'Barcaza · compensar al 90%', datos: { ...barcaza, porcentaje: 90 } },
    { id: 'barcaza-sobre', tipo: 'barcaza', titulo: 'Barcaza · despacho sobre capacidad', datos: { ...barcaza, despachado: 105000, recibido: 99000, cdProducto: 0 } },
    { id: 'barcaza-anterior', tipo: 'barcaza', titulo: 'Barcaza · quitar capacidad después de compensar', datos: { ...barcaza, capacidad: 0, compensacionGuardadaL: 20000, compensacionGuardadaBs: 4000 } },
    { id: 'vagon-base', tipo: 'vagon', titulo: 'Vagón · toneladas y formularios', datos: vagon },
    { id: 'vagon-centavos', tipo: 'vagon', titulo: 'Vagón · descuento de 0,50 Bs', datos: { ...vagon, descuentoConciliacion: 0.5 } }
  ];
  L.entradaInicial = tipo => ({ ...(tipo === 'barcaza' ? barcaza : vagon) });
  L.evaluar = (tipo, entrada) => {
    if (!Object.hasOwn(L.CAMPOS, tipo)) return { ok: false, errores: ['Medio no admitido en este laboratorio.'] };
    if (!entrada || typeof entrada !== 'object') return { ok: false, errores: ['Faltan los datos del ejercicio.'] };
    const e = {}, errores = [];
    L.CAMPOS[tipo].forEach(c => {
      const raw = entrada[c.nombre], n = typeof raw === 'number' || typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      if (!Number.isFinite(n) || n < c.min || n > c.max || c.paso === 1 && !Number.isInteger(n)) errores.push(`${c.titulo} (${c.unidad}): ingresa ${c.paso === 1 ? 'un entero' : 'un número'} entre ${c.min} y ${c.max}.`);
      else e[c.nombre] = n;
    });
    if (errores.length) return { ok: false, errores };
    e.liberarMerma = entrada.liberarMerma === true;
    const fichas = tipo === 'barcaza' ? A.barcaza(e) : A.vagon(e);
    const valor = key => fichas.find(f => f.clave === key).valor;
    const flete = valor(tipo === 'barcaza' ? 'fleteTotal' : 'flete');
    const merma = tipo === 'barcaza' && !e.liberarMerma ? Math.min(0, e.cdProducto) : 0;
    const conceptos = [
      { titulo: 'Flete facturable', monto: flete },
      ...(tipo === 'barcaza' ? [{ titulo: 'Multa merma', monto: merma }] : [{ titulo: 'Costo formulario', monto: valor('formularios') }]),
      { titulo: 'Multa Transporte', monto: -e.multaTransporte },
      { titulo: 'Multa Conc.', monto: -e.multaConciliacion },
      { titulo: 'Descuento Conc.', monto: -e.descuentoConciliacion }
    ].map(c => ({ ...c, incluido: M.cintBancario(c.monto) !== 0 }));
    const netoGuardado = M.redHU(flete + merma);
    const netoVisual = M.redHU(conceptos.filter(c => c.incluido).reduce((s, c) => s + c.monto, 0));
    const sumaSinFiltro = M.redHU(conceptos.reduce((s, c) => s + c.monto, 0));
    const avisos = [];
    if (tipo === 'barcaza' && valor('compL') < 0) avisos.push('V1 produce una compensación negativa al 100%: no la transforma automáticamente en cero. Propuesta: validar despacho/capacidad y acordar la excepción antes de pagar.');
    if (tipo === 'barcaza' && e.capacidad === 0 && (e.compensacionGuardadaBs !== 0 || e.compensacionGuardadaL !== 0)) avisos.push('Riesgo deducido del UPDATE: quitar la capacidad no limpia la compensación anterior. SQL vuelve a sumarla. Propuesta: actualizar o revertir todos los campos relacionados en una misma operación; comprobarlo con datos reales antes de corregir V1.');
    if (tipo === 'barcaza' && (e.recibido !== M.cintBancario(e.recibido) || e.despachado !== M.cintBancario(e.despachado))) avisos.push('La conversión CInt de V1 cambia los litros con decimales antes de procesar. Se conserva este comportamiento histórico en el ejercicio.');
    if (tipo === 'barcaza' && e.cdProducto > 0) avisos.push('En este ejemplo de un producto, el C/D positivo no aumenta el neto guardado: PROCESAR_CONCILIACION solo suma saldos de producto negativos.');
    if (conceptos.some(c => !c.incluido && c.monto !== 0)) avisos.push('D34: la pantalla omite un importe no nulo porque CInt lo convierte en cero. La suma sin ese filtro se muestra para comparar, no como una nueva regla aprobada.');
    if (e.tarifa === 0 && !(e.tarifaEspecial > 0)) avisos.push('Tarifa aplicada cero: el flete es cero. El ejemplo no determina si falta contrato ni autoriza un transporte gratuito.');
    if (e.multaTransporte || e.multaConciliacion || e.descuentoConciliacion) avisos.push('Se introdujeron recargos monetarios ya calculados. En el SQL V1, @Moneda solo se asigna en la rama cisterna (D16): este ejercicio no garantiza que barcaza/vagón los conviertan correctamente en una ejecución real.');
    return { ok: true, entrada: e, fichas, conceptos, netoGuardado, netoVisual, sumaSinFiltro, diferencia: M.redHU(netoVisual - netoGuardado), avisos };
  };
})(SILOG.calculosOtrosMedios = {});

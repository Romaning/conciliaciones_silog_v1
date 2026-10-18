/* Material educativo aislado: usa el motor existente con documentos ficticios, sin persistir. */
window.SILOG = window.SILOG || {};
(function (C) {
  const M = SILOG.motor;
  C.fuente = 'DetalleSinConciliar.ascx.vb:1540-1629; ConciliacionCisterna:1119-1140; ObtenerTotalesConciliacion';
  C.clavesAyuda = new Set(['balance', 'cdLts', 'cdBs', 'admisible', 'admLts', 'mermas', 'mermasBrutas', 'mermasOT', 'liberarMerma']);
  C.conceptos = [
    { titulo: '¿Qué significa crédito/débito aquí?', texto: 'C/D es un ajuste firmado por la diferencia entre producto despachado y recibido. No es un préstamo, una tarjeta ni, por sí solo, una nota contable. Primero se aplica la tolerancia de merma y después se valoriza el ajuste.' },
    { titulo: '¿De dónde viene el término?', texto: 'Crédito y débito son términos contables cuyo significado depende de la cuenta y de la perspectiva. V1 usa el nombre conjunto C/D para un ajuste con signo; el código revisado no documenta una equivalencia formal con notas de crédito/débito o asientos Debe/Haber.' },
    { titulo: '¿Cuándo actúa como débito?', texto: 'Desde el efecto sobre el transportista: un C/D negativo es faltante no admisible que puede generar cargo o descuento. No equivale a todo el faltante físico y no demuestra por sí solo quién causó la diferencia.' },
    { titulo: '¿Cuándo actúa como crédito?', texto: 'Un C/D positivo es demasía que puede compensar faltantes del mismo producto dentro de la misma conciliación. No es un premio: un saldo positivo final del producto se limita a cero, sin pago adicional.' },
    { titulo: '¿Por qué balance negativo puede tener C/D cero?', texto: 'Balance muestra todo el faltante; C/D muestra solo el ajuste después del admisible. Si el faltante no supera la tolerancia, balance sigue negativo pero C/D es cero.' },
    { titulo: '¿Qué diferencia hay entre C/D L y C/D Bs?', texto: 'C/D L es cantidad física ajustada. C/D Bs = C/D L × precio de multa del producto, con redondeo. Ese precio es distinto de la tarifa del flete: uno valoriza producto y la otra remunera transportar.' },
    { titulo: '¿Qué se descuenta finalmente?', texto: 'Se excluyen mermas liberadas según el alcance de la regla, se agrupan importes por producto y se toma mínimo(0, suma). La cabecera no se obtiene sumando indiscriminadamente balances o netos de recepciones.' },
    { titulo: '¿Se aplica igual en todos los transportes?', texto: 'Cisterna y barcaza valorizan C/D, con diferencias propias de prorrateo y capacidad. En vagón, el SQL revisado fuerza la merma monetaria de cabecera a cero aunque existan diferencias físicas. No aplicar la tarifa por litro de cisterna a vagón.' }
  ];
  const D = (id, litros, extra) => Object.assign({ id, litros, producto: 'GE', tarifaM3: 210, admisible: 0.30, precio: 4.79 }, extra);
  const R = (id, litros, despachos, extra) => Object.assign({ id, litros, despachos, producto: 'GE' }, extra);
  C.casos = [
    { id: 'sin-diferencia', grupo: 'Un despacho → una recepción', titulo: 'Lo recibido coincide con lo despachado', historia: 'La cisterna carga 30.000 L y destino registra exactamente 30.000 L.', aprender: 'Balance y C/D son cero. El flete existe aunque no haya ajuste de producto.', despachos: [D('D1', 30000)], recepciones: [R('R1', 30000, ['D1'])] },
    { id: 'faltante-dentro', grupo: 'Un despacho → una recepción', titulo: 'Faltante dentro del admisible', historia: 'Faltan 60 L, pero la tolerancia del viaje es 90 L.', aprender: 'No confundir falta física con descuento: balance −60 L, C/D 0 L.', despachos: [D('D1', 30000)], recepciones: [R('R1', 29940, ['D1'])] },
    { id: 'limite-admisible', grupo: 'Un despacho → una recepción', titulo: 'Faltante exactamente igual al admisible', historia: 'Se reciben 29.910 L: faltan exactamente los 90 L admisibles.', aprender: 'La condición es faltante mayor al admisible, no mayor o igual. En el límite no se cobra.', despachos: [D('D1', 30000)], recepciones: [R('R1', 29910, ['D1'])] },
    { id: 'faltante-fuera', grupo: 'Un despacho → una recepción', titulo: 'Faltante mayor al admisible: cargo', historia: 'Faltan 120 L. Se toleran 90 y quedan 30 L cobrables.', aprender: 'C/D −30 L × 4,79 = −143,70 Bs. Flete 6.274,80 −143,70 = 6.131,10 Bs, sin otros recargos.', despachos: [D('D1', 30000)], recepciones: [R('R1', 29880, ['D1'])] },
    { id: 'demasia', grupo: 'Un despacho → una recepción', titulo: 'Demasía: ajuste positivo, no premio', historia: 'Destino registra 30.040 L tras despachar 30.000 L.', aprender: 'C/D +40 L = +191,60 Bs. Sin faltantes del producto para compensar, la cabecera aplica 0; no paga esos Bs adicionales.', despachos: [D('D1', 30000)], recepciones: [R('R1', 30040, ['D1'])] },
    { id: 'sin-tolerancia', grupo: 'Un despacho → una recepción', titulo: 'Admisible cero', historia: 'La tarifa de ejemplo tiene 0% de tolerancia y faltan 100 L.', aprender: 'Todo el faltante queda en C/D: −100 L × 4,79 = −479,00 Bs. El porcentaje es un dato de la tarifa, no siempre 0,30%.', despachos: [D('D1', 30000, { admisible: 0 })], recepciones: [R('R1', 29900, ['D1'])] },
    { id: 'dos-despachos', grupo: 'Relaciones de documentos', titulo: 'Dos despachos → una sola recepción', historia: 'D1 y D2 tienen 15.000 L cada uno; una recepción consolida 29.900 L.', aprender: 'Sumar despachos y sus admisibles: 30.000 L y 90 L. Balance −100, C/D −10 L. No repetir el volumen recibido ni el flete en cada línea.', despachos: [D('D1', 15000), D('D2', 15000)], recepciones: [R('R1', 29900, ['D1', 'D2'])] },
    { id: 'tres-despachos', grupo: 'Relaciones de documentos', titulo: 'Tres despachos → una sola recepción', historia: 'Tres despachos de 10.000 L se consolidan en 29.700 L recibidos.', aprender: 'Admisible 30 +30 +30 =90 L. Balance −300; C/D −210 L =−1.005,90 Bs. La diferencia consolidada aparece en la última línea.', despachos: [D('D1', 10000), D('D2', 10000), D('D3', 10000)], recepciones: [R('R1', 29700, ['D1', 'D2', 'D3'])] },
    { id: 'recepciones-parciales', grupo: 'Relaciones de documentos', titulo: 'Un despacho → dos recepciones parciales', historia: 'Un despacho de 30.000 L termina en recepciones de 18.000 y 11.900 L.', aprender: 'Prorratear el despacho: 18.060 y 11.940 L. Cada recepción compara su parte, no 30.000 L otra vez. C/D −6 y −4 L.', despachos: [D('D1', 30000)], recepciones: [R('R1', 18000, ['D1']), R('R2', 11900, ['D1'])] },
    { id: 'residuo-redondeo', grupo: 'Relaciones de documentos', titulo: 'Prorrateo con un litro de residuo', historia: 'Despacho 29.999 L; dos recepciones iguales de 14.990 L.', aprender: 'CInt(14.999,5) produce 15.000 en ambas partes: 30.000 L asignados frente a 29.999 originales. La propuesta conserva el total mediante resto mayor.', despachos: [D('D1', 29999)], recepciones: [R('R1', 14990, ['D1']), R('R2', 14990, ['D1'])] },
    { id: 'muchos-a-muchos', grupo: 'Relaciones de documentos', titulo: 'Dos despachos → dos recepciones con asociaciones explícitas', historia: 'D1 y D2 tienen 15.000 L; ambos están asociados a R1 de 18.000 L y R2 de 12.000 L.', aprender: 'El motor del prototipo reparte cada despacho según sus recepciones asociadas: 9.000 +6.000 L por despacho. Se requiere matriz explícita; no inferir quién abasteció cada recepción.', despachos: [D('D1', 15000), D('D2', 15000)], recepciones: [R('R1', 18000, ['D1', 'D2']), R('R2', 12000, ['D1', 'D2'])], advertencias: ['Ejemplo calculado de asociaciones del motor del prototipo. No demuestra por sí solo elegibilidad de todos los casos N×M en la base real de V1. Confirmar documentos y reglas de asociación.'] },
    { id: 'compensacion-parcial', grupo: 'Compensación por producto', titulo: 'Demasía compensa parte de un cargo', historia: 'Gasolina: una recepción tiene C/D −30 L y otra +20 L.', aprender: '−143,70 +95,80 =−47,90 Bs. Se reduce el descuento, no se borra todo el faltante.', despachos: [D('D1', 30000), D('D2', 30000)], recepciones: [R('R1', 29880, ['D1']), R('R2', 30020, ['D2'])] },
    { id: 'compensacion-total', grupo: 'Compensación por producto', titulo: 'La demasía supera al cargo', historia: 'El mismo producto tiene C/D −30 L y +40 L en dos recepciones.', aprender: '−143,70 +191,60 =+47,90 Bs. Cabecera mínimo(0,+47,90)=0: no paga el excedente como premio.', despachos: [D('D1', 30000), D('D2', 30000)], recepciones: [R('R1', 29880, ['D1']), R('R2', 30040, ['D2'])] },
    { id: 'productos-distintos', grupo: 'Compensación por producto', titulo: 'No compensar gasolina con diésel', historia: 'Gasolina tiene un cargo; diésel tiene demasía. Son productos distintos.', aprender: 'Cada producto se agrupa por separado. Un saldo global positivo no cancela automáticamente el cargo de gasolina.', despachos: [D('D1', 30000), D('D2', 30000, { producto: 'DO', precio: 4.22 })], recepciones: [R('R1', 29880, ['D1']), R('R2', 30040, ['D2'], { producto: 'DO' })] },
    { id: 'merma-liberada', grupo: 'Ajustes y datos incompletos', titulo: 'Merma liberada: diferencia física permanece', historia: 'Existe C/D −30 L, pero se autoriza liberar merma de toda la recepción.', aprender: 'C/D físico y valoración bruta siguen visibles; aporte al neto es 0. Liberar merma no modifica el volumen del CRE.', despachos: [D('D1', 30000)], recepciones: [R('R1', 29880, ['D1'], { liberar: ['D1'] })] },
    { id: 'liberacion-mixta', grupo: 'Ajustes y datos incompletos', titulo: 'Liberar solo una línea: inconsistencia V1', historia: 'Dos despachos de 15.000 L hacia R1 de 29.900 L; se libera solo D1.', aprender: 'El C/D −10 L está en D2. UI por línea aún descuenta −47,90 Bs; SQL OT excluye toda la recepción porque alguna línea está liberada. La casilla OT no aparece marcada porque no están todas.', despachos: [D('D1', 15000), D('D2', 15000)], recepciones: [R('R1', 29900, ['D1', 'D2'], { liberar: ['D1'] })] },
    { id: 'capacidad-no-cd', grupo: 'Ajustes y datos incompletos', titulo: 'Liberar capacidad cambia flete, no C/D físico', historia: 'Despacho 29.000 L; recepción 28.900 L; capacidad autorizada 30.000 L.', aprender: 'Base remunerada 30.000 −29.000 +28.900 =29.900 L. C/D sigue −13 L: no sustituir litros despachados por capacidad para borrar faltantes.', despachos: [D('D1', 29000)], recepciones: [R('R1', 28900, ['D1'], { capacidad: 30000 })] },
    { id: 'tarifas-precios-distintos', grupo: 'Ajustes y datos incompletos', titulo: 'Varios despachos con tarifas, admisibles y precios distintos', historia: 'Dos despachos de 15.000 L: admisibles 0,30% y 0,50%, tarifas 210 y 225 Bs/m³, precios 4,79 y 5,20 Bs/L.', aprender: 'Admisible acumulado 45 +75 =120 L. Con recepción 29.820, C/D −60 L se valoriza en la última línea con 5,20: −312 Bs. No usar el precio promedio de OT para revalorizar. Revisar la regla de elección de precio/tarifa con negocio.', despachos: [D('D1', 15000), D('D2', 15000, { tarifaM3: 225, admisible: 0.50, precio: 5.20 })], recepciones: [R('R1', 29820, ['D1', 'D2'])] },
    { id: 'precio-ausente', grupo: 'Ajustes y datos incompletos', titulo: 'Faltante cobrable pero precio cero', historia: 'El ejemplo tiene C/D −30 L, pero no hay un precio utilizable para valorizarlo.', aprender: '−30 ×0 =0 Bs no demuestra que no haya faltante o que se haya condonado. Resolver el precio antes de aceptar una liquidación.', despachos: [D('D1', 30000, { precio: 0 })], recepciones: [R('R1', 29880, ['D1'])] },
    { id: 'recepcion-sin-asociacion', grupo: 'Ajustes y datos incompletos', titulo: 'Recepción sin despacho asociado', historia: 'Existe una recepción de 29.880 L, pero no se conoce su despacho.', aprender: 'No inventar balance, admisible ni cargo. Identificar y asociar el CRE de despacho correcto.', despachos: [D('D1', 30000)], recepciones: [R('R1', 29880, [])] },
    { id: 'despacho-sin-recepcion', grupo: 'Ajustes y datos incompletos', titulo: 'Despacho aún sin recepción', historia: 'La cisterna fue despachada, pero destino todavía no tiene CRE de recepción.', aprender: 'Sin recepción no se concluye faltante ni cargo. El documento sigue pendiente; no usar recibido cero como prueba de pérdida total.', despachos: [D('D1', 30000)], recepciones: [] },
    { id: 'periodos-distintos', grupo: 'Ajustes y datos incompletos', titulo: 'Recepciones parciales en periodos distintos', historia: 'Un despacho tiene recepciones en dos quincenas o meses.', aprender: 'Verificar agrupación por periodo y cómo se asignan las multas al despacho; DISTINCT dentro de una conciliación no evita repetir una multa en otra (D36).', despachos: [D('D1', 30000)], recepciones: [R('R1', 18000, ['D1'], { fecha: '2026-09-30' }), R('R2', 11900, ['D1'], { fecha: '2026-10-01' })], nota: 'No se calcula una única cabecera conjunta para estos periodos. Primero definir agrupación y política de aplicación de ajustes/multas.' }
  ];
  C.interpretar = (balance, cd) => cd < 0 ? 'Faltante no admisible: cargo calculado' : cd > 0 ? 'Demasía compensable: no pago automático' : balance < 0 ? 'Faltante dentro del admisible: sin cargo' : 'Sin diferencia física: sin ajuste';
  C.reglaEnPalabras = valor => valor < 0 ? 'Negativo: cantidad no admisible que puede originar descuento; revisar liberación y compensación por producto.' : valor > 0 ? 'Positivo: demasía que puede compensar faltantes del mismo producto; el saldo positivo final no se paga.' : 'Cero: no hay ajuste cobrable por esta regla. Puede seguir existiendo un balance físico negativo dentro del admisible.';
  C.validar = caso => {
    if (!caso || !Array.isArray(caso.despachos) || !Array.isArray(caso.recepciones)) return 'Faltan documentos del ejemplo.';
    if (!caso.recepciones.length) return 'No hay recepción: no calcular una pérdida suponiendo recibido cero.';
    if (caso.recepciones.some(r => !Array.isArray(r.despachos))) return 'Falta la matriz de asociaciones despacho–recepción.';
    if ([...caso.despachos, ...caso.recepciones].some(x => typeof x.producto !== 'string' || !x.producto.trim())) return 'Falta identificar el producto de algún documento.';
    if (new Set(caso.despachos.map(d => d.id)).size !== caso.despachos.length || new Set(caso.recepciones.map(r => r.id)).size !== caso.recepciones.length) return 'Hay identificadores de documentos repetidos: no duplicar sus litros.';
    for (const d of caso.despachos) {
      if (!Number.isInteger(d.litros) || d.litros <= 0 || !Number.isFinite(d.tarifaM3) || d.tarifaM3 < 0 || !Number.isFinite(d.admisible) || d.admisible < 0 || !Number.isFinite(d.precio) || d.precio < 0) return 'Los ejemplos requieren litros enteros positivos y tarifa, admisible y precio no negativos. No es una validación nueva de V1.';
    }
    for (const r of caso.recepciones) {
      if (!Number.isInteger(r.litros) || r.litros <= 0) return `Recepción ${r.id}: el ejemplo no tiene un volumen positivo utilizable.`;
      if (!r.despachos.length) return `Recepción ${r.id}: no tiene despacho asociado. No inventar el balance.`;
      if (new Set(r.despachos).size !== r.despachos.length) return `Recepción ${r.id}: asociación duplicada. No repetir litros.`;
      for (const id of r.despachos) {
        const d = caso.despachos.find(d => d.id === id);
        if (!d) return `Recepción ${r.id}: referencia a despacho ${id} inexistente.`;
        if (d.producto !== r.producto) return `Recepción ${r.id}: no comparar productos distintos como si fueran el mismo.`;
      }
    }
    for (const d of caso.despachos) if (!caso.recepciones.some(r => r.despachos.includes(d.id))) return `El despacho ${d.id} no tiene recepción asociada.`;
    return null;
  };

  // Los IDs numéricos de este estado son privados del ejemplo; no son IDs de sistemas reales.
  C.evaluar = (caso, modo = 'V1') => {
    const error = C.validar(caso);
    if (error || caso.nota) return { caso, error, nota: caso ? caso.nota || null : null };
    const productos = [...new Set(caso.despachos.map(d => d.producto))].map((codigo, i) => ({ id: i + 1, codigo, nombre: codigo === 'GE' ? 'Gasolina especial (ejemplo)' : codigo === 'DO' ? 'Diésel (ejemplo)' : codigo }));
    const st = { productos, localidades: [{ id: 1, codigo: 'ORIGEN', nombre: 'Origen ficticio', nacional: 0, area: 2 }, { id: 2, codigo: 'DESTINO', nombre: 'Destino ficticio', nacional: 0, area: 2 }], cisternas: [{ id: 1, transportistaId: 1, placa: 'DEMO' }], contratos: [{ id: 1, transportistaId: 1, estado: 'LIBERADO', vigInicio: '2026-01-01', vigFin: '2026-12-31' }], tarifas: [], precios: [], preciosImportados: [], ordenes: [{ id: 1, detalles: [] }], cres: [], asociaciones: [], multasCRE: [] };
    const despIds = {};
    caso.despachos.forEach((d, i) => {
      const id = i + 1, productoId = productos.find(p => p.codigo === d.producto).id;
      const fecha = d.fecha || `2026-09-${String(17 + i).padStart(2, '0')}`;
      despIds[d.id] = id;
      st.tarifas.push({ id, contratoId: 1, origenId: 1, destinoId: 2, productoId, prioridad: 'PRINCIPAL', tarifa: d.tarifaM3, admisible: d.admisible, estado: true, aprobada: true, vigInicio: '2026-01-01' });
      st.ordenes[0].detalles.push({ id, tarifaAsociadaId: id });
      st.precios.push({ productoId, vigInicio: fecha, ppt: d.precio, precioMulta: d.precio });
      st.cres.push({ id, numero: d.id, tipo: 3, fecha, fechaDespacho: fecha, productoId, cisternaId: 1, origenId: 1, destinoId: 2, volumen: d.litros, ordenDetalleId: id, loteCodigo: 'DEMO-' + d.producto, planViaje: 'DEMO-' + d.id });
    });
    caso.recepciones.forEach((r, i) => {
      const id = 100 + i;
      st.cres.push({ id, numero: r.id, tipo: 8, fecha: r.fecha || '2026-09-25', productoId: productos.find(p => p.codigo === r.producto).id, cisternaId: 1, origenId: 1, destinoId: 2, volumen: r.litros });
      r.despachos.forEach(d => st.asociaciones.push({ despachoId: despIds[d], recepcionId: id }));
    });
    const lineas = st.cres.filter(c => c.tipo === 8).flatMap(r => M.calcularRecepcion(st, r, modo).lineas);
    const conc = { id: 1, numero: 'DEMO', moneda: 'Bs', lineas, ajustes: {}, recargos: [] };
    caso.recepciones.forEach(r => lineas.filter(l => l.creRecepcion === r.id).forEach(l => {
      const a = {};
      if ((r.liberar || []).includes(l.creDespacho)) a.liberarMerma = true;
      if (r.capacidad && l.ultima) a.liberarCapacidad = r.capacidad;
      conc.ajustes[l.key] = a;
    }));
    const d = M.recalcular(st, conc, modo), sql = M.otCabecera(st, conc);
    const original = caso.despachos.reduce((v, x) => v + x.litros, 0), asignado = lineas.reduce((v, l) => v + l.volDesp, 0);
    const advertencias = [...(caso.advertencias || [])];
    if (asignado !== original) advertencias.push(`D10: suma asignada ${M.fmtN(asignado)} L ≠ despacho original ${M.fmtN(original)} L. No confundir el residuo de redondeo con una pérdida física real.`);
    if (d.cab.mermas !== sql.mermas) advertencias.push(`D28/D35: pantalla por línea aplica ${M.fmtB(d.cab.mermas)} Bs y SQL OT por recepción ${M.fmtB(sql.mermas)} Bs. Definir un único alcance de liberar merma.`);
    if (caso.despachos.some(d => d.precio === 0)) advertencias.push('Precio cero: un C/D Bs cero no garantiza ausencia de faltante. Resolver vigencia/moneda/precio antes de aceptar una liquidación.');
    if (caso.id === 'tarifas-precios-distintos') advertencias.push('D27: en este algoritmo el C/D consolidado y el flete se calculan en la última línea. El promedio visible de tarifa/precio no es necesariamente el dato que valorizó el importe; confirmar regla contractual.');
    return { caso, st, conc, d, sql, original, asignado, advertencias,
      bruto: M.redHU(d.grupos.reduce((v, g) => v + g.lineas.reduce((s, l) => s + l.cdBs, 0), 0)) };
  };
})(SILOG.creditoDebito = {});

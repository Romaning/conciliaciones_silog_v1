/*
 * Escenarios de prueba del prototipo. Cada escenario parte de los mismos catálogos ficticios
 * (datos.js) y define:
 *   viajes      operaciones ya ocurridas: orden, CRE de despacho y recepciones (opcional multas por CRE)
 *   ordenes     órdenes de despacho todavía sin CRE, para recorrer sus estados
 *   historicos  conciliaciones ya generadas y su estado
 *   preparar    ajustes a los catálogos (tarifas, presupuesto, umbral)
 *   guion       pasos a seguir con el resultado esperado
 * Los resultados esperados se verifican con pruebas/verificar_escenarios.js.
 */
window.SILOG = window.SILOG || {};

(function () {
  // Generador determinista para el escenario de volumen (siempre produce los mismos datos).
  function aleatorio(semilla) {
    let s = semilla;
    return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  }
  function viajesVolumen() {
    const r = aleatorio(20260930);
    const rutas = {
      1: { terminal: 2, cisternas: [1, 2], destinos: [[3, 1], [3, 2], [4, 1], [4, 2], [6, 1]] },
      2: { terminal: 1, cisternas: [4, 5], destinos: [[5, 1], [5, 2], [8, 2], [7, 3]] },
      3: { terminal: 2, cisternas: [6], destinos: [[3, 1]] }
    };
    const cap = { 1: 30000, 2: 30000, 4: 30000, 5: 25000, 6: 30000 };
    const viajes = [];
    for (let dia = 1; dia <= 28; dia++) {
      [1, 2, 3].forEach(t => {
        if (t === 3 && dia % 3 !== 0) return;
        const ru = rutas[t];
        const cisterna = ru.cisternas[dia % ru.cisternas.length];
        const [destino, producto] = ru.destinos[Math.floor(r() * ru.destinos.length)];
        const vol = cap[cisterna];
        const recibido = vol - Math.round(r() * 180 - 20);
        const fecha = `2026-09-${String(dia).padStart(2, '0')}`;
        const diaRec = dia + (destino === 7 ? 2 : 1);
        const fRec = `2026-09-${String(diaRec).padStart(2, '0')}`;
        // La quincena la define la fecha de recepción: las de la 1ra quincena ya están conciliadas.
        viajes.push({ orden: `T${t}-${dia}`, terminal: ru.terminal, fecha, destino, producto, cisterna, vol, rec: [{ fecha: fRec, vol: recibido }], historico: diaRec <= 15 ? `H-Q1-T${t}` : null });
      });
    }
    return viajes;
  }

  SILOG.ESCENARIOS = [
    {
      id: 'GENERAL', letra: '0', nombre: 'Escenario general (todos los casos)',
      objetivo: 'Un panorama con un ejemplo de cada caso: el mismo escenario usado al crear el prototipo. Útil para una primera exploración libre.',
      viajes: SILOG.viajesIniciales,
      historicos: [
        { marca: 'Q2AGO', numero: 998, estado: 'Liberado', sap: 'Aceptado' },
        { marca: 'Q1SEP', numero: 1000, estado: 'Aprobada Por Transportista', recargos: [1] }
      ],
      guion: [
        { vista: 'inicio', paso: 'Revise el mapa del proceso y los contadores.', esperado: '2 conciliaciones (N° 998 Liberado, N° 1000 Aprobada Por Transportista) y un despacho en tránsito.' },
        { vista: 'sinconciliar', paso: 'Área "Todas": revise los grupos.', esperado: 'Tres grupos (Cisternas del Oriente, Logística Altiplano, Transportes Cóndor Andino) y dos recepciones ocultas por V1 (más de 90 días y sin contrato).' },
        { vista: 'sinconciliar', paso: 'Marque Transportes Cóndor Andino y pulse Generar.', esperado: 'Conciliación N° 1001 con neto flete 35.569,65, mermas −225,13 y neto 35.344,52.' },
        { vista: 'ejemplos', paso: 'Recorra los ejemplos de cálculo.', esperado: 'Coinciden con la sección 5 del documento de reglas.' }
      ]
    },
    {
      id: 'A', letra: 'A', nombre: 'A. Quincena normal: de la orden a la liberación',
      objetivo: 'Recorrer el flujo completo sin incidencias: orden de despacho, CRE, recepción, generación, aprobación del transportista, SAP, aprobación LOG y liberación. Transportista: Cisternas del Oriente (área RSCZ).',
      viajes: [
        { orden: 'A1', terminal: 1, fecha: '2026-09-16', destino: 5, producto: 1, cisterna: 4, vol: 30000, rec: [{ fecha: '2026-09-17', vol: 29940 }] },
        { orden: 'A1', terminal: 1, fecha: '2026-09-18', destino: 8, producto: 2, cisterna: 5, vol: 25000, rec: [{ fecha: '2026-09-19', vol: 24960 }] },
        { orden: 'A2', terminal: 1, fecha: '2026-09-24', destino: 5, producto: 2, cisterna: 4, vol: 30000, rec: [{ fecha: '2026-09-25', vol: 29900 }] }
      ],
      ordenes: [{ terminal: 1, fecha: '2026-09-28', estado: 'EN ELABORACION', detalles: [{ destino: 5, producto: 1, cisterna: 5, vol: 25000 }] }],
      guion: [
        { vista: 'ordenes', paso: 'Abra la orden de RSCZ del 28/09/2026 (EN ELABORACION). Elija "Solicitar Aprobacion" y pulse Cambiar estado.', esperado: 'Estado PENDIENTE DE APROBACION.' },
        { vista: 'ordenes', paso: 'Elija "Aprobar Orden Despacho" y pulse Cambiar estado.', esperado: 'Estado APROBADO, número de orden asignado y mensaje de correo a flota@oriente.example.' },
        { vista: 'ordenes', paso: 'Marque el detalle (2233-YZA, SCR, 25.000 L), deje la fecha 28/09/2026 y pulse "Crear CRE de los seleccionados".', esperado: 'Se crea un CRE de despacho SC-…' },
        { vista: 'ordenes', paso: 'Elija "Liberar Orden Despacho" y pulse Cambiar estado.', esperado: 'Estado LIBERADO.' },
        { vista: 'cre', paso: 'Marque el despacho en tránsito de 2233-YZA. Fecha de recepción 29/09/2026, volumen 24950. Pulse Registrar recepción.', esperado: 'Recepción SU-… de 24.950 L asociada al despacho.' },
        { vista: 'sinconciliar', paso: 'Área RSCZ. Revise el grupo de Cisternas del Oriente, 2da quincena de septiembre.', esperado: '4 recepciones ordenadas por producto. Gasolina: fletes 7.844,28 y 6.536,90. Diésel: 4.442,88 y 7.475,00. Solo la recepción de diésel de 29.900 L tiene C/D: −10 L = −47,90.' },
        { vista: 'sinconciliar', paso: 'Marque el grupo y pulse Generar.', esperado: 'Conciliación N° 1001: neto flete 26.299,06, mermas −47,90, neto conciliado 26.251,16.' },
        { vista: 'conciliaciones', paso: 'En la N° 1001 elija "Solicitar Aprob. Transportista" y pulse Cambiar estado.', esperado: 'Estado En Aprobacion de Transportista.' },
        { vista: 'portal', paso: 'Empresa Cisternas del Oriente: pulse Aprobar.', esperado: 'Aprobada Por Transportista; SAP "CT 1001 9/26" con 2 líneas.' },
        { vista: 'sap', paso: 'Revise el detalle SAP de la N° 1001.', esperado: 'Gasolina Especial 14.381,18 (54.890 L); Diésel Oil 11.917,88 (54.860 L).' },
        { vista: 'sap', paso: 'Con la N° 1001 seleccionada pulse "Crear pedido".', esperado: 'SAP "Pendiente de Liberación" con número de pedido; la conciliación pasa a Pendiente de Aprobacion (Sincronizaciones_To_SAP.ascx.vb:228-234).' },
        { vista: 'sap', paso: 'Pulse "Liberar pedido" y luego "Registrar hoja de entrada".', esperado: 'SAP "Pendiente Hoja de Entrada de Servicio" y luego "Pendiente de Liberación de Hoja" con número de hoja.' },
        { vista: 'sap', paso: 'Pulse "Liberar hoja".', esperado: 'SAP "Aceptado" y la conciliación queda Liberado.' },
        { vista: 'conciliaciones', paso: 'Opcional (ruta comentada en V1): reinicie, apruebe como transportista y use "Solicitar Aprobacion LOG" sin factura; luego con F-001.', esperado: 'Primero "Introduzca el Número de Factura por Mermas."; luego Pendiente de Aprobacion, con el aviso de que V1 no ofrece esa acción en la lista.' },
        { vista: 'conciliaciones', paso: 'Opcional: reinicie, active el modo propuesto y repita con distintos roles.', esperado: 'Cada transición exige su rol; por ejemplo, "Transportista Aprueba" solo con el rol Transportista.' }
      ]
    },
    {
      id: 'B', letra: 'B', nombre: 'B. Mermas y ajustes manuales',
      objetivo: 'Ver merma no admisible, demasía que compensa, merma dentro del admisible y el efecto de tarifa especial, liberar capacidad y liberar merma. Transportes Cóndor Andino, RCBA, 2da quincena de septiembre.',
      viajes: [
        { orden: 'B', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29880 }], nota: 'B1 merma no admisible' },
        { orden: 'B', terminal: 2, fecha: '2026-09-19', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-20', vol: 30040 }], nota: 'B2 demasía' },
        { orden: 'B', terminal: 2, fecha: '2026-09-21', destino: 3, producto: 1, cisterna: 2, vol: 30000, rec: [{ fecha: '2026-09-22', vol: 29950 }], nota: 'B3 dentro del admisible' },
        { orden: 'B', terminal: 2, fecha: '2026-09-23', destino: 3, producto: 1, cisterna: 2, vol: 29500, rec: [{ fecha: '2026-09-24', vol: 29450 }], nota: 'B4 cisterna no llena' },
        { orden: 'B', terminal: 2, fecha: '2026-09-25', destino: 4, producto: 2, cisterna: 1, vol: 25000, rec: [{ fecha: '2026-09-26', vol: 24800 }], nota: 'B5 diésel con merma alta' }
      ],
      guion: [
        { vista: 'sinconciliar', paso: 'Área RCBA. Revise las 5 recepciones de Transportes Cóndor Andino.', esperado: 'B1 29.880: C/D −30 L = −143,70 · B2 30.040: +40 L = +191,60 · B3 29.950: 0 · B4 29.450: admisible 89, C/D 0 · B5 24.800: admisible 63, C/D −137 L = −656,23.' },
        { vista: 'sinconciliar', paso: 'Marque el grupo y pulse Generar.', esperado: 'N° 1001: neto flete 28.727,60; mermas −656,23 (la gasolina suma +47,90 y se toma 0); neto 28.071,37.' },
        { vista: 'conciliaciones', paso: 'En la línea de la recepción de 29.880 L escriba tarifa especial 0.23.', esperado: 'Flete de la línea 6.872,40; neto 28.668,97.' },
        { vista: 'conciliaciones', paso: 'En la línea de la recepción de 29.450 L escriba liberar capacidad 30000.', esperado: 'Base 30.000 − 29.500 + 29.450 = 29.950 L; flete 6.289,50; neto 28.773,97.' },
        { vista: 'conciliaciones', paso: 'Marque liberar merma en la línea de diésel (24.800 L).', esperado: 'Mermas pasan a 0; neto 29.430,20.' },
        { vista: 'conciliaciones', paso: 'Marque liberar merma en la línea de 29.880 L.', esperado: 'El neto no cambia: la merma de gasolina ya estaba compensada por la demasía.' },
        { vista: 'conciliaciones', paso: 'Modo V1: en la línea de demasía (30.040 L) escriba tarifa especial 0.22.', esperado: 'Flete 6.608,80; neto 29.730,60; la línea queda marcada "desactualizado" con total 6.500,00 (defecto D12).' },
        { vista: 'conciliaciones', paso: 'Pulse "Calcular y procesar".', esperado: 'Mensaje "CONCILIACIÓN PROCESADA CORRECTAMENTE."; el listado muestra neto 29.730,60.' },
        { vista: 'conciliaciones', paso: 'Active el modo propuesto.', esperado: 'El total de la línea de demasía se recalcula a 6.800,40 y desaparece la marca; el neto sigue en 29.730,60; los ajustes muestran su auditoría.' }
      ]
    },
    {
      id: 'C', letra: 'C', nombre: 'C. Consolidación y prorrateo',
      objetivo: 'Despachos consolidados en una recepción, un despacho repartido en varios tanques y la diferencia de redondeo entre V1 (bancario) y la propuesta (resto mayor). Transportes Cóndor Andino, RCBA.',
      viajes: [
        { orden: 'C', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 2, vol: 15000, grupo: 'G1', nota: 'C1 compartimiento 1' },
        { orden: 'C', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 2, vol: 15000, grupo: 'G1', recGrupo: [{ fecha: '2026-09-18', vol: 29900 }], nota: 'C1 compartimiento 2' },
        { orden: 'C', terminal: 2, fecha: '2026-09-19', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-20', vol: 18000 }, { fecha: '2026-09-20', vol: 11900 }], nota: 'C2 dos tanques' },
        { orden: 'C', terminal: 2, fecha: '2026-09-21', destino: 3, producto: 1, cisterna: 1, vol: 29999, rec: [{ fecha: '2026-09-22', vol: 14990 }, { fecha: '2026-09-22', vol: 14990 }], nota: 'C3 redondeo' },
        { orden: 'C', terminal: 2, fecha: '2026-09-23', destino: 3, producto: 1, cisterna: 3, vol: 7500, grupo: 'G2', nota: 'C4 compartimiento 1' },
        { orden: 'C', terminal: 2, fecha: '2026-09-23', destino: 3, producto: 1, cisterna: 3, vol: 7500, grupo: 'G2', recGrupo: [{ fecha: '2026-09-24', vol: 14950 }], nota: 'C4 compartimiento 2' }
      ],
      guion: [
        { vista: 'cre', paso: 'Revise "Recepciones y su asociación".', esperado: 'La recepción de 29.900 L tiene 2 despachos; el despacho de 30.000 L tiene 2 recepciones (18.000 y 11.900); el de 29.999 L tiene 2 de 14.990; la de 14.950 L tiene 2 despachos de 7.500.' },
        { vista: 'sinconciliar', paso: 'Área RCBA. Recepción de 29.900 L (consolidación).', esperado: 'Dos líneas: admisible 45 + 45; el balance y el flete solo en la segunda: balance −100, C/D −10 L = −47,90, flete 6.279,00.' },
        { vista: 'sinconciliar', paso: 'Recepciones de 18.000 y 11.900 L (reparto).', esperado: 'Despacho imputado 18.060 y 11.940; admisible 54 y 36; C/D −6 y −4 L (−28,74 y −19,16); fletes 3.780,00 y 2.499,00.' },
        { vista: 'sinconciliar', paso: 'Modo V1: recepciones de 14.990 L del despacho de 29.999 L.', esperado: 'Cada una imputa 15.000 L (CInt bancario de 14.999,5): suman 30.000, un litro más que el despacho.' },
        { vista: 'sinconciliar', paso: 'Active el modo propuesto y vuelva a mirar esas dos recepciones.', esperado: 'Imputan 15.000 y 14.999: la suma coincide con el despacho. El C/D sigue en 0 porque el balance está dentro del admisible.' },
        { vista: 'sinconciliar', paso: 'Recepción de 14.950 L (cisterna de 15.000 L con dos cargas de 7.500).', esperado: 'Admisible 23 + 23 (22,5 sube por ser > 0,49); balance −50; C/D −4 L = −19,16; flete 3.139,50.' },
        { vista: 'sinconciliar', paso: 'Modo V1: marque el grupo y Generar.', esperado: 'N° 1001: neto flete 21.993,30; mermas −114,96; neto 21.878,34.' },
        { vista: 'ejemplos', paso: 'Pulse "Prorrateo con diferencia de redondeo".', esperado: 'Se muestran el resultado de V1 y el de la propuesta, uno al lado del otro.' }
      ]
    },
    {
      id: 'D', letra: 'D', nombre: 'D. Bloqueos y validaciones',
      objetivo: 'Provocar cada mensaje de bloqueo de V1: sin contrato o moneda, sin presupuesto, sin programación, multas fuera de estado, facturas impagas, reversión sin rol o sincronizada en SAP, orden sin CRE, selección inválida y fecha de recepción inválida.',
      viajes: [
        { orden: 'D1', terminal: 2, fecha: '2026-09-20', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-21', vol: 29950 }], nota: 'Contrato marco sin programación' },
        { orden: 'D1', terminal: 2, fecha: '2026-09-18', destino: 3, producto: 1, cisterna: 6, vol: 30000, rec: [{ fecha: '2026-09-19', vol: 29960 }], nota: 'Contrato marco sin saldo' },
        { orden: 'D1', terminal: 2, fecha: '2026-09-22', destino: 4, producto: 1, cisterna: 7, vol: 30000, rec: [{ fecha: '2026-09-23', vol: 29990 }], nota: 'Sin contrato vigente' },
        { orden: 'D2', terminal: 1, fecha: '2026-09-03', destino: 8, producto: 2, cisterna: 5, vol: 25000, rec: [{ fecha: '2026-09-04', vol: 24800 }], historico: 'D-Q1', nota: 'Factura impaga' },
        { orden: 'D3', terminal: 1, fecha: '2026-08-20', destino: 5, producto: 1, cisterna: 4, vol: 30000, rec: [{ fecha: '2026-08-21', vol: 29900 }], historico: 'D-AGO', nota: 'Liberada y registrada en SAP' }
      ],
      ordenes: [{ terminal: 1, fecha: '2026-09-30', estado: 'APROBADO', detalles: [{ destino: 5, producto: 1, cisterna: 4, vol: 30000 }, { destino: 8, producto: 1, cisterna: 5, vol: 25000 }] }],
      ajustes: 'Umbral de facturas impagas reducido a 500 (en V1 es 50.000) y contrato marco CM-01/2026 sin programación para 2026.',
      preparar: st => {
        st.umbralFacturas = 500;
        st.contratos.find(c => c.id === 11).marco.programado = { 2025: 1000000 };
      },
      historicos: [
        { marca: 'D-AGO', numero: 899, estado: 'Liberado', sap: 'Aceptado' },
        { marca: 'D-Q1', numero: 900, estado: 'Pendiente de Aprobacion', facturasPagadas: false, facturaMermas: 'F-0900' }
      ],
      guion: [
        { vista: 'sinconciliar', paso: 'Modo V1, área RCBA.', esperado: 'Grupos de Logística Altiplano y Transportes Cóndor Andino. Fletes Chaco aparece en "Recepciones que V1 no muestra" (sin contrato vigente).' },
        { vista: 'sinconciliar', paso: 'Marque solo Logística Altiplano y pulse Generar.', esperado: 'Error de presupuesto: "Ejecutado 295.000,00 + conciliación 6.351,52 > programado 300.000,00".' },
        { vista: 'sinconciliar', paso: 'Desmarque Altiplano, marque solo Transportes Cóndor Andino y pulse Generar.', esperado: 'Error: "NO EXISTE PROGRAMACIÓN PRESUPUESTARIA, PARA EL CONTRATO MARCO CM-01/2026…".' },
        { vista: 'sinconciliar', paso: 'Active el modo propuesto, desmarque Cóndor, marque Fletes Chaco (ahora visible con alerta) y pulse Generar. Vuelva al modo V1.', esperado: 'Error: "LA CONCILIACIÓN A GENERAR NO CUENTA CON LA MONEDA."' },
        { vista: 'multas', paso: 'Elija el CRE de despacho de Cisternas del Oriente del 03/09/2026 y pulse Registrar.', esperado: 'Bloqueo: la conciliación N° 900 está "Pendiente de Aprobacion".' },
        { vista: 'conciliaciones', paso: 'Abra la N° 900 y ejecute "Solicitar Liberacion" (grupo de acciones comentadas en V1).', esperado: 'Error: existen conciliaciones pendientes de pago de factura mayores a 500: [Conc. 900 Septiembre-2026]. (Umbral reducido a 500 en este escenario.) Nota: como V1 no ofrece esta acción en su lista, en la práctica esta regla no se aplica.' },
        { vista: 'sap', paso: 'Seleccione la N° 900 y pulse "Marcar facturas pagadas". Vuelva y repita "Solicitar Liberacion".', esperado: 'Estado Pendiente de Liberacion.' },
        { vista: 'conciliaciones', paso: 'Rol Analista LOG: abra la N° 899 (Liberado) y ejecute "Rechazar Conciliacion".', esperado: 'Error: "SU ROL NO PUEDE REVERTIR EL ESTADO ACTUAL…".' },
        { vista: 'conciliaciones', paso: 'Rol Gerente de Dist. y Ventas: repita "Rechazar Conciliacion" en la N° 899.', esperado: 'Error: "…NO SE ENCUENTRA ANULADA EN SAP."' },
        { vista: 'sap', paso: 'Seleccione la N° 899 y pulse "Anular aceptación".', esperado: 'SAP vuelve a "Pendiente de Liberación de Hoja" pero la conciliación sigue Liberado (V1 no la revierte).' },
        { vista: 'sap', paso: 'Pulse "Anular hoja" y luego "Anular pedido".', esperado: 'SAP "Sin Registrar en SAP" y la conciliación vuelve a En Elaboracion (Sincronizaciones_To_SAP.ascx.vb:688-737).' },
        { vista: 'ordenes', paso: 'Abra la orden de RSCZ del 30/09/2026 (APROBADO) y ejecute "Liberar Orden Despacho".', esperado: 'Error: "NO EXISTE AL MENOS UN CRE EN EL DETALLE…".' },
        { vista: 'ordenes', paso: 'Marque los dos detalles (destinos SCR y CMR) y pulse Crear CRE.', esperado: 'Error: "DEBE SELECCIONAR DESPACHOS AL MISMO DESTINO".' },
        { vista: 'ordenes', paso: 'Marque solo el detalle a SCR y cree su CRE.', esperado: 'Se crea el CRE de despacho con fecha 30/09/2026.' },
        { vista: 'cre', paso: 'Marque ese despacho, fecha de recepción 29/09/2026, volumen 29950 y registre.', esperado: 'Error: "La recepción no puede ser anterior al despacho."' }
      ]
    },
    {
      id: 'E', letra: 'E', nombre: 'E. Tarifas',
      objetivo: 'Ver cómo V1 obtiene la tarifa: sin tarifa (flete 0), cambio de vigencia según la fecha de recepción, principal y alterna, tarifa asociada en la hoja de ruta, baja de tarifa e importación desde Arica.',
      viajes: [
        { orden: 'E1', terminal: 2, fecha: '2026-09-17', destino: 7, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29950 }], nota: 'Ruta sin tarifa' },
        { orden: 'E1', terminal: 2, fecha: '2026-09-18', destino: 4, producto: 1, cisterna: 2, vol: 30000, rec: [{ fecha: '2026-09-19', vol: 29950 }], nota: 'Tarifa anterior' },
        { orden: 'E1', terminal: 2, fecha: '2026-09-19', destino: 4, producto: 1, cisterna: 2, vol: 30000, rec: [{ fecha: '2026-09-21', vol: 29950 }], nota: 'Tarifa nueva por fecha de recepción' },
        { orden: 'E2', terminal: 2, fecha: '2026-09-22', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-23', vol: 29880 }], nota: 'Principal y alterna' },
        { orden: 'E2', terminal: 2, fecha: '2026-09-24', destino: 3, producto: 1, cisterna: 1, vol: 30000, tarifaAsociada: 'ALTERNA', rec: [{ fecha: '2026-09-25', vol: 29970 }], nota: 'Tarifa asociada en hoja de ruta' },
        { orden: 'E3', terminal: 9, fecha: '2026-09-20', destino: 3, producto: 2, cisterna: 6, vol: 30000, rec: [{ fecha: '2026-09-23', vol: 29800 }], nota: 'Importación desde Arica' }
      ],
      ajustes: 'Nueva tarifa #200 de Cóndor RCBA → ORU gasolina 160 Bs/m³ desde el 20/09/2026; ejecutado del contrato marco CM-03/2026 en 100.000.',
      preparar: st => {
        st.tarifas.push({ id: 200, contratoId: 11, origenId: 2, destinoId: 4, productoId: 1, tarifa: 160, admisible: 0.30, prioridad: 'PRINCIPAL', vigInicio: '2026-09-20', estado: true, aprobada: true });
        st.contratos.find(c => c.id === 13).marco.ejecutado = { 2026: 100000 };
      },
      guion: [
        { vista: 'simulador', paso: 'Cisterna 2345-ABC (Cóndor), gasolina, origen RCBA, destino TJA.', esperado: 'Mensaje: no tiene tarifa PRINCIPAL vigente; V1 devolvería 0.' },
        { vista: 'tarifario', paso: 'Filtre Transportes Cóndor Andino y busque RCBA → ORU, gasolina.', esperado: 'Tarifa #104 de 150,00 desde 01/01/2026 y tarifa #200 de 160,00 desde 20/09/2026.' },
        { vista: 'sinconciliar', paso: 'Área RCBA, grupo de Cóndor: recepción a TJA (29.950 L).', esperado: 'Fuente SIN TARIFA, flete 0, admisible 0 % y por eso C/D −50 L = −239,50: sin tarifa también se pierde el admisible.' },
        { vista: 'sinconciliar', paso: 'Recepciones a ORU del 19/09 y del 21/09.', esperado: 'La del 19/09 usa 0,15 (flete 4.492,50). La del 21/09 usa 0,16 (flete 4.792,00) aunque se despachó el 19/09: manda la fecha de recepción.' },
        { vista: 'sinconciliar', paso: 'Recepción de 29.970 L.', esperado: 'Fuente ASOCIADA ALTERNA, tarifa 0,225, flete 6.743,25.' },
        { vista: 'tarifario', paso: 'Dé de baja la tarifa #101 (RCBA → SNK, gasolina, 210) y vuelva a "Detalle sin conciliar".', esperado: 'La recepción de 29.880 L pasa a SIN TARIFA y flete 0. La de 29.970 L no cambia (usa la alterna asociada).' },
        { vista: 'tarifario', paso: 'Active de nuevo la tarifa #101.', esperado: 'La recepción de 29.880 L vuelve a 0,21 y flete 6.274,80.' },
        { vista: 'sinconciliar', paso: 'Marque Cóndor y Generar.', esperado: 'N° 1001: neto flete 22.302,55; mermas −383,20; neto 21.919,35.' },
        { vista: 'conciliaciones', paso: 'En la línea de 29.880 L pulse "A" (alterna).', esperado: 'Tarifa 225 → flete 6.723,00; neto 22.367,55.' },
        { vista: 'sinconciliar', paso: 'Marque Logística Altiplano (Arica → SNK, diésel) y Generar.', esperado: 'N° 1002: tarifa 0,41, admisible 0,5 % (150 L), C/D −50 L × 5,20 (precio importado) = −260,00; flete 12.218,00; neto 11.958,00.' },
        { vista: 'portal', paso: 'Solicite la aprobación de la N° 1002 en "Conciliación cisterna" y apruébela en el portal de Logística Altiplano.', esperado: 'SAP "CTI 1002 9/26", tipo TERRESTRE INTERNACIONAL.' }
      ]
    },
    {
      id: 'F', letra: 'F', nombre: 'F. Multas y recargos',
      objetivo: 'Comparar qué multas y recargos entran al neto en V1 y en la propuesta: multas por CRE, multa de transporte contractual, multa de conciliación, casos especiales y carro guía. Transportes Cóndor Andino, RCBA.',
      viajes: [
        { orden: 'F', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29880 }], multas: [{ id: 2, entrada: 2 }, { id: 4, entrada: 1 }], nota: 'Con MDR y MNC' },
        { orden: 'F', terminal: 2, fecha: '2026-09-19', destino: 4, producto: 2, cisterna: 2, vol: 25000, rec: [{ fecha: '2026-09-20', vol: 24900 }], multas: [{ id: 9, entrada: true }], nota: 'Con filtración' }
      ],
      guion: [
        { vista: 'multas', paso: 'Elija el CRE de despacho del 17/09/2026.', esperado: 'MDR 2 días = 696,00 y MNC 1 conductor = 696,00; total 1.392,00 (TC 6,96).' },
        { vista: 'multas', paso: 'Elija el CRE de despacho del 19/09/2026 (diésel, 25.000 L).', esperado: 'MPF = ((4,22 × 6,96) × 1,15 / 1000) × 25.000 = 844,42.' },
        { vista: 'sinconciliar', paso: 'Área RCBA: marque Cóndor y Generar.', esperado: 'N° 1001: flete 9.960,00; mermas −320,93; neto inicial guardado 9.639,07. Neto recalculado 7.402,65: incorpora las multas CRE −2.236,42 al procesar.' },
        { vista: 'recargos', paso: 'Aplique "Entrega tardía de documentación" a los dos despachos y "Incumplimiento del programa quincenal".', esperado: 'Desglose contractual −200,00 + CRE −2.236,42 = Multa Transporte −2.436,42; MC −500,00.' },
        { vista: 'recargos', paso: 'Agregue un caso especial "Pérdida de producto por accidente" de 1500 y un carro guía de 300.', esperado: 'Casos especiales −1.500,00 y carro guía −300,00.' },
        { vista: 'recargos', paso: 'Revise "Efecto en el neto" en modo V1.', esperado: 'Neto recalculado 7.202,65 = 9.960,00 − 320,93 − 2.436,42. MC/casos/carro guía solo se suman al neto visual OT. Abra el panel para comparar con el guardado.' },
        { vista: 'recargos', paso: 'Active el modo propuesto.', esperado: 'Neto 4.902,65: entran todas las multas, recargos, casos y carro guía.' },
        { vista: 'multas', paso: 'En el CRE del 17/09 marque MAC y pulse Registrar.', esperado: 'Total 4.872,00. En modo propuesto el neto baja a 1.422,65.' },
        { vista: 'conciliaciones', paso: 'Solicite la aprobación del transportista e intente registrar de nuevo las multas del 17/09.', esperado: 'Bloqueo: la conciliación N° 1001 está "En Aprobacion de Transportista".' }
      ]
    },
    {
      id: 'G', letra: 'G', nombre: 'G. DESTINO → LEGACY: oferta, ranking y nominación',
      objetivo: 'Recorrer la propuesta completa: tarifa por ruta en la oferta, tarifa propuesta en las postulaciones, ranking, nominación que crea la orden de despacho con tarifa adjudicada y conciliación usando esa tarifa.',
      viajes: [],
      ajustes: 'Ejecutado del contrato marco CM-03/2026 en 150.000, para que Logística Altiplano tenga saldo.',
      preparar: st => { st.contratos.find(c => c.id === 13).marco.ejecutado = { 2026: 150000 }; },
      guion: [
        { vista: 'destino', paso: 'Revise la oferta OF-2026-045 (RCBA → Potosí, 90.000 L, referencial 230) y el ranking.', esperado: '1° Logística Altiplano 219 · 2° Transportes Cóndor Andino 228 · 3° Cisternas del Oriente 235.' },
        { vista: 'destino', paso: 'Opcional: cambie la tarifa de Cisternas del Oriente a 215 y vuelva a 235.', esperado: 'Oriente sube al 1° puesto y luego vuelve al 3°.' },
        { vista: 'destino', paso: 'Pulse "Nominar y enviar a LEGACY".', esperado: 'Orden EN ELABORACION con 3 detalles: Altiplano 30.000 L a 219; Cóndor 2 × 30.000 L a 228. Oriente queda NO NOMINADA.' },
        { vista: 'ordenes', paso: 'Abra la orden, solicite aprobación y apruébela.', esperado: 'APROBADO; correo a despachos@altiplano.example y operaciones@condor.example.' },
        { vista: 'ordenes', paso: 'Marque los 3 detalles y pulse Crear CRE.', esperado: 'Error: "DEBE SELECCIONAR DESPACHOS DE LA MISMA EMPRESA".' },
        { vista: 'ordenes', paso: 'Cree el CRE del detalle de Altiplano; luego marque los dos de Cóndor y cree sus CRE. Libere la orden.', esperado: '3 CRE de despacho del 05/10/2026; orden LIBERADO.' },
        { vista: 'cre', paso: 'Recepcione cada despacho por separado con fecha 06/10/2026: 9988-KLM 29940; 2345-ABC 29900; 3456-BCD 29960.', esperado: '3 recepciones PT-…' },
        { vista: 'sinconciliar', paso: 'Modo V1, área RCBA.', esperado: 'Cóndor (1ra quincena de octubre): fuente CONTRATO PRINCIPAL 0,23, fletes 6.877,00 y 6.890,80 (no respeta la tarifa adjudicada de 228). Altiplano: SIN TARIFA, flete 0, C/D −60 L = −287,40.' },
        { vista: 'sinconciliar', paso: 'Active el modo propuesto.', esperado: 'Fuente ADJUDICADA. Cóndor: 6.817,20 y 6.830,88. Altiplano: 0,219 → 6.556,86, admisible 0,30 % → C/D 0.' },
        { vista: 'sinconciliar', paso: 'En modo propuesto marque ambos grupos y Generar.', esperado: 'N° 1001 Logística Altiplano neto 6.556,86; N° 1002 Transportes Cóndor Andino neto 13.600,18.' }
      ]
    },
    {
      id: 'I', letra: 'I', nombre: 'I. Otros Transportes: pantalla unificada',
      objetivo: 'Recorrer la pantalla "Conciliación Otros Transportes" (ConciliacionOtrosTransportes.aspx): permisos finos por usuario, detalle por recepción, lista de tarifas P/A1/0, procesar, excluir recepción, nuevo convoy, aprobar y rechazar por fila, y bloqueo de facturas impagas.',
      viajes: [
        { orden: 'I1', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29880 }], historico: 'I-C1' },
        { orden: 'I1', terminal: 2, fecha: '2026-09-19', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-20', vol: 30040 }], historico: 'I-C1' },
        { orden: 'I1', terminal: 2, fecha: '2026-09-21', destino: 4, producto: 2, cisterna: 2, vol: 25000, rec: [{ fecha: '2026-09-22', vol: 24800 }], historico: 'I-C1' },
        { orden: 'I2', terminal: 2, fecha: '2026-09-24', destino: 3, producto: 1, cisterna: 1, vol: 30000, rec: [{ fecha: '2026-09-25', vol: 29950 }], nota: 'Para nuevo convoy' },
        { orden: 'I2', terminal: 2, fecha: '2026-09-26', destino: 3, producto: 1, cisterna: 2, vol: 15000, grupo: 'GI' },
        { orden: 'I2', terminal: 2, fecha: '2026-09-26', destino: 3, producto: 1, cisterna: 2, vol: 15000, grupo: 'GI', recGrupo: [{ fecha: '2026-09-27', vol: 29900 }], nota: 'Para nuevo convoy (consolidado)' },
        { orden: 'I3', terminal: 1, fecha: '2026-09-03', destino: 8, producto: 2, cisterna: 5, vol: 25000, rec: [{ fecha: '2026-09-04', vol: 24800 }], historico: 'I-C2' }
      ],
      ajustes: 'Umbral de facturas impagas reducido a 500. Permisos de Otros Transportes por rol: Analista LOG procesa y solicita aprobación (sin rechazar ni solicitar liberación); Jefe LOG tiene todos; Gerente solo solicita liberación y rechaza; Transportista no tiene ninguno.',
      preparar: st => { st.umbralFacturas = 500; },
      historicos: [
        { marca: 'I-C1', numero: 980, estado: 'En Elaboracion' },
        { marca: 'I-C2', numero: 981, estado: 'Pendiente de Aprobacion', facturasPagadas: false, facturaMermas: 'F-0981' }
      ],
      guion: [
        { vista: 'ot', paso: 'Con el rol Transportista abra la vista.', esperado: 'Acceso denegado: SinAcceso.aspx (sin permisos en CONFIGURACION_CONCILIACIONES).' },
        { vista: 'ot', paso: 'Rol Analista LOG. Cisterna, área RCBA, Septiembre 2026, 2da quincena.', esperado: 'Conciliación N° 980 de Transportes Cóndor Andino, En Elaboracion, con botón Aprobar y sin botón Rechazar. Totales: Flete Facturable 16.253,60; Multa Merma −656,23; Neto Conciliado 15.597,37.' },
        { vista: 'ot', paso: 'Marque la N° 980 y revise el detalle por recepción.', esperado: '3 filas ordenadas por producto (DO 24.800 L; GE 29.880 L y 30.040 L). Cada fila suma sus líneas; la tarifa de la lista muestra P, A1 (si hay alterna) y 0.' },
        { vista: 'ot', paso: 'En la recepción de 29.880 L elija la tarifa A1 (0,225) y pulse Procesar.', esperado: '"CONCILIACIÓN PROCESADA CORRECTAMENTE."; flete de la fila 6.723,00; neto 16.045,57.' },
        { vista: 'ot', paso: 'Marque liberar merma en la recepción de diésel (24.800 L) y pulse Procesar.', esperado: 'El C/D de diésel aparece tachado; mermas 0; neto 16.701,80.' },
        { vista: 'ot', paso: 'Excluya la recepción de 30.040 L (demasía).', esperado: '"CRE EXCLUIDO CORRECTAMENTE."; quedan 2 filas; la merma de gasolina ya no se compensa: mermas −143,70; neto 10.249,70.' },
        { vista: 'ot', paso: 'Pulse "Nuevo convoy" (rango 16/09/2026–30/09/2026), marque las 3 recepciones disponibles y pulse Aceptar.', esperado: 'Se agregan la recepción de 30.040 L (excluida antes), la de 29.950 L y la consolidada de 29.900 L; quedan 5 filas; la demasía vuelve a compensar la gasolina (mermas 0); neto 29.270,30.' },
        { vista: 'ot', paso: 'Pulse Aprobar dos veces.', esperado: 'En Aprobacion de Transportista y luego Aprobada Por Transportista con registro SAP; aviso de que lo aprobó un usuario de logística (D22). El botón Rechazar no aparece para el Analista.' },
        { vista: 'ot', paso: 'Rol Jefe LOG: pulse Rechazar en la N° 980.', esperado: 'En Elaboracion; el registro SAP queda "Sin Registrar en SAP" sin verificación (D25).' },
        { vista: 'ot', paso: 'Área RSCZ, Septiembre 2026, 1ra quincena: N° 981 (Pendiente de Aprobacion). Con el rol Analista LOG no aparece Aprobar; con Jefe LOG pulse Aprobar.', esperado: 'Error: facturas pendientes de pago mayores a 500 [… Conc. 981 Septiembre-2026]. Aquí la regla sí se aplica.' },
        { vista: 'sap', paso: 'Seleccione la N° 981 y pulse "Marcar facturas pagadas"; vuelva y pulse Aprobar.', esperado: 'Pendiente de Liberacion.' },
        { vista: 'ot', paso: 'Elija tipo Barcaza o Vagón.', esperado: 'Aviso: el prototipo no tiene barcazas ni vagones; sus reglas (compensación de capacidad, toneladas) están en CONCILIACION_OTROS_TRANSPORTES_V1.md §6-§7.' }
      ]
    },
    {
      id: 'H', letra: 'H', nombre: 'H. Volumen: un mes de operación',
      objetivo: 'Un mes con 65 viajes de tres transportistas en ambas áreas, la primera quincena ya conciliada en distintos estados y la segunda pendiente. Sirve para revisar listados, filtros y totales con más datos.',
      viajes: viajesVolumen(),
      ajustes: 'Ejecutado del contrato marco CM-03/2026 en 0. Los 65 viajes se generan siempre iguales (generador con semilla fija).',
      preparar: st => { st.contratos.find(c => c.id === 13).marco.ejecutado = { 2026: 0 }; },
      historicos: [
        { marca: 'H-Q1-T1', numero: 950, estado: 'Liberado', sap: 'Aceptado' },
        { marca: 'H-Q1-T2', numero: 951, estado: 'Pendiente de Liberacion' },
        { marca: 'H-Q1-T3', numero: 952, estado: 'En Aprobacion de Transportista' }
      ],
      guion: [
        { vista: 'inicio', paso: 'Revise los contadores.', esperado: '65 despachos, 65 recepciones y 3 conciliaciones (Liberado, Pendiente de Liberacion, En Aprobacion de Transportista).' },
        { vista: 'conciliaciones', paso: 'Revise el listado y filtre por estado y por transportista.', esperado: 'N° 950 Cóndor, 14 viajes, Liberado, neto 83.855,79 · N° 951 Oriente, 13 viajes, Pendiente de Liberacion, neto 84.141,60 · N° 952 Altiplano, 4 viajes, En Aprobacion de Transportista, neto 25.356,90.' },
        { vista: 'sinconciliar', paso: 'Área "Todas".', esperado: '3 grupos de la 2da quincena de septiembre: Cisternas del Oriente 15 recepciones (incluye un viaje a Tarija despachado el 14/09 y recibido el 16/09), Logística Altiplano 5, Transportes Cóndor Andino 14.' },
        { vista: 'sinconciliar', paso: 'Marque los tres grupos y Generar.', esperado: 'N° 1001 Cisternas del Oriente neto 103.817,86 · N° 1002 Logística Altiplano 31.765,88 · N° 1003 Transportes Cóndor Andino 83.279,98.' },
        { vista: 'portal', paso: 'Empresa Logística Altiplano: apruebe la N° 952.', esperado: 'Aprobada Por Transportista con registro SAP.' },
        { vista: 'bitacora', paso: 'Revise la bitácora.', esperado: 'Cada acción figura con usuario, rol y modo.' }
      ]
    }
  ];

  SILOG.escenarioPorId = id => SILOG.ESCENARIOS.find(e => e.id === id) || SILOG.ESCENARIOS[0];
})();

// Resultados esperados del escenario H (datos generados de forma determinista).
SILOG.H_ESPERADO = {
  historicas: '950 Liberado 14 | 951 Pendiente de Liberacion 13 | 952 En Aprobacion de Transportista 4',
  netos: '83855.79 84141.60 25356.90',
  pendientes: '2:15 3:5 1:14',
  generados: '2:103817.86 3:31765.88 1:83279.98'
};

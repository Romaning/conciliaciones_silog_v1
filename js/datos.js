/*
 * Escenario inicial del prototipo. Todos los nombres de empresas, personas, placas, montos,
 * tarifas y precios son ficticios. Las estructuras replican las tablas de SILOG_V1:
 * Localidad, MedioTransportePropietario, Cisterna, MC_Contrato, MC_TarifaOT, ProductoPrecio,
 * Multa, MC_MultasDescuentos, OrdenDeDespacho/OrdenDespachoDetalle, CRE y CREAsociacion.
 */
window.SILOG = window.SILOG || {};

SILOG.HOY = '2026-10-02';

SILOG.crearEscenario = function () {
  const localidades = [
    { id: 1, codigo: 'RSCZ', codigoCRE: 'SC', nombre: 'Refinería Santa Cruz', tipo: 'Refinería', nacional: 0, area: 1, lon: -63.18, lat: -17.78 },
    { id: 2, codigo: 'RCBA', codigoCRE: 'CB', nombre: 'Refinería Cochabamba', tipo: 'Refinería', nacional: 0, area: 2, lon: -66.16, lat: -17.39 },
    { id: 3, codigo: 'SNK', codigoCRE: 'SK', nombre: 'Planta Senkata', tipo: 'Planta', nacional: 0, area: 2, lon: -68.20, lat: -16.55 },
    { id: 4, codigo: 'ORU', codigoCRE: 'OR', nombre: 'Planta Oruro', tipo: 'Planta', nacional: 0, area: 2, lon: -67.11, lat: -17.97 },
    { id: 5, codigo: 'SCR', codigoCRE: 'SU', nombre: 'Planta Sucre', tipo: 'Planta', nacional: 0, area: 1, lon: -65.26, lat: -19.04 },
    { id: 6, codigo: 'PTS', codigoCRE: 'PT', nombre: 'Planta Potosí', tipo: 'Planta', nacional: 0, area: 2, lon: -65.75, lat: -19.58 },
    { id: 7, codigo: 'TJA', codigoCRE: 'TJ', nombre: 'Planta Tarija', tipo: 'Planta', nacional: 0, area: 1, lon: -64.73, lat: -21.53 },
    { id: 8, codigo: 'CMR', codigoCRE: 'CM', nombre: 'Planta Camiri', tipo: 'Planta', nacional: 0, area: 1, lon: -63.52, lat: -20.05 },
    { id: 9, codigo: 'ARI', codigoCRE: 'AR', nombre: 'Terminal Arica (extranjera)', tipo: 'Terminal', nacional: 1, area: 2, lon: -70.30, lat: -18.48 }
  ];

  const productos = [
    { id: 1, codigo: 'GE', nombre: 'Gasolina Especial', cebe: 'CB-GE-01', cuenta: '5110101' },
    { id: 2, codigo: 'DO', nombre: 'Diésel Oil', cebe: 'CB-DO-01', cuenta: '5110102' },
    { id: 3, codigo: 'JET', nombre: 'Jet Fuel', cebe: 'CB-JF-01', cuenta: '5110103' }
  ];

  const transportistas = [
    { id: 1, nombre: 'Transportes Cóndor Andino SRL', nit: '100000011', correo: 'operaciones@condor.example' },
    { id: 2, nombre: 'Cisternas del Oriente SA', nit: '100000022', correo: 'flota@oriente.example' },
    { id: 3, nombre: 'Logística Altiplano Ltda', nit: '100000033', correo: 'despachos@altiplano.example' },
    { id: 4, nombre: 'Fletes Chaco SRL', nit: '100000044', correo: 'contacto@chaco.example' }
  ];

  const cisternas = [
    { id: 1, placa: '2345-ABC', transportistaId: 1, capacidad: 30000 },
    { id: 2, placa: '3456-BCD', transportistaId: 1, capacidad: 30000 },
    { id: 3, placa: '4567-CDE', transportistaId: 1, capacidad: 15000 },
    { id: 4, placa: '1122-XYZ', transportistaId: 2, capacidad: 30000 },
    { id: 5, placa: '2233-YZA', transportistaId: 2, capacidad: 25000 },
    { id: 6, placa: '9988-KLM', transportistaId: 3, capacidad: 30000 },
    { id: 7, placa: '7766-PQR', transportistaId: 4, capacidad: 30000 }
  ];

  const conductores = [
    { id: 1, nombre: 'Juan Quispe', transportistaId: 1, certificado: true },
    { id: 2, nombre: 'Pedro Mamani', transportistaId: 1, certificado: true },
    { id: 3, nombre: 'Luis Rojas', transportistaId: 2, certificado: true },
    { id: 4, nombre: 'Mario Vargas', transportistaId: 2, certificado: false },
    { id: 5, nombre: 'René Choque', transportistaId: 3, certificado: true },
    { id: 6, nombre: 'Hugo Flores', transportistaId: 4, certificado: true }
  ];

  // MC_Contrato + MC_ContratoHistorial (versión vigente) + MC_ContratoMarco simplificado.
  const contratos = [
    { id: 10, transportistaId: 1, numero: 'CTR-T1-2025', moneda: 'Bs', vigInicio: '2025-01-01', vigFin: '2025-12-31', estado: 'LIBERADO', marco: null },
    { id: 11, transportistaId: 1, numero: 'CTR-T1-2026', moneda: 'Bs', vigInicio: '2026-01-01', vigFin: '2026-12-31', estado: 'LIBERADO',
      marco: { numero: 'CM-01/2026', controlaPresupuesto: true, programado: { 2026: 1200000 }, ejecutado: { 2026: 410000 } } },
    { id: 12, transportistaId: 2, numero: 'CTR-T2-2026', moneda: 'Bs', vigInicio: '2026-01-01', vigFin: '2026-12-31', estado: 'LIBERADO', marco: null },
    { id: 13, transportistaId: 3, numero: 'CTR-T3-2026', moneda: 'Bs', vigInicio: '2026-01-01', vigFin: '2026-12-31', estado: 'LIBERADO',
      marco: { numero: 'CM-03/2026', controlaPresupuesto: true, programado: { 2026: 300000 }, ejecutado: { 2026: 295000 } } },
    { id: 14, transportistaId: 4, numero: 'CTR-T4-2025', moneda: 'Bs', vigInicio: '2025-01-01', vigFin: '2025-12-31', estado: 'LIBERADO', marco: null }
  ];

  // MC_TarifaOT: tarifa en Bs por m³ (1.000 L); admisible en %.
  let tid = 100;
  const t = (contratoId, origenId, destinoId, productoId, tarifa, admisible, prioridad, vigInicio) => ({
    id: tid++, contratoId, origenId, destinoId, productoId, tarifa, admisible,
    prioridad: prioridad || 'PRINCIPAL', vigInicio: vigInicio || '2026-01-01', estado: true, aprobada: true
  });
  const tarifas = [
    t(10, 2, 3, 1, 200, 0.30, 'PRINCIPAL', '2025-01-01'),
    t(11, 2, 3, 1, 210, 0.30),
    t(11, 2, 3, 1, 225, 0.30, 'ALTERNA'),
    t(11, 2, 3, 2, 205, 0.25),
    t(11, 2, 4, 1, 150, 0.30),
    t(11, 2, 4, 2, 148, 0.25),
    t(11, 2, 6, 1, 230, 0.30),
    t(11, 1, 5, 1, 260, 0.35),
    t(11, 1, 5, 2, 255, 0.30),
    t(11, 1, 8, 2, 180, 0.25),
    t(12, 1, 5, 1, 262, 0.35),
    t(12, 1, 5, 2, 250, 0.30),
    t(12, 1, 7, 3, 320, 0.40),
    t(12, 1, 8, 2, 178, 0.25),
    t(13, 2, 3, 1, 212, 0.30),
    t(13, 9, 3, 2, 410, 0.50),
    t(14, 2, 4, 1, 152, 0.30, 'PRINCIPAL', '2025-01-01')
  ];

  // ProductoPrecio: PPT nacional y precio de multa por litro (Bs).
  const precios = [
    { productoId: 1, vigInicio: '2024-01-01', ppt: 3.74, precioMulta: 4.50 },
    { productoId: 1, vigInicio: '2025-01-01', ppt: 3.74, precioMulta: 4.79 },
    { productoId: 2, vigInicio: '2025-01-01', ppt: 3.72, precioMulta: 4.79 },
    { productoId: 3, vigInicio: '2025-01-01', ppt: 5.10, precioMulta: 6.20 }
  ];
  // MA_PrecioProductoImportado: precio por m³ en la moneda indicada.
  const preciosImportados = [
    { productoId: 2, vigInicio: '2026-01-01', vigFin: '2026-12-31', precio: 5200, moneda: 'BOB', tc: 6.96 }
  ];

  // Tabla Multa (multas por incumplimiento por CRE de despacho). Valores ilustrativos.
  const multasCatalogo = [
    { id: 2, sigla: 'MDR', nombre: 'Multa por día de retraso', valor: 50, moneda: 'Sus', base: 'cantidad', unidad: 'días' },
    { id: 4, sigla: 'MNC', nombre: 'Multa por conductor no certificado', valor: 100, moneda: 'Sus', base: 'cantidad', unidad: 'conductores' },
    { id: 5, sigla: 'MAC', nombre: 'Multa alcohol en conductor', valor: 500, moneda: 'Sus', base: 'fijo' },
    { id: 6, sigla: 'MOP', nombre: 'Multa otros pasajeros', valor: 100, moneda: 'Sus', base: 'fijo' },
    { id: 8, sigla: 'MNT', nombre: 'Multa por infringir normas de tránsito', valor: 100, moneda: 'Sus', base: 'fijo' },
    { id: 9, sigla: 'MPF', nombre: 'Multa por filtración', valor: 4.22, moneda: 'Sus', base: 'filtracion' }
  ];

  // MC_MultasDescuentos + Detalle + Empresas (recargos contractuales) y casos especiales.
  const recargosCatalogo = [
    { id: 1, tipo: 'Multa', aplicabilidad: 'CRE_D', denominacion: 'Contrato de transporte 2026', concepto: 'Entrega tardía de documentación de despacho', monto: 100, moneda: 'Bs', empresas: [1, 2, 3] },
    { id: 2, tipo: 'Multa', aplicabilidad: 'CONC', denominacion: 'Contrato de transporte 2026', concepto: 'Incumplimiento del programa quincenal', monto: 500, moneda: 'Bs', empresas: [1] },
    { id: 3, tipo: 'Descuento', aplicabilidad: 'CONC', denominacion: 'Contrato de transporte 2026', concepto: 'Uso de báscula de terceros', monto: 200, moneda: 'Bs', empresas: [2] }
  ];
  const casosEspecialesCatalogo = [
    { id: 12, nombre: 'Caso especial (genérico)' },
    { id: 17, nombre: 'Pérdida de producto por accidente' }
  ];

  return {
    version: 5,
    // CONFIGURACION_CONCILIACIONES simulada: permisos de la pantalla Otros Transportes por usuario (rol).
    permisosOT: {
      'Analista LOG': { PuedeProcesar: true, PuedeEditarFechas: true, PuedeSolicitarAprobacion: true, PuedeSolicitarLiberacion: false, PuedeRechazarConciliacion: false,
        PuedeLiberarMerma: true, PuedeLiberarCapacidad: true, PuedeCambiarTarifa: true, PuedeColocarTarifaEspecial: true },
      'Jefe LOG': { PuedeProcesar: true, PuedeEditarFechas: true, PuedeSolicitarAprobacion: true, PuedeSolicitarLiberacion: true, PuedeRechazarConciliacion: true,
        PuedeLiberarMerma: true, PuedeLiberarCapacidad: true, PuedeCambiarTarifa: true, PuedeColocarTarifaEspecial: true },
      'Gerente de Dist. y Ventas': { PuedeProcesar: false, PuedeEditarFechas: false, PuedeSolicitarAprobacion: false, PuedeSolicitarLiberacion: true, PuedeRechazarConciliacion: true,
        PuedeLiberarMerma: false, PuedeLiberarCapacidad: false, PuedeCambiarTarifa: false, PuedeColocarTarifaEspecial: false },
      'Transportista': {}
    },
    hoy: SILOG.HOY,
    tc: 6.96,
    umbralFacturas: 50000,
    nroConcProximo: 1001,
    nroCREProximo: 3001,
    nroOrdenProximo: { 1: 312, 2: 153, 9: 11 },
    localidades, productos, transportistas, cisternas, conductores, contratos, tarifas,
    precios, preciosImportados, multasCatalogo, recargosCatalogo, casosEspecialesCatalogo,
    ordenes: [], cres: [], asociaciones: [], lotes: [], multasCRE: [], conciliaciones: [],
    ofertas: [], bitacora: []
  };
};

/*
 * Operaciones ya ocurridas en el escenario: órdenes, despachos y recepciones.
 * Cada viaje se describe como [orden, despacho, recepciones].
 */
SILOG.viajesIniciales = [
  // 2da quincena de septiembre, Transportes Cóndor Andino (ejemplos de la documentación)
  { orden: 'A', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-18', vol: 29880 }], multas: [{ id: 2, entrada: 1 }], nota: 'Ejemplo 1: merma mayor que el admisible' },
  { orden: 'A', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 2, conductor: 2, vol: 15000, grupo: 'G4', nota: 'Ejemplo 4: despacho 1 de 2 consolidados' },
  { orden: 'A', terminal: 2, fecha: '2026-09-17', destino: 3, producto: 1, cisterna: 2, conductor: 2, vol: 15000, grupo: 'G4', recGrupo: [{ fecha: '2026-09-19', vol: 29900 }], nota: 'Ejemplo 4: despacho 2 de 2 consolidados' },
  { orden: 'B', terminal: 2, fecha: '2026-09-21', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-22', vol: 18000 }, { fecha: '2026-09-22', vol: 11900 }], nota: 'Ejemplo 5: un despacho en dos recepciones' },
  { orden: 'B', terminal: 2, fecha: '2026-09-23', destino: 4, producto: 2, cisterna: 2, conductor: 2, vol: 25000, rec: [{ fecha: '2026-09-24', vol: 24900 }], nota: 'Ejemplo 8C: diésel a Oruro' },
  { orden: 'B', terminal: 2, fecha: '2026-09-25', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-26', vol: 30040 }], nota: 'Ejemplo 3: demasía' },
  { orden: 'C', terminal: 2, fecha: '2026-09-27', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, tarifaAsociada: 'ALTERNA', rec: [{ fecha: '2026-09-28', vol: 29970 }], nota: 'Tarifa asociada en hoja de ruta (ALTERNA)' },
  { orden: 'C', terminal: 2, fecha: '2026-09-29', destino: 6, producto: 1, cisterna: 2, conductor: 2, vol: 30000, nota: 'En tránsito, sin recepción' },
  // Cisternas del Oriente
  { orden: 'D', terminal: 1, fecha: '2026-09-20', destino: 5, producto: 1, cisterna: 4, conductor: 3, vol: 30000, rec: [{ fecha: '2026-09-21', vol: 29920 }], nota: 'Merma dentro del admisible' },
  { orden: 'D', terminal: 1, fecha: '2026-09-20', destino: 8, producto: 2, cisterna: 5, conductor: 4, vol: 25000, rec: [{ fecha: '2026-09-21', vol: 24850 }], nota: 'Merma no admisible' },
  { orden: 'E', terminal: 1, fecha: '2026-06-10', destino: 5, producto: 1, cisterna: 4, conductor: 3, vol: 30000, rec: [{ fecha: '2026-06-11', vol: 29950 }], nota: 'Recepción con más de 90 días: V1 la oculta' },
  // Logística Altiplano: el contrato marco no tiene saldo presupuestario
  { orden: 'F', terminal: 2, fecha: '2026-09-18', destino: 3, producto: 1, cisterna: 6, conductor: 5, vol: 30000, rec: [{ fecha: '2026-09-19', vol: 29960 }], nota: 'Bloqueo presupuestario' },
  // Fletes Chaco: sin contrato vigente en 2026
  { orden: 'G', terminal: 2, fecha: '2026-09-22', destino: 4, producto: 1, cisterna: 7, conductor: 6, vol: 30000, rec: [{ fecha: '2026-09-23', vol: 29990 }], nota: 'Sin contrato vigente: V1 no lo lista' },
  // Históricos ya conciliados
  { orden: 'H', terminal: 2, fecha: '2026-09-05', destino: 3, producto: 1, cisterna: 1, conductor: 1, vol: 30000, rec: [{ fecha: '2026-09-06', vol: 29930 }], historico: 'Q1SEP' },
  { orden: 'H', terminal: 2, fecha: '2026-09-08', destino: 4, producto: 2, cisterna: 2, conductor: 2, vol: 25000, rec: [{ fecha: '2026-09-09', vol: 24950 }], historico: 'Q1SEP' },
  { orden: 'I', terminal: 1, fecha: '2026-08-20', destino: 5, producto: 1, cisterna: 4, conductor: 3, vol: 30000, rec: [{ fecha: '2026-08-21', vol: 29900 }], historico: 'Q2AGO' }
];

// Oferta y postulaciones de SILOG_DESTINO para el flujo propuesto.
SILOG.ofertaInicial = {
  id: 1, codigo: 'OF-2026-045', origenId: 2, destinoId: 6, productoId: 1, volumen: 90000,
  fechaInicio: '2026-10-05', fechaFin: '2026-10-10', tarifaReferencial: 230, estado: 'PUBLICADA',
  postulaciones: [
    { id: 1, transportistaId: 1, cisternas: 3, volumen: 60000, tarifa: 228, estado: 'POSTULADA' },
    { id: 2, transportistaId: 2, cisternas: 2, volumen: 60000, tarifa: 235, estado: 'POSTULADA' },
    { id: 3, transportistaId: 3, cisternas: 1, volumen: 30000, tarifa: 219, estado: 'POSTULADA' }
  ]
};

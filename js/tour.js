/*
 * Recorrido guiado. El escenario "T. Aprende paso a paso" parte sin operaciones y recorre un viaje
 * completo: tarifa → orden → CRE → recepción → multa → generación → ajustes → recargos → estados →
 * SAP → liberación, comparando V1 con la propuesta.
 *
 * Cada paso: vista, titulo, hacer (qué hacer), porque (para qué), veras (qué debe pasar),
 * sel (selector a resaltar), hecho(st, A) → true cuando el paso se cumplió (si falta, el paso es de
 * lectura y se avanza con "Siguiente"), auto() → lo hace por ti ("Hazlo por mí").
 * Los demás escenarios usan su guion como recorrido de lectura.
 */
window.SILOG = window.SILOG || {};

(function () {
  const M = SILOG.motor;
  const E = () => SILOG.estado;
  const A = () => SILOG.app;
  const estadoEn = (c, e) => c && M.ESTADOS.indexOf(c.estado) >= M.ESTADOS.indexOf(e);
  // Objetos del ejercicio: la última orden de RCBA y lo que nace de ella.
  const T = {
    orden: st => st.ordenes.filter(o => o.terminalId === 2).pop(),
    det: st => { const o = T.orden(st); return o && o.detalles[0]; },
    desp: st => { const d = T.det(st); return d && d.creDespachoId ? M.porId(st.cres, d.creDespachoId) : null; },
    rec: st => { const d = T.desp(st); return d ? M.recepcionesDe(st, d.id)[0] : null; },
    conc: st => { const r = T.rec(st); return r ? M.recepcionConciliada(st, r.id) : null; }
  };
  SILOG.TUTORIAL = T;
  const visitada = v => (E().ui.visitadas || []).includes(v);
  const abrirConc = st => { const c = T.conc(st); if (c) A().vs.conc.concId = c.id; return c; };

  SILOG.TOUR = [
    { vista: 'inicio', titulo: 'Ubícate en el proceso', sel: '.flujo',
      hacer: 'Lee la cadena de 9 pasos de izquierda a derecha. Todos los contadores están en 0: este escenario empieza vacío.',
      porque: 'La conciliación es el ÚLTIMO eslabón: para pagar un flete primero debe existir tarifa, orden, despacho y recepción. Vas a construir cada eslabón.',
      veras: 'Contadores en 0 y 0 conciliaciones.', hecho: () => visitada('inicio') },
    { vista: 'simulador', titulo: 'Averigua qué tarifa tendrá el viaje', sel: '.tabla tr.resaltada',
      hacer: 'Deja los valores por defecto (cisterna 2345-ABC de Transportes Cóndor Andino, Gasolina Especial, RCBA → SNK) y mira la fila resaltada de "Tarifas de la ruta".',
      porque: 'V1 busca la tarifa PRINCIPAL vigente del contrato del transportista para esa ruta y producto. Saberla antes te permite anticipar el pago.',
      veras: 'Tarifa #101 PRINCIPAL 210,00 Bs/m³ (0,21 Bs/L), admisible 0,30 %, y una ALTERNA de 225,00. Vista previa: flete 6.274,80 con recepción de 29.880 L.' },
    { vista: 'tarifario', titulo: 'Mira de dónde sale esa tarifa', sel: '.tabla',
      hacer: 'Busca en "Tarifas (MC_TarifaOT)" la ruta RCBA → SNK, producto GE del contrato CTR-T1-2026.',
      porque: 'Cada tarifa pertenece a una versión del contrato. Si se da de baja, el viaje se queda sin tarifa y V1 paga 0.',
      veras: 'Dos tarifas para la misma ruta: PRINCIPAL 210 y ALTERNA 225.' },
    { vista: 'ordenes', titulo: 'Crea la orden de despacho', sel: '[data-accion="crearOrden"]',
      hacer: 'En "Nueva orden" elige la terminal RCBA, cambia la fecha a 17/09/2026 y pulsa "Crear".',
      porque: 'La orden autoriza que una cisterna cargue en la terminal. Sin orden no hay despacho.',
      veras: 'Una orden nueva "EN ELABORACION" se abre a la derecha, sin detalle.',
      hecho: st => !!T.orden(st),
      auto: () => { const r = E().crearOrden({ terminalId: 2, fecha: '2026-09-17' }); if (r.ok) A().vs.ord.ordenId = r.id; return r; } },
    { vista: 'ordenes', titulo: 'Agrega la cisterna a cargar', sel: '[data-accion="agregarDetalle"]',
      hacer: 'En "Agregar detalle": destino SNK, producto Gasolina Especial, cisterna 2345-ABC, conductor Juan Quispe, volumen 30000. Pulsa "Agregar".',
      porque: 'Cada detalle es un viaje autorizado: quién lleva qué, a dónde y cuánto.',
      veras: 'Una fila con SNK, GE, Transportes Cóndor Andino, 2345-ABC, 30.000 L y "Tarifa del viaje: Por vigencia".',
      hecho: st => !!T.det(st),
      auto: () => { const o = T.orden(E().st); A().vs.ord.ordenId = o.id; return E().agregarDetalleOrden(o.id, { destinoId: 3, productoId: 1, cisternaId: 1, conductorId: 1, volumen: 30000 }); } },
    { vista: 'ordenes', titulo: 'Solicita la aprobación', sel: '[data-accion="estadoOrden"]',
      hacer: 'Elige "Solicitar Aprobacion" en la lista de acciones y pulsa "Cambiar estado".',
      porque: 'Quien arma la orden no la aprueba: hay control por estados.',
      veras: 'Estado "PENDIENTE DE APROBACION".',
      hecho: st => T.orden(st) && T.orden(st).estado !== 'EN ELABORACION',
      auto: () => E().estadoOrden(T.orden(E().st).id, 'Solicitar Aprobacion') },
    { vista: 'ordenes', titulo: 'Aprueba la orden', sel: '[data-accion="estadoOrden"]',
      hacer: 'Elige "Aprobar Orden Despacho" y pulsa "Cambiar estado".',
      porque: 'Al aprobar, V1 asigna el número de orden y envía al transportista la "Nómina Autorizada de Carga" por correo.',
      veras: 'Estado "APROBADO", número de orden y mensaje del correo a operaciones@condor.example.',
      hecho: st => T.orden(st) && ['APROBADO', 'LIBERADO'].includes(T.orden(st).estado),
      auto: () => E().estadoOrden(T.orden(E().st).id, 'Aprobar Orden Despacho') },
    { vista: 'ordenes', titulo: 'Registra la carga (CRE de despacho)', sel: '[data-accion="crearCREs"]',
      hacer: 'Marca la casilla de la fila del detalle, deja la fecha 17/09/2026 y pulsa "Crear CRE de los seleccionados".',
      porque: 'El CRE de despacho certifica lo que se cargó. Será el "lado A" de la comparación.',
      veras: 'La columna "CRE despacho" muestra un número CB-…; la cisterna queda "en tránsito".',
      hecho: st => !!T.desp(st),
      auto: () => { const o = T.orden(E().st); return E().crearCREs(o.id, [o.detalles[0].id], o.fecha); } },
    { vista: 'ordenes', titulo: 'Libera la orden', sel: '[data-accion="estadoOrden"]',
      hacer: 'Elige "Liberar Orden Despacho" y pulsa "Cambiar estado".',
      porque: 'Liberar cierra la orden. V1 no deja liberar una orden sin al menos un CRE.',
      veras: 'Estado "LIBERADO".',
      hecho: st => T.orden(st) && T.orden(st).estado === 'LIBERADO',
      auto: () => E().estadoOrden(T.orden(E().st).id, 'Liberar Orden Despacho') },
    { vista: 'cre', titulo: 'Registra la llegada (CRE de recepción)', sel: '[data-accion="registrarRecepcion"]',
      hacer: 'Marca el despacho "En tránsito", pon la fecha 18/09/2026 y el volumen recibido 29880. Pulsa "Registrar recepción".',
      porque: 'La recepción es el "lado B". Llegaron 120 L menos de los cargados: eso es la merma que se va a evaluar.',
      veras: 'Una recepción SK-… de 29.880 L asociada al despacho.',
      hecho: st => !!T.rec(st),
      auto: () => { const d = T.desp(E().st); return E().registrarRecepcion([d.id], '29880', M.sumarDias(d.fecha, 1)); } },
    { vista: 'multas', titulo: 'Registra un incumplimiento', sel: '[data-accion="registrarMultas"]',
      hacer: 'Elige tu CRE de despacho, escribe 1 en "Multa por día de retraso (MDR)" y pulsa "Registrar".',
      porque: 'Las multas por incidentes se cargan sobre el despacho. Veremos que en V1 NO llegan al neto.',
      veras: 'Total multas 348,00 (1 día × 50 Sus × TC 6,96).',
      hecho: st => { const d = T.desp(st); return !!d && st.multasCRE.some(m => m.creId === d.id); },
      auto: () => E().registrarMultasCRE(T.desp(E().st).id, { 2: 1 }, 6.96) },
    { vista: 'sinconciliar', titulo: 'Genera la conciliación', sel: '[data-accion="generar"]',
      hacer: 'Con el área RCBA, abre "¿Cómo se calculó?" en la línea de tu recepción. Luego marca la casilla de "Transportes Cóndor Andino SRL" y pulsa "Generar".',
      porque: 'Aquí se calcula todo: admisible (0,30 % de 30.000 = 90 L), balance (−120 L), crédito/débito (−30 L), flete (29.880 × 0,21).',
      veras: 'Línea: flete 6.274,80; C/D −30 L = −143,70; total 6.131,10. Mensaje "CONCILIACIONES GENERADAS CORRECTAMENTE: N° 1001".',
      hecho: st => !!T.conc(st),
      auto: () => {
        const st = E().st, r = T.rec(st);
        const g = M.recepcionesSinConciliar(st, 3, 'V1').grupos.find(x => x.recepciones.some(y => y.recepcion.id === r.id));
        const res = E().generar(3, [{ clave: g.clave, marcado: true, moneda: g.contrato ? g.contrato.moneda : '', recepciones: g.recepciones.map(y => y.recepcion.id) }]);
        if (res.ok) A().vs.conc.concId = res.ids[0];
        return res;
      } },
    { vista: 'conciliaciones', titulo: 'Abre tu conciliación', sel: 'tr[data-accion="verConc"]',
      hacer: 'Pulsa la fila N° 1001 del listado y revisa "Totales", "Por producto" e "Historial".',
      porque: 'La conciliación resume lo que se pagará al transportista en la quincena.',
      veras: 'Neto flete 6.274,80; mermas −143,70; neto conciliado 6.131,10. "Multas por CRE −348,00" figura como Informativo (no entra al neto en V1).',
      hecho: st => { const c = T.conc(st); return !!c && A().vs.conc.concId === c.id; },
      auto: () => { abrirConc(E().st); return { ok: true, msg: 'Conciliación abierta.' }; } },
    { vista: 'conciliaciones', titulo: 'Usa la tarifa alterna', sel: '[data-prioridad="ALTERNA"]',
      hacer: 'En la línea, columna "Cambiar tarifa", pulsa "A".',
      porque: 'Si el camión tomó la ruta alternativa (por ejemplo un desvío), corresponde la tarifa ALTERNA del contrato.',
      veras: 'Tarifa 0,22500, fuente "CONTRATO ALTERNA", flete 6.723,00.',
      hecho: st => { const c = T.conc(st); return !!c && c.lineas.some(l => l.tarifaFuente === 'CONTRATO ALTERNA'); },
      auto: () => { const c = abrirConc(E().st); return E().cambiarTarifaLinea(c.id, c.lineas[c.lineas.length - 1].key, 'ALTERNA'); } },
    { vista: 'recargos', titulo: 'Aplica una multa del contrato', sel: '[data-accion="alternarRecargo"]',
      hacer: 'En "Entrega tardía de documentación de despacho", marca tu CRE de despacho.',
      porque: 'Las multas contractuales (CCIST) sí entran al neto en V1, a diferencia de las multas por CRE.',
      veras: '"Multa transporte (CCIST)" −100,00 en "Efecto en el neto".',
      hecho: st => { const c = T.conc(st); return !!c && c.recargos.some(r => r.catalogoId === 1); },
      auto: () => { const c = abrirConc(E().st); return E().alternarRecargo(c.id, 1, T.desp(E().st).id); } },
    { vista: 'conciliaciones', titulo: 'Procesa', sel: '[data-accion="procesar"]',
      hacer: 'Pulsa "Calcular y procesar".',
      porque: 'Guarda los totales con todos los ajustes. Hasta aquí todo era editable.',
      veras: '"CONCILIACIÓN PROCESADA CORRECTAMENTE." Neto conciliado 6.479,30 (6.723,00 − 143,70 − 100,00).',
      hecho: st => { const c = T.conc(st); return !!c && !!c.procesada; },
      auto: () => E().procesar(abrirConc(E().st).id) },
    { vista: 'conciliaciones', titulo: 'Envíala al transportista', sel: '#conc-accion',
      hacer: 'Elige "Solicitar Aprob. Transportista" en "Acción" y pulsa "Cambiar estado".',
      porque: 'El transportista debe aceptar el monto antes de que se pida el pago en SAP.',
      veras: 'Estado "En Aprobacion de Transportista". Ya no puedes editar los ajustes.',
      hecho: st => estadoEn(T.conc(st), 'En Aprobacion de Transportista'),
      auto: () => E().transicion(abrirConc(E().st).id, 'Solicitar Aprob. Transportista') },
    { vista: 'ot', titulo: 'Mírala en la pantalla nueva de V1', sel: '[data-ot-sel]',
      hacer: 'Filtros: Cisterna, RCBA, Septiembre 2026, 2da quincena. Marca la casilla de la N° 1001. No pulses ✔ todavía.',
      porque: '"Conciliación Otros Transportes" es la pantalla más nueva de V1: una fila por recepción y permisos finos. Ahí el botón ✔ lo pulsa logística en nombre del transportista (defecto D22).',
      veras: 'La N° 1001 "En Aprobacion de Transportista" con ✔ y su detalle por recepción.',
      hecho: st => { const c = T.conc(st); return !!c && A().vs.ot.concId === c.id; },
      auto: () => { const c = T.conc(E().st); Object.assign(A().vs.ot, { tipo: 'Cisterna', area: c.area, mes: c.mes, anio: c.anio, quincena: c.quincena, transportistaId: 0, fi: '', ff: '', concId: c.id }); return { ok: true, msg: 'Filtros ajustados y conciliación marcada.' }; } },
    { vista: 'portal', titulo: 'Aprueba como transportista', sel: '[data-a="Transportista Aprueba"]',
      hacer: 'Cambia el usuario a "Transportista" en la cabecera (opcional en modo V1), elige la empresa Transportes Cóndor Andino SRL y pulsa "Aprobar".',
      porque: 'Con la aprobación, V1 prepara el registro para SAP y avisa que se puede crear el pedido de compra.',
      veras: 'Estado "Aprobada Por Transportista" y registro SAP "CT 1001 9/26" en "Sin Registrar en SAP".',
      hecho: st => estadoEn(T.conc(st), 'Aprobada Por Transportista'),
      auto: () => { A().vs.portal.transportistaId = 1; return E().transicion(abrirConc(E().st).id, 'Transportista Aprueba'); } },
    { vista: 'sap', titulo: 'Crea el pedido en SAP', sel: '[data-a="Crear pedido"]',
      hacer: 'Selecciona la N° 1001 y pulsa "Crear pedido".',
      porque: 'Para pagar al transportista, compras necesita un pedido en SAP por el flete de cada producto.',
      veras: 'SAP "Pendiente de Liberación" con número de pedido; la conciliación pasa a "Pendiente de Aprobacion".',
      hecho: st => { const c = T.conc(st); return !!c && !!c.sap && c.sap.estado !== 'Sin Registrar en SAP'; },
      auto: () => E().sapAccion(abrirConc(E().st).id, 'Crear pedido') },
    { vista: 'sap', titulo: 'Completa el circuito SAP', sel: '[data-accion="sapAccion"]:not([disabled])',
      hacer: 'Pulsa en orden "Liberar pedido", "Registrar hoja de entrada" y "Liberar hoja".',
      porque: 'La hoja de entrada de servicio confirma que el transporte se prestó. Al liberarla, SAP acepta y V1 libera la conciliación.',
      veras: 'SAP "Aceptado" y conciliación "Liberado". ¡Viaje pagado!',
      hecho: st => { const c = T.conc(st); return !!c && c.estado === 'Liberado'; },
      auto: () => { const c = abrirConc(E().st); let r; ['Liberar pedido', 'Registrar hoja de entrada', 'Liberar hoja'].forEach(a => { if (c.estado !== 'Liberado') r = E().sapAccion(c.id, a); }); return r; } },
    { vista: 'conciliaciones', titulo: 'Compara con la propuesta', sel: '#modo',
      hacer: 'Cambia el "Modo" de la cabecera a "Propuesto" y mira los totales de la N° 1001.',
      porque: 'En la propuesta todo cobro entra al neto: la multa por CRE de 348,00 ya no es "informativa".',
      veras: 'Neto 6.131,30 en modo propuesto (6.479,30 − 348,00) frente a 6.479,30 en V1.',
      hecho: () => E().ui.modo === 'PROPUESTO',
      auto: () => E().setModo('PROPUESTO') },
    { vista: 'mejoras', titulo: 'Lo que aprendiste y lo que cambiaremos', sel: '.tabla',
      hacer: 'Lee los defectos D13 (multas fuera del neto), D5 (no se guarda qué tarifa se usó) y D22 (aprobación sin el transportista). Luego explora "Flujo propuesto DESTINO → LEGACY".',
      porque: 'Cada defecto es una decisión de diseño para el sistema nuevo.',
      veras: 'La tabla de defectos con dónde verlos en el prototipo. ¡Fin del recorrido!' }
  ];

  // Escenario de aprendizaje: empieza sin operaciones.
  SILOG.ESCENARIOS.unshift({
    id: 'T', letra: 'T', nombre: 'T. Aprende paso a paso (recorrido guiado)',
    objetivo: 'Partir de cero y construir un viaje completo, desde la orden de despacho hasta la liberación por SAP, con una guía que indica qué hacer, dónde hacer clic, por qué y qué se debe ver.',
    viajes: [],
    ajustes: 'Sin operaciones: solo catálogos. Usa el botón "Guía" de la cabecera o "Iniciar recorrido guiado".',
    tour: SILOG.TOUR,
    guion: SILOG.TOUR.map(p => ({ vista: p.vista, paso: p.hacer, esperado: p.veras }))
  });

  // Recorrido de cualquier escenario: el propio o su guion como pasos de lectura.
  SILOG.tourDe = esc => esc.tour || esc.guion.map(p => ({ vista: p.vista, titulo: 'Paso del guion', hacer: p.paso, veras: p.esperado,
    porque: 'Sigue el guion del escenario; compara lo que ves con el resultado esperado.' }));
})();

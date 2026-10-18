/* Registro de guías. El escenario T se completa con los módulos conectados al cargar sus pasos. */
window.SILOG = window.SILOG || {};
(function () {
  SILOG.TOUR = [];
  SILOG.ESCENARIOS.unshift({
    id: 'T', letra: 'T', nombre: 'T. Aprende paso a paso (recorrido guiado)',
    objetivo: 'Construir el mismo expediente desde contrato/adenda, solicitud y hoja de ruta hasta CRE, conciliación, facturas y SAP; estudiar aparte pago y cierre propuestos, con hechos, problemas y mejoras.',
    viajes: [],
    ajustes: 'Guía conectada desde cero. Preparar el ejercicio archiva el recorrido operativo anterior si existe, sin borrarlo. No se copian documentos del simulador general ni se realizan operaciones reales.',
    tour: SILOG.TOUR, guion: []
  });
  SILOG.tourDe = esc => esc.tour || esc.guion.map(p => ({ vista: p.vista, titulo: 'Paso del guion', hacer: p.paso, veras: p.esperado,
    porque: 'Sigue el guion del escenario; compara lo que ves con el resultado esperado.' }));
})();

/*
 * Contenido didáctico del prototipo.
 *  SILOG.INTRO_VISTAS: panel "Cómo usar esta pantalla" de cada vista.
 *  SILOG.AYUDA: explicación de cada control marcado con data-ayuda="clave" (modo ayuda).
 * Campos: que (qué es), para (para qué sirve), clic (qué pasa al usarlo), v1 (cómo es en SILOG_V1),
 * ux (lección para el rediseño).
 */
window.SILOG = window.SILOG || {};

SILOG.INTRO_VISTAS = {
  guion: {
    proposito: 'Lista los pasos del escenario elegido, con lo que debe pasar en cada uno. Sirve para estudiar un flujo concreto de principio a fin y comprobar que entendiste las reglas.',
    quien: 'Tú, como estudiante del sistema. No existe en V1.',
    cuando: 'Al empezar un escenario o para retomarlo.',
    pasos: ['Elige un escenario en la cabecera ("Escenario de prueba"). Para aprender desde cero, elige "T. Aprende paso a paso".', 'Pulsa "Iniciar recorrido guiado": una tarjeta te dirá qué hacer y resaltará dónde hacer clic.', 'Si prefieres ir solo, sigue la tabla: el enlace de la columna "Vista" te lleva a la pantalla y la columna "Resultado esperado" te dice qué debes ver.', 'Marca cada paso como hecho. "Reiniciar este escenario" vuelve todo a cero.'],
    observar: ['Los montos esperados están verificados automáticamente: si ves otro número, algo hiciste distinto (y vale la pena entender qué).'],
    ux: ['Un sistema nuevo debería traer guías y datos de práctica como estos: reduce la capacitación y los errores.']
  },
  inicio: {
    proposito: 'Muestra el proceso completo de la conciliación como una cadena de 9 pasos, con contadores en vivo del escenario.',
    quien: 'Cualquiera que quiera ubicarse.',
    cuando: 'Al empezar o para ver en qué punto está cada cosa.',
    pasos: ['Lee la cadena de izquierda a derecha: así viaja la información, desde la tarifa hasta SAP.', 'Pulsa cualquier paso para ir a su pantalla.', 'Mira "Conciliaciones por estado" para saber cuántas hay en cada etapa.'],
    observar: ['Cada paso depende del anterior: sin tarifa no hay flete, sin recepción no hay conciliación, sin aprobación del transportista no hay pedido SAP.'],
    ux: ['V1 no tiene una vista así: el usuario debe saber de memoria qué pantalla sigue. Un tablero de proceso con pendientes por etapa es una mejora clara.']
  },
  simulador: {
    proposito: 'Responde "¿de dónde a dónde va un viaje, qué tarifa le toca y cuánto se pagaría?". Busca la tarifa igual que V1 y calcula una vista previa.',
    quien: 'Analista de logística que planifica o verifica una ruta.',
    cuando: 'Antes de despachar o para explicar un monto.',
    pasos: ['Elige cisterna (eso define el transportista), producto, origen y destino.', 'Mira el mapa y la tabla "Tarifas de la ruta": la fila resaltada es la que V1 usaría.', 'Cambia el volumen recibido y observa la vista previa: admisible, balance, crédito/débito, flete.', 'Opcional: "Ejecutar viaje completo" crea orden, despacho y recepción de una vez.'],
    observar: ['La tarifa se busca por la fecha de RECEPCIÓN (no la de despacho).', 'Si no hay tarifa, V1 usa 0: flete 0 y admisible 0 (toda la merma se cobra).'],
    ux: ['V1 no tiene simulador: el monto solo se conoce al conciliar. Mostrar la tarifa y el pago estimado al planificar evita sorpresas y reclamos.']
  },
  localidades: {
    proposito: 'Maestro de plantas, refinerías y terminales. Es la referencia geográfica de rutas, tarifas y áreas.',
    quien: 'Administración de datos maestros.',
    cuando: 'Al crear una planta o revisar a qué área pertenece.',
    pasos: ['Revisa el código y el área de conciliación de cada localidad.', 'Ubícala en el mapa.'],
    observar: ['El ÁREA (RSCZ o RCBA) de una conciliación sale de la localidad de ORIGEN del viaje.', 'Una localidad extranjera (Arica) convierte la conciliación en "internacional" y cambia el precio de multa.'],
    ux: ['DESTINO debe usar estas mismas localidades (por ID) en vez de sus nodos propios, para que oferta, orden y conciliación hablen de la misma ruta.']
  },
  tarifario: {
    proposito: 'Muestra los contratos y las tarifas por ruta: origen → destino, producto, Bs por m³, admisible % y prioridad.',
    quien: 'Contratos / logística.',
    cuando: 'Para entender por qué un viaje tiene cierta tarifa.',
    pasos: ['Filtra por transportista.', 'Mira la tabla de contratos: vigencia, moneda y contrato marco (presupuesto).', 'Mira la tabla de tarifas: hay PRINCIPAL y ALTERNA para la misma ruta.', 'Prueba "Dar de baja" una tarifa y vuelve a "Detalle sin conciliar" para ver el efecto.'],
    observar: ['La tarifa está en Bs por m³; el cálculo la divide entre 1.000 para tener Bs por litro.', 'El admisible % es la merma tolerada sin cobro.'],
    ux: ['En V1 la tarifa vive dentro de la versión del contrato y no guarda qué tarifa se usó en cada viaje. El rediseño debe guardar la tarifa aplicada y su origen (adjudicada en oferta, contrato, especial).']
  },
  precios: {
    proposito: 'Precio con el que se cobra la merma que supera el admisible.',
    quien: 'Comercial / logística.',
    cuando: 'Para entender el valor en Bs de un crédito/débito.',
    pasos: ['Mira el precio de multa vigente por producto.', 'Compara nacional e importado.'],
    observar: ['Se usa el precio vigente a la FECHA DE CARGA del despacho.'],
    ux: ['Mostrar en cada línea el precio usado y su vigencia (V1 lo guarda pero no lo explica).']
  },
  ordenes: {
    proposito: 'La orden de despacho autoriza la carga de cada cisterna en una terminal hacia un destino. De ella nace el CRE de despacho.',
    quien: 'Programación / terminal.',
    cuando: 'Cada día de despacho.',
    pasos: ['Crea una orden (terminal y fecha) o abre una de la lista.', 'Agrega el detalle: destino, producto, cisterna, conductor y volumen.', 'Cambia de estado: Solicitar aprobación → Aprobar (asigna número y avisa por correo al transportista).', 'Marca detalles y pulsa "Crear CRE de los seleccionados".', 'Libera la orden (exige al menos un CRE).'],
    observar: ['Solo se crean CRE juntos si coinciden producto, empresa y destino.', 'La columna "Tarifa del viaje" muestra si viene de la hoja de ruta (asociada) o de DESTINO (adjudicada, propuesta).'],
    ux: ['En DESTINO la nominación debería crear esta orden automáticamente, con la tarifa adjudicada, en vez de digitarla.']
  },
  cre: {
    proposito: 'El CRE es el certificado de cada operación. El despacho (tipo 3) registra lo cargado; la recepción (tipo 8) lo recibido. La conciliación compara ambos.',
    quien: 'Operadores de terminal y planta.',
    cuando: 'Al cargar y al descargar.',
    pasos: ['Mira los despachos: "En tránsito" significa que aún no llegaron.', 'Marca uno o varios despachos de la misma cisterna.', 'Escribe la fecha y el volumen recibido (si descargó en varios tanques, separa con coma) y pulsa "Registrar recepción".', 'Revisa la tabla de recepciones y a qué despachos quedó asociada.'],
    observar: ['Varios despachos en una recepción = consolidación. Un despacho en varios volúmenes = reparto (prorrateo).'],
    ux: ['La asociación despacho–recepción debería ser una entidad "viaje" visible, no una tabla oculta.']
  },
  multas: {
    proposito: 'Registra multas por incumplimiento sobre un CRE de despacho (retrasos, conductor no certificado, filtración…).',
    quien: 'Supervisión de transporte.',
    cuando: 'Cuando hubo un incidente en el viaje.',
    pasos: ['Elige el CRE de despacho.', 'Escribe cantidades (días, conductores) o marca las multas fijas.', 'Revisa el total y pulsa "Registrar".'],
    observar: ['Solo se puede si la conciliación de ese despacho no existe o está "En Elaboracion".', 'En V1 procesado las multas clásicas por CRE se suman con las contractuales dentro de Multa Transporte; sí afectan al neto y no deben descontarse otra vez.'],
    ux: ['Unificar todos los cobros (multas por CRE y contractuales) en un solo catálogo de recargos que siempre entre al neto.']
  },
  sinconciliar: {
    proposito: 'Lista las recepciones que todavía no están en ninguna conciliación, agrupadas por transportista y quincena, y calcula cada línea. Desde aquí se GENERA la conciliación.',
    quien: 'Analista de conciliaciones.',
    cuando: 'Al cierre de cada quincena.',
    pasos: ['Elige el área (RSCZ, RCBA o Todas).', 'Revisa cada grupo (transportista + quincena) y sus recepciones; abre "¿Cómo se calculó?" en una línea.', 'Marca el grupo (casilla junto al nombre) y deja marcadas las recepciones a incluir.', 'Pulsa "Generar": se crea la conciliación "En Elaboracion".'],
    observar: ['Cada línea es un par despacho–recepción. El balance y el flete van en la ÚLTIMA línea de cada recepción.', 'Abajo verás las recepciones que V1 oculta (más de 90 días o sin contrato).'],
    ux: ['V1 muestra 25 columnas a la vez: el rediseño debería resumir por recepción y dejar el detalle bajo demanda, como en "¿Cómo se calculó?".']
  },
  conciliaciones: {
    proposito: 'Revisa una conciliación generada, aplica ajustes, la procesa y la hace avanzar de estado.',
    quien: 'Analista y jefe de logística.',
    cuando: 'Después de generar, hasta enviarla al transportista.',
    pasos: ['Pulsa una fila del listado para abrir la conciliación.', 'Lee "Totales" y "Por producto"; abre "¿Cómo se calculó esta línea?".', 'Si corresponde, ajusta: liberar capacidad, tarifa especial, liberar merma o cambiar a tarifa P/A.', 'Pulsa "Calcular y procesar" para guardar los totales.', 'Elige la acción "Solicitar Aprob. Transportista" y pulsa "Cambiar estado".'],
    observar: ['Las demasías compensan mermas del mismo producto, pero nunca se pagan.', 'En modo V1 algunas acciones están "comentadas": existen en el código pero V1 no las ofrece.'],
    ux: ['Los ajustes deberían pedir motivo y adjunto y quedar auditados; los estados deberían mostrar quién y qué sigue.']
  },
  generales: {
    proposito: 'Consulta el listado transversal de conciliaciones generadas, sin repetir el cálculo ni el detalle de cada conciliación.',
    quien: 'Analista, jefe de logística y usuarios que necesitan trazabilidad.',
    cuando: 'Cuando se necesita localizar una conciliación por tipo, periodo o estado y saber quién intervino.',
    pasos: ['Selecciona el tipo de conciliación, mes, año y estado.', 'Lee el neto conciliado y la traza resumida de responsables.', 'Pulsa "Ver detalle" para abrir la conciliación cisterna existente y consultar sus líneas, ajustes e historial.'],
    observar: ['Los tipos que V1 contempla pero que no tienen datos en este prototipo aparecen identificados y no se inventan filas.', 'La traza resume generación, aprobación del transportista, aprobación LOG, rechazo y liberación cuando esos eventos existen.'],
    ux: ['Una bandeja transversal evita obligar al usuario a recordar qué pantalla origina cada tipo de conciliación; el detalle sigue siendo la fuente para operar.']
  },
  ot: {
    proposito: 'Pantalla unificada (cisterna, barcaza, vagón) para revisar, editar y aprobar conciliaciones, con permisos finos por usuario. Parece la versión más nueva de la pantalla de conciliación.',
    quien: 'Analistas y jefes con permisos en CONFIGURACION_CONCILIACIONES.',
    cuando: 'Igual que "Conciliación cisterna".',
    pasos: ['Lee el recuadro "¿Qué hago ahora?": dice el paso actual, lo resalta en la pantalla con borde ámbar punteado ("Mostrar dónde") y lista las alternativas.', 'Los círculos ámbar numerados (1 a 8) marcan dónde se hace cada paso: 1 filtros, 2 casilla de la fila, 3 detalle, 4 Procesar, 5-6-8 botón ✔, 7 facturas.', 'Marca la casilla de una conciliación para ver su detalle: una fila por recepción. 🔎 muestra de dónde viene cada dato.', 'Corrige (tarifa de la lista, liberar merma, capacidad, tarifa especial, 🗑, "Nuevo convoy") y pulsa "Procesar".', 'Usa ✔ para avanzar de estado o ✖ para devolverla; después de la aceptación del transportista, el pedido se crea en "Contabilización y SAP" y la conciliación vuelve aquí para la liberación.', 'Si no ves un botón, revisa tus permisos al pie (cambia el rol en la cabecera).'],
    observar: ['Aquí la "aprobación del transportista" la pulsa un usuario de logística (defecto D22).', 'La tarifa de la fila es el PROMEDIO de sus líneas.'],
    ux: ['Buena idea de V1: permisos finos por acción. El prototipo mantiene los botones visibles pero deshabilitados hasta marcar la fila, mostrando el motivo en el título; así el usuario entiende qué le falta hacer.']
  },
  otmapa: {
    proposito: 'Explica Otros Transportes de principio a fin con dos orígenes separados: las 17 etapas generales o los 18 hitos conectados, hasta facturas, SAP y estudio de pago/cierre. Nunca se acredita un pago real por avanzar en el mapa.',
    quien: 'Quien necesita entender el proceso completo antes de usar la pantalla o rediseñarla.',
    cuando: 'Antes de trabajar en "Conciliación Otros Transportes" o cuando no sabes qué sigue.',
    pasos: ['Elige el origen: Escenarios generales o Mis documentos; un ID igual no significa que sea el mismo documento.', 'Selecciona la conciliación de ese origen. En Mis documentos, consulta sus solicitudes/HR, órdenes y CRE por sus relaciones.', 'Abre la sección de facturas: referencias, requisito SQL, cobros y propuesta documental separada.', 'En las guías O/T, Estudiar facturas de este ejemplo abre el mapa con la conciliación del escenario; no la copia al recorrido conectado.', 'Consulta los límites antes de interpretar una etiqueta como un paso completado o un pago real.'],
    observar: ['La conciliación nace en "Detalle sin conciliar" (etapa 6 general), no en Otros Transportes.', 'Entre la aceptación del transportista y la liberación, la conciliación sale a SAP (pedido) y vuelve.', 'Pagos Logística abre un reporte de costos. El retorno financiero no se localizó en el circuito revisado; abonos/cierre se estudian como propuesta.'],
    ux: ['V1 no muestra este camino: el usuario debe saber de memoria qué pantalla sigue. El sistema nuevo debería mostrar en cada conciliación su etapa, el responsable y la siguiente acción.']
  },
  recargos: {
    proposito: 'Agrega a la conciliación multas y descuentos del contrato, casos especiales (p. ej. pérdida por accidente) y cobros por carro guía.',
    quien: 'Analista de conciliaciones.',
    cuando: 'Antes de procesar, con la conciliación en elaboración.',
    pasos: ['Marca las multas o descuentos que correspondan (por despacho o por conciliación).', 'Agrega casos especiales o carro guía con monto y factura.', 'Revisa "Efecto en el neto" en modo V1 y en modo propuesto.'],
    observar: ['V1 procesado incluye multas CRE y contractuales dentro de Multa Transporte; MC/DC/casos/carro guía se suman al total visual OT pero no al NetoConciliado guardado de cisterna (D29). Abre el panel de cálculos para compararlos.'],
    ux: ['Un neto que no incluye todo lo que se cobra confunde a todos: en el rediseño, todo recargo es una línea del neto.']
  },
  sap: {
    proposito: 'Muestra lo que se envía a SAP y simula el circuito real que termina liberando la conciliación: pedido → liberar pedido → hoja de entrada → liberar hoja.',
    quien: 'Contabilidad / compras.',
    cuando: 'Después de la aprobación del transportista.',
    pasos: ['Elige una conciliación de la lista.', 'Sigue los botones en orden (solo se habilita el que corresponde al estado SAP).', 'Observa cómo cambia el estado de la conciliación con "Crear pedido" y "Liberar hoja".'],
    observar: ['Anular la aceptación en SAP NO revierte la conciliación (D20).'],
    ux: ['La integración debería ser automática (bandeja de salida con reintentos) y mostrar el estado SAP dentro de la conciliación.']
  },
  portal: {
    proposito: 'Lo que ve el transportista: sus conciliaciones, para aprobarlas o rechazarlas.',
    quien: 'Transportista.',
    cuando: 'Cuando logística le solicita aprobación.',
    pasos: ['Elige la empresa.', 'Selecciona la conciliación en "En Aprobacion de Transportista".', 'Revisa el detalle y pulsa Aprobar o Rechazar.'],
    observar: ['En V1 cualquier usuario con el permiso puede aprobar en nombre del transportista.'],
    ux: ['Portal autenticado del transportista, con disputa por línea y comentarios, en vez de aprobar o rechazar todo.']
  },
  destino: {
    proposito: 'Propuesta (no existe en V1): cómo la tarifa por ruta de una oferta de DESTINO llega hasta la conciliación.',
    quien: 'Programación de transporte (DESTINO) y logística (LEGACY).',
    cuando: 'Al publicar una oferta de transporte.',
    pasos: ['Lee la oferta (ruta, volumen, tarifa referencial).', 'Cambia la tarifa propuesta de una empresa y mira el ranking.', 'Pulsa "Nominar y enviar a LEGACY": se crea la orden con la tarifa adjudicada.', 'Sigue el viaje y concilia en modo V1 y en modo propuesto para comparar.'],
    observar: ['En modo V1 la conciliación ignora la tarifa adjudicada.'],
    ux: ['Este es el puente que justifica la reingeniería: una sola tarifa, acordada en la oferta, usada hasta el pago.']
  },
  reglas: { proposito: 'Catálogo de reglas de negocio de V1 con su evidencia en el código.', quien: 'Analistas y desarrolladores.', cuando: 'Para justificar un comportamiento.', pasos: ['Busca por palabra (tarifa, merma, estado…).', 'Usa "Abrir" para ir a la pantalla donde se ve la regla.'], observar: ['[C] = comprobada en código; [I] = inferida (validar con usuarios).'], ux: ['Cada regla debería convertirse en una prueba automática del sistema nuevo.'] },
  ejemplos: { proposito: 'Calculadora paso a paso de una recepción, con casos reales típicos.', quien: 'Quien quiera entender el cálculo.', cuando: 'Para estudiar o explicar un monto.', pasos: ['Elige un ejemplo (cada uno trae su historia).', 'Cambia volúmenes, tarifa o ajustes y abre "Pasos".'], observar: ['Los resultados coinciden con la sección 5 del documento de reglas.'], ux: ['Mostrar este "porqué" del monto al transportista evita reclamos.'] },
  mejoras: { proposito: 'Defectos encontrados en V1 y cómo resolverlos.', quien: 'Equipo de reingeniería.', cuando: 'Al diseñar el sistema nuevo.', pasos: ['Lee cada defecto y dónde verlo en el prototipo.'], observar: ['Muchos defectos son de diseño (datos guardados como texto, lógica en pantallas).'], ux: ['Priorizar los que afectan dinero y confianza: tarifa no guardada, neto incompleto, aprobación sin el transportista.'] },
  fuentes: { proposito: 'De dónde salió cada parte del prototipo en SILOG_V1.', quien: 'Desarrolladores.', cuando: 'Para verificar o profundizar.', pasos: ['Filtra por tipo (tabla, procedimiento…).', 'Abre un objeto SQL con su enlace.'], observar: ['No hay triggers en V1.'], ux: ['Documentar el origen de cada dato desde el inicio del proyecto nuevo.'] },
  glosario: { proposito: 'Términos del dominio.', quien: 'Todos.', cuando: 'Ante una palabra desconocida.', pasos: ['Lee los términos.'], observar: [], ux: ['Usar estos mismos términos en la interfaz nueva.'] },
  bitacora: { proposito: 'Registro de todo lo que hiciste en el prototipo.', quien: 'Tú.', cuando: 'Para revisar qué pasó.', pasos: ['Revisa usuario, rol, modo y detalle.'], observar: [], ux: ['Una auditoría legible para el usuario, no solo SQL en otra base (como V1).'] }
};

SILOG.AYUDA = {
  // Cabecera y navegación
  escenario: { t: 'Escenario de prueba', que: 'Juego de datos independiente con su propio guion.', para: 'Practicar un flujo concreto sin mezclarlo con otros.', clic: 'Carga el escenario desde cero (pide confirmación).', v1: 'No existe: V1 trabaja sobre la base real.', ux: 'Un ambiente de práctica con datos de ejemplo acelera la capacitación.' },
  modo: { t: 'Modo V1 / Propuesto', que: 'Cambia las reglas que aplica el motor.', para: 'Comparar cómo funciona hoy y cómo debería funcionar.', clic: 'Recalcula todas las pantallas con las reglas elegidas.', v1: 'Solo existe el comportamiento "V1".', ux: 'Ver el antes y después ayuda a justificar cada cambio del rediseño.' },
  rol: { t: 'Usuario simulado', que: 'El rol con el que actúas.', para: 'Ver qué puede hacer cada perfil (permisos).', clic: 'Cambia permisos en el modo propuesto y en "Otros Transportes".', v1: 'Los roles vienen de la seguridad externa (actividades).', ux: 'Mostrar al usuario qué puede hacer y por qué no puede otra cosa.' },
  reiniciar: { t: 'Reiniciar escenario', que: 'Vuelve el escenario a sus datos iniciales.', para: 'Repetir un ejercicio.', clic: 'Borra tus cambios y desmarca los pasos.', v1: 'No existe.', ux: '' },
  ayudaModo: { t: 'Modo ayuda', que: 'Convierte cada clic en una explicación.', para: 'Aprender qué hace cada elemento sin ejecutarlo.', clic: 'Mientras está activo, los clics sobre elementos con borde punteado explican en vez de actuar.', v1: 'V1 no tiene ayuda en pantalla (solo manuales PDF).', ux: 'Ayuda contextual en la interfaz nueva.' },
  guia: { t: 'Recorrido guiado', que: 'Tarjeta que te lleva paso a paso.', para: 'Aprender el flujo completo haciendo.', clic: 'Abre o cierra la tarjeta del recorrido.', v1: 'No existe.', ux: '' },
  fuentesPanel: { t: 'Fuentes en SILOG_V1', que: 'Lista de pantallas, código, procedimientos y tablas de V1 de donde sale esta pantalla.', para: 'Verificar y profundizar en el código real.', clic: 'Despliega la tabla; los objetos SQL abren su copia extraída.', v1: '—', ux: 'Trazabilidad entre requisito, regla y código.' },
  introPanel: { t: 'Cómo usar esta pantalla', que: 'Propósito, pasos, qué observar y lecciones de diseño.', para: 'Saber qué hacer aquí y por qué existe.', clic: 'Se despliega o se pliega.', v1: '—', ux: '' },
  // Simulador
  simCisterna: { t: 'Cisterna', que: 'Camión cisterna; define el transportista y la capacidad.', para: 'Saber qué contrato y tarifas aplican.', clic: 'Recalcula tarifas y vista previa.', v1: 'Se elige en la orden de despacho.', ux: 'Elegir primero la empresa y luego sus cisternas habilitadas.' },
  simRuta: { t: 'Origen y destino', que: 'Localidades del viaje.', para: 'La tarifa se define por ruta y producto.', clic: 'Dibuja la ruta en el mapa y busca la tarifa.', v1: 'Origen = terminal de la orden; destino = planta receptora.', ux: '' },
  simVolumen: { t: 'Volúmenes', que: 'Litros despachados y recibidos.', para: 'Calcular merma, admisible y flete.', clic: 'Actualiza la vista previa.', v1: 'Salen de los CRE (volumen consolidado).', ux: 'Mostrar la diferencia en litros y en dinero en el momento de la recepción.' },
  simEjecutar: { t: 'Ejecutar viaje completo', que: 'Crea orden aprobada, CRE de despacho, CRE de recepción y su asociación.', para: 'Tener rápidamente un viaje listo para conciliar.', clic: 'El viaje aparece en "Detalle sin conciliar".', v1: 'Son 3 pantallas y varios usuarios.', ux: '' },
  simTarifas: { t: 'Tarifas de la ruta', que: 'Todas las tarifas de esa ruta y producto, de todos los transportistas.', para: 'Ver cuál aplica (resaltada) y por qué.', clic: '—', v1: 'MC_DevolverTarifaVigente_OT busca la PRINCIPAL vigente a la fecha de recepción.', ux: '' },
  // Tarifario
  tarBaja: { t: 'Dar de baja / Activar', que: 'Desactiva una tarifa.', para: 'Ver qué pasa cuando falta una tarifa.', clic: 'Las conciliaciones nuevas dejan de encontrarla (flete 0 si no hay otra).', v1: 'Se hace en la versión del contrato.', ux: 'Avisar qué viajes pendientes quedarían sin tarifa antes de darla de baja.' },
  tarAgregar: { t: 'Agregar tarifa', que: 'Nueva tarifa en un contrato.', para: 'Simular una adenda.', clic: 'Queda activa y aprobada.', v1: 'Se aprueba al liberar la versión del contrato.', ux: '' },
  // Órdenes
  ordCrear: { t: 'Crear orden', que: 'Nueva orden de despacho.', para: 'Autorizar cargas en una terminal.', clic: 'Crea la orden EN ELABORACION y la abre.', v1: 'DetalleOrdenDespacho.aspx.', ux: 'Generarla desde la nominación de DESTINO.' },
  ordDetalle: { t: 'Agregar detalle', que: 'Una cisterna a cargar.', para: 'Indicar destino, producto, cisterna, conductor y volumen.', clic: 'Agrega la fila (valida capacidad).', v1: 'Igual.', ux: '' },
  ordEstado: { t: 'Cambiar estado de la orden', que: 'Flujo EN ELABORACION → PENDIENTE DE APROBACION → APROBADO → LIBERADO.', para: 'Controlar quién autoriza.', clic: 'Aplica la acción elegida si el estado lo permite; si no, muestra el error de V1.', v1: 'Al aprobar asigna número y envía la nómina por correo.', ux: 'Mostrar solo las acciones posibles en cada estado.' },
  ordCRE: { t: 'Crear CRE de los seleccionados', que: 'Genera el CRE de despacho de cada detalle marcado.', para: 'Registrar la carga.', clic: 'Crea lote, CRE tipo 3 y pone la hoja de ruta EN TRÁNSITO.', v1: 'Exige mismo producto, empresa y destino.', ux: '' },
  ordSel: { t: 'Seleccionar detalle', que: 'Casilla de un detalle sin CRE.', para: 'Elegir qué cargas crear.', clic: 'Lo marca para "Crear CRE".', v1: '—', ux: '' },
  // CRE
  creSel: { t: 'Despacho en tránsito', que: 'Despacho sin recepción.', para: 'Elegir qué llegó.', clic: 'Lo marca para registrar su recepción.', v1: 'CRECisterna.aspx.', ux: '' },
  creRecepcion: { t: 'Registrar recepción', que: 'CRE tipo 8 con el volumen recibido.', para: 'Cerrar el viaje y habilitar la conciliación.', clic: 'Crea la recepción y la asocia a los despachos marcados.', v1: 'Tabla CREAsociacion.', ux: 'Alertar en el momento si la merma supera el admisible.' },
  // Multas
  mulCRE: { t: 'CRE de despacho', que: 'Despacho al que se aplica la multa.', para: 'Las multas se registran por viaje.', clic: 'Carga sus multas registradas.', v1: 'MultasPorIncumplimiento.aspx.', ux: '' },
  mulRegistrar: { t: 'Registrar multas', que: 'Guarda las multas del CRE.', para: 'Que aparezcan en la conciliación.', clic: 'Bloqueado si la conciliación avanzó.', v1: 'Borra y reinserta las multas del CRE.', ux: '' },
  // Sin conciliar
  scArea: { t: 'Área', que: 'RSCZ o RCBA (según el origen del viaje).', para: 'Cada analista concilia su área.', clic: 'Filtra los grupos.', v1: 'Permitidas por usuario en CONFIGURACION_CONCILIACIONES.', ux: '' },
  scGrupo: { t: 'Marcar grupo', que: 'Transportista + quincena.', para: 'Elegir qué conciliación generar.', clic: 'Lo incluye en "Generar".', v1: '—', ux: '' },
  scMoneda: { t: 'Moneda', que: 'Moneda del contrato vigente.', para: 'Sin moneda no se puede generar.', clic: '—', v1: 'MC_ObtenerMonedaContratoEmpresa.', ux: '' },
  scRecepcion: { t: 'Incluir recepción', que: 'Recepción del grupo.', para: 'Puedes dejar alguna para después.', clic: 'Se incluye o excluye al generar.', v1: '—', ux: '' },
  scGenerar: { t: 'Generar', que: 'Crea la conciliación con las recepciones marcadas.', para: 'Iniciar el pago al transportista.', clic: 'Valida moneda, presupuesto y duplicados; crea la conciliación "En Elaboracion".', v1: 'GenerarConciliacionCisterna.', ux: 'Mostrar el monto total y el saldo del presupuesto antes de confirmar.' },
  traza: { t: '¿Cómo se calculó?', que: 'Pasos y fórmulas de la línea.', para: 'Entender cada número.', clic: 'Despliega la explicación.', v1: 'No existe: el cálculo está oculto en el código.', ux: 'Clave para la confianza del transportista.' },
  // Conciliación
  concFila: { t: 'Conciliación del listado', que: 'Una conciliación.', para: 'Abrir su detalle.', clic: 'Muestra el detalle debajo.', v1: 'ConciliacionCisterna.aspx (grilla jerárquica).', ux: '' },
  concAccion: { t: 'Acción de estado', que: 'Transiciones posibles.', para: 'Hacer avanzar o retroceder la conciliación.', clic: 'Elige la acción; luego "Cambiar estado".', v1: 'V1 ofrece 4 acciones; las otras 3 están comentadas en el código.', ux: 'Botones claros por estado ("Enviar al transportista").' },
  concCambiar: { t: 'Cambiar estado', que: 'Ejecuta la acción elegida.', para: 'Avanzar el flujo.', clic: 'Valida estado, facturas y rol; registra el historial.', v1: 'btnEstado_Click.', ux: '' },
  concProcesar: { t: 'Calcular y procesar', que: 'Guarda los totales con los ajustes.', para: 'Dejar la conciliación lista para enviar.', clic: 'Recalcula y guarda; marca factura impaga si supera el umbral.', v1: 'Borra y reinserta todo el detalle.', ux: 'Guardado automático y ajustes auditados.' },
  concFacturas: { t: 'Números de factura', que: 'Facturas del transportista por mermas e incumplimiento.', para: 'Exigidas para la aprobación LOG si hay montos.', clic: 'Se guardan al cambiar el campo.', v1: '—', ux: '' },
  ajCapacidad: { t: 'Liberar capacidad', que: 'Capacidad de la cisterna en litros.', para: 'Pagar como si hubiera ido llena, descontando la pérdida.', clic: 'Base del flete = capacidad − despachado + recibido.', v1: 'Solo en la última línea de la recepción.', ux: 'Pedir motivo y adjunto (es un pago extra).' },
  ajTarifaEsp: { t: 'Tarifa especial', que: 'Tarifa por litro digitada.', para: 'Casos fuera de contrato.', clic: 'Reemplaza la tarifa de la línea.', v1: 'TarifaEspecialBs.', ux: 'Pedir aprobación y motivo.' },
  ajMerma: { t: 'Liberar merma', que: 'Perdona la merma de la línea.', para: 'Mermas justificadas (p. ej. calibración).', clic: 'El C/D no se resta.', v1: 'En contabilización basta una línea para excluir toda la recepción.', ux: '' },
  ajTarifaPA: { t: 'P / A', que: 'Cambiar a la tarifa PRINCIPAL o ALTERNA vigente.', para: 'Rutas con alternativa (otro camino).', clic: 'Reemplaza la tarifa y recalcula el flete.', v1: 'Requiere la actividad "Cambiar Tarifa".', ux: '' },
  concTotales: { t: 'Totales', que: 'Flete, mermas, multas y neto.', para: 'Saber cuánto se paga.', clic: '—', v1: 'Neto = flete + mermas + multa transporte.', ux: 'Un solo neto que incluya todo.' },
  concProductos: { t: 'Por producto', que: 'Compensación de mermas por producto.', para: 'Ver si una demasía compensó una merma.', clic: '—', v1: 'Si la suma es positiva se toma 0.', ux: '' },
  // OT
  otSel: { t: 'Seleccionar conciliación', que: 'Casilla de la fila.', para: 'Ver el detalle y habilitar Procesar y Nuevo convoy.', clic: 'Muestra el detalle por recepción.', v1: 'Solo una a la vez.', ux: '' },
  otAprobar: { t: '✔ Aprobar', que: 'Avanza un estado.', para: 'En elaboración → aprobación del transportista → aprobada; en Pendiente de Aprobacion → Pendiente de Liberacion.', clic: 'Valida permisos y facturas impagas.', v1: 'Lo pulsa logística incluso por el transportista (D22).', ux: '' },
  otRechazar: { t: '✖ Rechazar', que: 'Vuelve a elaboración.', para: 'Corregir.', clic: 'No verifica SAP (D25).', v1: '—', ux: '' },
  otProcesar: { t: 'Procesar', que: 'Guarda las ediciones de la grilla.', para: 'Aplicar tarifa, merma, capacidad y tarifa especial.', clic: 'Recalcula fletes y neto.', v1: 'btnProcesar_Click.', ux: '' },
  otConvoy: { t: 'Nuevo convoy', que: 'Agrega recepciones a la conciliación.', para: 'Incluir viajes que llegaron tarde.', clic: 'Muestra las recepciones disponibles del rango.', v1: 'Sin validar contrato ni presupuesto (D30).', ux: '' },
  otExcluir: { t: 'Excluir recepción', que: 'Quita la recepción.', para: 'Dejarla para otra conciliación.', clic: 'Borra sus líneas y recargos.', v1: '—', ux: '' },
  otTarifa: { t: 'Lista de tarifas', que: 'P, A1, A2… y 0.', para: 'Elegir la tarifa de la recepción.', clic: 'Se aplica al pulsar Procesar.', v1: 'MC_ObtenerPrioridadesTarifas.', ux: '' },
  otAsistente: { t: '¿Qué hago ahora?', que: 'Asistente que calcula el siguiente paso según tus permisos, los filtros, la conciliación marcada y su estado.', para: 'Saber qué pulsar sin conocer el proceso de memoria.', clic: '"Mostrar dónde" lleva al elemento resaltado con borde ámbar punteado.', v1: 'No existe en V1.', ux: 'El sistema nuevo debería mostrar siempre la siguiente acción y quién la debe hacer.' },
  otOrigen: { t: '¿De dónde viene esta fila?', que: 'Cadena de origen de la recepción: orden, cisterna, CRE de despacho y recepción, contrato, tarifa, precio de multa, multas, ajustes y cálculo.', para: 'Explicar o auditar cualquier número de la fila.', clic: 'Abre o cierra el detalle debajo de la fila.', v1: 'No existe: hay que consultar cada pantalla o tabla por separado.', ux: 'Trazabilidad de un clic desde cada monto hasta su documento de origen.' },
  otPermisos: { t: 'Permisos por rol', que: 'Simula CONFIGURACION_CONCILIACIONES.', para: 'Ver cómo cambian los botones.', clic: 'Otorga o quita el permiso al rol.', v1: 'Por usuario, tipo y área.', ux: 'Administrar permisos en la seguridad externa, no en una tabla local.' },
  // Recargos
  recContractual: { t: 'Multa o descuento contractual', que: 'Cobro definido en el contrato.', para: 'Aplicarlo a un despacho o a la conciliación.', clic: 'Lo agrega o lo quita.', v1: 'MC_MultasDescuentos.', ux: '' },
  recCaso: { t: 'Caso especial / carro guía', que: 'Cobros puntuales con factura.', para: 'Pérdidas por accidente u otros servicios.', clic: 'Agrega la línea.', v1: '≥ 50.000 queda como factura impaga.', ux: '' },
  // SAP
  sapBoton: { t: 'Paso del circuito SAP', que: 'Pedido, liberación, hoja de entrada, aceptación o anulaciones.', para: 'Llevar la conciliación a pago.', clic: 'Cambia el estado SAP y, en algunos pasos, el de la conciliación.', v1: 'Sincronizaciones_To_SAP con credenciales SAP.', ux: 'Automatizar con reintentos y estado visible.' },
  sapPagadas: { t: 'Marcar facturas pagadas (cobros simulados)', que: 'Actualiza una marca de cobros por multas del escenario, no el pago del flete.', para: 'Estudiar el bloqueo de cobros sin hacer una transferencia.', clic: 'Solo cambia el bit simulado; no registra importe bancario ni pago a la empresa.', v1: 'FacturasDelTransportista marca bits de cobros por fila; este botón general es una simplificación.', ux: 'Separar marcas de cobranza, pagos del servicio y comprobantes financieros.' },
  // Portal
  portalAprobar: { t: 'Aprobar (transportista)', que: 'Aceptación del transportista.', para: 'Permitir crear el pedido SAP.', clic: 'Pasa a "Aprobada Por Transportista" y prepara SAP.', v1: '—', ux: 'Debe hacerlo el transportista autenticado.' },
  // DESTINO
  destTarifa: { t: 'Tarifa propuesta', que: 'Precio que ofrece la empresa.', para: 'Ordenar el ranking.', clic: 'Recalcula el ranking.', v1: 'No existe en V1.', ux: '' },
  destNominar: { t: 'Nominar y enviar a LEGACY', que: 'Adjudica la oferta.', para: 'Crear la orden con tarifa adjudicada.', clic: 'Crea la orden EN ELABORACION.', v1: 'No existe.', ux: '' }
};

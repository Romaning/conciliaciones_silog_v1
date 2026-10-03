/*
 * Navegación por hash, cabecera, eventos y mensajes. Conecta las vistas con las acciones del estado.
 */
window.SILOG = window.SILOG || {};

(function (A) {
  const E = SILOG.estado, V = SILOG.vistas, M = SILOG.motor;

  A.MENU = [
    ['Entender', [['guion', 'Guion del escenario'], ['inicio', 'Mapa del proceso'], ['simulador', 'Simulador: de dónde a dónde']]],
    ['Origen de la conciliación', [['localidades', 'Localidades'], ['tarifario', 'Contratos y tarifario'], ['precios', 'Precios de producto'], ['ordenes', 'Órdenes de despacho'], ['cre', 'CRE despacho y recepción'], ['multas', 'Multas por CRE']]],
    ['Conciliación', [['sinconciliar', 'Detalle sin conciliar'], ['conciliaciones', 'Conciliación cisterna'], ['otmapa', 'Otros Transportes: de principio a fin'], ['ot', 'Conciliación Otros Transportes'], ['recargos', 'Recargos'], ['sap', 'Contabilización y SAP'], ['portal', 'Portal del transportista']]],
    ['Conocimiento y propuesta', [['reglas', 'Reglas de negocio'], ['ejemplos', 'Ejemplos de cálculo'], ['mejoras', 'Defectos y propuesta'], ['destino', 'Flujo propuesto DESTINO → LEGACY'], ['fuentes', 'Fuentes y trazabilidad'], ['glosario', 'Glosario'], ['bitacora', 'Bitácora']]]
  ];
  const RUTAS = new Set(A.MENU.flatMap(g => g[1].map(x => x[0])));

  // Estado de cada vista (filtros, selección). No se persiste salvo el modo y el rol.
  A.vs = {
    sim: { cisternaId: 1, productoId: 1, origenId: 2, destinoId: 3, fechaDespacho: '2026-09-30', volDespacho: 30000, fechaRecepcion: '2026-10-01', volRecepcion: '29880' },
    tar: { transportistaId: '' },
    ord: { ordenId: null, sel: [] },
    cre: { sel: [] },
    mul: { creId: null, tc: null, entradas: {} },
    sc: { area: 2, sel: {} },
    conc: { concId: null, estado: '', transportistaId: '' },
    portal: { transportistaId: 1, concId: null },
    reglas: { filtro: '' },
    ot: { tipo: 'Cisterna', area: 2, transportistaId: 0, mes: 9, anio: 2026, quincena: 2, fi: '', ff: '', concId: null, edits: {}, convoy: false, convoySel: [], origen: null },
    otm: { concId: null },
    fuentes: { tipo: '', texto: '' },
    ej: Object.assign({}, V.EJEMPLOS ? V.EJEMPLOS[0] : {})
  };
  let mensaje = null;

  A.ruta = () => { const r = (location.hash || '#inicio').slice(1); return RUTAS.has(r) ? r : 'inicio'; };

  function menu() {
    const r = A.ruta();
    document.getElementById('menu').innerHTML = A.MENU.map(([g, items]) => `<div class="menu-grupo"><p>${g}</p>${items.map(([id, t]) => `<a href="#${id}" class="${id === r ? 'activo' : ''}" ${id === r ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</div>`).join('');
  }
  function cabecera() {
    const selEsc = document.getElementById('escenario');
    if (!selEsc.options.length) selEsc.innerHTML = SILOG.ESCENARIOS.map(e => `<option value="${e.id}">${V.esc(e.nombre)}</option>`).join('');
    selEsc.value = E.ui.escenario;
    document.getElementById('modo').value = E.ui.modo;
    document.getElementById('rol').value = E.ui.rol;
    document.body.dataset.modo = E.ui.modo;
    document.body.classList.toggle('modo-ayuda', !!E.ui.ayuda);
    document.getElementById('ayuda-toggle').setAttribute('aria-pressed', E.ui.ayuda ? 'true' : 'false');
    document.getElementById('ayuda-toggle').textContent = E.ui.ayuda ? '? Ayuda: activa' : '? Ayuda';
    document.getElementById('guia-toggle').setAttribute('aria-pressed', E.ui.tour && E.ui.tour.activo ? 'true' : 'false');
    document.getElementById('hoy').textContent = M.fmtF(E.st.hoy);
  }

  A.render = () => {
    const r = A.ruta();
    menu();
    cabecera();
    let html;
    try { html = V[r](); } catch (e) { console.error(e); html = `<div class="nota nota-error">Error al dibujar la vista: ${V.esc(e.message)}</div>`; }
    const esc = SILOG.escenarioPorId(E.ui.escenario);
    const hechos = ((E.ui.guion || {})[esc.id] || []).length;
    const franja = r === 'guion' ? '' : `<div class="franja-escenario"><span>Escenario: <strong>${V.esc(esc.nombre)}</strong></span><span>${hechos} de ${esc.guion.length} pasos</span><a href="#guion">Ver guion</a></div>`;
    const msg = mensaje ? `<div class="mensaje ${mensaje.ok ? 'ok' : 'error'}" role="status">${V.esc(mensaje.msg)}<button class="cerrar" data-accion="cerrarMensaje" aria-label="Cerrar mensaje">×</button></div>` : '';
    const cont = document.getElementById('vista');
    const conFuentes = html.replace('</header>', '</header>' + V.panelIntro(r) + V.panelFuentes(r));
    const avisoAyuda = E.ui.ayuda ? '<div class="nota nota-ayuda" role="status"><strong>Modo ayuda activo.</strong> Los elementos con borde punteado explican qué son al hacer clic, en vez de ejecutarse. Desactívalo con el botón "? Ayuda" de la cabecera.</div>' : '';
    document.querySelectorAll('.guia-siguiente').forEach(x => x.classList.remove('guia-siguiente'));
    if (r !== 'ot') V.otSigActual = null;
    cont.innerHTML = franja + avisoAyuda + msg + conFuentes;
    E.ui.visitadas = E.ui.visitadas || [];
    if (!E.ui.visitadas.includes(r)) { E.ui.visitadas.push(r); E.guardar(); }
    A.renderTour();
    // Fuera del recorrido guiado, Otros Transportes resalta el siguiente paso que indica su asistente.
    const sig = V.otSigActual;
    if (r === 'ot' && sig && sig.sel && !(E.ui.tour && E.ui.tour.activo)) {
      const el = document.querySelector('#vista ' + sig.sel) || document.querySelector(sig.sel);
      if (el) el.classList.add('guia-siguiente');
    }
  };
  const selPaso = p => typeof p.sel === 'function' ? p.sel(E.st) : p.sel;

  // ───────────────────────── recorrido guiado ─────────────────────────
  A.pasosTour = () => SILOG.tourDe(SILOG.escenarioPorId(E.ui.escenario));
  A.renderTour = () => {
    const caja = document.getElementById('tour');
    document.querySelectorAll('.guia-resaltado').forEach(x => x.classList.remove('guia-resaltado'));
    const t = E.ui.tour || {};
    if (!t.activo) { caja.hidden = true; caja.innerHTML = ''; return; }
    const pasos = A.pasosTour();
    const i = Math.min(t.paso || 0, pasos.length - 1);
    const p = pasos[i];
    const enVista = A.ruta() === p.vista;
    const hecho = p.hecho ? !!p.hecho(E.st, A) : null;
    const sel = selPaso(p);
    if (enVista && sel) { const el = document.querySelector('#vista ' + sel) || document.querySelector(sel); if (el) el.classList.add('guia-resaltado'); }
    caja.hidden = false;
    caja.innerHTML = `<div class="tour-cab"><span>Paso ${i + 1} de ${pasos.length}</span><strong>${V.esc(p.titulo || 'Paso')}</strong>
        <button class="cerrar" data-accion="tourCerrar" aria-label="Cerrar el recorrido">×</button></div>
      <div class="tour-barra" aria-hidden="true"><span style="width:${Math.round((i + (hecho ? 1 : 0)) / pasos.length * 100)}%"></span></div>
      ${enVista ? '' : `<p class="tour-ir">Este paso es en <strong>${V.esc(V.NOMBRES_VISTA[p.vista] || p.vista)}</strong>. <button class="btn chico primario" data-accion="tourIr">Ir a la pantalla</button></p>`}
      <dl class="tour-dl"><dt>Qué hacer</dt><dd>${V.esc(p.hacer)}</dd>
        ${p.porque ? `<dt>Por qué</dt><dd>${V.esc(p.porque)}</dd>` : ''}
        ${p.veras ? `<dt>Qué verás</dt><dd>${V.esc(p.veras)}</dd>` : ''}</dl>
      ${hecho === true ? '<p class="tour-ok">✔ Paso cumplido. Revisa el resultado y pulsa "Siguiente".</p>' : hecho === false ? '<p class="tour-pend">Esperando que lo hagas… (o usa "Hazlo por mí")</p>' : ''}
      <div class="tour-acciones">
        <button class="btn chico" data-accion="tourAnt" ${i === 0 ? 'disabled' : ''}>Anterior</button>
        ${enVista && sel ? '<button class="btn chico" data-accion="tourDonde">Mostrar dónde</button>' : ''}
        ${p.auto && hecho === false ? '<button class="btn chico" data-accion="tourAuto">Hazlo por mí</button>' : ''}
        <button class="btn chico primario" data-accion="tourSig" ${hecho === false ? 'disabled title="Primero completa el paso o usa Hazlo por mí"' : ''}>${i === pasos.length - 1 ? 'Terminar' : 'Siguiente'}</button>
      </div>`;
  };
  function irPaso(i) {
    const pasos = A.pasosTour();
    E.ui.tour = { activo: true, paso: Math.max(0, Math.min(i, pasos.length - 1)) };
    E.guardar();
    if (pasos[E.ui.tour.paso].preparar) pasos[E.ui.tour.paso].preparar();
    const v = pasos[E.ui.tour.paso].vista;
    if (A.ruta() !== v) location.hash = v; else A.render();
  }
  A.iniciarTour = () => irPaso(0);

  function resultado(r, irA) {
    if (r) mensaje = r;
    if (irA && location.hash !== '#' + irA) { location.hash = irA; return; }
    A.render();
  }
  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };

  // ───────────────────────── acciones de clic ─────────────────────────
  const acc = {
    cerrarMensaje: () => { mensaje = null; A.render(); },
    tourIniciar: () => A.iniciarTour(),
    tourCerrar: () => { E.ui.tour = Object.assign({}, E.ui.tour, { activo: false }); E.guardar(); A.renderTour(); document.getElementById('guia-toggle').setAttribute('aria-pressed', 'false'); },
    tourIr: () => irPaso((E.ui.tour || {}).paso || 0),
    tourAnt: () => irPaso(((E.ui.tour || {}).paso || 0) - 1),
    tourSig: () => {
      const i = (E.ui.tour || {}).paso || 0, pasos = A.pasosTour();
      if (i >= pasos.length - 1) { E.ui.tour.activo = false; E.guardar(); mensaje = { ok: true, msg: '¡Recorrido terminado! Puedes reiniciar el escenario y repetirlo, o elegir otro escenario.' }; A.render(); return; }
      const esc = SILOG.escenarioPorId(E.ui.escenario);
      if (esc.tour) E.marcarPaso(i, true);
      irPaso(i + 1);
    },
    tourDonde: () => { const el = document.querySelector('.guia-resaltado'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('guia-pulso'); void el.offsetWidth; el.classList.add('guia-pulso'); } },
    tourAuto: () => {
      const p = A.pasosTour()[(E.ui.tour || {}).paso || 0];
      const r = p.auto();
      if (r) mensaje = { ok: r.ok, msg: 'Hecho por ti: ' + r.msg };
      if (A.ruta() !== p.vista) location.hash = p.vista; else A.render();
    },
    ayudaCerrar: () => cerrarPopover(),
    otDonde: () => {
      const el = document.querySelector('.guia-siguiente') || document.querySelector('.guia-resaltado');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('guia-pulso'); void el.offsetWidth; el.classList.add('guia-pulso'); if (el.focus) el.focus({ preventScroll: true }); }
    },
    otOrigen: el => { const id = Number(el.dataset.rec); A.vs.ot.origen = A.vs.ot.origen === id ? null : id; A.render(); },
    otIrPeriodo: el => { irAConciliacionOT(Number(el.dataset.id), false); A.render(); },
    otmTrabajar: el => { irAConciliacionOT(Number(el.dataset.id), true); resultado(null, 'ot'); },
    reiniciar: () => {
      const nombre = SILOG.escenarioPorId(E.ui.escenario).nombre;
      if (confirm(`¿Reiniciar "${nombre}"? Se perderán los cambios hechos y se desmarcarán los pasos del guion.`)) { limpiarVs(); resultado(E.reiniciar()); }
    },
    cargarEscenario: el => cargar(el.dataset.id),
    viajeCompleto: () => resultado(E.viajeCompleto(A.vs.sim)),
    alternarTarifa: el => resultado(E.alternarTarifa(Number(el.dataset.id))),
    agregarTarifa: () => resultado(E.agregarTarifa({ contratoId: val('nt-contrato'), origenId: val('nt-origen'), destinoId: val('nt-destino'), productoId: val('nt-producto'), tarifa: val('nt-tarifa'), admisible: val('nt-admisible'), prioridad: val('nt-prioridad'), vigInicio: val('nt-desde') })),
    verOrden: el => { A.vs.ord.ordenId = Number(el.dataset.id); A.vs.ord.sel = []; resultado(null, 'ordenes'); },
    crearOrden: () => { const r = E.crearOrden({ terminalId: val('no-terminal'), fecha: val('no-fecha') }); if (r.ok) A.vs.ord.ordenId = r.id; resultado(r); },
    agregarDetalle: () => resultado(E.agregarDetalleOrden(A.vs.ord.ordenId, { destinoId: val('od-destino'), productoId: val('od-producto'), cisternaId: val('od-cisterna'), conductorId: val('od-conductor'), volumen: val('od-volumen'), tarifaAsociadaId: val('od-tarifa') })),
    quitarDetalle: el => resultado(E.quitarDetalleOrden(A.vs.ord.ordenId, Number(el.dataset.id))),
    estadoOrden: () => resultado(E.estadoOrden(A.vs.ord.ordenId, val('ord-accion'))),
    crearCREs: () => { const r = E.crearCREs(A.vs.ord.ordenId, A.vs.ord.sel, val('ord-fechacre')); if (r.ok) A.vs.ord.sel = []; resultado(r); },
    registrarRecepcion: () => { const r = E.registrarRecepcion(A.vs.cre.sel, val('rec-vol'), val('rec-fecha')); if (r.ok) A.vs.cre.sel = []; resultado(r); },
    registrarMultas: el => {
      const creId = Number(el.dataset.id);
      const reg = E.st.multasCRE.filter(m => m.creId === creId);
      const entradas = {};
      E.st.multasCatalogo.forEach(m => {
        const e = A.vs.mul.creId === creId && A.vs.mul.entradas[m.id] !== undefined ? A.vs.mul.entradas[m.id] : (reg.find(x => x.multaId === m.id) || {}).entrada;
        if (e) entradas[m.id] = e;
      });
      resultado(E.registrarMultasCRE(creId, entradas, A.vs.mul.tc || E.st.tc));
    },
    generar: () => {
      const sel = Object.entries(A.vs.sc.sel).map(([clave, s]) => ({ clave, marcado: s.marcado, moneda: s.moneda, recepciones: s.recepciones }));
      const r = E.generar(Number(A.vs.sc.area), sel);
      if (r.ok) { A.vs.sc.sel = {}; A.vs.conc.concId = r.ids[0]; }
      resultado(r, r.ok ? 'conciliaciones' : null);
    },
    verConc: el => { A.vs.conc.concId = Number(el.dataset.id); resultado(null, el.dataset.ir || 'conciliaciones'); },
    procesar: () => resultado(E.procesar(A.vs.conc.concId)),
    transicion: () => resultado(E.transicion(A.vs.conc.concId, val('conc-accion'))),
    cambiarTarifa: el => resultado(E.cambiarTarifaLinea(A.vs.conc.concId, el.dataset.key, el.dataset.prioridad)),
    alternarRecargo: el => resultado(E.alternarRecargo(concActual(), Number(el.dataset.cat), el.dataset.cre ? Number(el.dataset.cre) : null)),
    agregarCaso: () => resultado(E.agregarCaso(concActual(), { tipo: val('cs-tipo'), casoId: val('cs-caso'), monto: val('cs-monto'), factura: val('cs-factura') })),
    quitarRecargo: el => resultado(E.quitarRecargo(concActual(), Number(el.dataset.id))),
    sapAccion: el => resultado(E.sapAccion(concSap(), el.dataset.a)),
    facturasPagadas: () => resultado(E.marcarFacturasPagadas(concSap())),
    umbral: () => resultado(E.setUmbral(val('umbral'))),
    verPortal: el => { A.vs.portal.concId = Number(el.dataset.id); A.render(); },
    portalTransicion: el => { A.vs.portal.concId = Number(el.dataset.id); resultado(E.transicion(Number(el.dataset.id), el.dataset.a)); },
    disputar: el => resultado(E.disputar(Number(el.dataset.id), val('disp-key'), val('disp-motivo'))),
    nominar: () => resultado(E.nominar(1)),
    otProcesar: () => { const r = E.otProcesar(A.vs.ot.concId, A.vs.ot.edits); if (r.ok) A.vs.ot.edits = {}; resultado(r); },
    otAprobar: el => resultado(E.otAprobar(Number(el.dataset.id))),
    otRechazar: el => resultado(E.otRechazar(Number(el.dataset.id))),
    otExcluir: el => resultado(E.otExcluir(A.vs.ot.concId, Number(el.dataset.rec))),
    otConvoy: () => { A.vs.ot.convoy = !A.vs.ot.convoy; A.vs.ot.convoySel = []; A.render(); },
    otAgregar: () => {
      const [fi, ff] = V.otRango(A.vs.ot);
      const r = E.otAgregar(A.vs.ot.concId, A.vs.ot.convoySel, fi, ff);
      if (r.ok) { A.vs.ot.convoy = false; A.vs.ot.convoySel = []; }
      resultado(r);
    },
    ejemplo: el => { A.vs.ej = Object.assign({ liberarCapacidad: '', tarifaEspecial: '', liberarMerma: false }, V.EJEMPLOS[Number(el.dataset.id)]); A.render(); }
  };
  // Ajusta los filtros de Otros Transportes al periodo de una conciliación (y opcionalmente la marca).
  function irAConciliacionOT(id, marcar) {
    const c = M.porId(E.st.conciliaciones, id);
    Object.assign(A.vs.ot, { tipo: 'Cisterna', area: c.area, mes: c.mes, anio: c.anio, quincena: c.quincena, transportistaId: 0, fi: '', ff: '', concId: marcar ? c.id : null, edits: {}, convoy: false, convoySel: [], origen: null });
  }
  function limpiarVs() {
    A.vs.sc.sel = {}; A.vs.conc = { concId: null, estado: '', transportistaId: '' }; A.vs.ord = { ordenId: null, sel: [] };
    A.vs.cre.sel = []; A.vs.mul = { creId: null, tc: null, entradas: {} }; A.vs.portal.concId = null;
    Object.assign(A.vs.ot, { concId: null, edits: {}, convoy: false, convoySel: [], fi: '', ff: '', origen: null });
    A.vs.otm.concId = null;
  }
  function cargar(id) {
    const e = SILOG.escenarioPorId(id);
    if (!confirm(`¿Cargar "${e.nombre}"? Se reemplazarán los datos actuales del prototipo.`)) { cabecera(); return; }
    limpiarVs();
    mensaje = E.cargarEscenario(id);
    if (e.tour) { irPaso(0); return; }
    if (location.hash !== '#guion') location.hash = 'guion'; else A.render();
  }
  function concActual() {
    if (A.vs.conc.concId) return A.vs.conc.concId;
    const recientes = [...E.st.conciliaciones].sort((a, b) => b.numero - a.numero);
    const c = recientes.find(x => x.estado === 'En Elaboracion') || recientes[0];
    return c ? c.id : null;
  }
  function concSap() {
    const c = A.vs.conc.concId && M.porId(E.st.conciliaciones, A.vs.conc.concId);
    if (c && c.sap) return c.id;
    const x = E.st.conciliaciones.filter(k => k.sap).sort((a, b) => b.numero - a.numero)[0];
    return x ? x.id : null;
  }

  // ───────────────────────── eventos ─────────────────────────
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-accion]');
    if (!el || el.tagName === 'INPUT' && el.type !== 'checkbox') return;
    const fn = acc[el.dataset.accion];
    if (!fn) return;
    if (el.tagName === 'A') ev.preventDefault();
    fn(el);
  });
  // ───────────────────────── modo ayuda ─────────────────────────
  function cerrarPopover() { const p = document.getElementById('popover-ayuda'); p.hidden = true; p.innerHTML = ''; }
  function abrirPopover(el) {
    const a = SILOG.AYUDA[el.dataset.ayuda];
    if (!a) return;
    const p = document.getElementById('popover-ayuda');
    const fila = (t, v) => v ? `<dt>${t}</dt><dd>${V.esc(v)}</dd>` : '';
    p.innerHTML = `<div class="tour-cab"><strong>${V.esc(a.t)}</strong><button class="cerrar" data-accion="ayudaCerrar" aria-label="Cerrar ayuda">×</button></div>
      <dl class="tour-dl">${fila('Qué es', a.que)}${fila('Para qué sirve', a.para)}${fila('Qué pasa al usarlo', a.clic)}${fila('En SILOG_V1', a.v1)}${fila('Lección para el rediseño', a.ux)}</dl>`;
    p.hidden = false;
    const r = el.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 24);
    p.style.width = w + 'px';
    p.style.left = Math.max(12, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 12)) + 'px';
    p.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }
  ['mousedown', 'click'].forEach(tipo => document.addEventListener(tipo, ev => {
    if (!E.ui.ayuda) return;
    if (ev.target.closest('#popover-ayuda, #tour, #ayuda-toggle, #guia-toggle')) return;
    const el = ev.target.closest('[data-ayuda]');
    if (!el) { if (tipo === 'click') cerrarPopover(); return; }
    ev.preventDefault();
    ev.stopPropagation();
    if (tipo === 'click') abrirPopover(el);
  }, true));
  document.addEventListener('toggle', ev => {
    const d = ev.target;
    if (d.dataset && d.dataset.intro) { E.ui.introCerrada = E.ui.introCerrada || {}; E.ui.introCerrada[d.dataset.intro] = !d.open; E.guardar(); }
  }, true);

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') cerrarPopover();
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('tr[data-accion]')) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.id === 'escenario') return cargar(el.value);
    if (el.dataset.paso !== undefined) { E.marcarPaso(Number(el.dataset.paso), el.checked); return A.render(); }
    if (el.id === 'modo') return resultado(E.setModo(el.value));
    if (el.id === 'rol') return resultado(E.setRol(el.value));
    if (el.dataset.cambio) {
      const [vista, campo] = el.dataset.cambio.split('.');
      if (vista === 'ui') { E.ui[campo] = el.checked; E.guardar(); return A.render(); }
      A.vs[vista][campo] = el.type === 'checkbox' ? el.checked : el.value;
      if (vista === 'sim' && campo === 'cisternaId') { const c = M.porId(E.st.cisternas, el.value); if (c && Number(A.vs.sim.volDespacho) > c.capacidad) A.vs.sim.volDespacho = c.capacidad; }
      if (vista === 'mul' && campo === 'creId') { A.vs.mul.creId = Number(el.value); A.vs.mul.entradas = {}; }
      if (vista === 'conc') A.vs.conc.concId = null;
      if (vista === 'ot' && !['fi', 'ff'].includes(campo)) { Object.assign(A.vs.ot, { concId: null, edits: {}, convoy: false, convoySel: [], origen: null }); if (['tipo', 'mes', 'anio', 'quincena'].includes(campo)) { A.vs.ot.fi = ''; A.vs.ot.ff = ''; } }
      if (vista === 'portal') A.vs.portal.concId = null;
      return A.render();
    }
    if (el.dataset.sel) {
      const [vista, campo] = el.dataset.sel.split('.');
      const id = Number(el.value), lista = A.vs[vista][campo];
      A.vs[vista][campo] = el.checked ? lista.concat(id) : lista.filter(x => x !== id);
      return;
    }
    if (el.dataset.grupo) { A.vs.sc.sel[el.dataset.grupo].marcado = el.checked; return; }
    if (el.dataset.moneda) { A.vs.sc.sel[el.dataset.moneda].moneda = el.value; return; }
    if (el.dataset.rec) {
      const s = A.vs.sc.sel[el.dataset.rec], id = Number(el.value);
      s.recepciones = el.checked ? s.recepciones.concat(id) : s.recepciones.filter(x => x !== id);
      return;
    }
    if (el.dataset.ajuste) return resultado(E.ajustar(A.vs.conc.concId, el.dataset.key, el.dataset.ajuste, el.type === 'checkbox' ? el.checked : el.value));
    if (el.dataset.factura) return resultado(E.facturas(A.vs.conc.concId, el.dataset.factura, el.value));
    if (el.dataset.multa) {
      if (!A.vs.mul.creId) A.vs.mul.creId = Number(document.querySelector('[data-cambio="mul.creId"]').value);
      A.vs.mul.entradas[el.dataset.multa] = el.type === 'checkbox' ? el.checked : el.value;
      return A.render();
    }
    if (el.dataset.otSel) { A.vs.ot.concId = el.checked ? Number(el.dataset.otSel) : null; Object.assign(A.vs.ot, { edits: {}, convoy: false, convoySel: [], origen: null }); return A.render(); }
    if (el.dataset.otEdit) {
      const rec = el.dataset.otRec, e = A.vs.ot.edits[rec] || (A.vs.ot.edits[rec] = {});
      e[el.dataset.otEdit] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.otEdit === 'tarifa') e.etiqueta = el.selectedOptions[0].dataset.etiqueta;
      return;
    }
    if (el.dataset.otFactura) return resultado(E.facturas(Number(el.dataset.id), el.dataset.otFactura, el.value));
    if (el.dataset.convoy) { const id = Number(el.dataset.convoy), s = A.vs.ot.convoySel; A.vs.ot.convoySel = el.checked ? s.concat(id) : s.filter(x => x !== id); return; }
    if (el.dataset.permiso) return resultado(E.setPermisoOT(el.dataset.rol, el.dataset.permiso, el.checked));
    if (el.dataset.postulacion) return resultado(E.tarifaPostulacion(1, Number(el.dataset.postulacion), el.value));
  });
  window.addEventListener('hashchange', () => { mensaje = null; A.render(); window.scrollTo(0, 0); });

  A.iniciar = () => {
    E.cargar();
    const t = E.ui.tour;
    if (t && t.activo) { const p = A.pasosTour()[t.paso || 0]; if (p && p.preparar) p.preparar(); }
    document.getElementById('reiniciar').addEventListener('click', acc.reiniciar);
    document.getElementById('ayuda-toggle').addEventListener('click', () => { E.ui.ayuda = !E.ui.ayuda; E.guardar(); cerrarPopover(); A.render(); });
    document.getElementById('guia-toggle').addEventListener('click', () => { if (E.ui.tour && E.ui.tour.activo) acc.tourCerrar(); else if (E.ui.tour && E.ui.tour.paso) irPaso(E.ui.tour.paso); else A.iniciarTour(); });
    A.render();
  };
})(SILOG.app = {});

document.addEventListener('DOMContentLoaded', SILOG.app.iniciar);

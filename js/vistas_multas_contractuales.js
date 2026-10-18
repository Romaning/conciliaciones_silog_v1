/* Presentación educativa reutilizada por el recorrido y por Recargos. Sin mutaciones de negocio. */
(function (V) {
  const C = SILOG.multasContractuales, M = SILOG.motor, E = SILOG.estado, esc = V.esc;
  const etapas = ['Definir multa', 'Crear recargo', 'Asociar empresas', 'Aprobar y liberar', 'Aplicar al CRE', 'Comprobar cálculo'];
  const btn = (accion, texto, extra = '', primario = false) => `<button type="button" class="btn${primario ? ' primario' : ''}" data-mc-accion="${accion}" data-ayuda="mc${accion}" ${extra}>${texto}</button>`;
  const nota = (t, tipo = 'info') => `<div class="nota nota-${tipo}">${t}</div>`;
  const opciones = (xs, valor, nombre = x => x.nombre) => xs.map(x => `<option value="${x.id}" ${Number(valor) === x.id ? 'selected' : ''}>${esc(nombre(x))}</option>`).join('');
  const dato = (nombre, label, valor, tipo = 'text', extra = '') => `<label>${label}<input name="${nombre}" type="${tipo}" value="${esc(valor == null ? '' : valor)}" ${extra}></label>`;
  const ctx = () => SILOG.controlMultas.contexto();
  const vs = () => SILOG.controlMultas.vista();
  const cab = () => M.porId(E.st.multasContractuales, vs().cabeceraId);
  const det = () => M.porId(E.st.recargosCatalogo, vs().detalleId);
  const formDefinicion = () => {
    const h = cab() || { tipoContratoId: 1, tipo: 'Multa', aplicabilidad: 'CRE_D', vigInicio: '2026-01-01', vigFin: '2026-12-31' };
    const bloqueada = h.id && E.st.recargosCatalogo.some(d => d.cabeceraId === h.id && d.estado !== C.ESTADOS[0]);
    return `<section class="tarjeta"><h2>1. Definición general · MC_MultasDescuentos</h2>
      <p>No registra un cobro. Define el tipo de contrato y dónde podrá aplicarse.</p>
      <div class="mc-acciones">${btn('nuevaCabecera', 'Nueva definición')}</div>
      <label>Definición a estudiar<select data-mc-cambio="cabeceraId"><option value="">Nueva definición</option>${opciones(E.st.multasContractuales, h.id, x => x.denominacion + ' · ' + x.aplicabilidad)}</select></label>
      ${bloqueada ? nota('La cabecera queda bloqueada cuando un recargo sale de elaboración. Para modificarla hay que revertir los recargos; si ya fueron utilizados, V1 deniega la reversión.', 'aviso') : ''}
      <form data-mc-form="cabecera" data-ayuda="mcCabecera" class="mc-form"><fieldset class="mc-ancho" ${bloqueada ? 'disabled' : ''}><div class="mc-form">
        ${dato('denominacion', 'Denominación', h.denominacion || 'Condiciones documentales del transporte 2026', 'text', 'required maxlength="250"')}
        <label>Tipo de contrato<select name="tipoContratoId">${opciones(E.st.tiposContratoMultas, h.tipoContratoId)}</select></label>
        <label>Tipo<select name="tipo"><option ${h.tipo === 'Multa' ? 'selected' : ''}>Multa</option><option ${h.tipo === 'Descuento' ? 'selected' : ''}>Descuento</option></select></label>
        <label>Aplicabilidad<select name="aplicabilidad"><option value="CRE_D" ${h.aplicabilidad === 'CRE_D' ? 'selected' : ''}>CRE de despacho</option><option value="CRE_R" ${h.aplicabilidad === 'CRE_R' ? 'selected' : ''}>CRE de recepción</option><option value="CONCILIACION" ${h.aplicabilidad === 'CONCILIACION' ? 'selected' : ''}>La conciliación</option></select></label>
        ${dato('vigInicio', 'Vigencia inicial', h.vigInicio, 'date', 'required')}${dato('vigFin', 'Vigencia final', h.vigFin, 'date', 'required')}
        <label class="mc-ancho">Observaciones<textarea name="observacion">${esc(h.observacion || '')}</textarea></label>
        <button class="btn primario" type="submit">Guardar definición</button>
      </div></fieldset></form><p class="ayuda">Los tipos de contrato son un catálogo simulado. La relación es con el tipo, no necesariamente con el número de un contrato individual.</p></section>`;
  };
  const formDetalle = () => {
    const h = cab(); if (!h) return nota('Primero guarde o seleccione una definición en el paso 1.');
    const d = det() || { monto: 100, moneda: 'BOB', sigla: 'DOC', vigInicio: h.vigInicio, vigFin: h.vigFin, activo: true };
    const bloqueado = d.estado && d.estado !== C.ESTADOS[0], lock = bloqueado ? 'disabled' : '';
    const lista = E.st.recargosCatalogo.filter(x => x.cabeceraId === h.id);
    return `<section class="tarjeta"><h2>2. Recargo · MC_MultasDescuentosDetalle</h2><p>Definición: <strong>${esc(h.denominacion)}</strong>. Cada concepto tiene su propia vigencia, importe y estado.</p>
      <div class="mc-acciones">${btn('nuevoDetalle', 'Nuevo recargo')}</div>
      <label>Recargo<select data-mc-cambio="detalleId"><option value="">Nuevo recargo</option>${opciones(lista, d.id, x => x.concepto + ' · ' + x.estado)}</select></label>
      ${bloqueado ? nota('Fuera de elaboración V1 bloquea concepto, sigla, importe, moneda y vigencia. Activo y Observaciones siguen editables.', 'aviso') : ''}
      <form data-mc-form="detalle" data-ayuda="mcDetalle" class="mc-form">
        ${dato('concepto', 'Concepto', d.concepto || 'Entrega tardía de documentación', 'text', 'required ' + lock)}
        ${dato('sigla', 'Sigla (puede intervenir en la fórmula)', d.sigla, 'text', 'required ' + lock)}
        ${dato('monto', 'Importe base', d.monto, 'number', 'min="0.01" step="0.01" required ' + lock)}
        <label>Moneda / modalidad<select name="moneda" ${lock}>${['BOB', 'USD', '%', 'VAR'].map(x => `<option ${x === d.moneda ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        ${dato('vigInicio', 'Vigencia inicial', d.vigInicio, 'date', `required min="${h.vigInicio}" max="${h.vigFin}" ${lock}`)}
        ${dato('vigFin', 'Vigencia final', d.vigFin, 'date', `required min="${h.vigInicio}" max="${h.vigFin}" ${lock}`)}
        <label class="inline"><input name="activo" type="checkbox" ${d.activo ? 'checked' : ''}> Activo</label>
        <label class="mc-ancho">Observaciones<textarea name="observacion">${esc(d.observacion || '')}</textarea></label>
        <button type="submit" class="btn primario">Guardar recargo</button>
      </form><details><summary>¿Qué cambia con MPF, EHR y VAR?</summary><ul><li>Ordinario: monto × cantidad.</li><li>MPF: monto / 1.000 × cantidad × 1,15.</li><li>EHR: monto / 100 × cantidad × PPT del producto y fecha del CRE.</li><li>VAR: permite modificar el importe al aplicarlo al CRE.</li></ul><p>No confunda precio del producto con tarifa de transporte. Los importes son ficticios.</p></details></section>`;
  };
  const empresas = () => {
    const d = det(); if (!d) return nota('Seleccione o cree el recargo en el paso 2.');
    const lista = C.empresasDisponibles(E.st, C.cabecera(E.st, d));
    return `<section class="tarjeta"><h2>3. Asociar empresas · MC_MultasDescuentosDetalleEmpresas</h2><p><strong>${esc(d.concepto)}</strong>. Seleccionar una empresa NO aplica una multa a sus viajes.</p>
      <form data-mc-form="empresas" data-ayuda="mcEmpresas"><div class="mc-lista">${lista.map(e => `<label><input type="checkbox" name="empresa" value="${e.id}" ${d.empresas.includes(e.id) ? 'checked' : ''}><span><strong>${esc(e.nombre)}</strong><small>EntidadID ${e.id} · contrato del tipo con un extremo de vigencia dentro del periodo contractual.</small></span></label>`).join('') || nota('La consulta simulada no ofrece empresas para este tipo y periodo.')}</div><div class="mc-acciones"><button type="submit" class="btn primario">Guardar empresas asociadas</button></div></form>
      <p class="ayuda">AplicarMultaDescuento.aspx reemplaza estas asociaciones; a pesar del nombre, no registra una multa al CRE. El prototipo usa contratos simplificados, no todo MC_ContratoHistorial.</p></section>`;
  };
  const autorizar = () => {
    const d = det(); if (!d) return nota('Seleccione o cree el recargo en el paso 2.');
    const i = C.ESTADOS.indexOf(d.estado), p = C.PERMISOS[i + 1];
    return `<section class="tarjeta"><h2>4. Autorizar el recargo</h2><p><strong>${esc(d.concepto)}</strong> · <span class="tag ${d.estado === 'LIBERADO' ? 'ok' : 'aviso'}">${esc(d.estado)}</span></p>
      <ol class="mc-historia">${C.ESTADOS.map((x, n) => `<li>${n <= i ? '✓ ' : ''}${esc(x)}${n > 0 ? `<small> · permiso: ${esc(C.PERMISOS[n])}</small>` : ''}</li>`).join('')}</ol>
      ${nota('Estos estados autorizan el RECARGO. No cambian el estado del CRE ni el de la conciliación.')}
      <div class="mc-acciones">${i < 3 ? btn('avanzar', ['Solicitar aprobación', 'Aprobar / solicitar liberación', 'Liberar recargo'][i], ctx().permisos[p] ? '' : 'disabled', true) : '<span class="tag ok">Ya puede ser elegible, si cumple las demás condiciones</span>'}${btn('revertir', 'Rechazar / volver a elaboración', ctx().permisos[C.PERMISOS[4]] ? '' : 'disabled')}</div>
      ${!d.empresas.length ? nota('No hay empresas asociadas. V1 permite avanzar, pero el recargo no aparecerá para aplicar a sus CRE.', 'aviso') : ''}
      <h3>Historial del recargo</h3><ol class="mc-historia">${d.historial.map(x => `<li><strong>${esc(x.estado)}</strong> · ${esc(x.accion)}<br>${esc(x.usuario)} · ${esc(x.fecha)}<br><small>${esc(x.permiso)}</small></li>`).join('') || '<li>Sin transiciones registradas. Un recargo precargado no equivale a una aprobación real.</li>'}</ol></section>`;
  };
  V.panelAplicacionContractual = conc => {
    const v = vs(), modo = E.ui.modo, ambito = v.ambito || 'CRE_D', cres = C.cres(E.st, conc, ambito);
    if (!cres.some(x => x.id === Number(v.creId))) { v.creId = cres[0] ? cres[0].id : null; v.borrador = {}; }
    const filas = E.st.recargosCatalogo.map(d => ({ d, val: C.elegibilidad(E.st, conc, d, ambito, modo) }));
    const [fi, ff] = C.rango(conc), editable = conc.estado === 'En Elaboracion' && ctx().permisos[C.PERMISOS[0]];
    const cre = M.porId(E.st.cres, v.creId);
    const conductor = cre && (M.porId(E.st.conductores, cre.conductorId) || M.porId(E.st.conductores, (M.porId(E.st.cres, conc.lineas.find(l => l.recepcionId === cre.id)?.despachoId) || {}).conductorId));
    const cisterna = cre && M.porId(E.st.cisternas, cre.cisternaId);
    return `<section class="tarjeta"><h2>5. Multas contractuales asociadas al CRE</h2><p>Conciliación N° ${conc.numero} · ${(M.porId(E.st.transportistas, conc.transportistaId) || {}).nombre ? esc(M.porId(E.st.transportistas, conc.transportistaId).nombre) : ''} · ${esc(conc.estado)}</p>
      <div class="mc-form"><label>Operación<select data-mc-cambio="ambito"><option value="CRE_D" ${ambito === 'CRE_D' ? 'selected' : ''}>Despacho</option><option value="CRE_R" ${ambito === 'CRE_R' ? 'selected' : ''}>Recepción</option></select></label><label>CRE<select data-mc-cambio="creId">${opciones(cres, v.creId, x => x.numero + ' · ' + M.fmtF(x.fecha))}</select></label></div>
      <p><strong>${esc(cre ? cre.numero : 'Sin CRE')}</strong> · placa ${esc(cisterna ? cisterna.placa : 'Sin dato')} · conductor ${esc(conductor ? conductor.nombre : 'Sin dato')}.</p>
      ${nota(`La elegibilidad usa el periodo completo: <strong>${esc(M.fmtF(fi))} → ${esc(M.fmtF(ff))}</strong>. No solo la fecha del CRE.`)}
      <details><summary>Campos y conceptos de la captura original</summary><p>La captura muestra CRE 981124 · Despacho · placa 5726-ZNF · WILSON RAMOS YAPITICONA. Es una referencia visual, no un viaje cargado con IDs/fechas/contrato reales.</p><p>Se incorporan sus 13 conceptos bajo Multas Transporte Terrestre para la empresa de estudio Cóndor Andino. El monto fijo no se edita; VAR permite ingresar el costo en BOB. Cantidad indica días, veces o litros según la fórmula, no el descuento final. Monedas: BOB/USD; % es porcentaje y VAR es importe variable.</p><p>MPF: 4,22 USD / 1.000 × litros × 1,15. EHR: 10 / 100 × litros × PPT. Una cantidad 1 en estas fórmulas representa un litro. V1 muestra TC 6,96 fijo desde SQL; no es una cotización actual. En modo Propuesto el TC se puede editar para estudiar USD → BOB multiplicando y BOB → USD dividiendo. El nuevo prototipo LEGACY usa selección de tasas autorizadas simuladas y conserva su fuente.</p><p>Seleccione sólo hechos respaldados. El campo de identificador del incidente del nuevo prototipo es una protección propuesta contra duplicados; no existía en esta ventana V1.</p></details>
      ${editable ? '' : nota('Solo lectura: requiere conciliación en elaboración y permiso simulado MC Aplicar Multa Descuento.', 'aviso')}
      <form data-mc-form="aplicacion" data-ayuda="mcAplicacion" data-conc="${conc.id}" data-cre="${v.creId || ''}"><div class="tabla-scroll"><table class="tabla mc-tabla"><thead><tr><th>Aplicar</th><th>Concepto y modalidad</th><th>Monto</th><th>Cantidad</th><th>TC</th><th>Cálculo antes de guardar</th></tr></thead><tbody>
      ${filas.filter(x => x.val.permitido).map(({ d, val }) => {
        const previo = conc.recargos.find(r => r.catalogoId === d.id && r.creId === Number(v.creId));
        const b = v.borrador[d.id] || { marcado: !!previo, monto: previo ? previo.monto : d.monto, cantidad: previo ? (previo.cantidad ?? 1) : 1, tc: modo === 'V1' ? C.TC_V1 : previo ? previo.tc || E.st.tc : E.st.tc };
        const calc = C.calcular(E.st, conc, { catalogoId: d.id, moneda: d.moneda, creId: Number(v.creId), monto: Number(b.monto), cantidad: Number(b.cantidad), tc: Number(b.tc) }, modo);
        return `<tr data-mc-fila="${d.id}"><td><input type="checkbox" name="marcado" aria-label="Aplicar ${esc(d.concepto)}" ${b.marcado ? 'checked' : ''} ${editable ? '' : 'disabled'}></td><td><strong>${esc(d.concepto)}</strong><small>${esc(d.sigla)} · ${esc(d.moneda)} · ${esc(d.estado)} · ${d.activo ? 'Activo' : 'Inactivo'}</small>${val.aviso ? `<small class="neg">${esc(val.aviso)}</small>` : ''}</td>
          <td><input type="number" name="monto" aria-label="Monto de ${esc(d.concepto)}" step="0.01" min="0.01" value="${b.monto}" ${editable && d.moneda === 'VAR' ? '' : 'disabled'}></td>
          <td><input type="number" name="cantidad" aria-label="Cantidad de ${esc(d.concepto)}" step="1" min="0" value="${b.cantidad}" ${editable ? '' : 'disabled'}><small>${esc(d.cantidadUnidad || (['MPF', 'EHR'].includes(d.sigla) ? 'Litros involucrados' : 'Veces / unidades del concepto'))}</small></td>
          <td><input type="number" name="tc" aria-label="Tipo de cambio de ${esc(d.concepto)}" step="0.01" min="0.01" value="${b.tc}" ${editable && modo !== 'V1' ? '' : 'disabled'}></td>
          <td><strong data-mc-preview>${M.fmtB(calc.total)}</strong><details><summary>Fórmula</summary><ol>${calc.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></details></td></tr>`;
      }).join('') || '<tr><td colspan="6">Ningún recargo elegible. Revise los motivos debajo o complete configuración y liberación.</td></tr>'}
      </tbody></table></div><div class="mc-acciones"><button class="btn primario" type="submit" ${editable && cre ? '' : 'disabled'}>Guardar selección del CRE</button>${btn('descartar', 'Descartar cambios pendientes')}<a class="btn" href="#multascontractuales" data-accion="verConc" data-id="${conc.id}" data-ir="multascontractuales">Configurar multas y recargos</a></div></form>
      ${nota(modo === 'V1' ? 'V1: Guardar elimina las aplicaciones contractuales por CREID y vuelve a insertar las marcadas. Puede afectar otra conciliación que use el mismo CRE. Guardar sin marcas quita todas; se pide confirmación en este prototipo.' : 'Propuesta: el reemplazo se limita al CRE y a esta conciliación; también se excluyen recargos inactivos.', 'aviso')}
      <details><summary>¿Por qué otros recargos no aparecen? (${filas.filter(x => !x.val.permitido).length})</summary><ul>${filas.filter(x => !x.val.permitido).map(({ d, val }) => `<li><strong>${esc(d.concepto)}</strong>: ${val.motivos.map(esc).join(' ')}</li>`).join('')}</ul></details>
      <p class="ayuda">La cantidad entera no negativa corresponde al control de V1. La confirmación y el importe variable estrictamente positivo son protecciones adicionales del prototipo. V1 fija TC en 6,96; no es una cotización actual. No se envía nada a la base real.</p>
      ${filas.some(({ d, val }) => val.permitido && d.sigla === 'MPF') && E.st.multasCRE.some(m => m.creId === Number(v.creId) && m.multaId === 9) ? nota('Existe una multa clásica por filtración en este CRE y también un recargo contractual MPF elegible. Verifique si son el mismo incidente: V1 suma registros distintos y puede duplicar el cobro del hecho.', 'aviso') : ''}</section>`;
  };
  const resultado = conc => {
    if (!conc) return nota('Seleccione una conciliación en el paso 5.');
    let k;
    try { k = M.recalcular(E.st, conc, E.ui.modo).cab; }
    catch (e) { return nota(esc(e.message) + ' Revise las aplicaciones guardadas o cambie al modo Propuesto para estudiar la corrección; no se inventa un neto.', 'error'); }
    return `<section class="tarjeta"><h2>6. Comprobar aplicaciones y cálculo</h2>
      <div class="mc-resumen"><div>Multas clásicas CRE<strong>${M.fmtB(k.multasCRE)} Bs</strong></div><div>Multas contractuales<strong>${M.fmtB(k.multaContractual)} Bs</strong></div><div>Multa Transporte consolidada<strong>${M.fmtB(k.multaTransporte)} Bs</strong></div></div>
      <p><strong>Contractuales + clásicas = Multa Transporte.</strong> No vuelva a sumar las clásicas como otro descuento.</p>
      <div class="tabla-scroll"><table class="tabla mc-tabla"><thead><tr><th>Aplicación</th><th>CRE / concepto</th><th>Monto y cantidad</th><th>Importe en moneda de conciliación</th><th>Registró</th></tr></thead><tbody>${conc.recargos.filter(r => r.catalogoId).map(r => {
        const cre = M.porId(E.st.cres, r.creId), a = C.calcular(E.st, conc, r, E.ui.modo);
        return `<tr><td>${r.id}<small>DetalleID ${r.catalogoId} · ConciliacionID ${conc.id}</small></td><td>${esc(cre ? cre.numero : 'Conciliación')}<br>${esc(r.concepto)}</td><td>${r.monto} ${esc(r.moneda || 'BOB')} × ${r.cantidad ?? 1}</td><td>${M.fmtB(a.total)}<details><summary>Paso a paso</summary><ol>${a.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></details></td><td>${esc(r.registro ? r.registro.usuario : 'Precargado')}<small>${esc(r.registro ? r.registro.fecha : 'Sin auditoría real')}</small></td></tr>`;
      }).join('') || '<tr><td colspan="5">Todavía no hay aplicaciones contractuales.</td></tr>'}</tbody></table></div>
      <p>Flete ${M.fmtB(k.flete)} + merma ${M.fmtB(k.mermas)} + multa transporte ${M.fmtB(k.multaTransporte)} = subtotal cisterna ${M.fmtB(k.flete + k.mermas + k.multaTransporte)} Bs.</p>
      <p><strong>Neto recalculado: ${M.fmtB(k.neto)} Bs.</strong> Neto guardado: ${M.fmtB((conc.totales || {}).neto)} Bs. Aplicar una multa no sobrescribe la instantánea guardada: debe Procesar.</p>
      <div class="mc-acciones">${btn('procesar', 'Calcular y procesar conciliación', `data-id="${conc.id}" ${conc.estado === 'En Elaboracion' ? '' : 'disabled'}`, true)}<a class="btn" href="#recargos">Recargos y otros conceptos</a></div>
      ${nota('D33: la conversión ordinaria de V1 puede invertir el TC. D37: MPF/EHR con varios grupos de moneda/TC detiene el cálculo en modo V1; en Propuesto se suman explícitamente. No se ejecuta SQL.', 'aviso')}
    </section>`;
  };
  V.multascontractuales = () => {
    C.preparar(E.st); const v = vs();
    const concs = E.st.conciliaciones.slice().sort((a, b) => b.numero - a.numero);
    if (!M.porId(concs, v.concId)) v.concId = (concs.find(x => x.estado === 'En Elaboracion') || concs[0] || {}).id;
    const conc = M.porId(concs, v.concId);
    let contenido;
    if (v.paso < 4) contenido = [formDefinicion, formDetalle, empresas, autorizar][v.paso]();
    else contenido = `<section class="tarjeta"><label>Conciliación para estudiar<select data-mc-cambio="concId">${opciones(concs, v.concId, x => 'N° ' + x.numero + ' · ' + (M.porId(E.st.transportistas, x.transportistaId) || {}).nombre + ' · ' + x.estado)}</select></label><div class="mc-acciones">${btn('prepararConciliacion', 'Preparar conciliación con viajes del escenario')}</div><p class="ayuda">No borra el escenario. Reutiliza una conciliación en elaboración o genera una con recepciones elegibles.</p></section>` + (v.paso === 4 ? conc ? V.panelAplicacionContractual(conc) : nota('Prepare una conciliación para continuar.') : resultado(conc));
    return `<header class="vista-cab"><h1>Multas contractuales: de la definición al CRE</h1><p class="sub">Segundo recorrido de SILOG_V1 · configuración ≠ aplicación ≠ procesamiento. Datos ficticios, fuente VB/SQL comprobada.</p></header>
      ${E.ui.ramaMultasOT ? nota(`Está en la rama de <strong>Otros Transportes · conciliación N° ${(M.porId(E.st.conciliaciones, E.ui.ramaMultasOT.concId) || {}).numero}</strong>. Al terminar vuelve a la misma conciliación. Las ediciones pendientes de OT se conservan y se procesan allí. <button class="btn chico" data-accion="tourVolverOT">Volver a Otros Transportes</button>`) : ''}
      ${nota('Estudie los pasos 1 a 6. Para empezar desde cero pulse Nueva definición; los conceptos precargados ya vienen liberados únicamente para facilitar los escenarios.')}
      <nav class="mc-pasos" aria-label="Recorrido de multas contractuales">${etapas.map((t, i) => btn('paso', `${i + 1}. ${t}`, `data-paso="${i}" ${v.paso === i ? 'aria-current="step"' : ''}`)).join('')}</nav>
      <details><summary>Permisos de estudio y límites de la simulación</summary><p>No se asignan permisos por suponer un rol. Puede habilitar/deshabilitar estas actividades para estudiar los bloqueos. Son permisos locales ficticios, no la seguridad externa real.</p><div class="mc-permisos">${C.PERMISOS.map((p, i) => `<label><input type="checkbox" data-mc-permiso="${i}" ${ctx().permisos[p] ? 'checked' : ''}> ${esc(p)}</label>`).join('')}</div><p>Adjuntos se representan por observaciones; no se suben archivos. Barcaza y vagón son tipos de catálogo sin conciliaciones operativas simuladas. No hay concurrencia ni transacciones SQL reales.</p></details>
      ${contenido}<div class="mc-acciones">${v.paso ? btn('paso', '← Paso anterior', `data-paso="${v.paso - 1}"`) : ''}${v.paso < 5 ? btn('paso', 'Siguiente paso →', `data-paso="${v.paso + 1}"`) : ''}</div>`;
  };
  V.NOMBRES_VISTA.multascontractuales = 'Multas contractuales: recorrido completo';
  const ayudas = {
    mcCabecera: ['Definición general', 'Guarda denominación, tipo, ámbito y vigencia en MC_MultasDescuentos. No aplica ningún cobro.'],
    mcDetalle: ['Concepto de recargo', 'Guarda importe, moneda, sigla, vigencia y Activo. MPF/EHR cambian la fórmula; VAR permite editar el importe al aplicar.'],
    mcEmpresas: ['Asociar empresas', 'Reemplaza las entidades asociadas al recargo. AplicarMultaDescuento.aspx no aplica todavía una multa al CRE.'],
    mcAplicacion: ['Aplicar al CRE', 'Guarda las casillas seleccionadas y reemplaza aplicaciones por CREID en V1. El borrador no es una multa registrada; el neto guardado se actualiza al procesar.'],
    mcavanzar: ['Autorizar recargo', 'Requiere la actividad del siguiente estado. El estado del recargo no es el estado de la conciliación.'],
    mcrevertir: ['Rechazar / volver a elaboración', 'V1 deniega la reversión cuando el recargo ya existe en una conciliación. Primero quite la aplicación si corresponde.'],
    mcprocesar: ['Procesar conciliación', 'Persiste el neto calculado. Las multas clásicas y contractuales ya están consolidadas en Multa Transporte.'],
    mcpaso: ['Paso del recorrido', 'Navega entre los seis pasos; no guarda campos pendientes.'],
    mcnuevaCabecera: ['Nueva definición', 'Abre un formulario nuevo; no borra la definición anterior.'],
    mcnuevoDetalle: ['Nuevo recargo', 'Crea otro concepto dentro de la definición seleccionada.'],
    mcdescartar: ['Descartar borrador', 'Vuelve a los valores guardados del CRE, sin borrar las aplicaciones.'],
    mcprepararConciliacion: ['Preparar conciliación de estudio', 'Reutiliza una conciliación en elaboración o genera una con viajes elegibles. No reinicia el escenario.']
  };
  Object.entries(ayudas).forEach(([k, [t, que]]) => { SILOG.AYUDA[k] = { t, que, para: 'Estudiar configuración, autorización y aplicación por separado.', clic: que, v1: 'Recorrido comprobado en VB y SQL; permisos y datos ficticios.', ux: 'Explicar el efecto antes de guardar.' }; });
  SILOG.INTRO_VISTAS.multascontractuales = { proposito: 'Configurar, asociar, liberar y aplicar multas contractuales; entender por qué un recargo aparece o no para un CRE.', quien: 'Analista y autorizadores (permisos simulados).', cuando: 'Para estudiar el segundo recorrido de multas de V1.', pasos: etapas, observar: ['Definir y asociar no generan un cobro.', 'Guardar el CRE reemplaza la selección; Procesar persiste el nuevo neto.'], ux: ['Separar configuración, autorización y aplicación; mostrar los motivos de exclusión y la trazabilidad.'] };
  SILOG.FUENTES.multascontractuales = { resumen: 'Recorrido contractual investigado en formularios VB y SQL; las diferencias y protecciones se declaran en pantalla.', items: [
    ['Control de usuario', 'DetalleMultaDescuento.ascx.vb', 'LOGISTICA/UserControls/DetalleMultaDescuento.ascx.vb:173-237,300-358', 'Cabecera, transiciones, permisos y reversión bloqueada si ya se utilizó.'],
    ['Código VB', 'InclusionMultaDescuento.aspx.vb', 'LOGISTICA/InclusionMultaDescuento.aspx.vb:7-149', 'Recargo, vigencia, monto positivo y edición bloqueada fuera de elaboración.'],
    ['Código VB', 'AplicarMultaDescuento.aspx.vb', 'LOGISTICA/AplicarMultaDescuento.aspx.vb:36-87', 'Asociación a entidades, no aplicación al CRE.'],
    ['Código VB', 'AdicionarMultaAlCRE.aspx.vb', 'LOGISTICA/AdicionarMultaAlCRE.aspx.vb:43-137', 'Periodo completo, importe VAR, reemplazo por CREID y registros de aplicación.'],
    ['Procedimiento', 'MC_CargarMultasParaCRE', null, 'Tipo, vigencia, LIBERADO, empresa, ámbito; no filtra Activo.'],
    ['Función', 'MC_ObtenerMultaDescuentoAplicado', null, 'Ordinario, MPF, EHR; consolida multas clásicas sin duplicarlas.'],
    ...['MC_MultasDescuentos', 'MC_MultasDescuentosDetalle', 'MC_MultasDescuentosDetalleEmpresas', 'MC_MultaDescuentoConciliacion'].map(n => ['Tabla', n, null, 'Definición → concepto → empresas → aplicación al CRE/conciliación.'])
  ] };
})(SILOG.vistas);

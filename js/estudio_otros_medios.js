/* Presentación del laboratorio: usa el motor auditado, sin duplicar sus fórmulas. */
(function (V) {
  const L = SILOG.calculosOtrosMedios, M = SILOG.motor, esc = V.esc;
  const entradas = { barcaza: L.entradaInicial('barcaza'), vagon: L.entradaInicial('vagon') };
  const fuente = nombre => SILOG.SIN_SQL ? `<code>${esc(nombre)}</code>` : `<a href="../EXTRACCION_SQL_CONCILIACIONES/StoredProcedure__${esc(nombre)}.sql" target="_blank" rel="noopener">${esc(nombre)}</a>`;
  V.resultadosOtrosMedios = (tipo, entrada) => {
    const r = L.evaluar(tipo, entrada);
    if (!r.ok) return `<div class="nota nota-error" role="alert"><strong>No se calculó: corrige los datos.</strong><ul>${r.errores.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return `<div class="estudio-medios__totales">
      <div><span>Neto que guardaría V1</span><strong>${esc(M.fmtB(r.netoGuardado))} Bs</strong><small>${tipo === 'barcaza' ? 'Flete con compensación + merma negativa no liberada.' : 'Solo flete; sin sumar formularios.'}</small></div>
      <div><span>Neto mostrado en Totales</span><strong>${esc(M.fmtB(r.netoVisual))} Bs</strong><small>Simula el filtro CInt de la pantalla y los recargos ya calculados.</small></div>
      <div><span>Diferencia visual − guardado</span><strong>${esc(M.fmtB(r.diferencia))} Bs</strong><small>No es otro cobro: compara dos fórmulas históricas distintas.</small></div>
    </div>
    ${r.avisos.map(a => `<p class="nota nota-aviso">${esc(a)}</p>`).join('')}
    <h4>1. Sigue el cálculo de la recepción</h4>${r.fichas.map(V.fichaCalculo).join('')}
    <h4>2. Comprueba qué se suma y qué se omite en pantalla</h4>
    <div class="tabla-scroll"><table class="tabla"><caption>Importes en Bs. Introducidos los recargos, se supone que ya están calculados y convertidos.</caption><thead><tr><th scope="col">Concepto</th><th scope="col">Importe firmado</th><th scope="col">CInt(importe)</th><th scope="col">¿La pantalla V1 lo suma?</th></tr></thead><tbody>
      ${r.conceptos.map(c => `<tr><th scope="row">${esc(c.titulo)}</th><td>${esc(M.fmtB(c.monto))}</td><td>${esc(M.cintBancario(c.monto))}</td><td>${c.incluido ? 'Sí, suma el decimal original' : c.monto === 0 ? 'No: es cero' : 'No: el decimal se convierte en cero'}</td></tr>`).join('')}
    </tbody></table></div>
    <p><strong>Operación visual:</strong> ${r.conceptos.filter(c => c.incluido).map(c => `(${esc(M.fmtB(c.monto))})`).join(' + ') || '0'} = <strong>${esc(M.fmtB(r.netoVisual))} Bs</strong>.</p>
    <p>Suma de todos los decimales sin el filtro CInt: <strong>${esc(M.fmtB(r.sumaSinFiltro))} Bs</strong>. Es una comparación didáctica, no un importe aprobado ni registrado.</p>
    <details class="estudio-bloque"><summary>3. Evidencia, límites y qué debería revisarse</summary>
      <ul><li>VB: <code>LOGISTICA/UserControls/ConciliacionOtrosTransportes.ascx.vb:533–591</code> (cabecera, formularios y Totales)${tipo === 'barcaza' ? '; líneas 659–725 (compensación, tarifa especial y UPDATE con capacidad cero)' : '; <code>ConciliacionOTDetalle.ascx.vb:695–928</code> (kg, toneladas y peso específico)'}.</li>
      <li>SQL: ${fuente('ObtenerTotalesConciliacion')} y ${fuente('ObtenerMontosDeConciliacion')}.</li>
      <li>Se estudia una recepción consolidada y un producto. No se genera el expediente completo de barcaza/vagón, no se prorratean viajes, no se consulta SQL ni se ejecuta SAP.</li>
      <li>Los datos son simulados y las cifras se expresan en Bs. Se replica la aritmética seleccionada, no el tratamiento fiscal ni la conversión contractual completa.</li>
      <li>Propuesta pendiente de decisión: unificar neto guardado, mostrado, reporte y documento financiero; no ocultar centavos y auditar las reversiones de ajustes.</li></ul>
    </details>`;
  };
  const formulario = tipo => {
    const entrada = entradas[tipo], nombre = tipo === 'barcaza' ? 'Barcaza' : 'Vagón';
    return `<details class="estudio-bloque" ${tipo === 'barcaza' ? 'open' : ''}><summary>${nombre}: cambia los datos y sigue el cálculo</summary>
      <div class="estudio-medios__casos" role="group" aria-label="Ejemplos de ${nombre}">${L.CASOS.filter(c => c.tipo === tipo).map(c => `<button type="button" class="btn chico" data-medio-caso="${esc(c.id)}">${esc(c.titulo)}</button>`).join('')}</div>
      ${tipo === 'barcaza' ? '<p class="nota nota-info">Este ejercicio recalcula flete y compensación. El C/D monetario es un dato independiente ya calculado: si modificas litros, revisa también ese campo. Para estudiar el balance y el admisible usa <a href="#creditodebito">Crédito/débito paso a paso</a>, teniendo presente la diferencia de prorrateo de barcaza (D31).</p>' : ''}
      <form data-estudio-medio="${tipo}"><div class="estudio-medios__campos">${L.CAMPOS[tipo].map(c => {
        const id = `medio-${tipo}-${c.nombre}`;
        return `<label for="${id}"><span>${esc(c.titulo)} <small>(${esc(c.unidad)})</small></span><input id="${id}" name="${c.nombre}" type="number" required min="${c.min}" max="${c.max}" step="${c.paso}" value="${esc(entrada[c.nombre])}" aria-describedby="${id}-ayuda"><small id="${id}-ayuda">${esc(c.ayuda)}</small></label>`;
      }).join('')}</div>${tipo === 'barcaza' ? `<label class="estudio-medios__casilla"><input name="liberarMerma" type="checkbox" ${entrada.liberarMerma ? 'checked' : ''}> Liberar merma de toda esta recepción: el C/D no descuenta.</label>` : ''}
      <p><button class="btn primario" type="submit">Calcular ${nombre.toLowerCase()}</button> Los resultados se actualizan al editar. No se guardan en la conciliación.</p>
      <p class="estudio-medios__estado" data-estado-medio="${tipo}" role="status" aria-live="polite" aria-atomic="true">Resultados del ejemplo inicial.</p>
      <div data-resultado-medio="${tipo}">${V.resultadosOtrosMedios(tipo, entrada)}</div></form></details>`;
  };
  V.laboratorioOtrosMedios = () => `<section class="tarjeta estudio estudio-medios" id="laboratorio-otros-medios" aria-labelledby="titulo-laboratorio-medios"><h2 id="titulo-laboratorio-medios">Barcazas y vagones: laboratorio editable de V1</h2>
    <p>Prueba un caso, modifica los campos y abre cada fórmula. Se reproduce el <strong>código histórico V1 incluso si arriba seleccionas modo Propuesto</strong>; no se cambia silenciosamente de política.</p>
    <p class="nota nota-info">Simulación aislada, sin registrar documentos. Los ejemplos permiten estudiar las diferencias; no prueban que una conciliación real tenga esos errores.</p>
    ${formulario('barcaza')}${formulario('vagon')}</section>`;
  const ejemplos = V.ejemplosCalculoOT;
  V.ejemplosCalculoOT = () => V.laboratorioOtrosMedios() + ejemplos();

  // Render parcial: no reemplazar el formulario al teclear ni perder foco o posición.
  const leer = form => {
    const e = {};
    L.CAMPOS[form.dataset.estudioMedio].forEach(c => { e[c.nombre] = form.elements.namedItem(c.nombre).value; });
    e.liberarMerma = !!form.elements.namedItem('liberarMerma')?.checked;
    return e;
  };
  const actualizar = form => {
    const tipo = form.dataset.estudioMedio;
    entradas[tipo] = leer(form);
    form.querySelector('[data-resultado-medio]').innerHTML = V.resultadosOtrosMedios(tipo, entradas[tipo]);
    const r = L.evaluar(tipo, entradas[tipo]);
    form.querySelector('[data-estado-medio]').textContent = r.ok
      ? `Resultados actualizados. Neto guardado: ${M.fmtB(r.netoGuardado)} Bs. Neto visual: ${M.fmtB(r.netoVisual)} Bs.`
      : 'No se calculó. Corrige los campos indicados debajo.';
  };
  document.addEventListener('input', ev => {
    const form = ev.target.closest('form[data-estudio-medio]');
    if (form) actualizar(form);
  });
  document.addEventListener('submit', ev => {
    const form = ev.target.closest('form[data-estudio-medio]');
    if (!form) return;
    ev.preventDefault(); actualizar(form);
  });
  document.addEventListener('click', ev => {
    const boton = ev.target.closest('[data-medio-caso]');
    if (!boton) return;
    const caso = L.CASOS.find(c => c.id === boton.dataset.medioCaso);
    if (!caso) return;
    const bloque = boton.closest('.estudio-bloque'), form = bloque.querySelector('form[data-estudio-medio]');
    Object.entries(caso.datos).forEach(([nombre, valor]) => {
      const input = form.elements.namedItem(nombre);
      if (input.type === 'checkbox') input.checked = valor; else input.value = valor;
    });
    actualizar(form);
  });
})(SILOG.vistas);

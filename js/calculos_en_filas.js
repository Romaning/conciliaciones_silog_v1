/* Ayudas locales a cada celda. Se abre una fila de lectura sin redibujar el formulario. */
window.SILOG = window.SILOG || {};
(function (C) {
  const V = SILOG.vistas, esc = V.esc;
  let siguiente = 0;
  V.celdaCalculo = (valorHtml, datos) => {
    const fichas = [].concat(datos || []).filter(Boolean);
    if (!fichas.length) return valorHtml;
    const id = 'calculo-local-' + (++siguiente);
    const titulo = fichas[0].titulo;
    const guiaCD = SILOG.creditoDebito && fichas.some(x => SILOG.creditoDebito.clavesAyuda.has(x.clave))
      ? '<p><a href="#creditodebito">¿Qué significa crédito/débito? Ver explicación y casos paso a paso</a></p>' : '';
    return `<span class="calculo-celda"><span>${valorHtml}</span><button type="button" class="calculo-boton" data-accion="abrirCalculoFila" aria-expanded="false" aria-controls="${id}" aria-label="Ver cálculo: ${esc(titulo)}" title="Ver cálculo: ${esc(titulo)}">ⓘ</button>
      <template><section id="${id}" class="calculo-panel" role="region" aria-label="${esc(titulo)}"><div class="calculo-panel-cab"><h3 tabindex="-1">${esc(titulo)}</h3><button type="button" class="btn chico" data-accion="cerrarCalculoFila" aria-label="Cerrar explicación y volver al importe">Cerrar</button></div>
      ${fichas.map(x => `<div class="calculo-desglose"><p class="calculo-resultado"><strong>${esc(x.titulo)}:</strong> ${x.valor == null ? 'Sin dato guardado' : esc(SILOG.motor.fmtB(x.valor))} ${esc(x.unidad)}</p><ol>${x.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol><p class="estudio-fuente"><strong>Evidencia:</strong> ${esc(x.fuente)}</p></div>`).join('')}${guiaCD}</section></template></span>`;
  };
  C.cerrar = el => {
    const fila = el.closest('tr.calculo-fila');
    if (!fila) return;
    const boton = fila._activadorCalculo;
    fila.remove();
    if (boton) { boton.setAttribute('aria-expanded', 'false'); boton.focus({ preventScroll: true }); }
  };
  C.abrir = el => {
    const celda = el.closest('.calculo-celda');
    const fila = el.closest('tr[data-fila-calculo]') || el.closest('tr');
    const plantilla = celda && celda.querySelector('template');
    if (!fila || !plantilla) return;
    const abierta = fila.nextElementSibling;
    if (abierta && abierta.classList.contains('calculo-fila')) {
      const mismo = abierta._activadorCalculo === el;
      C.cerrar(abierta);
      if (mismo) return;
    }
    const expansion = document.createElement('tr'), contenido = document.createElement('td');
    expansion.className = 'calculo-fila';
    expansion._activadorCalculo = el;
    contenido.colSpan = Array.from(fila.cells).reduce((n, c) => n + c.colSpan, 0);
    contenido.appendChild(plantilla.content.cloneNode(true));
    expansion.appendChild(contenido);
    fila.after(expansion);
    el.setAttribute('aria-expanded', 'true');
    const titulo = contenido.querySelector('h3');
    if (titulo) titulo.focus({ preventScroll: true });
  };
})(SILOG.calculosEnFilas = {});

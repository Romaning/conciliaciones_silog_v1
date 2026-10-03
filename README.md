# Prototipo de conciliaciones de transporte (SILOG V1)

Prototipo navegable en HTML, CSS y JavaScript, sin dependencias, que reproduce cómo el sistema
SILOG V1 origina, calcula, aprueba y contabiliza las conciliaciones de transporte en cisternas, y
muestra cómo debería funcionar en una reingeniería.

**Todos los datos son ficticios**: empresas, personas, placas, volúmenes, tarifas y precios. Los
nombres de pantallas, tablas y procedimientos de SILOG V1 aparecen en los paneles "Fuentes" para
explicar de dónde viene cada regla.

## Cómo empezar

1. Abre la página publicada (o `index.html` en Chrome o Edge).
2. En **Escenario de prueba** elige:
   - **T. Aprende paso a paso**: construye un viaje completo desde cero, de la orden de despacho a
     la liberación en SAP.
   - **O. Otros Transportes de principio a fin**: recorre la pantalla "Conciliación Otros
     Transportes" con una quincena realista, desde la generación hasta la liberación.
3. Sigue la tarjeta **▶ Guía**: dice qué hacer, por qué y qué verás; resalta dónde hacer clic y
   "Hazlo por mí" ejecuta el paso.

Otras ayudas:

- **? Ayuda**: mientras está activa, hacer clic en un elemento con borde punteado lo explica en vez
  de ejecutarlo.
- **Cómo usar esta pantalla**: panel plegable con propósito, pasos y lecciones de cada vista.
- **Otros Transportes: de principio a fin**: las 17 etapas del circuito, dónde empieza y dónde
  termina el trabajo en la pantalla, alternativas, resultado final y origen de cada dato.
- **¿Qué hago ahora?** y **🔎** en "Conciliación Otros Transportes": siguiente paso resaltado y
  origen de cada fila.
- **Reiniciar escenario** vuelve a los datos iniciales; el estado se guarda en el navegador.
- **Modo V1 / Propuesto** compara el comportamiento actual con la propuesta.

## Ejecutarlo localmente

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000/`. También funciona con doble clic en `index.html`.

## Verificación automática

```bash
node pruebas/verificar_escenarios.js
```

Ejecuta los guiones de los doce escenarios con el mismo motor que usa la interfaz y compara los
resultados esperados (montos, estados y mensajes).

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Cabecera, menú y contenedor. |
| `css/estilos.css` | Estilos con tema claro y oscuro. |
| `js/datos.js` | Catálogos ficticios y viajes del escenario general. |
| `js/escenarios.js` | Escenarios de prueba con su guion y resultados esperados. |
| `js/fuentes.js` | Trazabilidad: objetos de SILOG V1 de cada vista y columna. |
| `js/motor.js` | Cálculo de la conciliación, estados y SAP, sin efectos. |
| `js/tour.js` | Recorrido guiado y escenario T. |
| `js/recorrido_ot.js` | Etapas de Otros Transportes, escenario O y su recorrido. |
| `js/ayuda.js` | Textos de "Cómo usar esta pantalla" y del modo ayuda. |
| `js/estado.js` | Estado, persistencia y acciones de negocio. |
| `js/vistas.js` | Pantallas. |
| `js/app.js` | Navegación, eventos, guía y modo ayuda. |

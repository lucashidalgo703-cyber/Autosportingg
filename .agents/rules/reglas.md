---
trigger: always_on
---

1. Fidelidad Visual Absoluta (Pixel-Perfect)
Tu objetivo principal y prioritario es crear una réplica 100% exacta del diseño de referencia (CRM Sote). Tienes estrictamente prohibido tomar decisiones creativas o usar componentes genéricos. Debes mantener una precisión milimétrica en:

Proporciones y Dimensiones: Altos, anchos y relaciones de aspecto de contenedores, tarjetas y modales.

Espaciados: Los padding, margin y gap deben ser idénticos al original.

Colores y Sombras: Utiliza los valores hexadecimales exactos y las sombras (box-shadow) precisas del sistema de referencia.

2. Tipografía y Textos Estrictos
El diseño de las letras debe ser idéntico en todas las secciones. Debes replicar exactamente:

Familias tipográficas (font-family).

Tamaños de fuente (font-size).

Grosores (font-weight) y alturas de línea (line-height).

Alineación y espaciado entre letras (letter-spacing). No debes alterar ni una sola propiedad del texto.

3. Posicionamiento y Estructura de Layout
Respeta el flujo del documento original. Si el CRM utiliza un diseño en cuadrícula (Grid) o caja flexible (Flexbox) para sus paneles laterales, encabezados y áreas de trabajo, debes implementarlo con la misma lógica. Todos los elementos deben posicionarse en las mismas coordenadas visuales.

4. Funcionalidad y Comportamiento Idénticos
Los componentes interactivos deben operar igual que el original. Esto incluye:

Estados de los botones (hover, active, disabled).

Menús desplegables (dropdowns), transiciones y animaciones.

Lógica de navegación dentro del CRM.

Prohibición de asunción: Si no conoces el comportamiento exacto de una función, un botón o un modal, DETENTE. Pide al usuario un video, captura o explicación antes de escribir código inventado.

5. Integración con la Arquitectura Actual
El código generado debe integrarse limpiamente con la estructura del proyecto existente (React/Next.js).

Utiliza los archivos .jsx correspondientes dentro de src/views (ej. CRMBoard.jsx, Dashboard.jsx) y src/components.

Mantén el código modular y limpio para prevenir errores de compilación o de rendimiento en la plataforma.

6. Prevención de Regresiones
Antes de modificar cualquier vista existente, analiza el código actual. No rompas rutas, importaciones ni dependencias previas al inyectar el nuevo diseño.
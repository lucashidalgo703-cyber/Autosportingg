# Guía de Mantenimiento del Manual de Ayuda

El manual de AutoSporting es un documento vivo incrustado directamente en el código (`src/lib/help/helpRegistry.js`). Esto asegura que evolucione junto a las funcionalidades y nunca quede obsoleto.

## ¿Cómo agregar un capítulo nuevo?

1. Dirígete a `src/lib/help/helpRegistry.js`.
2. Busca la categoría correcta (ej. `finanzas` o `operacion`).
3. Inserta un nuevo objeto respetando el esquema estricto:
```javascript
{
    id: 'nuevo-modulo', // Slug único para deep-linking
    category: 'administracion',
    order: 10,
    title: 'Nuevo Módulo',
    icon: 'Star', // Importado desde lucide-react
    roles: ['Owner/Admin'], // Roles permitidos
    summary: 'Descripción breve.',
    steps: [
        {
            title: 'Paso 1',
            body: 'Descripción de qué hacer.',
            actionLabel: 'Ir al Módulo', // Opcional
            actionRoute: '/admin/nuevo-modulo' // Opcional
        }
    ],
    tips: ['Un consejo útil sobre este módulo.'],
    keywords: ['palabra1', 'palabra2'],
    route: '/admin/nuevo-modulo', // Ruta para el mapping de CrmPageHeader
    featureFlag: null,
    implementationStatus: 'implemented',
    version: '1.0',
    lastReviewed: 'YYYY-MM-DD',
    reviewedBy: 'Nombre'
}
```

## ¿Cómo modificarlo?
Cualquier cambio en la interfaz (un nuevo botón, un permiso removido, un estado en el pipeline) DEBE reflejarse en el manual. Actualiza el `body` de los `steps` correspondientes en el `helpRegistry.js`.

## Actualización de lastReviewed
Cada vez que modifiques o audites un capítulo, actualiza el campo `lastReviewed` con la fecha actual (Formato `YYYY-MM-DD`) y `reviewedBy` con tu nombre o rol.

## Mapeo de Rutas y Ayuda Contextual
Para que el icono de ayuda aparezca automáticamente en la pantalla de la función:
1. Asegúrate de que el campo `route` en el capítulo esté correctamente definido.
2. Si creas una ruta completamente nueva, agrégala al objeto `ROUTE_HELP_MAP` dentro de `src/components/crm/ui/CrmPageHeader.jsx` mapeando hacia el `id` de tu capítulo.

## Feature Flags
Si vas a documentar una función que aún no está activa en producción, puedes asignarle:
`featureFlag: false`
Esto ocultará el capítulo del manual temporalmente, evitando confundir a los usuarios con opciones que aún no pueden usar.

## Responsabilidades
- **El Desarrollador** es responsable de actualizar el manual como parte de su Pull Request. Ningún PR será aprobado si incluye cambios sustanciales en UI/UX y omite la actualización del manual.
- **Auditoría Trimestral:** La administración debe ejecutar una auditoría de todos los capítulos cada 3 meses buscando inconsistencias.

export const helpRegistry = [

    // ---------------------------------------------------------
    // CATEGORÍA: PRIMEROS PASOS
    // ---------------------------------------------------------
    {
        id: 'login-y-acceso',
        emoji: '🔑',
        title: 'Ingresar al CRM',
        category: 'primeros-pasos',
        icon: 'LogIn',
        route: '/login',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Recepción', 'Taller', 'Solo lectura'],
        summary: 'Aprendé cómo iniciar sesión de forma segura y qué hacer si olvidás tu contraseña.',
        steps: [
            { title: 'Iniciá sesión', body: 'Ingresá tu correo corporativo y contraseña en la pantalla principal.' },
            { title: 'Doble factor', body: 'Si tenés activado 2FA, ingresá el código de 6 dígitos que te llega al celular.' },
            { title: 'Recuperá tu clave', body: 'Hacé clic en "¿Olvidaste tu contraseña?" para recibir un mail de reseteo.' }
        ],
        tips: [
            'Nunca compartas tu clave con otros usuarios.',
            'Si usás una compu pública, acordate de cerrar sesión al terminar.'
        ],
        keywords: ['login', 'acceso', 'contraseña', 'entrar']
    },
    {
        id: 'navegacion-basica',
        emoji: '🧭',
        title: 'Cómo moverte por el sistema',
        category: 'primeros-pasos',
        icon: 'Compass',
        route: '/admin',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Recepción', 'Taller', 'Solo lectura'],
        summary: 'Usá el menú, los accesos del celular y la búsqueda global para moverte por AutoSporting.',
        steps: [
            { title: 'Menú principal', body: 'En escritorio podés colapsar el menú para ganar espacio. En el celular, abrilo desde el botón superior; Ventas, Calendario y los módulos propios siguen disponibles allí.' },
            { title: 'Accesos del celular', body: 'La barra inferior ofrece Dashboard, Stock, Clientes, Finanzas y Mi Espacio según tus permisos.' },
            { title: 'Búsqueda y teclado', body: 'El buscador superior consulta clientes, vehículos y ventas. Recorré sus resultados con Tab y abrilos con Enter; Escape cierra los resultados, las notificaciones o el menú móvil.' },
            { title: 'Tema y sesión', body: 'Cambiá entre modo día y noche desde la barra superior en escritorio o desde tu perfil. El rol mostrado corresponde a tu sesión.' }
        ],
        tips: [
            'En el menú móvil, Tab permanece dentro del panel; al cerrarlo, el foco vuelve al botón que lo abrió.',
            'Los accesos visibles no reemplazan los permisos de cada operación.'
        ],
        keywords: ['menu', 'sidebar', 'navegar', 'buscar', 'movil', 'teclado', 'tema'],
        version: '1.1',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },
    {
        id: 'roles-permisos',
        emoji: '🛡️',
        title: 'Roles y permisos',
        category: 'primeros-pasos',
        icon: 'Shield',
        route: '/admin/configuracion/usuarios',
        roles: ['Owner/Admin'],
        summary: 'Descubrí qué puede ver y hacer cada usuario según su puesto en la agencia.',
        steps: [
            { title: 'Roles principales', body: 'El rol define qué módulos y acciones tenés disponibles. La asignación de un cliente indica quién hace su seguimiento.' },
            { title: 'Permisos especiales', body: 'Configurá quién puede borrar ventas, aprobar descuentos o exportar reportes.' },
            { title: 'Asignar permisos', body: 'Desde Configuración > Usuarios, elegí el usuario y cambiá su rol desde el selector.' }
        ],
        tips: [
            'No des permisos de Owner a usuarios que solo necesitan cargar datos.'
        ],
        keywords: ['seguridad', 'vendedor', 'admin', 'accesos'],
        version: '1.1',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },
    {
        id: 'app-celular',
        emoji: '📱',
        title: 'Usar el CRM en el celular',
        category: 'primeros-pasos',
        icon: 'Smartphone',
        route: '/admin/mi-espacio',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Cómo adaptar la pantalla y usar las funciones clave desde tu móvil.',
        steps: [
            { title: 'Acceso móvil', body: 'Abrí el navegador de tu celular, ingresá al CRM y logueate. La interfaz se ajusta sola.' },
            { title: 'Menú inferior', body: 'Tenés accesos a Dashboard, Stock, Clientes, Finanzas y Mi Espacio según tus permisos. El botón de arriba abre el menú completo, incluidas Ventas y Calendario.' },
            { title: 'Tablas', body: 'Deslizá hacia la derecha para ver columnas ocultas en las tablas de clientes o stock.' }
        ],
        tips: [
            'Ideal para subir fotos del stock directamente desde la cámara del celu.'
        ],
        keywords: ['movil', 'responsive', 'celular', 'app'],
        version: '1.1',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },

    // ---------------------------------------------------------
    // CATEGORÍA: EL DÍA A DÍA
    // ---------------------------------------------------------
    {
        id: 'dashboard-principal',
        emoji: '📊',
        title: 'Dashboard',
        category: 'dia-a-dia',
        icon: 'LayoutDashboard',
        route: '/admin',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Tu panel de control con métricas rápidas de ventas, cobros y tareas del día.',
        steps: [
            { title: 'Métricas clave', body: 'Revisá los autos vendidos, stock activo y objetivos cumplidos en las tarjetas superiores.' },
            { title: 'Gráficos', body: 'Analizá la evolución mensual de ventas y el embudo de clientes.' },
            { title: 'Filtro por fechas', body: 'Usá el selector de fecha arriba a la derecha para cambiar el período (hoy, este mes, este año).' }
        ],
        tips: [
            'Revisá el dashboard cada mañana para priorizar tus tareas diarias.'
        ],
        keywords: ['inicio', 'graficos', 'resumen', 'metricas']
    },
    {
        id: 'calendario-tareas',
        emoji: '📅',
        title: 'Calendario',
        category: 'dia-a-dia',
        icon: 'CalendarDays',
        route: '/admin/agenda',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría'],
        summary: 'Agendá llamadas, visitas y entregas para que no se te pase nada.',
        steps: [
            { title: 'Ver tu mes', body: 'Ingresá al calendario para ver todas tus citas. Podés alternar entre vista diaria, semanal o mensual.' },
            { title: 'Crear evento', body: 'Hacé clic en cualquier día vacío o usá el botón "Nueva Tarea" para agendar una reunión.' },
            { title: 'Vincular a cliente', body: 'Cuando crees la tarea, buská al cliente para que quede en su historial.' }
        ],
        tips: [
            'Marcá las tareas como "Completadas" para limpiar tu agenda.'
        ],
        keywords: ['agenda', 'eventos', 'reuniones', 'entregas']
    },
    {
        id: 'centro-alertas',
        emoji: '🔔',
        title: 'Alertas',
        category: 'dia-a-dia',
        icon: 'BellRing',
        route: '/admin/alertas',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría'],
        summary: 'Notificaciones sobre clientes que esperan respuesta o trámites por vencer.',
        steps: [
            { title: 'Campanita superior', body: 'Hacé clic en la campanita arriba a la derecha para ver las alertas recientes.' },
            { title: 'Centro de Alertas', body: 'Entrá al módulo completo desde el menú para ver el historial y filtrar por tipo.' },
            { title: 'Marcar leídas', body: 'Hacé clic en el tilde para archivar las alertas que ya revisaste.' }
        ],
        tips: [
            'Las alertas rojas requieren tu atención inmediata (ej. seña por vencer).'
        ],
        keywords: ['notificaciones', 'avisos', 'campana']
    },
    {
        id: 'mi-espacio',
        emoji: '📁',
        title: 'Mi Espacio',
        category: 'dia-a-dia',
        icon: 'User',
        route: '/admin/mi-espacio',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Tu área personal para ver tus comisiones, rendimiento y metas asignadas.',
        steps: [
            { title: 'Tus métricas', body: 'Mirá cuántos autos vendiste en el mes y tu tasa de cierre personal.' },
            { title: 'Tus comisiones', body: 'Revisá el detalle de cuánto ganaste por cada operación.' },
            { title: 'Tus metas', body: 'Controlá si estás cerca de cumplir el objetivo mensual que te fijó la agencia.' }
        ],
        tips: [
            'Revisá esta sección antes de cerrar el mes para saber cuánto te falta para el bono.'
        ],
        keywords: ['perfil', 'comisiones', 'rendimiento', 'estadisticas personales']
    },

    // ---------------------------------------------------------
    // CATEGORÍA: COMERCIAL
    // ---------------------------------------------------------
    {
        id: 'gestion-stock',
        emoji: '🚘',
        title: 'Stock',
        category: 'comercial',
        icon: 'Car',
        route: '/admin/stock',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Administrá los vehículos disponibles: propios, consignaciones y 0km.',
        steps: [
            { title: 'Inventario', body: 'Buscá por marca y modelo, moneda, precio, kilometraje y días en stock. Las variantes de mayúsculas y espacios se agrupan al buscar sin cambiar los registros originales. Elegí ARS o USD antes de filtrar por precio.' },
            { title: 'Atención y vistas', body: 'Estancados reúne unidades con más de 90 días. A revisar identifica registros sin publicación en ML, sin foto o sin precio. Alterná Lista, Tarjetas y Tabla detallada; el orden manual del catálogo sigue disponible.' },
            { title: 'Capital e inversores', body: 'Usá esta vista para consultar el resumen patrimonial, las participaciones y el desglose de capital. Conserva las herramientas de inversión de la agencia; podés volver al Inventario sin salir de Stock.' },
            { title: 'Cargá uno nuevo', body: 'Hacé clic en "Nuevo vehículo" y completá los datos de la unidad y el precio.' },
            { title: 'Fotos y detalles', body: 'Entrá a la ficha técnica para subir la galería de imágenes y cargar el equipamiento.' },
            { title: 'Exportá el stock', body: 'Exportar todo XLSX conserva la descarga completa. Exportar vista descarga los vehículos del filtro en todas sus páginas.' }
        ],
        tips: [
            'Mantené los precios actualizados y marcá los autos reservados para evitar que otro vendedor los ofrezca.'
        ],
        keywords: ['autos', 'vehiculos', 'inventario', 'capital', 'inversores', '0km', 'usados', 'filtros', 'tarjetas', 'estancados'],
        version: '1.2',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },
    {
        id: 'gestion-clientes',
        emoji: '👥',
        title: 'Clientes',
        category: 'comercial',
        icon: 'Users',
        route: '/admin/clientes',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría'],
        summary: 'Organizá tus clientes por prioridad, responsable y próximo paso, conservando su historia comercial.',
        steps: [
            { title: 'Alta de cliente', body: 'Hacé clic en Nuevo cliente. Registrá su nombre y completá el contacto, lo que busca y el vendedor asignado del equipo.' },
            { title: 'Prioridades', body: 'Para atender hoy reúne primera atención y próximos pasos vencidos o de hoy. Primera atención corresponde a Sin contactar. Sin próxima fecha muestra fichas comerciales activas sin fecha; Cerrado y Perdido quedan fuera de los pendientes.' },
            { title: 'Próximo paso', body: 'Anotá la próxima acción y su fecha desde la ficha o el formulario. La fecha aparece en la agenda sin crear otra tarea.' },
            { title: 'Pipeline', body: 'Usá las siete etapas comerciales para seguir cada oportunidad. Con permiso de edición podés cambiar la etapa; el cambio queda guardado en la ficha.' },
            { title: 'Historial', body: 'Entrá a la ficha del cliente para ver todo: llamadas, ventas previas y notas.' },
            { title: 'Páginas y exportación', body: 'Los contadores corresponden al conjunto filtrado. El pipeline indica cuántas tarjetas ves y cuántas hay en total. Exportar XLSX recorre todas las páginas del filtro, o descarga las fichas seleccionadas.' },
            { title: 'Coincidencias', body: 'Revisá las posibles coincidencias de teléfono o email antes de crear otra ficha. No se fusionan automáticamente.' }
        ],
        tips: [
            'Cargá el DNI para que Gestoría pueda hacer los trámites más rápido luego de la venta.'
        ],
        keywords: ['contactos', 'agenda', 'compradores', 'pipeline', 'prioridades', 'proximo paso', 'responsable'],
        version: '1.1',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },
    {
        id: 'cotizaciones',
        emoji: '📝',
        title: 'Cotizaciones',
        category: 'comercial',
        icon: 'FileSpreadsheet',
        route: '/admin/cotizaciones',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Armá presupuestos formales para tus clientes incluyendo permutas y financiación.',
        steps: [
            { title: 'Nueva cotización', body: 'Hacé clic en crear, elegí el cliente y seleccioná el vehículo del stock.' },
            { title: 'Agregá permutas', body: 'Si entrega su usado, agregalo y definí el precio de toma.' },
            { title: 'Financiación', body: 'Si va a pagar en cuotas, podés detallar el anticipo y los pagos.' },
            { title: 'Pasá a venta', body: 'Cuando el cliente acepte, usá el botón "Convertir a venta" para generar el boleto automáticamente.' }
        ],
        tips: [
            'Enviá la cotización por WhatsApp directamente desde el sistema para mayor rapidez.'
        ],
        keywords: ['presupuestos', 'permutas', 'ofertas']
    },
    {
        id: 'gestion-ventas',
        emoji: '💼',
        title: 'Ventas',
        category: 'comercial',
        icon: 'BadgeDollarSign',
        route: '/admin/ventas',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Guardá borradores y seguí las operaciones de la agencia hasta su entrega.',
        steps: [
            { title: 'Guardá un borrador', body: 'En Nueva venta, usá "Guardar borrador" aunque todavía falten vehículo, cliente o precio. Conserva los datos cargados sin reservar la unidad, acreditar dinero en caja, convertir el lead ni crear cuotas.' },
            { title: 'Continuá la carga', body: 'Abrí un borrador desde el listado o su ficha con "Continuar borrador". Revisá y guardá los cambios sobre la misma operación. Hasta activarlo, sus indicadores de cobranza, documentación y logística muestran "Sin activar".' },
            { title: 'Activá la operación', body: 'Elegí una unidad disponible, completá el precio y seleccioná el estado correspondiente antes de guardar. El sistema verifica que la unidad no tenga otra operación activa. Si dejó de estar disponible, se conserva el borrador para corregirlo.' },
            { title: 'Seguí la venta', body: 'Filtrá el listado por estado y vendedor. Abrí una operación activa para consultar sus datos y gestionar las funciones de venta según tus permisos.' },
            { title: 'Auditoría', body: 'Revisá qué usuario modificó el precio o cambió los estados de la operación.' }
        ],
        tips: [
            'Activar una venta no registra un cobro. Registrá los ingresos por los circuitos de caja correspondientes.',
            'La carga de venta y el borrador no adjuntan archivos. Conservá la documentación para incorporarla por el circuito documental de la agencia.'
        ],
        keywords: ['operaciones', 'borrador', 'continuar', 'activar', 'boletos', 'facturacion', 'ingresos'],
        version: '1.1',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },
    {
        id: 'mis-ventas',
        emoji: '🏆',
        title: 'Mis ventas',
        category: 'comercial',
        icon: 'Wallet',
        route: '/admin/mis-ventas',
        roles: ['Ventas'],
        summary: 'Tu tablero personal para ver qué vendiste este mes y hacerles seguimiento.',
        steps: [
            { title: 'Tus operaciones', body: 'Acá solo vas a ver las ventas donde vos sos el vendedor asignado.' },
            { title: 'Controlá señas', body: 'Si un auto está señado, fijate los días de vencimiento para apurar al cliente.' },
            { title: 'Generá entregas', body: 'Coordiná la fecha de entrega y dejá la nota en el sistema.' }
        ],
        tips: [
            'Hacé seguimiento de tus ventas antiguas para pedirles referidos a clientes satisfechos.'
        ],
        keywords: ['mis operaciones', 'vendedor', 'logros']
    },
    {
        id: 'busqueda-pedidos',
        emoji: '🔍',
        title: 'Pedidos',
        category: 'comercial',
        icon: 'Search',
        route: '/admin/pedidos',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Registrá qué auto busca un cliente para avisarle cuando ingrese.',
        steps: [
            { title: 'Cargá la búsqueda', body: 'Indicá qué modelo, año y rango de precio busca tu cliente.' },
            { title: 'Cruces automáticos', body: 'Si cargás un auto nuevo al stock que coincida, el sistema te avisará.' },
            { title: 'Contactá', body: 'Revisá los pedidos activos semanalmente y ofreceles alternativas.' }
        ],
        tips: [
            'Cerrá o archivá los pedidos viejos para no tener la bandeja llena de gente que ya compró en otro lado.'
        ],
        keywords: ['encargos', 'busquedas', 'solicitudes']
    },
    {
        id: 'oportunidades',
        emoji: '🤝',
        title: 'Oportunidades',
        category: 'comercial',
        icon: 'Target',
        route: '/admin/oportunidades',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Manejá el embudo (pipeline) de ventas para saber qué negocios están por salir.',
        steps: [
            { title: 'Tablero Kanban', body: 'Visualizá tus clientes en columnas: Contactado, Negociando, Para Cierre.' },
            { title: 'Arrastrá y soltá', body: 'Cuando la negociación avance, arrastrá la tarjeta a la siguiente etapa.' },
            { title: 'No pierdas contactos', body: 'Filtrá los que lleven más de 7 días sin movimiento y escribiles.' }
        ],
        tips: [
            'Si se cae una venta, pasala a "Perdido" y dejá el motivo para analizarlo después.'
        ],
        keywords: ['embudo', 'pipeline', 'negocios', 'kanban']
    },
    {
        id: 'postventa',
        emoji: '📦',
        title: 'Postventa',
        category: 'comercial',
        icon: 'Wrench',
        route: '/admin/postventa',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Taller'],
        summary: 'Hacé seguimiento luego de entregar el vehículo para fidelizar al cliente.',
        steps: [
            { title: 'Llamados programados', body: 'Revisá la lista de entregas recientes y agendá una llamada a los 7 y 30 días.' },
            { title: 'Cargá reclamos', body: 'Si falla algo, derivá el caso a Taller o Registrá el incidente acá.' },
            { title: 'Ofrecé accesorios', body: 'Usá la postventa para intentar vender láminas de seguridad o servicios extra.' }
        ],
        tips: [
            'Un buen seguimiento genera muy buenas reviews en Google y referidos orgánicos.'
        ],
        keywords: ['entregas', 'seguimiento', 'fidelizacion']
    },
    {
        id: 'clientes-dormidos',
        emoji: '😴',
        title: 'Dormidos',
        category: 'comercial',
        icon: 'Moon',
        route: '/admin/dormidos',
        roles: ['Owner/Admin', 'Ventas'],
        summary: 'Recuperá contactos que no contestan hace semanas para reactivar ventas.',
        steps: [
            { title: 'Lista de inactivos', body: 'Acá caen los clientes sin interacción registrada en más de 30 días.' },
            { title: 'Campañas de reactivación', body: 'Seleccionalos y enviales un mensaje de WhatsApp masivo (si tenés permiso) o llamalos.' },
            { title: 'Limpiá la base', body: 'Si definitivamente no van a comprar, marcalos como "Perdido/Inactivo".' }
        ],
        tips: [
            'Usá la excusa de "Ingresó stock nuevo" para volver a hablarles.'
        ],
        keywords: ['inactivos', 'recupero', 'perdidos']
    },
    // ---------------------------------------------------------
    // CATEGORÍA: OPERACIÓN Y TRÁMITES
    // ---------------------------------------------------------
    {
        id: 'expedientes-legales',
        emoji: '📂',
        title: 'Expedientes',
        category: 'operacion',
        icon: 'FolderOpen',
        route: '/admin/expedientes',
        roles: ['Owner/Admin', 'Administrativo', 'Gestoría'],
        summary: 'Gestioná el papeleo y transferencias de cada venta o permuta.',
        steps: [
            { title: 'Generación', body: 'Al convertir una venta, se crea el expediente automáticamente para el comprador y el vendedor (si dejó usado).' },
            { title: 'Documentación', body: 'Cargá y revisá qué papeles faltan (08, libre deuda, verificación policial).' },
            { title: 'Liquidación y Gastos', body: 'Asignale los costos de transferencia y cerrá la liquidación económica del trámite.' },
            { title: 'Boletos', body: 'Imprimí el boleto de compraventa o mandato desde la pestaña "Comprobantes".' }
        ],
        tips: [
            'Asigná un gestor a cada expediente para que se haga responsable del seguimiento.'
        ],
        keywords: ['tramites', 'papeles', 'transferencia', 'carpetas']
    },
    {
        id: 'gestoria-tramites',
        emoji: '📋',
        title: 'Gestoría',
        category: 'operacion',
        icon: 'Briefcase',
        route: '/admin/gestoria',
        roles: ['Owner/Admin', 'Gestoría', 'Administrativo'],
        summary: 'Panel de control para los gestores donde ven todo el trabajo pendiente.',
        steps: [
            { title: 'Tarjetas de tareas', body: 'Revisá los trámites por prioridad o vencimiento. Cada uno indica qué documentos faltan.' },
            { title: 'Hitos', body: 'Marcá pasos completados (Ej: "Firma certificada", "Trámite ingresado al registro").' },
            { title: 'WhatsApp', body: 'Escribile al cliente desde la misma tarjeta para pedirle una foto del DNI o recordarle firmas.' }
        ],
        tips: [
            'Filtrá por "Vencidos" cada mañana para evitar multas registrales.'
        ],
        keywords: ['mandatario', 'registro automotor', 'titulos']
    },
    {
        id: 'consignaciones',
        emoji: '🔑',
        title: 'Consignaciones',
        category: 'operacion',
        icon: 'Handshake',
        route: '/admin/consignaciones',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Controlá los autos que dueños particulares te dejan para vender.',
        steps: [
            { title: 'Tablero Kanban', body: 'Mové las tarjetas desde "Ingreso" a "Tasación", "Publicado", "Reservado" o "Vendido".' },
            { title: 'Datos del propietario', body: 'Registrá al dueño, el precio que pide y tu porcentaje de comisión pactado.' },
            { title: 'Seguimientos', body: 'Cargá notas cada vez que hablás con el dueño para bajarle el precio o darle novedades.' }
        ],
        tips: [
            'Configurá una alerta para llamar a los propietarios cada 15 días.'
        ],
        keywords: ['mandato', 'terceros', 'dueño directo', 'kanban']
    },
    {
        id: 'infracciones-multas',
        emoji: '🏛️',
        title: 'Infracciones',
        category: 'operacion',
        icon: 'Ticket',
        route: '/admin/infracciones',
        roles: ['Owner/Admin', 'Administrativo', 'Gestoría'],
        summary: 'Controlá las multas de los autos para cobrárselas al titular o descontarlas.',
        steps: [
            { title: 'Alta de multa', body: 'Cargá la patente, la jurisdicción y el motivo (ej. exceso de velocidad).' },
            { title: 'Montos', body: 'Registrá cuánto pagaste en el registro y cuánto le vas a cobrar al cliente (genera ganancia si hay diferencia).' },
            { title: 'Liquidación', body: 'Asociala al expediente para que se descuente automáticamente del pago al propietario.' }
        ],
        tips: [
            'Antes de tomar una permuta, cargá el informe de infracciones acá para que nadie se olvide de descontarlas.'
        ],
        keywords: ['multas', 'patentes', 'libre deuda']
    },
    {
        id: 'reclamos-clientes',
        emoji: '📣',
        title: 'Reclamos',
        category: 'operacion',
        icon: 'AlertOctagon',
        route: '/admin/reclamos',
        roles: ['Owner/Admin', 'Administrativo', 'Recepción', 'Taller'],
        summary: 'Atendé quejas y problemas post-entrega para cuidar la reputación de la agencia.',
        steps: [
            { title: 'Nuevo reclamo', body: 'Asignalo a un cliente y un vehículo. Describí el problema (ej. "falla el aire acondicionado").' },
            { title: 'Derivación', body: 'Asignale el reclamo al jefe de Taller o al vendedor para que lo gestione.' },
            { title: 'Resolución', body: 'Una vez solucionado, marcá cómo se resolvió y si tuvo algún costo para la agencia.' }
        ],
        tips: [
            'Tratá de cerrar los reclamos en menos de 48hs para evitar clientes enojados en Google Maps.'
        ],
        keywords: ['quejas', 'garantia', 'problemas']
    },
    {
        id: 'taller-mantenimiento',
        emoji: '🔧',
        title: 'Taller',
        category: 'operacion',
        icon: 'PenTool',
        route: '/admin/taller',
        roles: ['Owner/Admin', 'Taller'],
        summary: 'Controlá los arreglos y lavados que le hacés a los autos antes de entregarlos.',
        steps: [
            { title: 'Orden de trabajo', body: 'Generá una orden para un auto del stock indicando qué hay que hacerle (pulido, service, cambio de correa).' },
            { title: 'Costos', body: 'Cargá lo que gastaste en repuestos y mano de obra. Esto aumenta el costo total del auto en el stock.' },
            { title: 'Estados', body: 'Mové el auto a "En taller" para que Ventas sepa que no puede mostrarlo ese día.' }
        ],
        tips: [
            'Si tercerizás los lavados, podés usar este módulo para controlar cuántos lavados le debés al lavadero a fin de mes.'
        ],
        keywords: ['arreglos', 'service', 'preparacion', 'lavadero']
    },

    // ---------------------------------------------------------
    // CATEGORÍA: FINANZAS
    // ---------------------------------------------------------
    {
        id: 'finanzas-cajas',
        emoji: '💰',
        title: 'Finanzas',
        category: 'finanzas',
        icon: 'LineChart',
        route: '/admin/finanzas',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Consultá cuentas, cobros y pagos, y revisá la liquidez según los vencimientos registrados.',
        steps: [
            { title: 'Elegí un grupo', body: 'La navegación se organiza en Resumen, Caja y bancos, Cobros, Pagos, Control y cierres, y Análisis y planificación. Dentro de cada grupo elegí la pestaña que necesitás; se conservan los accesos a las funciones propias de la agencia.' },
            { title: 'Movimientos y pagos', body: 'Registrá pagos de empresas, retiros de socios o pagos disponibles en las pestañas correspondientes.' },
            { title: 'Cuentas separadas', body: 'Visualizá los saldos en ARS y USD por separado. Cada movimiento debe asignarse a una caja (banco, efectivo, etc).' },
            { title: 'Liquidez a 7, 15 y 30 días', body: 'En Resumen, el panel de liquidez parte del saldo registrado en cuentas y aplica cuotas abiertas y movimientos pendientes registrados, según su fecha. Consultá ARS y USD por separado, y revisá también los vencidos y los importes sin fecha, que se presentan aparte.' },
            { title: 'Revisá el alcance', body: 'La proyección no presume ventas nuevas ni recupero de vencidos. No incorpora obligaciones a propietarios o comisiones sin movimiento registrado, ni reglas recurrentes sin movimiento. Los datos incompletos se señalan para revisión.' },
            { title: 'Reversión', body: 'Si te equivocás, usá la opción de reversión (requiere permisos de Admin) para anular el movimiento.' }
        ],
        tips: [
            'El saldo registrado y la proyección pueden incluir fondos comprometidos con terceros: no equivalen a dinero libre para retirar.',
            'Hacé un arqueo de caja físico y comparalo con el sistema todos los viernes.'
        ],
        keywords: ['caja', 'dinero', 'bancos', 'ingresos', 'egresos', 'liquidez', 'vencimientos', 'proyeccion'],
        version: '1.1',
        lastReviewed: '2026-11-10',
        reviewedBy: 'Desarrollo CRM'
    },
    {
        id: 'tesoreria-pagos',
        emoji: '💵',
        title: 'Tesorería',
        category: 'finanzas',
        icon: 'Vault',
        route: '/admin/tesoreria',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Módulo enfocado a grandes pagos, emisión de cheques y arqueos.',
        steps: [
            { title: 'Expedientes activos', body: 'Gestioná el "Pago al propietario" o recibí el "Pago del comprador" directamente desde acá.' },
            { title: 'Transferencias internas', body: 'Mové plata de la caja de Efectivo a la cuenta de Banco Francés registrándolo en el sistema.' },
            { title: 'Cheques', body: 'Cargá los cheques recibidos y emitidos con su fecha de vencimiento y banco emisor.' }
        ],
        tips: [
            'Mantené al día la pestaña de "Financiación" para saber cuánta plata tenés en la calle.'
        ],
        keywords: ['boveda', 'valores', 'transferencias', 'arqueos']
    },
    {
        id: 'liquidaciones-terceros',
        emoji: '💸',
        title: 'Liquidaciones',
        category: 'finanzas',
        icon: 'Receipt',
        route: '/admin/liquidaciones',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Rendiciones mensuales o pagos consolidados a gestores y vendedores.',
        steps: [
            { title: 'Sincronización', body: 'Traé automáticamente todas las comisiones o trámites pendientes de pago en un solo período.' },
            { title: 'Cierre', body: 'Confirmá la liquidación mensual para congelar el resumen y marcar todo como "Pagado".' },
            { title: 'Limpieza de duplicados', body: 'Si un gestor te cargó dos veces el mismo gasto, podés anular uno antes de cerrar la liquidación.' }
        ],
        tips: [
            'Generá el PDF del resumen de agencia y mandáselo al vendedor por WhatsApp el último día del mes.'
        ],
        keywords: ['sueldos', 'rendiciones', 'pagos a gestores']
    },
    {
        id: 'cobros-cuotas',
        emoji: '🧾',
        title: 'Cobros / Cuotas',
        category: 'finanzas',
        icon: 'CreditCard',
        route: '/admin/cuotas',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Gestioná los autos que vendiste financiados por la agencia.',
        steps: [
            { title: 'Grilla de cuotas', body: 'Revisá qué cuotas están "Vencidas", "Próximas" o "En fecha".' },
            { title: 'Cobros parciales', body: 'Si te pagan la mitad de la cuota, registralo (en ARS o USD) y el sistema calcula el saldo restante.' },
            { title: 'Marcar cobrada', body: 'Al saldarla, marcala como pagada, ingresá la fecha real y subí el comprobante para asociarlo al cliente.' }
        ],
        tips: [
            'Contactá por WhatsApp a los que tienen cuotas vencidas directamente desde la alerta del sistema.'
        ],
        keywords: ['financiacion', 'pagares', 'deudores']
    },

    // ---------------------------------------------------------
    // CATEGORÍA: COMUNICACIÓN
    // ---------------------------------------------------------
    {
        id: 'mensajes-internos',
        emoji: '💬',
        title: 'Mensajes',
        category: 'comunicacion',
        icon: 'MessageSquare',
        route: '/admin/mensajes',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Chat interno para hablar con el equipo sin depender de tu celular privado.',
        steps: [
            { title: 'Bandejas', body: 'Navegá entre el canal "General", mensajes "Directos" o "Grupos".' },
            { title: 'Iniciar conversación', body: 'Buscá a un usuario de la agencia y escribile. Podés enviar adjuntos.' },
            { title: 'Organización', body: 'Archivá chats viejos y filtrá por "No leídos" para limpiar tu bandeja.' }
        ],
        tips: [
            'Usá el chat interno para mandarle a Administración los comprobantes de transferencias rápidas.'
        ],
        keywords: ['chat', 'comunicacion interna', 'equipo']
    },
    {
        id: 'whatsapp-crm',
        emoji: '📱',
        title: 'WhatsApp',
        category: 'comunicacion',
        icon: 'MessageCircle',
        route: '/admin/whatsapp',
        roles: ['Owner/Admin', 'Ventas', 'Recepción'],
        summary: 'Atendé a los clientes por WhatsApp directamente desde la compu.',
        steps: [
            { title: 'Bandeja', body: 'Abrí conversaciones con leads o clientes. Vas a ver el nombre del vendedor asignado a la derecha.' },
            { title: 'Nuevo mensaje', body: 'Iniciá un chat buscando el celular del cliente. Si no escribieron en 24hs, usá las plantillas aprobadas.' },
            { title: 'Estados de envío', body: 'Revisá si el mensaje tiene doble tilde (leído) o si hubo error de conexión.' }
        ],
        tips: [
            'Todo lo que hables por acá queda guardado en la ficha del cliente, ideal por si te vas de vacaciones y otro sigue la venta.'
        ],
        keywords: ['wpp', 'chat cliente', 'mensajeria']
    },
    {
        id: 'correo-integrado',
        emoji: '📧',
        title: 'Correo',
        category: 'comunicacion',
        icon: 'Mail',
        route: '/admin/correos',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Conectá tu cuenta de Google (Gmail) para mandar correos desde el CRM.',
        steps: [
            { title: 'Conexión OAuth', body: 'Entrá y vinculá tu Client ID de Google para autorizar los envíos. Si expira la sesión, volvé a loguearte.' },
            { title: 'Redactar', body: 'Escribí, adjuntá presupuestos y usá las "Plantillas" para ahorrar tiempo.' },
            { title: 'Bandejas', body: 'Leé, respondé, reenviá o mandá correos a la papelera sin salir del sistema.' }
        ],
        tips: [
            'Armate una plantilla de "Felicidades por tu nuevo auto" para mandarla rápido tras cada entrega.'
        ],
        keywords: ['email', 'gmail', 'enviar mail', 'inbox']
    },
    {
        id: 'encuestas-nps',
        emoji: '⭐',
        title: 'NPS (Satisfacción)',
        category: 'comunicacion',
        icon: 'Star',
        route: '/admin/nps',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Medí qué tan contentos quedaron los clientes con la agencia.',
        steps: [
            { title: 'NPS Score', body: 'Revisá el promedio general y el porcentaje de Promotores, Pasivos y Detractores.' },
            { title: 'Enviar encuesta', body: 'Mandale por WhatsApp el link al cliente para que califique del 1 al 10.' },
            { title: 'Cargar llamada', body: 'Si le preguntaste por teléfono, podés cargar la nota (contexto) y el puntaje manualmente.' },
            { title: 'Ranking', body: 'Filtrá por vendedor para ver quién tiene mejor reputación.' }
        ],
        tips: [
            'Llamá inmediatamente a cualquier Detractor (nota menor a 6) para solucionar su problema.'
        ],
        keywords: ['calificaciones', 'estrellas', 'encuestas', 'reviews']
    },
    {
        id: 'sugerencias',
        emoji: '💡',
        title: 'Sugerencias',
        category: 'comunicacion',
        icon: 'MessageSquarePlus',
        route: '/admin/sugerencias',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Taller'],
        summary: 'Un buzón para que todo el equipo proponga mejoras en la agencia.',
        steps: [
            { title: 'Alta', body: 'Creá una sugerencia, elegí la categoría (ej. Infraestructura, Procesos) y subí fotos o adjuntos si ayuda.' },
            { title: 'Votos', body: 'Votá las ideas de tus compañeros para que los jefes vean cuáles son más urgentes.' },
            { title: 'Respuesta', body: 'El Owner puede pasarla a estado "En proceso" o "Aprobada" y dejar un comentario.' }
        ],
        tips: [
            'Proponé cosas concretas (ej. "Comprar una cafetera nueva") en lugar de quejas al aire.'
        ],
        keywords: ['ideas', 'mejoras', 'feedback', 'buzon']
    },
    // ---------------------------------------------------------
    // CATEGORÍA: ADMINISTRACIÓN
    // ---------------------------------------------------------
    {
        id: 'reportes-metricas',
        emoji: '📈',
        title: 'Reportes',
        category: 'administracion',
        icon: 'BarChart3',
        route: '/admin/reportes',
        roles: ['Owner/Admin'],
        summary: 'Analizá toda la información comercial y financiera de la agencia en detalle.',
        steps: [
            { title: 'Generación', body: 'Seleccioná el tipo de reporte (Ventas, Origen de Leads, Productividad).' },
            { title: 'Filtros de fecha', body: 'Elegí el rango exacto (ej. último trimestre) para ver la evolución de las barras.' },
            { title: 'Imprimir', body: 'Podés usar el botón de impresión para llevarte un PDF a la reunión de directorio.' }
        ],
        tips: [
            'Si notás que un origen de cliente (ej. Facebook) no rinde, cortá ese presupuesto publicitario.'
        ],
        keywords: ['estadisticas', 'graficos', 'analytics']
    },
    {
        id: 'auditoria-sistema',
        emoji: '👀',
        title: 'Auditoría',
        category: 'administracion',
        icon: 'Eye',
        route: '/admin/auditoria',
        roles: ['Owner/Admin'],
        summary: 'Mirá absolutamente todo lo que hacen los usuarios dentro del CRM.',
        steps: [
            { title: 'Registro de eventos', body: 'Acá queda grabado quién borró un auto, quién bajó un precio y a qué hora exacta.' },
            { title: 'Búsqueda de errores', body: 'Si desapareció una venta, filtrá por la palabra "eliminar" para encontrar quién fue.' },
            { title: 'Filtro por usuario', body: 'Elegí a un empleado específico para ver su actividad en los últimos días.' }
        ],
        tips: [
            'Nunca pases tu clave de Admin, así podés estar seguro de quién hizo cada cambio.'
        ],
        keywords: ['log', 'seguridad', 'movimientos', 'historial']
    },
    {
        id: 'telefonos-utiles',
        emoji: '☎️',
        title: 'Teléfonos Útiles',
        category: 'administracion',
        icon: 'PhoneCall',
        route: '/admin/telefonos-utiles',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Recepción', 'Taller'],
        summary: 'Agenda compartida con contactos clave para el funcionamiento de la agencia.',
        steps: [
            { title: 'Búsqueda rápida', body: 'Encontrá al instante el número del electricista, el gestor de confianza o la grúa.' },
            { title: 'Alta de contacto', body: 'Cargá nombre, rubro y número para que todo el equipo lo tenga a mano.' },
            { title: 'Llamada directa', body: 'Desde el celular, tocás el número y se abre directo el marcador.' }
        ],
        tips: [
            'Mantené limpio este directorio. Si un mecánico ya no trabaja con ustedes, borralo.'
        ],
        keywords: ['agenda', 'contactos agencia', 'mecanico', 'grua']
    },
    {
        id: 'configuracion',
        emoji: '⚙️',
        title: 'Configuración',
        category: 'administracion',
        icon: 'Settings',
        route: '/admin/configuracion/general',
        roles: ['Owner/Admin'],
        summary: 'Ajustá los datos públicos de tu empresa y el funcionamiento del sistema.',
        steps: [
            { title: 'Datos de la agencia', body: 'Modificá la razón social, el logo y la dirección que salen en los boletos.' },
            { title: 'Notificaciones', body: 'Activá o desactivá los correos de resumen diario.' },
            { title: 'Variables fijas', body: 'Definí cuánto es el porcentaje estándar de comisión para las consignaciones.' }
        ],
        tips: [
            'Subí el logo en buena resolución y fondo transparente (PNG) para que los contratos queden prolijos.'
        ],
        keywords: ['ajustes', 'datos empresa', 'preferencias']
    },
    {
        id: 'gestion-usuarios',
        emoji: '👥',
        title: 'Usuarios',
        category: 'administracion',
        icon: 'UsersCog',
        route: '/admin/configuracion/usuarios',
        roles: ['Owner/Admin'],
        summary: 'Agregá a tus empleados al sistema o dálos de baja.',
        steps: [
            { title: 'Nuevo ingreso', body: 'Hacé clic en agregar usuario, ingresá su mail corporativo y asignale una contraseña temporal.' },
            { title: 'Asignar rol', body: 'Elegí si será Ventas, Gestoría o Administrativo (esto limita qué pantallas puede ver).' },
            { title: 'Bloqueo', body: 'Si un empleado se va, cambiale el estado a inactivo para cortarle el acceso inmediatamente.' }
        ],
        tips: [
            'Nunca elimines a un vendedor viejo, solo desactivalo. Así no perdés el historial de las ventas que hizo.'
        ],
        keywords: ['empleados', 'vendedores', 'accesos']
    },
    {
        id: 'papelera-reciclaje',
        emoji: '🗑️',
        title: 'Papelera',
        category: 'administracion',
        icon: 'Trash2',
        route: '/admin/papelera',
        roles: ['Owner/Admin'],
        summary: 'Recuperá clientes, autos o ventas que se hayan borrado por error.',
        steps: [
            { title: 'Buscá el error', body: 'Filtrá por módulo (ej. "Stock") para encontrar ese auto que borraste sin querer.' },
            { title: 'Restaurar', body: 'Hacé clic en el botón de restaurar y el elemento volverá exactamente al mismo lugar y estado.' },
            { title: 'Vaciado definitivo', body: 'Si estás seguro, podés vaciar la papelera. ¡Ojo que esto no tiene vuelta atrás!' }
        ],
        tips: [
            'Acostumbrate a revisar la papelera una vez al mes por si algún vendedor borró clientes valiosos.'
        ],
        keywords: ['borrados', 'recuperar', 'eliminar']
    },
    {
        id: 'exportaciones',
        emoji: '💾',
        title: 'Exportaciones',
        category: 'administracion',
        icon: 'Download',
        route: '/admin/exportaciones',
        roles: ['Owner/Admin'],
        summary: 'Descargá las bases de datos completas de tu CRM a Excel o CSV.',
        steps: [
            { title: 'Seleccionar módulo', body: 'Elegí si querés descargar toda la base de clientes, el historial de ventas o el stock.' },
            { title: 'Rango de fechas', body: 'Podés bajar toda la historia o solo lo generado en el último mes.' },
            { title: 'Descarga', body: 'Al hacer clic, el sistema genera el archivo. Puede tardar unos segundos si hay miles de registros.' }
        ],
        tips: [
            'Hacé una exportación de clientes cada 3 meses para mandarle la base a tu agencia de marketing.'
        ],
        keywords: ['excel', 'csv', 'descargar base', 'backup']
    },
    {
        id: 'autorizaciones',
        emoji: '🛡️',
        title: 'Autorizaciones',
        category: 'administracion',
        icon: 'CheckSquare',
        route: '/admin/autorizaciones',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Aprobá o rechazá solicitudes especiales del equipo (descuentos, señas bajas).',
        steps: [
            { title: 'Bandeja de entrada', body: 'Acá caen los pedidos de los vendedores (ej. "Tomar seña por menor valor al permitido").' },
            { title: 'Detalle', body: 'Entrá para ver qué cliente es y el motivo del pedido.' },
            { title: 'Aprobar o Rechazar', body: 'Al decidir, el vendedor recibe automáticamente la notificación para continuar.' }
        ],
        tips: [
            'Revisá esta bandeja a diario. Un descuento sin aprobar traba la venta.'
        ],
        keywords: ['permisos especiales', 'descuentos', 'señas']
    }
];

export const helpRegistry = [

    // ---------------------------------------------------------
    // CATEGORÍA: PRIMEROS PASOS
    // ---------------------------------------------------------
    {
        id: 'login-y-acceso',
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
        title: 'Cómo moverte por el sistema',
        category: 'primeros-pasos',
        icon: 'Compass',
        route: '/admin/dashboard',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría', 'Recepción', 'Taller', 'Solo lectura'],
        summary: 'Conocé la barra lateral, los atajos de teclado y el panel superior para navegar rápido.',
        steps: [
            { title: 'Barra lateral', body: 'Usá el menú izquierdo para acceder a todos los módulos. Podés colapsarlo para tener más espacio.' },
            { title: 'Buscador superior', body: 'El menú superior tiene accesos rápidos a tu perfil, notificaciones y ayuda.' },
            { title: 'Filtros rápidos', body: 'En cada tabla vas a encontrar filtros para buscar por fecha, estado o nombre.' }
        ],
        tips: [
            'Guardá en favoritos de tu navegador las pantallas que más uses.'
        ],
        keywords: ['menu', 'sidebar', 'navegar', 'buscar']
    },
    {
        id: 'roles-permisos',
        title: 'Roles y permisos',
        category: 'primeros-pasos',
        icon: 'Shield',
        route: '/admin/configuracion/usuarios',
        roles: ['Owner/Admin'],
        summary: 'Descubrí qué puede ver y hacer cada usuario según su puesto en la agencia.',
        steps: [
            { title: 'Roles principales', body: 'Los vendedores solo ven sus propios clientes. Los administradores tienen acceso global.' },
            { title: 'Permisos especiales', body: 'Configurá quién puede borrar ventas, aprobar descuentos o exportar reportes.' },
            { title: 'Asignar permisos', body: 'Desde Configuración > Usuarios, elegí el usuario y cambiá su rol desde el selector.' }
        ],
        tips: [
            'No des permisos de Owner a usuarios que solo necesitan cargar datos.'
        ],
        keywords: ['seguridad', 'vendedor', 'admin', 'accesos']
    },
    {
        id: 'app-celular',
        title: 'Usar el CRM en el celular',
        category: 'primeros-pasos',
        icon: 'Smartphone',
        route: '/admin/mi-espacio',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Cómo adaptar la pantalla y usar las funciones clave desde tu móvil.',
        steps: [
            { title: 'Acceso móvil', body: 'Abrí el navegador de tu celular, ingresá al CRM y logueate. La interfaz se ajusta sola.' },
            { title: 'Menú inferior', body: 'Vas a notar que el menú pasa a ser un botón en la barra superior o un menú inferior flotante.' },
            { title: 'Tablas', body: 'Deslizá hacia la derecha para ver columnas ocultas en las tablas de clientes o stock.' }
        ],
        tips: [
            'Ideal para subir fotos del stock directamente desde la cámara del celu.'
        ],
        keywords: ['movil', 'responsive', 'celular', 'app']
    },

    // ---------------------------------------------------------
    // CATEGORÍA: EL DÍA A DÍA
    // ---------------------------------------------------------
    {
        id: 'dashboard-principal',
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
        title: 'Stock',
        category: 'comercial',
        icon: 'Car',
        route: '/admin/stock',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo'],
        summary: 'Administrá los vehículos disponibles: propios, consignaciones y 0km.',
        steps: [
            { title: 'Buscá vehículos', body: 'Usá los filtros por marca, modelo, año y tipo de ingreso (Propio, Consignación, Compartido).' },
            { title: 'Cargá uno nuevo', body: 'Hacé clic en "Nuevo vehículo", ingresá la patente (se autocompleta info si está disponible) y cargá el precio.' },
            { title: 'Fotos y detalles', body: 'Entrá a la ficha técnica para subir la galería de imágenes y cargar el equipamiento.' },
            { title: 'Exportá el stock', body: 'Usá el botón de Excel para descargar tu lista completa de autos con precios.' }
        ],
        tips: [
            'Mantené los precios actualizados y marcá los autos reservados para evitar que otro vendedor los ofrezca.'
        ],
        keywords: ['autos', 'vehiculos', 'inventario', '0km', 'usados']
    },
    {
        id: 'gestion-clientes',
        title: 'Clientes',
        category: 'comercial',
        icon: 'Users',
        route: '/admin/clientes',
        roles: ['Owner/Admin', 'Ventas', 'Administrativo', 'Gestoría'],
        summary: 'Mantené tu cartera de contactos al día y registrá todas sus interacciones.',
        steps: [
            { title: 'Alta de cliente', body: 'Desde la grilla, hacé clic en "Nuevo Cliente". Cargá nombre, teléfono y correo.' },
            { title: 'Historial', body: 'Entrá a la ficha del cliente para ver todo: llamadas, ventas previas y notas.' },
            { title: 'Vehículo de interés', body: 'Asignale qué auto está buscando para poder filtrarlo luego.' },
            { title: 'Duplicados', body: 'El sistema te va a avisar si intentás cargar un DNI o celular que ya existe.' }
        ],
        tips: [
            'Cargá el DNI para que Gestoría pueda hacer los trámites más rápido luego de la venta.'
        ],
        keywords: ['contactos', 'agenda', 'compradores']
    },
    {
        id: 'cotizaciones',
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
        title: 'Ventas',
        category: 'comercial',
        icon: 'BadgeDollarSign',
        route: '/admin/ventas',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'El registro maestro de todas las operaciones cerradas en la agencia.',
        steps: [
            { title: 'Listado global', body: 'Revisá todas las ventas, filtrá por estado (Señado, Vendido, Entregado) y vendedor.' },
            { title: 'Ver detalles', body: 'Hacé clic en una venta para ver montos exactos, comisiones y autos involucrados.' },
            { title: 'Auditoría', body: 'Revisá qué usuario modificó el precio o cambió los estados de la operación.' }
        ],
        tips: [
            'Las ventas eliminadas quedan registradas por seguridad en el historial de auditoría.'
        ],
        keywords: ['operaciones', 'boletos', 'facturacion', 'ingresos']
    },
    {
        id: 'mis-ventas',
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
        title: 'Finanzas',
        category: 'finanzas',
        icon: 'LineChart',
        route: '/admin/finanzas',
        roles: ['Owner/Admin', 'Administrativo'],
        summary: 'Control total de ingresos, egresos y el estado de las cuentas (cajas).',
        steps: [
            { title: 'Movimientos', body: 'Registrá pagos de empresas, retiros de socios o pagos disponibles en las pestañas correspondientes.' },
            { title: 'Cuentas separadas', body: 'Visualizá los saldos en ARS y USD por separado. Cada movimiento debe asignarse a una caja (banco, efectivo, etc).' },
            { title: 'Comprobantes', body: 'Subí el ticket o transferencia PDF a cada movimiento para respaldarlo.' },
            { title: 'Reversión', body: 'Si te equivocás, usá la opción de reversión (requiere permisos de Admin) para anular el movimiento.' }
        ],
        tips: [
            'Hacé un arqueo de caja físico y comparalo con el sistema todos los viernes.'
        ],
        keywords: ['caja', 'dinero', 'bancos', 'ingresos', 'egresos']
    },
    {
        id: 'tesoreria-pagos',
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
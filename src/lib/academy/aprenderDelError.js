// src/lib/academy/aprenderDelError.js
// AutoSporting Academy — Sección "Aprender del error"
// Reflexión guiada, plan de mejora individual y privacidad estricta por colaborador

export const ERROR_CATEGORIES = [
    { id: 'ventas', label: 'Ventas y Atención Comercial' },
    { id: 'negociacion', label: 'Negociación y Precios' },
    { id: 'permutas', label: 'Permutas y Tasaciones' },
    { id: 'gestoria', label: 'Expedientes y Documentación Registral' },
    { id: 'facturacion', label: 'Facturación, Cobros e Imputaciones' },
    { id: 'comunicacion', label: 'Coordinación entre Áreas' },
    { id: 'procedimientos', label: 'Aplicación de Políticas y Autorizaciones' }
];

export const IMPROVEMENT_STATUS = {
    EN_PRACTICA: 'en_practica',
    COMPLETADO: 'completado',
    REVISADO: 'revisado'
};

export const createErrorReflection = ({
    id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    learnerId,
    learnerRole = 'ventas',
    createdAt = new Date().toISOString(),
    titulo = '',
    categoria = 'ventas',
    linkedModuleId = '',
    linkedSimulationId = '',
    // Las 5 preguntas estructuradas obligatorias:
    quePaso = '',
    informacion = '',
    otraManera = '',
    criterio = '',
    planMejora = '',
    // Seguimiento del plan de mejora:
    status = IMPROVEMENT_STATUS.EN_PRACTICA,
    fechaCompromiso = '',
    notasSeguimiento = '',
    // Privacidad y consentimiento expreso:
    compartidoConSupervisor = false,
    supervisorDestinatario = 'Propietario / Dirección',
    fechaCompartido = null
}) => {
    return {
        id,
        learnerId,
        learnerRole,
        createdAt,
        titulo: titulo.trim(),
        categoria,
        linkedModuleId,
        linkedSimulationId,
        quePaso: quePaso.trim(),
        informacion: informacion.trim(),
        otraManera: otraManera.trim(),
        criterio: criterio.trim(),
        planMejora: planMejora.trim(),
        status,
        fechaCompromiso,
        notasSeguimiento: notasSeguimiento.trim(),
        compartidoConSupervisor: Boolean(compartidoConSupervisor),
        supervisorDestinatario,
        fechaCompartido
    };
};

export const validateErrorReflection = reflection => {
    const errors = [];
    if (!reflection.titulo || reflection.titulo.length < 5) {
        errors.push('El título de la experiencia debe tener al menos 5 caracteres.');
    }
    if (!reflection.quePaso || reflection.quePaso.length < 20) {
        errors.push('Por favor describí qué pasó y qué intentabas lograr con más detalle (mínimo 20 caracteres).');
    }
    if (!reflection.informacion || reflection.informacion.length < 15) {
        errors.push('Explicá qué información tenías disponible y qué información te faltaba.');
    }
    if (!reflection.otraManera || reflection.otraManera.length < 15) {
        errors.push('Reflexioná sobre qué podrías haber hecho de otra manera ante esa situación.');
    }
    if (!reflection.planMejora || reflection.planMejora.length < 15) {
        errors.push('Definí qué vas a practicar concretamente y cómo vas a comprobar la mejora.');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};

// =============================================================================
// FRASES MOTIVADORAS PARA LA SECCIÓN APRENDER DEL ERROR Y SUPERACIÓN PERSONAL
// =============================================================================

export const MOTIVATIONAL_QUOTES = [
    {
        id: 'q1',
        quote: 'El error no es lo contrario al éxito: es el dato más valioso para profesionalizar tu técnica y afianzar tu criterio comercial.',
        author: 'Escuela Comercial AutoSporting',
        category: 'Aprendizaje'
    },
    {
        id: 'q2',
        quote: 'Un cliente difícil no es un obstáculo: es la mejor oportunidad para demostrar el valor de AutoSporting, escuchar con atención y generar confianza genuina.',
        author: 'Filosofía Comercial',
        category: 'Ventas'
    },
    {
        id: 'q3',
        quote: 'Cualquiera puede vender regalando precio. Los asesores de excelencia construyen acuerdos sólidos defendiendo la calidad y el valor de cada unidad.',
        author: 'Negociación Profesional',
        category: 'Negociación'
    },
    {
        id: 'q4',
        quote: 'Analizar honestamente qué faltó preguntar hoy es la garantía de que mañana cerrarás la operación con solidez y transparencia.',
        author: 'Mejora Continua',
        category: 'Criterio'
    },
    {
        id: 'q5',
        quote: 'El verdadero profesionalismo no reside en no dudar jamás, sino en registrar la duda, consultar el procedimiento oficial y volver con una propuesta impecable.',
        author: 'Excelencia Operativa',
        category: 'Calidad'
    },
    {
        id: 'q6',
        quote: 'Cada objeción que hoy te desafía es la habilidad que mañana dominarás con total naturalidad en el salón de ventas.',
        author: 'Venta Consultiva',
        category: 'Superación'
    },
    {
        id: 'q7',
        quote: 'La serenidad al negociar no es casualidad: es saber que detrás tenés un equipo que te respalda, stock auditado y reglas claras.',
        author: 'Cultura AutoSporting',
        category: 'Confianza'
    },
    {
        id: 'q8',
        quote: 'No busques la transacción rápida: buscá entender a fondo las necesidades de quien te confía la compra o permuta de su vehículo.',
        author: 'Servicio al Cliente',
        category: 'Ventas'
    },
    {
        id: 'q9',
        quote: 'Registrar un desacierto no te expone frente a tus pares; te convierte en un profesional reflexivo, metódico y cada día más confiable.',
        author: 'Desarrollo Profesional',
        category: 'Aprendizaje'
    },
    {
        id: 'q10',
        quote: 'El éxito en ventas no es casualidad ni suerte: es la suma de preparación técnica, escucha activa y la valentía de aprender de cada contacto.',
        author: 'AutoSporting Academy',
        category: 'Superación'
    }
];

export const getRandomMotivationalQuote = (currentId = null) => {
    const pool = currentId ? MOTIVATIONAL_QUOTES.filter(q => q.id !== currentId) : MOTIVATIONAL_QUOTES;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index] || MOTIVATIONAL_QUOTES[0];
};

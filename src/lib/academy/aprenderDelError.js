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

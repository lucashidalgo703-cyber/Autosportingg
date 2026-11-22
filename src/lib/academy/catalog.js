// src/lib/academy/catalog.js
// Catálogo general de AutoSporting Academy
// Conserva cursos y secciones financieras originales y añade recorridos de capacitación práctica por rol.

import { ROLE_MODULES } from './roleModules.js';
import { ROLE_SIMULATIONS } from './roleSimulations.js';

// 8 Cursos financieros empresariales originales (Mantiene compatibilidad exacta con tests de 13.1-13.8)
export const academyCourses = [
    ['fundamentos', 'Fundamentos financieros', 'Separá ventas, resultados y dinero disponible.', 'Inicial'],
    ['liquidez', 'Flujo de caja y liquidez', 'Anticipá cobros, pagos y necesidades de efectivo.', 'Inicial'],
    ['rentabilidad', 'Rentabilidad de operaciones', 'Medí el resultado y el capital de cada operación.', 'Intermedio'],
    ['capital', 'Capital de trabajo y rotación', 'Entendé cuánto capital inmoviliza el inventario.', 'Intermedio'],
    ['financiacion', 'Financiación e intereses', 'Compará tasas, plazos y cronogramas.', 'Intermedio'],
    ['riesgos', 'Gestión de riesgos', 'Evaluá escenarios y protegé la continuidad.', 'Intermedio'],
    ['inversiones', 'Inversiones empresariales', 'Compará alternativas con flujos y valor presente.', 'Avanzado'],
    ['direccion', 'Dirección financiera avanzada', 'Asigná capital con objetivos y restricciones.', 'Avanzado'],
].map(([id, title, description, level]) => ({ id, title, description, level }));

// 6 Secciones originales del módulo financiero
export const academySections = [
    ['cursos', 'Cursos', 'Ocho recorridos de educación financiera empresarial.'],
    ['simuladores', 'Laboratorio', 'Experimentá con datos ficticios y fórmulas visibles.'],
    ['evaluaciones', 'Evaluaciones', 'Poné a prueba lo aprendido y recibí explicaciones.'],
    ['progreso', 'Mi progreso', 'Consultá tu avance educativo en este navegador.'],
    ['entrenador', 'Entrenador de decisiones', 'Compará alternativas de negocio en escenarios simulados.'],
    ['tutor', 'Tutor financiero', 'Repasá conceptos con una guía de contenidos estructurados.'],
];

// =============================================================================
// AMPLIACIÓN: RECORRIDOS DE CAPACITACIÓN PRÁCTICA POR ROL EN AUTOSPORTING
// =============================================================================

export const ROLE_TRACKS = {
    ventas: {
        id: 'ventas',
        title: 'Recorrido Vendedores',
        roleMatch: ['ventas'],
        description: 'Atención comercial, presentación de unidades, negociación de objeciones, permutas, financiación y coordinación de entrega.',
        moduleIds: ['comun-trabajo', 'ventas-consulta-presentacion', 'ventas-negociacion-objeciones', 'ventas-permutas-financiacion-autorizaciones', 'ventas-seguimiento-entrega'],
        caseIds: ['sim-vta-01', 'sim-vta-02', 'sim-vta-03', 'sim-vta-04']
    },
    gestoria: {
        id: 'gestoria',
        title: 'Recorrido Gestoría',
        roleMatch: ['gestoria_contabilidad'],
        description: 'Lectura y auditoría de legajos, control de consistencia documental, detección de gravámenes y transferencias registrales.',
        moduleIds: ['comun-trabajo', 'gestoria-lectura-expediente', 'gestoria-control-faltantes', 'gestoria-transferencias-coordinacion'],
        caseIds: ['sim-ges-01']
    },
    administracion: {
        id: 'administracion',
        title: 'Recorrido Administración y Facturación',
        roleMatch: ['administrativo', 'owner', 'admin'],
        description: 'Validación fiscal ARCA/AFIP, control estricto de acreditación de cobros, prevención de fraudes y consultas estructuradas al contador.',
        moduleIds: ['comun-trabajo', 'admin-preparacion-validacion', 'admin-cobros-comprobantes', 'admin-observaciones-contador'],
        caseIds: ['sim-adm-01']
    },
    comun: {
        id: 'comun',
        title: 'Recorrido Común AutoSporting',
        roleMatch: ['solo_lectura'],
        description: 'Circuito integral de operaciones, confidencialidad (Ley 25.326), uso responsable del CRM y autorizaciones internas.',
        moduleIds: ['comun-trabajo'],
        caseIds: []
    }
};

// 7 Espacios de navegación de la capacitación práctica
export const roleTrainingSections = [
    ['mi-capacitacion', 'Mi capacitación', 'Tu recorrido asignado, objetivos, módulos y próximo paso.'],
    ['aprender', 'Aprender', 'Lecciones, procedimientos oficiales, ejemplos y checklist del rol.'],
    ['practicar', 'Practicar', 'Casos prácticos interactivos y simulaciones de negocio con devolución.'],
    ['tutor', 'Consultar al tutor', 'Dudas de procedimientos, objeciones y expedientes sin riesgo.'],
    ['aprender-del-error', 'Aprender del error', 'Reflexión guiada, plan de mejora individual y privacidad.'],
    ['progreso', 'Mi progreso', 'Módulos completados, prácticas realizadas y competencias demostradas.'],
    ['gestion', 'Gestión de capacitación', 'Asignación de recorridos y supervisión formativa autorizada.']
];

export const getTrackByRole = role => {
    if (role === 'ventas') return ROLE_TRACKS.ventas;
    if (role === 'gestoria_contabilidad') return ROLE_TRACKS.gestoria;
    if (role === 'administrativo') return ROLE_TRACKS.administracion;
    if (role === 'owner' || role === 'admin') return ROLE_TRACKS.ventas; // Por defecto para supervisores
    return ROLE_TRACKS.comun;
};

export { ROLE_MODULES, ROLE_SIMULATIONS };

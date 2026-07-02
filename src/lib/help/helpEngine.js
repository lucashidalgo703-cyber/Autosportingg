/**
 * Motor de procesamiento para el Manual de Ayuda.
 * Desacopla la lógica de búsqueda, filtrado y ordenamiento de la UI.
 */

// Normaliza el texto quitando acentos y pasándolo a minúsculas para búsquedas flexibles
export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

/**
 * Retorna los capítulos que el usuario tiene permitido ver.
 * @param {Array} chapters Registro completo de ayuda.
 * @param {Object} user El objeto de usuario actual (para validar rol).
 */
export const getEnabledChapters = (chapters, user) => {
    if (!chapters || !user) return [];
    
    return chapters.filter(chapter => {
        // Validación de Feature Flag (ocultar completamente si está explícitamente desactivado en DB)
        if (chapter.featureFlag === false) return false;

        // Validar rol
        const userRole = user.role || 'Solo lectura';
        if (!chapter.roles.includes(userRole)) return false;

        return true;
    });
};

/**
 * Busca capítulos que coincidan con un término, ignorando acentos y mayúsculas.
 * @param {Array} chapters Arreglo de capítulos a filtrar.
 * @param {String} searchTerm Término de búsqueda.
 */
export const searchChapters = (chapters, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return chapters;
    
    const normalizedTerm = normalizeText(searchTerm);
    
    return chapters.filter(chapter => {
        const titleMatch = normalizeText(chapter.title).includes(normalizedTerm);
        const summaryMatch = normalizeText(chapter.summary).includes(normalizedTerm);
        const keywordsMatch = chapter.keywords?.some(k => normalizeText(k).includes(normalizedTerm));
        
        return titleMatch || summaryMatch || keywordsMatch;
    });
};

// Orden de categorías canónicas
const CATEGORY_ORDER = {
    'primeros-pasos': 1,
    'dia-a-dia': 2,
    'comercial': 3,
    'operacion': 4,
    'finanzas': 5,
    'comunicacion': 6,
    'administracion': 7
};

const CATEGORY_LABELS = {
    'primeros-pasos': 'Primeros Pasos',
    'dia-a-dia': 'Día a Día',
    'comercial': 'Comercial',
    'operacion': 'Operación',
    'finanzas': 'Finanzas',
    'comunicacion': 'Comunicación',
    'administracion': 'Administración'
};

/**
 * Agrupa los capítulos por categoría canónica y los ordena.
 * @param {Array} chapters Arreglo de capítulos (ya filtrados).
 * @returns {Array} Un arreglo de objetos de categoría conteniendo sus capítulos.
 */
export const groupAndSortChapters = (chapters) => {
    const grouped = chapters.reduce((acc, chapter) => {
        const cat = chapter.category || 'dia-a-dia';
        if (!acc[cat]) {
            acc[cat] = {
                id: cat,
                label: CATEGORY_LABELS[cat] || cat,
                order: CATEGORY_ORDER[cat] || 99,
                items: []
            };
        }
        acc[cat].items.push(chapter);
        return acc;
    }, {});

    // Ordenar categorías
    const sortedCategories = Object.values(grouped).sort((a, b) => a.order - b.order);

    // Ordenar capítulos dentro de cada categoría
    sortedCategories.forEach(category => {
        category.items.sort((a, b) => (a.order || 99) - (b.order || 99));
    });

    return sortedCategories;
};

/**
 * Encuentra un capítulo específico para Deep Linking.
 * @param {Array} chapters Arreglo de capítulos permitidos.
 * @param {String} slug ID del capítulo buscado.
 */
export const getDeepLinkedChapter = (chapters, slug) => {
    if (!slug) return null;
    return chapters.find(c => c.id === slug) || null;
};

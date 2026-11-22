// src/lib/academy/roleTutorKnowledge.js
// Base de conocimientos estructurada y segura para el Tutor de AutoSporting Academy
// Proporciona respuestas basadas exclusivamente en procedimientos autorizados y contenidos formativos,
// garantizando total aislamiento de costos reales, márgenes, caja de tesorería y herramientas financieras privadas del propietario.

export const TUTOR_PROCEDURES = [
    {
        id: 'PROC-COM-01',
        version: 'v2.1',
        code: 'PROC-COM-01',
        title: 'Circuito General de Operaciones y Responsabilidades Inter-Áreas',
        category: 'general',
        scope: 'Todos los colaboradores',
        status: 'Aprobado por Dirección General',
        lastUpdated: '2026-11-20',
        content: `1. Toda operación nace con una oportunidad registrada en el CRM con datos comprobados.
2. Ventas no puede prometer fechas de entrega sin visto bueno simultáneo de Gestoría y Administración.
3. Las excepciones comerciales, plazos mayores a 72 hs de congelamiento o descuentos fuera de pauta requieren solicitar Autorización en el CRM.
4. Datos de clientes y documentación están protegidos por Ley 25.326 y son estrictamente confidenciales.`,
        keyQuestions: [
            {
                trigger: 'como trabajamos en autosporting',
                keywords: ['flujo', 'circuito', 'operacion', 'areas', 'proceso'],
                summary: 'El circuito de una operación involucra 6 etapas secuenciales: Prospección, Negociación/Cotización, Seña formal, Expediente de Gestoría, Facturación/Cobro acreditado y Entrega física coordinada. Ninguna etapa se salta.'
            }
        ]
    },
    {
        id: 'PROC-VTA-01',
        version: 'v1.4',
        code: 'PROC-VTA-01',
        title: 'Atención Inicial, Indagación y Presentación de Unidades',
        category: 'ventas',
        scope: 'Equipo de Ventas',
        status: 'Aprobado por Dirección Comercial',
        lastUpdated: '2026-11-20',
        content: `1. Indagación inicial con preguntas abiertas: necesidad de uso (ciudad, ripio patagónico, trabajo), presupuesto real, forma de pago y permuta.
2. La presentación de la unidad se basa en el pasaporte de la unidad: kilometraje real certificado en tablero y libreta de services.
3. Constatar físicamente en inventario: segunda llave original, rueda de auxilio en condiciones, cric, llave de ruedas y tuerca de seguridad antes de confirmar al cliente.
4. Mostrar detalles de uso con naturalidad; no ocultar vicios estéticos ni mecánicos.`,
        keyQuestions: [
            {
                trigger: 'como presentar un vehiculo',
                keywords: ['presentacion', 'primera consulta', 'segunda llave', 'indagacion', 'kilometraje'],
                summary: 'Preguntá primero el uso y necesidad del comprador. Presentá la unidad con datos verificados de pasaporte (services, kilometraje real, llaves, auxilio) y acordá un próximo paso concreto con día y hora en el CRM.'
            }
        ]
    },
    {
        id: 'PROC-VTA-02',
        version: 'v1.6',
        code: 'PROC-VTA-02',
        title: 'Tácticas de Negociación, Manejo de Objeciones y Concesiones Condicionadas',
        category: 'ventas',
        scope: 'Equipo de Ventas',
        status: 'Aprobado por Dirección Comercial',
        lastUpdated: '2026-11-20',
        content: `1. Ante la objeción "está caro": Nunca bajar el precio de entrada. Preguntar: "¿Respecto de qué unidad lo estás comparando? ¿Tiene el mismo kilometraje, estado de cubiertas, historial oficial y radicación en Chubut?".
2. Explicar el valor diferencial: peritaje mecánico de 120 puntos, garantía escrita de 6 meses, radicación garantizada y respaldo físico en Comodoro Rivadavia.
3. Concesiones condicionadas: Nunca conceder nada sin pedir algo a cambio ("Si cerramos hoy de contado, puedo solicitar bonificar el 50% de la transferencia o el kit de accesorios").
4. Prohibiciones éticas estrictas: Prohibido mentir con falsa urgencia, prohibido descalificar con agresividad a la competencia y terminantemente prohibido revelar costos de compra, ganancias o márgenes de la agencia.`,
        keyQuestions: [
            {
                trigger: 'El cliente me pide bajar el precio. ¿Qué preguntas puedo hacer antes de responder?',
                keywords: ['bajar precio', 'esta caro', 'descuento', 'preguntas objecion', 'como responder'],
                summary: `Antes de hablar de números o conceder descuentos, hacé estas 3 preguntas de precisión:
1. "¿Respecto de qué vehículo o publicación lo estás comparando puntualmente?" (Para evaluar si compara año, versión y estado similar).
2. "¿Pudiste verificar el estado de las cubiertas y el historial de mantenimiento de esa otra opción?" (Para hacer visible que 4 cubiertas nuevas valen más de 2 millones de pesos).
3. "Si logramos acercarnos a un acuerdo que te sirva, ¿tu decisión es señar y cerrar la compra hoy en Comodoro?" (Para condicionar cualquier atención comercial a un compromiso real de cierre inmediato).
[Fuente oficial: PROC-VTA-02 v1.6 — Manual Comercial AutoSporting].`
            },
            {
                trigger: 'Quiero practicar una objeción por el valor de la toma.',
                keywords: ['valor de la toma', 'mi auto vale mas', 'sobretasacion', 'permuta cara', 'practicar toma'],
                summary: `Técnica oficial para la objeción de toma de permuta:
1. Validá con respeto la expectativa del cliente ("Es un gran auto y entiendo que quieras defender su valor").
2. Explicá la diferencia entre precio de venta al público en Buenos Aires (revista) y valor de toma neta en Comodoro.
3. Mostrá la planilla de peritaje técnico: descontá los costos reales de alistamiento (cubiertas gastadas, deudas de patente municipal, services pendientes).
4. Ofrecé una concesión compensatoria: reconocer una pequeña mejora en la toma si la agencia absorbe la gestoría, o proponer dejarlo en consignación comercial si el cliente insiste en el valor máximo de cartel.
[Fuente oficial: PROC-VTA-02 v1.6 y PROC-VTA-03 v1.2].`
            }
        ]
    },
    {
        id: 'PROC-VTA-03',
        version: 'v1.2',
        code: 'PROC-VTA-03',
        title: 'Toma de Permutas, Financiación y Solicitud de Autorizaciones',
        category: 'ventas',
        scope: 'Equipo de Ventas',
        status: 'Aprobado por Dirección General',
        lastUpdated: '2026-11-20',
        content: `1. Relevar 6 fotos estandarizadas y datos de titularidad registral. Toda tasación preliminar es sujeta a peritaje en taller.
2. Financiación: Explicar capital a financiar, monto de cuota estimativa del sistema Francés y requisitos. No inventar tasas ni prometer aprobaciones que dependen de las entidades bancarias.
3. Señas ad referéndum y excepciones: Cargar solicitud en el CRM al Propietario.
4. Jamás entregar un vehículo sin pago acreditado y transferencia lista.`,
        keyQuestions: [
            {
                trigger: 'como pedir autorizacion',
                keywords: ['solicitar autorizacion', 'excepcion', 'seña ad referendum', 'descuento especial'],
                summary: 'Ingresá al CRM en el módulo de Autorizaciones → Nueva Solicitud. Detallá: cliente, vehículo, precio de lista, oferta del cliente, motivo fundamentado y contrapartida (ej: pago contado en 24 hs). Esperá la resolución del Propietario antes de firmar recibos.'
            }
        ]
    },
    {
        id: 'PROC-GES-01',
        version: 'v1.0',
        code: 'PROC-GES-01',
        title: 'Auditoría y Organización del Expediente Registral',
        category: 'gestoria',
        scope: 'Equipo de Gestoría',
        status: 'Aprobado por Gestoría y Asesoría Legal',
        lastUpdated: '2026-11-20',
        content: `1. Todo legajo debe identificar unívocamente: Personas (DNI, CUIT, estado civil, asentimiento conyugal Art. 470 CCyC) y Unidad (dominio, motor, chasis en título y F12).
2. Estados documentales: PENDIENTE, RECIBIDO (en oficina, sin auditar), REVISADO (auditado conforme) y OBSERVADO (con defecto a subsanar).
3. Verificaciones de firmas de extraña jurisdicción requieren legalización del Colegio de Escribanos respectivo.`,
        keyQuestions: [
            {
                trigger: '¿Qué tengo que revisar antes de derivar este expediente?',
                keywords: ['revisar antes de derivar', 'control expediente', 'auditar legajo', 'checklist gestoria'],
                summary: `Antes de derivar un expediente registral a inscripción o coordinar entrega, revisá este checklist obligatorio de 5 puntos:
1. Identidad y Personería: DNI frente y dorso legible del comprador y cónyuge (si corresponde), constancia de CUIT/CUIL y poderes vigentes.
2. Asentimiento Conyugal: Si el titular de la permuta o del vehículo es casado y el bien es ganancial, verificar la firma y certificación del cónyuge (Art. 470 CCyC).
3. Coincidencia alfanumérica: Dominio, número de motor y número de chasis deben coincidir exactamente entre Título Digital, Cédula y Formulario 12 policial.
4. Gravámenes y Medidas Cautelares: Informe de dominio con menos de 15 días corridos libre de embargos, prendas activas, inhibiciones o pedidos de secuestro.
5. Libre deuda y sellados: Comprobante de pago de aranceles de DNRPA y sellos de Rentas de Chubut (DGR).
[Fuente oficial: PROC-GES-01 v1.0 y PROC-GES-02 v1.0].`
            }
        ]
    },
    {
        id: 'PROC-ADM-01',
        version: 'v1.1',
        code: 'PROC-ADM-01',
        title: 'Preparación, Validación de Datos y Emisión de Comprobantes ARCA',
        category: 'administracion',
        scope: 'Equipo de Administración',
        status: 'Aprobado por Contaduría y Dirección',
        lastUpdated: '2026-11-20',
        content: `1. Distinguir borrador en CRM de factura emitida con CAE. Un borrador no tiene validez tributaria.
2. Contrastar CUIT en padrón ARCA/AFIP: Responsables Inscriptos llevan Factura A; Monotributistas y particulares llevan Factura B.
3. Diferenciar venta de stock propio (factura por el valor total de la unidad) de consignación de terceros (factura únicamente por la comisión pactada de intermediación).`,
        keyQuestions: [
            {
                trigger: 'como facturar una consignacion',
                keywords: ['facturar consignacion', 'comision consignacion', 'iva consignacion', 'arca afip factura'],
                summary: 'En consignaciones de terceros, la agencia no es dueña del auto. Solo factura la comisión por intermediación comercial (Factura A o B según el cliente) con IVA sobre dicha comisión, adjuntando la liquidación oficial de consignación.'
            }
        ]
    },
    {
        id: 'PROC-ADM-02',
        version: 'v1.1',
        code: 'PROC-ADM-02',
        title: 'Control de Cobros, Conciliación Bancaria y Liberación de Entregas',
        category: 'administracion',
        scope: 'Equipo de Administración y Tesorería',
        status: 'Aprobado por Dirección y Tesorería',
        lastUpdated: '2026-11-20',
        content: `1. Regla Inquebrantable: Un ticket o captura de pantalla de transferencia de WhatsApp NO es un cobro.
2. El cobro se valida EXCLUSIVAMENTE cuando el dinero figura acreditado e indisponible en el extracto bancario oficial de AutoSporting.
3. Transferencias programadas, cheques no compensados o comprobantes editados representan riesgo de estafa.
4. Jamás liberar la entrega de un vehículo sin acreditación bancaria en firme.`,
        keyQuestions: [
            {
                trigger: 'Recibí un comprobante, pero el pago todavía no está validado. ¿Qué procedimiento debo consultar?',
                keywords: ['comprobante recibido', 'pago no validado', 'transferencia pendiente', 'acreditacion extracto', 'que procedimiento consultar'],
                summary: `Debés consultar y aplicar el procedimiento:
[PROC-ADM-02 v1.1 — Control de Cobros, Conciliación Bancaria y Liberación de Entregas].
Pasos inmediatos que establece la norma:
1. Mantené el estado de la operación en el CRM como: "PENDIENTE DE ACREDITACIÓN BANCARIA". No emitas recibo definitivo ni des el visto bueno de entrega.
2. Ingresá al home banking oficial de AutoSporting y verificá si el dinero impactó en el extracto como saldo libre (no pendiente de compensación).
3. Si la captura del cliente es una transferencia interbancaria reciente o programada, informá a Ventas con amabilidad: "El comprobante fue recibido; estamos aguardando el impacto del crédito en la cuenta bancaria para imputar el cobro y liberar la entrega".
4. Si pasadas 24 hs hábiles no figura el crédito, solicitá el comprobante oficial con código COELSA / número de transacción para rastrearlo con el banco emisor.
[Fuente oficial: PROC-ADM-02 v1.1].`
            }
        ]
    }
];

export const searchTutorKnowledge = (query, roleFilter = 'todos') => {
    if (!query || typeof query !== 'string') return [];
    const normalized = query.toLowerCase().trim();

    const results = [];

    for (const proc of TUTOR_PROCEDURES) {
        if (roleFilter !== 'todos' && proc.category !== 'general' && proc.category !== roleFilter) {
            continue;
        }

        // Buscar en preguntas clave predefinidas
        for (const q of proc.keyQuestions) {
            const matchTrigger = q.trigger.toLowerCase().includes(normalized) || normalized.includes(q.trigger.toLowerCase());
            const matchKeywords = q.keywords.some(k => normalized.includes(k) || k.includes(normalized));

            if (matchTrigger || matchKeywords) {
                results.push({
                    title: q.trigger,
                    summary: q.summary,
                    procedureCode: proc.code,
                    procedureTitle: proc.title,
                    version: proc.version,
                    status: proc.status,
                    isOfficialProcedure: true
                });
            }
        }

        // Buscar en el texto del contenido del procedimiento
        if (proc.content.toLowerCase().includes(normalized) || proc.title.toLowerCase().includes(normalized)) {
            const alreadyAdded = results.some(r => r.procedureCode === proc.code);
            if (!alreadyAdded) {
                results.push({
                    title: proc.title,
                    summary: proc.content.slice(0, 320) + '...',
                    procedureCode: proc.code,
                    procedureTitle: proc.title,
                    version: proc.version,
                    status: proc.status,
                    isOfficialProcedure: true
                });
            }
        }
    }

    return results;
};

export const getAvailableProceduresForRole = (role) => {
    const category = role === 'ventas' ? 'ventas' : (role === 'gestoria' || role === 'gestoria_contabilidad') ? 'gestoria' : (role === 'administracion' || role === 'administrativo') ? 'administracion' : 'todos';
    return TUTOR_PROCEDURES.filter(p => category === 'todos' || p.category === 'general' || p.category === category);
};

/**
 * Servicio de Inteligencia Artificial para AutoSporting Academy 2.0.
 * 
 * Funciones clave:
 * 1. Simulación de Comprador (Buyer Agent) para entrenamiento de negociación.
 * 2. Evaluador Independiente con 6 competencias ponderadas y reporte formativo.
 * 3. Tutor Comercial con IA basado en procedimientos aprobados (PROC-*).
 * 
 * Control de costos y seguridad:
 * - Requiere ACADEMY_OPENAI_API_KEY o OPENAI_API_KEY y ACADEMY_AI_ENABLED='true' para llamadas externas.
 * - En ausencia de credenciales dedicadas, opera con un Adaptador Simulado de alta fidelidad,
 *   garantizando continuidad pedagógica sin costos imprevistos ni caídas de servicio.
 * - Límite estricto de turnos (máx. 15 por negociación) y longitud de tokens.
 */

import { NEGOTIATION_SCENARIOS, COMPETENCY_DEFINITIONS } from '../lib/academy/negotiationScenarios.js';
import { TUTOR_PROCEDURES, getAvailableProceduresForRole } from '../lib/academy/roleTutorKnowledge.js';
import {
    reserveAICall,
    settleAICall,
    incrementUserQuota,
    getBudgetStatus,
    resetBudgetForTesting,
    USER_QUOTA_LIMITS
} from './academyBudgetService.js';

export const resetBudgetTrackerForTesting = resetBudgetForTesting;

const MAX_NEGOTIATION_TURNS = 15;
const MAX_BUYER_TOKENS = 250;
const MAX_EVAL_TOKENS = 900;
const AI_TIMEOUT_MS = 12000;

/**
 * Consulta el estado de la conexión a OpenAI y presupuesto persistente
 */
export function getAIConnectionStatus(userId = null) {
    const key = process.env.ACADEMY_OPENAI_API_KEY?.trim();
    const enabled = process.env.ACADEMY_AI_ENABLED === 'true';

    let syncResult;
    if (!key || key.length < 10) {
        syncResult = { isCapable: false, reason: 'missing_dedicated_key', message: 'No se configuró ACADEMY_OPENAI_API_KEY dedicada.' };
    } else if (!enabled) {
        syncResult = { isCapable: false, reason: 'disabled_by_config', message: 'ACADEMY_AI_ENABLED no está habilitado explícitamente en el servidor.' };
    } else {
        const envBudget = parseFloat(process.env.ACADEMY_AI_BUDGET_USD || '0');
        if (isNaN(envBudget) || envBudget <= 0) {
            syncResult = { isCapable: false, reason: 'no_budget_authorized', message: 'No se autorizó un presupuesto ACADEMY_AI_BUDGET_USD (> 0 USD) independiente.' };
        } else {
            syncResult = { isCapable: true, reason: 'authorized', message: 'Conexión OpenAI autorizada y dentro de presupuesto.' };
        }
    }

    const promise = (async () => {
        if (!syncResult.isCapable) return syncResult;
        try {
            const budget = await getBudgetStatus(userId);
            if (budget.authorizedBudgetUSD <= 0) {
                return { isCapable: false, reason: 'no_budget_authorized', message: 'No se autorizó un presupuesto ACADEMY_AI_BUDGET_USD (> 0 USD) independiente.' };
            }
            if (budget.availableUSD <= 0.0001) {
                return { isCapable: false, reason: 'budget_exceeded', message: `Presupuesto asignado agotado ($${budget.authorizedBudgetUSD} USD autorizados, $${budget.confirmedSpentUSD} USD confirmados).` };
            }
            return { isCapable: true, reason: 'authorized', message: 'Conexión OpenAI autorizada y dentro de presupuesto.', budget };
        } catch {
            return syncResult;
        }
    })();

    Object.assign(promise, syncResult);
    return promise;
}

function getApiKey() {
    return process.env.ACADEMY_OPENAI_API_KEY?.trim() || '';
}

/**
 * Validador estricto de servidor para impedir filtración de datos financieros o privados
 */
export function checkConfidentialityPolicy(message = '') {
    if (!message || typeof message !== 'string') return { isForbidden: false };
    const text = message.toLowerCase();

    // 1. Costos de compra, toma real o márgenes confidenciales de la agencia
    const costOrMargin = /(costo|precio)\s*(de|del)?\s*(compra|toma|adquisici[oó]n|coste)|cu[aá]nto\s*(cost[oó]|se\s*pag[oó]|le\s*pagamos|pagaron|ganamos|gana)|margen\s*(de|del)?\s*(ganancia|utilidad|bruto|neto|due[ñn]o|agencia|comercial\s*real)|rentabilidad\s*(real|por\s*unidad)|ganancia\s*neta/i;

    // 2. Saldos bancarios, caja fuerte, dinero disponible o tesorería real
    const treasury = /caja\s*fuerte|caja\s*chica|tesorer[ií]a|extracto\s*bancario|conciliaci[oó]n\s*real|(saldo|dinero|plata|fondos|movimientos).*(caja|banco|cuenta)|cu[aá]nto\s*(dinero|plata|hay).*(caja|banco)/i;

    // 3. Sueldos, salarios o comisiones del personal
    const salary = /(sueldo|salario|comisi[oó]n|remuneraci[oó]n|honorarios)\s*(de|del|para)?\s*(mi|el|la|los|las|un|una|otro|otra)?\s*(otro|empleado|compa[ñn]ero|vendedor|personal|due[ñn]o|gerente|equipo)/i;

    // 4. Credenciales, contraseñas o tokens
    const secrets = /(clave|password|contrase[ñn]a|token|api\s*key|credencial|cbu\s*privado|alias\s*privado)/i;

    // 5. Extracción de bases de datos o clientes reales
    const dataBreach = /(base\s*de\s*datos|clientes?\s*reales?|informaci[oó]n\s*privada\s*del\s*crm|dump|exportar\s*usuarios)/i;

    if (costOrMargin.test(text) || treasury.test(text) || salary.test(text) || secrets.test(text) || dataBreach.test(text)) {
        return {
            isForbidden: true,
            reason: 'Confidencialidad institucional: Como tutor formativo de AutoSporting tengo autorización exclusiva sobre procedimientos operativos, técnicas comerciales, gestoría y facturación. Los costos de compra de las unidades, márgenes financieros, saldos de tesorería e información salarial son confidenciales de la dirección y no forman parte de este espacio educativo.'
        };
    }

    return { isForbidden: false };
}

/**
 * Genera la respuesta del comprador simulado durante la negociación.
 */
export async function generateBuyerReply({ scenarioId, conversationHistory = [], sellerMessage = '', level = 'intermedio', userId = 'anon' }) {
    const scenario = NEGOTIATION_SCENARIOS.find(s => s.id === scenarioId) || NEGOTIATION_SCENARIOS[0];
    
    // Contar turnos del vendedor
    const sellerTurns = conversationHistory.filter(m => m.sender === 'seller').length + 1;
    if (sellerTurns > MAX_NEGOTIATION_TURNS) {
        return {
            text: `[Negociación alcanzada al límite de ${MAX_NEGOTIATION_TURNS} turnos] Bueno, tenemos que ir cerrando porque se me hace tarde. Por favor hagamos el cierre o definamos el próximo paso concreto.`,
            isRealAiConnected: false,
            provider: 'system_limit',
            turnsCount: sellerTurns
        };
    }

    // Intentar reserva atómica en presupuesto persistente
    let reservation = null;
    try {
        reservation = await reserveAICall({ userId, callType: 'buyer' });
    } catch {
        reservation = { allowed: false, simulated: true, reason: 'budget_service_offline' };
    }

    if (reservation?.allowed) {
        try {
            const { reply, tokensIn, tokensOut } = await callOpenAIBuyer(scenario, conversationHistory, sellerMessage, level);
            await settleAICall({
                reservationId: reservation.reservationId,
                tokensIn,
                tokensOut,
                status: 'success',
                userId,
                callType: 'buyer'
            });
            return {
                text: reply,
                isRealAiConnected: true,
                provider: 'openai',
                turnsCount: sellerTurns
            };
        } catch (err) {
            console.warn('[AcademyAI] Fallback a motor pedagógico simulado:', err.message);
            const isTimeout = err.name === 'AbortError' || err.message?.toLowerCase().includes('timeout');
            await settleAICall({
                reservationId: reservation.reservationId,
                status: isTimeout ? 'uncertain' : 'failed',
                errorMessage: err.message,
                userId,
                callType: 'buyer'
            });
        }
    }

    // Adaptador pedagógico simulado de alta fidelidad
    const simulatedReply = simulateBuyerTurn(scenario, conversationHistory, sellerMessage, sellerTurns, level);
    return {
        text: simulatedReply,
        isRealAiConnected: false,
        provider: 'simulated',
        aiStatusReason: reservation?.reason || 'simulated_mode',
        quotaMessage: reservation?.message || null,
        turnsCount: sellerTurns
    };
}

/**
 * Evalúa independientemente la negociación finalizada analizando las 6 competencias.
 */
export async function evaluateNegotiation({ scenarioId, conversationHistory = [], userId = 'anon' }) {
    const scenario = NEGOTIATION_SCENARIOS.find(s => s.id === scenarioId) || NEGOTIATION_SCENARIOS[0];

    let reservation = null;
    try {
        reservation = await reserveAICall({ userId, callType: 'evaluator' });
    } catch {
        reservation = { allowed: false, simulated: true, reason: 'budget_service_offline' };
    }

    if (reservation?.allowed) {
        try {
            const { evalResult, tokensIn, tokensOut } = await callOpenAIEvaluator(scenario, conversationHistory);
            await settleAICall({
                reservationId: reservation.reservationId,
                tokensIn,
                tokensOut,
                status: 'success',
                userId,
                callType: 'evaluator'
            });
            try { await incrementUserQuota(userId, 'session'); } catch {}
            return {
                ...evalResult,
                isRealAiConnected: true,
                provider: 'openai'
            };
        } catch (err) {
            console.warn('[AcademyAI] Evaluador en fallback simulado:', err.message);
            const isTimeout = err.name === 'AbortError' || err.message?.toLowerCase().includes('timeout');
            await settleAICall({
                reservationId: reservation.reservationId,
                status: isTimeout ? 'uncertain' : 'failed',
                errorMessage: err.message,
                userId,
                callType: 'evaluator'
            });
        }
    }

    const simulatedEval = simulateIndependentEvaluation(scenario, conversationHistory);
    try { await incrementUserQuota(userId, 'session'); } catch {}
    return {
        ...simulatedEval,
        isRealAiConnected: false,
        provider: 'simulated',
        aiStatusReason: reservation?.reason || 'simulated_mode',
        quotaMessage: reservation?.message || null
    };
}

/**
 * Tutor con IA basado estrictamente en procedimientos aprobados y aislado de datos financieros confidenciales.
 */
export async function generateTutorReply({ userMessage = '', userRole = 'vendedor', conversationHistory = [], userId = 'anon' }) {
    if (!userMessage || !userMessage.trim()) {
        return {
            text: '¿En qué procedimiento o consulta comercial de AutoSporting te puedo orientar hoy?',
            provider: 'simulated',
            isRealAiConnected: false
        };
    }

    // Filtro de seguridad estricto de servidor contra exfiltración de datos confidenciales
    const confidentialityCheck = checkConfidentialityPolicy(userMessage);
    if (confidentialityCheck.isForbidden) {
        return {
            text: confidentialityCheck.reason,
            provider: 'policy_guard',
            isRealAiConnected: false
        };
    }

    let reservation = null;
    try {
        reservation = await reserveAICall({ userId, callType: 'tutor' });
    } catch {
        reservation = { allowed: false, simulated: true, reason: 'budget_service_offline' };
    }

    if (reservation?.allowed) {
        try {
            const { reply, tokensIn, tokensOut } = await callOpenAITutor(userMessage, userRole, conversationHistory);
            await settleAICall({
                reservationId: reservation.reservationId,
                tokensIn,
                tokensOut,
                status: 'success',
                userId,
                callType: 'tutor'
            });
            try { await incrementUserQuota(userId, 'tutor'); } catch {}
            return {
                text: reply,
                isRealAiConnected: true,
                provider: 'openai'
            };
        } catch (err) {
            console.warn('[AcademyAI] Fallback de tutor a motor local:', err.message);
            const isTimeout = err.name === 'AbortError' || err.message?.toLowerCase().includes('timeout');
            await settleAICall({
                reservationId: reservation.reservationId,
                status: isTimeout ? 'uncertain' : 'failed',
                errorMessage: err.message,
                userId,
                callType: 'tutor'
            });
        }
    }

    const simulatedResponse = simulateTutorKnowledgeResponse(userMessage, userRole);
    try { await incrementUserQuota(userId, 'tutor'); } catch {}
    return {
        text: simulatedResponse,
        isRealAiConnected: false,
        provider: 'simulated',
        aiStatusReason: reservation?.reason || 'simulated_mode',
        quotaMessage: reservation?.message || null
    };
}

// -------------------------------------------------------------
// IMPLEMENTACIÓN DEL ADAPTADOR SIMULADO (MOCK PEDAGÓGICO DE ALTA FIDELIDAD)
// -------------------------------------------------------------

function simulateBuyerTurn(scenario, history, currentMsg, turnNumber, level) {
    const text = currentMsg.toLowerCase();
    const client = scenario.clientProfile;

    // Caso 1: Cliente que pide descuento (desc-01)
    if (scenario.id === 'desc-01') {
        if (text.includes('te bajo') || text.includes('te lo dejo en 27') || text.includes('te hago un descuento') || text.includes('te regalo')) {
            return `Mmm... qué raro que me bajes el precio tan rápido sin mirar los números. ¿Tiene algo raro el auto o alguna deuda de patente oculta?`;
        }
        if (text.includes('procedimiento') || text.includes('titular') || text.includes('consultar') || text.includes('autorización') || text.includes('seña') || text.includes('servicio') || text.includes('historial')) {
            if (turnNumber >= 3) {
                return `Mirá, me parece muy serio lo que me explicás del historial de servicios oficiales en Comodoro y que la documentación esté al día. Si hablás con el titular y me hacés una atención de $300.000 o me incluís la transferencia, te dejo una seña hoy mismo.`;
            }
            return `Entiendo que el auto esté impecable, pero $28.500.000 me parece ajustado. ¿Qué margen real tenés si te transfiero hoy mismo?`;
        }
        if (text.includes('no podemos bajar') || text.includes('precio fijo') || text.includes('es lo que vale')) {
            return `En Trelew vi uno similar por dos millones menos. Explicame bien por qué este Corolla vale los $28.500.000 antes de que me decida.`;
        }
        return `Me interesa el Corolla, pero el precio me hace ruido. ¿Qué propuesta concreta me podés hacer al contado?`;
    }

    // Caso 2: Toma de permuta (toma-02)
    if (scenario.id === 'toma-02') {
        if (text.includes('está rota') || text.includes('gastada') || text.includes('no vale nada') || text.includes('te quejás')) {
            return `¡Pará un poco! No me tires abajo la camioneta. La cuidé como oro y le hice todos los cambios de aceite. Si me vas a despreciar mi auto me voy a otra agencia.`;
        }
        if (text.includes('diferencia') || text.includes('peritaje') || text.includes('reacondicionamiento') || text.includes('garantía') || text.includes('taller')) {
            return `Está bien, entiendo que la agencia tenga que darle garantía al que la compre y que las cubiertas delanteras tengan desgaste. Pero $13 millones es poco. Si me la reconocen en $13.800.000 y vemos la diferencia neta para la Amarok, me siento a negociar.`;
        }
        return `En internet por una EcoSport Titanium como la mía piden 16 millones. ¿Cómo justifican que me la reciban en 13? Es mucha la diferencia.`;
    }

    // Caso 3: Indeciso (inde-03)
    if (scenario.id === 'inde-03') {
        if (text.includes('apurate') || text.includes('se lo lleva otro') || text.includes('hoy o nunca')) {
            return `La verdad no me gusta que me apuren. Prefiero pensarlo tranquilo el fin de semana y cualquier cosa te aviso.`;
        }
        if (text.includes('qué te preocupa') || text.includes('cuál es la duda') || text.includes('mantenimiento') || text.includes('patentes') || text.includes('prueba de manejo')) {
            return `Lo que más me frena es no saber cuánto me va a salir el mantenimiento mensual del motor turbo y el costo de patentes acá en Comodoro. Si me podés pasar esos números claros, lo hablo hoy mismo con mi señora.`;
        }
        if (text.includes('jueves') || text.includes('llamado') || text.includes('coordinamos') || text.includes('te escribo')) {
            return `Dale, impecable. Escribime el jueves a las 11:00 hs con el cálculo de patentes y lo cerramos.`;
        }
        return `El Cruze está hermoso, de verdad, pero no quiero meter la pata con un gasto grande sin estar 100% seguro con los números.`;
    }

    // Caso 4: Compara agencias (comp-04)
    if (scenario.id === 'comp-04') {
        if (text.includes('son unos truchos') || text.includes('te van a estafar') || text.includes('la otra agencia es mala')) {
            return `No hables de la competencia, ellos me atendieron de diez. Yo hablo de números: tienen una Renegade parecida a $22.5M y ustedes están en $24M.`;
        }
        if (text.includes('kilometraje') || text.includes('informe de dominio') || text.includes('cubiertas') || text.includes('garantía') || text.includes('80 puntos')) {
            return `Bueno... tenés razón en que la de ellos tiene 85.000 kilómetros y esta tiene 42.000 con cubiertas nuevas. Es un punto importante. ¿Podemos revisar qué incluye la gestoría de ustedes para ver si me conviene?`;
        }
        return `En la agencia de zona norte me piden $22.500.000. Si ustedes me igualan el número cerramos acá, si no me voy para allá.`;
    }

    // Caso 5: Financiación (fina-05)
    if (scenario.id === 'fina-05') {
        if (text.includes('te lo apruebo yo') || text.includes('sale con dni seguro') || text.includes('no te preocupes por el veraz')) {
            return `¡Buenísimo! ¿Entonces te dejo $500.000 ya y me garantizás que la semana que viene retiro la Kangoo sin más trámites?`;
        }
        if (text.includes('banco') || text.includes('análisis crediticio') || text.includes('ingresos') || text.includes('cónyuge') || text.includes('recibo de sueldo') || text.includes('scoring')) {
            return `Ah, entiendo... claro, con mi monotributo bajo capaz el banco me rebota. Te cuento: mi marido trabaja en el petróleo con recibo de sueldo de 6 años de antigüedad y sin deudas. ¿Podemos presentarlo con él?`;
        }
        return `Tengo 7 millones en efectivo y quiero financiar los otros 16.5 millones. En otra agencia me dijeron que salía a sola firma con DNI sin presentar balances ni nada.`;
    }

    // Caso 6: Exigente / difícil (difi-06)
    if (scenario.id === 'difi-06') {
        if (text.includes('cálmese') || text.includes('no me falte el respeto') || text.includes('si no confía no compre')) {
            return `¿Ves cómo son? Uno viene con plata en mano a preguntar cosas lógicas y se ofenden. En Comodoro las agencias se creen dueñas del mercado. Me voy a otra parte.`;
        }
        if (text.includes('informe de dominio') || text.includes('mecánico') || text.includes('escanear') || text.includes('revisar') || text.includes('documentación')) {
            return `Mirá vos... me parece bien que no te achiques y que me ofrezcas traer al mecánico a enchufar el escáner. Eso demuestra que no esconden nada. Mostrame la carpeta con el informe de dominio y el F12.`;
        }
        return `Esta Hilux seguro la tuvieron en el yacimiento dándole masa en los cañadones. Todos dicen que es de una señora que la usaba para hacer las compras. A mí no me van a meter gato por liebre.`;
    }

    // Caso 7: Seña irregular (sena-07)
    if (scenario.id === 'sena-07') {
        if (text.includes('transferime a mi alias') || text.includes('transferime a mi cuenta') || text.includes('te la guardo de palabra')) {
            return `¡Genial! Pasame tu alias de Mercado Pago por WhatsApp y te mando los 300 mil pesos ahora. Guardámela hasta el lunes que viene sin falta eh.`;
        }
        if (text.includes('cuenta oficial') || text.includes('procedimiento') || text.includes('recibo') || text.includes('5%') || text.includes('autorización')) {
            return `Entiendo que sea por seguridad para que quede el recibo oficial de AutoSporting. ¿Podemos hacer una reserva provisoria de 24 horas con lo que tengo disponible mientras el banco me libera los fondos mañana temprano?`;
        }
        return `¡Me encantó el 208! Bloquéamelo en la web ya mismo. Te transfiero $300.000 a tu cuenta particular y el lunes te traigo todo el saldo restante.`;
    }

    // Caso 8: Integral (inte-08)
    if (scenario.id === 'inte-08') {
        if (text.includes('llevátela hoy') || text.includes('te la entrego antes') || text.includes('te tomo el gol en 10.5 sin drama')) {
            return `Listo, me parece bárbaro. ¿Firmamos ya el boleto y me llevo la Ranger puesta esta tarde con las llaves?`;
        }
        if (text.includes('paso a paso') || text.includes('desglosar') || text.includes('registro') || text.includes('transferencia') || text.includes('entrega')) {
            return `Me gusta tu prolijidad. Desglosemos: defendeme por qué el Gol entra en 9 millones y explicame bien cómo es el circuito del crédito prendario y los tiempos de gestoría para la entrega. Si los números me cierran, avanzamos formalmente.`;
        }
        return `Hagamos un paquete global: me tomás el Gol en 10 y medio, te doy 20 millones contados, el resto en cuotas blandas y me llevo la chata esta misma tarde. Tomalo o dejalo.`;
    }

    // Genérico patagónico
    return `Entiendo lo que me decís, pero quiero una propuesta concreta y transparente. ¿Cómo seguimos para que nos sirva a ambos?`;
}

function simulateIndependentEvaluation(scenario, history) {
    const sellerMessages = history.filter(m => m.sender === 'seller');
    const fullText = sellerMessages.map(m => m.text).join(' ').toLowerCase();

    // 1. Detección de errores críticos institucionales
    const committedPersonalAccount = fullText.includes('mi alias') || fullText.includes('mi cbu') || fullText.includes('mi cuenta') || fullText.includes('transferime a mi');
    const promisedUnauthorizedDelivery = fullText.includes('llevátela hoy') || fullText.includes('te la llevás ya') || fullText.includes('sin transferencia') || fullText.includes('llevatela puesta');
    const guaranteedCreditApproval = fullText.includes('sale seguro') || fullText.includes('te lo apruebo yo') || fullText.includes('sale con dni sí o sí') || fullText.includes('sin veraz') || fullText.includes('garantizo el crédito');

    const hasCriticalError = committedPersonalAccount || promisedUnauthorizedDelivery || guaranteedCreditApproval;

    // 2. Detección de rechazo o negativa frente a exigencias desmedidas
    const hasRefusal = fullText.includes('no podemos') ||
                       fullText.includes('no es posible') ||
                       fullText.includes('imposible') ||
                       fullText.includes('no llego') ||
                       fullText.includes('no le puedo bajar') ||
                       fullText.includes('precio fijo') ||
                       fullText.includes('precio es fijo') ||
                       fullText.includes('no se baja') ||
                       fullText.includes('no bajo') ||
                       fullText.includes('no te puedo tomar') ||
                       fullText.includes('desist') ||
                       fullText.includes('no podemos acceder') ||
                       fullText.includes('no aceptamos') ||
                       fullText.includes('respeto su decisión') ||
                       fullText.includes('respetamos su decisión') ||
                       fullText.includes('no es viable') ||
                       fullText.includes('no hago descuento') ||
                       fullText.includes('no hacemos descuento') ||
                       fullText.includes('destruye el margen');

    // 3. Factores de contexto para determinar si el rechazo fue justificado o injustificado/prematuro
    const hasDiagnosis = fullText.includes('para qué') ||
                         fullText.includes('qué uso') ||
                         fullText.includes('cuánto pensabas') ||
                         fullText.includes('qué duda') ||
                         fullText.includes('cuál es la duda') ||
                         fullText.includes('qué presupuesto') ||
                         fullText.includes('qué buscás') ||
                         fullText.includes('qué busca') ||
                         fullText.includes('contame') ||
                         fullText.includes('comentame') ||
                         sellerMessages.length >= 3;

    const hasListeningOrDiagnosis = hasDiagnosis ||
                                    fullText.includes('comprendo') ||
                                    fullText.includes('entiendo') ||
                                    fullText.includes('escucho') ||
                                    fullText.includes('postura');

    const hasExplanation = fullText.includes('costo') ||
                           fullText.includes('margen') ||
                           fullText.includes('peritaje') ||
                           fullText.includes('valor de lista') ||
                           fullText.includes('service') ||
                           fullText.includes('historial') ||
                           fullText.includes('garantía') ||
                           fullText.includes('estado de la unidad') ||
                           fullText.includes('oficial') ||
                           fullText.includes('procedimiento') ||
                           fullText.includes('por política') ||
                           fullText.includes('diferencia') ||
                           fullText.includes('cubierta') ||
                           fullText.includes('deuda');

    const hasAlternatives = fullText.includes('te propongo') ||
                            fullText.includes('podemos ver') ||
                            fullText.includes('otra opción') ||
                            fullText.includes('otra unidad') ||
                            fullText.includes('financi') ||
                            fullText.includes('transferencia incluida') ||
                            fullText.includes('atención de') ||
                            fullText.includes('podemos evaluar') ||
                            fullText.includes('si le parece') ||
                            fullText.includes('revisemos');

    const isJustifiedDecline = hasRefusal && hasListeningOrDiagnosis && (hasExplanation || hasAlternatives);
    const isUnjustifiedDecline = hasRefusal && !isJustifiedDecline;

    // Evaluaciones individuales de competencias
    // 1. Identificación de necesidades (20%)
    let scoreIndagacion = 75;
    let quoteIndagacion = sellerMessages[0]?.text || 'Conversación inicial';
    let feedbackIndagacion = 'Hizo preguntas de exploración básica sobre el uso previsto del vehículo.';
    if (fullText.includes('para qué') || fullText.includes('qué uso') || fullText.includes('cuánto pensabas') || fullText.includes('qué duda') || fullText.includes('cuál es la duda')) {
        scoreIndagacion = 90;
        feedbackIndagacion = 'Excelente diagnóstico. Preguntas abiertas para detectar la motivación real y el presupuesto.';
    } else if (isUnjustifiedDecline) {
        scoreIndagacion = 60;
        feedbackIndagacion = 'Indagación insuficiente: se respondió o rechazó antes de profundizar en las necesidades del comprador.';
    }

    // 2. Comunicación y claridad (15%)
    let scoreComunicacion = 80;
    let quoteComunicacion = sellerMessages[1]?.text || sellerMessages[0]?.text || '';
    let feedbackComunicacion = 'Tono profesional, respetuoso y acorde al estándar comercial de AutoSporting.';
    if (fullText.includes('tranquilo') || fullText.includes('con gusto') || fullText.includes('te explico con claridad') || fullText.includes('comprendo') || fullText.includes('por política') || fullText.includes('si le parece')) {
        scoreComunicacion = 92;
        feedbackComunicacion = 'Gran empatía y templanza frente a las objeciones del comprador.';
    }

    // 3. Argumentación comercial (20%)
    let scoreArgumentacion = 70;
    let quoteArgumentacion = sellerMessages.find(m => m.text.toLowerCase().includes('servicio') || m.text.toLowerCase().includes('historial') || m.text.toLowerCase().includes('garantía') || m.text.toLowerCase().includes('oficial'))?.text || sellerMessages[0]?.text || '';
    let feedbackArgumentacion = 'Defendió los atributos del vehículo.';
    if (fullText.includes('oficial') || fullText.includes('verificación') || fullText.includes('dominio') || fullText.includes('80 puntos') || fullText.includes('estado')) {
        scoreArgumentacion = 88;
        feedbackArgumentacion = 'Argumentó sólidamente basándose en la procedencia, historial técnico y seguridad documental de la agencia.';
    } else if (isUnjustifiedDecline) {
        scoreArgumentacion = 62;
        feedbackArgumentacion = 'Argumentación débil: no se sostuvieron los atributos del vehículo ni el valor agregado de la agencia.';
    }

    // 4. Manejo de objeciones (20%)
    let scoreObjeciones = 72;
    let quoteObjeciones = sellerMessages.find(m => m.text.toLowerCase().includes('entiendo') || m.text.toLowerCase().includes('diferencia') || m.text.toLowerCase().includes('comprendo') || m.text.toLowerCase().includes('analicemos'))?.text || sellerMessages[0]?.text || '';
    let feedbackObjeciones = 'Atendió las dudas del cliente sin ponerse a la defensiva.';
    if (((fullText.includes('entiendo') || fullText.includes('comprendo')) && (fullText.includes('pero') || fullText.includes('analicemos') || fullText.includes('veamos') || fullText.includes('sin embargo'))) || (fullText.includes('precio de lista') && fullText.includes('atención')) || isJustifiedDecline) {
        scoreObjeciones = 86;
        feedbackObjeciones = 'Recepción empática: reformuló la objeción hacia la propuesta de valor sin confrontar.';
    } else if (isUnjustifiedDecline) {
        scoreObjeciones = 58;
        feedbackObjeciones = 'Manejo rígido de objeciones: se clausuró el diálogo sin explorar alternativas viables.';
    }

    // 5. Negociación y autorizaciones (15%)
    let scoreAutorizaciones = 85;
    let quoteAutorizaciones = sellerMessages.find(m => m.text.toLowerCase().includes('autoriz') || m.text.toLowerCase().includes('titular') || m.text.toLowerCase().includes('procedimiento') || m.text.toLowerCase().includes('margen') || m.text.toLowerCase().includes('cuenta'))?.text || '';
    let feedbackAutorizaciones = 'Respetó los límites operativos de la agencia.';
    if (hasCriticalError) {
        scoreAutorizaciones = 25;
        feedbackAutorizaciones = 'ERROR CRÍTICO: Se otorgaron o prometieron condiciones no autorizadas por procedimiento (PROC-VTA).';
    } else if (isJustifiedDecline || fullText.includes('consultar con el titular') || fullText.includes('procedimiento') || fullText.includes('cuenta oficial') || fullText.includes('autoriz')) {
        scoreAutorizaciones = 95;
        feedbackAutorizaciones = 'Excelente apego a procedimientos: defendió la rentabilidad de la agencia o condicionó descuentos a la aprobación formal.';
    } else if (isUnjustifiedDecline) {
        scoreAutorizaciones = 65;
        feedbackAutorizaciones = 'Cierre apresurado sin consultar ni ofrecer alternativas autorizadas.';
    }

    // 6. Cierre o próximo paso (10%)
    let scoreCierre = 70;
    let quoteCierre = sellerMessages[sellerMessages.length - 1]?.text || '';
    let feedbackCierre = 'Definió un cierre razonable.';
    if (fullText.includes('seña') || fullText.includes('reserva') || fullText.includes('jueves') || fullText.includes('mañana a las') || fullText.includes('agenda')) {
        scoreCierre = 90;
        feedbackCierre = 'Cierre con compromiso firme: agendó próximo paso con fecha, hora y entregable puntual.';
    } else if (isUnjustifiedDecline) {
        scoreCierre = 55;
        feedbackCierre = 'Se cerró la negociación sin pautar seguimiento ni dejar abierta la puerta comercial.';
    }

    // Ponderación oficial
    let weightedScore = Math.round(
        (scoreIndagacion * 0.20) +
        (scoreComunicacion * 0.15) +
        (scoreArgumentacion * 0.20) +
        (scoreObjeciones * 0.20) +
        (scoreAutorizaciones * 0.15) +
        (scoreCierre * 0.10)
    );

    let finalScore = weightedScore;
    let outcomeStatus = 'seguimiento_agendado';

    if (hasCriticalError) {
        outcomeStatus = 'sin_acuerdo_error_grave';
        finalScore = Math.min(weightedScore, 40);
    } else if (isJustifiedDecline) {
        outcomeStatus = 'desistido_con_criterio';
        finalScore = Math.max(weightedScore, 85);
    } else if (isUnjustifiedDecline) {
        outcomeStatus = 'desistido_injustificado';
        finalScore = Math.min(weightedScore, 65);
    } else if (weightedScore >= 82) {
        outcomeStatus = 'acuerdo_cerrado';
    }

    const evaluationContext = {
        buyerDemands: scenario.buyerPromptInstruction || scenario.clientProfile?.initialTone || 'Exigencia de descuento o condiciones especiales',
        sellerDiagnosis: hasDiagnosis ? 'El vendedor indagó adecuadamente las necesidades y presupuesto del comprador.' : 'El vendedor no profundizó en el diagnóstico de necesidades antes de avanzar.',
        authorizedConditions: `Valor de lista: $${scenario.vehicleOfInterest?.listPrice?.toLocaleString('es-AR')}. Pautas: ${scenario.pedagogicalGoal}`,
        alternativesOffered: hasAlternatives ? 'Se propusieron alternativas viables dentro de los márgenes y procedimientos autorizados.' : 'No se ofrecieron alternativas comerciales estructuradas.',
        refusalExplanation: hasRefusal ? (hasExplanation ? 'Negativa fundamentada con claridad en el estado de la unidad, costos o rentabilidad.' : 'Negativa prematura sin explicación comprensible para el cliente.') : 'No se requirió negativa terminante.',
        nextStepSummary: quoteCierre || 'Próximo paso registrado al finalizar la interacción.'
    };

    const strengths = [
        scoreComunicacion >= 80 ? 'Excelente claridad en la modulación del mensaje y respeto por los tiempos del cliente.' : 'Disposición cordial.',
        scoreAutorizaciones >= 80 ? 'Firme defensa de la rentabilidad y apego a las políticas comerciales de AutoSporting.' : 'Defensa del valor de la unidad.'
    ];

    const improvements = [
        isUnjustifiedDecline ? 'Evitar rechazos apresurados: indagar a fondo la duda oculta y fundamentar el valor antes de cerrar la puerta.' : (scoreObjeciones < 80 ? 'Profundizar más en la duda oculta antes de contraofertar de forma anticipada.' : 'Reforzar el desglose de los gastos de transferencia.'),
        hasCriticalError ? 'CRÍTICO: No comprometer fondos, cuentas personales ni plazos de entrega sin procedimiento.' : 'Explicitar con mayor solidez los tiempos del informe de dominio y gestoría.'
    ];

    const keyMoments = [
        {
            sellerQuote: quoteArgumentacion.slice(0, 140) || 'El vehículo cuenta con historial comprobable.',
            critique: 'Momento de anclaje de valor: sostener la unidad por su estado real evita ceder márgenes innecesariamente.',
            suggestedAlternative: '“Entiendo su postura Don Morales; sin embargo, esta unidad cuenta con services oficiales, cubiertas nuevas y verificación policial al día en Chubut, lo que le ahorra más de $800.000 en imprevistos inmediatos.”'
        },
        {
            sellerQuote: quoteCierre.slice(0, 140) || 'Coordinemos para avanzar.',
            critique: 'Definición del próximo paso: la seña formal o el compromiso con fecha y hora evitan la pérdida de seguimiento.',
            suggestedAlternative: '“Para asegurar que la unidad no se reserve en la web mientras coordinamos la consulta con gerencia, emitamos una reserva provisoria de 24 hs según protocolo oficial.”'
        }
    ];

    const recommendations = [
        'Repasar el módulo VTA-02 (Defensa del valor y objeciones de precio).',
        'Recordar la regla de oro: nunca prometer aprobaciones crediticias bancarias ni entregas previas al ingreso registral formal.',
        'Practicar el escenario de clientes exigentes para pulir la recepción empática sin ceder en los procedimientos.'
    ];

    return {
        scenarioId: scenario.id,
        score: finalScore,
        outcomeStatus,
        evaluationContext,
        heuristicDisclaimer: 'Aviso pedagógico: En modo simulado, el reporte ofrece una orientación pedagógica heurística basada en las pautas y rúbricas institucionales de AutoSporting.',
        competencies: {
            identificacionNecesidades: { score: scoreIndagacion, feedback: feedbackIndagacion, quote: quoteIndagacion.slice(0, 120) },
            comunicacionClaridad: { score: scoreComunicacion, feedback: feedbackComunicacion, quote: quoteComunicacion.slice(0, 120) },
            argumentacionComercial: { score: scoreArgumentacion, feedback: feedbackArgumentacion, quote: quoteArgumentacion.slice(0, 120) },
            manejoObjeciones: { score: scoreObjeciones, feedback: feedbackObjeciones, quote: quoteObjeciones.slice(0, 120) },
            negociacionAutorizaciones: { score: scoreAutorizaciones, feedback: feedbackAutorizaciones, quote: quoteAutorizaciones.slice(0, 120) },
            cierreOProximoPaso: { score: scoreCierre, feedback: feedbackCierre, quote: quoteCierre.slice(0, 120) }
        },
        strengths,
        improvements,
        keyMoments,
        recommendations,
        nextPracticeSuggested: scenario.id === 'desc-01' ? 'toma-02' : 'difi-06'
    };
}

function simulateTutorKnowledgeResponse(userMessage, userRole) {
    const text = userMessage.toLowerCase();

    if (text.includes('seña') || text.includes('reserva')) {
        return `Sobre el procedimiento de señas (PROC-VTA-05):
1. Monto mínimo institucional: 5% del valor de lista de la unidad.
2. Destino de los fondos: Exclusivamente cuentas bancarias autorizadas de AutoSporting. Jamás cuentas personales o billeteras virtuales privadas.
3. Plazo de mantenimiento de precio: 72 horas corridas para formalizar boleto o solicitud de crédito.
4. Emisión obligatoria: Recibo oficial provisorio numerado emitido por administración.`;
    }

    if (text.includes('permuta') || text.includes('toma') || text.includes('usado')) {
        return `Sobre toma de permutas (PROC-VTA-03):
1. Inspección obligatoria: Ficha técnica de peritaje completada por taller (frenos, cubiertas, chapa, tren delantero).
2. Cálculo de toma: El valor de toma descuenta los reacondicionamientos necesarios y el costo de transferencia con garantía de reventa.
3. Autorización: El vendedor no puede ajustar el valor de toma peritado por su cuenta. Requiere el aval del responsable de usados o del titular.`;
    }

    if (text.includes('gestoría') || text.includes('08') || text.includes('cónyuge') || text.includes('asentimiento')) {
        return `Sobre trámites de gestoría y documentación (PROC-GES-01 / PROC-GES-02):
1. Asentimiento conyugal (Art. 470 CCyC): Si el titular es de estado civil casado y el bien es ganancial, es obligatorio que el cónyuge firme el 08 o poder especial.
2. Controles previos al ingreso: Informe de dominio histórico (sin embargos ni prendas vigentes), Formulario 13D de multas nacional y libre deuda de patente municipalizado.
3. La entrega del vehículo no se realiza sin que la transferencia esté formalmente ingresada ante el Registro Seccional competente.`;
    }

    if (text.includes('monotribut') || text.includes('factura a') || text.includes('factura b') || text.includes('matriz arca') || text.includes('tipo de factura')) {
        return `Sobre determinación de comprobantes según la Matriz Oficial de ARCA (PROC-ADM-01 v1.2):
1. Emisor Responsable Inscripto → Receptor Responsable Inscripto o Monotributista: Factura "A" (con leyenda reglamentaria sobre inclusión fiscal y subtipo autorizado).
2. Emisor Responsable Inscripto → Receptor Consumidor Final o Sujeto Exento: Factura "B".
3. Emisor Monotributista: Factura "C" a cualquier destinatario.
[PROC-ADM-01 v1.2 — Pendiente de validación por Contador Público].`;
    }

    if (text.includes('factura') || text.includes('pago') || text.includes('transferencia no acreditada')) {
        return `Sobre cobranzas y facturación (PROC-ADM-01 / PROC-ADM-02):
1. Transferencias: Ningún vehículo ni recibo definitivo se libera contra 'comprobante de pantalla' de celular. Debe verificarse la acreditación real en el extracto de cuenta bancaria.
2. Diferencias o retenciones: Cualquier inconsistencia impositiva (percepciones de ingresos brutos, retenciones no previstas) debe derivarse de inmediato a consulta con el contador de la agencia antes de emitir la factura electrónica definitiva.`;
    }

    // Default procedure summary
    const procs = getAvailableProceduresForRole(userRole);
    return `Para tu rol (${userRole}), los procedimientos clave autorizados son: ${procs.map(p => p.id).join(', ')}.
¿Te gustaría consultar los requisitos de reserva (PROC-VTA-05), el circuito de toma de permutas (PROC-VTA-03) o el protocolo de entregas coordinadas con gestoría (PROC-GES-03)?`;
}

// -------------------------------------------------------------
// LLAMADAS EXTERNAS A OPENAI (SI EXISTE CONFIGURACIÓN EXPRESA)
// -------------------------------------------------------------

async function callOpenAIBuyer(scenario, history, currentMsg, level) {
    const apiKey = getApiKey();
    const systemPrompt = `Sos un cliente ficticio llamado ${scenario.clientProfile.name} negociando en AutoSporting, una agencia de autos de Comodoro Rivadavia, Chubut, Argentina.
Vehículo: ${scenario.vehicleOfInterest.brand} ${scenario.vehicleOfInterest.model} (${scenario.vehicleOfInterest.year}), valor publicado: $${scenario.vehicleOfInterest.listPrice.toLocaleString('es-AR')}.
Tu perfil: ${scenario.clientProfile.temperament}.
Tu objetivo: ${scenario.clientProfile.initialTone}.
Instrucción secreta: ${scenario.buyerPromptInstruction}.
Nivel de dificultad: ${level}.
Reglas estrictas de comportamiento:
1. Hablá en primera persona, de manera fluida y con modismos argentinos naturales (usá 'vos', 'mirá', 'dale', 'che').
2. NO reveles tu presupuesto secreto ni digas 'mi prompt me dice'.
3. Respondé en no más de 3 oraciones por intervención.
4. Mantené el contexto de lo que el vendedor te viene diciendo.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(m => ({
            role: m.sender === 'seller' ? 'user' : 'assistant',
            content: m.text
        })),
        { role: 'user', content: currentMsg }
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: MAX_BUYER_TOKENS,
                temperature: 0.7
            }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`OpenAI buyer error HTTP ${res.status}`);
        const data = await res.json();
        return {
            reply: data.choices?.[0]?.message?.content?.trim() || 'Entiendo lo que me decís. Déjame evaluar la propuesta.',
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0
        };
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

async function callOpenAIEvaluator(scenario, history) {
    const apiKey = getApiKey();
    const conversationTranscript = history.map(m => `[${m.sender === 'seller' ? 'VENDEDOR' : 'CLIENTE'}]: ${m.text}`).join('\n');

    const systemPrompt = `Sos el Evaluador Pedagógico Independiente de AutoSporting Academy.
Tu tarea es analizar el desempeño del vendedor en la negociación del escenario "${scenario.title}" (${scenario.level}).
Contexto del caso:
- Exigencias del comprador: ${scenario.buyerPromptInstruction || scenario.clientProfile?.initialTone}.
- Condiciones autorizadas de la agencia: Valor de lista $${scenario.vehicleOfInterest?.listPrice?.toLocaleString('es-AR')}. Pauta: ${scenario.pedagogicalGoal}.

Evaluá estas 6 competencias con sus ponderaciones exactas:
1. Identificación de necesidades (20%)
2. Comunicación y claridad (15%)
3. Argumentación comercial (20%)
4. Manejo de objeciones (20%)
5. Negociación y autorizaciones (15%)
6. Cierre o próximo paso (10%)

Criterios de calificación estrictos:
- Rechazo justificado: Si el vendedor diagnosticó necesidades, explicó por qué no puede acceder a una rebaja desmedida y ofreció alternativas válidas dentro de pautas, calificalo POSITIVAMENTE con 80 o superior ("desistido_con_criterio").
- Rechazo injustificado o prematuro: Si rechazó sin diagnosticar, sin explicar motivos o sin proponer opciones, asigná calificación menor ("desistido_injustificado").
- Errores críticos institucionales: Si prometió entrega sin transferencia formal, aceptó pagos a cuenta/alias personal o garantizó crédito sin análisis de scoring bancario, la calificación NO PUEDE superar los 40 puntos ("sin_acuerdo_error_grave"), sin importar la cortesía.
- Citá fragmentos reales textuales de la conversación que justifiquen cada puntaje.
- Devolvé ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "scenarioId": "${scenario.id}",
  "score": 85,
  "outcomeStatus": "acuerdo_cerrado", // opciones: "acuerdo_cerrado", "seguimiento_agendado", "desistido_con_criterio", "desistido_injustificado", "sin_acuerdo_error_grave"
  "evaluationContext": {
    "buyerDemands": "...",
    "sellerDiagnosis": "...",
    "authorizedConditions": "...",
    "alternativesOffered": "...",
    "refusalExplanation": "...",
    "nextStepSummary": "..."
  },
  "competencies": {
    "identificacionNecesidades": { "score": 80, "feedback": "...", "quote": "..." },
    "comunicacionClaridad": { "score": 85, "feedback": "...", "quote": "..." },
    "argumentacionComercial": { "score": 90, "feedback": "...", "quote": "..." },
    "manejoObjeciones": { "score": 85, "feedback": "...", "quote": "..." },
    "negociacionAutorizaciones": { "score": 90, "feedback": "...", "quote": "..." },
    "cierreOProximoPaso": { "score": 80, "feedback": "...", "quote": "..." }
  },
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "keyMoments": [
    { "sellerQuote": "...", "critique": "...", "suggestedAlternative": "..." }
  ],
  "recommendations": ["...", "...", "..."],
  "nextPracticeSuggested": "toma-02"
}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Transcripción de la práctica:\n${conversationTranscript}` }
                ],
                max_tokens: MAX_EVAL_TOKENS,
                temperature: 0.3,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`OpenAI eval error HTTP ${res.status}`);
        const data = await res.json();
        const evalResult = JSON.parse(data.choices?.[0]?.message?.content);
        return {
            evalResult,
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0
        };
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

async function callOpenAITutor(userMessage, userRole, history) {
    const apiKey = getApiKey();
    const procs = getAvailableProceduresForRole(userRole);
    const proceduresSummary = procs.map(p => `${p.id}: ${p.title}. Resumen: ${p.steps.join('; ')}`).join('\n');

    const systemPrompt = `Sos el Tutor Pedagógico Oficial de AutoSporting Academy para el rol "${userRole}".
Tenés acceso exclusivo a los procedimientos institucionales aprobados de la agencia:
${proceduresSummary}

Reglas mandatorias:
1. Respondé con solvencia, concisión y profesionalismo automotriz argentino.
2. Si un procedimiento no existe o la consulta involucra datos prohibidos (márgenes confidenciales del dueño, costos de compra, saldo de cajas), aclaralo sin rodeos.
3. No uses lenguaje genérico: hacé referencia a los procedimientos PROC-* cuando aplique.
4. Máximo 150 palabras por respuesta.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history.slice(-4).map(m => ({ role: m.role || 'user', content: m.content || m.text })),
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 300,
                temperature: 0.5
            }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`OpenAI tutor error HTTP ${res.status}`);
        const data = await res.json();
        return {
            reply: data.choices?.[0]?.message?.content?.trim() || 'No tengo registro de ese procedimiento.',
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0
        };
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

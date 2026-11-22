// src/services/academyDailyChallengeService.js
/**
 * Motor central de generación y corrección de Desafíos Diarios de AutoSporting Academy 3.0.
 * Conexión segura con stock comercial, preguntas sin ambigüedades, tolerancia numérica
 * y congelamiento histórico de datos evaluados.
 */

import mongoose from 'mongoose';
import AcademyDailyChallenge from '../models/AcademyDailyChallenge.js';
import AcademyChallengeAttempt from '../models/AcademyChallengeAttempt.js';
import { getAvailableCommercialStock } from './academyStockAdapter.js';
import { recordConceptOutcome, getTodayArgentinaDate, getDueConceptsForReview } from './academyMemoryService.js';
import { createChallengeCompletedNotification } from './academyNotificationService.js';
import { getUserProgress } from './academyProgressService.js';

// Almacén en memoria para tests aislados
const inMemoryChallengeStore = new Map();
const inMemoryAttemptStore = new Map();

// Banco de procedimientos oficiales inmutables de AutoSporting
const OFFICIAL_PROCEDURES = [
    {
        questionText: 'Si un cliente solicita transferir una seña para asegurar una unidad fuera de horario, ¿cuál es el procedimiento oficial?',
        options: [
            'Aceptar transferencia a la cuenta bancaria oficial de AutoSporting y registrar reserva provisoria con comprobante formal.',
            'Pedir que transfiera a la cuenta personal de Mercado Pago del vendedor para no perder la venta.',
            'Entregar las llaves del vehículo con boleto firmado sin esperar acreditación de fondos.',
            'Prometer la reserva de palabra sin comprobante ni verificación bancaria.'
        ],
        correctOptionIndex: 0,
        explanation: 'En AutoSporting todos los cobros y señas deben acreditarse exclusivamente en cuentas oficiales de la empresa. Está terminantemente prohibido recibir fondos en cuentas personales.'
    },
    {
        questionText: '¿Cuándo está autorizado un vendedor a entregar físicamente una unidad al comprador?',
        options: [
            'Únicamente cuando el 100% de los fondos están acreditados en cuenta y el expediente cuenta con Formulario 08 firmado y verificación policial.',
            'Apenas el comprador firma el boleto de compraventa, aunque la transferencia bancaria figure en trámite.',
            'Si el cliente deja una seña del 30% y se compromete a saldar el resto la semana próxima.',
            'Cuando el cliente presenta un comprobante digital de transferencia sin verificar su impacto real en la cuenta.'
        ],
        correctOptionIndex: 0,
        explanation: 'Por estricta política de seguridad, ninguna unidad sale de la agencia sin acreditación fehaciente del 100% de los fondos y validación del legajo documental.'
    },
    {
        questionText: '¿Qué garantía oficial de documentación entrega AutoSporting en vehículos usados seleccionados?',
        options: [
            'Peritaje de 80 puntos mecánicos, informe de dominio histórico libre de inhibiciones y garantía de transferencia al día.',
            'Garantía verbal de palabra del vendedor sin respaldo documental.',
            'Garantía exclusiva de motor por 10 años sin importar el kilometraje.',
            'Traspaso de responsabilidad al comprador sin informe de deuda registral ni patentes.'
        ],
        correctOptionIndex: 0,
        explanation: 'El diferencial comercial de AutoSporting en Comodoro Rivadavia es la transparencia total: peritaje de 80 puntos y legajo registral 100% auditado.'
    }
];

// Banco de dilemas de negociación con rúbrica contextual
const NEGOTIATION_DILEMMAS = [
    {
        questionText: 'Un cliente manifiesta: "En otra agencia me dejan una unidad similar a 3 millones menos. O me igualan el precio de contado hoy mismo o me voy". ¿Cuál es la respuesta comercial correcta?',
        options: [
            'Explicar con respeto que nuestra unidad cuenta con peritaje certificado de 80 puntos, services oficiales y garantía registral; sostener la rentabilidad y proponer alternativas como bonificar transferencia o financiación.',
            'Rebajar de inmediato los 3 millones para no perder la operación a cualquier costo.',
            'Decirle al cliente de forma cortante que el precio es fijo y que vaya a comprar a la otra agencia si no le alcanza.',
            'Comprometer un descuento del 15% sin autorización de la Dirección en el CRM.'
        ],
        correctOptionIndex: 0,
        openRubric: {
            scenarioDescription: 'Objeción de precio por comparación externa agresiva',
            mustIncludeConcepts: ['peritaje', 'services oficiales', 'garantía', 'alternativa'],
            mustAvoidConcepts: ['descuento no autorizado', 'rechazo agresivo'],
            acceptableRefusal: true,
            guidance: 'Desistir con criterio fundamentando el valor real de la unidad es una excelente decisión comercial.'
        },
        explanation: 'Una negativa fundamentada que defiende el margen de la agencia y pone en valor la calidad del vehículo es preferible a una venta a pérdida o a una confrontación con el comprador.'
    },
    {
        questionText: 'Un cliente quiere entregar su vehículo usado en parte de pago y exige un valor equivalente al precio de venta al público en Mercado Libre. ¿Cómo debe proceder el vendedor?',
        options: [
            'Aclarar con transparencia que el valor de toma contempla el reacondicionamiento técnico, el costo de transferencia y la garantía que la agencia asume; ofrecer peritaje en taller para fijar tasación oficial.',
            'Tomar la unidad al valor que exige el cliente para asegurar el cierre de la venta.',
            'Rechazar el auto del cliente calificándolo de chatarra.',
            'Prometerle que se venderá en consignación cobrando cero comisión.'
        ],
        correctOptionIndex: 0,
        openRubric: {
            scenarioDescription: 'Expectativa desfasada de precio en permuta',
            mustIncludeConcepts: ['peritaje en taller', 'costos de reacondicionamiento', 'tasación formal'],
            mustAvoidConcepts: ['toma sobrevaluada'],
            acceptableRefusal: true,
            guidance: 'Toda permuta queda sujeta a peritaje físico y margen operativo.'
        },
        explanation: 'La toma de permutas debe ser rentable para la agencia y sustentada en peritaje físico, nunca fijada por complacer una expectativa irreal del titular.'
    }
];

// Vehículos de reserva para pruebas o cuando el inventario real sea menor a 4 unidades
const FALLBACK_BENCHMARK_CARS = [
    {
        id: 'bench-amarok-v6',
        brand: 'Volkswagen',
        name: 'Amarok V6 Extreme 4x4 AT',
        year: 2022,
        km: 42000,
        price: 36500000,
        currency: 'ARS',
        fuel: 'Diesel',
        color: 'Gris Plata',
        vehicleType: 'Pick-up',
        hasManuals: true,
        hasDuplicateKeys: true,
        hasOfficialServices: true,
        coverImage: '/demo-car-photo/amarok'
    },
    {
        id: 'bench-toyota-hilux',
        brand: 'Toyota',
        name: 'Hilux SRX 4x4 AT',
        year: 2021,
        km: 55000,
        price: 38000000,
        currency: 'ARS',
        fuel: 'Diesel',
        color: 'Blanco Perlado',
        vehicleType: 'Pick-up',
        hasManuals: true,
        hasDuplicateKeys: true,
        hasOfficialServices: true,
        coverImage: '/demo-car-photo/hilux'
    },
    {
        id: 'bench-ford-ranger',
        brand: 'Ford',
        name: 'Ranger Limited 3.2 4x4 AT',
        year: 2020,
        km: 68000,
        price: 31000000,
        currency: 'ARS',
        fuel: 'Diesel',
        color: 'Azul Belice',
        vehicleType: 'Pick-up',
        hasManuals: true,
        hasDuplicateKeys: true,
        hasOfficialServices: false,
        coverImage: '/demo-car-photo/ranger'
    },
    {
        id: 'bench-jeep-renegade',
        brand: 'Jeep',
        name: 'Renegade Longitude 1.8 AT6',
        year: 2023,
        km: 18000,
        price: 24500000,
        currency: 'ARS',
        fuel: 'Nafta',
        color: 'Rojo Colorado',
        vehicleType: 'SUV',
        hasManuals: true,
        hasDuplicateKeys: true,
        hasOfficialServices: true,
        coverImage: '/demo-car-photo/renegade'
    }
];

export function parseNumericalResponse(inputStr, targetNum, tolerancePercent = 0.05) {
    if (typeof inputStr !== 'string' && typeof inputStr !== 'number') return false;
    let clean = String(inputStr).trim().toLowerCase();

    // Soporte para sufijo M (millones)
    if (/[\d,.]+\s*m(?:il(?:lones)?)?/i.test(clean)) {
        const numPart = clean.replace(/[^\d.,]/g, '').replace(',', '.');
        const parsedM = parseFloat(numPart) * 1000000;
        if (!isNaN(parsedM)) {
            const diff = Math.abs(parsedM - targetNum);
            return diff <= (targetNum * tolerancePercent);
        }
    }

    // Limpiar símbolos de moneda y separadores de miles
    clean = clean.replace(/[$uñsarsusd\s]/gi, '');
    // Si tiene puntos como separador de miles y no decimales
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(clean)) {
        clean = clean.replace(/,/g, '');
    }

    const val = parseFloat(clean);
    if (isNaN(val)) return false;

    const diff = Math.abs(val - targetNum);
    return diff <= (targetNum * tolerancePercent);
}

function formatCurrency(amount, currency = 'ARS') {
    return `${currency} $${Number(amount).toLocaleString('es-AR')}`;
}

export function buildQuestionsFromStock(cars = [], weakConcepts = []) {
    const pool = cars.length >= 3 ? cars : [...cars, ...FALLBACK_BENCHMARK_CARS];
    const questions = [];

    // Priorizar vehículos vinculados a debilidades previas si existen
    const weakCarIds = new Set(weakConcepts.map(w => w.entityId).filter(Boolean));
    const sortedPool = [...pool].sort((a, b) => {
        const aWeak = weakCarIds.has(a.id);
        const bWeak = weakCarIds.has(b.id);
        if (aWeak && !bWeak) return -1;
        if (!aWeak && bWeak) return 1;
        return 0;
    });

    const carA = sortedPool[0];
    const carB = sortedPool[1] || sortedPool[0];
    const carC = sortedPool[2] || sortedPool[0];
    const carD = sortedPool[3] || sortedPool[1];
    const carE = sortedPool[4] || sortedPool[2];

    // Q1: PRECIO (Vehículo A)
    const delta1 = Math.round(carA.price * 0.12);
    const delta2 = Math.round(carA.price * 0.20);
    questions.push({
        questionId: 'q-precio-1',
        category: 'precio',
        questionText: `¿Cuál es el precio de publicación comercial actual del ${carA.brand} ${carA.name} (${carA.year})?`,
        carId: carA.id,
        carSnapshot: { ...carA },
        questionFormat: 'multiple_choice',
        options: [
            formatCurrency(carA.price, carA.currency),
            formatCurrency(carA.price - delta1, carA.currency),
            formatCurrency(carA.price + delta2, carA.currency),
            formatCurrency(carA.price + delta1, carA.currency)
        ],
        correctOptionIndex: 0,
        correctNumericValue: carA.price,
        numericTolerancePercent: 0.03,
        explanation: `El valor de publicación comercial del ${carA.brand} ${carA.name} es exactamente ${formatCurrency(carA.price, carA.currency)}.`
    });

    // Q2: PRECIO (Comparación / Rango)
    const optionsQ2 = [
        `Entre ${formatCurrency(carB.price * 0.95, carB.currency)} y ${formatCurrency(carB.price * 1.05, carB.currency)}`,
        `Menos de ${formatCurrency(carB.price * 0.8, carB.currency)}`,
        `Más de ${formatCurrency(carB.price * 1.25, carB.currency)}`,
        `Cotización exclusiva a pedido sin precio publicado`
    ];
    questions.push({
        questionId: 'q-precio-2',
        category: 'precio',
        questionText: `¿En qué rango de precio se encuentra publicado el ${carB.brand} ${carB.name} (${carB.year})?`,
        carId: carB.id,
        carSnapshot: { ...carB },
        questionFormat: 'multiple_choice',
        options: optionsQ2,
        correctOptionIndex: 0,
        explanation: `La unidad se encuentra publicada a ${formatCurrency(carB.price, carB.currency)}.`
    });

    // Q3: KILOMETRAJE
    const kmDelta1 = Math.round(carB.km + 25000);
    const kmDelta2 = Math.max(0, Math.round(carB.km - 20000));
    questions.push({
        questionId: 'q-km-1',
        category: 'kilometraje',
        questionText: `¿Cuántos kilómetros reales tiene registrados el ${carB.brand} ${carB.name} (${carB.year})?`,
        carId: carB.id,
        carSnapshot: { ...carB },
        questionFormat: 'multiple_choice',
        options: [
            `${carB.km.toLocaleString('es-AR')} km`,
            `${kmDelta1.toLocaleString('es-AR')} km`,
            `${kmDelta2.toLocaleString('es-AR')} km`,
            `0 km (Nuevo a patentar)`
        ],
        correctOptionIndex: 0,
        correctNumericValue: carB.km,
        numericTolerancePercent: 0.05,
        explanation: `El ${carB.brand} ${carB.name} cuenta con ${carB.km.toLocaleString('es-AR')} km verificados.`
    });

    // Q4: VERSIÓN Y EQUIPAMIENTO 1 (Combustible y tipo)
    questions.push({
        questionId: 'q-ver-1',
        category: 'version_equipamiento',
        questionText: `¿Qué tipo de motorización y combustible utiliza el ${carC.brand} ${carC.name} (${carC.year})?`,
        carId: carC.id,
        carSnapshot: { ...carC },
        questionFormat: 'multiple_choice',
        options: [
            `${carC.fuel} (Vehículo tipo ${carC.vehicleType})`,
            `${carC.fuel === 'Diesel' ? 'Nafta' : 'Diesel'} Turbo`,
            `Híbrido Enchufable (PHEV)`,
            `GNC de 5ta generación instalado`
        ],
        correctOptionIndex: 0,
        explanation: `Esta unidad ${carC.brand} ${carC.name} utiliza motor ${carC.fuel} y pertenece al segmento ${carC.vehicleType}.`
    });

    // Q5: VERSIÓN Y EQUIPAMIENTO 2 (Historial y duplicados)
    const keyText = carD.hasDuplicateKeys ? 'Posee segunda llave física' : 'No posee segunda llave';
    const servText = carD.hasOfficialServices ? 'Services oficiales asentados' : 'Services particulares';
    questions.push({
        questionId: 'q-ver-2',
        category: 'version_equipamiento',
        questionText: `Respecto a los antecedentes y accesorios del ${carD.brand} ${carD.name}, ¿cuál es su condición verificada?`,
        carId: carD.id,
        carSnapshot: { ...carD },
        questionFormat: 'multiple_choice',
        options: [
            `${keyText} y ${servText}.`,
            `Sin manuales, sin segunda llave y con deuda documental.`,
            `Garantía de fábrica vencida sin historial verificable.`,
            `Documentación en trámite no apta para entrega inmediata.`
        ],
        correctOptionIndex: 0,
        explanation: `La ficha técnica oficial de la agencia confirma que la unidad cuenta con: ${keyText} y ${servText}.`
    });

    // Q6: RECONOCIMIENTO FOTOGRÁFICO
    const photoCar = carE.coverImage ? carE : carA;
    questions.push({
        questionId: 'q-rec-1',
        category: 'reconocimiento',
        questionText: `Observá la imagen comercial: ¿A qué vehículo de nuestro stock disponible corresponde?`,
        imageUrl: photoCar.coverImage,
        carId: photoCar.id,
        carSnapshot: { ...photoCar },
        questionFormat: 'multiple_choice',
        options: [
            `${photoCar.brand} ${photoCar.name} (${photoCar.year})`,
            `${carB.brand} ${carB.name} (${carB.year})`,
            `${carC.brand} ${carC.name} (${carC.year})`,
            `Toyota Corolla XEI 2.0 CVT (2021)`
        ],
        correctOptionIndex: 0,
        explanation: `La imagen exhibe la unidad ${photoCar.brand} ${photoCar.name} año ${photoCar.year} disponible en salón.`
    });

    // Q7: PROCEDIMIENTO COMERCIAL
    const proc = OFFICIAL_PROCEDURES[Math.floor(Math.random() * OFFICIAL_PROCEDURES.length)];
    questions.push({
        questionId: 'q-proc-1',
        category: 'procedimiento',
        questionText: proc.questionText,
        questionFormat: 'multiple_choice',
        options: proc.options,
        correctOptionIndex: proc.correctOptionIndex,
        explanation: proc.explanation
    });

    // Q8: ENTRENAMIENTO DE NEGOCIACIÓN
    const neg = NEGOTIATION_DILEMMAS[Math.floor(Math.random() * NEGOTIATION_DILEMMAS.length)];
    questions.push({
        questionId: 'q-neg-1',
        category: 'negociacion',
        questionText: neg.questionText,
        questionFormat: 'multiple_choice',
        options: neg.options,
        correctOptionIndex: neg.correctOptionIndex,
        openRubric: neg.openRubric,
        explanation: neg.explanation
    });

    return questions;
}

export async function getOrCreateDailyChallenge(dateStr = null) {
    const today = dateStr || getTodayArgentinaDate();

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        if (inMemoryChallengeStore.has(today)) {
            return inMemoryChallengeStore.get(today);
        }
        const questions = buildQuestionsFromStock(FALLBACK_BENCHMARK_CARS, []);
        const challenge = {
            _id: `daily-challenge-${today}`,
            challengeDate: today,
            type: 'daily',
            title: `Desafío Diario AutoSporting — ${today}`,
            description: 'Evaluación rápida de 8 preguntas sobre vehículos disponibles, precios, kilometrajes y negociación.',
            assignedRoles: ['ventas'],
            questions,
            active: true,
            createdAt: new Date()
        };
        inMemoryChallengeStore.set(today, challenge);
        return challenge;
    }

    let challenge = await AcademyDailyChallenge.findOne({ challengeDate: today, type: 'daily' });
    if (challenge) return challenge;

    const availableCars = await getAvailableCommercialStock();
    const questions = buildQuestionsFromStock(availableCars, []);

    challenge = new AcademyDailyChallenge({
        challengeDate: today,
        type: 'daily',
        title: `Desafío Diario AutoSporting — ${today}`,
        description: 'Evaluación de 8 preguntas sobre vehículos disponibles, precios, kilometrajes y negociación.',
        assignedRoles: ['ventas'],
        questions,
        active: true
    });

    await challenge.save();
    return challenge;
}

export async function getSellerDailyStatus(user, dateStr = null) {
    const today = dateStr || getTodayArgentinaDate();
    const userId = String(user?.id || user?._id || user?.userId);

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        const attempts = Array.from(inMemoryAttemptStore.values())
            .filter(a => a.userId === userId && a.challengeDate === today);
        const official = attempts.find(a => a.attemptType === 'official_daily');
        return {
            challengeDate: today,
            status: official ? 'completado' : 'pendiente',
            officialScore: official?.score ?? null,
            attemptId: official?._id ?? null,
            completedAt: official?.completedAt ?? null,
            totalAttempts: attempts.length
        };
    }

    const officialAttempt = await AcademyChallengeAttempt.findOne({
        userId,
        challengeDate: today,
        attemptType: 'official_daily',
        status: 'completado'
    }).lean();

    const totalCount = await AcademyChallengeAttempt.countDocuments({
        userId,
        challengeDate: today
    });

    return {
        challengeDate: today,
        status: officialAttempt ? 'completado' : 'pendiente',
        officialScore: officialAttempt?.score ?? null,
        attemptId: officialAttempt?._id ? String(officialAttempt._id) : null,
        completedAt: officialAttempt?.completedAt ?? null,
        totalAttempts: totalCount
    };
}

export async function submitChallengeAttempt(user, { challengeId, answers = [], durationSeconds = 0, attemptType = 'official_daily' }) {
    const userId = String(user?.id || user?._id || user?.userId);
    const userName = user?.name || user?.username || 'Vendedor';
    const userRole = user?.role || 'ventas';

    let challenge = null;
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        challenge = Array.from(inMemoryChallengeStore.values()).find(c => String(c._id) === String(challengeId));
        if (!challenge) challenge = inMemoryChallengeStore.get(getTodayArgentinaDate());
    } else {
        challenge = await AcademyDailyChallenge.findById(challengeId);
        if (!challenge) {
            challenge = await AcademyDailyChallenge.findOne({ challengeDate: getTodayArgentinaDate(), type: 'daily' });
        }
    }

    if (!challenge) {
        const err = new Error('Desafío no encontrado.');
        err.status = 404;
        throw err;
    }

    const today = challenge.challengeDate || getTodayArgentinaDate();

    // Comprobar intento oficial duplicado
    if (attemptType === 'official_daily') {
        const existingStatus = await getSellerDailyStatus(user, today);
        if (existingStatus.status === 'completado') {
            attemptType = 'practice_review'; // Se degrada suavemente a repaso de práctica
        }
    }

    let correctCount = 0;
    const evaluatedAnswers = [];
    const categoryTotals = {};
    const categoryHits = {};

    for (const q of challenge.questions) {
        const cat = q.category;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;

        const ans = answers.find(a => a.questionId === q.questionId) || {};
        let isCorrect = false;
        let scoreAwarded = 0;

        if (q.questionFormat === 'multiple_choice' || q.questionFormat === 'reconocimiento' || q.questionFormat === 'procedimiento' || q.questionFormat === 'negociacion') {
            if (typeof ans.selectedOptionIndex === 'number' && ans.selectedOptionIndex === q.correctOptionIndex) {
                isCorrect = true;
            }
        } else if (q.questionFormat === 'numeric_input') {
            isCorrect = parseNumericalResponse(ans.numericResponse, q.correctNumericValue, q.numericTolerancePercent || 0.05);
        }

        if (isCorrect) {
            correctCount++;
            categoryHits[cat] = (categoryHits[cat] || 0) + 1;
            scoreAwarded = 12.5; // 8 preguntas * 12.5 = 100 puntos
        }

        evaluatedAnswers.push({
            questionId: q.questionId,
            category: q.category,
            carId: q.carId,
            selectedOptionIndex: ans.selectedOptionIndex ?? -1,
            numericResponse: ans.numericResponse ?? null,
            textResponse: ans.textResponse ?? '',
            isCorrect,
            scoreAwarded,
            maxScore: 12.5,
            feedback: isCorrect ? '¡Correcto!' : q.explanation,
            rubricEvaluation: {
                score: isCorrect ? 100 : 0,
                adheredToPolicy: isCorrect,
                hasJustifiedRefusal: isCorrect,
                criticalFaultDetected: !isCorrect && cat === 'procedimiento'
            }
        });

        // Registrar en memoria de repaso espaciado
        const conceptKey = `${cat}-${q.carId || q.questionId}`;
        const entityLabel = q.carSnapshot?.name ? `${q.carSnapshot.brand} ${q.carSnapshot.name}` : `Procedimiento ${cat}`;
        await recordConceptOutcome(userId, {
            category: cat,
            conceptKey,
            entityId: q.carId,
            entityLabel,
            isCorrect,
            dateStr: today
        });
    }

    const totalQuestions = challenge.questions.length;
    const finalScore = Math.round((correctCount / (totalQuestions || 1)) * 100);

    // Calcular categorías débiles
    const weakCategories = [];
    const categoryScores = {};
    for (const [cat, total] of Object.entries(categoryTotals)) {
        const hits = categoryHits[cat] || 0;
        categoryScores[cat] = { score: Math.round((hits / total) * 100), total };
        if (hits < total) {
            weakCategories.push(cat);
        }
    }

    const recommendedReview = weakCategories.length > 0
        ? `Reforzar contenidos de: ${weakCategories.join(', ')}.`
        : '¡Excelente dominio del stock y procedimientos! Continuá con la racha diaria.';

    const idempotencyKey = `${userId}-${challenge._id}-${attemptType}-${Date.now()}`;

    let savedAttempt = null;

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        savedAttempt = {
            _id: `att-${Date.now()}`,
            challengeId: challenge._id,
            challengeDate: today,
            type: challenge.type,
            userId,
            userName,
            userRole,
            attemptType,
            status: 'completado',
            startedAt: new Date(Date.now() - (durationSeconds * 1000)),
            completedAt: new Date(),
            durationSeconds,
            score: finalScore,
            correctCount,
            totalQuestions,
            categoryScores,
            weakCategories,
            recommendedReview,
            answers: evaluatedAnswers,
            idempotencyKey
        };
        inMemoryAttemptStore.set(savedAttempt._id, savedAttempt);
    } else {
        const attempt = new AcademyChallengeAttempt({
            challengeId: challenge._id,
            challengeDate: today,
            type: challenge.type,
            userId,
            userName,
            userRole,
            attemptType,
            status: 'completado',
            startedAt: new Date(Date.now() - (durationSeconds * 1000)),
            completedAt: new Date(),
            durationSeconds,
            score: finalScore,
            correctCount,
            totalQuestions,
            categoryScores,
            weakCategories,
            recommendedReview,
            answers: evaluatedAnswers,
            idempotencyKey
        });

        await attempt.save();
        savedAttempt = attempt;
    }

    // Si es intento oficial del día, disparar notificación automática al propietario
    if (attemptType === 'official_daily') {
        try {
            await createChallengeCompletedNotification({
                attemptId: savedAttempt._id,
                challengeId: challenge._id,
                seller: user,
                score: finalScore,
                correctCount,
                totalQuestions,
                weakCategories,
                recommendation: recommendedReview
            });
        } catch (notifErr) {
            console.warn('[AcademyNotification Error]', notifErr.message);
        }
    }

    return {
        attemptId: String(savedAttempt._id),
        challengeDate: today,
        score: finalScore,
        correctCount,
        totalQuestions,
        attemptType,
        weakCategories,
        recommendedReview,
        categoryScores,
        answers: evaluatedAnswers
    };
}

export function getInMemoryAttempts() {
    return Array.from(inMemoryAttemptStore.values());
}

export function getInMemoryChallenges() {
    return Array.from(inMemoryChallengeStore.values());
}

export function resetDailyChallengesForTesting() {
    inMemoryChallengeStore.clear();
    inMemoryAttemptStore.clear();
}

// src/services/academyNewIntakeChallengeService.js
/**
 * Servicio de evaluación formativa de vehículos recién ingresados al stock disponible.
 * Genera mini exámenes de 5 preguntas sobre la unidad específica.
 * Si faltan datos, advierte exactamente qué campos faltan antes de permitir su generación.
 */

import mongoose from 'mongoose';
import Car from '../models/Car.js';
import AcademyDailyChallenge from '../models/AcademyDailyChallenge.js';
import { getCommercialCarById, validateCarCompleteness, sanitizeCommercialCar } from './academyStockAdapter.js';
import { getTodayArgentinaDate } from './academyMemoryService.js';

export async function validateIntakeCarForEvaluation(carIdOrCar) {
    if (!carIdOrCar) return { allowed: false, isComplete: false, message: 'ID de vehículo no proporcionado', missingFields: [] };

    let car = null;
    if (typeof carIdOrCar === 'object' && carIdOrCar !== null) {
        car = carIdOrCar;
    } else {
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            car = await Car.findById(carIdOrCar).lean();
        }
        if (!car) {
            car = await getCommercialCarById(carIdOrCar);
        }
    }

    if (!car) {
        return { allowed: false, isComplete: false, message: 'Vehículo no encontrado en el stock', missingFields: ['Vehículo inexistente'] };
    }

    const completeness = validateCarCompleteness(car);
    if (!completeness.isComplete) {
        return {
            allowed: false,
            isComplete: false,
            message: 'La unidad no cuenta con información suficiente para generar el examen.',
            missingFields: completeness.missingFields
        };
    }

    return {
        allowed: true,
        isComplete: true,
        missingFields: [],
        car,
        message: 'La unidad cuenta con todos los datos comerciales completos.'
    };
}

export async function generateNewIntakeMiniChallenge(carIdOrCar, { title = '', assignedUserIds = [] } = {}) {
    const validation = await validateIntakeCarForEvaluation(carIdOrCar);
    if (!validation.allowed) {
        const err = new Error(validation.message);
        err.status = 400;
        err.missingFields = validation.missingFields;
        throw err;
    }

    const car = sanitizeCommercialCar(validation.car);
    const carId = String(car.id || car._id);
    const today = getTodayArgentinaDate();

    // 5 preguntas específicas sobre la unidad ingresada
    const questions = [
        // Q1: Versión y nombre
        {
            questionId: `intake-${carId}-ver`,
            category: 'version_equipamiento',
            questionText: `¿Cuál es el modelo y versión exactos del vehículo recién ingresado (${car.brand})?`,
            carId: carId,
            carSnapshot: { ...car },
            questionFormat: 'multiple_choice',
            options: [
                `${car.brand} ${car.name} (${car.year})`,
                `${car.brand} ${car.name} Base MT`,
                `${car.brand} Trendline 1.6`,
                `Versión no especificada`
            ],
            correctOptionIndex: 0,
            explanation: `La unidad ingresada es un ${car.brand} ${car.name} año ${car.year}.`
        },
        // Q2: Kilometraje
        {
            questionId: `intake-${carId}-km`,
            category: 'kilometraje',
            questionText: `¿Con qué kilometraje ingresó a salón el ${car.brand} ${car.name}?`,
            carId: carId,
            carSnapshot: { ...car },
            questionFormat: 'multiple_choice',
            options: [
                `${car.km.toLocaleString('es-AR')} km`,
                `${(car.km + 30000).toLocaleString('es-AR')} km`,
                `${Math.max(0, car.km - 20000).toLocaleString('es-AR')} km`,
                `0 km`
            ],
            correctOptionIndex: 0,
            correctNumericValue: car.km,
            explanation: `El kilometraje auditado al ingreso es de ${car.km.toLocaleString('es-AR')} km.`
        },
        // Q3: Precio publicado
        {
            questionId: `intake-${carId}-price`,
            category: 'precio',
            questionText: `¿Cuál es el precio comercial de publicación fijado para el ${car.brand} ${car.name}?`,
            carId: carId,
            carSnapshot: { ...car },
            questionFormat: 'multiple_choice',
            options: [
                `${car.currency} $${car.price.toLocaleString('es-AR')}`,
                `${car.currency} $${Math.round(car.price * 0.85).toLocaleString('es-AR')}`,
                `${car.currency} $${Math.round(car.price * 1.15).toLocaleString('es-AR')}`,
                `A consultar`
            ],
            correctOptionIndex: 0,
            correctNumericValue: car.price,
            explanation: `El precio de publicación de salida es de ${car.currency} $${car.price.toLocaleString('es-AR')}.`
        },
        // Q4: Motorización y combustible
        {
            questionId: `intake-${carId}-motor`,
            category: 'version_equipamiento',
            questionText: `¿Qué combustible y configuración motriz equipa esta unidad ingresada?`,
            carId: carId,
            carSnapshot: { ...car },
            questionFormat: 'multiple_choice',
            options: [
                `Motor ${car.fuel} en carrocería ${car.vehicleType || 'Auto'}`,
                `Motor ${car.fuel === 'Diesel' ? 'Nafta' : 'Diesel'} aspirado`,
                `Motorización eléctrica`,
                `Configuración híbrida`
            ],
            correctOptionIndex: 0,
            explanation: `Ficha técnica: combustible ${car.fuel}, segmento ${car.vehicleType || 'Auto'}.`
        },
        // Q5: Duplicados y services
        {
            questionId: `intake-${carId}-historial`,
            category: 'reconocimiento',
            questionText: `¿Cuenta la unidad con segunda llave física comprobada y manuales originales?`,
            carId: carId,
            carSnapshot: { ...car },
            questionFormat: 'multiple_choice',
            options: [
                `Segunda llave: ${car.hasDuplicateKeys ? 'Sí' : 'No'} · Manuales: ${car.hasManuals ? 'Sí' : 'No'}`,
                `Sin llaves de repuesto y sin documentación`,
                `Pendiente de verificación en taller`,
                `No aplica a usados`
            ],
            correctOptionIndex: 0,
            explanation: `Constatación oficial en peritaje: duplicado de llave ${car.hasDuplicateKeys ? 'Sí' : 'No'}, manuales ${car.hasManuals ? 'Sí' : 'No'}.`
        }
    ];

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return {
            _id: `intake-challenge-${carId}`,
            challengeDate: today,
            type: 'new_intake',
            targetCarId: carId,
            targetCarTitle: `${car.brand} ${car.name} (${car.year})`,
            title: title || `Evaluación de Ingreso: ${car.brand} ${car.name}`,
            description: `Mini examen de 5 preguntas para memorizar especificaciones del recién ingresado.`,
            assignedUserIds,
            questions,
            active: true,
            createdAt: new Date()
        };
    }

    const challenge = new AcademyDailyChallenge({
        challengeDate: today,
        type: 'new_intake',
        targetCarId: carId,
        targetCarTitle: `${car.brand} ${car.name} (${car.year})`,
        title: title || `Evaluación de Ingreso: ${car.brand} ${car.name}`,
        description: `Mini examen de 5 preguntas para memorizar especificaciones del vehículo recién ingresado.`,
        assignedUserIds,
        questions,
        active: true
    });

    await challenge.save();
    return challenge;
}

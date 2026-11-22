// src/services/academyStockAdapter.js
/**
 * Adaptador de lectura de stock comercial para AutoSporting Academy.
 * Utiliza exclusivamente información comercial autorizada.
 * REGLA ESTRICTA DE SEGURIDAD: Jamás expone costos de compra, ganancias, márgenes,
 * deudas, participaciones de socios ni valores internos de negociación.
 */

import mongoose from 'mongoose';
import Car from '../models/Car.js';

export function sanitizeCommercialCar(car) {
    if (!car) return null;
    const raw = car.toObject ? car.toObject() : car;

    // Normalizar imágenes comerciales
    const images = Array.isArray(raw.images) && raw.images.length > 0
        ? raw.images.filter(img => typeof img === 'string' && img.trim().length > 0)
        : (raw.coverImage ? [raw.coverImage] : []);

    const coverImage = images[0] || raw.coverImage || null;

    // Normalización de moneda
    let currency = (raw.currency || 'ARS').toUpperCase().trim();
    if (currency === '$') currency = 'ARS';
    if (currency === 'U$S' || currency === 'US$' || currency === 'DOL' || currency === 'DOLARES') currency = 'USD';

    return {
        id: String(raw._id || raw.id),
        brand: String(raw.brand || '').trim(),
        name: String(raw.name || '').trim(),
        year: Number(raw.year) || 0,
        km: Number(raw.km) || 0,
        price: Number(raw.price) || 0,
        currency,
        fuel: String(raw.fuel || 'Nafta').trim(),
        color: String(raw.color || 'No especificado').trim(),
        vehicleType: String(raw.vehicleType || 'Auto').trim(),
        plateOrVin: raw.plateOrVin ? String(raw.plateOrVin).trim() : null,
        hasManuals: raw.hasManuals === 'Si' || raw.hasManuals === true,
        hasDuplicateKeys: raw.hasDuplicateKeys === 'Si' || raw.hasDuplicateKeys === true,
        hasOfficialServices: raw.hasOfficialServices === 'Si' || raw.hasOfficialServices === true,
        condition: String(raw.condition || 'Usado').trim(),
        description: typeof raw.description === 'string' ? raw.description.slice(0, 300) : '',
        coverImage,
        images: images.slice(0, 5),
        status: String(raw.status || 'Disponible')
    };
}

export function validateCarCompleteness(car) {
    if (!car) return { isComplete: false, missingFields: ['Vehículo no encontrado'] };
    const raw = car.toObject ? car.toObject() : car;
    const missing = [];

    if (!raw.brand || String(raw.brand).trim().length === 0) missing.push('Marca');
    if (!raw.name || String(raw.name).trim().length === 0) missing.push('Modelo y Versión');
    if (!raw.year || Number(raw.year) < 1980) missing.push('Año');
    if (raw.km === undefined || raw.km === null || Number(raw.km) < 0) missing.push('Kilometraje');
    if (!raw.price || Number(raw.price) <= 0) missing.push('Precio publicado');
    if (!raw.currency) missing.push('Moneda (ARS/USD)');
    if (!raw.fuel) missing.push('Combustible');

    const hasImages = (Array.isArray(raw.images) && raw.images.length > 0) || Boolean(raw.coverImage);
    if (!hasImages) missing.push('Fotografía comercial');

    return {
        isComplete: missing.length === 0,
        missingFields: missing
    };
}

export async function getAvailableCommercialStock() {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return [];
    }

    // Consultar exclusivamente unidades disponibles y visibles
    const cars = await Car.find({
        status: 'Disponible',
        price: { $gt: 0 }
    }).select(
        '_id brand name year km price currency fuel color vehicleType hasManuals hasDuplicateKeys hasOfficialServices condition description coverImage images status'
    ).lean();

    return cars
        .map(sanitizeCommercialCar)
        .filter(c => c && c.brand && c.name && c.price > 0);
}

export async function getCommercialCarById(carId) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1 || !carId) {
        return null;
    }

    const car = await Car.findById(carId).select(
        '_id brand name year km price currency fuel color vehicleType hasManuals hasDuplicateKeys hasOfficialServices condition description coverImage images status'
    ).lean();

    return sanitizeCommercialCar(car);
}

import {parseArgentineMoney} from './saleCommercial.js';
import { formSaleDate, saleCalendarKey } from './saleCalendarDate.js';

const DEFAULT_POSITION = '50% 75%';
const currencyCode = value => {
    const code = String(value || '').trim().toUpperCase();
    return ['USD','U$S','US$'].includes(code) ? 'USD' : code === '$' ? 'ARS' : code;
};
const blank = value => value === undefined || value === null || String(value).trim() === '';

export function vehicleEditorDateValue(value) {
    return blank(value) ? '' : saleCalendarKey({ createdAt: value });
}

// An untouched date input must not replace an existing timestamp with midnight
// UTC (the previous calendar day in Argentina).
export function vehicleDateEditPatch(original, edited) {
    const patch = {};
    for (const key of ['createdAt', 'soldAt']) {
        const value = edited[key];
        if (blank(value) || value === vehicleEditorDateValue(original[key])) continue;
        if (formSaleDate(value) !== value) throw new Error('Revisá la fecha de ingreso o venta.');
        patch[key] = `${value}T03:00:00.000Z`;
    }
    return patch;
}

// Form display may show an acquisition resolved from a linked trade-in. A metadata save
// must not write that derived value back into a different/missing raw purchase price.
export function vehicleAcquisitionEditPatch(initial, edited) {
    const patch = {};
    const initialAmount = parseArgentineMoney(initial.purchasePrice);
    const editedAmount = parseArgentineMoney(edited.purchasePrice);
    const sameAmount = (blank(initial.purchasePrice) && blank(edited.purchasePrice)) || (Number.isFinite(initialAmount) && Number.isFinite(editedAmount) && Math.abs(initialAmount - editedAmount) <= 0.001);
    if (!sameAmount) patch.purchasePrice = Number.isFinite(editedAmount) ? editedAmount : edited.purchasePrice;
    if (currencyCode(initial.purchaseCurrency) !== currencyCode(edited.purchaseCurrency)) patch.purchaseCurrency = currencyCode(edited.purchaseCurrency);
    return patch;
}

export function vehicleEditorExistingFiles(car) {
    const images = Array.isArray(car?.images) ? car.images.filter(url => typeof url === 'string' && url.trim()) : [];
    const urls = images.length ? images : (typeof car?.coverImage === 'string' && car.coverImage.trim() ? [car.coverImage] : []);
    return urls.map(url => ({preview:url, isExisting:true, url}));
}

function imageEntries(files, positions, coverPosition) {
    return files.map((file,index) => ({file, position:positions?.[index] || (index === 0 ? coverPosition : null) || DEFAULT_POSITION}));
}
function result(entries) {
    return {files:entries.map(entry=>entry.file), imagePositions:entries.map(entry=>entry.position), imagePosition:entries[0]?.position || DEFAULT_POSITION};
}
export function reorderVehicleEditorPhotos(files, positions, coverPosition, from, to) {
    const entries = imageEntries(files, positions, coverPosition);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= entries.length || to >= entries.length) return result(entries);
    const [entry] = entries.splice(from,1);
    entries.splice(to,0,entry);
    return result(entries);
}
export function removeVehicleEditorPhoto(files, positions, coverPosition, index) {
    return result(imageEntries(files, positions, coverPosition).filter((_,current)=>current !== index));
}

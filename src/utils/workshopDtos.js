import { ROLES, hasPermission, PERMISSIONS } from './adminPermissions.js';

const serializePopulated = (value) => {
    if (!value) return value;
    if (typeof value === 'object') {
        if (value.constructor && value.constructor.name === 'ObjectId') {
            return value.toString();
        }
        const copy = value.toObject ? value.toObject() : { ...value };
        if (copy._id) {
            copy.id = copy._id.toString();
            delete copy._id;
        }
        delete copy.__v;
        return copy;
    }
    return value.toString();
};

/**
 * Maps WorkshopProvider to a safe DTO, omitting sensitive fields for sales team
 */
export const toWorkshopProviderDto = (provider, user) => {
    if (!provider) return null;

    const raw = provider.toObject ? provider.toObject() : { ...provider };

    const dto = {
        id: raw._id?.toString() || raw.id?.toString(),
        name: raw.name,
        businessName: raw.businessName,
        cuit: raw.cuit,
        specialties: raw.specialties || [],
        contacts: (raw.contacts || []).map(c => ({
            id: c._id?.toString() || c.id?.toString(),
            name: c.name,
            phone: c.phone,
            email: c.email,
            role: c.role
        })),
        acceptedCurrencies: raw.acceptedCurrencies || [],
        defaultWarranty: raw.defaultWarranty,
        active: raw.active,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };

    const roleAllowed = [ROLES.OWNER, ROLES.ADMIN].includes(user?.role);
    const hasCostsPermission = roleAllowed ||
                               hasPermission(user, PERMISSIONS.TALLER_COSTS_READ) ||
                               hasPermission(user, PERMISSIONS.TALLER_ADMIN);

    if (hasCostsPermission) {
        dto.paymentConditions = raw.paymentConditions;
        dto.notes = raw.notes;
    }

    return dto;
};

/**
 * Maps CustomerVehicle to a safe DTO
 */
export const toCustomerVehicleDto = (vehicle) => {
    if (!vehicle) return null;

    const raw = vehicle.toObject ? vehicle.toObject() : { ...vehicle };

    return {
        id: raw._id?.toString() || raw.id?.toString(),
        clientId: serializePopulated(raw.clientId),
        brand: raw.brand,
        model: raw.model,
        version: raw.version,
        year: raw.year,
        plate: raw.plate,
        vin: raw.vin,
        color: raw.color,
        km: raw.km,
        active: raw.active,
        ownersHistory: (raw.ownersHistory || []).map(o => ({
            id: o._id?.toString() || o.id?.toString(),
            clientId: serializePopulated(o.clientId),
            date: o.date
        })),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
};

/**
 * Maps WorkshopOrder to a safe DTO
 */
export const toWorkshopOrderDto = (order, user) => {
    if (!order) return null;

    const raw = order.toObject ? order.toObject() : { ...order };

    return {
        id: raw._id?.toString() || raw.id?.toString(),
        orderNumber: raw.orderNumber,
        clientId: serializePopulated(raw.clientId),
        customerVehicleId: serializePopulated(raw.customerVehicleId),
        providerId: raw.providerId
            ? (typeof raw.providerId === 'object' && raw.providerId.constructor.name !== 'ObjectId'
                ? toWorkshopProviderDto(raw.providerId, user)
                : raw.providerId.toString())
            : null,
        assignedTo: serializePopulated(raw.assignedTo),
        sellerId: serializePopulated(raw.sellerId),
        status: raw.status,
        vehicleSnapshot: raw.vehicleSnapshot ? {
            plate: raw.vehicleSnapshot.plate,
            brand: raw.vehicleSnapshot.brand,
            model: raw.vehicleSnapshot.model,
            km: raw.vehicleSnapshot.km
        } : undefined,
        km: raw.km,
        fuelLevel: raw.fuelLevel,
        checklist: raw.checklist || [],
        damage: raw.damage,
        accessories: raw.accessories,
        photos: (raw.photos || []).map(p => ({
            id: p._id?.toString() || p.id?.toString(),
            url: p.url,
            publicId: p.publicId,
            name: p.name,
            contentType: p.contentType,
            size: p.size
        })),
        requestedWork: raw.requestedWork,
        admissionDate: raw.admissionDate,
        deliveryDate: raw.deliveryDate,
        stateHistory: (raw.stateHistory || []).map(s => ({
            id: s._id?.toString() || s.id?.toString(),
            status: s.status,
            changedBy: serializePopulated(s.changedBy),
            actorLabel: s.actorLabel,
            date: s.date,
            note: s.note
        })),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
};

/**
 * Maps WorkshopProviderQuote to a safe DTO, only visible if user has costs permission
 */
export const toWorkshopProviderQuoteDto = (quote, user) => {
    if (!quote) return null;
    
    const hasCostsPermission = [ROLES.OWNER, ROLES.ADMIN].includes(user?.role) ||
                               hasPermission(user, PERMISSIONS.TALLER_COSTS_READ) ||
                               hasPermission(user, PERMISSIONS.TALLER_ADMIN);
                               
    if (!hasCostsPermission) return null;
    
    const raw = quote.toObject ? quote.toObject() : { ...quote };
    
    return {
        id: raw._id?.toString() || raw.id?.toString(),
        workshopOrderId: raw.workshopOrderId?.toString(),
        providerId: serializePopulated(raw.providerId),
        version: raw.version,
        currency: raw.currency,
        items: (raw.items || []).map(i => ({
            type: i.type,
            description: i.description,
            quantity: i.quantity,
            providerCost: Number(i.providerCost.toFixed(2))
        })),
        totalCost: Number(raw.totalCost.toFixed(2)),
        status: raw.status,
        notes: raw.notes,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
};

/**
 * Maps WorkshopEstimate to a safe DTO, hiding cost details from sales (non-TALLER_COSTS_READ users)
 */
export const toWorkshopEstimateDto = (estimate, user) => {
    if (!estimate) return null;
    
    const raw = estimate.toObject ? estimate.toObject() : { ...estimate };
    
    const hasCostsPermission = [ROLES.OWNER, ROLES.ADMIN].includes(user?.role) ||
                               hasPermission(user, PERMISSIONS.TALLER_COSTS_READ) ||
                               hasPermission(user, PERMISSIONS.TALLER_ADMIN);
                               
    const dto = {
        id: raw._id?.toString() || raw.id?.toString(),
        workshopOrderId: raw.workshopOrderId?.toString(),
        providerQuoteId: raw.providerQuoteId?.toString() || null,
        version: raw.version,
        currency: raw.currency,
        items: (raw.items || []).map(i => {
            const itemDto = {
                type: i.type,
                description: i.description,
                quantity: i.quantity,
                clientPrice: Number(i.clientPrice.toFixed(2))
            };
            if (hasCostsPermission) {
                itemDto.providerCost = Number((i.providerCost || 0).toFixed(2));
            }
            return itemDto;
        }),
        totalPrice: Number(raw.totalPrice.toFixed(2)),
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
    
    if (hasCostsPermission) {
        dto.totalCost = Number(raw.totalCost.toFixed(2));
        dto.profit = Number(raw.profit.toFixed(2));
        dto.margin = Number(raw.margin.toFixed(2));
        dto.notes = raw.notes;
    }
    
    return dto;
};

const text=value=>typeof value === 'string' ? value.trim() : '';
export const isClientRequestActive=pedido=>Boolean(pedido && ['Pendiente','Buscando'].includes(pedido.status));
export function clientRequestYearRange(client) {
    const from=client?.yearFrom,to=client?.yearTo;
    if(from != null && to != null)return from+' - '+to;
    if(from != null)return 'Desde '+from;
    if(to != null)return 'Hasta '+to;
    return '';
}
export function clientMatchingRequestLabel(client) {
    return [text(client?.brand),text(client?.model),clientRequestYearRange(client)].filter(Boolean).join(' · ') || 'vehículo buscado';
}
export function buildClientRequestSnapshot(client) {
    const errors={};
    for(const name of ['brand','model'])if(!text(client?.[name]))errors[name]='Completá '+(name === 'brand' ? 'la marca' : 'el modelo')+' buscado antes de activar el pedido.';
    for(const key of ['yearFrom','yearTo'])if(client?.[key] != null && (!Number.isInteger(client[key]) || client[key]<1000 || client[key]>9999))errors[key]='Revisá el año buscado.';
    if(client?.yearFrom != null && client?.yearTo != null && client.yearFrom>client.yearTo)errors.yearTo='El año hasta debe ser mayor o igual al año desde.';
    if(client?.maxBudget != null && (!Number.isFinite(client.maxBudget) || client.maxBudget<0))errors.maxBudget='Revisá el presupuesto máximo.';
    if(!['ARS','USD'].includes(client?.currency))errors.currency='Elegí la moneda del presupuesto.';
    if(Object.keys(errors).length)throw Object.assign(new Error('Revisá los criterios de búsqueda del cliente antes de activar el pedido.'),{statusCode:400,errors});
    return {
        clientId:client._id,clientName:text(client.fullName) || [text(client.firstName),text(client.lastName)].filter(Boolean).join(' '),
        clientPhone:text(client.phone),requestedBrand:text(client.brand),requestedModel:text(client.model),yearRange:clientRequestYearRange(client),
        budget:client.maxBudget ?? null,currency:client.currency,assignedTo:client.assignedTo?._id || client.assignedTo || null
    };
}

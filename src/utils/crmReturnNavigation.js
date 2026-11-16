const destinations = {
    '/admin/gestoria': 'Volver a Gestoría',
    '/admin/ventas': 'Volver a Ventas',
    '/admin/stock': 'Volver al Stock',
    '/admin/expedientes': 'Volver a Expedientes'
};

export const crmReturnPath = value => Object.prototype.hasOwnProperty.call(destinations, value) ? value : null;
export const crmReturnLabel = path => destinations[path] || 'Volver';
export const withCrmReturn = (path, returnTo) => crmReturnPath(returnTo)
    ? path + (path.includes('?') ? '&' : '?') + 'returnTo=' + encodeURIComponent(returnTo) : path;

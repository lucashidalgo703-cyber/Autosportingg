/**
 * Utilidades para normalizar y formatear datos de vehículos.
 */

export const normalizeBrand = (brand) => {
    if (!brand) return '';
    const b = brand.trim().toLowerCase();
    
    // Diccionario de correcciones comunes de marcas
    const brandMap = {
        'volskwagen': 'Volkswagen',
        'volkswagen': 'Volkswagen',
        'vw': 'Volkswagen',
        'ford': 'Ford',
        'chevrolet': 'Chevrolet',
        'toyota': 'Toyota',
        'peugeot': 'Peugeot',
        'renault': 'Renault',
        'fiat': 'Fiat',
        'honda': 'Honda',
        'nissan': 'Nissan',
        'citroen': 'Citroën',
        'citroën': 'Citroën',
        'jeep': 'Jeep',
        'bmw': 'BMW',
        'audi': 'Audi',
        'mercedes-benz': 'Mercedes-Benz',
        'mercedes': 'Mercedes-Benz',
        'hyundai': 'Hyundai',
        'kia': 'Kia',
        'ram': 'RAM'
    };

    return brandMap[b] || brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
};

export const normalizeModel = (model) => {
    if (!model) return '';
    let m = model.trim();
    
    // Reemplazos literales comunes (case insensitive initial match)
    const lowerM = m.toLowerCase();
    
    if (lowerM === 'bronco') return 'Bronco';
    if (lowerM.includes('sw4')) return m.replace(/sw4/i, 'SW4');
    if (lowerM.includes('duster previlege')) return m.replace(/previlege/i, 'Privilege');
    if (lowerM.includes('amarok v6')) return m.replace(/v6/i, 'V6');

    return m;
};

export const normalizeFuel = (fuel) => {
    if (!fuel) return '';
    const f = fuel.trim().toLowerCase();
    if (f.includes('nafta')) return 'Nafta';
    if (f.includes('diesel') || f.includes('diésel') || f.includes('gasoil')) return 'Diésel';
    if (f.includes('gnc')) return 'GNC';
    if (f.includes('hibrido') || f.includes('híbrido')) return 'Híbrido';
    if (f.includes('electrico') || f.includes('eléctrico')) return 'Eléctrico';
    return fuel.charAt(0).toUpperCase() + fuel.slice(1).toLowerCase();
};

export const formatKm = (km) => {
    if (km === undefined || km === null || km === '') return '';
    if (Number(km) === 0) return '0 km';
    return `${Number(km).toLocaleString('es-AR')} km`;
};

export const formatPrice = (price, currency = 'USD') => {
    if (price === undefined || price === null || price === '' || Number(price) === 0) return 'Consultar';
    const c = currency.toUpperCase() === 'U$S' || currency.toUpperCase() === 'USD' ? 'U$S' : '$';
    return `${c} ${Number(price).toLocaleString('es-AR')}`;
};

export const normalizeCarData = (car) => {
    if (!car) return null;
    return {
        ...car,
        brand: normalizeBrand(car.brand),
        name: normalizeModel(car.name),
        fuel: normalizeFuel(car.fuel)
    };
};

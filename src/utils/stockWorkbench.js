import { normalizeStockText, stockDays, stockHasPhoto, stockIsPublished, stockCurrency } from './stockFilters.js';
export const STOCK_DEMAND_PERIODS = [30, 60, 90, 180];
export const demandKey = (brand, model) => [normalizeStockText(brand), normalizeStockText(model)].join('|');
export function stockPreparation(car) {
    if (!['Disponible', 'Reservado'].includes(car.status)) return [];
    const pending = [];
    if (!stockHasPhoto(car)) pending.push('Falta foto');
    if (!(car.price > 0)) pending.push('Falta precio');
    if (!stockIsPublished(car.publishedOnML)) pending.push('Publicación pendiente');
    if (!car.inspection?.updatedAt) pending.push('Falta peritaje');
    return pending;
}
export function matchDemandToCar(demand, car) {
    if (demandKey(demand.brand, demand.model) !== demandKey(car.brand, car.name)) return false;
    if (demand.yearFrom != null && car.year < demand.yearFrom || demand.yearTo != null && car.year > demand.yearTo) return false;
    if (demand.budget > 0 && (!stockCurrency(demand.currency) || stockCurrency(demand.currency) !== stockCurrency(car.currency) || !Number.isFinite(Number(car.price)) || !(car.price > 0) || car.price > demand.budget)) return false;
    return true;
}
export function buildDemandGroups(demands, cars, now = new Date()) {
    // One person can appear in several channels and request several models.
    const parent = demands.map((_, index) => index), identities = new Map();
    const root = index => parent[index] === index ? index : (parent[index] = root(parent[index]));
    demands.forEach((demand, index) => { for (const identity of demand.personKeys || [demand.personKey].filter(Boolean)) { if (identities.has(identity)) parent[root(index)] = root(identities.get(identity)); else identities.set(identity, index); } });
    demands = demands.map((demand, index) => ({ ...demand, personKey: (demand.personKeys?.length || demand.personKey) ? 'person:' + root(index) : null }));
    const groups = new Map();
    for (const demand of demands) {
        if (!normalizeStockText(demand.brand) || !normalizeStockText(demand.model)) continue;
        const key = demandKey(demand.brand, demand.model);
        if (!groups.has(key)) groups.set(key, { key, brand: demand.brand.trim(), model: demand.model.trim(), requests: [], people: new Set(), sources: {} });
        const group = groups.get(key);
        group.requests.push(demand);
        if (demand.personKey) group.people.add(demand.personKey);
        if (!group.sources[demand.source]) group.sources[demand.source] = new Set();
        if (demand.personKey) group.sources[demand.source].add(demand.personKey);
    }
    const activeCars = cars.filter(car => car.status === 'Disponible');
    const result = [...groups.values()].map(group => {
        const matches = activeCars.filter(car => group.requests.some(demand => matchDemandToCar(demand, car)));
        const validated = group.requests.filter(demand => demand.source === 'pedido' && !demand.importedUnvalidated && demand.personKey && !activeCars.some(car => matchDemandToCar(demand, car)));
        return { key: group.key, brand: group.brand, model: group.model, demandCount: group.requests.length, peopleCount: group.people.size, unidentifiedCount: group.requests.filter(item => !item.personKey).length, sources: Object.fromEntries(Object.entries(group.sources).map(([source, people]) => [source, people.size])), stockCount: matches.length, availableCount: matches.length, validatedGapPeople: new Set(validated.map(item => item.personKey)).size, unvalidatedPeople: new Set(group.requests.filter(item => item.importedUnvalidated && item.personKey).map(item => item.personKey)).size, stock: matches.map(car => ({ _id: car._id, brand: car.brand, name: car.name, year: car.year, status: car.status, currency: car.currency, price: car.price })), requests: group.requests };
    }).sort((a, b) => (a.stockCount > 0) - (b.stockCount > 0) || b.peopleCount - a.peopleCount || b.demandCount - a.demandCount || a.key.localeCompare(b.key));
    const withoutDemand = activeCars.filter(car => !demands.some(demand => matchDemandToCar(demand, car))).map(car => ({ _id: car._id, brand: car.brand, name: car.name, year: car.year, status: car.status, days: stockDays(car, now) }));
    return { groups: result, withoutDemand, people: new Set(demands.map(demand => demand.personKey).filter(Boolean)).size };
}

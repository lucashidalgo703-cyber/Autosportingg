const sources = [
    {
        name: 'Mercado Libre Autos',
        hostname: 'auto.mercadolibre.com.ar',
        listingId(path) {
            const match = path.match(/^\/MLA-?(\d{6,})(?:[-_][^/]*)?\/?$/i);
            return match ? 'MLA' + match[1] : null;
        }
    },
    {
        name: 'Autocosmos',
        hostname: 'www.autocosmos.com.ar',
        listingId(path) {
            return path.match(/^\/auto\/usado\/(?:[a-z0-9-]+\/){2,3}([a-f0-9]{32})\/?$/i)?.[1].toLowerCase();
        }
    },
    {
        name: 'SmartCar',
        hostname: 'www.smartcar.com.ar',
        listingId(path) {
            return path.match(/^\/autos\/([a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-[a-f0-9]{4})\/?$/i)?.[1].toLowerCase();
        }
    },
    {
        name: 'Kavak Argentina',
        hostname: 'www.kavak.com',
        listingId(path, params) {
            const ids = params.getAll('id');
            if (!/^\/ar\/venta\/[a-z0-9_-]+\/?$/i.test(path) || ids.length !== 1) return null;
            return /^\d{5,12}$/.test(ids[0]) ? ids[0] : null;
        }
    }
];

export function listingIdentity(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const source = sources.find(item => item.hostname === url.hostname);
    const id = source?.listingId(url.pathname, url.searchParams);
    return id ? { source: source.name, id, url: url.href } : null;
}

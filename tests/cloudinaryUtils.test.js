import assert from 'node:assert/strict';
import { getCatalogImageProps, getGalleryImageProps, getOptimizedImageUrl, getBlurPlaceholder } from '../src/lib/cloudinaryUtils.js';

const prefix = 'https://res.cloudinary.com/autosporting/image/upload/';
const asset = 'v1794422423/autosporting-cars/foto%20frente%2C%20azul.webp';
const original = prefix + asset;
const variants = ['main', 'thumbnail', 'lightbox', 'unknown', '__proto__', 'constructor', null];
const imageHelpers = [
    getCatalogImageProps,
    getGalleryImageProps,
    ...variants.map(variant => url => getGalleryImageProps(url, variant))
];

// Every context shares the exact stored master: no encoding, width variants,
// query parameters or second optimizer can select a smaller source.
for (const getProps of imageHelpers) {
    assert.deepEqual(getProps(original), { src: original });
    assert.deepEqual(getProps(getProps(original).src), { src: original });
    assert.deepEqual(Object.keys(getProps(original)), ['src']);
}

// Previous delivery-only variants recover the master, including chained
// parameters, preview widths and quality settings in any recognized order.
for (const delivery of [
    'f_auto,q_auto,w_600,c_limit/',
    'c_limit,w_600,q_auto,f_auto/',
    'w_600,q_auto:eco/f_auto,c_limit/',
    'q_80,w_600,c_limit/',
    'f_auto,q_auto:good,w_600,c_limit/',
    'f_auto,q_auto:best,w_600,c_limit/',
    'q_auto:low/f_auto/w_400/c_limit/',
    'f_auto,q_100,w_1200,c_limit/',
    'f_auto,q_1,w_1600,c_limit/',
    'f_auto,q_auto:best,w_3840,c_limit/'
]) {
    for (const getProps of imageHelpers) {
        assert.deepEqual(getProps(prefix + delivery + asset), { src: original });
    }
}

// A version ends the transformation portion. Public-ID folders resembling
// transforms and all escaped characters must survive byte-for-byte.
for (const masterAsset of [
    'v12/c_limit/w_600/veh%C3%ADculo%2Ffrente.jpg',
    'v12/e_sharpen/q_auto:best/photo%2520front.jpg',
    'autosporting-cars/front.jpg'
]) {
    const master = prefix + masterAsset;
    for (const getProps of imageHelpers) {
        assert.deepEqual(getProps(master), { src: master });
        assert.deepEqual(getProps(prefix + 'w_600,c_limit/' + masterAsset), { src: master });
    }
}

// Preserve editorial changes, signatures, tokenized and non-upload sources
// exactly. A recognized prefix cannot hide another, unknown transformation.
const unchanged = [
    prefix + 'c_crop,w_600,h_400/' + asset,
    prefix + 'f_auto,q_auto,w_600,c_limit/e_sharpen/' + asset,
    prefix + 'f_auto,q_auto,w_600,c_limit/e_sharpen:35/' + asset,
    prefix + 'f_webp,q_100/' + asset,
    prefix + 'f_png/' + asset,
    prefix + 'q_101/' + asset,
    prefix + 'q_0/' + asset,
    prefix + 't_catalog-cover/' + asset,
    prefix + 's--signature--/' + asset,
    prefix + 'f_auto/s--signature--/' + asset,
    prefix + 'l_logo,w_100/' + asset,
    prefix + 'g_auto,c_fill,w_600,h_400/' + asset,
    prefix + 'my_folder/front.jpg',
    prefix + asset + '?__cld_token__=secret',
    prefix + asset + '?cache=1',
    prefix + asset + '#photo',
    'https://res.cloudinary.com/autosporting/image/authenticated/' + asset,
    'https://res.cloudinary.com/autosporting/video/upload/' + asset,
    'https://res.cloudinary.com.evil.test/autosporting/image/upload/' + asset,
    'https://evil.test/cloudinary.com/image/upload/photo.jpg',
    'https://res.cloudinary.com@evil.test/autosporting/image/upload/photo.jpg',
    'https://user:password@res.cloudinary.com/autosporting/image/upload/photo.jpg',
    'https://res.cloudinary.com:8443/autosporting/image/upload/photo.jpg',
    '/placeholder.png',
    'data:image/png;base64,AAAA',
    'blob:https://autosportingg.com/id',
    'http://res.cloudinary.com/autosporting/image/upload/photo.jpg',
    prefix,
    prefix + 'v12/',
    prefix + 'v12/cars/../front.jpg',
    prefix + 'v12/cars/%2E%2E/front.jpg',
    prefix + 'v12//front.jpg',
    prefix + 'photo with spaces.jpg'
];
for (const getProps of imageHelpers) {
    for (const url of unchanged) assert.deepEqual(getProps(url), { src: url });
    for (const invalid of [null, undefined, '', 123, { url: original }]) {
        assert.deepEqual(getProps(invalid), { src: '' });
    }
}

// Older utility contracts remain unchanged for callers outside the catalog.
assert.equal(getOptimizedImageUrl(original, 600), prefix + 'f_auto,q_auto,w_600,c_limit/' + asset);
assert.equal(getBlurPlaceholder(original), prefix + 'f_auto,q_10,w_40,c_limit,e_blur:1000/' + asset);
console.log('PASS catalog and gallery images: exact shared masters, legacy recovery, encoded IDs, and unchanged edited/signed/external sources.');

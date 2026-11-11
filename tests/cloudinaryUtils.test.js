import assert from 'node:assert/strict';
import { CATALOG_IMAGE_WIDTHS, getCatalogImageProps, getGalleryImageProps, getOptimizedImageUrl, getBlurPlaceholder } from '../src/lib/cloudinaryUtils.js';

const prefix = 'https://res.cloudinary.com/autosporting/image/upload/';
const asset = 'v1794422423/autosporting-cars/foto%20frente%2C%20azul.webp';
const original = prefix + asset;
const props = getCatalogImageProps(original);
assert.equal(props.src, prefix + 'f_auto,q_auto:best,w_960,c_limit/' + asset);
assert.deepEqual(CATALOG_IMAGE_WIDTHS, [640, 960, 1280, 1600]);
assert.equal(props.srcSet.split(', ').length, 4);
for (const width of CATALOG_IMAGE_WIDTHS) {
    assert.ok(props.srcSet.includes(`${prefix}f_auto,q_auto:best,w_${width},c_limit/${asset} ${width}w`));
}
assert.equal(props.src.includes('/_next/image'), false);

// Existing delivery-only variants recover the same master without stacking a
// 600px reduction before the new responsive width. Order/chaining are allowed.
for (const delivery of [
    'f_auto,q_auto,w_600,c_limit/',
    'c_limit,w_600,q_auto,f_auto/',
    'w_600,q_auto:eco/f_auto,c_limit/',
    'q_80,w_600,c_limit/',
    'f_auto,q_auto:good,w_600,c_limit/',
    'f_auto,q_auto:best,w_600,c_limit/'
]) {
    assert.deepEqual(getCatalogImageProps(prefix + delivery + asset), props);
}

// The version ends the transformation portion: public-ID folders that look
// like transformations and escaped slashes must survive byte-for-byte.
const folderAsset = 'v12/c_limit/w_600/veh%C3%ADculo%2Ffrente.jpg';
assert.ok(getCatalogImageProps(prefix + folderAsset).src.endsWith('/' + folderAsset));
assert.ok(getCatalogImageProps(prefix + 'autosporting-cars/front.jpg').srcSet);

// Keep editorial changes, signed/tokenized assets and non-upload sources.
const unchanged = [
    prefix + 'c_crop,w_600,h_400/' + asset,
    prefix + 'f_auto,q_auto,w_600,c_limit/e_sharpen/' + asset,
    prefix + 't_catalog-cover/' + asset,
    prefix + 's--signature--/' + asset,
    prefix + 'l_logo,w_100/' + asset,
    prefix + 'g_auto,c_fill,w_600,h_400/' + asset,
    prefix + 'my_folder/front.jpg', // ambiguous unversioned public-ID folder
    prefix + asset + '?__cld_token__=secret',
    prefix + asset + '?cache=1',
    prefix + asset + '#photo',
    'https://res.cloudinary.com/autosporting/image/authenticated/' + asset,
    'https://res.cloudinary.com/autosporting/video/upload/' + asset,
    'https://res.cloudinary.com.evil.test/autosporting/image/upload/' + asset,
    'https://evil.test/cloudinary.com/image/upload/photo.jpg',
    'https://res.cloudinary.com@evil.test/autosporting/image/upload/photo.jpg',
    'https://user:password@res.cloudinary.com/autosporting/image/upload/photo.jpg',
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
for (const url of unchanged) assert.deepEqual(getCatalogImageProps(url), { src: url });
assert.deepEqual(getCatalogImageProps(null), { src: '' });
assert.deepEqual(getCatalogImageProps({ url: original }), { src: '' });

// Adding the catalog API must not alter existing gallery/placeholder behavior.
assert.equal(getOptimizedImageUrl(original, 600), prefix + 'f_auto,q_auto,w_600,c_limit/' + asset);
assert.equal(getBlurPlaceholder(original), prefix + 'f_auto,q_10,w_40,c_limit,e_blur:1000/' + asset);

const galleryCases = [
    ['main', 1600, [640, 960, 1280, 1600, 1920, 2560]],
    ['thumbnail', 480, [320, 480, 640, 960]],
    ['lightbox', 1920, [640, 960, 1280, 1600, 1920, 2560, 3200, 3840]]
];
for (const [variant, defaultWidth, widths] of galleryCases) {
    const gallery = getGalleryImageProps(original, variant);
    assert.equal(gallery.src, `${prefix}f_auto,q_auto:best,w_${defaultWidth},c_limit/${asset}`);
    assert.equal(gallery.srcSet, widths.map(width => `${prefix}f_auto,q_auto:best,w_${width},c_limit/${asset} ${width}w`).join(', '));
    for (const oldWidth of [400, 1200, 1600]) {
        const reduced = prefix + `f_auto,q_auto,w_${oldWidth},c_limit/` + asset;
        assert.deepEqual(getGalleryImageProps(reduced, variant), gallery, 'Recover the master instead of stacking an old width limit');
    }
    for (const url of unchanged) assert.deepEqual(getGalleryImageProps(url, variant), { src: url });
    assert.deepEqual(getGalleryImageProps(null, variant), { src: '' });
    assert.ok(getGalleryImageProps(prefix + folderAsset, variant).src.endsWith('/' + folderAsset));
}
assert.deepEqual(getGalleryImageProps(original), getGalleryImageProps(original, 'main'));
for (const unknownVariant of ['unknown', '__proto__', 'constructor', null]) {
    assert.deepEqual(getGalleryImageProps(original, unknownVariant), getGalleryImageProps(original, 'main'));
}
// Gallery presets must not change catalog candidates or its fallback URL.
assert.deepEqual(getCatalogImageProps(original), props);
assert.equal(getCatalogImageProps(original).srcSet.split(', ').length, 4);
console.log('PASS catalog and gallery images: responsive limits, independent variants, legacy masters, encoded IDs and safe fallbacks.');

import assert from 'node:assert/strict';
import { CATALOG_IMAGE_WIDTHS, getCatalogImageProps, getOptimizedImageUrl, getBlurPlaceholder } from '../src/lib/cloudinaryUtils.js';

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
console.log('PASS catalog images: responsive limits, legacy variants, encoded IDs and safe fallback for signed/edited/external URLs.');

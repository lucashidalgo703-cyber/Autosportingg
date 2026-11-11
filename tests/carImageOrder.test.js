import assert from 'node:assert/strict';
import { resolveCarImageUpdate } from '../src/utils/carImageOrder.js';

const cloudName = 'autosporting-test';
const own = name => `https://res.cloudinary.com/${cloudName}/image/upload/v123/autosporting-cars/${name}.webp`;
const legacy = ['https://legacy.example/car.jpg', '/photos/old.jpg'];
const files = [{ path: own('new-0') }, { path: own('new-1') }];
const resolve = value => resolveCarImageUpdate({ cloudName, ...value });
const before = JSON.stringify({ legacy, files });

assert.deepEqual(resolve({ body: {} }), { provided: false });
assert.deepEqual(resolve({ body: {}, existingImages: legacy }), { provided: false });
assert.deepEqual(resolve({ body: { notes: 'Only notes' }, existingImages: legacy }), { provided: false });
assert.deepEqual(resolve({ body: { imageOrder: JSON.stringify([legacy[1], own('hq'), legacy[0]]) }, existingImages: legacy }), {
    provided: true, images: [legacy[1], own('hq'), legacy[0]], coverImage: legacy[1]
});
assert.deepEqual(resolve({ body: { imageOrder: [] }, existingImages: legacy }), { provided: true, images: [], coverImage: '' });
assert.deepEqual(resolve({ body: { images: '[]' }, existingImages: legacy }), { provided: true, images: [], coverImage: '' });
assert.deepEqual(resolve({ body: { images: JSON.stringify(legacy) }, files }), { provided: true, images: [...legacy, ...files.map(file => file.path)], coverImage: legacy[0] });
assert.deepEqual(resolve({ files, existingImages: legacy }), { provided: true, images: [...legacy, ...files.map(file => file.path)], coverImage: legacy[0] });
assert.deepEqual(resolve({ body: { images: legacy[0] } }), { provided: true, images: [legacy[0]], coverImage: legacy[0] });
assert.deepEqual(resolve({ body: { imageOrder: ['__new__1', legacy[1], '__new__0'] }, files, existingImages: legacy }), {
    provided: true, images: [files[1].path, legacy[1], files[0].path], coverImage: files[1].path
});
assert.deepEqual(resolve({ body: { imageOrder: [legacy[0], legacy[0]] }, existingImages: legacy }).images, [legacy[0], legacy[0]]);
assert.deepEqual(resolve({ body: { imageOrder: ['__new__0', '__new__0'] }, files: [files[0]] }).images, [files[0].path, files[0].path]);
const retryBody = { imageOrder: [own('hq'), legacy[0]] };
const firstSave = resolve({ body: retryBody, existingImages: legacy });
assert.deepEqual(resolve({ body: retryBody, existingImages: firstSave.images }), firstSave);
assert.equal(resolve({ body: { imageOrder: Array.from({ length: 20 }, (_, index) => own('hq-' + index)) } }).images.length, 20);

for (const imageOrder of ['not json', null, {}, 7, '["broken"', [null], [''], ['  '], ['__new__0'], ['__new__-1'], ['__new__1.2'], ['__new__99999999999999999999'], Array.from({ length: 21 }, () => own('too-many'))]) {
    assert.ok(resolve({ body: { imageOrder } }).error, JSON.stringify(imageOrder));
}
assert.ok(resolve({ body: { imageOrder: ['__new__0'] }, files }).error, 'Missing uploaded image must not be silently dropped');
assert.ok(resolve({ files, existingImages: Array.from({ length: 19 }, () => legacy[0]) }).error);
assert.ok(resolve({ body: { images: '{broken' } }).error);
assert.ok(resolve({ body: { images: [null] } }).error);
assert.ok(resolve({ files: [{ path: null }] }).error);

for (const source of [
    'https://elsewhere.example/new.jpg',
    own('hq').replace(cloudName, 'another-cloud'),
    own('hq').replace('autosporting-cars', 'another-folder'),
    own('hq').replace('res.cloudinary.com', 'res.cloudinary.com.evil.test'),
    own('hq').replace('https:', 'http:'),
    own('hq') + '?token=abc',
    'data:image/png;base64,AAAA',
    '/photos/new.jpg'
]) assert.ok(resolve({ body: { imageOrder: [source] } }).error, source);
assert.deepEqual(resolve({ body: { imageOrder: [legacy[1]] }, existingImages: legacy }).images, [legacy[1]]);
assert.deepEqual(resolve({ body: { imageOrder: [legacy[0]] }, existingCoverImage: legacy[0] }).images, [legacy[0]]);
assert.equal(JSON.stringify({ legacy, files }), before);
console.log('PASS vehicle image order: preuploads, mixed legacy, omitted/empty lists, limits, retries and invalid references.');

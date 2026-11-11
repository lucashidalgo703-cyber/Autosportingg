import assert from 'node:assert/strict';
import { compressImage, VEHICLE_IMAGE_MAX_BYTES, VEHICLE_IMAGE_MAX_DIMENSION } from '../src/utils/imageCompressor.js';

// Mock browser encoding only; these tests exercise upload policy, not image aesthetics.
const originals = Object.fromEntries(['window', 'FileReader', 'Image', 'document', 'File'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let scenario, attempts, draws, canvasCount;
class TestFile {
    constructor(parts, name, options = {}) {
        this.name = name;
        this.type = options.type || '';
        this.lastModified = options.lastModified || 1000;
        this.size = parts.reduce((sum, part) => sum + (part.size || 0), 0);
    }
}
const input = (size, type = 'image/jpeg', name = 'vehiculo.jpg') => new TestFile([{ size }], name, { type });
function setup(options = {}) {
    scenario = { width: 2048, height: 1536, outputSize: 500000, outputType: 'image/webp', ...options };
    attempts = []; draws = []; canvasCount = 0;
    globalThis.window = {};
    globalThis.File = TestFile;
    globalThis.FileReader = class {
        readAsDataURL() {
            queueMicrotask(() => scenario.readError ? this.onerror() : this.onload({ target: { result: 'data:test-image' } }));
        }
    };
    globalThis.Image = class {
        set src(value) {
            this.naturalWidth = scenario.width;
            this.naturalHeight = scenario.height;
            queueMicrotask(() => scenario.decodeError ? this.onerror() : this.onload());
        }
    };
    globalThis.document = {
        createElement(tag) {
            assert.equal(tag, 'canvas');
            canvasCount++;
            const canvas = {
                width: 0, height: 0,
                getContext() {
                    if (scenario.noContext) return null;
                    return { drawImage(...args) { draws.push({ args, width: canvas.width, height: canvas.height }); } };
                },
                toBlob(callback, type, quality) {
                    const attempt = { width: canvas.width, height: canvas.height, type, quality };
                    attempts.push(attempt);
                    const size = typeof scenario.outputSize === 'function' ? scenario.outputSize(attempt) : scenario.outputSize;
                    queueMicrotask(() => callback(scenario.nullBlob ? null : { size, type: scenario.outputType }));
                }
            };
            return canvas;
        }
    };
}

try {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
        setup();
        const file = input(600000, type);
        assert.strictEqual(await compressImage(file), file, 'Compatible light source must preserve its original bytes');
        assert.equal(canvasCount, 0);
    }
    setup({ width: 4000, height: 3000 });
    const largeSource = input(5000000);
    const landscape = await compressImage(largeSource);
    assert.deepEqual(attempts[0], { width: 2560, height: 1920, type: 'image/webp', quality: 0.9 });
    assert.equal(landscape.type, 'image/webp');
    assert.equal(landscape.name, 'vehiculo.webp');
    assert.equal(landscape.size, 500000);

    setup({ width: 1500, height: 4000 });
    await compressImage(input(2500000));
    assert.equal(attempts[0].width, 960);
    assert.equal(attempts[0].height, VEHICLE_IMAGE_MAX_DIMENSION, 'Portrait height must also be bounded');

    setup({ width: 800, height: 600 });
    await compressImage(input(2300000, 'image/png'));
    assert.equal(attempts[0].width, 800, 'Processing may not upscale a small image');
    assert.equal(attempts[0].height, 600);

    setup({ width: 4000, height: 3000, outputSize: ({ width, quality }) => width === 2560 ? (quality === 0.9 ? 3000000 : 2300000) : 1200000 });
    const adapted = await compressImage(input(7000000));
    assert.deepEqual(attempts.map(({ width, quality }) => [width, quality]), [[2560, 0.9], [2560, 0.86], [2048, 0.9]]);
    assert.ok(adapted.size <= VEHICLE_IMAGE_MAX_BYTES);
    assert.ok(draws.every(draw => draw.args[0] === draws[0].args[0]), 'Every resize starts from the same decoded source');
    assert.ok(draws.every(draw => draw.args[3] === 4000 && draw.args[4] === 3000));

    setup({ width: 3000, height: 2000, outputSize: 4000000 });
    await assert.rejects(compressImage(input(8000000)), /límite de carga/);
    assert.equal(attempts.at(-1).width, 1280);
    assert.ok(attempts.every(attempt => attempt.quality >= 0.86));

    setup({ outputType: 'image/png' });
    const fallback = await compressImage(input(3000000));
    assert.equal(fallback.name, 'vehiculo.png', 'A browser codec fallback must retain the actual MIME and extension');
    assert.equal(fallback.type, 'image/png');

    for (const [configuration, message] of [
        [{ readError: true }, /leer/], [{ decodeError: true }, /abrir/],
        [{ noContext: true }, /navegador/], [{ nullBlob: true }, /preparar/]
    ]) {
        setup(configuration);
        await assert.rejects(compressImage(input(3000000)), message);
    }
    setup();
    await assert.rejects(compressImage(input(0)), /vacía/);
    await assert.rejects(compressImage(input(100), 0), /configuración/);
    await assert.rejects(compressImage(input(100), 2560, 2), /configuración/);
    delete globalThis.window;
    const serverSmall = input(1000);
    assert.strictEqual(await compressImage(serverSmall), serverSmall);
    await assert.rejects(compressImage(input(3000000)), /navegador/);
    console.log('PASS imageCompressor: original preservation, long-edge bounds, no upscale, quality/size fallback, codec and failure handling.');
} finally {
    for (const [key, descriptor] of Object.entries(originals)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    }
}

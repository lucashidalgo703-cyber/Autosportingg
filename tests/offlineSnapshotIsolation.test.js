import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveOfflineSnapshot, getUserStorageNamespace } from '../src/services/offlineSyncService.js';

const tokenFor = claims => `test.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.test`;
const snapshotFor = userId => ({ userId, data: { vehicles: [{ _id: `vehicle-${userId}` }] }, outbox: [] });
function memoryStorage() {
    const values = new Map();
    const reads = [];
    let enumerations = 0;
    return {
        reads,
        get enumerations() { return enumerations; },
        get length() { return values.size; },
        key(index) { enumerations++; return [...values.keys()][index] ?? null; },
        getItem(key) { reads.push(key); return values.get(key) ?? null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}
const storeSnapshot = (storage, userId, snapshot = snapshotFor(userId)) => storage.setItem(getUserStorageNamespace(userId), JSON.stringify(snapshot));

test('cambiar entre Alice y Bob devuelve solo la instantánea de la sesión actual', () => {
    const storage = memoryStorage();
    storeSnapshot(storage, 'alice'); storeSnapshot(storage, 'bob');
    storage.setItem('token', tokenFor({ id: 'alice' }));
    assert.deepEqual(getActiveOfflineSnapshot(storage), snapshotFor('alice'));
    storage.setItem('token', tokenFor({ id: 'bob' }));
    assert.deepEqual(getActiveOfflineSnapshot(storage), snapshotFor('bob'));
    assert.equal(storage.enumerations, 0);
});

test('Alice sin instantánea no recibe la de Bob ni consulta su namespace', () => {
    const storage = memoryStorage();
    storeSnapshot(storage, 'bob');
    storage.setItem('token', tokenFor({ id: 'alice' }));
    assert.equal(getActiveOfflineSnapshot(storage), null);
    assert.deepEqual(storage.reads, ['token', getUserStorageNamespace('alice')]);
    assert.equal(storage.enumerations, 0);
});

test('sin JWT, con JWT mal formado o sin identidad no se rescata ningún usuario guardado', () => {
    for (const token of [null, 'not-a-jwt', 'test.!.test', tokenFor({}), tokenFor([]), tokenFor({ id: {} }), tokenFor({ id: '  ' })]) {
        const storage = memoryStorage();
        storeSnapshot(storage, 'bob');
        if (token) storage.setItem('token', token);
        assert.equal(getActiveOfflineSnapshot(storage), null);
        assert.deepEqual(storage.reads, ['token']);
        assert.equal(storage.enumerations, 0);
    }
});

test('id, userId, _id y username conservan la búsqueda de la instantánea propia', () => {
    for (const claim of ['id', 'userId', '_id', 'username']) {
        const storage = memoryStorage();
        storeSnapshot(storage, 'alice');
        storage.setItem('token', tokenFor({ [claim]: 'alice' }));
        assert.deepEqual(getActiveOfflineSnapshot(storage), snapshotFor('alice'));
    }
});

test('la identidad principal sin caché no cae a otro alias con caché', () => {
    const storage = memoryStorage();
    storeSnapshot(storage, 'bob');
    storage.setItem('token', tokenFor({ id: 'alice', userId: 'bob', username: 'bob' }));
    assert.equal(getActiveOfflineSnapshot(storage), null);
    assert.deepEqual(storage.reads, ['token', getUserStorageNamespace('alice')]);
});

test('un bundle con propietario distinto o namespace que colisiona no se expone', () => {
    const storage = memoryStorage();
    storeSnapshot(storage, 'alice', snapshotFor('bob'));
    storage.setItem('token', tokenFor({ id: 'alice' }));
    assert.equal(getActiveOfflineSnapshot(storage), null);
    storeSnapshot(storage, 'user_A');
    storage.setItem('token', tokenFor({ id: 'user A' }));
    assert.equal(getUserStorageNamespace('user A'), getUserStorageNamespace('user_A'));
    assert.equal(getActiveOfflineSnapshot(storage), null);
});

test('un JWT vencido o bundle corrupto queda cerrado sin buscar otro usuario', () => {
    const storage = memoryStorage();
    storeSnapshot(storage, 'alice'); storeSnapshot(storage, 'bob');
    storage.setItem('token', tokenFor({ id: 'alice', exp: 1 }));
    assert.equal(getActiveOfflineSnapshot(storage), null);
    storage.setItem('token', tokenFor({ id: 'alice', exp: 'invalid' }));
    assert.equal(getActiveOfflineSnapshot(storage), null);
    storage.setItem('token', tokenFor({ id: 'alice', exp: Math.floor(Date.now() / 1000) + 3600 }));
    assert.deepEqual(getActiveOfflineSnapshot(storage), snapshotFor('alice'));
    storage.setItem(getUserStorageNamespace('alice'), '{broken');
    assert.equal(getActiveOfflineSnapshot(storage), null);
    assert.equal(storage.enumerations, 0);
});

test('username Unicode conserva su identidad UTF-8 al localizar la instantánea', () => {
    const storage = memoryStorage();
    storeSnapshot(storage, 'Equipo de demostración');
    storage.setItem('token', tokenFor({ username: 'Equipo de demostración' }));
    assert.deepEqual(getActiveOfflineSnapshot(storage), snapshotFor('Equipo de demostración'));
});

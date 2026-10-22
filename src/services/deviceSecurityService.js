/**
 * Servicio de Seguridad y Gestión de Terminales (Cliente)
 * Maneja el identificador persistente de la instalación del navegador
 * y la criptografía asimétrica no exportable (ECDSA P-256) en IndexedDB.
 */

const DEVICE_STORAGE_KEY = 'autosporting_device_id';
const DB_NAME = 'autosporting_security_store';
const KEY_STORE_NAME = 'crypto_keys';

// 1. Obtener o Generar el UUID persistente del navegador
export function getPersistentDeviceId() {
    if (typeof window === 'undefined') return 'server-side';

    try {
        let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
        }
        // Redundancia en cookie
        try {
            document.cookie = `${DEVICE_STORAGE_KEY}=${deviceId}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
        return deviceId;
    } catch {
        return 'ephemeral-storage-blocked';
    }
}

// 2. Manejo de IndexedDB para Claves Criptográficas No Exportables
function openCryptoDb() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('IndexedDB no soportado'));
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
                db.createObjectStore(KEY_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 3. Inicializa o recupera el par de claves ECDSA del navegador
export async function getOrCreateDeviceKeyPair() {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        return { publicKeyJwk: null };
    }

    try {
        const db = await openCryptoDb();
        const tx = db.transaction(KEY_STORE_NAME, 'readonly');
        const store = tx.objectStore(KEY_STORE_NAME);

        const keyPair = await new Promise((resolve) => {
            const req = store.get('device_signing_key');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (keyPair) {
            const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
            return {
                publicKeyJwk: JSON.stringify(publicKeyJwk),
                keyPair
            };
        }

        // Generar nuevo par de claves ECDSA P-256 no extraíble
        const newKeyPair = await window.crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            false, // privateKey NO exportable
            ['sign', 'verify']
        );

        // Guardar en IndexedDB
        const writeTx = db.transaction(KEY_STORE_NAME, 'readwrite');
        const writeStore = writeTx.objectStore(KEY_STORE_NAME);
        writeStore.put(newKeyPair, 'device_signing_key');

        const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', newKeyPair.publicKey);
        return {
            publicKeyJwk: JSON.stringify(publicKeyJwk),
            keyPair: newKeyPair
        };
    } catch (e) {
        console.warn('Almacenamiento criptográfico local no disponible:', e.message);
        return { publicKeyJwk: null };
    }
}

// 4. Firma de desafíos para evitar clonación de deviceId
export async function signSecurityChallenge(challengeText) {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null;

    try {
        const db = await openCryptoDb();
        const tx = db.transaction(KEY_STORE_NAME, 'readonly');
        const store = tx.objectStore(KEY_STORE_NAME);

        const keyPair = await new Promise((resolve) => {
            const req = store.get('device_signing_key');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (!keyPair?.privateKey) return null;

        const enc = new TextEncoder();
        const signature = await window.crypto.subtle.sign(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' }
            },
            keyPair.privateKey,
            enc.encode(challengeText)
        );

        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch {
        return null;
    }
}

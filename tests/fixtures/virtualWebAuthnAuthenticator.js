import crypto from 'node:crypto';
import { encodeCBOR } from '@levischuck/tiny-cbor';

/**
 * Autenticador Virtual FIDO2 / WebAuthn para pruebas automatizadas aisladas.
 * Implementa la especificación criptográfica W3C WebAuthn Level 3 real (ECDSA P-256).
 */
export class VirtualWebAuthnAuthenticator {
    constructor() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.credentialId = crypto.randomBytes(32);
        this.counter = 0;
    }

    /**
     * Genera una respuesta de registro (attestationObject + clientDataJSON)
     */
    createRegistrationResponse({ options, origin = 'http://localhost:3000', rpID = 'localhost', userVerification = true }) {
        const jwk = this.publicKey.export({ format: 'jwk' });
        const xCoord = Buffer.from(jwk.x, 'base64url');
        const yCoord = Buffer.from(jwk.y, 'base64url');

        // COSE Key Map: kty: EC2 (2), alg: ES256 (-7), crv: P-256 (1), x, y
        const coseKeyMap = new Map();
        coseKeyMap.set(1, 2);
        coseKeyMap.set(3, -7);
        coseKeyMap.set(-1, 1);
        coseKeyMap.set(-2, xCoord);
        coseKeyMap.set(-3, yCoord);
        const coseKeyBytes = Buffer.from(encodeCBOR(coseKeyMap));

        const rpIdHash = crypto.createHash('sha256').update(rpID).digest();
        // Flags: UP (0x01) | UV (0x04) | AT (0x40)
        let flags = 0x01 | 0x40;
        if (userVerification) {
            flags |= 0x04;
        }

        const signCountBuf = Buffer.alloc(4);
        signCountBuf.writeUInt32BE(this.counter, 0);

        const aaguid = Buffer.alloc(16); // 16 bytes ceros
        const credIdLenBuf = Buffer.alloc(2);
        credIdLenBuf.writeUInt16BE(this.credentialId.length, 0);

        const authData = Buffer.concat([
            rpIdHash,
            Buffer.from([flags]),
            signCountBuf,
            aaguid,
            credIdLenBuf,
            this.credentialId,
            coseKeyBytes
        ]);

        const attestationMap = new Map();
        attestationMap.set('fmt', 'none');
        attestationMap.set('attStmt', new Map());
        attestationMap.set('authData', authData);
        const attestationObject = Buffer.from(encodeCBOR(attestationMap));

        const clientDataObj = {
            type: 'webauthn.create',
            challenge: options.challenge,
            origin,
            crossOrigin: false
        };
        const clientDataJSON = Buffer.from(JSON.stringify(clientDataObj));

        return {
            id: this.credentialId.toString('base64url'),
            rawId: this.credentialId.toString('base64url'),
            response: {
                clientDataJSON: clientDataJSON.toString('base64url'),
                attestationObject: attestationObject.toString('base64url'),
                transports: ['internal']
            },
            type: 'public-key',
            clientExtensionResults: {}
        };
    }

    /**
     * Genera una respuesta de autenticación (authenticatorData + clientDataJSON + signature)
     */
    createAuthenticationResponse({ 
        options, 
        origin = 'http://localhost:3000', 
        rpID = 'localhost', 
        userVerification = true,
        tamperSignature = false,
        customCounter = null
    }) {
        if (customCounter !== null) {
            this.counter = customCounter;
        } else {
            this.counter += 1;
        }

        const rpIdHash = crypto.createHash('sha256').update(rpID).digest();
        // Flags: UP (0x01) | UV (0x04)
        let flags = 0x01;
        if (userVerification) {
            flags |= 0x04;
        }

        const signCountBuf = Buffer.alloc(4);
        signCountBuf.writeUInt32BE(this.counter, 0);

        const authData = Buffer.concat([
            rpIdHash,
            Buffer.from([flags]),
            signCountBuf
        ]);

        const clientDataObj = {
            type: 'webauthn.get',
            challenge: options.challenge,
            origin,
            crossOrigin: false
        };
        const clientDataJSON = Buffer.from(JSON.stringify(clientDataObj));
        const clientDataHash = crypto.createHash('sha256').update(clientDataJSON).digest();

        const dataToSign = Buffer.concat([authData, clientDataHash]);
        const signer = crypto.createSign('SHA256');
        signer.update(dataToSign);

        let signature = signer.sign(this.privateKey);
        if (tamperSignature) {
            // Alterar deliberadamente el último byte de la firma
            signature = Buffer.from(signature);
            signature[signature.length - 1] ^= 0xff;
        }

        return {
            id: this.credentialId.toString('base64url'),
            rawId: this.credentialId.toString('base64url'),
            response: {
                clientDataJSON: clientDataJSON.toString('base64url'),
                authenticatorData: authData.toString('base64url'),
                signature: signature.toString('base64url'),
                userHandle: Buffer.from('1234').toString('base64url')
            },
            type: 'public-key',
            clientExtensionResults: {}
        };
    }
}

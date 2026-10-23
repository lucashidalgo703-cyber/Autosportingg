import mongoose from 'mongoose';

/**
 * Esquema de Credenciales WebAuthn / Passkeys (FIDO2)
 * Almacena las claves públicas y metadatos de passkeys registradas por el propietario.
 * NOTA DE SEGURIDAD:
 * - NO almacena ningún dato biométrico (huellas, rostros ni PINs residen exclusivamente
 *   en el hardware de seguridad TPM / Secure Enclave del cliente).
 * - Distinción explícita:
 *   - Passkey: acredita posesión y verificación de credencial WebAuthn criptográfica.
 *   - TrustedDevice: identifica la terminal autorizada en el CRM mediante firma ECDSA.
 *   - UserSession: representa una sesión activa y revocable en MongoDB.
 */
const passkeyCredentialSchema = new mongoose.Schema({
    credentialId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    publicKey: {
        type: String, // Base64URL string de la clave pública del autenticador
        required: true
    },
    counter: {
        type: Number,
        default: 0
    },
    deviceType: {
        type: String,
        enum: ['singleDevice', 'multiDevice'],
        default: 'singleDevice'
    },
    backedUp: {
        type: Boolean,
        default: false
    },
    transports: {
        type: [String],
        default: []
    },
    aaguid: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active',
        index: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastUsedAt: {
        type: Date,
        default: null
    },
    revokedAt: {
        type: Date,
        default: null
    },
    revokedBy: {
        userId: String,
        name: String
    },
    revocationReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

passkeyCredentialSchema.index({ userId: 1, status: 1 });
passkeyCredentialSchema.index({ credentialId: 1, status: 1 });

const PasskeyCredential = mongoose.models.PasskeyCredential || mongoose.model('PasskeyCredential', passkeyCredentialSchema);
export default PasskeyCredential;

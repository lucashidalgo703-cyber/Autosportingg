import mongoose from 'mongoose';

/**
 * Esquema de Dispositivos Confiables (PC Agencia, PC Privada y Desconocidos)
 * Almacena el estado de confianza, especificaciones técnicas y el historial permanente de cambios.
 */
const trustedDeviceSchema = new mongoose.Schema({
    deviceId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true 
    },
    deviceName: { 
        type: String, 
        required: true,
        trim: true 
    }, // 'PC Agencia' | 'PC Privada' | personalizado
    label: { 
        type: String,
        trim: true 
    },
    status: { 
        type: String, 
        enum: ['trusted', 'pending_verification', 'revoked', 'unknown'], 
        default: 'unknown',
        index: true 
    },
    // Clave pública para verificación de firma asimétrica ECDSA P-256
    // NOTA DE SEGURIDAD: La clave privada reside en IndexedDB (Web Crypto API) como no exportable
    // para mitigar robo por XSS o manipulación de localStorage. No constituye un HWID inalterable
    // ni sustituye la seguridad de hardware (TPM / WebAuthn FIDO2), dado que los archivos locales
    // del perfil del navegador pueden ser clonados por malware o copias directas de disco a nivel del SO.
    publicKey: {
        type: String,
        default: null
    },
    registeredBy: {
        userId: String,
        name: String,
        email: String
    },
    authorizedBy: {
        userId: String,
        name: String,
        email: String,
        authorizedAt: Date,
        authMethod: {
            type: String,
            enum: ['mfa_totp', 'passkey', 'recovery_code', 'system_seed']
        }
    },
    firstRegisteredAt: { 
        type: Date, 
        default: Date.now 
    },
    firstRegisteredIp: { 
        type: String 
    },
    lastSeenAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    },
    lastSeenIp: { 
        type: String 
    },
    lastSeenUser: { 
        type: String 
    },
    // Revocación
    revokedAt: { 
        type: Date 
    },
    revokedBy: { 
        userId: String, 
        name: String 
    },
    revocationReason: { 
        type: String 
    },
    // Información del entorno no invasiva (parseada exclusivamente del User-Agent en el servidor)
    clientInfo: {
        os: String,
        browser: String,
        rawUserAgent: String
    },
    // Historial permanente de seguridad y confianza (se preserva siempre, incluso ante revocación)
    trustHistory: [{
        event: { 
            type: String, 
            enum: [
                'REGISTRO_SOLICITADO', 
                'REGISTRO_AUTORIZADO', 
                'REGISTRO_RECHAZADO',
                'NOMBRE_CAMBIADO', 
                'IP_CAMBIADA', 
                'DISPOSITIVO_REVOCADO', 
                'ACCESO_POST_REVOCACION',
                'FIRMA_INVALIDA_CLONACION'
            ],
            required: true
        },
        performedBy: { 
            userId: String, 
            name: String, 
            role: String 
        },
        authMethod: { 
            type: String, 
            enum: ['mfa_totp', 'passkey', 'recovery_code', 'system'] 
        },
        previousValue: String,
        newValue: String,
        ip: String,
        timestamp: { 
            type: Date, 
            default: Date.now 
        },
        details: String
    }]
}, { 
    timestamps: true 
});

trustedDeviceSchema.index({ status: 1, lastSeenAt: -1 });

// FASE 4: Protección contra DoS / Document Bloat: acotar trustHistory a un máximo de 50 eventos
trustedDeviceSchema.pre('save', function () {
    if (this.trustHistory && this.trustHistory.length > 50) {
        this.trustHistory = this.trustHistory.slice(-50);
    }
});

const TrustedDevice = mongoose.models.TrustedDevice || mongoose.model('TrustedDevice', trustedDeviceSchema);
export default TrustedDevice;

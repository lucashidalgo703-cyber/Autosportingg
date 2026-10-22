import mongoose from 'mongoose';

/**
 * Esquema de Sesiones de Usuario Identificadas y Revocables
 * Vincula al usuario con el dispositivo y permite la invalidación inmediata de JWTs entre instancias.
 */
const userSessionSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'AdminUser', 
        required: true, 
        index: true 
    },
    userName: { 
        type: String,
        required: true 
    },
    userEmail: { 
        type: String 
    },
    userRole: { 
        type: String 
    },
    deviceId: { 
        type: String, 
        required: true, 
        index: true 
    },
    deviceName: { 
        type: String, 
        default: 'Dispositivo desconocido' 
    },
    deviceStatus: { 
        type: String, 
        enum: ['trusted', 'pending_verification', 'revoked', 'unknown'], 
        default: 'unknown',
        index: true 
    },
    status: { 
        type: String, 
        enum: ['active', 'revoked', 'expired', 'logged_out'], 
        default: 'active', 
        index: true 
    },
    ip: { 
        type: String 
    },
    userAgent: { 
        type: String 
    },
    loginAt: { 
        type: Date, 
        default: Date.now 
    },
    lastActiveAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    },
    expiresAt: { 
        type: Date, 
        required: true, 
        index: { expires: 0 } // TTL automático de MongoDB al expirar la sesión
    },
    revokedAt: { 
        type: Date 
    },
    revokedBy: { 
        type: String 
    },
    revocationReason: { 
        type: String 
    }
}, { 
    timestamps: true 
});

userSessionSchema.index({ sessionId: 1, status: 1 });
userSessionSchema.index({ userId: 1, status: 1 });
userSessionSchema.index({ deviceId: 1, status: 1 });

const UserSession = mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);
export default UserSession;

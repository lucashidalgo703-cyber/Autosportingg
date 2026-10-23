import mongoose from 'mongoose';

/**
 * Esquema de Pestillo Global de Mantenimiento y Drenaje de Escrituras
 * Persistido en MongoDB para coordinación atómica entre múltiples instancias (serverless / multi-proceso).
 * Bloquea nuevas solicitudes mutativas mientras se drenan operaciones en vuelo y se sella la colección de auditoría.
 */
const maintenanceLockSchema = new mongoose.Schema({
    lockId: {
        type: String,
        required: true,
        unique: true,
        default: 'global_write_lock'
    },
    active: {
        type: Boolean,
        default: false,
        index: true
    },
    mode: {
        type: String,
        enum: ['IDLE', 'DRAINING', 'MAINTENANCE', 'SEALED'],
        default: 'IDLE'
    },
    reason: {
        type: String,
        default: null
    },
    lockedAt: {
        type: Date,
        default: null
    },
    lockedBy: {
        type: String,
        default: 'SYSTEM_ADMIN'
    },
    bypassTokenHash: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const MaintenanceLock = mongoose.models.MaintenanceLock || mongoose.model('MaintenanceLock', maintenanceLockSchema);
export default MaintenanceLock;

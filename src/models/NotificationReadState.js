import mongoose from 'mongoose';

const notificationReadStateSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Almacenamos el email o username para soporte hibrido
    notificationKey: { type: String, required: true },
    readAt: { type: Date, default: Date.now },
    dismissedAt: { type: Date }
}, {
    timestamps: true
});

// Indice compuesto para busqueda rapida por usuario y key
notificationReadStateSchema.index({ userId: 1, notificationKey: 1 }, { unique: true });

const NotificationReadState = mongoose.models.NotificationReadState || mongoose.model('NotificationReadState', notificationReadStateSchema);
export default NotificationReadState;

import mongoose from 'mongoose';

const mandateSchema = new mongoose.Schema({
    // Datos del Mandante
    clientName: { type: String, required: true },
    dniCuit: { type: String },
    address: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    
    // Vehículo
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String },
    plate: { type: String },
    mileage: { type: Number },
    
    // Mandato
    mandateDate: { type: Date, required: true },
    termDays: { type: Number, required: true },
    procedureType: { type: String },
    representativeName: { type: String, required: true },
    registryOffice: { type: String },
    
    // Equipamiento/Documentación
    bodyType: { type: String },
    engineNumber: { type: String },
    chassisNumber: { type: String },
    previousOwners: { type: Number },
    officialServices: { type: Boolean, default: false },
    manuals: { type: Boolean, default: false },
    duplicateKeys: { type: Boolean, default: false },
    spareTire: { type: Boolean, default: false },
    
    // Valor
    value: { type: Number },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    
    // Estado y Vínculos
    status: {
        type: String,
        enum: ['activo', 'vencido', 'cerrado', 'borrado'],
        default: 'activo'
    },
    linkedCarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    createdByUsername: { type: String }
}, { timestamps: true });

// Soft-delete query middleware
mandateSchema.pre('find', function() {
    if (this.getQuery().status !== 'borrado') {
        this.where({ status: { $ne: 'borrado' } });
    }
});

const Mandate = mongoose.models.Mandate || mongoose.model('Mandate', mandateSchema);

export default Mandate;

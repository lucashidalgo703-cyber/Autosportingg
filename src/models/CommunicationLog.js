import mongoose from 'mongoose';

const communicationLogSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ["client", "lead", "sale", "reservation", "postventa", "vehicle"],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        default: null
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        default: null
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sale",
        default: null
    },
    reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
        default: null
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car",
        default: null
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminUser",
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminUser",
        required: true
    },
    channel: {
        type: String,
        enum: ["whatsapp", "phone", "email", "in_person", "instagram", "facebook", "web", "internal_note", "other"],
        required: true
    },
    direction: {
        type: String,
        enum: ["inbound", "outbound", "internal"],
        default: "outbound"
    },
    outcome: {
        type: String,
        enum: [
            "contacted",
            "no_response",
            "interested",
            "not_interested",
            "pending_reply",
            "requested_financing",
            "requested_visit",
            "requested_documentation",
            "documentation_sent",
            "reservation_followup",
            "sale_followup",
            "post_sale_followup",
            "review_requested",
            "complaint",
            "resolved",
            "other"
        ],
        default: "contacted"
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        default: "",
        trim: true
    },
    contactDate: {
        type: Date,
        default: Date.now
    },
    nextActionDate: {
        type: Date,
        default: null
    },
    shouldCreateTask: {
        type: Boolean,
        default: false
    },
    relatedTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CrmTask",
        default: null
    },
    isImportant: {
        type: Boolean,
        default: false
    },
    sourceModule: {
        type: String,
        enum: ["clientes", "leads", "ventas", "reservas", "postventa", "agenda", "mis_pendientes", "manual"],
        default: "manual"
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

communicationLogSchema.index({ entityType: 1, entityId: 1 });
communicationLogSchema.index({ contactDate: -1 });
communicationLogSchema.index({ isDeleted: 1 });

const CommunicationLog = mongoose.models.CommunicationLog || mongoose.model('CommunicationLog', communicationLogSchema);

export default CommunicationLog;

import mongoose from 'mongoose';

const assignmentAuditSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['CREADA', 'MODIFICADA', 'LIBERADA', 'ANULADA'],
        required: true
    },
    user: { type: String, required: true },
    date: { type: Date, default: Date.now },
    previousAmount: { type: Number },
    newAmount: { type: Number },
    details: { type: String },
    reason: { type: String }
}, { _id: false });

const expenseQuotaAssignmentSchema = new mongoose.Schema({
    expenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
        index: true
    },
    installmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Installment',
        required: true,
        index: true
    },
    assignedAmount: {
        type: Number,
        required: true,
        min: 0.01
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        required: true
    },
    status: {
        type: String,
        enum: ['activa', 'liberada', 'anulada'],
        default: 'activa',
        index: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    assignedBy: {
        type: String,
        default: 'Admin'
    },
    releasedAt: {
        type: Date
    },
    releasedBy: {
        type: String
    },
    releaseReason: {
        type: String
    },
    notes: {
        type: String
    },
    auditLog: [assignmentAuditSchema]
}, {
    timestamps: true
});

expenseQuotaAssignmentSchema.index({ expenseId: 1, status: 1 });
expenseQuotaAssignmentSchema.index({ installmentId: 1, status: 1 });

const ExpenseQuotaAssignment = mongoose.models.ExpenseQuotaAssignment || mongoose.model('ExpenseQuotaAssignment', expenseQuotaAssignmentSchema);

export default ExpenseQuotaAssignment;

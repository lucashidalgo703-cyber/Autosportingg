import mongoose from 'mongoose';

const teamGoalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    periodType: { type: String, enum: ['weekly', 'monthly', 'custom'], required: true },
    periodLabel: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    targets: {
        tasksCompleted: { type: Number, default: 0 },
        leadsWorked: { type: Number, default: 0 },
        reservationsManaged: { type: Number, default: 0 },
        salesUpdated: { type: Number, default: 0 },
        documentationCompleted: { type: Number, default: 0 },
        postSalesManaged: { type: Number, default: 0 },
        reviewsRequested: { type: Number, default: 0 },
        reviewsReceived: { type: Number, default: 0 }
    },
    notes: { type: String, trim: true },
    createdBy: { type: String }, // Email or name of admin who created
    updatedBy: { type: String }
}, {
    timestamps: true
});

const TeamGoal = mongoose.models.TeamGoal || mongoose.model('TeamGoal', teamGoalSchema);
export default TeamGoal;

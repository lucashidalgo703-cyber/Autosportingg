import mongoose from 'mongoose';

export const ISSUE_REPORT_CATEGORIES = ['bug', 'falla', 'otro'];
export const ISSUE_REPORT_PRIORITIES = ['low', 'medium', 'high'];
export const ISSUE_REPORT_STATUSES = ['new', 'in_review', 'resolved', 'closed'];

const attachmentSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 180 },
    contentType: { type: String, enum: ['image/png', 'image/jpeg', 'image/webp'], required: true },
    size: { type: Number, required: true, max: 3 * 1024 * 1024 },
    data: { type: Buffer, required: true, select: false }
});
const commentSchema = new mongoose.Schema({
    text: { type: String, required: true, maxlength: 2000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    createdAt: { type: Date, default: Date.now }
});
const issueReportSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    category: { type: String, enum: ISSUE_REPORT_CATEGORIES, default: 'bug' },
    priority: { type: String, enum: ISSUE_REPORT_PRIORITIES, default: 'medium' },
    status: { type: String, enum: ISSUE_REPORT_STATUSES, default: 'new' },
    module: { type: String, maxlength: 100, default: '' },
    steps: { type: String, maxlength: 5000, default: '' },
    expectedBehavior: { type: String, maxlength: 3000, default: '' },
    actualBehavior: { type: String, maxlength: 3000, default: '' },
    pageUrl: { type: String, maxlength: 500, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    attachments: { type: [attachmentSchema], validate: entries => entries.length <= 3 && entries.reduce((total, file) => total + file.size, 0) <= 3 * 1024 * 1024 },
    comments: { type: [commentSchema], validate: entries => entries.length <= 100 }
}, { timestamps: true });

issueReportSchema.index({ author: 1, createdAt: -1 });
issueReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.IssueReport || mongoose.model('IssueReport', issueReportSchema);

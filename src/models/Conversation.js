import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    participants: {
        type: [String],
        required: true,
        index: true
    }, // array of usernames
    type: {
        type: String,
        enum: ['general', 'direct', 'group'],
        default: 'direct'
    },
    groupName: { type: String },
    subject: { type: String },
    relatedEntity: {
        entityType: { type: String, enum: ['client', 'lead', 'sale', 'car', 'task'] },
        entityId: { type: mongoose.Schema.Types.ObjectId }
    },
    lastMessageAt: { type: Date, default: Date.now },
    archivedBy: { type: [String], default: [] }, // usernames who have archived this conversation
    clearedAt: {
        type: Map,
        of: Date,
        default: {}
    } // map of username -> date they cleared history
}, {
    timestamps: true
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;

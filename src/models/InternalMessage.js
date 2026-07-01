import mongoose from 'mongoose';

const internalMessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    author: { type: String, required: true }, // username
    content: { type: String, required: true },
    attachments: [{
        filename: String,
        contentType: String,
        size: Number,
        url: String // will store base64 data URI
    }],
    readBy: { type: [String], default: [] } // array of usernames who have read this message
}, {
    timestamps: true
});

const InternalMessage = mongoose.model('InternalMessage', internalMessageSchema);

export default InternalMessage;

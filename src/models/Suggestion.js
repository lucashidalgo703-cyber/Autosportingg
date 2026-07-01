import mongoose from 'mongoose';

const suggestionCommentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    date: { type: Date, default: Date.now }
}, { _id: false });

const suggestionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['UI', 'Funcionalidad', 'Error', 'Otro', 'diseno_ui', 'nueva_funcionalidad', 'error_bug', 'mejora_existente', 'otro'],
        default: 'nueva_funcionalidad'
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    status: { 
        type: String, 
        enum: ['nueva', 'evaluando', 'planificada', 'implementada', 'implementado', 'rechazada', 'pendiente', 'en_revision', 'en_progreso', 'no_aplicable'],
        default: 'pendiente'
    },
    attachments: [{
        name: String,
        url: String,
        contentType: String,
        size: Number,
        publicId: String
    }],
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'AdminUser',
        required: true 
    },
    comments: [suggestionCommentSchema]
}, { 
    timestamps: true 
});

const Suggestion = mongoose.models.Suggestion || mongoose.model('Suggestion', suggestionSchema);

export default Suggestion;

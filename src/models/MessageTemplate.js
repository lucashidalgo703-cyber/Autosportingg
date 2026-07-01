import mongoose from 'mongoose';

const messageTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      "lead",
      "client",
      "sale",
      "reservation",
      "post_sale",
      "installment",
      "documentation",
      "delivery",
      "review",
      "internal",
      "other"
    ],
    required: true
  },
  channel: {
    type: String,
    enum: ["whatsapp", "email", "phone_script", "internal_note", "other"],
    default: "whatsapp"
  },
  subject: {
    type: String,
    default: "",
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdminUser",
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdminUser",
    default: null
  }
}, { timestamps: true });

const MessageTemplate = mongoose.models.MessageTemplate || mongoose.model('MessageTemplate', messageTemplateSchema);

export default MessageTemplate;

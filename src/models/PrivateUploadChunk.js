import mongoose from 'mongoose';

// Only temporary staging uses TTL. Permanent document collections keep their own retention.
const schema = new mongoose.Schema({
    _id: { type: String, required: true },
    actorOwner: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    uploadId: { type: String, required: true },
    kind: { type: String, enum: ['upload', 'file', 'part'], required: true },
    fileCount: Number, fileIndex: Number, partIndex: Number, partCount: Number,
    fileName: String, mimeType: String, fileSize: Number, fileSha256: String,
    chunkSha256: String, data: { type: Buffer, select: false },
    expiresAt: { type: Date, required: true }
}, { timestamps: true, versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ actorOwner: 1, entityId: 1, uploadId: 1, kind: 1 });
export default mongoose.models.PrivateUploadChunk || mongoose.model('PrivateUploadChunk', schema);

import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    _id: {type:String,required:true},
    digest: {type:String,required:true},
    archiveId: {type:String,required:true},
    current: {type:mongoose.Schema.Types.Mixed,required:true},
    actorId: {type:String,required:true},
    createdAt: {type:Date,required:true}
}, {versionKey:false});

export default mongoose.models.FinancePeriodOperation || mongoose.model('FinancePeriodOperation',schema);

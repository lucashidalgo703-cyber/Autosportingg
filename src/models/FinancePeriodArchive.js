import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    _id: {type:String,required:true},
    sequence: {type:Number,required:true,immutable:true},
    startedAt: {type:Date,default:null,immutable:true},
    endedAt: {type:Date,required:true,immutable:true},
    agencyName: {type:String,required:true,immutable:true},
    reason: {type:String,required:true,immutable:true},
    actorId: {type:String,required:true,immutable:true},
    actorName: {type:String,default:'',immutable:true},
    snapshot: {type:mongoose.Schema.Types.Mixed,required:true,immutable:true},
    snapshotHash: {type:String,required:true,immutable:true},
    nextPeriodId: {type:String,required:true,immutable:true}
}, {versionKey:false});

schema.pre('save',function(){if(!this.isNew)throw Error('Los resúmenes de períodos archivados son inmutables.');});
for(const operation of ['updateOne','updateMany','findOneAndUpdate','replaceOne','findOneAndReplace','deleteOne','deleteMany','findOneAndDelete'])schema.pre(operation,function(){throw Error('Los resúmenes de períodos archivados son inmutables.');});

export default mongoose.models.FinancePeriodArchive || mongoose.model('FinancePeriodArchive',schema);

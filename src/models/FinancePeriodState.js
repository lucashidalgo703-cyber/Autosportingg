import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    _id: {type:String, default:'management'},
    revision: {type:Number, default:0, required:true},
    currentPeriodId: {type:String, default:null},
    currentStartedAt: {type:Date, default:null},
    currentSequence: {type:Number, default:1},
    updatedAt: {type:Date, default:null}
}, {versionKey:false});

export default mongoose.models.FinancePeriodState || mongoose.model('FinancePeriodState',schema);

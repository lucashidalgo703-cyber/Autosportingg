import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,sequence:{type:Number,default:0}});
export default mongoose.models.FinanceCloseSequence||mongoose.model('FinanceCloseSequence',schema);

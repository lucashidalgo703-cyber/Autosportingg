import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,payloadHash:{type:String,required:true},transactionIds:[{type:mongoose.Schema.Types.ObjectId,ref:'Transaction'}],actorId:String},{timestamps:true});
export default mongoose.models.FinanceTransfer || mongoose.model('FinanceTransfer',schema);

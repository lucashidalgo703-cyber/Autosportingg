import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,payloadHash:String,kind:String,planId:{type:mongoose.Schema.Types.ObjectId,ref:'FinancePayablePlan'},installmentId:{type:mongoose.Schema.Types.ObjectId,ref:'FinancePayableInstallment'},transactionId:{type:mongoose.Schema.Types.ObjectId,ref:'Transaction'}},{timestamps:true});
export default mongoose.models.FinancePayableOperation||mongoose.model('FinancePayableOperation',schema);

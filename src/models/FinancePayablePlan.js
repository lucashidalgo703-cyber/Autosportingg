import mongoose from 'mongoose';
const schema=new mongoose.Schema({creditorName:{type:String,required:true,maxlength:300},debtType:{type:String,enum:['compra_gasto','auto_cuotas','financiera_banco'],required:true},concept:String,currency:{type:String,enum:['ARS','USD'],required:true},count:Number,frequency:String,firstDueDate:String,notes:String,carId:{type:mongoose.Schema.Types.ObjectId,ref:'Car'},createdBy:String},{timestamps:true});
export default mongoose.models.FinancePayablePlan||mongoose.model('FinancePayablePlan',schema);

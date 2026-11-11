import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 transactionId:{type:mongoose.Schema.Types.ObjectId,ref:'Transaction',required:true,index:true},
 filename:{type:String,required:true,maxlength:180},contentType:{type:String,required:true},size:{type:Number,required:true,min:1,max:15*1024*1024},
 data:{type:Buffer,required:true,select:false},sha256:{type:String,required:true,select:false},
 uploadBatch:{type:String,required:true,select:false},uploadIndex:{type:Number,required:true},
 createdBy:{type:String,required:true},createdByName:String,deletedAt:{type:Date,default:null},deletedBy:{type:String,default:null}
},{timestamps:true});
schema.index({transactionId:1,deletedAt:1});
export default mongoose.models.FinanceDocument || mongoose.model('FinanceDocument',schema);

import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 clientId:{type:mongoose.Schema.Types.ObjectId,ref:'Client',required:true,index:true},
 filename:{type:String,required:true,maxlength:180},contentType:{type:String,required:true},size:{type:Number,required:true,min:1,max:5*1024*1024},
 data:{type:Buffer,required:true,select:false},sha256:{type:String,required:true,select:false},
 uploadBatch:{type:String,required:true,select:false},uploadIndex:{type:Number,required:true},
 createdBy:{type:String,required:true},createdByName:String,deletedAt:{type:Date,default:null},deletedBy:{type:String,default:null}
},{timestamps:true});
schema.index({clientId:1,deletedAt:1});
export default mongoose.models.ClientDocument || mongoose.model('ClientDocument',schema);

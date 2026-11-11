import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,owner:String,payloadHash:String,result:mongoose.Schema.Types.Mixed,version:{type:Number,default:0}},{timestamps:true});
export default mongoose.models.ClientImportRun || mongoose.model('ClientImportRun',schema);

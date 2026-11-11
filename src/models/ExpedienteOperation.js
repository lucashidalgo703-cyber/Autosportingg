import mongoose from 'mongoose';
const schema=new mongoose.Schema({saleId:{type:mongoose.Schema.Types.ObjectId,ref:'Sale',required:true},actorId:{type:String,required:true},key:{type:String,required:true},digest:{type:String,required:true},action:{type:String,required:true}},{timestamps:true});
schema.index({saleId:1,actorId:1,key:1},{unique:true});
export default mongoose.models.ExpedienteOperation||mongoose.model('ExpedienteOperation',schema);

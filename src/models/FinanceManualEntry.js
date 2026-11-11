import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 kind:{type:String,enum:['deposit','payable'],required:true},label:{type:String,required:true,maxlength:500},
 status:{type:String,enum:['Recibida','Aplicada','Devuelta','Pendiente','Disponible','Pagado'],required:true},
 amount:{type:Number,required:true,min:0},currency:{type:String,enum:['ARS','USD'],required:true},date:{type:Date,required:true},
 accountId:{type:mongoose.Schema.Types.ObjectId,ref:'Account',default:null},clientId:{type:mongoose.Schema.Types.ObjectId,ref:'Client',default:null},saleId:{type:mongoose.Schema.Types.ObjectId,ref:'Sale',default:null},
 clientName:{type:String,maxlength:300},clientPhone:{type:String,maxlength:100},notes:{type:String,maxlength:5000},
 transactionId:{type:mongoose.Schema.Types.ObjectId,ref:'Transaction',default:null},
 appliedSaleDepositId:{type:mongoose.Schema.Types.ObjectId,default:null},
 createdBy:{type:String,required:true},updatedBy:String,idempotencyKey:{type:String,required:true},payloadHash:{type:String,required:true}
},{timestamps:true,optimisticConcurrency:true});
schema.index({createdBy:1,idempotencyKey:1},{unique:true});
export default mongoose.models.FinanceManualEntry||mongoose.model('FinanceManualEntry',schema);

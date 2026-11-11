import mongoose from 'mongoose';
const {Schema}=mongoose;
const party=new Schema({fullName:String,dniCuit:String,phone:String,email:String,birthDate:String,occupation:String,clientId:{type:Schema.Types.ObjectId,ref:'Client'}},{_id:false});
const document=new Schema({key:{type:String,required:true},label:{type:String,required:true},status:{type:String,enum:['pendiente','recibido','no_aplica','agencia'],default:'pendiente'},issueDate:String,validityDays:Number,required:Boolean,custom:Boolean,notes:String,updatedAt:Date,updatedBy:String},{_id:false});
const confirmation=new Schema({confirmed:{type:Boolean,default:false},confirmedAt:Date,confirmedBy:String,note:String},{_id:false});
const expense=new Schema({concept:String,amount:Number,currency:{type:String,enum:['ARS','USD']},status:{type:String,enum:['pending','retained'],default:'pending'},accountId:{type:Schema.Types.ObjectId,ref:'Account'},notes:String,financeManualEntryId:{type:Schema.Types.ObjectId,ref:'FinanceManualEntry'},transactionId:{type:Schema.Types.ObjectId,ref:'Transaction'},createdAt:Date,createdBy:String,updatedAt:Date,updatedBy:String,deletedAt:Date});
const note=new Schema({text:String,date:Date,author:String,authorId:String});
const account=new Schema({bank:String,cbuAlias:String,holder:String,amount:Number,currency:{type:String,enum:['ARS','USD']},notes:String});
const task=new Schema({title:String,dueDate:String,responsibleId:{type:Schema.Types.ObjectId,ref:'AdminUser'},completed:{type:Boolean,default:false},completedAt:Date,completedBy:String,createdAt:Date,createdBy:String,deletedAt:Date});
export const expedienteSchema=new Schema({
    title:String,openedAt:String,priority:{type:String,enum:['high','medium','low'],default:'medium'},linkedGestoriaId:{type:Schema.Types.ObjectId,ref:'Gestoria'},externalGestor:{name:String,phone:String},
    parties:{seller:party,buyer:party},documents:{seller:[document],buyer:[document],procedure:[document]},confirmations:{buyer:confirmation,consignment:confirmation},
    registrationAccounts:[account],registrationDeposit:{amount:Number,currency:{type:String,enum:['ARS','USD']},notes:String},refundDeclared:Boolean,
    milestones:{sellerDocsSigned:Boolean,duplicateDelivered:Boolean,procedureComplete:Boolean,papersDelivered:Boolean},expenses:{seller:[expense],buyer:[expense]},
    tasks:[task],generalNotes:[note],archivedAt:Date,archivedBy:String,archiveReason:String,writeNonce:{type:String,select:false}
},{_id:false});

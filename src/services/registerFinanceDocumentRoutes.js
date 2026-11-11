import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import {listFinanceDocuments,findCommittedFinanceDocumentUpload,uploadFinanceDocuments,readFinanceDocument,setFinanceDocumentDeleted,financeDocumentDisposition} from './financeDocumentService.js';
import {stagePrivateUpload,assemblePrivateUpload,cleanupPrivateUpload,privateUploadManifestHash} from './privateUploadService.js';
import {sendPrivateDocument} from '../utils/privateDocumentTransport.js';
const config={maxFiles:5,maxBytes:15*1024*1024};
export function registerFinanceDocumentRoutes(app,{authenticateToken,readPermission,writePermission,connectDB}){
 const base='/api/admin/transactions/:transactionId',read=[authenticateToken,readPermission],write=[...read,writePermission];
 const handler=work=>async(req,res)=>{try{await connectDB();res.setHeader('Cache-Control','private, no-store');await work(req,res);}catch(error){res.status(error.statusCode||500).json({message:error.statusCode?error.message:'No se pudo gestionar el comprobante.',code:error.code});}};
 const scope=async req=>{if(!mongoose.isValidObjectId(req.params.transactionId)||!await Transaction.exists({_id:req.params.transactionId}))throw Object.assign(Error('El movimiento no existe.'),{statusCode:404});return {actorId:String(req.user.id||req.user.userId),entityId:'transaction:'+req.params.transactionId,uploadId:req.params.uploadId.toLowerCase()};};
 app.get(base+'/documents',...read,handler(async(req,res)=>res.json(await listFinanceDocuments(req.params.transactionId))));
 app.get(base+'/documents/:documentId',...read,handler(async(req,res)=>{const file=await readFinanceDocument(req.params.transactionId,req.params.documentId,req.user);sendPrivateDocument(res,file,req.headers.range,financeDocumentDisposition(file.metadata.filename));}));
 app.patch(base+'/documents/:documentId',...write,handler(async(req,res)=>res.json(await setFinanceDocumentDeleted(req.params.transactionId,req.params.documentId,req.body.deleted,req.user))));
 app.post(base+'/document-uploads/:uploadId/chunks',...write,handler(async(req,res)=>res.json(await stagePrivateUpload({...await scope(req),payload:req.body,config}))));
 app.post(base+'/document-uploads/:uploadId/commit',...write,handler(async(req,res)=>{
  const context=await scope(req);
  if(!/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(context.uploadId))throw Object.assign(Error('La carga debe tener una identificación UUID válida.'),{statusCode:400});
  const expected=req.body.manifest===undefined?null:privateUploadManifestHash(req.body.manifest,config);
  const previous=await findCommittedFinanceDocumentUpload(req.params.transactionId,context.uploadId,req.user,req.body.manifest);
  if(previous)return res.status(201).json(previous);
  const assembled=await assemblePrivateUpload({...context,config});
  if(expected&&expected!==assembled.manifestHash)throw Object.assign(Error('El manifiesto no coincide con los comprobantes.'),{statusCode:409});
  const result=await uploadFinanceDocuments(req.params.transactionId,assembled.files,context.uploadId,req.user);
  await cleanupPrivateUpload(context).catch(()=>{});res.status(201).json(result);
 }));
}

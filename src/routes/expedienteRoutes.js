import {PERMISSIONS,hasPermission} from '../utils/adminPermissions.js';
import {listExpedientes,getExpediente,updateExpediente,updateExpedienteParty,updateExpedienteDocument,addExpedienteDocument,changeExpedienteStatus,confirmExpedienteParty,appendExpedienteNote,addExpedienteTask,updateExpedienteTask,archiveExpediente,updateExpedienteAdministration,saveExpedienteExpense,linkExpedienteExpensePayment,payExpedienteExpense} from '../services/expedienteService.js';

export function registerExpedienteRoutes(app,{authenticateToken,requirePermission,connectDB}){
    const read=[authenticateToken,requirePermission(PERMISSIONS.VENTAS_READ)],write=[...read,requirePermission(PERMISSIONS.VENTAS_WRITE)];
    const handle=work=>async(req,res)=>{try{await connectDB();res.setHeader('Cache-Control','private, no-store');await work(req,res);}catch(error){const status=error.statusCode||(['VersionError','DocumentNotFoundError'].includes(error.name)?409:500);res.status(status).json({message:status===500?'No se pudo completar la gestión del expediente.':error.message,code:error.code||'EXPEDIENTE_ERROR',...(error.errors?{errors:error.errors}:{})});}};
    const endpoint='/api/admin/expedientes';
    app.get(endpoint,...read,handle(async(req,res)=>{if(req.query.export==='1'&&!hasPermission(req.user,PERMISSIONS.REPORTES_EXPORT)&&!hasPermission(req.user,PERMISSIONS.EXPORTS_READ)&&!['owner','admin'].includes(req.user.role))return res.status(403).json({message:'No tenés permiso de exportación.'});res.json(await listExpedientes(req.query,req.user));}));
    app.get(endpoint+'/:id',...read,handle(async(req,res)=>res.json(await getExpediente(req.params.id,req.user))));
    app.patch(endpoint+'/:id',...write,handle(async(req,res)=>res.json(await updateExpediente(req.params.id,req.body,req.user))));
    app.patch(endpoint+'/:id/parties/:party',...write,handle(async(req,res)=>res.json(await updateExpedienteParty(req.params.id,req.params.party,req.body,req.user))));
    app.patch(endpoint+'/:id/documents/:party/:documentKey',...write,handle(async(req,res)=>res.json(await updateExpedienteDocument(req.params.id,req.params.party,req.params.documentKey,req.body,req.user))));
    app.post(endpoint+'/:id/documents/:party',...write,handle(async(req,res)=>res.status(201).json(await addExpedienteDocument(req.params.id,req.params.party,req.body,req.user))));
    app.post(endpoint+'/:id/status',...write,handle(async(req,res)=>res.json(await changeExpedienteStatus(req.params.id,req.body,req.user))));
    app.post(endpoint+'/:id/confirmations/:party',...write,handle(async(req,res)=>res.json(await confirmExpedienteParty(req.params.id,req.params.party,req.body,req.user))));
    app.post(endpoint+'/:id/notes',...write,handle(async(req,res)=>res.status(201).json(await appendExpedienteNote(req.params.id,req.body,req.user))));
    app.post(endpoint+'/:id/tasks',...write,handle(async(req,res)=>res.status(201).json(await addExpedienteTask(req.params.id,req.body,req.user))));
    app.patch(endpoint+'/:id/tasks/:taskId',...write,handle(async(req,res)=>res.json(await updateExpedienteTask(req.params.id,req.params.taskId,req.body,req.user))));
    app.delete(endpoint+'/:id/tasks/:taskId',...write,handle(async(req,res)=>res.json(await updateExpedienteTask(req.params.id,req.params.taskId,req.body,req.user,true))));
    app.post(endpoint+'/:id/archive',...write,handle(async(req,res)=>res.json(await archiveExpediente(req.params.id,req.body,req.user))));
    app.patch(endpoint+'/:id/administration',...write,handle(async(req,res)=>res.json(await updateExpedienteAdministration(req.params.id,req.body,req.user))));
    app.post(endpoint+'/:id/expenses/:party',...write,handle(async(req,res)=>res.status(201).json(await saveExpedienteExpense(req.params.id,req.params.party,null,req.body,req.user))));
    app.patch(endpoint+'/:id/expenses/:party/:expenseId',...write,handle(async(req,res)=>res.json(await saveExpedienteExpense(req.params.id,req.params.party,req.params.expenseId,req.body,req.user))));
    app.post(endpoint+'/:id/expenses/:party/:expenseId/link-payment',...write,handle(async(req,res)=>res.json(await linkExpedienteExpensePayment(req.params.id,req.params.party,req.params.expenseId,req.body,req.user))));
    app.post(endpoint+'/:id/expenses/:party/:expenseId/pay',...write,handle(async(req,res)=>res.json(await payExpedienteExpense(req.params.id,req.params.party,req.params.expenseId,req.body,req.user))));
}

import {listFinancePayableInstallments,createFinancePayablePlan,payFinancePayableInstallment} from './financePayablePlanService.js';
export function registerFinancePayablePlanRoutes(app,{authenticateToken,readPermission,writePermission,connectDB}){
 const handler=work=>async(req,res)=>{try{await connectDB();await work(req,res);}catch(error){res.status(error.status||500).json({message:error.status?error.message:'No se pudo completar la operación de cuotas a pagar.',errors:error.errors});}};
 app.get('/api/admin/finance/payable-installments',authenticateToken,readPermission,handler(async(req,res)=>res.json(await listFinancePayableInstallments())));
 app.post('/api/admin/finance/payable-plans',authenticateToken,readPermission,writePermission,handler(async(req,res)=>res.status(201).json(await createFinancePayablePlan(req.body,{actor:req.user,idempotencyKey:req.headers['x-idempotency-key']||req.body.idempotencyKey}))));
 app.post('/api/admin/finance/payable-installments/:id/pay',authenticateToken,readPermission,writePermission,handler(async(req,res)=>res.json(await payFinancePayableInstallment(req.params.id,req.body,{actor:req.user,idempotencyKey:req.headers['x-idempotency-key']||req.body.idempotencyKey}))));
}

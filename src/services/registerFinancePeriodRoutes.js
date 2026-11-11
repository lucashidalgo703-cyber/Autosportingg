import {listFinancePeriods,readFinancePeriod,startFinancePeriod} from './financePeriodService.js';

export function registerFinancePeriodRoutes(app,{authenticateToken,readPermission,writePermission,connectDB}){
    const handler=work=>async(req,res)=>{try{await connectDB();res.setHeader('Cache-Control','private, no-store');await work(req,res);}catch(error){res.status(error.status||500).json({message:error.status?error.message:'No se pudo completar la operación de períodos.',errors:error.errors});}};
    app.get('/api/admin/finance/periods',authenticateToken,readPermission,handler(async(req,res)=>res.json(await listFinancePeriods({page:req.query.page||1}))));
    app.get('/api/admin/finance/periods/:id',authenticateToken,readPermission,handler(async(req,res)=>res.json(await readFinancePeriod(req.params.id))));
    app.post('/api/admin/finance/periods',authenticateToken,readPermission,writePermission,handler(async(req,res)=>res.status(201).json(await startFinancePeriod(req.body,{actor:req.user,idempotencyKey:req.headers['x-idempotency-key']||req.body.idempotencyKey}))));
}

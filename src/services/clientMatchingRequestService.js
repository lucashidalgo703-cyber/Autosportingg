import mongoose from 'mongoose';
import Client from '../models/Client.js';
import Pedido from '../models/Pedido.js';
import {buildClientRequestSnapshot,isClientRequestActive} from '../utils/clientMatchingRequest.js';

const problem=(statusCode,message,errors)=>Object.assign(new Error(message),{statusCode,...(errors ? {errors} : {})});
function validateId(clientId) {if(!mongoose.isValidObjectId(clientId))throw problem(400,'El cliente no es válido.');}
async function linkedRequest(client,session=null) {
    if(!client.notificationRequestId)return null;
    const request=await Pedido.findOne({_id:client.notificationRequestId,clientId:client._id,source:'client_profile'}).session(session);
    if(!request)throw problem(409,'El pedido vinculado requiere revisión. No se modificó ningún pedido manual.');
    return request;
}
export async function getClientMatchingRequest(clientId) {
    validateId(clientId);
    const client=await Client.findById(clientId).select('notificationRequestId').lean();
    if(!client)throw problem(404,'El cliente no existe.');
    const pedido=await linkedRequest(client);
    return {pedido:pedido?.toObject() || null,enabled:isClientRequestActive(pedido)};
}
export async function setClientMatchingRequest(clientId,enabled,actor={}) {
    validateId(clientId);
    if(typeof enabled !== 'boolean')throw problem(400,'Indicá si el pedido debe permanecer activo.');
    const session=await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async()=>{
            const client=await Client.findById(clientId).session(session);
            if(!client)throw problem(404,'El cliente no existe.');
            let pedido=await linkedRequest(client,session);
            const user=String(actor.username || actor.name || actor.id || 'CRM_V2');
            if(!enabled && !pedido){result={pedido:null,enabled:false};return;}
            const wasActive=isClientRequestActive(pedido);
            if(enabled) {
                const snapshot=buildClientRequestSnapshot(client);
                if(!pedido) {
                    const id=new mongoose.Types.ObjectId();
                    // Every creator must claim the client row in this transaction.
                    // Concurrent claims conflict/retry against this same row, even
                    // when a deployment has not built an optional unique index.
                    const claimed=await Client.updateOne({_id:client._id,$or:[{notificationRequestId:null},{notificationRequestId:{$exists:false}}]},{$set:{notificationRequestId:id}},{session});
                    if(claimed.modifiedCount !== 1)throw problem(409,'El pedido cambió durante la operación. Volvé a cargar la ficha.');
                    const creator=mongoose.isValidObjectId(actor.id) ? actor.id : undefined;
                    [pedido]=await Pedido.create([{_id:id,...snapshot,source:'client_profile',status:'Pendiente',...(creator ? {createdBy:creator} : {}),auditLog:[{action:'ALTA_DESDE_CLIENTE',details:'Pedido activado expresamente desde la ficha del cliente. No se enviaron mensajes.',user}]}],{session});
                }else{
                    Object.assign(pedido,snapshot);
                    if(!wasActive)pedido.status='Pendiente';
                    pedido.auditLog.push({action:wasActive ? 'ACTUALIZACION_DESDE_CLIENTE' : 'REACTIVACION_DESDE_CLIENTE',details:'Criterios sincronizados con la ficha guardada del cliente. No se enviaron mensajes.',user});
                    await pedido.save({session});
                }
            }else if(wasActive) {
                const previousStatus=pedido.status;
                pedido.status='Cancelado';
                pedido.auditLog.push({action:'DESACTIVACION_DESDE_CLIENTE',field:'status',oldValue:previousStatus,newValue:'Cancelado',details:'Se desactivó únicamente el pedido originado desde esta ficha.',user});
                await pedido.save({session});
            }
            await Client.updateOne({_id:client._id,notificationRequestId:pedido._id},{$push:{clientAuditLog:{action:'PEDIDO_DESDE_FICHA',field:'notificationRequestId',newValue:pedido._id,details:enabled ? 'Pedido de búsqueda activado/sincronizado. Sin mensajes automáticos.' : 'Pedido de búsqueda vinculado desactivado.',user}}},{session});
            result={pedido:pedido.toObject(),enabled:isClientRequestActive(pedido)};
        });
        return result;
    }finally{await session.endSession();}
}

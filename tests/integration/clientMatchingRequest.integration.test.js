import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Client from '../../src/models/Client.js';
import Pedido from '../../src/models/Pedido.js';
import {getClientMatchingRequest,setClientMatchingRequest} from '../../src/services/clientMatchingRequestService.js';

let replSet;
const actor={id:String(new mongoose.Types.ObjectId()),username:'qa_request'};
const createClient=overrides=>Client.create({fullName:'Cliente ficticio',phone:'02975550101',brand:'Marca ficticia',model:'Modelo de prueba',yearFrom:2010,yearTo:2020,maxBudget:0,currency:'USD',...overrides});
before(async()=>{
    const {MongoMemoryReplSet}=await import('mongodb-memory-server');
    replSet=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});
    const uri=replSet.getUri('autosporting_request_test_'+crypto.randomBytes(6).toString('hex'));
    assert.match(uri,/127\.0\.0\.1/);
    mongoose.set('autoCreate',false);
    await mongoose.connect(uri);
    await Promise.all([Client.createCollection(),Pedido.createCollection()]);
},{timeout:300000});
beforeEach(async()=>{await Promise.all([Client.deleteMany({}),Pedido.deleteMany({})]);});
after(async()=>{await mongoose.disconnect();await replSet?.stop();});

test('a linked request uses real saved criteria and repeated activation updates that same request',async()=>{
    const client=await createClient();
    const first=await setClientMatchingRequest(String(client._id),true,actor);
    assert.equal(first.enabled,true);assert.equal(first.pedido.source,'client_profile');
    assert.equal(first.pedido.clientName,client.fullName);assert.equal(first.pedido.clientPhone,client.phone);
    assert.equal(first.pedido.requestedBrand,client.brand);assert.equal(first.pedido.requestedModel,client.model);
    assert.equal(first.pedido.yearRange,'2010 - 2020');assert.equal(first.pedido.budget,0);assert.equal(first.pedido.currency,'USD');
    await Client.updateOne({_id:client._id},{$set:{model:'Modelo actualizado',maxBudget:null}});
    const next=await setClientMatchingRequest(String(client._id),true,actor);
    assert.equal(String(next.pedido._id),String(first.pedido._id));
    assert.equal(next.pedido.requestedModel,'Modelo actualizado');assert.equal(next.pedido.budget,null);
    assert.equal(await Pedido.countDocuments(),1);
    const loaded=await getClientMatchingRequest(String(client._id));
    assert.equal(loaded.enabled,true);assert.equal(String(loaded.pedido._id),String(first.pedido._id));
});
test('concurrent activations serialize through the client link and never create duplicate linked requests',async()=>{
    const client=await createClient();
    const results=await Promise.all(Array.from({length:6},()=>setClientMatchingRequest(String(client._id),true,actor)));
    assert.equal(new Set(results.map(result=>String(result.pedido._id))).size,1);
    assert.equal(await Pedido.countDocuments({clientId:client._id,source:'client_profile'}),1);
    assert.equal(String((await Client.findById(client._id)).notificationRequestId),String(results[0].pedido._id));
},{timeout:30000});
test('deactivation closes only its linked request and leaves manual requests untouched',async()=>{
    const client=await createClient();
    const manual=await Pedido.create({clientId:client._id,requestedBrand:'Otra marca',requestedModel:'Otro modelo',status:'Buscando'});
    const linked=await setClientMatchingRequest(String(client._id),true,actor);
    const closed=await setClientMatchingRequest(String(client._id),false,actor);
    assert.equal(closed.enabled,false);assert.equal(closed.pedido.status,'Cancelado');
    assert.equal((await Pedido.findById(manual._id)).status,'Buscando');
    const reopened=await setClientMatchingRequest(String(client._id),true,actor);
    assert.equal(String(reopened.pedido._id),String(linked.pedido._id));assert.equal(reopened.enabled,true);
    assert.equal(await Pedido.countDocuments(),2);
});
test('missing search criteria reject activation without a partial client link or request',async()=>{
    const client=await createClient({brand:'',model:''});
    await assert.rejects(setClientMatchingRequest(String(client._id),true,actor),error=>error.statusCode === 400 && Boolean(error.errors.brand) && Boolean(error.errors.model));
    assert.equal((await Client.findById(client._id)).notificationRequestId,null);
    assert.equal(await Pedido.countDocuments(),0);
    assert.deepEqual(await setClientMatchingRequest(String(client._id),false,actor),{pedido:null,enabled:false});
});
test('a corrupt or manual pointer is reported without modifying any request',async()=>{
    const client=await createClient();
    const manual=await Pedido.create({clientId:client._id,requestedBrand:'Otra marca',requestedModel:'Otro modelo',status:'Pendiente'});
    await Client.updateOne({_id:client._id},{$set:{notificationRequestId:manual._id}});
    await assert.rejects(setClientMatchingRequest(String(client._id),false,actor),error=>error.statusCode === 409);
    assert.equal((await Pedido.findById(manual._id)).status,'Pendiente');
    assert.equal(await Pedido.countDocuments(),1);
});
test('failure after claiming the client rolls back its pointer and allows a safe retry',async t=>{
    const client=await createClient();
    t.mock.method(Pedido,'create',async()=>{throw new Error('QA controlled write failure');});
    await assert.rejects(setClientMatchingRequest(String(client._id),true,actor),/QA controlled/);
    t.mock.restoreAll();
    assert.equal((await Client.findById(client._id)).notificationRequestId,null);
    assert.equal(await Pedido.countDocuments(),0);
    const retry=await setClientMatchingRequest(String(client._id),true,actor);
    assert.equal(retry.enabled,true);assert.equal(await Pedido.countDocuments(),1);
});

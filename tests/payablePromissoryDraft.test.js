import test from 'node:test';
import assert from 'node:assert/strict';
import {newPayablePromissoryDraft,validatePayablePromissoryDraft,createPayablePromissoryDraftPdf,PROMISSORY_DRAFT_SOURCE} from '../src/utils/payablePromissoryDraft.js';
const plan={_id:'plan-qa',creditorName:'Acreedor ficticio',count:3};
const installments=[{_id:'cuota-1',number:1,amount:100,paidAmount:20,currency:'USD',dueDate:'2026-11-15'},{_id:'cuota-2',number:2,amount:100,paidAmount:0,currency:'USD',dueDate:'2026-12-15'},{_id:'cuota-3',number:3,amount:100,paidAmount:100,currency:'USD',dueDate:'2027-01-15'}];
const complete=()=>({...newPayablePromissoryDraft(plan,installments,{name:'Agencia ficticia',address:'Domicilio de prueba',dni:'00123456'},new Date('2026-11-10T15:00:00Z')),issuePlace:'Ciudad de prueba',creditorDocument:'00012345'});
test('drafts use only unpaid remainder, keep currency/date and leading document zeroes, and never mutate the debt source',()=>{
 const previous=JSON.stringify(installments),values=complete();assert.equal(values.rows[0].amount,80);assert.equal(values.rows[0].currency,'USD');assert.equal(values.rows[0].dueDate,'2026-11-15');assert.equal(values.rows[2].selected,false);assert.equal(values.rows[2].eligible,false);assert.equal(values.creditorDocument,'00012345');assert.equal(values.debtorDocument,'00123456');values.rows[0].amount=50;assert.equal(JSON.stringify(installments),previous);
});
test('missing identification, invalid amount/currency/date and fully paid selections cannot silently prepare an instrument',()=>{
 const values=complete();assert.deepEqual(validatePayablePromissoryDraft(values),{});values.issuePlace='';assert.ok(validatePayablePromissoryDraft(values).issuePlace);values.issuePlace='Ciudad';values.rows[0].currency='EUR';assert.ok(validatePayablePromissoryDraft(values).rows);values.rows[0].currency='USD';values.rows[0].dueDate='2026-02-30';assert.ok(validatePayablePromissoryDraft(values).rows);values.rows[0].dueDate='2026-11-15';values.rows[2].selected=true;values.rows[2].amount=1;assert.ok(validatePayablePromissoryDraft(values).rows);
});
test('real PDFs prepare one draft per selected installment with blank signature, visible draft marking and official reference',async()=>{
 const values=complete(),all=await createPayablePromissoryDraftPdf(values),one=await createPayablePromissoryDraftPdf(values,'cuota-2');assert.equal(all.getNumberOfPages(),2);assert.equal(one.getNumberOfPages(),1);const output=all.output();assert.match(output,/^%PDF-/);assert.ok(output.includes('BORRADOR PARA REVISION - SIN FIRMAR'));assert.ok(output.includes('Firma del suscriptor: EN BLANCO'));assert.ok(output.includes(PROMISSORY_DRAFT_SOURCE));assert.ok(output.includes('USD 80,00'));assert.equal(/sin protesto|jurisdiccion|intereses moratorios/i.test(output),false);
});

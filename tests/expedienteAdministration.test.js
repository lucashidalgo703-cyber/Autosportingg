import test from 'node:test';
import assert from 'node:assert/strict';
import {expedienteDocumentValues,expedienteExpenseInput,expedienteExpenseTotals,expedienteRegistryInput} from '../src/utils/expedienteAdministration.js';
import {newFinanceDocument} from '../src/utils/financeDocuments.js';

test('expediente amounts remain in their own currency and invalid imports are reported',()=>{
    const result=expedienteExpenseTotals([{amount:300000,currency:'USD'},{amount:1200.35,currency:'ARS'},{amount:0.15,currency:'ARS'},{amount:500,currency:'EUR'},{amount:-10,currency:'USD'},{amount:99,currency:'ARS',deletedAt:new Date()}]);
    assert.deepEqual(result,{totals:{ARS:1200.5,USD:300000},invalid:2});
});
test('expense declarations cannot pretend to be paid and registry accounts validate independently of their total',()=>{
    assert.ok(expedienteExpenseInput({concept:'Arancel',amount:100,currency:'ARS',status:'paid'}).errors.status);
    assert.equal(expedienteExpenseInput({concept:'Arancel',amount:'1.250,75',currency:'ARS',status:'pending'}).payload.amount,1250.75);
    const invalid=expedienteRegistryInput({registrationAccounts:[{id:'a',bank:'Banco',cbuAlias:'',holder:'Titular',amount:500,currency:'ARS'}],registrationDeposit:{amount:1000,currency:'ARS'}});
    assert.ok(invalid.errors.account0);
    const valid=expedienteRegistryInput({registrationAccounts:[{id:'a',bank:'Banco',cbuAlias:'alias.ejemplo',holder:'Titular',amount:500,currency:'ARS'}],registrationDeposit:{amount:1000,currency:'ARS'}});
    assert.deepEqual(valid.errors,{});assert.equal(valid.payload.registrationAccounts[0].amount,500);assert.equal(valid.payload.registrationDeposit.amount,1000);
});
test('purchase and sale documents preserve different parties and original acquisition currency',()=>{
    const detail={id:'operation',parties:{seller:{fullName:'Vendedor QA',dniCuit:'00000000'},buyer:{fullName:'Comprador QA',dniCuit:'11111111'}},vehicle:{brand:'Marca',model:'Modelo',plate:'QA'},finance:{salePrice:10000000,currency:'ARS',acquisitionCost:{known:true,amount:8000,currency:'USD'}}};
    const agency={name:'Agencia QA',dni:'22222222'};
    const purchase=expedienteDocumentValues(detail,'purchase',agency),sale=expedienteDocumentValues(detail,'sale',agency);
    assert.equal(purchase.buyer.name,'Agencia QA');assert.equal(purchase.seller.name,'Vendedor QA');assert.equal(purchase.amount,8000);assert.equal(purchase.currency,'USD');
    assert.equal(sale.buyer.name,'Comprador QA');assert.equal(sale.seller.name,'Agencia QA');assert.equal(sale.amount,10000000);assert.equal(sale.currency,'ARS');
    assert.equal(newFinanceDocument(purchase).seller.dni,'00000000');assert.equal(Object.hasOwn(newFinanceDocument(),'seller'),false);
    const unknown=expedienteDocumentValues({...detail,finance:{...detail.finance,acquisitionCost:{known:false,amount:null,currency:null}}},'purchase',agency);
    assert.equal(unknown.amount,'');
    assert.equal(unknown.paymentMethod,'');
    const financed=expedienteDocumentValues({...detail,finance:{...detail.finance,paymentMethod:'financiado',financingDetails:{hasFinancing:true,installmentsCount:12,financedBalance:6000000,installmentAmount:500000}}},'sale',agency);
    assert.equal(financed.paymentMethod,'Financiado');assert.equal(financed.financing.installments,12);assert.equal(financed.financing.amount,6000000);
    assert.equal(expedienteDocumentValues({...detail,finance:{...detail.finance,paymentMethod:'mixto'}},'sale',agency).paymentOther,'Pago mixto');
});

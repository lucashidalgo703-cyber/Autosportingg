import test from 'node:test';
import assert from 'node:assert/strict';
import {parseClientDocumentText,clientDocumentOcrPatch} from '../src/utils/clientDocumentText.js';
test('explicit DNI labels produce a reviewable profile without contact, seller or interaction changes',()=>{
 const values=parseClientDocumentText('APELLIDO / SURNAME\nPrueba\nNOMBRE / NAME\nPersona QA\nDOCUMENTO: 00.000.000\nFECHA DE NACIMIENTO: 01/02/1990\nSEXO / SEX: F\nDOMICILIO: Calle ficticia 123');
 assert.deepEqual(values,{fullName:'Persona QA Prueba',dniCuit:'00000000',birthDate:'1990-02-01',gender:'mujer',address:'Calle ficticia 123'});
});
test('unlabelled names, numbers, trámite dates and narrative text never invent identity data',()=>{
 assert.deepEqual(parseClientDocumentText('Persona cualquiera\n00000000\n1990-01-01\nTRAMITE: 12345678901\nLlamar mañana'),{});
 assert.deepEqual(parseClientDocumentText('NOMBRE: Cliente QA\nFECHA DE NACIMIENTO: 31/02/1990'),{fullName:'Cliente QA'});
});
test('calendar formats include ISO and DNI month labels and preserve leading zeros in declarations',()=>{
 assert.equal(parseClientDocumentText('FECHA DE NACIMIENTO: 1990-02-01').birthDate,'1990-02-01');
 assert.equal(parseClientDocumentText('FECHA DE NACIMIENTO: 01 ENE / JAN 1990').birthDate,'1990-01-01');
 assert.equal(parseClientDocumentText('CUIT: 20-00000000-3').dniCuit,'20000000003');
});
test('only individually selected allowed fields apply; malformed dates and operational fields are excluded',()=>{
 const values={fullName:'Persona QA',dniCuit:'00000000',birthDate:'2026-02-30',gender:'mujer',assignedTo:'seller',contactConfirmed:true,newInteraction:{type:'otro'}};
 assert.deepEqual(clientDocumentOcrPatch(values,['dniCuit','assignedTo','contactConfirmed','newInteraction','birthDate']),{dniCuit:'00000000'});
 assert.deepEqual(clientDocumentOcrPatch(values,['fullName','gender']),{fullName:'Persona QA',gender:'mujer'});
});

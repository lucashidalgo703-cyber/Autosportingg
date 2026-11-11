// Real offline recognition of a generated fictional document; no customer image.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {createWorker} from 'tesseract.js';
import {resolve} from 'node:path';
import {access} from 'node:fs/promises';
import {parseClientDocumentText} from '../src/utils/clientDocumentText.js';
test('the installed OCR engine reads a fictional image using only local language models',async()=>{
 for(const lang of ['spa','eng'])await access(resolve('public/ocr/lang',lang+'.traineddata.gz'));
 const canvas=createCanvas(1600,850),context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,1600,850);context.fillStyle='#000';context.font='44px Arial';
 const lines=['DOCUMENTO DE PRUEBA - SIN VALIDEZ','APELLIDO: PRUEBA','NOMBRE: PERSONA QA','DOCUMENTO: 00000000','FECHA DE NACIMIENTO: 01/02/1990','SEXO: F','DOMICILIO: CALLE FICTICIA 123'];
 lines.forEach((line,index)=>context.fillText(line,60,90+index*95));
 const worker=await createWorker('spa+eng',1,{langPath:resolve('public/ocr/lang'),cacheMethod:'none',gzip:true});
 try{
  await worker.setParameters({tessedit_pageseg_mode:'6'});
  const result=await worker.recognize(canvas.toBuffer('image/png'));
  const proposal=parseClientDocumentText(result.data.text);
  assert.match(proposal.fullName,/PERSONA QA.*PRUEBA/i);assert.equal(proposal.dniCuit,'00000000');assert.equal(proposal.birthDate,'1990-02-01');assert.equal(proposal.gender,'mujer');
 }finally{await worker.terminate();}
},{timeout:180000});

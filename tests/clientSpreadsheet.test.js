import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {CLIENT_SPREADSHEET_COLUMNS,parseClientSpreadsheetRows,exportClientRows,clientSpreadsheetTemplateRows,clientSpreadsheetDate} from '../src/utils/clientSpreadsheet.js';
const profile={_id:'64a000000000000000000001',fullName:'Persona de prueba',firstName:'Persona',lastName:'de prueba',phone:'00549011111111',email:'persona@example.test',dniCuit:'00123456',segment:'vip',gender:'mujer',address:'Dirección ficticia',locality:'Localidad QA',province:'Provincia QA',birthDate:'1990-06-05T00:00:00Z',occupation:'Ocupación QA',description:'Busca un vehículo',vehicleOfInterest:'Referencia QA',interestedVehicleId:{_id:'64a000000000000000000002'},assignedTo:{_id:'64a000000000000000000003',name:'Vendedor QA'},pipelineStage:'cerrado',contactConfirmed:false,source:'facebook',reason:'entro_puerta',type:'ambos',status:'activo',doNotContact:true,purchaseMethod:'financiacion',purchaseTiming:'1_3_meses',availableDownPayment:0,downPaymentCurrency:'USD',tradeInIntent:'si',brand:'Marca QA',model:'Modelo QA',yearFrom:2010,yearTo:2020,maxBudget:0,currency:'ARS',lastContactDate:'2026-11-01T00:00:00Z',createdAt:'2026-11-10T01:30:00Z',nextAction:'Revisar opciones',nextActionDate:'2026-12-01T00:00:00Z',notes:'Nota con\nsalto de línea',tags:['QA','Etiqueta; con separador']};
test('real XLSX serialization preserves profile values, text identity, null contact declaration and separate currencies',()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(exportClientRows([profile])),'Clientes');
 const read=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
 const {rows,unknownHeaders}=parseClientSpreadsheetRows(XLSX.utils.sheet_to_json(read.Sheets.Clientes,{defval:'',raw:true}));
 const {values,errors}=rows[0];assert.deepEqual(errors,{});assert.deepEqual(unknownHeaders,[]);
 for(const key of ['fullName','firstName','lastName','phone','email','dniCuit','segment','gender','address','locality','province','occupation','description','vehicleOfInterest','pipelineStage','contactConfirmed','source','reason','type','status','doNotContact','purchaseMethod','purchaseTiming','availableDownPayment','downPaymentCurrency','tradeInIntent','brand','model','yearFrom','yearTo','maxBudget','currency','nextAction','notes','tags'])assert.deepEqual(values[key],profile[key],key);
 assert.equal(values.createdAt,'2026-11-09');assert.equal(values.birthDate,'1990-06-05');assert.equal(values.lastContactDate,'2026-11-01');assert.equal(values.nextActionDate,'2026-12-01');
 assert.equal(values._clientId,profile._id);assert.equal(values.assignedTo,profile.assignedTo._id);assert.equal(values.interestedVehicleId,profile.interestedVehicleId._id);
});
test('headers and accents are normalized, all reference aliases work in arbitrary order, and name alone is valid',()=>{
 const row={'WHATSAPP':'teléfono QA','CUMPLEAÑOS':'05/06/1990','Asesor':'Vendedor QA','Stage':'Primera atención','Canal':'Showroom','Busca':'Automático','Dirección':'Domicilio QA','CUIL':'00123456','Mail':'qa@example.test','Nómbre':'Cliente ficticio','Ocupacion':'QA','Marca de interes':'Marca QA','Modelo de interés':'Modelo QA','Ano desde':'2010','Año hasta':'2020','Presupuesto max':'25.000,50','F. alta':'10/11/2026','Ultimo contacto':'01/11/2026'};
 const parsed=parseClientSpreadsheetRows([row]).rows[0];assert.deepEqual(parsed.errors,{});assert.equal(parsed.values.phone,row.WHATSAPP);assert.equal(parsed.values.birthDate,'1990-06-05');assert.equal(parsed.values.pipelineStage,'sin_contactar');assert.equal(parsed.values.source,'local');assert.equal(parsed.values.maxBudget,25000.5);
 assert.deepEqual(parseClientSpreadsheetRows([{Nombre:'Solo nombre'}]).rows[0].errors,{});
});
test('contact declarations do not synthesize contact dates or downgrade the pipeline',()=>{
 const result=parseClientSpreadsheetRows([{Nombre:'QA',Etapa:'Cerrado',Contactado:'No'},{Nombre:'QA2',Contactado:'Sí'}]);
 assert.equal(result.rows[0].values.contactConfirmed,false);assert.equal(result.rows[0].values.pipelineStage,'cerrado');
 assert.equal(result.rows[1].values.contactConfirmed,true);assert.equal(Object.hasOwn(result.rows[1].values,'lastContactDate'),false);
 const untouched=parseClientSpreadsheetRows(exportClientRows([{...profile,contactConfirmed:null}])).rows[0].values;
 assert.equal(untouched.contactConfirmed,null);
});
test('calendar parsing supports Excel dates and DMY without rollover or local timezone conversion',()=>{
 assert.equal(clientSpreadsheetDate('31/12/2020'),'2020-12-31');assert.equal(clientSpreadsheetDate(43831),'2020-01-01');
 assert.equal(clientSpreadsheetDate('2020-02-30'),null);assert.equal(clientSpreadsheetDate('31/02/2020'),null);assert.equal(clientSpreadsheetDate(60),null);
 assert.equal(clientSpreadsheetDate('01/02/20'),null);assert.equal(clientSpreadsheetDate(''), '');
});
test('conflicting aliases, unsupported values and negative money produce reviewable errors; unknown headers are explicit',()=>{
 const result=parseClientSpreadsheetRows([{Nombre:'QA','Nombre completo':'Otra persona',Moneda:'EUR','Presupuesto máximo':-1,Extra:'No se importa',Tipo:'alien'}]);
 for(const key of ['fullName','currency','maxBudget','segment'])assert.ok(result.rows[0].errors[key]);
 assert.deepEqual(result.unknownHeaders,['Extra']);
});
test('template and export use the same complete headings and preserve formula-like text as a string cell',()=>{
 assert.deepEqual(Object.keys(clientSpreadsheetTemplateRows()[0]),CLIENT_SPREADSHEET_COLUMNS.map(column=>column.header));
 const sheet=XLSX.utils.json_to_sheet(exportClientRows([{fullName:'=1+1'}]));
 const cell=sheet.B2;assert.equal(cell.t,'s');assert.equal(cell.v,'=1+1');assert.equal(cell.f,undefined);
});
test('preview row numbers must be unique to keep checkbox selection unambiguous',()=>{
 const result=parseClientSpreadsheetRows([{Nombre:'QA uno',_rowNumber:2},{Nombre:'QA dos',_rowNumber:2}]);
 assert.ok(result.rows[1].errors.fila);assert.equal(result.rows[0].rowNumber,2);
});

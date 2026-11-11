import {clientCalendarKey,CLIENT_PIPELINE_STAGES,CLIENT_STAGE_ALIASES,effectiveClientContacted} from './clientCommercial.js';
import {saleCalendarKey} from './saleCalendarDate.js';
import {parseArgentineMoney} from './saleCommercial.js';

const fold=value=>String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const id=value=>value && typeof value === 'object' ? String(value._id || '') : String(value || '');
const col=(field,header,kind='text',aliases=[])=>({field,header,kind,aliases:[field,header,...aliases]});
export const CLIENT_SPREADSHEET_COLUMNS=[
 col('_clientId','Cliente ID','id',['ID cliente','_id']),
 col('fullName','Nombre','text',['Nombre completo','Cliente']),
 col('firstName','Nombres','text',['First name']),col('lastName','Apellido','text',['Apellidos','Last name']),
 col('email','Email','text',['Mail','Correo']),col('phone','Teléfono','text',['Telefono','Celular','WhatsApp','Phone']),
 col('dniCuit','DNI/CUIT','text',['DNI','CUIT','CUIL','Documento','dni']),
 col('segment','Tipo','segment',['Regular/VIP','Categoría']),col('gender','Sexo','gender',['Género']),
 col('address','Domicilio','text',['Dirección']),col('locality','Localidad'),col('province','Provincia'),
 col('birthDate','Fecha nacimiento','date',['Fecha de nacimiento','Cumpleaños']),col('occupation','Ocupación'),
 col('description','Interés','text',['Busca','Descripción','Necesidad']),col('vehicleOfInterest','Vehículo de interés','text',['Referencia vehículo']),
 col('interestedVehicleId','Vehículo de interés ID','id',['ID vehículo','Stock ID']),
 col('assignedToName','Vendedor','text',['Asesor','Responsable']),col('assignedTo','Vendedor ID','id',['Asesor ID','Responsable ID']),
 col('pipelineStage','Etapa','stage',['Stage']),col('_contacted','Contactado','boolean'),col('contactConfirmed','Contacto confirmado','nullableBoolean',['Contacto declarado']),
 col('source','Origen','source',['Canal']),col('reason','Captación','reason'),
 col('type','Relación comercial','relation',['Tipo comercial']),col('status','Estado','status'),col('doNotContact','No contactar','boolean'),
 col('purchaseMethod','Forma de compra','purchaseMethod',['Cómo compra']),col('purchaseTiming','Cuándo compra','purchaseTiming',['Momento de compra']),
 col('availableDownPayment','Dinero para entregar','number',['Entrega disponible','Anticipo disponible']),col('downPaymentCurrency','Moneda entrega','currency',['Moneda anticipo']),
 col('tradeInIntent','Tiene permuta','tradeIn',['Permuta','Entrega usado']),
 col('brand','Marca interés','text',['Marca','Marca de interés']),col('model','Modelo interés','text',['Modelo','Modelo de interés']),
 col('yearFrom','Año desde','number',['Desde año']),col('yearTo','Año hasta','number',['Hasta año']),
 col('maxBudget','Presupuesto máximo','number',['Presupuesto max','Presupuesto']),col('currency','Moneda presupuesto','currency',['Moneda']),
 col('lastContactDate','Último contacto','date'),col('createdAt','Fecha alta','date',['F. alta','Falta','Fecha de alta']),
 col('nextAction','Próxima acción','text',['Próximo paso']),col('nextActionDate','Próxima fecha','date',['Fecha próximo paso','Fecha seguimiento']),
 col('notes','Notas','text',['Notas internas','Observaciones']),col('tags','Etiquetas','tags')
];
const lookup=new Map(CLIENT_SPREADSHEET_COLUMNS.flatMap(column=>column.aliases.map(alias=>[fold(alias),column])));
export const clientSpreadsheetColumnFor=header=>lookup.get(fold(header)) || null;
const maps={
 segment:{regular:'regular',vip:'vip'},gender:{mujer:'mujer',hombre:'hombre'},
 relation:{comprador:'comprador',vendedor:'vendedor',ambos:'ambos',compradoryvendedor:'ambos',potencial:'potencial'},
 source:{showroom:'local',local:'local',web:'web',whatsapp:'whatsapp',instagram:'instagram',facebook:'facebook',referido:'referido',mercadolibre:'mercadolibre',otro:'otro'},
 reason:{puerta:'entro_puerta',entroallocal:'entro_puerta',entropuerta:'entro_puerta',showroom:'entro_puerta',digital:'lead_digital',leaddigital:'lead_digital'},
 status:{activo:'activo',inactivo:'inactivo',bloqueado:'bloqueado'},
 purchaseMethod:{contado:'contado',financiacion:'financiacion'},
 purchaseTiming:{ahora:'ahora',ahoraestemes:'ahora',estemes:'ahora','13meses':'1_3_meses',en1a3meses:'1_3_meses','1a3meses':'1_3_meses',masadelante:'mas_adelante',explorando:'explorando'},
 tradeIn:{si:'si',no:'no'}
};
const stages=new Map([...CLIENT_PIPELINE_STAGES.flatMap(stage=>[[fold(stage.id),stage.id],[fold(stage.label),stage.id]]),...Object.entries(CLIENT_STAGE_ALIASES).map(([key,value])=>[fold(key),value]),['primeraatencion','sin_contactar']]);
export function clientSpreadsheetDate(value) {
 if(value === '' || value == null)return '';
 if(value instanceof Date)return Number.isFinite(value.getTime()) ? value.toISOString().slice(0,10) : null;
 if(typeof value === 'number') {
  if(!Number.isFinite(value) || value<1 || value===60 || value>2958465)return null;
  const base=Date.UTC(1899,11,value<60 ? 31 : 30);
  return clientCalendarKey(new Date(base+Math.floor(value)*86400000));
 }
 const text=String(value).trim();
 const dmy=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
 return clientCalendarKey(dmy ? dmy[3]+'-'+dmy[2].padStart(2,'0')+'-'+dmy[1].padStart(2,'0') : text) || null;
}
function cell(column,value) {
 const key=fold(value),text=String(value ?? '').trim();
 if(column.kind==='date'){const result=clientSpreadsheetDate(value);if(result===null)throw Error('Usá AAAA-MM-DD o DD/MM/AAAA.');return result;}
 if(column.kind==='number'){if(!text)return null;const result=typeof value === 'number' ? value : parseArgentineMoney(text);if(!Number.isFinite(result) || result<0)throw Error('Ingresá un número válido mayor o igual a cero.');return result;}
 if(column.kind==='boolean' || column.kind==='nullableBoolean'){if(!text && column.kind==='nullableBoolean')return null;if(typeof value==='boolean')return value;if(['si','true','1','yes'].includes(key))return true;if(['no','false','0'].includes(key))return false;if(!text)return null;throw Error('Usá Sí o No.');}
 if(column.kind==='currency'){if(!text)return null;if(['usd','us','dolar','dolares'].includes(key))return 'USD';if(['ars','pesos','peso'].includes(key) || text==='$')return 'ARS';throw Error('Elegí ARS o USD.');}
 if(column.kind==='stage'){if(!text)return '';const stage=stages.get(key);if(!stage)throw Error('Etapa comercial no reconocida.');return stage;}
 if(maps[column.kind]){if(!text || ['sindefinir','sinconsultar'].includes(key))return '';const result=maps[column.kind][key];if(!result)throw Error('Valor no reconocido: '+text);return result;}
 if(column.kind==='tags'){if(!text)return [];if(Array.isArray(value))return value.map(String);if(text.startsWith('[')){const parsed=JSON.parse(text);if(!Array.isArray(parsed))throw Error('Revisá las etiquetas.');return parsed;}return text.split(';').map(item=>item.trim()).filter(Boolean);}
 return text;
}
export function parseClientSpreadsheetRows(rawRows) {
 if(!Array.isArray(rawRows))throw Error('Las filas deben ser una lista.');
 const unknownHeaders=new Set();
 const rows=rawRows.map((row,index)=>{
  const values={},errors={},present=[];
  if(!row || typeof row!=='object' || Array.isArray(row))return {rowNumber:index+2,values,errors:{fila:'Fila no válida.'},present};
  for(const [header,value]of Object.entries(row)){
   if(header.startsWith('_import') || header==='_duplicateId' || header==='_rowNumber')continue;
   const column=clientSpreadsheetColumnFor(header);
   if(!column){if(String(value ?? '').trim())unknownHeaders.add(header);continue;}
   try{const parsed=cell(column,value);if(present.includes(column.field) && JSON.stringify(values[column.field])!==JSON.stringify(parsed)){errors[column.field]='Dos columnas asignan valores diferentes al mismo campo.';}else{values[column.field]=parsed;present.push(column.field);}}catch(error){errors[column.field]=column.header+': '+error.message;}
  }
  if(!Object.hasOwn(values,'fullName') && (values.firstName || values.lastName))values.fullName=[values.firstName,values.lastName].filter(Boolean).join(' ');
  if(!String(values.fullName || '').trim())errors.fullName='Nombre es obligatorio.';
  if(!present.includes('contactConfirmed') && present.includes('_contacted'))values.contactConfirmed=values._contacted;
  if(present.includes('_contacted'))values._effectiveContacted=values._contacted;
  delete values._contacted;
  return {rowNumber:Number.isInteger(row._rowNumber) && row._rowNumber>=2 ? row._rowNumber : index+2,values,errors,present};
 });
 const rowNumbers=new Set();for(const row of rows){if(rowNumbers.has(row.rowNumber))row.errors.fila='La fila tiene una numeración repetida. Revisá el archivo.';rowNumbers.add(row.rowNumber);}
 return {rows,unknownHeaders:[...unknownHeaders]};
}
function dateOut(value,created=false){return !value ? '' : created ? saleCalendarKey({createdAt:value}) : clientCalendarKey(value);}
export function exportClientRows(clients) {
 return clients.map(client=>{
  const values={...client,_clientId:id(client._id),fullName:client.fullName || [client.firstName,client.lastName].filter(Boolean).join(' '),assignedToName:client.assignedTo?.name || '',assignedTo:id(client.assignedTo),interestedVehicleId:id(client.interestedVehicleId),_contacted:effectiveClientContacted(client),contactConfirmed:typeof client.contactConfirmed==='boolean' ? client.contactConfirmed : null};
  return Object.fromEntries(CLIENT_SPREADSHEET_COLUMNS.map(column=>{
   let value=values[column.field];
   if(column.kind==='date')value=dateOut(value,column.field==='createdAt');
   else if(column.kind==='boolean' || column.kind==='nullableBoolean')value=value===true ? 'Sí' : value===false ? 'No' : '';
   else if(column.kind==='tags')value=JSON.stringify(value || []);
   else if(column.kind==='id')value=id(value);
   return [column.header,value ?? ''];
  }));
 });
}
export const clientSpreadsheetTemplateRows=()=>[Object.fromEntries(CLIENT_SPREADSHEET_COLUMNS.map(column=>[column.header,'']))];

import {clientCalendarKey} from './clientCommercial.js';
export const CLIENT_DOCUMENT_FIELD_LABELS={fullName:'Nombre completo',dniCuit:'DNI / CUIT',birthDate:'Fecha de nacimiento',gender:'Sexo',address:'Domicilio'};
const fold=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
function date(value){
 const match=/(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})/.exec(value);
 if(match)return clientCalendarKey(match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0'));
 const monthNames={ENE:'01',JAN:'01',FEB:'02',MAR:'03',ABR:'04',APR:'04',MAY:'05',JUN:'06',JUL:'07',AGO:'08',AUG:'08',SEP:'09',SET:'09',OCT:'10',NOV:'11',DIC:'12',DEC:'12'};
 const named=/(\d{1,2})\s+(ENE|JAN|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|SET|OCT|NOV|DIC|DEC)(?:\s*\/\s*[A-Z]{3})?\s+(\d{4})/.exec(fold(value));
 if(named)return clientCalendarKey(named[3]+'-'+monthNames[named[2]]+'-'+named[1].padStart(2,'0'));
 return clientCalendarKey(value);
}
// Only explicit document labels create proposals. There is no inference from
// arbitrary numbers, face recognition, seller assignment or contact history.
export function parseClientDocumentText(raw){
 const text=String(raw || '').slice(0,60000),lines=text.split(/[\r\n]+/).map(line=>line.trim()).filter(Boolean),found={};
 const definitions=[
  ['fullName',/^(?:NOMBRE COMPLETO|FULL NAME)\s*[:=-]?\s*(.*)$/],
  ['surname',/^(?:APELLIDO(?:S)?(?:\s*\/\s*SURNAME)?|SURNAME)\s*[:=-]?\s*(.*)$/],
  ['givenName',/^(?:NOMBRE(?:S)?(?:\s*\/\s*NAME)?|NAME)\s*[:=-]?\s*(.*)$/],
  ['dniCuit',/^(?:DNI|D\.N\.I\.?|CUIT|CUIL|DOCUMENTO(?:\s*\/\s*DOCUMENT)?|DOCUMENT(?: NUMBER)?|NUMERO DE DOCUMENTO)\s*[:#=-]?\s*(.*)$/],
  ['birthDate',/^(?:FECHA DE NACIMIENTO(?:\s*\/\s*DATE OF BIRTH)?|NACIMIENTO|DATE OF BIRTH)\s*[:=-]?\s*(.*)$/],
  ['gender',/^(?:SEXO(?:\s*\/\s*SEX)?|SEX|GENERO)\s*[:=-]?\s*(.*)$/],
  ['address',/^(?:DOMICILIO|DIRECCION|ADDRESS)\s*[:=-]?\s*(.*)$/]
 ];
 const isLabel=line=>definitions.some(([,pattern])=>pattern.test(fold(line)));
 for(let index=0;index<lines.length;index++){
  const normalized=fold(lines[index]);
  for(const [key,pattern]of definitions){
   const match=pattern.exec(normalized);if(!match)continue;
   let value=match[1]?.trim() || '';
   // Preserve actual spelling/case after an explicit colon where possible.
   if(value && lines[index].includes(':'))value=lines[index].slice(lines[index].indexOf(':')+1).trim();
   if(!value && lines[index+1] && !isLabel(lines[index+1]))value=lines[index+1].trim();
   if(value)found[key]=value;
   break;
  }
 }
 const values={};
 if(found.fullName)values.fullName=found.fullName.slice(0,300);
 else if(found.givenName || found.surname)values.fullName=[found.givenName,found.surname].filter(Boolean).join(' ').slice(0,300);
 if(found.dniCuit){const number=found.dniCuit.match(/\b\d[\d. -]{5,16}\d\b/);if(number){const compact=number[0].replace(/\D/g,'');if([7,8,11].includes(compact.length))values.dniCuit=compact;}}
 if(found.birthDate){const calendar=date(found.birthDate);if(calendar)values.birthDate=calendar;}
 if(found.gender){const value=fold(found.gender).split(/\s+/)[0];if(['F','FEMENINO','MUJER'].includes(value))values.gender='mujer';if(['M','MASCULINO','HOMBRE'].includes(value))values.gender='hombre';}
 if(found.address)values.address=found.address.slice(0,500);
 return values;
}
export function clientDocumentOcrPatch(proposals,selected){
 const patch={};
 for(const key of selected || [])if(Object.hasOwn(CLIENT_DOCUMENT_FIELD_LABELS,key) && typeof proposals?.[key]==='string'){
  const value=proposals[key].trim();
  if(key==='birthDate'){if(clientCalendarKey(value))patch[key]=value;}
  else if(key==='gender'){if(['','mujer','hombre'].includes(value))patch[key]=value;}
  else if(value)patch[key]=value.slice(0,key==='fullName' ? 300 : key==='address' ? 500 : 100);
 }
 return patch;
}

import {getArgentinaDateKey,getBusinessDateKey} from './cashProjection.js';
import {roundMoney} from './saleCommercial.js';

// Campos contrastados con el texto actualizado oficial, arts. 101 y 102.
// Es una propuesta documental sin firma; no ejecuta una obligación ni persiste datos.
export const PROMISSORY_DRAFT_SOURCE='https://www.argentina.gob.ar/normativa/nacional/decreto_ley-5965-1963-69687/actualizacion';
const text=value=>String(value??'').trim();
export function newPayablePromissoryDraft(plan={},installments=[],issuer={},now=new Date()){
 return {issueDate:getArgentinaDateKey(now),issuePlace:'',paymentPlace:issuer.address||'',creditorName:plan.creditorName||'',creditorDocument:'',creditorAddress:'',debtorName:issuer.name||'AutoSporting',debtorDocument:issuer.dni||'',debtorAddress:issuer.address||'',rows:installments.map(item=>({id:String(item._id),number:item.number,count:plan.count||installments.length,eligible:Number(item.amount)-Number(item.paidAmount||0)>0,selected:Number(item.amount)-Number(item.paidAmount||0)>0,amount:roundMoney(Math.max(0,Number(item.amount)-Number(item.paidAmount||0))),currency:item.currency,dueDate:getBusinessDateKey(item.dueDate)||''}))};
}
export function validatePayablePromissoryDraft(values){
 const errors={};
 for(const [key,label]of [['issuePlace','el lugar de creación'],['paymentPlace','el lugar de pago'],['creditorName','el nombre del acreedor'],['debtorName','el nombre del deudor']])if(!text(values[key]))errors[key]='Completá '+label+'.';
 for(const key of ['issuePlace','paymentPlace','creditorName','debtorName','creditorAddress','debtorAddress'])if(text(values[key]).length>500)errors[key]='Este campo admite hasta 500 caracteres.';
 for(const key of ['creditorDocument','debtorDocument'])if(text(values[key]).length>80)errors[key]='El documento admite hasta 80 caracteres.';
 if(!getBusinessDateKey(values.issueDate))errors.issueDate='Elegí una fecha de creación válida.';
 const rows=(values.rows||[]).filter(row=>row.selected);
 if(!rows.length||rows.length>120)errors.rows='Seleccioná entre 1 y 120 cuotas para preparar.';
 if(rows.some(row=>row.eligible===false))errors.rows='Las cuotas ya pagadas no se incluyen en estos borradores.';
 if(rows.some(row=>!getBusinessDateKey(row.dueDate)||!['ARS','USD'].includes(row.currency)||row.amount===''||!Number.isFinite(Number(row.amount))||roundMoney(Number(row.amount))<=0))errors.rows='Revisá el importe, moneda y vencimiento de cada cuota seleccionada.';
 if(new Set(rows.map(row=>row.id)).size!==rows.length)errors.rows='Hay cuotas repetidas en la selección.';
 return errors;
}
export async function createPayablePromissoryDraftPdf(values,onlyId){
 const errors=validatePayablePromissoryDraft(values);if(Object.keys(errors).length)throw Object.assign(Error('Revisá los datos de los borradores.'),{errors});
 const rows=values.rows.filter(row=>row.selected&&(!onlyId||row.id===onlyId));if(!rows.length)throw Error('La cuota seleccionada no está disponible.');
 const {jsPDF}=await import('jspdf'),pdf=new jsPDF({unit:'mm',format:'a4'});let y=20,instrument=0;const pageOwners=[];
 const banner=()=>{pdf.setFillColor(250,239,225);pdf.roundedRect(14,12,182,12,2,2,'F');pdf.setFont('helvetica','bold');pdf.setTextColor(118,70,15);pdf.setFontSize(11);pdf.text('BORRADOR PARA REVISION - SIN FIRMAR',18,20);pdf.setTextColor(25);y=36;pageOwners.push(instrument);};
 const ensure=height=>{if(y+height>260){pdf.addPage();banner();}};
 const paragraph=(value,{size=11,bold=false,spacing=3}={})=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(text(value),180);for(const line of lines){ensure(5.5);pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.text(line,15,y);y+=5.5;}y+=spacing;};
 const field=(label,value)=>paragraph(label+': '+(text(value)||'(sin completar)'),{size:10,spacing:2});
 const date=value=>getBusinessDateKey(value).split('-').reverse().join('/');
 for(let index=0;index<rows.length;index++){
  const row=rows[index];instrument=index;if(index)pdf.addPage();banner();
  paragraph('PAGARE - Cuota '+row.number+' de '+row.count,{size:18,bold:true,spacing:5});
  field('Lugar de creacion',values.issuePlace);field('Fecha propuesta de creacion',date(values.issueDate));
  paragraph('Partes propuestas',{size:12,bold:true});
  field('Acreedor / beneficiario',values.creditorName);field('DNI / CUIT acreedor',values.creditorDocument);field('Domicilio acreedor',values.creditorAddress);
  field('Deudor / suscriptor',values.debtorName);field('DNI / CUIT deudor',values.debtorDocument);field('Domicilio deudor',values.debtorAddress);
  paragraph('Importe y vencimiento',{size:12,bold:true});
  const amount=Number(row.amount).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  field('Suma determinada',row.currency+' '+amount);field('Vencimiento propuesto',date(row.dueDate));field('Lugar del pago',values.paymentPlace);
  paragraph('Texto propuesto para revision',{size:12,bold:true});
  paragraph('Por este pagare, prometo pagar a '+text(values.creditorName)+' la suma de '+row.currency+' '+amount+' el dia '+date(row.dueDate)+' en '+text(values.paymentPlace)+'.',{size:11,spacing:5});
  ensure(75);y+=15;pdf.setDrawColor(90);pdf.line(15,y,130,y);y+=7;paragraph('Firma del suscriptor: EN BLANCO',{size:10});paragraph('Aclaracion: '+text(values.debtorName),{size:10});
 }
 const pages=pdf.getNumberOfPages();for(let page=1;page<=pages;page++){
  pdf.setPage(page);pdf.setDrawColor(205);pdf.line(14,269,196,269);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(80);
  pdf.text('Borrador sin firma. Prepararlo no registra pagos ni agrega una deuda en AutoSporting.',14,275);
  pdf.textWithLink('Campos de referencia: Decreto-ley 5965/1963, arts. 101 y 102 (texto actualizado).',14,280,{url:PROMISSORY_DRAFT_SOURCE});
  pdf.text('Cuota '+rows[pageOwners[page-1]].number+' - Pagina '+page+' de '+pages,14,286);
 }
 return pdf;
}

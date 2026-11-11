import {getArgentinaDateKey,getBusinessDateKey} from './cashProjection.js';
import {financeCurrency} from './financeWorkbench.js';
import {parseArgentineMoney} from './saleCommercial.js';
export function newFinanceDocument(initial={},now=new Date()){
 return {date:getArgentinaDateKey(now),city:'',number:'',concept:'',amount:'',currency:'ARS',paymentMethod:'Contado',paymentOther:'',tradeIns:[],balancePaymentMethod:'Contado',balancePaymentOther:'',notes:'',...initial,
 buyer:{name:'',dni:'',phone:'',address:'',...initial.buyer},...(initial.seller?{seller:{name:'',dni:'',phone:'',address:'',...initial.seller}}:{}),vehicle:{brand:'',type:'',model:'',engine:'',chassis:'',plate:'',km:'',...initial.vehicle},signer:{name:'',dni:'',...initial.signer},issuer:{name:'AutoSporting',address:'',phone:'',dni:'',...initial.issuer},financing:{entity:'',installments:'',amount:'',currency:'ARS',installmentAmount:'',installmentCurrency:'ARS',notes:'',...initial.financing}};
}
export function financeDocumentBalance(values){
 const currency=financeCurrency(values.currency),amount=parseArgentineMoney(values.amount),totals={ARS:0,USD:0},issues=[];
 for(const item of values.tradeIns || []){
  const code=financeCurrency(item.currency),value=parseArgentineMoney(item.value);
  if(!code || !Number.isFinite(value) || value<0){issues.push('Revisá el valor y moneda de cada permuta.');continue;}
  totals[code]+=value;
 }
 const foreign=currency ? Object.keys(totals).some(code=>code!==currency && totals[code]>0) : false;
 return {totals,balance:currency && Number.isFinite(amount) && !foreign && !issues.length ? amount-totals[currency] : null,foreign,issues};
}
export function validateFinanceDocument(values,kind){
 const errors={};
 if(!getBusinessDateKey(values.date))errors.date='Ingresá una fecha válida.';
 const amount=parseArgentineMoney(values.amount);if(!Number.isFinite(amount) || amount<=0)errors.amount='Ingresá un importe mayor a cero.';
 if(!financeCurrency(values.currency))errors.currency='Elegí ARS o USD.';
 const balance=financeDocumentBalance(values);
 if(kind==='boleto' && values.paymentMethod==='Permuta'){
  if(!values.tradeIns?.length)errors.tradeIns='Agregá al menos una permuta.';
  if(balance.issues.length)errors.tradeIns=balance.issues[0];
  if(balance.balance!==null && balance.balance<0)errors.tradeIns='El valor de las permutas supera el importe. Revisá los datos.';
 }
 if(kind==='boleto' && (values.paymentMethod==='Financiado' || values.paymentMethod==='Permuta' && values.balancePaymentMethod==='Financiado')){
  for(const key of ['amount','installmentAmount'])if(values.financing?.[key]!=='' && (!Number.isFinite(parseArgentineMoney(values.financing[key])) || parseArgentineMoney(values.financing[key])<0))errors.financing='Revisá los importes de financiación.';
  if(values.financing?.installments!=='' && (!Number.isInteger(Number(values.financing.installments)) || Number(values.financing.installments)<1))errors.financing='La cantidad de cuotas debe ser un entero mayor a cero.';
 }
 return {errors,balance};
}
export async function createFinanceDocumentPdf(values,kind){
 const checked=validateFinanceDocument(values,kind);if(Object.keys(checked.errors).length)throw Object.assign(Error('Revisá los datos del documento.'),{errors:checked.errors});
 const {jsPDF}=await import('jspdf'),pdf=new jsPDF({unit:'mm',format:'a4'});let y=16;
 const ensure=height=>{if(y+height>277){pdf.addPage();y=17;}};
 const line=(label,value)=>{
  const text=label+': '+(String(value ?? '').trim() || '—');
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);
  for(const part of pdf.splitTextToSize(text,182)){ensure(5);pdf.text(part,14,y);y+=5;}y+=2;
 };
 const section=title=>{ensure(15);y+=3;pdf.setFillColor(242,244,247);pdf.rect(14,y-5,182,8,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text(title,17,y);y+=10;};
 pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text(kind==='boleto' ? 'BOLETO DE COMPRAVENTA' : 'RECIBO',14,y);y+=10;
 pdf.setFontSize(11);pdf.text(String(values.issuer.name || 'AutoSporting'),14,y);y+=9;
 line('Fecha',getBusinessDateKey(values.date).split('-').reverse().join('/'));line('Ciudad',values.city);if(kind==='recibo')line('N° de recibo',values.number);
 section(kind==='boleto' ? 'Comprador' : 'Recibí de');
 for(const [key,label]of [['name','Nombre'],['dni','DNI / CUIT'],['phone','Teléfono'],['address','Domicilio']])line(label,values.buyer[key]);
 if(kind==='boleto'&&values.seller){section('Vendedor');for(const [key,label]of [['name','Nombre'],['dni','DNI / CUIT'],['phone','Teléfono'],['address','Domicilio']])line(label,values.seller[key]);}
 section('Importe');line('Monto',values.currency+' '+parseArgentineMoney(values.amount).toLocaleString('es-AR',{maximumFractionDigits:2}));
 if(kind==='recibo'){line('Concepto',values.concept);line('Forma de pago',values.paymentOther || values.paymentMethod);}
 else{
  section('Vehículo');for(const [key,label]of [['brand','Marca'],['type','Tipo'],['model','Modelo'],['engine','Motor'],['chassis','Chasis'],['plate','Dominio'],['km','Kilómetros']])line(label,values.vehicle[key]);
  section('Forma de pago');line('Condición',values.paymentMethod==='Otro' ? values.paymentOther : values.paymentMethod);
  if(values.paymentMethod==='Permuta'){
   for(let index=0;index<values.tradeIns.length;index++){const item=values.tradeIns[index];section('Permuta '+(index+1));for(const [key,label]of [['owner','Titular'],['brand','Marca'],['model','Modelo'],['year','Año'],['plate','Dominio'],['color','Color'],['km','Kilómetros'],['engine','Motor'],['chassis','Chasis']])line(label,item[key]);line('Valor de toma',item.currency+' '+item.value);}
   if(checked.balance.foreign)line('Saldo','Monedas diferentes: no se calculó una conversión.');
   else line('Saldo restante',values.currency+' '+checked.balance.balance.toLocaleString('es-AR',{maximumFractionDigits:2}));
   line('Forma de pago del saldo',values.balancePaymentMethod==='Otro' ? values.balancePaymentOther : values.balancePaymentMethod);
  }
  if(values.paymentMethod==='Financiado' || values.paymentMethod==='Permuta' && values.balancePaymentMethod==='Financiado'){
   section('Financiación');for(const [key,label]of [['entity','Entidad'],['installments','Cantidad de cuotas'],['notes','Observaciones financiación']])line(label,values.financing[key]);
   line('Monto financiado',values.financing.currency+' '+values.financing.amount);line('Valor de cuota',values.financing.installmentCurrency+' '+values.financing.installmentAmount);
  }
 }
 section('Observaciones');line('Detalle',values.notes);
 section(kind==='boleto' ? 'Representante / firma' : 'Recibe / firma');line('Nombre',values.signer.name);line('DNI',values.signer.dni);ensure(23);y+=15;pdf.line(14,y,100,y);y+=8;line('Firma','');
 section('Agencia / emisor');for(const [key,label]of [['name','Nombre'],['address','Domicilio'],['phone','Teléfono'],['dni','DNI / CUIT']])line(label,values.issuer[key]);
 const total=pdf.getNumberOfPages();for(let page=1;page<=total;page++){pdf.setPage(page);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(100);pdf.text(String(values.issuer.name || 'AutoSporting')+' · '+page+' / '+total,14,289);}
 return pdf;
}

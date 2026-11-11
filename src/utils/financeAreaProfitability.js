const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const areaCategories=new Set(['multa','multas','transferencia','transferencias','gestoria','honorarios','servicio','servicios','tramite','tramites','verificacion','verificaciones']);
export function financeAreaProfitability(transactions){
 const result={categories:{ARS:{},USD:{}},neto:{ARS:0,USD:0},totalsARS:{ingresos:0,egresos:0},totalsUSD:{ingresos:0,egresos:0},excludedCount:0};
 for(const tx of transactions){const currency=tx.currency,amount=Number(tx.amount),kind=String(tx.type).toLowerCase(),category=String(tx.category||'');if(tx.status!=='activo'||!areaCategories.has(normalize(category))||!['ARS','USD'].includes(currency)||!Number.isFinite(amount)||amount<0||!['ingreso','egreso'].includes(kind)){result.excludedCount++;continue;}const direction=kind==='ingreso'?'ingresos':'egresos';result.categories[currency][category]||={ingresos:0,egresos:0};result.categories[currency][category][direction]+=amount;result['totals'+currency][direction]+=amount;result.neto[currency]+=kind==='ingreso'?amount:-amount;}
 return result;
}

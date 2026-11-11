import {useCallback} from 'react';
import {useFinanceResource} from './useFinanceResource';
export function useFinanceReconciliation(){
 const {request,loading}=useFinanceResource();
 const uploadReconciliation=useCallback(async({accountId,file,fileName})=>{
  if(!file||!file.size||file.size>3*1024*1024)throw Error('Elegí un CSV de hasta 3 MB.');
  const base64Csv=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('No se pudo leer el CSV.'));reader.readAsDataURL(file);});
  return request('/api/admin/finance/reconciliation/upload','POST',{accountId,base64Csv,fileName});
 },[request]);
 const fetchReconciliation=useCallback(id=>request('/api/admin/finance/reconciliation/'+id),[request]);
 const confirmReconciliation=useCallback((id,decisions)=>request('/api/admin/finance/reconciliation/'+id+'/confirm','POST',{decisions}),[request]);
 return {uploadReconciliation,fetchReconciliation,confirmReconciliation,loading};
}

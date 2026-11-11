import {useCallback} from 'react';
import {useFinanceResource} from './useFinanceResource';
export function useFinancePayables(){
 const {request,loading}=useFinanceResource();
 const fetchPayables=useCallback((filters={})=>request('/api/admin/finance/payables?'+new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==''&&value!=null)),'GET'),[request]);
 const fetchReceivablesPayables=useCallback(()=>request('/api/admin/finance/receivables-payables'),[request]);
 const registerOwnerPayment=useCallback((saleId,payload)=>request('/api/admin/finance/payables/'+saleId+'/pay','POST',payload),[request]);
 return {fetchPayables,fetchReceivablesPayables,registerOwnerPayment,loading};
}

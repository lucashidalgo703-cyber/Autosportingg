import { useMemo } from 'react';
import { useFinanceResource } from './useFinanceResource';
export function useFinanceLoans() {
 const resource=useFinanceResource(),{request}=resource;
 const methods=useMemo(()=>({fetchLoans:()=>request('/api/admin/finance/loans'),createLoan:payload=>request('/api/admin/finance/loans','POST',payload),updateLoanStatus:(id,payload)=>request('/api/admin/finance/loans/'+encodeURIComponent(id),'PATCH',payload)}),[request]);
 return {...resource,...methods};
}

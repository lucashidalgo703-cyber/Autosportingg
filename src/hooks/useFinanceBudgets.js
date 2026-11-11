import { useMemo } from 'react';
import { useFinanceResource } from './useFinanceResource';
export function useFinanceBudgets() {
 const resource=useFinanceResource(),{request}=resource;
 const methods=useMemo(()=>({fetchBudgets:period=>request('/api/admin/finance/budgets'+(period?'?period='+encodeURIComponent(period):'')),createBudget:payload=>request('/api/admin/finance/budgets','POST',payload),updateBudget:(id,payload)=>request('/api/admin/finance/budgets/'+encodeURIComponent(id),'PATCH',payload),deleteBudget:id=>request('/api/admin/finance/budgets/'+encodeURIComponent(id),'DELETE')}),[request]);
 return {...resource,...methods};
}

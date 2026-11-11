import { useMemo } from 'react';
import { useFinanceResource } from './useFinanceResource';
export function useFinanceCardExpenses() {
 const resource=useFinanceResource(),{request}=resource;
 const methods=useMemo(()=>({fetchExpenses:()=>request('/api/admin/finance/card-expenses'),createExpense:payload=>request('/api/admin/finance/card-expenses','POST',payload)}),[request]);
 return {...resource,...methods};
}

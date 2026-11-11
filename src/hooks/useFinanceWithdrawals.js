import { useMemo } from 'react';
import { useFinanceResource } from './useFinanceResource';
export function useFinanceWithdrawals() {
 const resource=useFinanceResource(),{request}=resource;
 const methods=useMemo(()=>({fetchWithdrawals:()=>request('/api/admin/finance/withdrawals'),createWithdrawal:payload=>request('/api/admin/finance/withdrawals','POST',payload)}),[request]);
 return {...resource,...methods};
}

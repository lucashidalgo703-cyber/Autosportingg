import { useMemo } from 'react';
import { useFinanceResource } from './useFinanceResource';
export function useFinanceRecurrences() {
 const resource=useFinanceResource(),{request}=resource;
 const methods=useMemo(()=>({fetchRecurrences:(includeInactive=false)=>request('/api/admin/finance/recurrences'+(includeInactive?'?includeInactive=true':'')),createRecurrence:payload=>request('/api/admin/finance/recurrences','POST',payload),updateRecurrence:(id,payload)=>request('/api/admin/finance/recurrences/'+encodeURIComponent(id),'PATCH',payload),deleteRecurrence:id=>request('/api/admin/finance/recurrences/'+encodeURIComponent(id),'DELETE'),generateMonth:period=>request('/api/admin/finance/recurrences/generate-month','POST',{period})}),[request]);
 return {...resource,...methods};
}

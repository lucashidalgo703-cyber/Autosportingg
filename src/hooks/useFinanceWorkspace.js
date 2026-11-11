import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {hasPermission,PERMISSIONS} from '../utils/adminPermissions';
const empty={transactions:null,accounts:null,installments:null,deposits:null};
const sourceNames={transactions:'Movimientos',accounts:'Cuentas',installments:'Cuotas',deposits:'Señas'};
export function useFinanceWorkspace(){
 const {token,user}=useAuth();
 const canFinance=hasPermission(user,PERMISSIONS.FINANZAS_READ),canInstallments=hasPermission(user,PERMISSIONS.CUOTAS_READ);
 const [state,setState]=useState({token:null,data:empty,errors:{},loading:true});
 const revision=useRef(0),pending=useRef(null),session=useRef(token);session.current=token;
 const reload=useCallback(async()=>{
  const current=++revision.current,controller=new AbortController();pending.current?.abort();pending.current=controller;
  if(!token || !canFinance){setState({token,data:empty,errors:{},loading:false});return;}
  setState(previous=>({...previous,token,data:previous.token===token ? previous.data : empty,loading:true}));
  const sources={transactions:'/api/admin/transactions',accounts:'/api/admin/accounts',installments:canInstallments ? '/api/admin/installments' : null,deposits:'/api/admin/finance/deposits'};
  const results=await Promise.allSettled(Object.entries(sources).map(async([key,url])=>{
   if(!url)throw {key,message:'Necesitás permiso de consulta de Cuotas.'};
   try{const response=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.message || 'No se pudo consultar '+sourceNames[key]+'.');if(key==='deposits'){if(!Array.isArray(data.items) || !data.summary)throw Error('Respuesta de señas incompleta.');}else if(!Array.isArray(data))throw Error('Respuesta de '+sourceNames[key]+' incompleta.');return {key,data};}catch(error){throw {key,message:error.message};}
  }));
  if(controller.signal.aborted || revision.current!==current || session.current!==token || localStorage.getItem('token')!==token)return;
  const data={...empty},errors={};for(const result of results)if(result.status==='fulfilled')data[result.value.key]=result.value.data;else errors[result.reason.key]=result.reason.message;
  setState({token,data,errors,loading:false});
 },[token,canFinance,canInstallments]);
 useEffect(()=>{void reload();return ()=>{revision.current++;pending.current?.abort();};},[reload]);
 return {...(state.token===token ? state : {data:empty,errors:{},loading:Boolean(token)}),reload};
}

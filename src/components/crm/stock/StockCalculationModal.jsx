"use client";
import { useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import CrmModal from '../ui/CrmModal';
import StockCommercialCalculator from './StockCommercialCalculator';
export default function StockCalculationModal({isOpen,onClose}) {
 const {token}=useAuth(),session=useRef(token);
 useEffect(()=>{if(isOpen&&session.current!==token)onClose();session.current=token;},[token,isOpen,onClose]);
 if(!isOpen||session.current!==token)return null;
 return <CrmModal isOpen onClose={onClose} title="Desglose comercial del Stock disponible" maxWidth="max-w-6xl" fullScreenOnMobile footer={<div className="flex justify-end"><button type="button" onClick={onClose} className="min-h-9 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg">Cerrar desglose</button></div>}><div className="p-4 sm:p-5"><StockCommercialCalculator isModal/></div></CrmModal>;
}

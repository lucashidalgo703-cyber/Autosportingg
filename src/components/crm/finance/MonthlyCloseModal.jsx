import React, { useEffect, useRef, useState } from 'react';
import {useAuth} from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import CrmModal from '../ui/CrmModal';

export default function MonthlyCloseModal({ isOpen, onClose, fetchMonthlyClose }) {
    const {token}=useAuth(); const generation=useRef(0),loader=useRef(fetchMonthlyClose);loader.current=fetchMonthlyClose; const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{const current=++generation.current;if(isOpen){setData([]);setLoading(true);setError('');loader.current().then(result=>{if(current===generation.current&&localStorage.getItem('token')===token)setData(result||[]);}).catch(error=>{if(current===generation.current)setError(error.message||'No se pudo consultar.');}).finally(()=>{if(current===generation.current)setLoading(false);});}return()=>{generation.current++;};},[isOpen,token,attempt]);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    if (!isOpen) return null;

    return (
        <CrmModal isOpen={isOpen} onClose={onClose} title="Resumen mensual de movimientos" maxWidth="max-w-4xl">
            <div className="p-5"><p className="mb-4 text-xs text-crm-fg-muted">Resumen calculado de movimientos activos por mes; incluye transferencias internas y mantiene las monedas separadas. Los snapshots inmutables están en Cierre de caja.</p>{error&&<p role="alert" className="text-sm text-red-300">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)} className="underline">Reintentar</button></p>}
                {loading ? (
                    <div className="flex min-h-[200px] items-center justify-center">
                        <Loader2 className="animate-spin text-crm-red" size={32} />
                    </div>
                ) : data.length === 0 ? (
                    <div className="p-8 text-center text-crm-fg-muted">
                        No hay información de cierres mensuales.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-crm-border">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                            <thead className="bg-crm-surface-raised border-b border-crm-border">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Período</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-success text-right">Ingresos (USD)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-red text-right">Egresos (USD)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-info text-right">Neto (USD)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-success text-right">Ingresos (ARS)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-red text-right">Egresos (ARS)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-info text-right">Neto (ARS)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border">
                                {data.map((row) => (
                                    <tr key={row.period} className="hover:bg-crm-surface-raised transition">
                                        <td className="px-4 py-3 text-xs font-bold text-crm-fg">{row.period}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-success text-right">{formatMoney(row.USD.income, 'USD')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-red text-right">{formatMoney(row.USD.expense, 'USD')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-info text-right">{formatMoney(row.USD.net, 'USD')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-success text-right">{formatMoney(row.ARS.income, 'ARS')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-red text-right">{formatMoney(row.ARS.expense, 'ARS')}</td>
                                        <td className="px-4 py-3 text-xs font-black text-crm-info text-right">{formatMoney(row.ARS.net, 'ARS')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onClose}
                        className="h-10 rounded-xl bg-crm-surface-raised px-6 text-sm font-bold text-crm-fg hover:bg-crm-border transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </CrmModal>
    );
}

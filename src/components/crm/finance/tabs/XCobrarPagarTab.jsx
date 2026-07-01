import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useFinancePayables } from '../../../../hooks/useFinancePayables';
import { AlertCircle } from 'lucide-react';

export default function XCobrarPagarTab({ installments = [] }) {
    const { fetchReceivablesPayables, loading } = useFinancePayables();
    const [data, setData] = useState({ porCobrar: null, porPagar: null });

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetchReceivablesPayables();
                setData(res);
            } catch (err) {
                toast.error(err.message || 'Error cargando totales');
            }
        };
        loadData();
    }, [fetchReceivablesPayables]);

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    if (loading || !data.porCobrar) {
        return (
            <div className="p-8 text-center text-sm text-crm-fg-muted border border-crm-border rounded-xl">
                Cargando datos...
            </div>
        );
    }

    const { porCobrar, porPagar } = data;

    const totalCobrarARS = (porCobrar.cuotas.ARS || 0) + (porCobrar.ventas.ARS || 0) + (porCobrar.gastosComprador.ARS || 0);
    const totalCobrarUSD = (porCobrar.cuotas.USD || 0) + (porCobrar.ventas.USD || 0) + (porCobrar.gastosComprador.USD || 0);

    const totalPagarARS = (porPagar.propietarios.ARS || 0) + (porPagar.registros.ARS || 0) + (porPagar.comisiones.ARS || 0);
    const totalPagarUSD = (porPagar.propietarios.USD || 0) + (porPagar.registros.USD || 0) + (porPagar.comisiones.USD || 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">POR COBRAR</h3>
                    <div className="mt-2 flex flex-col gap-1">
                        {totalCobrarUSD > 0 && <p className="text-xl font-black text-crm-success">{formatMoney(totalCobrarUSD, 'USD')}</p>}
                        {totalCobrarARS > 0 && <p className="text-xl font-black text-crm-success">{formatMoney(totalCobrarARS, 'ARS')}</p>}
                        {totalCobrarUSD === 0 && totalCobrarARS === 0 && <p className="text-xl font-black text-crm-success">{formatMoney(0, 'USD')}</p>}
                    </div>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">POR PAGAR</h3>
                    <div className="mt-2 flex flex-col gap-1">
                        {totalPagarUSD > 0 && <p className="text-xl font-black text-crm-red">{formatMoney(totalPagarUSD, 'USD')}</p>}
                        {totalPagarARS > 0 && <p className="text-xl font-black text-crm-red">{formatMoney(totalPagarARS, 'ARS')}</p>}
                        {totalPagarUSD === 0 && totalPagarARS === 0 && <p className="text-xl font-black text-crm-red">{formatMoney(0, 'USD')}</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DETALLE POR COBRAR */}
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                    <h3 className="text-base font-black text-crm-fg mb-4">Detalle por cobrar</h3>
                    <ul className="space-y-3 text-sm text-crm-fg-muted">
                        <li className="flex flex-col pb-2 border-b border-crm-border">
                            <div className="flex justify-between items-center mb-1">
                                <span>Saldos de ventas</span>
                                <div className="text-right">
                                    <span className="font-bold text-crm-fg block">{formatMoney(porCobrar.ventas.USD, 'USD')}</span>
                                    <span className="font-bold text-crm-fg block">{formatMoney(porCobrar.ventas.ARS, 'ARS')}</span>
                                </div>
                            </div>
                            {porCobrar.ventas.explanation && (
                                <p className="text-[10px] text-crm-warning flex items-start gap-1 mt-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {porCobrar.ventas.explanation}
                                </p>
                            )}
                        </li>
                        <li className="flex flex-col pb-2 border-b border-crm-border">
                            <div className="flex justify-between items-center mb-1">
                                <span>Cuotas financiadas</span>
                                <div className="text-right">
                                    <span className="font-bold text-crm-fg block">{formatMoney(porCobrar.cuotas.USD, 'USD')}</span>
                                    <span className="font-bold text-crm-fg block">{formatMoney(porCobrar.cuotas.ARS, 'ARS')}</span>
                                </div>
                            </div>
                            {porCobrar.cuotas.explanation && (
                                <p className="text-[10px] text-crm-warning flex items-start gap-1 mt-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {porCobrar.cuotas.explanation}
                                </p>
                            )}
                        </li>
                        <li className="flex flex-col pb-2 border-b border-crm-border">
                            <div className="flex justify-between items-center mb-1">
                                <span>Gastos del comprador</span>
                                <div className="text-right">
                                    <span className="font-bold text-crm-fg block">{formatMoney(porCobrar.gastosComprador.USD, 'USD')}</span>
                                    <span className="font-bold text-crm-fg block">{formatMoney(porCobrar.gastosComprador.ARS, 'ARS')}</span>
                                </div>
                            </div>
                            {porCobrar.gastosComprador.explanation && (
                                <p className="text-[10px] text-crm-warning flex items-start gap-1 mt-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {porCobrar.gastosComprador.explanation}
                                </p>
                            )}
                        </li>
                    </ul>
                </div>

                {/* DETALLE POR PAGAR */}
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                    <h3 className="text-base font-black text-crm-fg mb-4">Detalle por pagar</h3>
                    <ul className="space-y-3 text-sm text-crm-fg-muted">
                        <li className="flex flex-col pb-2 border-b border-crm-border">
                            <div className="flex justify-between items-center mb-1">
                                <span>Pagos a propietarios</span>
                                <div className="text-right">
                                    <span className="font-bold text-crm-fg block">{formatMoney(porPagar.propietarios.USD, 'USD')}</span>
                                    <span className="font-bold text-crm-fg block">{formatMoney(porPagar.propietarios.ARS, 'ARS')}</span>
                                </div>
                            </div>
                            {porPagar.propietarios.explanation && (
                                <p className="text-[10px] text-crm-warning flex items-start gap-1 mt-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {porPagar.propietarios.explanation}
                                </p>
                            )}
                        </li>
                        <li className="flex flex-col pb-2 border-b border-crm-border">
                            <div className="flex justify-between items-center mb-1">
                                <span>Transferencias a registros</span>
                                <div className="text-right">
                                    <span className="font-bold text-crm-fg block">{formatMoney(porPagar.registros.USD, 'USD')}</span>
                                    <span className="font-bold text-crm-fg block">{formatMoney(porPagar.registros.ARS, 'ARS')}</span>
                                </div>
                            </div>
                            {porPagar.registros.explanation && (
                                <p className="text-[10px] text-crm-warning flex items-start gap-1 mt-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {porPagar.registros.explanation}
                                </p>
                            )}
                        </li>
                        <li className="flex flex-col pb-2 border-b border-crm-border">
                            <div className="flex justify-between items-center mb-1">
                                <span>Comisiones a vendedores</span>
                                <div className="text-right">
                                    <span className="font-bold text-crm-fg block">{formatMoney(porPagar.comisiones.USD, 'USD')}</span>
                                    <span className="font-bold text-crm-fg block">{formatMoney(porPagar.comisiones.ARS, 'ARS')}</span>
                                </div>
                            </div>
                            {porPagar.comisiones.explanation && (
                                <p className="text-[10px] text-crm-warning flex items-start gap-1 mt-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {porPagar.comisiones.explanation}
                                </p>
                            )}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
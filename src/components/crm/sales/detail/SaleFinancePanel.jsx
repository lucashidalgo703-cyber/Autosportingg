"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, ShieldAlert, ArrowDownRight, CheckCircle2, Lock } from 'lucide-react';
import TransactionModal from '../../finance/TransactionModal';
import TreasuryCollectAndDistributeModal from '../../treasury/TreasuryCollectAndDistributeModal';
import { useAdminTransactions } from '../../../../hooks/useAdminTransactions';

export default function SaleFinancePanel({ sale }) {
    const { fetchTransactions, createTransaction, updateTransaction, loading, error } = useAdminTransactions();
    const [transactions, setTransactions] = useState([]);
    const [financeData, setFinanceData] = useState(null);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [treasurySummary, setTreasurySummary] = useState(null);
    const [treasuryToken, setTreasuryToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('as_treasury_token') || null;
        }
        return null;
    });

    const loadData = async () => {
        // Fetch only transactions linked to this sale
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/admin/transactions?saleId=${sale._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error loading linked transactions", err);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/accounts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAccounts(data.accounts || (Array.isArray(data) ? data : []));
            }
        } catch (err) {
            console.error("Error loading accounts", err);
        }
    };

    const fetchTreasurySummary = async () => {
        if (!sale?._id) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${sale._id}/treasury-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const summaryData = data.summary || data.saleState;
                if (data.ok && summaryData) {
                    setTreasurySummary(summaryData);
                }
            }
        } catch (err) {
            console.error("Error loading treasury summary", err);
        }
    };

    useEffect(() => {
        if (sale && sale._id) {
            loadData();
            fetchAccounts();
            fetchTreasurySummary();
        }

        const handleRealtimeSync = (e) => {
            if (e?.detail?.saleId && sale?._id && String(e.detail.saleId) !== String(sale._id)) {
                return;
            }
            if (sale && sale._id) {
                loadData();
                fetchAccounts();
                fetchTreasurySummary();
            }
        };

        window.addEventListener('treasury-updated', handleRealtimeSync);
        window.addEventListener('sale-updated', handleRealtimeSync);
        window.addEventListener('account-balance-updated', handleRealtimeSync);
        return () => {
            window.removeEventListener('treasury-updated', handleRealtimeSync);
            window.removeEventListener('sale-updated', handleRealtimeSync);
            window.removeEventListener('account-balance-updated', handleRealtimeSync);
        };
    }, [sale]);

    const handleNewTransaction = (type = 'ingreso', category = 'Cobro venta') => {
        let suggestedAmount = '';
        if (type === 'ingreso' && financeData?.pendingBalance > 0) {
            suggestedAmount = financeData.pendingBalance;
        }

        setSelectedTx({
            saleId: sale._id,
            clientId: sale.clientId?._id || sale.clientId,
            vehicleId: sale.vehicleId?._id || sale.vehicleId,
            type: type,
            category: category,
            concept: type === 'ingreso' ? 'Cobro manual venta' : 'Gasto vinculado a venta',
            currency: sale.saleCurrency || 'ARS',
            amount: suggestedAmount
        });
        setIsModalOpen(true);
    };

    const handleEditTransaction = (tx) => {
        setSelectedTx(tx);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (data) => {
        try {
            if (selectedTx && selectedTx._id) {
                await updateTransaction(selectedTx._id, data);
            } else {
                await createTransaction(data);
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            console.error(err.message);
        }
    };

    const handleAnnulTransaction = async (id) => {
        try {
            await updateTransaction(id, { status: 'anulado' });
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            console.error(err.message);
        }
    };

    const metrics = useMemo(() => {
        let ingresosARS = 0, egresosARS = 0;
        let ingresosUSD = 0, egresosUSD = 0;
        let netoCobradoPrincipal = 0;

        const saleCurrency = sale.saleCurrency || 'ARS';
        
        let depositApplied = 0;
        if (sale.depositAppliedCurrency === saleCurrency && sale.depositAppliedAmount) {
            depositApplied = sale.depositAppliedAmount;
            netoCobradoPrincipal += depositApplied;
            if (saleCurrency === 'ARS') ingresosARS += depositApplied;
            else ingresosUSD += depositApplied;
        }

        transactions.forEach(tx => {
            if (tx.status === 'anulado') return;
            const amount = Number(tx.amount) || 0;
            
            if (tx.currency === 'ARS') {
                if (tx.type === 'Ingreso') ingresosARS += amount;
                else egresosARS += amount;
            } else if (tx.currency === 'USD') {
                if (tx.type === 'Ingreso') ingresosUSD += amount;
                else egresosUSD += amount;
            }

            if (tx.currency === saleCurrency) {
                if (tx.type === 'Ingreso') netoCobradoPrincipal += amount;
                else if (tx.type === 'Egreso') netoCobradoPrincipal -= amount;
            }
        });

        const tradeInTotal = sale.tradeInTotalAmount || 0;
        const effectiveSalePrice = sale.salePrice - tradeInTotal;
        const pendingBalance = effectiveSalePrice - netoCobradoPrincipal;
        
        let collectionStatus = 'sin_cobro';
        if (netoCobradoPrincipal > 0 && netoCobradoPrincipal < effectiveSalePrice) collectionStatus = 'parcial';
        else if (netoCobradoPrincipal === effectiveSalePrice) collectionStatus = 'cobrada';
        else if (netoCobradoPrincipal > effectiveSalePrice) collectionStatus = 'sobrecobrada';

        const data = {
            ingresosARS, egresosARS, balanceARS: ingresosARS - egresosARS,
            ingresosUSD, egresosUSD, balanceUSD: ingresosUSD - egresosUSD,
            netoCobradoPrincipal,
            pendingBalance,
            collectionStatus,
            depositApplied,
            tradeInTotal,
            saleCurrency,
            salePrice: sale.salePrice,
            effectiveSalePrice
        };
        setFinanceData(data);
        return data;
    }, [transactions, sale]);

    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'sin_cobro': return <span className="text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">Sin Cobro</span>;
            case 'parcial': return <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">Cobro Parcial</span>;
            case 'cobrada': return <span className="text-xs font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">Cobrada</span>;
            case 'sobrecobrada': return <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/20">Sobrecobrada</span>;
            default: return null;
        }
    };

    return (
        <div className="bg-crm-surface border border-neutral-800 rounded-2xl overflow-hidden mt-6">
            <div className="p-6 border-b border-neutral-800 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Wallet size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-3">
                            Movimientos financieros
                            {financeData && renderStatusBadge(financeData.collectionStatus)}
                        </h2>
                        <p className="text-xs text-neutral-500 mt-0.5">Estos movimientos son registros manuales vinculados. No representan un plan de cuotas ni una conciliación automática.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => handleNewTransaction('egreso', 'Gasto venta')}
                        className="h-9 px-3 rounded-xl bg-crm-surface-raised hover:bg-neutral-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                        <span>Egreso vinculado</span>
                    </button>
                    <button
                        onClick={() => handleNewTransaction('ingreso', 'Cobro venta')}
                        className="h-9 px-3 rounded-xl border border-neutral-700 bg-crm-surface text-neutral-300 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={14} />
                        <span>Cobro manual simple</span>
                    </button>
                    <button
                        onClick={() => setIsTreasuryModalOpen(true)}
                        className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
                        title="Registrar cobro y distribuir automáticamente por tesorería"
                    >
                        <ArrowDownRight size={15} />
                        <span>Registrar cobro y distribuir</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-crm-red/10 text-red-400 p-4 border-b border-neutral-800 flex items-center gap-2 text-sm">
                    <ShieldAlert size={16} />
                    {error}
                </div>
            )}

            {financeData && financeData.pendingBalance > 0 && (
                <div className="bg-yellow-500/10 text-yellow-500 p-4 border-b border-neutral-800 flex items-center gap-2 text-sm font-bold">
                    Saldo pendiente estimado: {formatCurrency(financeData.pendingBalance, financeData.saleCurrency)}
                </div>
            )}

            {financeData && financeData.collectionStatus === 'sobrecobrada' && (
                <div className="bg-purple-500/10 text-purple-400 p-4 border-b border-neutral-800 flex items-center gap-2 text-sm font-bold">
                    <ShieldAlert size={16} />
                    Hay más movimientos ingresados que el precio de venta. Revisar conciliación manual.
                </div>
            )}

            <div className="p-6">
                {/* Métricas de Tesorería Estratégica para la Venta (Sección 3 y 9) */}
                {treasurySummary && (
                    <div className="mb-6 bg-purple-950/20 border border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3 border-b border-purple-500/20 pb-2">
                            <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                <ArrowDownRight size={14} /> Tesorería Estratégica: Estado de Recupero y Margen
                            </span>
                            <span className="text-[10px] text-purple-300/80 font-bold">
                                {treasurySummary.reinvestmentExtraConfigured ? `Extra Reinversión: ${treasurySummary.reinvestmentExtraPct}%` : 'Sin extra reinv.'}
                            </span>
                        </div>
                        <div className={`grid grid-cols-2 ${treasurySummary.reinvestmentExtraConfigured ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3 text-xs`}>
                            <div>
                                <span className="text-[10px] text-neutral-400 block uppercase">Efectivo Cobrado</span>
                                <strong className="font-mono text-emerald-400">{formatCurrency(treasurySummary.effectivelyCollectedCash || 0, sale.saleCurrency)}</strong>
                            </div>
                            <div>
                                <span className="text-[10px] text-neutral-400 block uppercase">Capital Recuperado (Stock)</span>
                                <strong className="font-mono text-cyan-300">{formatCurrency(treasurySummary.alreadyRecoveredCapital || 0, sale.saleCurrency)}</strong>
                                {treasurySummary.remainingCapitalToRecover > 0 && (
                                    <span className="text-[9px] text-neutral-500 block">Pend: {formatCurrency(treasurySummary.remainingCapitalToRecover, sale.saleCurrency)}</span>
                                )}
                            </div>
                            {treasurySummary.reinvestmentExtraConfigured && (
                                <div>
                                    <span className="text-[10px] text-neutral-400 block uppercase">Extra Reinv. (Stock)</span>
                                    <strong className="font-mono text-emerald-300">{formatCurrency(treasurySummary.alreadyAllocatedExtraReinvestment || 0, sale.saleCurrency)}</strong>
                                    {treasurySummary.remainingReinvestmentExtraToReserve > 0 && (
                                        <span className="text-[9px] text-neutral-500 block">Pend: {formatCurrency(treasurySummary.remainingReinvestmentExtraToReserve, sale.saleCurrency)}</span>
                                    )}
                                </div>
                            )}
                            <div>
                                <span className="text-[10px] text-neutral-400 block uppercase">Margen ya Distribuido</span>
                                <strong className="font-mono text-purple-300">{formatCurrency(treasurySummary.alreadyDistributedMargin || 0, sale.saleCurrency)}</strong>
                            </div>
                            <div>
                                <span className="text-[10px] text-neutral-400 block uppercase">Margen Cobrado Disponible</span>
                                <strong className="font-mono text-emerald-300">{formatCurrency(treasurySummary.availableMarginCollectedTotal || 0, sale.saleCurrency)}</strong>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-6 bg-crm-surface-raised/30 rounded-xl p-5 border border-neutral-800">
                    <h3 className="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-wider">Estado de cobranza</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        <div>
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Precio Venta</div>
                            <div className="text-sm font-bold text-white">{formatCurrency(sale.salePrice, sale.saleCurrency)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Permuta</div>
                            <div className="text-sm font-bold text-purple-400">
                                {financeData?.tradeInTotal > 0 ? `-${formatCurrency(financeData.tradeInTotal, sale.saleCurrency)}` : '$0'}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Seña Aplicada</div>
                            <div className="text-sm font-bold text-neutral-300">{formatCurrency(financeData?.depositApplied || 0, sale.saleCurrency)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Neto Cobrado</div>
                            <div className="text-sm font-bold text-green-400">{formatCurrency(financeData?.netoCobradoPrincipal || 0, sale.saleCurrency)}</div>
                        </div>
                        <div className="col-span-2">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Saldo Pendiente</div>
                            <div className={`text-sm font-bold ${financeData?.pendingBalance > 0 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                                {formatCurrency(financeData?.pendingBalance || 0, sale.saleCurrency)}
                            </div>
                        </div>
                    </div>
                </div>

                {financeData && ((financeData.saleCurrency === 'ARS' && (financeData.ingresosUSD > 0 || financeData.egresosUSD > 0)) || (financeData.saleCurrency === 'USD' && (financeData.ingresosARS > 0 || financeData.egresosARS > 0))) && (
                    <div className="mb-6 bg-crm-bg rounded-xl p-5 border border-neutral-800 border-dashed">
                        <h3 className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Movimientos en otra moneda no aplicados al saldo</h3>
                        <div className="flex gap-6">
                            {financeData.saleCurrency === 'ARS' ? (
                                <>
                                    <div><span className="text-[10px] text-neutral-500 uppercase">Ingresos USD: </span><span className="text-sm text-green-400 font-bold">{formatCurrency(financeData.ingresosUSD, 'USD')}</span></div>
                                    <div><span className="text-[10px] text-neutral-500 uppercase">Egresos USD: </span><span className="text-sm text-red-400 font-bold">{formatCurrency(financeData.egresosUSD, 'USD')}</span></div>
                                </>
                            ) : (
                                <>
                                    <div><span className="text-[10px] text-neutral-500 uppercase">Ingresos ARS: </span><span className="text-sm text-green-400 font-bold">{formatCurrency(financeData.ingresosARS, 'ARS')}</span></div>
                                    <div><span className="text-[10px] text-neutral-500 uppercase">Egresos ARS: </span><span className="text-sm text-red-400 font-bold">{formatCurrency(financeData.egresosARS, 'ARS')}</span></div>
                                </>
                            )}
                        </div>
                    </div>
                )}


                {loading ? (
                    <div className="text-center py-8 text-neutral-500">Cargando movimientos...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 bg-crm-surface-raised/20 rounded-xl border border-neutral-800 border-dashed">
                        No hay movimientos manuales vinculados a esta venta.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-crm-surface-raised/20">
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Fecha</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Concepto</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Monto</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx._id} className="border-b border-neutral-800/50 hover:bg-crm-surface-raised/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="text-sm text-neutral-300">
                                                {new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR')}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-bold text-white">{tx.concept}</div>
                                            <div className="text-xs text-neutral-500 capitalize">
                                                {tx.paymentMethod} {tx.account?.name ? `· ${tx.account.name}` : ''}
                                                {tx.recordedBy?.name && ` · Registró: ${tx.recordedBy.name}`}
                                            </div>
                                            {tx.treasuryBreakdown && (
                                                <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-mono">
                                                    {tx.treasuryBreakdown.capitalRecoveredToStock > 0 && (
                                                        <span className="rounded bg-cyan-500/20 text-cyan-300 px-1 py-0.2">
                                                            Stock: {formatCurrency(tx.treasuryBreakdown.capitalRecoveredToStock, tx.currency)}
                                                        </span>
                                                    )}
                                                    {tx.treasuryBreakdown.marginDistributed > 0 && (
                                                        <span className="rounded bg-purple-500/20 text-purple-300 px-1 py-0.2">
                                                            Margen: {formatCurrency(tx.treasuryBreakdown.marginDistributed, tx.currency)}
                                                        </span>
                                                    )}
                                                    {tx.treasuryBreakdown.schemeUsed && (
                                                        <span className="rounded bg-neutral-800 text-neutral-400 px-1 py-0.2 uppercase">
                                                            {tx.treasuryBreakdown.schemeUsed.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className={`text-sm font-bold ${tx.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'} ${tx.status === 'anulado' ? 'line-through opacity-50' : ''}`}>
                                                {tx.type === 'Ingreso' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {tx.status === 'anulado' ? (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-2 py-1 rounded-md border border-red-400/20">
                                                    Anulado
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-2 py-1 rounded-md border border-green-400/20">
                                                    Activo
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button 
                                                onClick={() => handleEditTransaction(tx)}
                                                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                transaction={selectedTx}
                onSave={handleSaveTransaction}
                onAnnul={handleAnnulTransaction}
            />

            <TreasuryCollectAndDistributeModal
                isOpen={isTreasuryModalOpen}
                onClose={() => setIsTreasuryModalOpen(false)}
                accounts={accounts}
                initialSale={sale}
                initialSaleId={sale?._id}
                treasuryToken={treasuryToken}
                onSuccess={() => {
                    setIsTreasuryModalOpen(false);
                    loadData();
                    fetchTreasurySummary();
                }}
            />
        </div>
    );
}

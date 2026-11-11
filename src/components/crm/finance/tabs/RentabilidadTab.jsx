import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { parseResponseSafe } from '../../../../utils/apiHelper';
import { PieChart, Loader2 } from 'lucide-react';

export default function RentabilidadTab() {
    const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
    const [currency, setCurrency] = useState('USD');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/finance/profitability?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(await parseResponseSafe(res));
        } catch (error) {
            toast.error('Error cargando rentabilidad: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    const formatMoney = (amount) => {
        return `${currency === 'USD' ? 'USD' : 'ARS'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const income = data ? (currency === 'USD' ? data.totalsUSD.ingresos : data.totalsARS.ingresos) : 0;
    const expense = data ? (currency === 'USD' ? data.totalsUSD.egresos : data.totalsARS.egresos) : 0;
    const net = data ? (currency === 'USD' ? data.neto.USD : data.neto.ARS) : 0;

    const categories = data?.categories?.[currency] || {};
    const catKeys = Object.keys(categories);
    const incomeCats = catKeys.filter(k => categories[k].ingresos > 0);
    const expenseCats = catKeys.filter(k => categories[k].egresos > 0);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-crm-border bg-crm-bg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <p className="text-sm font-bold text-crm-fg-muted">Rentabilidad del área Finanzas / Gestoría — ingresos y egresos operativos.</p>

                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="h-9 rounded-lg border border-crm-border bg-crm-surface px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                    />
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="h-9 rounded-lg border border-crm-border bg-crm-surface px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                    >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center p-12 text-crm-fg-muted">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">INGRESOS DEL ÁREA</h3>
                            <p className="mt-2 text-xl font-black text-green-500">{formatMoney(income)}</p>
                        </div>
                        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">EGRESOS DEL ÁREA</h3>
                            <p className="mt-2 text-xl font-black text-crm-red">{formatMoney(expense)}</p>
                        </div>
                        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">NETO DEL ÁREA</h3>
                            <p className={`mt-2 text-xl font-black ${net >= 0 ? 'text-crm-fg' : 'text-crm-red'}`}>{formatMoney(net)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">SEÑAS ACTIVAS</h3>
                            <p className="mt-2 text-xl font-black text-crm-fg">{data?.activeReservations?.count || 0} Vigentes</p>
                            <p className="mt-1 text-sm font-bold text-crm-fg-muted">Total: {formatMoney(currency === 'USD' ? data?.activeReservations?.totalUSD : data?.activeReservations?.totalARS)}</p>
                        </div>
                        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">CUOTAS PENDIENTES</h3>
                            <p className="mt-2 text-xl font-black text-crm-fg">{data?.pendingInstallments?.count || 0} Pendientes</p>
                            <p className="mt-1 text-sm font-bold text-crm-fg-muted">Total: {formatMoney(currency === 'USD' ? data?.pendingInstallments?.totalUSD : data?.pendingInstallments?.totalARS)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChart size={16} className="text-green-500" />
                                <h3 className="text-base font-black text-crm-fg">Ingresos por categoría</h3>
                            </div>

                            {incomeCats.length > 0 ? (
                                <div className="space-y-3">
                                    {incomeCats.map(c => (
                                        <div key={c} className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-crm-fg-muted">{c}</span>
                                            <span className="font-bold text-crm-fg">{formatMoney(categories[c].ingresos)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm font-bold text-crm-fg-muted">No hay desglose de ingresos registrado.</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChart size={16} className="text-crm-red" />
                                <h3 className="text-base font-black text-crm-fg">Egresos por categoría</h3>
                            </div>

                            {expenseCats.length > 0 ? (
                                <div className="space-y-3">
                                    {expenseCats.map(c => (
                                        <div key={c} className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-crm-fg-muted">{c}</span>
                                            <span className="font-bold text-crm-fg">{formatMoney(categories[c].egresos)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm font-bold text-crm-fg-muted">No hay desglose de egresos registrado.</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            <p className="text-xs font-bold text-crm-fg-subtle italic">Nota: La rentabilidad integral por venta de vehículo se muestra en el módulo de Reportes.</p>
        </div>
    );
}
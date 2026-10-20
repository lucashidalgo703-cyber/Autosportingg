"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { 
    FileSpreadsheet, Plus, Edit, Trash2, Users, Award, Wrench, UserCheck, 
    Truck, Car, MoreHorizontal, Filter, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';

export default function ResumenGastosTab({ allTransactions = [], onEdit, onDelete, onNew }) {
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [activeView, setActiveView] = useState('pagados'); // 'pagados' | 'pendientes'
    const [pendingPurchases, setPendingPurchases] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);

    // Cargar compras pendientes de pago desde el backend
    useEffect(() => {
        const fetchPendingExpenses = async () => {
            setLoadingPending(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/admin/finance/expenses-summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.ok && data.pendingCommitments) {
                    setPendingPurchases(data.pendingCommitments.cars || []);
                }
            } catch (err) {
                console.error('Error fetching expenses summary:', err);
            } finally {
                setLoadingPending(false);
            }
        };
        fetchPendingExpenses();
    }, []);

    const egresosTransactions = useMemo(() => {
        return allTransactions.filter(tx => 
            tx.status !== 'anulado' && 
            tx.type?.toLowerCase() === 'egreso'
        ).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }, [allTransactions]);

    // Función de clasificación por categoría
    const getCategoryGroup = (tx) => {
        const cat = (tx.category || '').toLowerCase();
        const desc = (tx.concept || tx.description || '').toLowerCase();

        if (cat.includes('sueldo') || desc.includes('sueldo') || cat.includes('salario') || cat.includes('empleado')) {
            return 'sueldos';
        }
        if (cat.includes('comision') || desc.includes('comision') || cat.includes('comisión')) {
            return 'comisiones';
        }
        if (cat.includes('taller') || desc.includes('taller') || cat.includes('mantenimiento') || cat.includes('mecanic') || cat.includes('chapa')) {
            return 'taller';
        }
        if (cat.includes('personal') || desc.includes('retiro personal') || cat.includes('retiro') || desc.includes('socio')) {
            return 'gastos_personales';
        }
        if (cat.includes('proveedor') || desc.includes('proveedor') || cat.includes('servicio') || cat.includes('luz') || cat.includes('alquiler')) {
            return 'proveedores';
        }
        if (cat.includes('compra_vehiculo') || cat.includes('compra') || desc.includes('compra de vehículo') || desc.includes('adquisición') || desc.includes('stock')) {
            return 'compra_vehiculos';
        }
        return 'otros';
    };

    // Métricas por categoría
    const categorizedMetrics = useMemo(() => {
        const cats = {
            sueldos: { key: 'sueldos', label: 'Sueldos y Personal', icon: Users, totalARS: 0, totalUSD: 0, count: 0, color: 'text-blue-400' },
            comisiones: { key: 'comisiones', label: 'Comisiones Ventas', icon: Award, totalARS: 0, totalUSD: 0, count: 0, color: 'text-amber-400' },
            taller: { key: 'taller', label: 'Taller y Reparaciones', icon: Wrench, totalARS: 0, totalUSD: 0, count: 0, color: 'text-cyan-400' },
            gastos_personales: { key: 'gastos_personales', label: 'Gastos Personales', icon: UserCheck, totalARS: 0, totalUSD: 0, count: 0, color: 'text-emerald-400' },
            proveedores: { key: 'proveedores', label: 'Proveedores y Servicios', icon: Truck, totalARS: 0, totalUSD: 0, count: 0, color: 'text-indigo-400' },
            compra_vehiculos: { key: 'compra_vehiculos', label: 'Compra de Vehículos', icon: Car, totalARS: 0, totalUSD: 0, count: 0, color: 'text-purple-400' },
            otros: { key: 'otros', label: 'Otros Gastos Operativos', icon: MoreHorizontal, totalARS: 0, totalUSD: 0, count: 0, color: 'text-crm-fg-muted' }
        };

        let grandARS = 0;
        let grandUSD = 0;

        egresosTransactions.forEach(tx => {
            const group = getCategoryGroup(tx);
            const amt = Number(tx.amount) || 0;
            if (tx.currency === 'USD') {
                cats[group].totalUSD += amt;
                grandUSD += amt;
            } else {
                cats[group].totalARS += amt;
                grandARS += amt;
            }
            cats[group].count++;
        });

        return { cats, grandARS, grandUSD };
    }, [egresosTransactions]);

    // Filtrar transacciones según categoría seleccionada
    const filteredTransactions = useMemo(() => {
        if (selectedCategory === 'todos') return egresosTransactions;
        return egresosTransactions.filter(tx => getCategoryGroup(tx) === selectedCategory);
    }, [egresosTransactions, selectedCategory]);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div className="space-y-5">
            {/* Cabecera de totales globales */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">
                            TOTAL GASTOS PAGADOS (ARS)
                        </h3>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Efectivamente abonado
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-crm-red">{formatMoney(categorizedMetrics.grandARS, 'ARS')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">
                            TOTAL GASTOS PAGADOS (USD)
                        </h3>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Efectivamente abonado
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-crm-red">{formatMoney(categorizedMetrics.grandUSD, 'USD')}</p>
                </div>
            </div>

            {/* Selector de Vista: Gastos Pagados vs Compromisos Pendientes */}
            <div className="flex items-center justify-between gap-3 border-b border-crm-border pb-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveView('pagados')}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeView === 'pagados'
                                ? 'bg-crm-surface text-white border border-crm-border shadow'
                                : 'text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Gastos Efectivamente Pagados ({egresosTransactions.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('pendientes')}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeView === 'pendientes'
                                ? 'bg-crm-surface text-white border border-crm-border shadow'
                                : 'text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <Clock size={14} className="text-amber-400" />
                        Compras y Compromisos Pendientes ({pendingPurchases.length})
                    </button>
                </div>

                {activeView === 'pagados' && (
                    <button 
                        onClick={onNew} 
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95"
                    >
                        <Plus size={14} /> Registrar Gasto
                    </button>
                )}
            </div>

            {/* VISTA 1: GASTOS PAGADOS CATEGORIZADOS */}
            {activeView === 'pagados' && (
                <>
                    {/* Tarjetas de Desglose por Categoría */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('todos')}
                            className={`p-3 rounded-xl border text-left transition ${
                                selectedCategory === 'todos'
                                    ? 'border-crm-red bg-crm-surface text-white shadow'
                                    : 'border-crm-border bg-crm-bg/40 text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised'
                            }`}
                        >
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block mb-1">Todas las categorías</span>
                            <span className="text-sm font-black text-white block">
                                {egresosTransactions.length} movimientos
                            </span>
                        </button>

                        {Object.values(categorizedMetrics.cats).map(cat => {
                            const IconComponent = cat.icon;
                            const isSelected = selectedCategory === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setSelectedCategory(isSelected ? 'todos' : cat.key)}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                        isSelected
                                            ? 'border-crm-red bg-crm-surface text-white shadow'
                                            : 'border-crm-border bg-crm-bg/40 text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <IconComponent size={14} className={cat.color} />
                                        <span className="text-xs font-bold truncate text-white">{cat.label}</span>
                                    </div>
                                    <div>
                                        {cat.totalARS > 0 && (
                                            <p className="text-xs font-black text-crm-fg">
                                                $ {Number(cat.totalARS).toLocaleString('es-AR')}
                                            </p>
                                        )}
                                        {cat.totalUSD > 0 && (
                                            <p className="text-xs font-black text-emerald-400">
                                                USD {Number(cat.totalUSD).toLocaleString('es-AR')}
                                            </p>
                                        )}
                                        {cat.totalARS === 0 && cat.totalUSD === 0 && (
                                            <p className="text-xs font-semibold text-crm-fg-muted">$ 0</p>
                                        )}
                                        <span className="text-[10px] text-crm-fg-muted mt-1 block">
                                            {cat.count} registro(s)
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tabla de Egresos */}
                    <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <div className="p-4 border-b border-crm-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-crm-fg-muted" />
                                <span className="text-xs font-bold text-white">
                                    Listado de Gastos {selectedCategory !== 'todos' ? `— ${categorizedMetrics.cats[selectedCategory]?.label}` : ''}
                                </span>
                            </div>
                            <span className="text-xs text-crm-fg-muted">
                                {filteredTransactions.length} resultado(s)
                            </span>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-crm-surface-raised border-b border-crm-border">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Descripción / Origen</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Categoría</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Medio de Pago</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Monto</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-crm-border">
                                    {filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                        <FileSpreadsheet className="text-crm-fg-muted" size={24} />
                                                    </div>
                                                    <h4 className="font-bold text-crm-fg">Sin gastos en esta categoría</h4>
                                                    <p className="text-sm text-crm-fg-muted max-w-sm">No se encontraron egresos registrados con este filtro.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map(tx => (
                                            <tr key={tx._id} className="hover:bg-crm-surface-raised transition-colors">
                                                <td className="px-4 py-3 text-sm text-crm-fg whitespace-nowrap">{new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR')}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-crm-fg">{tx.concept || tx.description || '-'}</td>
                                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-crm-bg text-crm-fg-subtle">
                                                        {tx.category || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-crm-fg-subtle capitalize whitespace-nowrap">{tx.paymentMethod || '-'}</td>
                                                <td className="px-4 py-3 text-sm font-black text-crm-red text-right whitespace-nowrap">{formatMoney(tx.amount, tx.currency)}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => onEdit(tx)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-crm-bg rounded-lg transition-colors" title="Editar">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => onDelete(tx)} className="p-1.5 text-neutral-400 hover:text-crm-red hover:bg-crm-red/10 rounded-lg transition-colors" title="Anular">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {/* VISTA 2: COMPROMISOS Y COMPRAS PENDIENTES */}
            {activeView === 'pendientes' && (
                <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden space-y-4 p-5">
                    <div className="flex items-center justify-between border-b border-crm-border pb-3">
                        <div>
                            <h4 className="text-sm font-black text-white">Compromisos de Compra Pendientes de Pago</h4>
                            <p className="text-xs text-crm-fg-muted mt-0.5">
                                Unidades propias dadas de alta en Stock con saldo pendiente por liquidar.
                            </p>
                        </div>
                    </div>

                    {loadingPending ? (
                        <div className="p-8 text-center text-xs text-crm-fg-muted">
                            Cargando compromisos pendientes...
                        </div>
                    ) : pendingPurchases.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
                            <h5 className="font-bold text-white text-sm">No hay compras de stock pendientes de pago</h5>
                            <p className="text-xs text-crm-fg-muted">Todas las unidades propias en stock están 100% liquidadas.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-crm-border rounded-xl border border-crm-border bg-crm-bg/60 overflow-hidden">
                            {pendingPurchases.map(car => (
                                <div key={car._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-crm-surface-raised transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-white text-sm">
                                                {car.brand} {car.name}
                                            </span>
                                            {car.plate && (
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-amber-300 border border-amber-500/30">
                                                    {car.plate}
                                                </span>
                                            )}
                                        </div>
                                        {car.expectedFundsNote && (
                                            <p className="text-xs text-amber-300">
                                                <span className="font-bold">Previsión:</span> {car.expectedFundsNote}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs text-gray-400 block">Saldo por abonar</span>
                                        <span className="text-base font-black text-amber-400">
                                            {car.currency} {Number(car.pendingDebt || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

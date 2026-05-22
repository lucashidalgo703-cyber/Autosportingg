"use client";
import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, TrendingDown, Plus, Trash2, Search, DollarSign, Calendar, 
    ArrowUpRight, ArrowDownRight, Loader2, Building, Wallet, CreditCard, 
    Coins, Filter, Info, X, BarChart3, Receipt, FileText, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES_INCOME = [
    "Venta de vehículo",
    "Cobro de cuota",
    "Seña",
    "Aporte de socio",
    "Otro Ingreso"
];

const CATEGORIES_EXPENSE = [
    "Compra de vehículo",
    "Repuestos",
    "Gestoría",
    "Comisiones",
    "Infracción",
    "Taller / Reparación",
    "Retiro de socio",
    "Otro Egreso"
];

const Finanzas = ({ cars = [] }) => {
    // State management
    const [activeTab, setActiveTab] = useState('resumen'); // 'resumen', 'movimientos', 'cuentas'
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modals state
    const [showTxModal, setShowTxModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);

    // Filters for transactions table
    const [filterSearch, setFilterSearch] = useState('');
    const [filterCurrency, setFilterCurrency] = useState('ALL'); // 'ALL', 'USD', 'ARS'
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'Ingreso', 'Egreso'

    // Form states
    const [txForm, setTxForm] = useState({
        type: 'Ingreso',
        amount: '',
        currency: 'USD',
        description: '',
        category: 'Venta de vehículo',
        date: new Date().toISOString().split('T')[0],
        accountId: '',
        notes: '',
        carId: ''
    });

    const [accountForm, setAccountForm] = useState({
        name: '',
        type: 'Efectivo',
        currency: 'USD',
        openingBalance: '0'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // API Base URL config
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');

    // Fetch data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch accounts
            const accRes = await fetch(`${baseUrl}/api/accounts`, { headers });
            const txRes = await fetch(`${baseUrl}/api/transactions`, { headers });

            if (accRes.ok && txRes.ok) {
                const accData = await accRes.json();
                const txData = await txRes.json();
                setAccounts(accData);
                setTransactions(txData);

                // Auto-select first account matching transaction currency in form
                const matchingAcc = accData.find(a => a.currency === txForm.currency);
                if (matchingAcc) {
                    setTxForm(prev => ({ ...prev, accountId: matchingAcc._id }));
                }
            } else {
                toast.error('Error al cargar datos financieros');
            }
        } catch (error) {
            console.error('Error fetching financial data:', error);
            toast.error('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Sync form categories when type changes
    useEffect(() => {
        if (txForm.type === 'Ingreso') {
            setTxForm(prev => ({ ...prev, category: CATEGORIES_INCOME[0] }));
        } else {
            setTxForm(prev => ({ ...prev, category: CATEGORIES_EXPENSE[0] }));
        }
    }, [txForm.type]);

    // Reactively filter active accounts based on selected transaction currency
    const filteredAccountsForTx = accounts.filter(acc => acc.currency === txForm.currency && acc.isActive);

    // Sync account select in form when currency changes
    useEffect(() => {
        if (filteredAccountsForTx.length > 0) {
            // If already set and belongs to the new list, keep it
            const currentIsValid = filteredAccountsForTx.some(a => a._id === txForm.accountId);
            if (!currentIsValid) {
                setTxForm(prev => ({ ...prev, accountId: filteredAccountsForTx[0]._id }));
            }
        } else {
            setTxForm(prev => ({ ...prev, accountId: '' }));
        }
    }, [txForm.currency, accounts]);

    // Handle account creation
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!accountForm.name.trim()) {
            toast.error('Por favor ingresa un nombre para la caja');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${baseUrl}/api/accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(accountForm)
            });

            if (res.ok) {
                toast.success('Caja/Cuenta registrada con éxito');
                setShowAccountModal(false);
                setAccountForm({ name: '', type: 'Efectivo', currency: 'USD', openingBalance: '0' });
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Error al registrar cuenta');
            }
        } catch (error) {
            console.error('Error creating account:', error);
            toast.error('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle transaction creation
    const handleCreateTx = async (e) => {
        e.preventDefault();
        if (!txForm.amount || Number(txForm.amount) <= 0) {
            toast.error('Por favor ingresa un monto válido');
            return;
        }
        if (!txForm.description.trim()) {
            toast.error('Por favor ingresa una descripción');
            return;
        }
        if (!txForm.accountId) {
            toast.error('Debes seleccionar una caja activa');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${baseUrl}/api/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(txForm)
            });

            if (res.ok) {
                toast.success('Movimiento registrado con éxito');
                setShowTxModal(false);
                setTxForm(prev => ({
                    ...prev,
                    amount: '',
                    description: '',
                    notes: '',
                    carId: ''
                }));
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Error al registrar movimiento');
            }
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete transaction
    const handleDeleteTx = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este movimiento? Se revertirá el saldo de la caja afectada.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${baseUrl}/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Movimiento eliminado y saldo revertido');
                fetchData();
            } else {
                toast.error('Error al eliminar movimiento');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            toast.error('Error de conexión');
        }
    };

    // Handle delete account
    const handleDeleteAccount = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta caja? Se eliminarán todos sus movimientos contables vinculados de forma permanente.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${baseUrl}/api/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Caja y movimientos eliminados');
                fetchData();
            } else {
                toast.error('Error al eliminar caja');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Error de conexión');
        }
    };

    // Helper for Account icons
    const getAccountIcon = (type) => {
        switch (type) {
            case 'Banco': return <Building size={20} />;
            case 'Tarjeta': return <CreditCard size={20} />;
            case 'Billetera': return <Coins size={20} />;
            default: return <Wallet size={20} />;
        }
    };

    // Filter transactions
    const filteredTxs = transactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(filterSearch.toLowerCase()) || 
                              tx.category.toLowerCase().includes(filterSearch.toLowerCase());
        const matchesCurrency = filterCurrency === 'ALL' || tx.currency === filterCurrency;
        const matchesType = filterType === 'ALL' || tx.type === filterType;
        return matchesSearch && matchesCurrency && matchesType;
    });

    // Calculate dynamic dashboard summaries
    const totalBalanceARS = accounts.filter(a => a.currency === 'ARS').reduce((sum, a) => sum + a.balance, 0);
    const totalBalanceUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);

    const totalIncomesUSD = transactions.filter(t => t.type === 'Ingreso' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
    const totalExpensesUSD = transactions.filter(t => t.type === 'Egreso' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);

    const totalIncomesARS = transactions.filter(t => t.type === 'Ingreso' && t.currency === 'ARS').reduce((sum, t) => sum + t.amount, 0);
    const totalExpensesARS = transactions.filter(t => t.type === 'Egreso' && t.currency === 'ARS').reduce((sum, t) => sum + t.amount, 0);

    // Calculate totals of FILTERED transactions for period summary
    const filteredIncomesUSD = filteredTxs.filter(t => t.type === 'Ingreso' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
    const filteredExpensesUSD = filteredTxs.filter(t => t.type === 'Egreso' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
    const filteredNetUSD = filteredIncomesUSD - filteredExpensesUSD;

    const filteredIncomesARS = filteredTxs.filter(t => t.type === 'Ingreso' && t.currency === 'ARS').reduce((sum, t) => sum + t.amount, 0);
    const filteredExpensesARS = filteredTxs.filter(t => t.type === 'Egreso' && t.currency === 'ARS').reduce((sum, t) => sum + t.amount, 0);
    const filteredNetARS = filteredIncomesARS - filteredExpensesARS;

    // Helper for category expense summary list
    const expenseByCatUSD = {};
    const expenseByCatARS = {};

    transactions.filter(t => t.type === 'Egreso').forEach(t => {
        if (t.currency === 'USD') {
            expenseByCatUSD[t.category] = (expenseByCatUSD[t.category] || 0) + t.amount;
        } else {
            expenseByCatARS[t.category] = (expenseByCatARS[t.category] || 0) + t.amount;
        }
    });

    const sortedExpensesUSD = Object.entries(expenseByCatUSD).sort((a, b) => b[1] - a[1]);
    const maxExpenseUSD = sortedExpensesUSD.length > 0 ? sortedExpensesUSD[0][1] : 1;

    const sortedExpensesARS = Object.entries(expenseByCatARS).sort((a, b) => b[1] - a[1]);
    const maxExpenseARS = sortedExpensesARS.length > 0 ? sortedExpensesARS[0][1] : 1;

    return (
        <div className="space-y-6 w-full text-white">
            
            {/* Header Title with Subtitle & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Finanzas</h1>
                    <p className="text-sm text-zinc-400">Control de caja diaria, libro contable e historial de transacciones.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowAccountModal(true)} 
                        className="bg-[#18181b] hover:bg-[#27272a] text-zinc-200 border border-zinc-800 rounded-lg px-4 py-2 text-xs font-semibold tracking-wider transition-all duration-200 uppercase flex items-center gap-2"
                    >
                        <Plus size={14} /> Nueva Caja
                    </button>
                    <button 
                        onClick={() => setShowTxModal(true)} 
                        className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)] rounded-lg px-4 py-2 text-xs font-semibold tracking-wider transition-all duration-200 uppercase flex items-center gap-2"
                    >
                        <Plus size={14} /> Registrar Movimiento
                    </button>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="bg-[#111318] border border-[#1f242f] rounded-xl p-1 flex overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
                <button 
                    onClick={() => setActiveTab('resumen')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${activeTab === 'resumen' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                >
                    <BarChart3 size={16} /> Resumen
                </button>
                <button 
                    onClick={() => setActiveTab('movimientos')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${activeTab === 'movimientos' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                >
                    <Receipt size={16} /> Movimientos (Libro Diario)
                </button>
                <button 
                    onClick={() => setActiveTab('cuentas')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all flex items-center gap-2 ${activeTab === 'cuentas' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                >
                    <Building size={16} /> Cajas y Cuentas
                </button>
            </div>

            {/* Loading Placeholder */}
            {isLoading ? (
                <div className="bg-[#111318] border border-[#1f242f] rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <p className="text-zinc-400 text-sm">Cargando registros financieros...</p>
                </div>
            ) : (
                <>
                    {/* TAB VIEW: RESUMEN (DASHBOARD) */}
                    {activeTab === 'resumen' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Side: Real Balances Grid (2 Columns) */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-[#111318] border border-[#1f242f] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Consolidado ARS</span>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-2xl lg:text-3xl font-black text-white">ARS {totalBalanceARS.toLocaleString('es-AR')}</span>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 mt-4 uppercase">Dinero en Cajas ARS activas</span>
                                    </div>
                                    <div className="bg-[#111318] border border-[#1f242f] p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Consolidado USD</span>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-2xl lg:text-3xl font-black text-white">USD {totalBalanceUSD.toLocaleString('en-US')}</span>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 mt-4 uppercase">Dinero en Cajas USD activas</span>
                                    </div>
                                </div>

                                {/* Available Money Per Account Cards */}
                                <div className="bg-[#111318] border border-[#1f242f] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="p-4 border-b border-[#1f242f] bg-[#14171d] flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Saldos Disponibles en Cajas</span>
                                        <span className="text-[10px] text-zinc-500 uppercase">Cuentas físicas y bancos</span>
                                    </div>
                                    <div className="divide-y divide-[#1f242f]">
                                        {accounts.length === 0 ? (
                                            <div className="p-8 text-center text-zinc-500 text-sm">No hay cajas activas registradas.</div>
                                        ) : (
                                            accounts.map(acc => (
                                                <div 
                                                    key={acc._id}
                                                    onClick={() => setActiveTab('movimientos')}
                                                    className="p-4 flex items-center justify-between hover:bg-[#161920] cursor-pointer transition-all duration-200 group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center group-hover:bg-red-600/10 group-hover:text-red-500 transition-colors">
                                                            {getAccountIcon(acc.type)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white leading-tight">{acc.name}</p>
                                                            <p className="text-xs text-zinc-500 mt-0.5">{acc.type} · {acc.currency}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm lg:text-base font-black text-zinc-100">
                                                            {acc.currency === 'USD' ? 'U$S ' : '$ '}
                                                            {acc.balance.toLocaleString(acc.currency === 'USD' ? 'en-US' : 'es-AR')}
                                                        </span>
                                                        <span className="text-zinc-600 group-hover:text-red-500 transition-colors">→</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Analytical charts & progress bar summaries */}
                            <div className="bg-[#111318] border border-[#1f242f] p-5 rounded-2xl shadow-xl flex flex-col justify-between h-full">
                                <div>
                                    <div className="border-b border-[#1f242f] pb-3 mb-4 flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Distribución de Gastos</span>
                                        <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider">Histórico</span>
                                    </div>
                                    <div className="space-y-4">
                                        {/* USD Expenses */}
                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-2.5">Egresos en USD</h4>
                                            {sortedExpensesUSD.length === 0 ? (
                                                <p className="text-[11px] text-zinc-600">No hay egresos USD registrados.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {sortedExpensesUSD.slice(0, 3).map(([cat, amount]) => {
                                                        const pct = Math.max(10, (amount / maxExpenseUSD) * 100);
                                                        return (
                                                            <div key={cat} className="space-y-1">
                                                                <div className="flex justify-between text-xs font-medium">
                                                                    <span className="text-zinc-400">{cat}</span>
                                                                    <span className="text-zinc-200">U$S {amount.toLocaleString('en-US')}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-red-600 rounded-full" style={{ width: `${pct}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* ARS Expenses */}
                                        <div className="pt-4 border-t border-[#1f242f]">
                                            <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-2.5">Egresos en ARS</h4>
                                            {sortedExpensesARS.length === 0 ? (
                                                <p className="text-[11px] text-zinc-600">No hay egresos ARS registrados.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {sortedExpensesARS.slice(0, 3).map(([cat, amount]) => {
                                                        const pct = Math.max(10, (amount / maxExpenseARS) * 100);
                                                        return (
                                                            <div key={cat} className="space-y-1">
                                                                <div className="flex justify-between text-xs font-medium">
                                                                    <span className="text-zinc-400">{cat}</span>
                                                                    <span className="text-zinc-200">$ {amount.toLocaleString('es-AR')}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-red-600 rounded-full" style={{ width: `${pct}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 border-t border-[#1f242f] pt-4 flex gap-4 text-center">
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase text-zinc-500">Ingresos USD</p>
                                        <p className="text-sm font-bold text-emerald-400 mt-1">+{totalIncomesUSD.toLocaleString('en-US')}</p>
                                    </div>
                                    <div className="w-px bg-[#1f242f]"></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase text-zinc-500">Egresos USD</p>
                                        <p className="text-sm font-bold text-red-400 mt-1">-{totalExpensesUSD.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB VIEW: MOVIMIENTOS (LEDGER DIARIO) */}
                    {activeTab === 'movimientos' && (
                        <div className="space-y-5 bg-[#111318] border border-[#1f242f] p-5 rounded-2xl shadow-xl">
                            
                            {/* SEARCH AND FILTERS */}
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-[#1f242f] pb-4">
                                <div className="flex items-center bg-[#1e1e24] rounded-lg px-3 py-1.5 border border-[#1f242f] w-full md:max-w-xs text-zinc-400 focus-within:border-zinc-500 focus-within:text-zinc-300 transition-colors">
                                    <Search size={16} className="shrink-0" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar descripción o categoría..." 
                                        value={filterSearch}
                                        onChange={(e) => setFilterSearch(e.target.value)}
                                        className="bg-transparent border-none outline-none text-xs w-full ml-2 text-white placeholder-zinc-500"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                                    
                                    {/* Currency Filter */}
                                    <div className="flex bg-[#161920] border border-[#1f242f] p-0.5 rounded-lg">
                                        {['ALL', 'USD', 'ARS'].map((curr) => (
                                            <button
                                                key={curr}
                                                onClick={() => setFilterCurrency(curr)}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${filterCurrency === curr ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {curr === 'ALL' ? 'Todos' : curr}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Type Filter */}
                                    <div className="flex bg-[#161920] border border-[#1f242f] p-0.5 rounded-lg">
                                        {['ALL', 'Ingreso', 'Egreso'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setFilterType(type)}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === type ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                {type === 'ALL' ? 'Ambos' : type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* TRANSACTIONS TABLE */}
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#1f242f] text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            <th className="py-3 px-4">Fecha</th>
                                            <th className="py-3 px-4">Descripción</th>
                                            <th className="py-3 px-4">Categoría</th>
                                            <th className="py-3 px-4">Caja</th>
                                            <th className="py-3 px-4">Tipo</th>
                                            <th className="py-3 px-4 text-right">Monto</th>
                                            <th className="py-3 px-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1f242f]">
                                        {filteredTxs.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="py-12 text-center text-zinc-500 text-sm">No se encontraron movimientos financieros con los filtros aplicados.</td>
                                            </tr>
                                        ) : (
                                            filteredTxs.map(tx => (
                                                <tr key={tx._id} className="hover:bg-[#161920] text-xs font-medium transition-colors">
                                                    <td className="py-3.5 px-4 text-zinc-500">
                                                        {new Date(tx.date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-extrabold text-zinc-100">{tx.description}</span>
                                                            {tx.carId && (
                                                                <span className="text-[10px] text-red-400 mt-0.5">🚗 Vinculado: {tx.carId.brand} {tx.carId.name}</span>
                                                            )}
                                                            {tx.notes && (
                                                                <span className="text-[10px] text-zinc-500 italic mt-0.5">{tx.notes}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-zinc-400">{tx.category}</td>
                                                    <td className="py-3.5 px-4 text-zinc-500 font-semibold">{tx.accountId?.name || 'N/A'}</td>
                                                    <td className="py-3.5 px-4">
                                                        {tx.type === 'Ingreso' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                <ArrowUpRight size={10} className="mr-1 shrink-0" /> Ingreso
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                                                <ArrowDownRight size={10} className="mr-1 shrink-0" /> Egreso
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={`py-3.5 px-4 text-right font-black ${tx.type === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {tx.type === 'Ingreso' ? '+' : '-'}
                                                        {tx.currency === 'USD' ? 'U$S ' : '$ '}
                                                        {tx.amount.toLocaleString(tx.currency === 'USD' ? 'en-US' : 'es-AR')}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button 
                                                            onClick={() => handleDeleteTx(tx._id)}
                                                            className="text-red-500 hover:text-red-400 transition-colors p-1"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ACCUMULATED PERIOD SUMMARIES (BOTTOM GRID) */}
                            <div className="pt-5 border-t border-[#1f242f] space-y-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Resumen del período filtrado</span>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* USD Grid */}
                                    <div className="bg-[#161920] border border-[#1f242f] p-4 rounded-xl space-y-3">
                                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Flujo de Caja USD</span>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="p-2 border border-emerald-500/20 bg-emerald-500/5 rounded-lg flex flex-col justify-center">
                                                <span className="text-[9px] font-bold uppercase text-zinc-500">Ingresos</span>
                                                <span className="text-emerald-400 font-extrabold mt-1">U$S {filteredIncomesUSD.toLocaleString('en-US')}</span>
                                            </div>
                                            <div className="p-2 border border-red-500/20 bg-red-500/5 rounded-lg flex flex-col justify-center">
                                                <span className="text-[9px] font-bold uppercase text-zinc-500">Egresos</span>
                                                <span className="text-red-400 font-extrabold mt-1">U$S {filteredExpensesUSD.toLocaleString('en-US')}</span>
                                            </div>
                                            <div className={`p-2 border rounded-lg flex flex-col justify-center ${filteredNetUSD >= 0 ? 'border-sky-500/20 bg-sky-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                                <span className="text-[9px] font-bold uppercase text-zinc-500">Balance</span>
                                                <span className={`font-black mt-1 ${filteredNetUSD >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                                                    U$S {filteredNetUSD.toLocaleString('en-US')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ARS Grid */}
                                    <div className="bg-[#161920] border border-[#1f242f] p-4 rounded-xl space-y-3">
                                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Flujo de Caja ARS</span>
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="p-2 border border-emerald-500/20 bg-emerald-500/5 rounded-lg flex flex-col justify-center">
                                                <span className="text-[9px] font-bold uppercase text-zinc-500">Ingresos</span>
                                                <span className="text-emerald-400 font-extrabold mt-1">$ {filteredIncomesARS.toLocaleString('es-AR')}</span>
                                            </div>
                                            <div className="p-2 border border-red-500/20 bg-red-500/5 rounded-lg flex flex-col justify-center">
                                                <span className="text-[9px] font-bold uppercase text-zinc-500">Egresos</span>
                                                <span className="text-red-400 font-extrabold mt-1">$ {filteredExpensesARS.toLocaleString('es-AR')}</span>
                                            </div>
                                            <div className={`p-2 border rounded-lg flex flex-col justify-center ${filteredNetARS >= 0 ? 'border-sky-500/20 bg-sky-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                                <span className="text-[9px] font-bold uppercase text-zinc-500">Balance</span>
                                                <span className={`font-black mt-1 ${filteredNetARS >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                                                    $ {filteredNetARS.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB VIEW: CUENTAS (ACCOUNTS MANAGE) */}
                    {activeTab === 'cuentas' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {accounts.length === 0 ? (
                                <div className="col-span-full bg-[#111318] border border-[#1f242f] p-8 text-center text-zinc-500 rounded-2xl">
                                    No hay cajas o cuentas registradas. Crea una para poder registrar ingresos y egresos.
                                </div>
                            ) : (
                                accounts.map(acc => (
                                    <div key={acc._id} className="bg-[#111318] border border-[#1f242f] p-5 rounded-2xl flex flex-col justify-between shadow-lg relative group">
                                        <button 
                                            onClick={() => handleDeleteAccount(acc._id)}
                                            className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center">
                                                    {getAccountIcon(acc.type)}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">{acc.type}</span>
                                                </div>
                                            </div>
                                            <div className="mt-6 flex flex-col">
                                                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Balance disponible</span>
                                                <span className="text-xl lg:text-2xl font-black text-white mt-1">
                                                    {acc.currency === 'USD' ? 'U$S ' : '$ '}
                                                    {acc.balance.toLocaleString(acc.currency === 'USD' ? 'en-US' : 'es-AR')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-6 border-t border-[#1f242f] pt-3 flex justify-between items-center text-[10px] text-zinc-500">
                                            <span>MONEDA: {acc.currency}</span>
                                            <span className={acc.isActive ? 'text-emerald-400 font-bold uppercase' : 'text-zinc-600 uppercase'}>
                                                {acc.isActive ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            {/* MODAL: REGISTRAR MOVIMIENTO (INGRESOS/EGRESOS) */}
            {showTxModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111318] border border-[#1f242f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden scale-in-center">
                        <div className="px-5 py-4 border-b border-[#1f242f] bg-[#14171d] flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Registrar Movimiento Contable</span>
                            <button onClick={() => setShowTxModal(false)} className="text-zinc-500 hover:text-white p-1 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTx} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            
                            {/* In/Out Double Buttons */}
                            <div className="flex border border-[#1f242f] p-0.5 rounded-lg bg-[#161920]">
                                <button
                                    type="button"
                                    onClick={() => setTxForm(prev => ({ ...prev, type: 'Ingreso' }))}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${txForm.type === 'Ingreso' ? 'bg-[#0c1912] text-emerald-400 border border-[#1b3d2b]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <ArrowUpRight size={14} /> Ingreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTxForm(prev => ({ ...prev, type: 'Egreso' }))}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${txForm.type === 'Egreso' ? 'bg-[#190c0c] text-red-400 border border-[#3d1b1b]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <ArrowDownRight size={14} /> Egreso
                                </button>
                            </div>

                            {/* Amount and Currency */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Importe *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                            <DollarSign size={16} />
                                        </div>
                                        <input
                                            type="number"
                                            required
                                            min="0.01"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={txForm.amount}
                                            onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Moneda</label>
                                    <select
                                        value={txForm.currency}
                                        onChange={(e) => setTxForm(prev => ({ ...prev, currency: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Descripción / Concepto *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Seña Peugeot 208 2021 — Lucas Gómez"
                                    value={txForm.description}
                                    onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full h-9 px-4 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25 transition-all"
                                />
                            </div>

                            {/* Category and Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Categoría *</label>
                                    <select
                                        value={txForm.category}
                                        onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                    >
                                        {txForm.type === 'Ingreso' ? (
                                            CATEGORIES_INCOME.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                        ) : (
                                            CATEGORIES_EXPENSE.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Fecha *</label>
                                    <input
                                        type="date"
                                        required
                                        value={txForm.date}
                                        onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full h-9 px-4 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                    />
                                </div>
                            </div>

                            {/* Cajas (Accounts) Reactive Selector */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Caja / Cuenta Afectada *</label>
                                {filteredAccountsForTx.length === 0 ? (
                                    <div className="border border-amber-500/30 bg-amber-500/5 text-amber-300 p-3 rounded-lg flex items-start gap-2">
                                        <Info size={16} className="shrink-0 mt-0.5" />
                                        <span className="text-[11px] leading-relaxed">
                                            No hay cajas activas en <strong>{txForm.currency}</strong>. Debes crear una caja en esta moneda primero desde el módulo de finanzas para poder operar.
                                        </span>
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={txForm.accountId}
                                        onChange={(e) => setTxForm(prev => ({ ...prev, accountId: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                    >
                                        {filteredAccountsForTx.map(acc => (
                                            <option key={acc._id} value={acc._id}>{acc.name} (Saldo: {acc.currency === 'USD' ? 'U$S' : '$'} {acc.balance.toLocaleString()})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Optional Linked Car */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Vincular Vehículo (Opcional)</label>
                                <select
                                    value={txForm.carId}
                                    onChange={(e) => setTxForm(prev => ({ ...prev, carId: e.target.value }))}
                                    className="w-full h-9 px-3 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                >
                                    <option value="">-- Sin Vincular --</option>
                                    {cars.map(car => (
                                        <option key={car._id} value={car._id}>{car.brand} {car.name} ({car.year})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Comentarios / Notas</label>
                                <textarea
                                    rows="2"
                                    placeholder="Detalles complementarios..."
                                    value={txForm.notes}
                                    onChange={(e) => setTxForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full p-3 rounded-lg bg-[#161920] border border-[#1f242f] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                ></textarea>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 border-t border-[#1f242f] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTxModal(false)}
                                    className="px-4 py-2 border border-[#1f242f] bg-[#161920] hover:bg-[#20242e] text-zinc-400 hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || filteredAccountsForTx.length === 0}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" /> Registrando...
                                        </>
                                    ) : (
                                        'Registrar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: NUEVA CUENTA (CUESTA / CAJA) */}
            {showAccountModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111318] border border-[#1f242f] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
                        <div className="px-5 py-4 border-b border-[#1f242f] bg-[#14171d] flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Crear Nueva Caja / Cuenta</span>
                            <button onClick={() => setShowAccountModal(false)} className="text-zinc-500 hover:text-white p-1 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
                            
                            {/* Name */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Nombre de la Caja *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Caja Chica Efectivo USD, Banco Galicia..."
                                    value={accountForm.name}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full h-9 px-4 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25 transition-all"
                                />
                            </div>

                            {/* Type and Currency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Tipo de Caja</label>
                                    <select
                                        value={accountForm.type}
                                        onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Banco">Banco</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Billetera">Billetera Electrónica</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Moneda *</label>
                                    <select
                                        value={accountForm.currency}
                                        onChange={(e) => setAccountForm(prev => ({ ...prev, currency: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                                    >
                                        <option value="USD">Dólares (USD)</option>
                                        <option value="ARS">Pesos (ARS)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Opening Balance */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Saldo Inicial de Apertura</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                        <DollarSign size={16} />
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={accountForm.openingBalance}
                                        onChange={(e) => setAccountForm(prev => ({ ...prev, openingBalance: e.target.value }))}
                                        className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#161920] border border-[#1f242f] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25 transition-all"
                                    />
                                </div>
                                <span className="text-[9px] text-zinc-500 mt-1 block">Si es mayor a 0, creará automáticamente un asiento por Saldo Inicial.</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 border-t border-[#1f242f] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAccountModal(false)}
                                    className="px-4 py-2 border border-[#1f242f] bg-[#161920] hover:bg-[#20242e] text-zinc-400 hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" /> Creando...
                                        </>
                                    ) : (
                                        'Crear Caja'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
                .scale-in-center { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

        </div>
    );
};

export default Finanzas;

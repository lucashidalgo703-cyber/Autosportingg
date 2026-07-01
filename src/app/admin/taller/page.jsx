"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, Settings, Plus, RefreshCw } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { useAuth } from '../../../context/AuthContext';
import { workshopFetch } from '../../../utils/workshopApiClient';
import WorkshopOrdersView from '../../../components/crm/workshop/WorkshopOrdersView';
import WorkshopConfigModal from '../../../components/crm/workshop/WorkshopConfigModal';
import WorkshopOrderModal from '../../../components/crm/workshop/WorkshopOrderModal';
import toast from 'react-hot-toast';

export default function WorkshopPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('ing_taller'); // Ing. x taller activa por defecto
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Modals
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Fetch all orders for counts and data
    const fetchAllOrders = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Traemos las órdenes con un límite alto para tener el listado completo y calcular contadores
            const res = await workshopFetch('/api/admin/workshop/orders?limit=2000', { token });
            if (!res.ok) {
                throw new Error('Error al cargar órdenes de taller.');
            }
            const result = await res.json();
            setOrders(result.data || []);
        } catch (err) {
            toast.error(err.message || 'Error al conectar con la base de datos.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAllOrders();
    }, [fetchAllOrders, refreshTrigger]);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Mapped tabs for Sote CRM
    const tabs = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'ing_vendedor', label: 'Ingresado por vendedor' },
        { id: 'ing_taller', label: 'Ingresado por taller' },
        { id: 'presupuestado', label: 'Presupuestado' },
        { id: 'aprobado', label: 'Aprobado' },
        { id: 'en_proceso', label: 'En proceso' },
        { id: 'agenda', label: 'Agenda' },
        { id: 'recontacto', label: 'Recontacto' },
        { id: 'cerradas', label: 'Cerradas' },
        { id: 'historial', label: 'Historial' }
    ];

    // Count orders per tab
    const getTabCount = (tabId) => {
        switch (tabId) {
            case 'resumen':
                return orders.length;
            case 'ing_vendedor':
                return orders.filter(o => o.status === 'ingresado' && o.sellerId).length;
            case 'ing_taller':
                return orders.filter(o => o.status === 'ingresado' && !o.sellerId).length;
            case 'presupuestado':
                return orders.filter(o => ['cotizando', 'esperando_aprobacion'].includes(o.status)).length;
            case 'aprobado':
                return orders.filter(o => o.status === 'aprobado').length;
            case 'en_proceso':
                return orders.filter(o => ['enviado_proveedor', 'en_trabajo', 'terminado_proveedor'].includes(o.status)).length;
            case 'agenda':
                return orders.filter(o => o.status === 'recibido').length;
            case 'recontacto':
                return orders.filter(o => o.status === 'en_garantia').length;
            case 'cerradas':
                return orders.filter(o => ['listo', 'entregado'].includes(o.status)).length;
            case 'historial':
                return orders.filter(o => o.status === 'cancelado').length;
            default:
                return 0;
        }
    };

    return (
        <PermissionGuard permission={PERMISSIONS.TALLER_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-5 pb-24">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-crm-border pb-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-crm-fg flex items-center gap-2 m-0 uppercase tracking-tight">
                                    <Wrench className="text-crm-red animate-pulse" size={22} /> Taller
                                </h1>
                                <span className="rounded border border-crm-red/20 bg-crm-red/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-crm-red">
                                    Operaciones
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted m-0 font-medium">
                                Órdenes de trabajo del taller mecánico.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised transition-all"
                                title="Actualizar datos"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin text-crm-red' : ''} />
                            </button>

                            <button
                                onClick={() => setIsConfigOpen(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised transition-all shadow-sm"
                                title="Configuración del Taller"
                            >
                                <Settings size={16} />
                            </button>

                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider px-5 transition-all shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-95"
                            >
                                <Plus size={15} /> Nueva OT
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs (Scrollable Horizontal) */}
                    <div className="flex border-b border-crm-border/60 overflow-x-auto scrollbar-none snap-x -mx-4 px-4 md:-mx-6 md:px-6">
                        <div className="flex gap-1.5 pb-1">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                const count = getTabCount(tab.id);
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider border-0 border-b-2 bg-transparent transition-all snap-start shrink-0 ${
                                            isActive
                                                ? 'border-crm-red text-crm-fg font-black scale-102'
                                                : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                                            isActive 
                                                ? 'bg-crm-red text-white' 
                                                : 'bg-crm-border/60 text-crm-fg-muted'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-4">
                        <WorkshopOrdersView 
                            orders={orders}
                            loading={loading}
                            activeTab={activeTab}
                            onRefresh={handleRefresh}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <WorkshopConfigModal 
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
            />

            <WorkshopOrderModal 
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={handleRefresh}
            />
        </PermissionGuard>
    );
}

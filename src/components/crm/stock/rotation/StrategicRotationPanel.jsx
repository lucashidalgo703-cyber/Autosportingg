// src/components/crm/stock/rotation/StrategicRotationPanel.jsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Flame,
    RefreshCw,
    Download,
    TrendingUp,
    ShieldAlert,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { canReadStrategicRotation, isSalesRole } from '../../../../utils/adminPermissions';
import RotationExecutiveSummary from './RotationExecutiveSummary';
import LiquidityRecoveryTool from './LiquidityRecoveryTool';
import StrategicRotationTable from './StrategicRotationTable';
import VehicleStrategicDetailModal from './VehicleStrategicDetailModal';
import SellerPriorityList from './SellerPriorityList';

export default function StrategicRotationPanel() {
    const { user, token, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeCurrency, setActiveCurrency] = useState('ARS');
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    const isFinancialAuthorized = canReadStrategicRotation(user);
    const isSeller = isSalesRole(user);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const url = isSeller
                ? '/api/admin/stock/rotation/seller-priority'
                : '/api/admin/stock/rotation';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Error cargando rotación');
            setData(result);

            // Auto-detectar moneda si USD no tiene vehículos
            if (!isSeller && result.vehicles?.length > 0) {
                const arsCount = result.vehicles.filter(v => v.currency === 'ARS').length;
                const usdCount = result.vehicles.filter(v => v.currency === 'USD').length;
                if (arsCount > 0 && usdCount === 0 && activeCurrency !== 'ARS') {
                    setActiveCurrency('ARS');
                } else if (usdCount > 0 && arsCount === 0 && activeCurrency !== 'USD') {
                    setActiveCurrency('USD');
                }
            }
        } catch (error) {
            console.error('Error cargando rotación estratégica:', error);
            toast.error(error.message || 'Error al obtener rotación');
        } finally {
            setLoading(false);
        }
    }, [token, isSeller, activeCurrency]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (authLoading || (loading && !data)) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-purple-400" size={32} />
                    <span className="text-sm font-bold text-crm-fg-muted">
                        Analizando rotación estratégica y capital inmovilizado...
                    </span>
                </div>
            </div>
        );
    }

    // Vista sanitizada para vendedores
    if (isSeller || data?.isRestrictedSellerView) {
        return (
            <SellerPriorityList 
                vehicles={data?.vehicles || []} 
                summary={data?.summary || {}}
            />
        );
    }

    const kpis = data?.kpis || {};
    const vehicles = data?.vehicles || [];

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            
            {/* Header del Tab de Rotación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-crm-border pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Flame size={12} className="text-red-400" /> ROTACIÓN ESTRATÉGICA & RECUPERACIÓN DE CAPITAL
                        </span>
                        <span className="text-xs text-crm-fg-subtle">• Inteligencia de Stock</span>
                    </div>
                    <h1 className="text-xl font-black text-white">
                        Tablero de Rotación y Prioridades Comerciales
                    </h1>
                    <p className="text-xs text-crm-fg-muted">
                        Detección de unidades con baja rotación, desfasaje de precio, capital inmovilizado y optimización de liquidez.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchData}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-white hover:bg-crm-surface-raised transition-colors shadow-sm"
                        title="Actualizar análisis de rotación"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin text-purple-400' : ''} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* 1. Resumen Ejecutivo (4 Indicadores Principales) */}
            <RotationExecutiveSummary
                kpis={kpis}
                activeCurrency={activeCurrency}
                onCurrencyChange={setActiveCurrency}
            />

            {/* 2. Plan de Recuperación Estratégica de Capital (Interactivo) */}
            <LiquidityRecoveryTool
                vehicles={vehicles}
                defaultCurrency={activeCurrency}
                token={token}
            />

            {/* 3. Tabla Principal de Unidades Priorizadas */}
            <StrategicRotationTable
                vehicles={vehicles}
                activeCurrency={activeCurrency}
                onSelectVehicle={setSelectedVehicle}
            />

            {/* 4. Modal de Detalle Estratégico (Simulador, Mercado, Oportunidad, Decisiones) */}
            {selectedVehicle && (
                <VehicleStrategicDetailModal
                    vehicle={selectedVehicle}
                    token={token}
                    onClose={() => setSelectedVehicle(null)}
                    onDecisionSaved={() => {
                        fetchData();
                    }}
                />
            )}

        </div>
    );
}

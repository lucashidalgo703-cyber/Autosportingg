"use client";
import React, { useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import StockCommercialCalculator from './StockCommercialCalculator';

export default function StockCalculationModal({ isOpen, onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div 
                className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header del Modal */}
                <div className="px-6 py-4 border-b border-crm-border flex items-center justify-between bg-crm-bg/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 font-bold text-sm">
                            <Calculator size={18} />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                Desglose y Verificación del Cálculo de Stock Disponible
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    Auditoría 100% Verificable
                                </span>
                            </h2>
                            <p className="text-xs text-crm-fg-muted">
                                Vehículo a vehículo: precio publicado utilizado, titularidad real y aporte exacto a cada una de las 3 tarjetas.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-subtle hover:bg-crm-bg hover:text-white transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Contenido scrolleable con la Calculadora Comercial Oficial */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    <StockCommercialCalculator isModal={true} />
                </div>
            </div>
        </div>
    );
}

"use client";
import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ArrowRight, DollarSign, Layers, BookOpen, ShieldCheck } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

function formatARS(val) {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    return '$' + Math.round(val).toLocaleString('es-AR');
}

export default function ContrastCasesModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('operaciones'); // 'operaciones' | 'flujocaja' | 'reglas'

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-crm-border/70 flex items-start justify-between bg-crm-bg/70">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                                TRAZABILIDAD
                            </span>
                            <h2 className="text-lg font-bold text-white tracking-tight">
                                Casos de Contraste, Cadena de Permutas y Flujo de Caja
                            </h2>
                        </div>
                        <p className="text-xs text-crm-fg-muted max-w-3xl leading-relaxed">
                            Verificación de las 5 operaciones de contraste, compras en coparticipación, permutas en stock y conciliación de caja sin doble cómputo.
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-subtle hover:text-white hover:bg-crm-surface transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-crm-border/50 bg-crm-surface/40 px-5 gap-2 text-xs">
                    <button
                        onClick={() => setActiveTab('operaciones')}
                        className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                            activeTab === 'operaciones' 
                                ? 'border-blue-500 text-blue-400' 
                                : 'border-transparent text-crm-fg-subtle hover:text-white'
                        }`}
                    >
                        5 Operaciones y Permutas de Contraste
                    </button>
                    <button
                        onClick={() => setActiveTab('flujocaja')}
                        className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                            activeTab === 'flujocaja' 
                                ? 'border-blue-500 text-blue-400' 
                                : 'border-transparent text-crm-fg-subtle hover:text-white'
                        }`}
                    >
                        Ecuación de Flujo de Caja Conciliado
                    </button>
                    <button
                        onClick={() => setActiveTab('reglas')}
                        className={`py-3 px-3 font-semibold border-b-2 transition-colors ${
                            activeTab === 'reglas' 
                                ? 'border-blue-500 text-blue-400' 
                                : 'border-transparent text-crm-fg-subtle hover:text-white'
                        }`}
                    >
                        10 Reglas Anti Doble Conteo
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {activeTab === 'operaciones' && (
                        <div className="space-y-4">
                            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs text-blue-200">
                                <strong>Vínculo estricto entre ventas, tomas y stock activo:</strong> Cuando una operación recibe una permuta (trade-in), el auto tomado ingresa al stock como un nuevo activo con su valor de toma asignado como costo de compra, y las cuotas pactadas pasan a la cartera por cobrar. No se mantiene el auto vendido como stock.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Caso 1: Ford Territory 2022 */}
                                <div className="p-4 rounded-xl border border-crm-border bg-crm-bg/50 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">1. Ford Territory Titanium (2022)</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Venta Confirmada</span>
                                    </div>
                                    <div className="text-xs space-y-1 text-crm-fg-muted">
                                        <div>• <strong>Precio de Venta:</strong> $46.200.000 ARS (coparticipada 50/50).</div>
                                        <div>• <strong>Toma en permuta:</strong> Fiat Cronos 2022 por <strong>$18.265.000</strong>. Ingresó directamente al stock activo como unidad propia/compartida al costo de la toma.</div>
                                        <div>• <strong>Financiación propia:</strong> 12 cuotas de $1.350.000 = <strong>$16.200.000</strong> pendientes en Cartera (50% propio = $8.100.000).</div>
                                        <div>• <strong>Estado en stock:</strong> La Territory 2022 se encuentra marcada como <em>Vendido</em> y excluida de los 34 vehículos activos para evitar doble cómputo.</div>
                                    </div>
                                </div>

                                {/* Caso 2: Fiat Argo */}
                                <div className="p-4 rounded-xl border border-crm-border bg-crm-bg/50 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">2. Fiat Argo (2025)</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Venta Confirmada</span>
                                    </div>
                                    <div className="text-xs space-y-1 text-crm-fg-muted">
                                        <div>• <strong>Precio de Venta:</strong> $25.000.000 ARS (Seña: $1.000.000).</div>
                                        <div>• <strong>Toma en permuta:</strong> Renault Sandero 2017 por <strong>$11.000.000</strong>. Ingresó como vehículo activo en stock (ID: 6ae4f1882b16479b5175bbad, modelo 2017) con costo de compra de $11.000.000 y coparticipada al 50%.</div>
                                        <div>• <strong>Saldo financiado:</strong> Las cuotas comerciales fueron posteriormente regularizadas/anuladas contractualmente sin saldo duplicado pendiente.</div>
                                        <div>• <strong>Control:</strong> El Argo original está dado de baja del stock activo; el Sandero tomado suma en inventario.</div>
                                    </div>
                                </div>

                                {/* Caso 3: Chevrolet Tracker 2014 */}
                                <div className="p-4 rounded-xl border border-crm-border bg-crm-bg/50 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">3. Chevrolet Tracker LTZ (2014)</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Venta Entregada</span>
                                    </div>
                                    <div className="text-xs space-y-1 text-crm-fg-muted">
                                        <div>• <strong>Precio de Venta:</strong> $15.500.000 ARS (Seña inicial: $500.000).</div>
                                        <div>• <strong>Cobranza:</strong> Saldo regularizado e ingresado en efectivo bancario de AutoSporting.</div>
                                        <div>• <strong>Vehículo:</strong> Estado <em>Entregado</em>; no suma en el valor publicado ni costo del stock activo.</div>
                                    </div>
                                </div>

                                {/* Caso 4: Toyota Yaris XS */}
                                <div className="p-4 rounded-xl border border-crm-border bg-crm-bg/50 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">4. Toyota Yaris XS (2024)</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Venta Entregada</span>
                                    </div>
                                    <div className="text-xs space-y-1 text-crm-fg-muted">
                                        <div>• <strong>Precio de Venta:</strong> $26.840.000 ARS (Seña: $250.000).</div>
                                        <div>• <strong>Estructura de Cuotas:</strong> 3 cuotas fijas de $1.180.000 = <strong>$3.540.000</strong> totales.</div>
                                        <div>• <strong>Composición exacta:</strong> $2.700.000 saldo financiado del vehículo + $840.000 costo de transferencia y gestoría.</div>
                                        <div>• <strong>Participación propia:</strong> 100% AutoSporting (figura en la Cartera propia pendiente).</div>
                                    </div>
                                </div>

                                {/* Caso 5: Peugeot 208 */}
                                <div className="p-4 rounded-xl border border-crm-border bg-crm-bg/50 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">5. Peugeot 208 (2024)</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Venta Confirmada</span>
                                    </div>
                                    <div className="text-xs space-y-1 text-crm-fg-muted">
                                        <div>• <strong>Precio de Venta:</strong> $25.500.000 ARS (Seña: $300.000).</div>
                                        <div>• <strong>Destino del ingreso:</strong> Cobrado de contado en cuenta conciliada. Excluido de inventario activo.</div>
                                    </div>
                                </div>

                                {/* Compras / Permutas Especiales */}
                                <div className="p-4 rounded-xl border border-crm-border bg-crm-bg/50 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">Compras & Coparticipación de Reposición</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Stock Activo</span>
                                    </div>
                                    <div className="text-xs space-y-1 text-crm-fg-muted">
                                        <div>• <strong>Corolla XEI 2023:</strong> Costo compra registrado $31.488.000 (100% propio).</div>
                                        <div>• <strong>Renault Kangoo 2023:</strong> Costo compra $20.646.000 (50/50 coparticipada: $10.323.000 propio).</div>
                                        <div>• <strong>Toyota SW4 2024:</strong> Costo compra $68.500.000 (50/50: $34.250.000 propio; financiada con toma Territory compartida + aportes).</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'flujocaja' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-200">
                                <h3 className="font-bold mb-1 text-sm">Fórmula Fundamental de Conciliación de Tesorería</h3>
                                <p className="font-mono text-sm tracking-wide text-emerald-300">
                                    Caja inicial + Cobranzas + Aportes de Socios − Compras de Stock − Gastos Operativos − Retiros = Caja final
                                </p>
                            </div>

                            <div className="rounded-xl border border-crm-border bg-crm-bg/50 p-4 space-y-3 text-xs leading-relaxed text-crm-fg">
                                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                                    Conciliación de Efectivo Real vs Hipótesis Informada
                                </h4>
                                <p>
                                    En la hipótesis de auditoría se informaba una caja estimada de <strong>$16.000.000</strong> más un ajuste de gasto de <strong>$1.000.000</strong>. Al inspeccionar el sistema en vivo, el saldo real de la <strong>Caja Principal V2 ARS</strong> asciende a <strong>$20.652.520 ARS</strong>.
                                </p>
                                <p>
                                    Siguiendo las reglas de integridad financiera, <em>no se forzaron los números para hacerlos coincidir con la hipótesis previa</em>; se toma el saldo real verificado en las cuentas bancarias y de caja de AutoSporting.
                                </p>
                                <div className="p-3 rounded-lg bg-crm-surface border border-crm-border space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between">
                                        <span>Saldo en Caja Principal V2 ARS:</span>
                                        <span className="font-bold text-emerald-400">$20.652.520 ARS</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Saldo en Caja Principal V2 USD:</span>
                                        <span className="font-bold text-blue-400">0 USD</span>
                                    </div>
                                    <div className="flex justify-between border-t border-crm-border/60 pt-1">
                                        <span>Total Efectivo Conciliado propio:</span>
                                        <span className="font-bold text-white">$20.652.520 ARS</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reglas' && (
                        <div className="space-y-2 text-xs">
                            {[
                                { num: 1, title: 'No sumar precio publicado y costo del mismo auto', desc: 'Separación estricta de dos escenarios: Escenario a Costo (patrimonial) y Escenario a Precio Publicado (comercial).' },
                                { num: 2, title: 'No sumar "capital reinvertido" como activo adicional', desc: 'El capital reinvertido ya está expresado en las nuevas unidades de vehículos de stock activo.' },
                                { num: 3, title: 'No sumar la ganancia dos veces', desc: 'El resultado operativo ya está materializado dentro del efectivo en caja, vehículos o cartera por cobrar.' },
                                { num: 4, title: 'No sumar cajas virtuales de Tesorería junto con el banco', desc: 'Las cajas operativas de asignación son divisiones presupuestarias internas; solo se computa el saldo de la cuenta real.' },
                                { num: 5, title: 'No mantener cuotas como pendientes tras ser cobradas', desc: 'Las cuotas con status "pagada" o regularizadas no se computan en la cartera pendiente.' },
                                { num: 6, title: 'No conservar el vehículo vendido y el total de la venta simultáneamente', desc: 'Los autos vendidos (ej. Territory 2022, Yaris) están dados de baja del inventario activo.' },
                                { num: 7, title: 'No descontar fondos de terceros dos veces', desc: 'La parte del socio se separa directamente por porcentaje de propiedad (ej. 50/50); no se resta nuevamente como deuda.' },
                                { num: 8, title: 'No considerar todo aporte de socios como ganancia propia', desc: 'Los aportes de socios constituyen fondos de terceros en coparticipación de activos.' },
                                { num: 9, title: 'No volver a descontar gastos que ya integran el costo de un vehículo', desc: 'Los gastos capitalizados en la compra del auto ya integran su costo base y no se deducen como egreso pendiente.' },
                                { num: 10, title: 'No computar consignaciones como capital propio', desc: 'Las consignaciones de clientes (100% terceros) están expresamente excluidas del capital propio y de socios.' }
                            ].map(r => (
                                <div key={r.num} className="p-3 rounded-lg border border-crm-border bg-crm-bg/40 flex items-start gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-bold text-white">Regla #{r.num}: {r.title}</div>
                                        <div className="text-crm-fg-muted text-[11px] mt-0.5">{r.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-crm-border/70 bg-crm-bg/70 flex items-center justify-end">
                    <CrmButton variant="secondary" size="sm" onClick={onClose}>
                        Cerrar Trazabilidad
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}

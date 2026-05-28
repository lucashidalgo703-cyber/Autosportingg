import React from 'react';
import { ArrowDownRight, ArrowUpRight, Search, FileText } from 'lucide-react';
import TransactionStatusBadge from './TransactionStatusBadge';

export default function TransactionsTable({ transactions, onEdit }) {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-neutral-900 border border-neutral-800 rounded-2xl opacity-80">
                <FileText size={48} className="text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No hay movimientos</h3>
                <p className="text-neutral-400 text-center max-w-md">
                    No se encontraron transacciones que coincidan con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-800 bg-[#161619]">
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Fecha</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Concepto</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Categoría</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Vinculado a</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Método</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Monto</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                        {transactions.map(tx => (
                            <tr key={tx._id} className="hover:bg-black/20 transition-colors">
                                <td className="p-4 whitespace-nowrap">
                                    <span className="text-sm text-neutral-300 block">{new Date(tx.date || tx.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm font-bold text-white block">{tx.concept || tx.description}</span>
                                    {tx.notes && <span className="text-xs text-neutral-500 truncate max-w-xs block">{tx.notes}</span>}
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider bg-neutral-800 px-2 py-1 rounded-md border border-neutral-700">{tx.category}</span>
                                </td>
                                <td className="p-4">
                                    {tx.saleId ? (
                                        <a href={`/admin/ventas/${tx.saleId}`} className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors block">Venta</a>
                                    ) : tx.reservationId ? (
                                        <span className="text-sm font-bold text-purple-400 block">Reserva</span>
                                    ) : tx.clientId ? (
                                        <a href={`/admin/clientes/${tx.clientId}`} className="text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors block">Cliente</a>
                                    ) : tx.vehicleId ? (
                                        <a href={`/admin/stock/${tx.vehicleId}`} className="text-sm font-bold text-green-400 hover:text-green-300 transition-colors block">Vehículo</a>
                                    ) : (
                                        <span className="text-sm text-neutral-500 block">Sin vínculo</span>
                                    )}
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                    <span className="text-sm text-neutral-400 capitalize">{tx.paymentMethod}</span>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                    <TransactionStatusBadge status={tx.status} />
                                </td>
                                <td className="p-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {tx.type === 'Ingreso' ? (
                                            <ArrowUpRight size={16} className="text-green-500" />
                                        ) : (
                                            <ArrowDownRight size={16} className="text-red-500" />
                                        )}
                                        <span className={`text-sm font-bold ${tx.status === 'anulado' ? 'text-neutral-500 line-through' : (tx.type === 'Ingreso' ? 'text-green-400' : 'text-red-400')}`}>
                                            {tx.currency === 'USD' ? 'U$S' : '$'} {tx.amount.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => onEdit(tx)}
                                            className="h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center transition-colors border border-blue-500/20 gap-1"
                                        >
                                            <Search size={14} />
                                            Detalle
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

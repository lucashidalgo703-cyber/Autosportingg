import React from 'react';
import { ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';
import TransactionStatusBadge from './TransactionStatusBadge';

export default function TransactionMobileCards({ transactions, onEdit }) {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="md:hidden flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl opacity-80 mt-4">
                <p className="text-neutral-400 text-center text-sm">
                    No hay resultados que coincidan con los filtros.
                </p>
            </div>
        );
    }

    return (
        <div className="md:hidden flex flex-col gap-4">
            {transactions.map(tx => (
                <div key={tx._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <TransactionStatusBadge status={tx.status} />
                        <span className="text-xs text-neutral-500">{new Date(tx.date || tx.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div>
                        <span className="text-sm font-bold text-white block">{tx.concept || tx.description}</span>
                        {tx.notes && <span className="text-xs text-neutral-500 line-clamp-2 mt-1">{tx.notes}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-black/20 rounded-xl p-3 border border-neutral-800/50">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-500 uppercase">Monto</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {tx.type === 'Ingreso' ? (
                                    <ArrowUpRight size={14} className="text-green-500" />
                                ) : (
                                    <ArrowDownRight size={14} className="text-red-500" />
                                )}
                                <span className={`text-sm font-bold ${tx.status === 'anulado' ? 'text-neutral-500 line-through' : (tx.type === 'Ingreso' ? 'text-green-400' : 'text-red-400')}`}>
                                    {tx.currency === 'USD' ? 'U$S' : '$'} {tx.amount.toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[10px] text-neutral-500 uppercase">Categoría</span>
                            <span className="text-xs font-bold text-neutral-300 mt-0.5">{tx.category}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => onEdit(tx)}
                        className="w-full py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-bold transition-colors border border-blue-500/20 flex items-center justify-center gap-2"
                    >
                        <Search size={16} />
                        Detalle / Editar
                    </button>
                </div>
            ))}
        </div>
    );
}

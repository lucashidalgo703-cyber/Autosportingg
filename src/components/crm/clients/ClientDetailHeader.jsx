import React from 'react';
import { ArrowLeft, Edit2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientDetailHeader({ client, onEdit }) {
    const router = useRouter();

    if (!client) return null;

    const getStatusColor = (status) => {
        switch(status) {
            case 'activo': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'inactivo': return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
            case 'bloqueado': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-red-900/10 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex flex-col items-start gap-4">
                    <button 
                        onClick={() => router.push('/admin/clientes')}
                        className="text-neutral-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft size={16} /> Volver a clientes
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                            <User size={32} className="text-neutral-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-none">
                                    {client.fullName}
                                </h1>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(client.status)}`}>
                                    {client.status}
                                </span>
                            </div>
                            <p className="text-neutral-400 text-sm mt-2 flex items-center gap-2">
                                Registrado el {new Date(client.createdAt).toLocaleDateString('es-AR')}
                                {client.createdBy && <span className="text-neutral-600">• Por {client.createdBy}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {client.tags && client.tags.map((tag, idx) => (
                        <span key={idx} className="bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-700">
                            #{tag}
                        </span>
                    ))}
                    
                    <button 
                        onClick={onEdit}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 px-5 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none"
                    >
                        <Edit2 size={16} /> Editar
                    </button>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Settings, Wrench, Clock, Construction } from 'lucide-react';
import { motion } from 'framer-motion';

const ConstructionPlaceholder = ({ title }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-in fade-in duration-700">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-zinc-900/40 p-12 rounded-3xl border border-crm-border max-w-md w-full relative overflow-hidden"
            >
                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-black rounded-2xl mx-auto flex items-center justify-center border border-crm-border mb-6 shadow-2xl">
                        <Construction size={36} className="text-zinc-500" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        {title}
                    </h2>
                    
                    <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                        Este módulo se encuentra actualmente en desarrollo. Pronto estará disponible con todas las funcionalidades de sincronización ERP.
                    </p>
                    
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                            <Wrench size={18} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">En Obras</span>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                            <Clock size={18} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Próximamente</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ConstructionPlaceholder;

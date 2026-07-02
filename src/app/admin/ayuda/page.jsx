'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import * as Icons from 'lucide-react';
import { Search, AlertTriangle, ExternalLink } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { helpRegistry } from '../../../lib/help/helpRegistry';
import { getEnabledChapters, searchChapters, groupAndSortChapters } from '../../../lib/help/helpEngine';

function HelpContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedModule, setExpandedModule] = useState(null);
    const moduleRefs = useRef({});

    // 1. Get chapters enabled for this user's role
    const enabledChapters = useMemo(() => {
        return getEnabledChapters(helpRegistry, user);
    }, [user]);

    // 2. Filter by search term
    const filteredChapters = useMemo(() => {
        return searchChapters(enabledChapters, searchTerm);
    }, [enabledChapters, searchTerm]);

    // 3. Group and sort
    const groupedChapters = useMemo(() => {
        return groupAndSortChapters(filteredChapters);
    }, [filteredChapters]);

    // Handle deep linking ?tema=slug
    useEffect(() => {
        const tema = searchParams.get('tema');
        if (tema) {
            setExpandedModule(tema);
            setTimeout(() => {
                const el = moduleRefs.current[tema];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional: add a slight highlight effect
                    el.classList.add('ring-2', 'ring-crm-red');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-crm-red'), 2000);
                }
            }, 500); // Wait for render
        }
    }, [searchParams]);

    const isAdmin = user?.role === 'Owner/Admin';

    return (
        <div className="mx-auto w-full max-w-5xl p-4 md:p-6 text-white pb-20">
            <div className="mb-8 text-center space-y-4">
                <div className="w-16 h-16 bg-crm-bg rounded-2xl flex items-center justify-center mx-auto border border-crm-border">
                    <Icons.HelpCircle size={32} className="text-crm-fg-muted" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Centro de Ayuda del CRM</h1>
                    <p className="text-crm-fg-muted mt-2">
                        Manual operativo y buenas prácticas para el equipo de AutoSporting.
                    </p>
                </div>
            </div>

            <div className="relative mb-10 max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar por módulo o tema..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-crm-bg border border-crm-border rounded-2xl pl-12 pr-4 py-4 text-sm text-crm-fg placeholder-crm-fg-muted focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-all"
                />
            </div>

            <div className="space-y-10">
                {groupedChapters.length === 0 ? (
                    <div className="text-center py-12 bg-crm-bg rounded-2xl border border-crm-border border-dashed">
                        <Icons.SearchX size={48} className="mx-auto text-crm-fg-muted mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-white mb-2">No encontramos resultados</h3>
                        <p className="text-crm-fg-muted text-sm">
                            Intenta con otra palabra clave o revisa la ortografía.
                        </p>
                    </div>
                ) : (
                    groupedChapters.map(category => (
                        <div key={category.id} className="space-y-4">
                            <h2 className="text-xl font-semibold border-b border-crm-border pb-2">
                                {category.label}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {category.items.map(chapter => {
                                    const IconComponent = Icons[chapter.icon] || Icons.FileText;
                                    const isExpanded = expandedModule === chapter.id;
                                    const isPartial = chapter.implementationStatus === 'partial';

                                    return (
                                        <div 
                                            key={chapter.id}
                                            ref={el => moduleRefs.current[chapter.id] = el}
                                            className={`bg-crm-bg rounded-2xl border transition-all duration-200 overflow-hidden ${
                                                isExpanded ? 'border-crm-red shadow-lg shadow-crm-red/10' : 'border-crm-border hover:border-crm-border-hover'
                                            }`}
                                        >
                                            <button 
                                                onClick={() => setExpandedModule(isExpanded ? null : chapter.id)}
                                                className="w-full text-left p-5 flex items-start gap-4 focus:outline-none"
                                            >
                                                <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
                                                    isExpanded ? 'bg-crm-red/20 text-crm-red' : 'bg-crm-bg-active text-crm-fg'
                                                }`}>
                                                    <IconComponent size={24} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-lg truncate flex items-center gap-2">
                                                        {chapter.title}
                                                    </h3>
                                                    <p className="text-sm text-crm-fg-muted mt-1 line-clamp-2">
                                                        {chapter.summary}
                                                    </p>
                                                    {isPartial && isAdmin && (
                                                        <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                                            <AlertTriangle size={12} />
                                                            En desarrollo / Parcial
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="p-5 pt-0 border-t border-crm-border/50 animate-in fade-in slide-in-from-top-4 duration-200">
                                                    <div className="mt-4 space-y-4">
                                                        {chapter.steps && chapter.steps.map((step, idx) => (
                                                            <div key={idx} className="bg-crm-bg-active p-4 rounded-xl">
                                                                <h4 className="font-medium text-white mb-1">{step.title}</h4>
                                                                <p className="text-sm text-crm-fg-muted">{step.body}</p>
                                                                {step.actionRoute && (
                                                                    <a href={step.actionRoute} className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-crm-red hover:text-crm-red-hover">
                                                                        {step.actionLabel || 'Ir a la página'} <ExternalLink size={12} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {chapter.tips && chapter.tips.length > 0 && (
                                                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                                                <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                                                                    <Icons.Lightbulb size={16} />
                                                                    Tips de uso
                                                                </div>
                                                                <ul className="list-disc pl-5 space-y-1 text-sm text-blue-300">
                                                                    {chapter.tips.map((tip, idx) => (
                                                                        <li key={idx}>{tip}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function AyudaPage() {
    return (
        <PermissionGuard permission={PERMISSIONS.HELP_READ}>
            <Suspense fallback={<div className="p-8 text-center text-crm-fg-muted">Cargando centro de ayuda...</div>}>
                <HelpContent />
            </Suspense>
        </PermissionGuard>
    );
}

'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import * as Icons from 'lucide-react';
import { Search, AlertTriangle, ExternalLink, BookOpen, ChevronDown, ChevronRight, X, ChevronUp, ChevronsDownUp, ChevronsUpDown, Lightbulb, ListOrdered } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { helpRegistry } from '../../../lib/help/helpRegistry';
import { getEnabledChapters, searchChapters, groupAndSortChapters } from '../../../lib/help/helpEngine';

function HelpContent() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedModules, setExpandedModules] = useState(new Set());
    const moduleRefs = useRef({});

    // 1. Get chapters enabled for this user's role
    const enabledChapters = useMemo(() => {
        return getEnabledChapters(helpRegistry, user);
    }, [user]);

    // 2. Filter by search term
    const filteredChapters = useMemo(() => {
        return searchChapters(enabledChapters, searchTerm);
    }, [enabledChapters, searchTerm]);

    // Count results
    const resultsCount = searchTerm.trim() !== '' ? filteredChapters.length : 0;

    // 3. Group and sort
    const groupedChapters = useMemo(() => {
        return groupAndSortChapters(filteredChapters);
    }, [filteredChapters]);

    // Expand all functionality
    const expandAll = () => {
        const allIds = new Set(filteredChapters.map(c => c.id));
        setExpandedModules(allIds);
    };

    const collapseAll = () => {
        setExpandedModules(new Set());
    };

    const toggleModule = (id) => {
        setExpandedModules(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const openAndScrollToModule = (id) => {
        // Update URL
        const params = new URLSearchParams(searchParams);
        params.set('tema', id);
        router.replace(`${pathname}?${params.toString()}`);

        setExpandedModules(prev => new Set(prev).add(id));
        
        setTimeout(() => {
            const el = moduleRefs.current[id];
            if (el) {
                // Focus the header button for accessibility
                const button = el.querySelector('button');
                if (button) button.focus();

                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight effect
                el.classList.add('ring-1', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg');
                setTimeout(() => el.classList.remove('ring-1', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg'), 2000);
            }
        }, 100);
    };

    // Handle deep linking ?tema=slug on mount or URL change
    useEffect(() => {
        const tema = searchParams.get('tema');
        if (tema) {
            setExpandedModules(prev => new Set(prev).add(tema));
            setTimeout(() => {
                const el = moduleRefs.current[tema];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-1', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg');
                    setTimeout(() => el.classList.remove('ring-1', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg'), 2000);
                }
            }, 500); // Wait for render
        }
    }, [searchParams]);

    const isAdmin = user?.role === 'owner' || user?.role === 'admin';

    return (
        <div className="mx-auto w-full max-w-[848px] p-4 md:p-6 text-white pb-20 flex flex-col gap-5">
            
            {/* Header */}
            <div className="mb-2">
                <h1 className="text-[24px] font-bold tracking-tight text-white">Manual de uso del CRM</h1>
                <p className="text-crm-fg-muted text-[15px] mt-1">
                    Encuentra respuestas rápidas y guías paso a paso para dominar AutoSporting.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar en el manual: cargar venta, cuotas, WhatsApp..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-[#33333a] rounded-lg pl-10 pr-10 h-[38px] text-[14px] text-crm-fg placeholder-crm-fg-muted focus:outline-none focus:border-crm-red transition-all"
                    aria-label="Buscar en el manual"
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted hover:text-white p-0.5 rounded-full hover:bg-[#33333a] transition-colors"
                        aria-label="Limpiar búsqueda"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Search Results Count */}
            {searchTerm.trim() !== '' && (
                <div className="text-[13px] text-crm-fg-muted mb-2">
                    {resultsCount === 1 ? '1 resultado encontrado' : `${resultsCount} resultados encontrados`}
                </div>
            )}

            {/* INDEX (Table of Contents) inside content flow */}
            {!searchTerm && (
                <div className="w-full bg-[#1e1e24] border border-[#33333a] rounded-xl p-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-[#33333a] pb-3 gap-3">
                        <h3 className="font-semibold text-base text-white">Índice</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={expandAll}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-crm-fg-muted hover:text-white hover:bg-[#33333a] rounded-md transition-colors border border-transparent hover:border-[#44444a]"
                                title="Expandir todo"
                            >
                                <ChevronsDownUp size={14} /> Expandir todo
                            </button>
                            <button 
                                onClick={collapseAll}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-crm-fg-muted hover:text-white hover:bg-[#33333a] rounded-md transition-colors border border-transparent hover:border-[#44444a]"
                                title="Colapsar todo"
                            >
                                <ChevronsUpDown size={14} /> Colapsar todo
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-5">
                        {groupedChapters.length === 0 ? (
                            <p className="text-[13px] text-crm-fg-muted text-center py-4">No hay índices disponibles.</p>
                        ) : (
                            groupedChapters.map(category => (
                                <div key={`idx-${category.id}`}>
                                    <h4 className="text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-2">
                                        {category.label}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {category.items.map(chapter => (
                                            <button
                                                key={`chip-${chapter.id}`}
                                                onClick={() => openAndScrollToModule(chapter.id)}
                                                className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-crm-red ${
                                                    expandedModules.has(chapter.id)
                                                    ? 'bg-crm-red/10 border-crm-red/30 text-crm-red'
                                                    : 'bg-[#2a2a32] border-[#33333a] text-[#d4d4d8] hover:border-[#52525b] hover:text-white'
                                                }`}
                                            >
                                                {chapter.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Articles */}
            <div className="space-y-8">
                {groupedChapters.length === 0 ? (
                    <div className="text-center py-16 bg-[#1e1e24] rounded-xl border border-[#33333a] border-dashed">
                        <Icons.SearchX size={32} className="mx-auto text-crm-fg-muted mb-3 opacity-50" />
                        <h3 className="text-[15px] font-medium text-white mb-1">No encontramos resultados</h3>
                        <p className="text-[#a1a1aa] text-[13px] max-w-sm mx-auto">
                            No hay artículos que coincidan con "{searchTerm}". Intenta con otra palabra clave.
                        </p>
                    </div>
                ) : (
                    groupedChapters.map(category => (
                        <div key={category.id} className="space-y-3">
                            <h2 className="text-[13px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-3 ml-1">
                                {category.label}
                            </h2>
                            <div className="space-y-2">
                                {category.items.map(chapter => {
                                    const IconComponent = Icons[chapter.icon] || Icons.FileText;
                                    const isExpanded = expandedModules.has(chapter.id);
                                    const isPartial = chapter.implementationStatus === 'partial';

                                    return (
                                        <div 
                                            key={chapter.id}
                                            id={`chapter-${chapter.id}`}
                                            ref={el => moduleRefs.current[chapter.id] = el}
                                            className={`bg-[#1e1e24] rounded-xl border transition-all duration-200 overflow-hidden ${
                                                isExpanded ? 'border-crm-red shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : 'border-[#33333a] hover:border-[#44444a]'
                                            }`}
                                        >
                                            <button 
                                                onClick={() => toggleModule(chapter.id)}
                                                aria-expanded={isExpanded}
                                                aria-controls={`content-${chapter.id}`}
                                                className="w-full text-left px-4 flex items-center min-h-[63px] gap-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-crm-red group"
                                            >
                                                <div className={`flex-shrink-0 transition-colors ${
                                                    isExpanded ? 'text-crm-red' : 'text-[#a1a1aa] group-hover:text-white'
                                                }`}>
                                                    <IconComponent size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2 flex items-center gap-3">
                                                    <h3 className="font-semibold text-[15px] text-[#f4f4f5] truncate">
                                                        {chapter.title}
                                                    </h3>
                                                    {chapter.roles && (
                                                        <span className="hidden sm:inline-block text-[10px] font-medium uppercase tracking-wider text-[#a1a1aa] bg-[#2a2a32] px-2 py-0.5 rounded border border-[#33333a] whitespace-nowrap">
                                                            Para: {chapter.roles.length > 2 ? 'Varios roles' : chapter.roles.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-crm-red' : 'text-[#71717a]'}`}>
                                                    <ChevronRight size={18} />
                                                </div>
                                            </button>

                                            {/* Expanded Content */}
                                            <div 
                                                id={`content-${chapter.id}`}
                                                className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                                                aria-hidden={!isExpanded}
                                            >
                                                <div className="px-4 pb-5 pt-3 border-t border-[#33333a]">
                                                    
                                                    {/* Roles mobile fallback */}
                                                    {chapter.roles && (
                                                        <div className="sm:hidden mb-4">
                                                            <span className="text-[10px] font-medium uppercase tracking-wider text-[#a1a1aa] bg-[#2a2a32] px-2 py-1 rounded border border-[#33333a]">
                                                                Para: {chapter.roles.join(', ')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <p className="text-[#d4d4d8] text-[14px] leading-relaxed mb-5">
                                                        {chapter.summary}
                                                    </p>

                                                    {isPartial && isAdmin && (
                                                        <div className="mb-5 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-[13px]">
                                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <strong className="font-semibold block">Aviso Administrativo</strong>
                                                                Esta función se encuentra parcialmente implementada.
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-5">
                                                        {/* Steps Block */}
                                                        {chapter.steps && chapter.steps.length > 0 && (
                                                            <div>
                                                                <div className="space-y-2">
                                                                    {chapter.steps.map((step, idx) => (
                                                                        <div key={idx} className="bg-[#2a2a32] p-3.5 rounded-lg border border-[#33333a] flex gap-3">
                                                                            <div className="w-6 h-6 rounded-full bg-[#1e1e24] border border-[#44444a] text-[#a1a1aa] flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                                                                                {idx + 1}
                                                                            </div>
                                                                            <div>
                                                                                <h5 className="font-medium text-[#f4f4f5] text-[14px] mb-1">{step.title}</h5>
                                                                                <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{step.body}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Tips Block */}
                                                        {chapter.tips && chapter.tips.length > 0 && (
                                                            <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-lg">
                                                                <div className="flex items-center gap-2 text-yellow-500/90 font-semibold text-[13px] mb-2">
                                                                    <Lightbulb size={16} />
                                                                    Consejos
                                                                </div>
                                                                <ul className="space-y-1.5">
                                                                    {chapter.tips.map((tip, idx) => (
                                                                        <li key={idx} className="text-[13px] text-yellow-500/70 flex items-start gap-2">
                                                                            <span className="text-yellow-500/40 mt-1 text-[10px]">•</span>
                                                                            <span className="leading-relaxed">{tip}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {/* Action Button */}
                                                        {chapter.route && (
                                                            <div className="pt-2">
                                                                <a 
                                                                    href={chapter.route} 
                                                                    className="inline-flex items-center gap-1.5 bg-[#2a2a32] border border-[#44444a] hover:border-crm-red hover:text-crm-red text-[#d4d4d8] px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                                                                >
                                                                    Ir a {chapter.title} <ExternalLink size={14} />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
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
            <Suspense fallback={
                <div className="p-12 text-center flex flex-col items-center justify-center text-crm-fg-muted h-[50vh]">
                    <Icons.Loader2 className="animate-spin mb-4 text-crm-red" size={24} />
                    <p className="text-[14px]">Cargando Manual de Ayuda...</p>
                </div>
            }>
                <HelpContent />
            </Suspense>
        </PermissionGuard>
    );
}

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
                el.classList.add('ring-2', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg');
                setTimeout(() => el.classList.remove('ring-2', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg'), 2000);
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
                    el.classList.add('ring-2', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-crm-red', 'ring-offset-2', 'ring-offset-crm-bg'), 2000);
                }
            }, 500); // Wait for render
        }
    }, [searchParams]);

    const isAdmin = user?.role === 'Owner/Admin';

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 text-white pb-20 flex flex-col lg:flex-row gap-8">
            
            {/* LEFT COLUMN: Main Content */}
            <div className="flex-1 order-2 lg:order-1">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-crm-red/10 text-crm-red rounded-2xl flex items-center justify-center border border-crm-red/20">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">Manual de uso de AutoSporting</h1>
                        </div>
                    </div>
                    <p className="text-crm-fg-muted text-lg">
                        Guía paso a paso para trabajar con cada sección del CRM. Buscá un tema o recorré el índice.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8 max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar en el manual: cargar venta, cuotas, WhatsApp..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-crm-bg border border-crm-border rounded-2xl pl-12 pr-12 py-4 text-base text-crm-fg placeholder-crm-fg-muted focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-all"
                        aria-label="Buscar en el manual"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-crm-fg-muted hover:text-white p-1 rounded-full hover:bg-crm-bg-active transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Search Results Count */}
                {searchTerm.trim() !== '' && (
                    <div className="mb-6 text-sm text-crm-fg-muted">
                        {resultsCount === 1 ? '1 resultado encontrado' : `${resultsCount} resultados encontrados`}
                    </div>
                )}

                {/* Articles */}
                <div className="space-y-10">
                    {groupedChapters.length === 0 ? (
                        <div className="text-center py-16 bg-crm-bg rounded-[16px] border border-crm-border border-dashed">
                            <Icons.SearchX size={48} className="mx-auto text-crm-fg-muted mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-white mb-2">No encontramos resultados</h3>
                            <p className="text-crm-fg-muted text-sm max-w-md mx-auto">
                                No hay artículos que coincidan con "{searchTerm}". Intenta con otra palabra clave o revisa la ortografía.
                            </p>
                        </div>
                    ) : (
                        groupedChapters.map(category => (
                            <div key={category.id} className="space-y-4">
                                <h2 className="text-xl font-semibold border-b border-crm-border pb-2 text-white/90">
                                    {category.label}
                                </h2>
                                <div className="space-y-3">
                                    {category.items.map(chapter => {
                                        const IconComponent = Icons[chapter.icon] || Icons.FileText;
                                        const isExpanded = expandedModules.has(chapter.id);
                                        const isPartial = chapter.implementationStatus === 'partial';

                                        return (
                                            <div 
                                                key={chapter.id}
                                                id={`chapter-${chapter.id}`}
                                                ref={el => moduleRefs.current[chapter.id] = el}
                                                className={`bg-crm-bg-active rounded-[16px] border transition-all duration-300 overflow-hidden ${
                                                    isExpanded ? 'border-crm-red shadow-lg shadow-crm-red/5' : 'border-crm-border hover:border-crm-border-hover'
                                                }`}
                                            >
                                                <button 
                                                    onClick={() => toggleModule(chapter.id)}
                                                    aria-expanded={isExpanded}
                                                    aria-controls={`content-${chapter.id}`}
                                                    className="w-full text-left p-5 flex items-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-red focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg group"
                                                >
                                                    <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
                                                        isExpanded ? 'bg-crm-red/10 text-crm-red' : 'bg-crm-bg text-crm-fg group-hover:text-white'
                                                    }`}>
                                                        <IconComponent size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <h3 className="font-semibold text-lg text-white">
                                                                {chapter.title}
                                                            </h3>
                                                            {chapter.roles && (
                                                                <span className="text-[11px] font-medium uppercase tracking-wider text-crm-fg-muted bg-crm-bg px-2 py-1 rounded-full border border-crm-border">
                                                                    Para: {chapter.roles.length > 2 ? 'Varios roles' : chapter.roles.join(', ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!isExpanded && (
                                                            <p className="text-sm text-crm-fg-muted mt-2 line-clamp-1">
                                                                {chapter.summary}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={`flex-shrink-0 mt-1 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-crm-red' : 'text-crm-fg-muted'}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </button>

                                                {/* Expanded Content */}
                                                <div 
                                                    id={`content-${chapter.id}`}
                                                    className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                                                    aria-hidden={!isExpanded}
                                                >
                                                    <div className="p-5 pt-0 border-t border-crm-border/50">
                                                        
                                                        <p className="text-crm-fg text-base mb-6 mt-4">
                                                            {chapter.summary}
                                                        </p>

                                                        {isPartial && isAdmin && (
                                                            <div className="mb-6 flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm">
                                                                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <strong className="font-semibold block">Aviso Administrativo</strong>
                                                                    Esta función se encuentra parcialmente implementada o en desarrollo. El personal de ventas no verá esta sección de la ayuda.
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-6">
                                                            {/* Steps Block */}
                                                            {chapter.steps && chapter.steps.length > 0 && (
                                                                <div>
                                                                    <h4 className="flex items-center gap-2 text-white font-medium mb-4">
                                                                        <ListOrdered size={18} className="text-crm-red" /> 
                                                                        Paso a paso
                                                                    </h4>
                                                                    <div className="space-y-3">
                                                                        {chapter.steps.map((step, idx) => (
                                                                            <div key={idx} className="bg-crm-bg p-4 rounded-[16px] border border-crm-border flex gap-4">
                                                                                <div className="w-8 h-8 rounded-full bg-crm-red text-white flex items-center justify-center font-bold flex-shrink-0 text-sm shadow-sm shadow-crm-red/20">
                                                                                    {idx + 1}
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="font-medium text-white text-base mb-1">{step.title}</h5>
                                                                                    <p className="text-sm text-crm-fg-muted leading-relaxed">{step.body}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Tips Block */}
                                                            {chapter.tips && chapter.tips.length > 0 && (
                                                                <div className="bg-yellow-500/5 border border-yellow-500/20 p-5 rounded-[16px]">
                                                                    <div className="flex items-center gap-2 text-yellow-500 font-semibold mb-3">
                                                                        <Lightbulb size={18} />
                                                                        Consejos y Mejores Prácticas
                                                                    </div>
                                                                    <ul className="space-y-2">
                                                                        {chapter.tips.map((tip, idx) => (
                                                                            <li key={idx} className="text-sm text-yellow-500/80 flex items-start gap-2">
                                                                                <span className="text-yellow-500/50 mt-1">•</span>
                                                                                <span className="leading-relaxed">{tip}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {/* Action Button */}
                                                            {chapter.route && (
                                                                <div className="pt-4 border-t border-crm-border/30">
                                                                    <a 
                                                                        href={chapter.route} 
                                                                        className="inline-flex items-center gap-2 bg-crm-bg border border-crm-border hover:border-crm-red hover:text-crm-red text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                                                    >
                                                                        Ir a {chapter.title} <ExternalLink size={16} />
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

            {/* RIGHT COLUMN: Table of Contents (Index) */}
            <div className="w-full lg:w-80 flex-shrink-0 order-1 lg:order-2">
                <div className="sticky top-24 bg-crm-bg-active border border-crm-border rounded-[16px] p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4 border-b border-crm-border pb-3">
                        <h3 className="font-semibold text-lg text-white">Índice</h3>
                        <div className="flex gap-1">
                            <button 
                                onClick={expandAll}
                                className="p-1.5 text-crm-fg-muted hover:text-white hover:bg-crm-bg rounded-lg transition-colors"
                                title="Expandir todo"
                                aria-label="Expandir todo"
                            >
                                <ChevronsDownUp size={16} />
                            </button>
                            <button 
                                onClick={collapseAll}
                                className="p-1.5 text-crm-fg-muted hover:text-white hover:bg-crm-bg rounded-lg transition-colors"
                                title="Colapsar todo"
                                aria-label="Colapsar todo"
                            >
                                <ChevronsUpDown size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                        {groupedChapters.length === 0 ? (
                            <p className="text-sm text-crm-fg-muted text-center py-4">No hay índices disponibles para esta búsqueda.</p>
                        ) : (
                            groupedChapters.map(category => (
                                <div key={`idx-${category.id}`}>
                                    <h4 className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">
                                        {category.label}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {category.items.map(chapter => (
                                            <button
                                                key={`chip-${chapter.id}`}
                                                onClick={() => openAndScrollToModule(chapter.id)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ${
                                                    expandedModules.has(chapter.id)
                                                    ? 'bg-crm-red/10 border-crm-red/30 text-crm-red'
                                                    : 'bg-crm-bg border-crm-border text-crm-fg hover:border-crm-fg-muted hover:text-white'
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
            </div>

        </div>
    );
}

export default function AyudaPage() {
    return (
        <PermissionGuard permission={PERMISSIONS.HELP_READ}>
            <Suspense fallback={
                <div className="p-12 text-center flex flex-col items-center justify-center text-crm-fg-muted">
                    <Icons.Loader2 className="animate-spin mb-4 text-crm-red" size={32} />
                    <p>Cargando Manual de Ayuda...</p>
                </div>
            }>
                <HelpContent />
            </Suspense>
        </PermissionGuard>
    );
}

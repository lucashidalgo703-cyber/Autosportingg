import React from 'react';

export default function CrmTabs({ tabs, activeTab, onTabChange }) {
    return (
        <div className="flex touch-pan-x snap-x overflow-x-auto border-b border-crm-border [-webkit-overflow-scrolling:touch]">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`-mb-px flex min-h-11 shrink-0 snap-start appearance-none items-center gap-2 whitespace-nowrap border-0 border-b-2 bg-transparent px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg ${
                            isActive 
                                ? 'border-crm-red text-crm-red' 
                                : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                        }`}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

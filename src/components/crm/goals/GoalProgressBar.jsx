"use client";
import React from 'react';

export default function GoalProgressBar({ percent }) {
    const validPercent = isNaN(percent) ? 0 : Math.max(0, Math.min(percent, 100));
    
    let colorClass = 'bg-yellow-500'; // Default, under 50%
    if (percent >= 100) colorClass = 'bg-green-500';
    else if (percent >= 50) colorClass = 'bg-indigo-500';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 bg-crm-surface-raised h-2.5 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                    style={{ width: `${validPercent}%` }}
                ></div>
            </div>
            <div className="text-sm font-bold text-white w-10 text-right">{Math.round(percent)}%</div>
        </div>
    );
}

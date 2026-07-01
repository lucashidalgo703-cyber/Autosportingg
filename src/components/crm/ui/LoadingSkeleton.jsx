import React from 'react';

export default function LoadingSkeleton({
    className = '',
    variant = 'rectangular', // 'rectangular', 'circular', 'text'
}) {
    const baseClasses = "animate-pulse bg-crm-surface-raised";
    
    let variantClasses = "";
    if (variant === 'circular') {
        variantClasses = "rounded-full";
    } else if (variant === 'text') {
        variantClasses = "rounded h-4 w-full";
    } else {
        variantClasses = "rounded-[var(--crm-radius)]";
    }

    return (
        <div className={`${baseClasses} ${variantClasses} ${className}`} />
    );
}

import React from 'react';

export default function DateDisplay({
    date,
    format = 'long', // 'short', 'long', 'relative'
    className = ''
}) {
    if (!date) return <span className="text-crm-fg-muted">-</span>;

    const dateObj = new Date(date);
    
    // Check if invalid date
    if (isNaN(dateObj.getTime())) {
        return <span className="text-crm-fg-muted">-</span>;
    }

    let formattedDate = '';
    
    if (format === 'short') {
        formattedDate = dateObj.toLocaleDateString('es-AR');
    } else if (format === 'long') {
        formattedDate = dateObj.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } else {
        // relative fallback (simple implementation, could use date-fns)
        formattedDate = dateObj.toLocaleDateString('es-AR');
    }

    return (
        <span className={`text-crm-fg ${className}`}>
            {formattedDate}
        </span>
    );
}

import React from 'react';
import CrmBadge from './CrmBadge';

export default function StatusBadge({ children, variant = 'info', className = '' }) {
    return (
        <CrmBadge variant={variant} className={className}>
            {children}
        </CrmBadge>
    );
}

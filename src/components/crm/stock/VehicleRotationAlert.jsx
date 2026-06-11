"use client";
import CrmBadge from '../ui/CrmBadge';

export default function VehicleRotationAlert({ dias }) {
    if (dias >= 90) {
        return <CrmBadge variant="danger">+{dias} días</CrmBadge>;
    }
    if (dias >= 60) {
        return <CrmBadge variant="warning">+{dias} días</CrmBadge>;
    }
    return <span className="text-crm-fg-muted text-sm">{dias} días</span>;
}

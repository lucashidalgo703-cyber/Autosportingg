import React from 'react';
import AdminLayoutClient from '../../components/crm/layout/AdminLayoutClient';

export default function AdminLayout({ children }) {
    return (
        <AdminLayoutClient>
            {children}
        </AdminLayoutClient>
    );
}

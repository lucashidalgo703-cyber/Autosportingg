import CrmShell from '../../components/crm/layout/CrmShell';

export const metadata = {
    title: 'CRM | AutoSporting',
    robots: { index: false, follow: false }
};

export default function CrmLayout({ children }) {
    return (
        <CrmShell>
            {children}
        </CrmShell>
    );
}

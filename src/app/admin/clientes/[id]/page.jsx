"use client";
import { useParams, useRouter } from 'next/navigation';
import ClientDetailWorkspace from '../../../../components/crm/clients/ClientDetailWorkspace';
import { safeClientReturnTo } from '../../../../utils/clientNavigation';

export default function AdminClientDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    return <ClientDetailWorkspace clientId={id} onClose={() => router.push(safeClientReturnTo(new URLSearchParams(window.location.search).get('returnTo')))} />;
}

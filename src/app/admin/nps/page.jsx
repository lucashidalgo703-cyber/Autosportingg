"use client";
import { useAuth } from "../../../context/AuthContext";
import NpsDashboardWorkspace from "../../../components/crm/clients/NpsDashboardWorkspace";

export default function NpsDashboardPage() {
    const { token } = useAuth();
    return <NpsDashboardWorkspace key={token || "signed-out"} />;
}

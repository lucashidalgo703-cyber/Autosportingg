"use client";
import AdminPanel from '../../../views/AdminPanel';
import ProtectedRoute from '../../../components/ProtectedRoute';
export default function LegacyAdminPage() { return <ProtectedRoute><AdminPanel /></ProtectedRoute>; }

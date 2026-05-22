"use client";
import AdminPanel from '../../views/AdminPanel';
import ProtectedRoute from '../../components/ProtectedRoute';
export default function AdminPage() { return <ProtectedRoute><AdminPanel /></ProtectedRoute>; }

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresStudentSession?: boolean;
  requiresAdminSession?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiresStudentSession = false,
  requiresAdminSession = false 
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      if (requiresStudentSession) {
        const dashboardData = localStorage.getItem('studentDashboardData');
        setHasAccess(!!dashboardData);
      } else if (requiresAdminSession) {
        const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        setHasAccess(adminLoggedIn);
      } else {
        setHasAccess(true);
      }
      setLoading(false);
    };

    checkAccess();
  }, [requiresStudentSession, requiresAdminSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
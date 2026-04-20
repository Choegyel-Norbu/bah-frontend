import { Navigate, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '@/context/AuthContext';

// Simple Spinner component for loading state
const Spinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

export const ProtectedRoute = ({ requiredRole }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

ProtectedRoute.propTypes = {
  requiredRole: PropTypes.oneOf(['ADMIN', 'CUSTOMER']),
};

ProtectedRoute.defaultProps = {
  requiredRole: null,
};

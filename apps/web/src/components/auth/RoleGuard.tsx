import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UnauthorizedPage } from '../../pages/admin/UnauthorizedPage';

export const RoleGuard: React.FC<{
  allowedRoles: Array<'ADMIN' | 'STAFF' | 'CUSTOMER'>;
  children: React.ReactElement;
}> = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <UnauthorizedPage />;
  }

  return children;
};

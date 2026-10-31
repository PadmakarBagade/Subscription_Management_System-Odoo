import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoleGuard } from '../components/auth/RoleGuard';
import { AdminLayout } from '../components/layout/AdminLayout';
import * as AuthContextModule from '../context/AuthContext';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Sparkles: () => <span data-testid="sparkles-icon" />,
  };
});

// Mock AiAssistantDrawer to avoid deep dependencies
vi.mock('../components/ai/AiAssistantDrawer', () => ({
  AiAssistantDrawer: () => null,
}));

describe('Frontend Role Separation Suite', () => {
  const mockUseAuth = vi.spyOn(AuthContextModule, 'useAuth');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RoleGuard Component', () => {
    it('should render children when user has an allowed role (ADMIN)', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Admin User', email: 'admin@brightloop.com', role: 'ADMIN', status: 'ACTIVE' },
        token: 'admin-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <RoleGuard allowedRoles={['ADMIN']}>
            <div data-testid="admin-content">Admin Protected Workspace</div>
          </RoleGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId('admin-content')).toBeDefined();
      expect(screen.getByText('Admin Protected Workspace')).toBeDefined();
      expect(screen.queryByText('HTTP 403 Forbidden')).toBeNull();
    });

    it('should render UnauthorizedPage (403) when STAFF attempts to access ADMIN-only route', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u2', name: 'Staff User', email: 'staff@brightloop.com', role: 'STAFF', status: 'ACTIVE' },
        token: 'staff-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <RoleGuard allowedRoles={['ADMIN']}>
            <div data-testid="admin-content">Admin Protected Workspace</div>
          </RoleGuard>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('admin-content')).toBeNull();
      expect(screen.getByText('HTTP 403 Forbidden')).toBeDefined();
      expect(screen.getByText('Restricted Admin Area')).toBeDefined();
      expect(screen.getByText('Return to Staff Dashboard')).toBeDefined();
    });

    it('should render UnauthorizedPage when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <RoleGuard allowedRoles={['ADMIN']}>
            <div data-testid="admin-content">Admin Protected Workspace</div>
          </RoleGuard>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('admin-content')).toBeNull();
      expect(screen.getByText('HTTP 403 Forbidden')).toBeDefined();
    });
  });

  describe('AdminLayout Role-Aware Sidebar Navigation', () => {
    it('should render all admin management links when logged in as ADMIN', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Admin Chief', email: 'admin@brightloop.com', role: 'ADMIN', status: 'ACTIVE' },
        token: 'admin-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      // Header indicates Admin
      expect(screen.getByText('ADMIN WORKSPACE')).toBeDefined();
      expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0);

      // Admin navigation includes sensitive management links
      expect(screen.getByText('Users & Staff')).toBeDefined();
      expect(screen.getByText('Financial Reports')).toBeDefined();
      expect(screen.getByText('Audit Trail')).toBeDefined();
      expect(screen.getByText('Billing Engine')).toBeDefined();
    });

    it('should hide sensitive admin links and show operational labels when logged in as STAFF', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u2', name: 'Staff Specialist', email: 'staff@brightloop.com', role: 'STAFF', status: 'ACTIVE' },
        token: 'staff-token',
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      );

      // Header indicates Staff
      expect(screen.getByText('STAFF OPERATIONAL DESK')).toBeDefined();
      expect(screen.getAllByText('STAFF').length).toBeGreaterThan(0);

      // Staff navigation excludes sensitive management links
      expect(screen.queryByText('Users & Staff')).toBeNull();
      expect(screen.queryByText('Financial Reports')).toBeNull();
      expect(screen.queryByText('Audit Trail')).toBeNull();
      expect(screen.queryByText('Billing Engine')).toBeNull();

      // Staff navigation displays Read-Only Catalog labels
      expect(screen.getByText('Operational Desk')).toBeDefined();
      expect(screen.getByText('Products (Read-Only)')).toBeDefined();
      expect(screen.getByText('Plans (Read-Only)')).toBeDefined();
      expect(screen.getByText('Taxes (Read-Only)')).toBeDefined();
      expect(screen.getByText('Discounts (Read-Only)')).toBeDefined();
    });
  });
});

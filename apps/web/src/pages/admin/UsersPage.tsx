import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    department: 'Customer Success',
    designation: 'Operations Specialist',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = `?limit=50`;
      if (roleFilter) query += `&role=${roleFilter}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await apiRequest(`/users${query}`);
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'STAFF',
          department: 'Customer Success',
          designation: 'Operations Specialist',
        });
        loadUsers();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to mark ${user.name} as ${nextStatus}?`)) return;

    try {
      const res = await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success) {
        loadUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to permanently delete/deactivate ${user.name} (${user.email})?`)) return;

    try {
      const res = await apiRequest(`/users/${user.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        loadUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admin Exclusive
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            User & Staff Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision, manage, and configure staff authority and operational credentials.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Staff Account</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="sm" className="px-3">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="STAFF">Staff Only</option>
            <option value="CUSTOMER">Customers Only</option>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => loadUsers()} title="Reload">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No users found matching current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Department / Profile</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Last Login</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : u.role === 'STAFF' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Staff</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span>Customer</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.staffProfile ? (
                        <span>
                          {u.staffProfile.designation} ({u.staffProfile.department})
                        </span>
                      ) : u.customerProfile?.companyName ? (
                        <span>{u.customerProfile.companyName}</span>
                      ) : (
                        <span className="text-slate-400 italic">None specified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs ${u.status === 'ACTIVE' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(u)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision New Staff or Admin Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Alex Morgan"
          />

          <Input
            label="Work Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="alex.m@brightloop.com"
          />

          <Input
            label="Temporary Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Min 8 characters"
          />

          <Select
            label="System Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="STAFF">Staff (Operational Authority)</option>
            <option value="ADMIN">Admin (Full System Authority)</option>
          </Select>

          {formData.role === 'STAFF' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Operations"
              />
              <Input
                label="Designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Account Manager"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

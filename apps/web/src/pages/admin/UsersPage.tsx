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
  KeyRound,
  Edit2,
  Briefcase,
  Building,
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
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Staff Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    department: '',
    designation: '',
    role: '',
    status: '',
  });

  // Create Form State
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
      if (res.success && Array.isArray(res.data)) {
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
    setSuccessMsg('');

    // Pre-validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      setSubmitting(false);
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMsg('A valid work email address is required.');
      setSubmitting(false);
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setSuccessMsg(`Account for ${formData.name} created successfully!`);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'STAFF',
          department: 'Customer Success',
          designation: 'Operations Specialist',
        });
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg('');
          loadUsers();
        }, 1200);
      }
    } catch (err: any) {
      let msg = err.message || 'Failed to create user account';
      if (err.errors) {
        const details = Object.entries(err.errors)
          .map(([field, msgs]: any) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        msg = `${msg} (${details})`;
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      department: user.staffProfile?.department || 'Operations',
      designation: user.staffProfile?.designation || 'Staff Associate',
      role: user.role,
      status: user.status,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await apiRequest(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editFormData),
      });

      if (res.success) {
        setEditModalOpen(false);
        setEditingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      alert(`Failed to update account: ${err.message || 'Error'}`);
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
              Admin Exclusive Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            User & Staff Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision staff authority, configure departmental designations, and manage login credentials.
          </p>
        </div>

        <Button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
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
            className="flex-1 bg-white"
          />
          <Button type="submit" variant="outline" size="sm" className="px-3">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-white"
          >
            <option value="">All Roles</option>
            <option value="STAFF">Staff Only</option>
            <option value="ADMIN">Admins Only</option>
            <option value="CUSTOMER">Customers Only</option>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => loadUsers()} title="Reload user list">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
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
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Designation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 text-slate-700">
                      {u.staffProfile ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{u.staffProfile.designation}</span>
                          <span className="text-[11px] text-slate-400">{u.staffProfile.department}</span>
                        </div>
                      ) : u.customerProfile?.companyName ? (
                        <span className="font-medium text-slate-800">{u.customerProfile.companyName}</span>
                      ) : (
                        <span className="text-slate-400 italic">None specified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role === 'STAFF' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(u)}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1.5"
                            title="Edit Staff Department / Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(u)}
                          className={`text-xs px-2 py-1 ${
                            u.status === 'ACTIVE'
                              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(u)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5"
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

      {/* Create Staff Account Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision New Staff or Admin Account"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
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

          <div>
            <Input
              label="Temporary Password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Min 8 characters (e.g. Staff@123456)"
              helperText="Staff member will use this password to sign in to the operational portal."
            />
          </div>

          <Select
            label="System Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="STAFF">Staff (Operational Authority - Billing & Support)</option>
            <option value="ADMIN">Admin (Full System Authority - Financial Governance)</option>
          </Select>

          {formData.role === 'STAFF' && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Operations / Customer Success"
              />
              <Input
                label="Designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Operations Specialist"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Profile Modal */}
      {editingUser && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingUser(null);
          }}
          title={`Edit Profile: ${editingUser.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />

            <Input
              label="Department"
              value={editFormData.department}
              onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
              placeholder="e.g. Customer Support"
            />

            <Input
              label="Designation"
              value={editFormData.designation}
              onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
              placeholder="e.g. Lead Operations"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

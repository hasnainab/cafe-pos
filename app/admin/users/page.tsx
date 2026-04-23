'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/auth';

type AllowedRole = 'admin' | 'manager' | 'cashier';

type StaffRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: AllowedRole;
  is_active: boolean | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

type StaffForm = {
  id: string | null;
  email: string;
  password: string;
  full_name: string;
  role: AllowedRole;
  is_active: boolean;
};

function normalizeRole(role: string | null | undefined): AllowedRole {
  if (role === 'admin' || role === 'manager' || role === 'cashier') return role;
  return 'cashier';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

const blankForm: StaffForm = {
  id: null,
  email: '',
  password: '',
  full_name: '',
  role: 'cashier',
  is_active: true,
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [currentRole, setCurrentRole] = useState<AllowedRole>('cashier');
  const [statusMessage, setStatusMessage] = useState('Loading...');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [form, setForm] = useState<StaffForm>(blankForm);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAuth = async () => {
      const {
        data: { session },
      } = await supabaseAuth.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabaseAuth
        .from('staff_profiles')
        .select('id, role, is_active')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.is_active === false) {
        await supabaseAuth.auth.signOut();
        router.push('/login');
        return;
      }

      const role = normalizeRole(profile.role);
      setCurrentRole(role);
      setAuthToken(session.access_token);
      setAuthChecked(true);

      if (role !== 'admin') {
        setStatusMessage('Admin access required');
        return;
      }

      await loadRows(session.access_token);
    };

    loadAuth();
  }, [router]);

  async function loadRows(token = authToken) {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load staff');
      }

      setRows(payload.rows || []);
      setStatusMessage('Ready');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load staff');
    } finally {
      setLoading(false);
    }
  }

  async function saveStaff() {
    if (currentRole !== 'admin') {
      setStatusMessage('Admin access required');
      return;
    }

    setLoading(true);
    try {
      const isEdit = Boolean(form.id);
      const response = await fetch('/api/admin/staff', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not save staff');
      }

      setForm(blankForm);
      setStatusMessage(isEdit ? 'Staff updated' : 'Staff created');
      await loadRows();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not save staff');
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset(email: string) {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/staff/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Could not send reset email');
      }

      setStatusMessage(`Password reset email sent to ${email}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  async function switchUser() {
    try {
      await supabaseAuth.auth.signOut();
    } finally {
      router.push('/login');
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.full_name ?? '',
        row.email ?? '',
        row.role ?? '',
        row.id ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-rose-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm">Loading...</div>
      </main>
    );
  }

  if (currentRole !== 'admin') {
    return (
      <main className="min-h-screen bg-rose-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold">Admin access required</div>
          <div className="mt-2 text-sm text-slate-600">
            This page is only for admin users.
          </div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
          >
            Back to POS
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-rose-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Staff User Management</h1>
              <p className="mt-1 text-sm text-slate-600">
                Admin-only web-based staff management for STT POS.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/')}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
              >
                Back to POS
              </button>
              <button
                onClick={switchUser}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Switch User
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
            <h2 className="text-xl font-semibold text-slate-900">
              {form.id ? 'Edit Staff User' : 'Create Staff User'}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-xl border border-rose-200 px-3 py-2"
              />
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                disabled={Boolean(form.id)}
                className="w-full rounded-xl border border-rose-200 px-3 py-2 disabled:bg-slate-50"
              />
              {!form.id ? (
                <input
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Temporary password"
                  type="password"
                  className="w-full rounded-xl border border-rose-200 px-3 py-2"
                />
              ) : null}
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: normalizeRole(e.target.value) }))}
                className="w-full rounded-xl border border-rose-200 px-3 py-2"
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Active
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={saveStaff}
                  disabled={loading}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                >
                  {form.id ? 'Update User' : 'Create User'}
                </button>
                <button
                  onClick={() => setForm(blankForm)}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
                >
                  Clear
                </button>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Password reset emails use your app URL from <span className="font-semibold">NEXT_PUBLIC_APP_URL</span>.
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Existing Staff</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, role"
                className="w-full max-w-sm rounded-xl border border-rose-200 px-3 py-2"
              />
            </div>

            <div className="mt-3 text-sm text-slate-600">{statusMessage}</div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-rose-100 text-slate-600">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last Sign In</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        No staff users found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-b border-rose-50 align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{row.full_name || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500">{row.id}</div>
                        </td>
                        <td className="px-3 py-3">{row.email || '-'}</td>
                        <td className="px-3 py-3">{row.role}</td>
                        <td className="px-3 py-3">
                          {row.is_active === false ? 'Inactive' : 'Active'}
                        </td>
                        <td className="px-3 py-3">{formatDateTime(row.last_sign_in_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                setForm({
                                  id: row.id,
                                  email: row.email,
                                  password: '',
                                  full_name: row.full_name || '',
                                  role: row.role,
                                  is_active: row.is_active !== false,
                                })
                              }
                              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => sendPasswordReset(row.email)}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                            >
                              Send Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

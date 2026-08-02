import { useEffect, useState } from 'react';
import { Activity, Database, LoaderCircle, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { adminAPI } from '../api';

type Tab = 'overview' | 'users' | 'orders' | 'teams' | 'system';
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' }, { id: 'users', label: 'Users' }, { id: 'orders', label: 'Orders' }, { id: 'teams', label: 'Teams' }, { id: 'system', label: 'System' },
];

const formatBytes = (value = 0) => value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextOverview, nextUsers, nextOrders, nextTeams, nextConfig] = await Promise.all([
        adminAPI.overview(), adminAPI.users(), adminAPI.orders(), adminAPI.teams(), adminAPI.config(),
      ]);
      setOverview(nextOverview); setUsers(nextUsers.data || []); setOrders(nextOrders.data || []); setTeams(nextTeams.data || []); setConfig(nextConfig);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the administrator console.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleFrozen = async (user: any) => {
    const frozen = !user.is_frozen;
    const reason = window.prompt(`${frozen ? 'Freeze' : 'Unfreeze'} ${user.email}. Record a reason:`, 'Administrator review');
    if (!reason) return;
    if (!window.confirm(`${frozen ? 'Freeze' : 'Unfreeze'} ${user.email}? This action will be recorded in the audit log.`)) return;
    setMutatingId(user.id);
    try {
      await adminAPI.setFrozen(user.id, frozen, reason);
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, is_frozen: frozen ? 1 : 0 } : item));
      await load();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Account change failed.');
    } finally { setMutatingId(null); }
  };

  if (loading) return <div className="min-h-[360px] flex items-center justify-center text-[var(--text-secondary)]"><LoaderCircle size={20} className="animate-spin mr-2" />Loading administrator data...</div>;
  if (error && !overview) return <div className="max-w-5xl mx-auto py-8"><p className="border border-red-200 bg-red-50 p-4 text-red-700 rounded-lg">{error}</p><button onClick={load} className="mt-4 px-3 py-2 border rounded-lg text-sm">Retry</button></div>;

  const metric = (label: string, value: string | number, note: string) => <div className="border border-[var(--border-color)] bg-[var(--bg-card)] p-4 rounded-lg"><p className="text-xs text-[var(--text-tertiary)]">{label}</p><p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{note}</p></div>;
  return <div className="max-w-6xl mx-auto pb-10">
    <header className="flex items-start justify-between gap-5 border-b border-[var(--border-color)] pb-5 mb-5 flex-wrap"><div><p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Operations</p><h2 className="mt-2 text-3xl font-semibold">Administrator console</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Server-authorized operational data, entitlement control, and audit visibility.</p></div><button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-hover)]"><RefreshCw size={15} />Refresh</button></header>
    {error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-lg">{error}</p>}
    <nav className="flex overflow-x-auto border-b border-[var(--border-color)] mb-6" aria-label="Administrator sections">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 px-4 py-3 text-sm border-b-2 ${tab === item.id ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{item.label}</button>)}</nav>
    {tab === 'overview' && overview && <section className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{metric('Accounts', overview.users.total, `${overview.users.active30d} active in 30 days`)}{metric('Paid accounts', overview.users.paid, `${overview.users.frozen} frozen accounts`)}{metric('Teams', overview.entities.teams, `${overview.entities.projects} projects`)}{metric('Task completion', `${overview.entities.completedTasks}/${overview.entities.tasks}`, `${overview.entities.attachments} attachments`)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><section className="border border-[var(--border-color)] rounded-lg p-5"><div className="flex gap-2 items-center"><Users size={17} className="text-[var(--accent)]" /><h3 className="font-semibold">Plan distribution</h3></div><div className="mt-4 space-y-3">{overview.planDistribution.map((item: any) => <div key={item.plan} className="flex justify-between text-sm"><span className="capitalize">{item.plan}</span><span className="font-semibold">{item.count}</span></div>)}</div></section><section className="border border-[var(--border-color)] rounded-lg p-5"><div className="flex gap-2 items-center"><Activity size={17} className="text-[var(--accent)]" /><h3 className="font-semibold">Recent audit activity</h3></div><div className="mt-4 space-y-3">{overview.recentAudit.length ? overview.recentAudit.slice(0, 6).map((item: any) => <div key={item.id} className="border-b border-[var(--border-color)] pb-2 last:border-0"><p className="text-sm text-[var(--text-primary)]">{item.message}</p><p className="mt-1 text-xs text-[var(--text-tertiary)]">{item.email || 'System'} · {new Date(item.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-[var(--text-secondary)]">No audit entries yet.</p>}</div></section></div></section>}
    {tab === 'users' && <section className="border border-[var(--border-color)] rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-hover)] text-left text-xs text-[var(--text-tertiary)]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-[var(--border-color)]"><td className="px-4 py-3"><p className="font-medium">{user.name}</p><p className="text-xs text-[var(--text-tertiary)]">{user.email}</p></td><td className="px-4 py-3 capitalize">{user.plan || 'free'}</td><td className="px-4 py-3 capitalize">{user.role}</td><td className="px-4 py-3"><span className={user.is_frozen ? 'text-red-700' : 'text-emerald-700'}>{user.is_frozen ? 'Frozen' : 'Active'}</span></td><td className="px-4 py-3"><button disabled={mutatingId === user.id || user.role === 'admin'} onClick={() => toggleFrozen(user)} className="px-3 py-1.5 border border-[var(--border-color)] rounded text-xs disabled:opacity-50 hover:bg-[var(--bg-hover)]">{mutatingId === user.id ? 'Saving...' : user.is_frozen ? 'Unfreeze' : 'Freeze'}</button></td></tr>)}</tbody></table></section>}
    {tab === 'orders' && <section className="border border-[var(--border-color)] rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-hover)] text-left text-xs text-[var(--text-tertiary)]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{orders.length ? orders.map((order) => <tr key={order.id} className="border-t border-[var(--border-color)]"><td className="px-4 py-3">{order.email || 'Unknown'}</td><td className="px-4 py-3 capitalize">{order.plan}</td><td className="px-4 py-3">{order.currency} {(order.amount_cents / 100).toFixed(2)}</td><td className="px-4 py-3">{order.provider}</td><td className="px-4 py-3 capitalize">{order.status}</td></tr>) : <tr><td className="p-5 text-[var(--text-secondary)]" colSpan={5}>No payment orders have been processed.</td></tr>}</tbody></table></section>}
    {tab === 'teams' && <section className="border border-[var(--border-color)] rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-hover)] text-left text-xs text-[var(--text-tertiary)]"><tr><th className="px-4 py-3">Team</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Created</th></tr></thead><tbody>{teams.length ? teams.map((team) => <tr key={team.id} className="border-t border-[var(--border-color)]"><td className="px-4 py-3"><p className="font-medium">{team.name}</p><p className="text-xs text-[var(--text-tertiary)]">{team.description}</p></td><td className="px-4 py-3">{team.owner_email || 'Unknown'}</td><td className="px-4 py-3">{team.member_count}</td><td className="px-4 py-3">{new Date(team.created_at).toLocaleDateString()}</td></tr>) : <tr><td className="p-5 text-[var(--text-secondary)]" colSpan={4}>No teams have been created.</td></tr>}</tbody></table></section>}
    {tab === 'system' && <section className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div className="border border-[var(--border-color)] rounded-lg p-5"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">AI service policy</h3></div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Credential</dt><dd>{config?.apiKeyConfigured ? 'Configured on server' : 'Not configured'}</dd></div><div className="flex justify-between gap-4"><dt>Model</dt><dd className="text-right">{config?.model || 'Not configured'}</dd></div><div><dt className="mb-2">Allowlisted endpoints</dt>{(config?.allowedEndpoints || []).map((endpoint: string) => <dd key={endpoint} className="text-xs break-all text-[var(--text-secondary)] mb-1">{endpoint}</dd>)}</div></dl></div><div className="border border-[var(--border-color)] rounded-lg p-5"><div className="flex items-center gap-2"><Database size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Runtime and storage</h3></div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Uptime</dt><dd>{overview ? `${Math.floor(overview.runtime.uptimeSeconds / 60)} min` : '-'}</dd></div><div className="flex justify-between"><dt>Process heap</dt><dd>{overview ? formatBytes(overview.runtime.memory.heapUsed) : '-'}</dd></div><div className="flex justify-between"><dt>Attachment storage</dt><dd>{overview ? formatBytes(overview.entities.attachmentBytes) : '-'}</dd></div></dl></div></section>}
  </div>;
}

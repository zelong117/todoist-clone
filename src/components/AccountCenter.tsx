import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Download, Laptop, LoaderCircle, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import { accountAPI, authAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

type ActiveSession = {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export default function AccountCenter() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      setSessions((await authAPI.sessions()).sessions);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Unable to load active sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => { void loadSessions(); }, []);

  const downloadExport = async () => {
    setExporting(true); setError('');
    try {
      const backup = await accountAPI.exportData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `taskflow-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : 'Data export failed.'); }
    finally { setExporting(false); }
  };

  const revokeOne = async (sessionId: string) => {
    setRevoking(sessionId); setError('');
    try { await authAPI.revokeSession(sessionId); await loadSessions(); }
    catch (sessionError) { setError(sessionError instanceof Error ? sessionError.message : 'Unable to sign out this session.'); }
    finally { setRevoking(null); }
  };

  const revokeOthers = async () => {
    if (!window.confirm('Sign out every other active device? This cannot be undone.')) return;
    setRevoking('others'); setError('');
    try { await authAPI.revokeOtherSessions(); await loadSessions(); }
    catch (sessionError) { setError(sessionError instanceof Error ? sessionError.message : 'Unable to sign out other sessions.'); }
    finally { setRevoking(null); }
  };

  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || confirmationEmail !== user.email || !password) return;
    setDeleting(true); setError('');
    try { await accountAPI.deleteAccount(confirmationEmail, password); logout(); window.history.pushState({}, '', '/register'); window.dispatchEvent(new PopStateEvent('popstate')); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Account deletion failed.'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-7">
      <header className="border-b border-[var(--border-color)] pb-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Account and privacy</p>
        <h2 className="mt-2 text-3xl font-semibold">Account center</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Manage your exported data, active devices, and permanent account lifecycle.</p>
      </header>
      {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-lg">{error}</p>}
      <section className="border border-[var(--border-color)] rounded-lg p-5">
        <div className="flex gap-3">
          <ShieldCheck className="text-[var(--accent)] shrink-0" size={20} />
          <div>
            <h3 className="font-semibold">Data export</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Download a JSON copy of your profile, tasks, projects, labels, activity, teams, comments, and focus sessions. Passwords, tokens, and payment secrets are never included.</p>
            <button disabled={exporting} onClick={downloadExport} className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50">
              {exporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
              {exporting ? 'Preparing export...' : 'Download my data'}
            </button>
          </div>
        </div>
      </section>
      <section className="border border-[var(--border-color)] rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h3 className="font-semibold">Active sessions</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Sessions are issued by the server. Sign out any device you do not recognize.</p></div>
          <button disabled={sessionsLoading || revoking !== null || sessions.every((session) => session.current)} onClick={revokeOthers} className="inline-flex items-center gap-2 border border-[var(--border-color)] px-3 py-2 text-sm rounded-lg disabled:opacity-50"><LogOut size={15} />{revoking === 'others' ? 'Signing out...' : 'Sign out other devices'}</button>
        </div>
        <div className="mt-4 divide-y divide-[var(--border-color)]">
          {sessionsLoading && <p className="py-3 text-sm text-[var(--text-secondary)]">Loading active sessions...</p>}
          {!sessionsLoading && sessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-3 min-w-0">{session.deviceLabel.includes('device') ? <Smartphone size={18} className="text-[var(--text-secondary)] shrink-0" /> : <Laptop size={18} className="text-[var(--text-secondary)] shrink-0" />}<div><p className="text-sm font-medium">{session.deviceLabel}{session.current ? ' (this device)' : ''}</p><p className="text-xs text-[var(--text-tertiary)]">Started {new Date(session.createdAt).toLocaleString()}</p></div></div>{!session.current && <button disabled={revoking !== null} onClick={() => void revokeOne(session.id)} className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50">{revoking === session.id ? 'Signing out...' : 'Sign out'}</button>}</div>)}
          {!sessionsLoading && sessions.length === 0 && <p className="py-3 text-sm text-[var(--text-secondary)]">No active sessions found.</p>}
        </div>
      </section>
      <section className="border border-red-200 bg-red-50/50 rounded-lg p-5"><div className="flex gap-3"><AlertTriangle className="text-red-700 shrink-0" size={20} /><div className="w-full"><h3 className="font-semibold text-red-900">Delete account</h3><p className="mt-1 text-sm text-red-800">This permanently removes your workspace data and signs you out. Download an export first. Accounts that still own a team must transfer or remove their team before deletion.</p><form onSubmit={deleteAccount} className="mt-4 grid grid-cols-1 gap-3 max-w-md"><label className="text-sm"><span className="block mb-1 text-red-900">Type your email to confirm</span><input type="email" value={confirmationEmail} onChange={(event) => setConfirmationEmail(event.target.value)} placeholder={user?.email || ''} className="w-full border border-red-200 bg-white px-3 py-2 rounded-lg" required /></label><label className="text-sm"><span className="block mb-1 text-red-900">Current password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border border-red-200 bg-white px-3 py-2 rounded-lg" required /></label><button disabled={deleting || confirmationEmail !== user?.email || !password} className="justify-self-start px-3 py-2 bg-red-700 text-white rounded-lg text-sm disabled:opacity-50">{deleting ? 'Deleting...' : 'Permanently delete account'}</button></form></div></div></section>
    </div>
  );
}

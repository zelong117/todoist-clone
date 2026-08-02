import { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { notificationsAPI } from '../api';

type NotificationItem = { id: string; title: string; message: string; severity: 'info' | 'warning' | 'error' | 'success'; readAt: string | null; createdAt: string };

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try { setItems(await notificationsAPI.getAll()); } catch { setError('Notifications could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  };
  return <section className="max-w-3xl mx-auto px-6 py-7 space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Notifications</h2><p className="text-sm text-[var(--text-tertiary)]">Updates that need your attention.</p></div><div className="flex gap-2"><button onClick={load} className="p-2 rounded-md hover:bg-[var(--bg-hover)]" title="Refresh"><RefreshCw size={16} /></button><button onClick={markAllRead} disabled={!items.some((item) => !item.readAt)} className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--accent)] text-white text-sm disabled:opacity-40"><CheckCheck size={16} />Mark all read</button></div></div>
    {loading && <div className="py-10 text-sm text-[var(--text-tertiary)]">Loading notifications...</div>}
    {!loading && error && <div className="py-8 text-sm text-red-600">{error}</div>}
    {!loading && !error && items.length === 0 && <div className="py-14 text-center border border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-tertiary)]"><Bell size={24} className="mx-auto mb-3" />Nothing needs your attention.</div>}
    {!loading && !error && items.map((item) => <article key={item.id} className={`border border-[var(--border-color)] rounded-lg p-4 ${item.readAt ? 'opacity-65' : 'bg-[var(--bg-card)]'}`}><div className="flex gap-3"><span className={`mt-1 w-2 h-2 rounded-full ${item.severity === 'error' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-amber-500' : item.severity === 'success' ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`} /><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="text-sm text-[var(--text-secondary)] mt-1">{item.message}</p><time className="block mt-2 text-xs text-[var(--text-tertiary)]">{new Date(item.createdAt).toLocaleString()}</time></div></div></article>)}
  </section>;
}

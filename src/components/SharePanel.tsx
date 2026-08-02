import { useCallback, useEffect, useState } from 'react';
import { Crown, Eye, Loader2, Mail, Shield, Trash2, User, Users, X } from 'lucide-react';
import { sharesAPI } from '../api';

interface SharePanelProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  name: string;
  email: string;
}

const roles = ['admin', 'member', 'viewer'] as const;
const rolePresentation = {
  owner: { label: '所有者', icon: Crown, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  admin: { label: '管理员', icon: Shield, className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  member: { label: '成员', icon: User, className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  viewer: { label: '只读', icon: Eye, className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' },
};

export default function SharePanel({ projectId, projectName, onClose }: SharePanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof roles)[number]>('member');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await sharesAPI.list(projectId));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法加载项目成员。');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const invite = async () => {
    if (!email.trim() || working) return;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      await sharesAPI.invite(projectId, email.trim(), role);
      setNotice(`已邀请 ${email.trim()} 加入项目。`);
      setEmail('');
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '邀请失败。');
    } finally {
      setWorking(false);
    }
  };

  const changeRole = async (member: Member, nextRole: (typeof roles)[number]) => {
    setWorking(true);
    setError('');
    try {
      await sharesAPI.updateRole(projectId, member.user_id, nextRole);
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '角色更新失败。');
    } finally {
      setWorking(false);
    }
  };

  const remove = async (member: Member) => {
    if (working || !window.confirm(`移除 ${member.email}？`)) return;
    setWorking(true);
    setError('');
    try {
      await sharesAPI.remove(projectId, member.user_id);
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '移除成员失败。');
    } finally {
      setWorking(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="share-panel-title">
    <section className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl">
      <header className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-700"><Users size={18} /></span><div className="min-w-0"><h2 id="share-panel-title" className="truncate text-base font-semibold text-[var(--text-primary)]">项目协作</h2><p className="truncate text-xs text-[var(--text-tertiary)]">{projectName}</p></div></div>
        <button type="button" onClick={onClose} aria-label="关闭项目协作" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"><X size={17} /></button>
      </header>
      <div className="border-b border-[var(--border-color)] p-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_112px_auto]"><label className="relative"><Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" /><input aria-label="邀请邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void invite(); }} placeholder="同事的注册邮箱" className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" /></label><select aria-label="项目角色" value={role} onChange={(event) => setRole(event.target.value as (typeof roles)[number])} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]">{roles.map((item) => <option key={item} value={item}>{rolePresentation[item].label}</option>)}</select><button type="button" disabled={working || !email.trim()} onClick={() => void invite()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{working && <Loader2 size={14} className="animate-spin" />}邀请</button></div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}{notice && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">成员 {members.length}</p>{loading ? <div className="grid place-items-center py-10 text-[var(--text-tertiary)]"><Loader2 size={22} className="animate-spin" /></div> : <div className="space-y-2">{members.map((member) => { const presentation = rolePresentation[member.role] || rolePresentation.member; const Icon = presentation.icon; return <article key={member.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border-color)] p-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-active)] text-sm font-semibold text-[var(--text-primary)]">{(member.name || member.email || '?')[0].toUpperCase()}</span><div className="min-w-[140px] flex-1"><p className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.name || '未命名成员'}</p><p className="truncate text-xs text-[var(--text-tertiary)]">{member.email}</p></div>{member.role === 'owner' ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${presentation.className}`}><Icon size={13} />{presentation.label}</span> : <><select aria-label={`${member.email} 的角色`} disabled={working} value={member.role} onChange={(event) => void changeRole(member, event.target.value as (typeof roles)[number])} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1.5 text-xs text-[var(--text-primary)]">{roles.map((item) => <option key={item} value={item}>{rolePresentation[item].label}</option>)}</select><button type="button" disabled={working} onClick={() => void remove(member)} aria-label={`移除 ${member.email}`} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50"><Trash2 size={15} /></button></>}</article>; })}</div>}</div>
    </section>
  </div>;
}

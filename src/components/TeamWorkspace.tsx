import { useEffect, useState, type FormEvent } from 'react';
import { Crown, LoaderCircle, Plus, RefreshCw, Shield, UserMinus, Users } from 'lucide-react';
import { teamsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

const roles = ['admin', 'member', 'guest'];

export default function TeamWorkspace() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const selected = teams.find((team) => team.id === selectedId) || null;
  const canManage = selected?.my_role === 'owner' || selected?.my_role === 'admin';

  const loadTeams = async (preserveId?: string) => {
    setLoading(true); setError('');
    try {
      const nextTeams = await teamsAPI.list();
      setTeams(nextTeams);
      const nextId = preserveId && nextTeams.some((team) => team.id === preserveId) ? preserveId : nextTeams[0]?.id || '';
      setSelectedId(nextId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load teams.');
    } finally { setLoading(false); }
  };

  const loadMembers = async (teamId: string) => {
    if (!teamId) { setMembers([]); return; }
    try { setMembers(await teamsAPI.members(teamId)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load members.'); }
  };

  useEffect(() => { loadTeams(); }, []);
  useEffect(() => { loadMembers(selectedId); }, [selectedId]);

  const createTeam = async (event: FormEvent) => {
    event.preventDefault();
    if (!teamName.trim()) return;
    setWorking(true); setError('');
    try {
      const created = await teamsAPI.create(teamName.trim(), teamDescription.trim());
      setCreateOpen(false); setTeamName(''); setTeamDescription('');
      await loadTeams(created.id);
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Unable to create team.'); }
    finally { setWorking(false); }
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !inviteEmail.trim()) return;
    setWorking(true); setError('');
    try {
      await teamsAPI.invite(selectedId, inviteEmail.trim(), inviteRole);
      setInviteEmail(''); setInviteRole('member'); await loadMembers(selectedId);
    } catch (inviteError) { setError(inviteError instanceof Error ? inviteError.message : 'Unable to invite member.'); }
    finally { setWorking(false); }
  };

  const setRole = async (member: any, role: string) => {
    if (!selectedId || role === member.role) return;
    setWorking(true); setError('');
    try { await teamsAPI.updateMember(selectedId, member.user_id, role); await loadMembers(selectedId); }
    catch (roleError) { setError(roleError instanceof Error ? roleError.message : 'Unable to update role.'); }
    finally { setWorking(false); }
  };

  const remove = async (member: any) => {
    if (!selectedId || !window.confirm(`Remove ${member.email} from this team?`)) return;
    setWorking(true); setError('');
    try { await teamsAPI.removeMember(selectedId, member.user_id); await loadTeams(selectedId); await loadMembers(selectedId); }
    catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Unable to remove member.'); }
    finally { setWorking(false); }
  };

  const transfer = async (member: any) => {
    if (!selectedId || !window.confirm(`Transfer ownership to ${member.email}? You will become an administrator.`)) return;
    setWorking(true); setError('');
    try { await teamsAPI.transferOwnership(selectedId, member.user_id); await loadTeams(selectedId); await loadMembers(selectedId); }
    catch (transferError) { setError(transferError instanceof Error ? transferError.message : 'Unable to transfer ownership.'); }
    finally { setWorking(false); }
  };

  if (loading) return <div className="min-h-[340px] flex items-center justify-center text-[var(--text-secondary)]"><LoaderCircle className="animate-spin mr-2" size={20} />Loading team workspace...</div>;
  return <div className="max-w-6xl mx-auto pb-10">
    <header className="flex justify-between gap-4 flex-wrap border-b border-[var(--border-color)] pb-5 mb-5"><div><p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Business collaboration</p><h2 className="mt-2 text-3xl font-semibold">Team workspace</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Roles and membership are enforced by the server.</p></div><div className="flex gap-2"><button onClick={() => loadTeams(selectedId)} className="inline-flex items-center gap-2 px-3 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-hover)]"><RefreshCw size={15} />Refresh</button><button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm"><Plus size={15} />New team</button></div></header>
    {error && <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-lg">{error}</p>}
    {createOpen && <form onSubmit={createTeam} className="border border-[var(--border-color)] rounded-lg p-4 mb-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3"><input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Team name" maxLength={80} className="border border-[var(--border-color)] bg-transparent px-3 py-2 rounded-lg text-sm" required /><input value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)} placeholder="Description (optional)" maxLength={240} className="border border-[var(--border-color)] bg-transparent px-3 py-2 rounded-lg text-sm" /><div className="flex gap-2"><button disabled={working} className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm disabled:opacity-50">Create</button><button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm">Cancel</button></div></form>}
    {!teams.length ? <section className="border border-dashed border-[var(--border-color)] p-10 text-center rounded-lg"><Users size={28} className="mx-auto text-[var(--text-tertiary)]" /><h3 className="mt-4 font-semibold">No team workspace yet</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">Business plan owners can create a team and invite registered colleagues.</p></section> : <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5"><aside className="border border-[var(--border-color)] rounded-lg p-2 h-fit"><p className="px-3 pt-2 pb-1 text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Your teams</p>{teams.map((team) => <button key={team.id} onClick={() => setSelectedId(team.id)} className={`w-full text-left px-3 py-3 rounded-lg mt-1 ${team.id === selectedId ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}><span className="block font-medium">{team.name}</span><span className="block mt-1 text-xs capitalize">{team.my_role}</span></button>)}</aside>{selected && <section className="border border-[var(--border-color)] rounded-lg"><div className="p-5 border-b border-[var(--border-color)]"><div className="flex justify-between gap-3 flex-wrap"><div><h3 className="text-xl font-semibold">{selected.name}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{selected.description || 'No description'}</p></div><span className="inline-flex items-center gap-1 text-xs px-2 py-1 h-fit rounded-full bg-[var(--bg-active)] capitalize"><Shield size={13} />{selected.my_role}</span></div></div>{canManage && <form onSubmit={invite} className="p-5 border-b border-[var(--border-color)] grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Registered colleague email" className="border border-[var(--border-color)] bg-transparent px-3 py-2 rounded-lg text-sm" required /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="border border-[var(--border-color)] bg-transparent px-3 py-2 rounded-lg text-sm">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select><button disabled={working} className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm disabled:opacity-50">Invite</button></form>}<div className="divide-y divide-[var(--border-color)]">{members.map((member) => { const self = member.user_id === user?.id; const canEdit = selected.my_role === 'owner' || (selected.my_role === 'admin' && ['member', 'guest'].includes(member.role)); return <div key={member.id} className="p-4 flex items-center gap-3 flex-wrap"><div className="w-8 h-8 bg-[var(--bg-active)] rounded-full grid place-items-center text-xs font-semibold">{(member.name || member.email || '?')[0].toUpperCase()}</div><div className="min-w-[160px] flex-1"><p className="font-medium text-sm">{member.name || member.email}</p><p className="text-xs text-[var(--text-tertiary)]">{member.email}</p></div>{member.role === 'owner' ? <span className="inline-flex gap-1 items-center text-xs text-amber-700"><Crown size={14} />Owner</span> : canEdit ? <select disabled={working} value={member.role} onChange={(event) => setRole(member, event.target.value)} className="border border-[var(--border-color)] bg-transparent px-2 py-1.5 rounded text-xs">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select> : <span className="text-xs capitalize">{member.role}</span>}{selected.my_role === 'owner' && member.role !== 'owner' && <button disabled={working} onClick={() => transfer(member)} className="text-xs text-[var(--accent)]">Transfer ownership</button>}{(canEdit || self) && member.role !== 'owner' && <button disabled={working} onClick={() => remove(member)} className="inline-flex items-center gap-1 text-xs text-red-700"><UserMinus size={14} />{self ? 'Leave' : 'Remove'}</button>}</div>; })}</div></section>}</div>}
  </div>;
}

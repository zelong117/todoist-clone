import { useState, useEffect, useCallback } from 'react';
import { X, Users, Mail, Crown, Shield, Eye, User, Trash2, Loader2 } from 'lucide-react';

interface SharePanelProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  joined_at: string;
}

const API_URL = `${window.location.protocol}//${window.location.hostname}:3001/api`;

export default function SharePanel({ projectId, projectName, onClose }: SharePanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/projects/${projectId}/shares`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch {
      setError('获取成员列表失败');
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`已邀请 ${inviteEmail} 加入项目`);
        setInviteEmail('');
        fetchMembers();
      } else {
        setError(data.error || '邀请失败');
      }
    } catch {
      setError('网络错误');
    }
    setInviting(false);
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/projects/${projectId}/shares/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      fetchMembers();
    } catch {
      setError('修改角色失败');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('确定移除该成员？')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/projects/${projectId}/shares/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMembers();
    } catch {
      setError('移除成员失败');
    }
  };

  const roleConfig = {
    owner: { label: '所有者', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    admin: { label: '管理员', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    member: { label: '成员', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    viewer: { label: '只读', icon: Eye, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[500px] max-h-[80vh] bg-[var(--bg-primary)] rounded-2xl shadow-2xl border border-[var(--border-light)] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users size={16} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">项目共享</h2>
              <p className="text-xs text-[var(--text-tertiary)]">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
            <X size={16} />
          </button>
        </div>

        {/* 邀请区 */}
        <div className="px-6 py-4 border-b border-[var(--border-light)]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                placeholder="输入邮箱邀请成员..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] text-sm text-[var(--text-secondary)] focus:outline-none"
            >
              <option value="member">成员</option>
              <option value="admin">管理员</option>
              <option value="viewer">只读</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {inviting ? <Loader2 size={14} className="animate-spin" /> : '邀请'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          {success && <p className="text-xs text-green-500 mt-2">{success}</p>}
        </div>

        {/* 成员列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-xs font-medium text-[var(--text-tertiary)] mb-3">成员 ({members.length})</div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const rc = roleConfig[m.role as keyof typeof roleConfig] || roleConfig.member;
                const RoleIcon = rc.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
                    {/* 头像 */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {(m.name || m.email)[0].toUpperCase()}
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name || '未命名'}</div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate">{m.email}</div>
                    </div>
                    {/* 角色 */}
                    {m.role === 'owner' ? (
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${rc.bg} ${rc.color}`}>
                        <RoleIcon size={12} />
                        {rc.label}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-secondary)] focus:outline-none cursor-pointer"
                        >
                          <option value="admin">管理员</option>
                          <option value="member">成员</option>
                          <option value="viewer">只读</option>
                        </select>
                        <button
                          onClick={() => handleRemove(m.user_id)}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="移除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部说明 */}
        <div className="px-6 py-3 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1"><Crown size={11} className="text-amber-500" /> 所有者</span>
            <span className="flex items-center gap-1"><Shield size={11} className="text-purple-500" /> 可邀请</span>
            <span className="flex items-center gap-1"><User size={11} className="text-blue-500" /> 可编辑</span>
            <span className="flex items-center gap-1"><Eye size={11} className="text-gray-500" /> 只读</span>
          </div>
        </div>
      </div>
    </div>
  );
}

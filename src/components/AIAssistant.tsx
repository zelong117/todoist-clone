import { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import type { Task } from '../types';
import { isToday, isBefore, startOfDay, format, parseISO, differenceInDays } from 'date-fns';
import { Sparkles, ChevronRight } from 'lucide-react';

interface Message {
  id: string;
  type: 'system' | 'suggestion' | 'insight' | 'action';
  icon: string;
  title: string;
  content: string;
  action?: { label: string; taskId?: string; view?: string };
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

function analyzeTasks(tasks: Task[]): Message[] {
  const messages: Message[] = [];
  const now = new Date();
  const today = startOfDay(now);

  const todayTasks = tasks.filter(t => {
    if (t.isCompleted || !t.dueDate) return false;
    try { return isToday(parseISO(t.dueDate)) || isBefore(parseISO(t.dueDate), today); } catch { return false; }
  });
  const overdueTasks = tasks.filter(t => {
    if (t.isCompleted || !t.dueDate) return false;
    try { return isBefore(parseISO(t.dueDate), today) && !isToday(parseISO(t.dueDate)); } catch { return false; }
  });
  const tomorrowTasks = tasks.filter(t => {
    if (t.isCompleted || !t.dueDate) return false;
    try { const d = parseISO(t.dueDate); return !isToday(d) && differenceInDays(d, today) === 1; } catch { return false; }
  });
  const completedToday = tasks.filter(t => {
    if (!t.isCompleted || !t.completedAt) return false;
    try { return isToday(parseISO(t.completedAt)); } catch { return false; }
  });
  const totalPending = tasks.filter(t => !t.isCompleted).length;
  const totalCompleted = tasks.filter(t => t.isCompleted).length;
  const rate = totalPending + totalCompleted > 0 ? Math.round((totalCompleted / (totalPending + totalCompleted)) * 100) : 0;

  const hour = now.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  messages.push({
    id: 'daily',
    type: 'system',
    icon: '👋',
    title: `${greeting}！今日简报`,
    content: `今天有 **${todayTasks.length}** 个待办${overdueTasks.length > 0 ? `，**${overdueTasks.length}** 个已过期` : ''}。已完成 **${completedToday.length}** 个。完成率 **${rate}%**。`,
    priority: 'high',
    timestamp: format(now, 'HH:mm'),
  });

  if (overdueTasks.length > 0) {
    const top3 = [...overdueTasks].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).slice(0, 3);
    messages.push({
      id: 'overdue',
      type: 'action',
      icon: '🚨',
      title: `${overdueTasks.length} 个任务已过期`,
      content: top3.map(t => `• ${t.title}（P${t.priority}）`).join('\n') + (overdueTasks.length > 3 ? `\n...还有 ${overdueTasks.length - 3} 个` : ''),
      action: { label: '查看过期任务', view: 'today' },
      priority: 'high',
      timestamp: format(now, 'HH:mm'),
    });
  }

  if (todayTasks.length > 0) {
    const p1 = todayTasks.filter(t => t.priority === 1);
    const p2 = todayTasks.filter(t => t.priority === 2);
    const best = p1[0] || p2[0] || todayTasks[0];
    messages.push({
      id: 'next',
      type: 'suggestion',
      icon: '🎯',
      title: '建议下一步',
      content: `推荐先做 **「${best.title}」**${best.plannedPomodoros > 0 ? `（约 ${best.plannedPomodoros * 25} 分钟）` : ''}。${p1.length > 0 ? 'P1 紧急任务，优先处理！' : '当前优先级最高。'}`,
      action: { label: '开始这个任务', taskId: best.id },
      priority: 'high',
      timestamp: format(now, 'HH:mm'),
    });
  }

  const pomodoros = tasks.reduce((s, t) => s + (t.completedPomodoros || 0), 0);
  if (completedToday.length > 0 || pomodoros > 0) {
    messages.push({
      id: 'stats',
      type: 'insight',
      icon: '📊',
      title: '效率洞察',
      content: `今日完成 ${completedToday.length} 个任务` + (pomodoros > 0 ? `，${pomodoros} 个番茄钟` : '') + (rate >= 80 ? '。效率很高！💪' : rate >= 50 ? '。继续加油！' : '。建议先处理紧急任务。'),
      priority: 'medium',
      timestamp: format(now, 'HH:mm'),
    });
  }

  if (tomorrowTasks.length > 0) {
    messages.push({
      id: 'tomorrow',
      type: 'insight',
      icon: '📅',
      title: '明天预告',
      content: `明天有 **${tomorrowTasks.length}** 个任务：\n${tomorrowTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n')}${tomorrowTasks.length > 3 ? `\n...共 ${tomorrowTasks.length} 个` : ''}`,
      priority: 'medium',
      timestamp: format(now, 'HH:mm'),
    });
  }

  if (todayTasks.length >= 3) {
    messages.push({
      id: 'focus',
      type: 'suggestion',
      icon: '🧠',
      title: '专注建议',
      content: todayTasks.filter(t => t.priority <= 2).length >= 3
        ? '今天有多个高优任务，建议用番茄钟逐个攻克。'
        : '任务不少，建议用番茄钟分段完成。',
      action: { label: '查看今天任务', view: 'today' },
      priority: 'low',
      timestamp: format(now, 'HH:mm'),
    });
  }

  if (todayTasks.length === 0 && totalPending === 0) {
    messages.push({
      id: 'done',
      type: 'system',
      icon: '🎉',
      title: '全部完成！',
      content: '所有任务都已完成，太棒了！可以休息一下。',
      priority: 'low',
      timestamp: format(now, 'HH:mm'),
    });
  }

  if (totalPending > 10) {
    messages.push({
      id: 'backlog',
      type: 'insight',
      icon: '📋',
      title: '任务积压提醒',
      content: `还有 **${totalPending}** 个未完成任务，建议每周回顾清理。`,
      priority: 'medium',
      timestamp: format(now, 'HH:mm'),
    });
  }

  return messages;
}

export default function AIAssistant() {
  const tasks = useStore(s => s.tasks);
  const setSelectedTaskId = useStore(s => s.setSelectedTaskId);
  const setActiveView = useStore(s => s.setActiveView);

  // Use localStorage to persist collapsed state across renders
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ai-collapsed') !== 'false'; } catch { return true; }
  });
  const [expandedMsgs, setExpandedMsgs] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('ai-collapsed', String(collapsed));
  }, [collapsed]);

  // Auto-collapse on narrow screens
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 1024 && !collapsed) {
        setCollapsed(true);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [collapsed]);

  useEffect(() => {
    const open = () => setCollapsed(false);
    window.addEventListener('open-ai-assistant', open);
    return () => window.removeEventListener('open-ai-assistant', open);
  }, []);

  const messages = useMemo(() => analyzeTasks(tasks), [tasks]);

  const toggleMsg = useCallback((id: string) => {
    setExpandedMsgs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAction = useCallback((msg: Message) => {
    if (msg.action?.taskId) setSelectedTaskId(msg.action.taskId);
    else if (msg.action?.view) setActiveView(msg.action.view as any);
  }, [setSelectedTaskId, setActiveView]);

  const pColors = { high: 'border-l-red-500 bg-red-500/5', medium: 'border-l-amber-500 bg-amber-500/5', low: 'border-l-blue-500 bg-blue-500/5' };

  if (collapsed) return null;

  // Expanded: side panel
  return (
    <div style={{ width: 340, minWidth: 280, flexShrink: 0 }} className="border-l border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">AI 助手</h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">智能任务分析</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
          title="收起"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl border-l-4 p-3 cursor-pointer transition-all hover:shadow-sm ${pColors[msg.priority]}`}
            onClick={() => toggleMsg(msg.id)}
          >
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0 mt-0.5">{msg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{msg.title}</h4>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-2">{msg.timestamp}</span>
                </div>
                <div className={`text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-line leading-relaxed ${expandedMsgs.has(msg.id) ? '' : 'line-clamp-2'}`}>
                  {msg.content.split('**').map((part, i) =>
                    i % 2 === 1 ? <strong key={i} className="text-[var(--text-primary)]">{part}</strong> : part
                  )}
                </div>
                {msg.action && expandedMsgs.has(msg.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAction(msg); }}
                    className="mt-2 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-[11px] font-medium rounded-lg transition-colors"
                  >
                    {msg.action.label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
          <Sparkles size={10} className="text-indigo-500" />
          <span>基于你的任务数据实时分析</span>
        </div>
      </div>
    </div>
  );
}

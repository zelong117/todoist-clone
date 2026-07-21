import { useEffect, useRef, useState } from 'react';
import { Calendar, Flag, Tags, X } from 'lucide-react';
import { useStore } from '../store';
import { showTaskOperationError } from '../utils';

interface Props { projectId?: string; sectionId: string | null; onClose: () => void }

export default function SectionQuickAdd({ projectId, sectionId, onClose }: Props) {
  const addTask = useStore((state) => state.addTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [labelText, setLabelText] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addTask({
        title: title.trim(), description: description.trim(), projectId: projectId || null,
        sectionId, parentId: null, priority,
        labels: labelText.split(',').map((label) => label.trim()).filter(Boolean),
        dueDate: dueDate || null, isRecurring: false, recurrenceRule: null,
        isCompleted: false, completedAt: null, pomodoroCount: 0, plannedPomodoros: 0,
        completedPomodoros: 0, estimatedMinutes: 0, order: 0,
      });
      onClose();
    } catch (error) {
      showTaskOperationError(error);
      setSaving(false);
    }
  };

  return (
    <div className="mx-2.5 mt-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-sm">
      <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } if (e.key === 'Escape') onClose(); }}
        placeholder="任务名称" aria-label="任务名称"
        className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述" rows={2}
        className="mt-2 w-full resize-none bg-transparent text-sm text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)]" />
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border-color)] pt-2">
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]"><Calendar size={14} /><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-transparent outline-none" /></label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]"><Flag size={14} /><select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4)} className="bg-transparent outline-none"><option value={4}>P4</option><option value={3}>P3</option><option value={2}>P2</option><option value={1}>P1</option></select></label>
        <label className="flex min-w-32 flex-1 items-center gap-1.5 text-xs text-[var(--text-tertiary)]"><Tags size={14} /><input value={labelText} onChange={(e) => setLabelText(e.target.value)} placeholder="标签，用逗号分隔" className="min-w-0 flex-1 bg-transparent outline-none" /></label>
        <button onClick={onClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="取消"><X size={16} /></button>
        <button onClick={() => void submit()} disabled={!title.trim() || saving}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? '添加中...' : '添加任务'}</button>
      </div>
    </div>
  );
}

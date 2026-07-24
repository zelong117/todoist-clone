import { Inbox, CalendarDays, FolderOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  type: 'inbox' | 'today' | 'upcoming' | 'project' | 'search' | 'filter';
  onAction?: () => void;
}

const CONFIG = {
  inbox: {
    icon: Inbox,
    title: '收件箱是空的',
    description: '所有未分类的任务都会出现在这里。创建第一个任务开始使用吧！',
    actionText: '创建任务',
  },
  today: {
    icon: CalendarDays,
    title: '今天没有待办',
    description: '太棒了！今天没有需要处理的任务。享受你的自由时兏吧 ☀️',
    actionText: null,
  },
  upcoming: {
    icon: CalendarDays,
    title: '没有即将到来的任务',
    description: '未来 7 天内没有截止的任务。保持这种节奏！',
    actionText: null,
  },
  project: {
    icon: FolderOpen,
    title: '这个项目还没有任务',
    description: '添加第一个任务来启动这个项目。',
    actionText: '添加任务',
  },
  search: {
    icon: Inbox,
    title: '没有找到匹配的任务',
    description: '试试其他关键词，或者检查拼写。',
    actionText: null,
  },
  filter: {
    icon: Inbox,
    title: '没有匹配过滤条件的任务',
    description: '调整过滤条件或创建新任务。',
    actionText: null,
  },
};

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center mb-6">
        <Icon size={36} className="text-[var(--text-tertiary)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{config.title}</h3>
      <p className="text-sm text-[var(--text-tertiary)] max-w-sm mb-6">{config.description}</p>
      {config.actionText && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus size={16} />
          {config.actionText}
        </button>
      )}
    </div>
  );
}

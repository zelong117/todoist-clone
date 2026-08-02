import { Bell, CalendarDays, Inbox, Plus, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onQuickAdd: () => void;
}

const items = [
  { id: 'inbox', label: '收件箱', icon: Inbox },
  { id: 'today', label: '今天', icon: CalendarDays },
  { id: 'notifications', label: '通知', icon: Bell },
  { id: 'settings', label: '设置', icon: Settings },
] as const;

export default function MobileBottomNav({ currentView, onViewChange, onQuickAdd }: MobileBottomNavProps) {
  return (
    <nav className="taskflow-mobile-nav md:hidden" aria-label="移动端主导航">
      {items.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const selected = currentView === item.id;
        return <button key={item.id} type="button" onClick={() => onViewChange(item.id)} className={selected ? 'is-selected' : ''} aria-label={item.label} title={item.label} aria-current={selected ? 'page' : undefined}>
          <Icon size={20} />
          <span>{item.label}</span>
        </button>;
      })}
      <button type="button" className="taskflow-mobile-nav-add" onClick={onQuickAdd} aria-label="添加任务" title="添加任务">
        <Plus size={22} strokeWidth={2.5} />
      </button>
      {items.slice(2).map((item) => {
        const Icon = item.icon;
        const selected = currentView === item.id;
        return <button key={item.id} type="button" onClick={() => onViewChange(item.id)} className={selected ? 'is-selected' : ''} aria-label={item.label} title={item.label} aria-current={selected ? 'page' : undefined}>
          <Icon size={20} />
          <span>{item.label}</span>
        </button>;
      })}
    </nav>
  );
}

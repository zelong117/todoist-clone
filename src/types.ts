export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  sectionId: string | null;
  parentId: string | null;
  priority: 1 | 2 | 3 | 4;
  labels: string[];
  dueDate: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  pomodoroCount: number;
  plannedPomodoros: number;
  completedPomodoros: number;
  estimatedMinutes: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  order: number;
  isFavorite: boolean;
  usePomodoro: boolean; // 鏄惁浣跨敤鐣寗閽?
  createdAt: string;
}

export interface Section {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
}
export interface FilterDefinition {
  id: string;
  name: string;
  description: string;
  query: string;
  order: number;
  isBuiltIn: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_deleted' | 'comment_added';
  entityType: 'task' | 'comment';
  entityId: string;
  message: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'overdue' | 'due_today' | 'high_priority' | 'inbox_triage';
  severity: 'info' | 'warning' | 'critical';
  taskId: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface StatsSnapshot {
  loggedAt: string;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  upcomingTasks: number;
  inboxTasks: number;
  unlabeledTasks: number;
  highPriorityTasks: number;
}

export type ViewMode = 'list' | 'board' | 'calendar';

export type ActiveView = 'inbox' | 'today' | 'upcoming' | 'project' | 'label' | 'filter';

// ===== Pomodoro Timer =====
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
  focusMinutes: number; // default 25
  shortBreakMinutes: number; // default 5
  longBreakMinutes: number; // default 15
  longBreakInterval: number; // every 4 pomodoros
  autoStartBreak: boolean;
  autoStartPomodoro: boolean;
}

export interface PomodoroSession {
  id: string;
  taskId: string;
  mode: TimerMode;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  completed: boolean;
}


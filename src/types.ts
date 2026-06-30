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

export type ViewMode = 'list' | 'board' | 'calendar';

export type ActiveView = 'inbox' | 'today' | 'upcoming' | 'project' | 'label' | 'filter';

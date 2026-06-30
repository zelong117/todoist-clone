import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isToday, parseISO, isBefore, startOfDay, addDays } from 'date-fns';
import type { Task, Project, Section, Label, Comment, ViewMode, ActiveView } from './types';
import { generateId } from './utils';
import { seedTasks, seedProjects, seedSections, seedLabels, seedComments } from './data/seed';

// Helper to load from localStorage or use seed data
function loadState<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return fallback;
}

interface AppState {
  // Data
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  labels: Label[];
  comments: Comment[];

  // UI state
  activeView: ActiveView;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
  searchQuery: string;
  darkMode: boolean;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  reorderTasks: (taskIds: string[]) => void;

  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (projectIds: string[]) => void;

  // Section actions
  addSection: (section: Omit<Section, 'id'>) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;

  // Label actions
  addLabel: (label: Omit<Label, 'id'>) => void;
  updateLabel: (id: string, updates: Partial<Label>) => void;
  deleteLabel: (id: string) => void;

  // Comment actions
  addComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  deleteComment: (id: string) => void;

  // UI actions
  setActiveView: (view: ActiveView) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;

  // Computed getters
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getInboxTasks: () => Task[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByLabel: (labelName: string) => Task[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial data (loaded from localStorage or seed)
      tasks: loadState('todoist-tasks', seedTasks),
      projects: loadState('todoist-projects', seedProjects),
      sections: loadState('todoist-sections', seedSections),
      labels: loadState('todoist-labels', seedLabels),
      comments: loadState('todoist-comments', seedComments),

      // UI state
      activeView: 'inbox',
      selectedProjectId: null,
      selectedTaskId: null,
      viewMode: 'list',
      sidebarCollapsed: false,
      searchQuery: '',
      darkMode: false,

      // ===== Task actions =====
      addTask: (taskData) => {
        const now = new Date().toISOString();
        const task: Task = {
          ...taskData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
          comments: state.comments.filter((c) => c.taskId !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        }));
      },

      toggleComplete: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  isCompleted: !t.isCompleted,
                  completedAt: !t.isCompleted ? new Date().toISOString() : null,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      reorderTasks: (taskIds) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            const index = taskIds.indexOf(t.id);
            if (index !== -1) {
              return { ...t, order: index, updatedAt: new Date().toISOString() };
            }
            return t;
          }),
        }));
      },

      // ===== Project actions =====
      addProject: (projectData) => {
        const project: Project = {
          ...projectData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ projects: [...state.projects, project] }));
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          sections: state.sections.filter((s) => s.projectId !== id),
          tasks: state.tasks.map((t) =>
            t.projectId === id ? { ...t, projectId: null } : t
          ),
          selectedProjectId:
            state.selectedProjectId === id ? null : state.selectedProjectId,
        }));
      },

      reorderProjects: (projectIds) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            const index = projectIds.indexOf(p.id);
            return index !== -1 ? { ...p, order: index } : p;
          }),
        }));
      },

      // ===== Section actions =====
      addSection: (sectionData) => {
        const section: Section = {
          ...sectionData,
          id: generateId(),
        };
        set((state) => ({ sections: [...state.sections, section] }));
      },

      updateSection: (id, updates) => {
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteSection: (id) => {
        set((state) => ({
          sections: state.sections.filter((s) => s.id !== id),
          tasks: state.tasks.map((t) =>
            t.sectionId === id ? { ...t, sectionId: null } : t
          ),
        }));
      },

      // ===== Label actions =====
      addLabel: (labelData) => {
        const label: Label = {
          ...labelData,
          id: generateId(),
        };
        set((state) => ({ labels: [...state.labels, label] }));
      },

      updateLabel: (id, updates) => {
        set((state) => ({
          labels: state.labels.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        }));
      },

      deleteLabel: (id) => {
        const label = get().labels.find((l) => l.id === id);
        if (!label) return;
        set((state) => ({
          labels: state.labels.filter((l) => l.id !== id),
          tasks: state.tasks.map((t) => ({
            ...t,
            labels: t.labels.filter((l) => l !== label.name),
          })),
        }));
      },

      // ===== Comment actions =====
      addComment: (commentData) => {
        const comment: Comment = {
          ...commentData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ comments: [...state.comments, comment] }));
      },

      deleteComment: (id) => {
        set((state) => ({
          comments: state.comments.filter((c) => c.id !== id),
        }));
      },

      // ===== UI actions =====
      setActiveView: (view) => set({ activeView: view }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),

      // ===== Computed getters =====
      getTodayTasks: () => {
        const today = startOfDay(new Date());
        return get()
          .tasks.filter((t) => {
            if (t.isCompleted || !t.dueDate) return false;
            try {
              const due = startOfDay(parseISO(t.dueDate));
              return (
                isToday(due) ||
                isBefore(due, today)
              );
            } catch {
              return false;
            }
          })
          .sort((a, b) => a.order - b.order);
      },

      getUpcomingTasks: () => {
        const today = startOfDay(new Date());
        const nextWeek = addDays(today, 7);
        return get()
          .tasks.filter((t) => {
            if (t.isCompleted || !t.dueDate) return false;
            try {
              const due = startOfDay(parseISO(t.dueDate));
              return (
                !isToday(due) &&
                !isBefore(due, today) &&
                isBefore(due, nextWeek)
              );
            } catch {
              return false;
            }
          })
          .sort((a, b) => {
            if (!a.dueDate || !b.dueDate) return 0;
            return a.dueDate.localeCompare(b.dueDate);
          });
      },

      getInboxTasks: () => {
        return get()
          .tasks.filter((t) => !t.isCompleted && t.projectId === null)
          .sort((a, b) => a.order - b.order);
      },

      getTasksByProject: (projectId) => {
        return get()
          .tasks.filter((t) => t.projectId === projectId)
          .sort((a, b) => a.order - b.order);
      },

      getTasksByLabel: (labelName) => {
        return get()
          .tasks.filter(
            (t) => !t.isCompleted && t.labels.includes(labelName)
          )
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'todoist-clone-storage',
      // Only persist data, not UI state
      partialize: (state) => ({
        tasks: state.tasks,
        projects: state.projects,
        sections: state.sections,
        labels: state.labels,
        comments: state.comments,
      }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isToday, parseISO, isBefore, startOfDay, addDays } from 'date-fns';
import type { Task, Project, Section, Label, Comment, ViewMode, ActiveView, TimerMode, TimerStatus, PomodoroSettings, PomodoroSession } from './types';
import { generateId } from './utils';
import { parseRecurrenceRule, getNextDueDate } from './lib/recurrence';
import { tasksAPI, projectsAPI, labelsAPI, sectionsAPI } from './api';

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

  // Pomodoro state
  timerMode: TimerMode;
  timerStatus: TimerStatus;
  timerSeconds: number;
  timerStartedAt: string | null;
  activeTimerTaskId: string | null;
  completedPomodoros: number;
  pomodoroSettings: PomodoroSettings;
  pomodoroSessions: PomodoroSession[];

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  reorderTasks: (taskIds: string[]) => void;

  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projectIds: string[]) => void;

  // Section actions
  addSection: (section: Omit<Section, 'id'>) => Promise<void>;
  updateSection: (id: string, updates: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  fetchSections: () => Promise<void>;
  fetchData: () => Promise<void>;

  // Label actions
  addLabel: (label: Omit<Label, 'id'>) => Promise<void>;
  updateLabel: (id: string, updates: Partial<Label>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;

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

  // Pomodoro actions
  startTimer: (taskId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  skipToBreak: () => void;
  skipToFocus: () => void;
  tick: () => void;
  completePomodoro: () => void;
  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => void;

  // Computed getters
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getInboxTasks: () => Task[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByLabel: (labelName: string) => Task[];

  // Reset (logout)
  resetStore: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial data (hydrated by Zustand persist middleware)
      tasks: [],
      projects: [],
      sections: [],
      labels: [],
      comments: [],

      // UI state
      activeView: 'inbox',
      selectedProjectId: null,
      selectedTaskId: null,
      viewMode: 'list',
      sidebarCollapsed: false,
      searchQuery: '',
      darkMode: false,

      // Pomodoro state
      timerMode: 'focus',
      timerStatus: 'idle',
      timerSeconds: 25 * 60,
      timerStartedAt: null,
      activeTimerTaskId: null,
      completedPomodoros: 0,
      pomodoroSettings: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreak: false,
        autoStartPomodoro: false,
      },
      pomodoroSessions: [],

      // ===== Task actions =====
      addTask: async (taskData) => {
        const apiTask = await tasksAPI.create({
          title: taskData.title,
          description: taskData.description,
          projectId: taskData.projectId,
          sectionId: taskData.sectionId,
          parentId: taskData.parentId,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          labels: taskData.labels,
          plannedPomodoros: taskData.plannedPomodoros,
        });
        const task: Task = {
          ...apiTask,
          description: apiTask.description || '',
          order: apiTask.order ?? apiTask.sortOrder ?? 0,
          isRecurring: apiTask.isRecurring ?? false,
          recurrenceRule: apiTask.recurrenceRule ?? null,
          pomodoroCount: apiTask.pomodoroCount ?? 0,
          estimatedMinutes: apiTask.estimatedMinutes ?? (apiTask.plannedPomodoros ?? 1) * 25,
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
      },

      updateTask: async (id, updates) => {
        await tasksAPI.update(id, updates);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTask: async (id) => {
        await tasksAPI.delete(id);
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
          comments: state.comments.filter((c) => c.taskId !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        }));
      },

      toggleComplete: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        await tasksAPI.complete(id);

        // 如果是循环任务且正在被完成（不是取消完成），生成下一个周期任务
        let nextRecurrenceTask = null;
        if (!task.isCompleted && task.isRecurring && task.recurrenceRule) {
          try {
            const rule = parseRecurrenceRule(task.recurrenceRule);
            if (rule) {
              const completedDate = new Date();
              const nextDue = getNextDueDate(rule, completedDate, task.dueDate ? new Date(task.dueDate) : null);
              if (nextDue) {
                nextRecurrenceTask = {
                  ...task,
                  id: crypto.randomUUID(),
                  title: task.title,
                  isCompleted: false,
                  completedAt: null,
                  dueDate: nextDue.toISOString().split('T')[0],
                  pomodoroCount: 0,
                  completedPomodoros: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          } catch (e) {
            console.error('Failed to generate next recurrence:', e);
          }
        }

        set((state) => ({
          tasks: [
            ...state.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    isCompleted: !t.isCompleted,
                    completedAt: !t.isCompleted ? new Date().toISOString() : null,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
            ...(nextRecurrenceTask ? [nextRecurrenceTask] : []),
          ],
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
      addProject: async (projectData) => {
        try {
          const apiProject = await projectsAPI.create({
            name: projectData.name,
            color: projectData.color,
            usePomodoro: projectData.usePomodoro,
          });
          const project: Project = {
            ...apiProject,
            isFavorite: apiProject.isFavorite ?? false,
          };
          set((state) => ({ projects: [...state.projects, project] }));
        } catch (error) {
          console.error('Failed to create project:', error);
          throw error;
        }
      },

      updateProject: async (id, updates) => {
        try {
          await projectsAPI.update(id, updates);
        } catch (error) {
          console.error('Failed to update project:', error);
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProject: async (id) => {
        try {
          await projectsAPI.delete(id);
        } catch (error) {
          console.error('Failed to delete project:', error);
        }
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
      addSection: async (sectionData) => {
        try {
          const apiSection = await sectionsAPI.create({
            projectId: sectionData.projectId,
            name: sectionData.name,
            order: sectionData.order,
          });
          const section: Section = { ...apiSection };
          set((state) => ({ sections: [...state.sections, section] }));
        } catch (error) {
          console.error('Failed to create section:', error);
          throw error;
        }
      },

      updateSection: async (id, updates) => {
        try {
          await sectionsAPI.update(id, updates);
        } catch (error) {
          console.error('Failed to update section:', error);
        }
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteSection: async (id) => {
        try {
          await sectionsAPI.delete(id);
        } catch (error) {
          console.error('Failed to delete section:', error);
        }
        set((state) => ({
          sections: state.sections.filter((s) => s.id !== id),
          tasks: state.tasks.map((t) =>
            t.sectionId === id ? { ...t, sectionId: null } : t
          ),
        }));
      },

      fetchSections: async () => {
        try {
          const apiSections = await sectionsAPI.getAll();
          set({ sections: apiSections.map((s: any) => ({
            id: s.id,
            projectId: s.projectId,
            name: s.name,
            order: s.order || 0,
          })) });
        } catch (error) {
          console.error('Failed to fetch sections:', error);
        }
      },

      fetchData: async () => {
        const [apiTasks, apiProjects, apiSections, apiLabels] = await Promise.all([
          tasksAPI.getAll(), projectsAPI.getAll(), sectionsAPI.getAll(), labelsAPI.getAll(),
        ]);
        const serverTasks = apiTasks.map((task: any) => ({
            ...task,
            description: task.description || '',
            labels: Array.isArray(task.labels) ? task.labels : [],
            order: task.order ?? task.sortOrder ?? 0,
            isRecurring: task.isRecurring ?? false,
            recurrenceRule: task.recurrenceRule ?? null,
            pomodoroCount: task.pomodoroCount ?? 0,
            plannedPomodoros: task.plannedPomodoros ?? 0,
            completedPomodoros: task.completedPomodoros ?? 0,
            estimatedMinutes: task.estimatedMinutes ?? 0,
          }));
        const serverProjects = apiProjects.map((project: any) => ({
            ...project,
            order: project.order ?? project.sortOrder ?? 0,
            isFavorite: project.isFavorite ?? false,
            usePomodoro: project.usePomodoro ?? false,
          }));
        const serverSections = apiSections.map((section: any) => ({ ...section, order: section.order ?? section.sortOrder ?? 0 }));
        // 服务器是唯一事实来源，直接覆盖本地数据（Sprint 0 原则）
        set({
          tasks: serverTasks,
          projects: serverProjects,
          sections: serverSections,
          labels: apiLabels.map((l: any) => ({ ...l, order: l.order ?? 0 })),
        });
      },

      // ===== Label actions =====
      addLabel: async (labelData) => {
        try {
          const apiLabel = await labelsAPI.create({
            name: labelData.name,
            color: labelData.color,
          });
          const label: Label = {
            ...apiLabel,
          };
          set((state) => ({ labels: [...state.labels, label] }));
        } catch (error) {
          console.error('Failed to create label:', error);
          throw error;
        }
      },

      updateLabel: async (id, updates) => {
        try {
          await labelsAPI.update(id, updates);
        } catch (error) {
          console.error('Failed to update label:', error);
        }
        set((state) => ({
          labels: state.labels.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        }));
      },

      deleteLabel: async (id) => {
        try {
          await labelsAPI.delete(id);
        } catch (error) {
          console.error('Failed to delete label:', error);
        }
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

      // ===== Pomodoro actions =====
      startTimer: (taskId) => {
        const settings = get().pomodoroSettings;
        set({
          activeTimerTaskId: taskId,
          timerMode: 'focus',
          timerStatus: 'running',
          timerSeconds: settings.focusMinutes * 60,
          timerStartedAt: new Date().toISOString(),
        });
      },

      pauseTimer: () => {
        set({ timerStatus: 'paused', timerStartedAt: null });
      },

      resumeTimer: () => {
        set({ timerStatus: 'running', timerStartedAt: new Date().toISOString() });
      },

      stopTimer: () => {
        const { activeTimerTaskId, timerMode, timerSeconds, pomodoroSettings } = get();
        if (activeTimerTaskId) {
          const totalSeconds =
            timerMode === 'focus'
              ? pomodoroSettings.focusMinutes * 60
              : timerMode === 'shortBreak'
              ? pomodoroSettings.shortBreakMinutes * 60
              : pomodoroSettings.longBreakMinutes * 60;
          const elapsed = totalSeconds - timerSeconds;
          if (elapsed > 0) {
            const session: PomodoroSession = {
              id: generateId(),
              taskId: activeTimerTaskId,
              mode: timerMode,
              startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
              endedAt: new Date().toISOString(),
              durationMinutes: Math.round((elapsed / 60) * 100) / 100,
              completed: false,
            };
            set((state) => ({
              pomodoroSessions: [...state.pomodoroSessions, session],
            }));
          }
        }
        set({
          timerMode: 'focus',
          timerStatus: 'idle',
          timerSeconds: get().pomodoroSettings.focusMinutes * 60,
          timerStartedAt: null,
          activeTimerTaskId: null,
        });
      },

      skipToBreak: () => {
        const { completedPomodoros, pomodoroSettings } = get();
        const isLong = (completedPomodoros + 1) % pomodoroSettings.longBreakInterval === 0;
        const breakSeconds = isLong
          ? pomodoroSettings.longBreakMinutes * 60
          : pomodoroSettings.shortBreakMinutes * 60;
        set({
          timerMode: isLong ? 'longBreak' : 'shortBreak',
          timerStatus: 'running',
          timerSeconds: breakSeconds,
        });
      },

      skipToFocus: () => {
        set({
          timerMode: 'focus',
          timerStatus: 'running',
          timerSeconds: get().pomodoroSettings.focusMinutes * 60,
        });
      },

      tick: () => {
        const { timerSeconds, timerStatus, timerStartedAt } = get();
        if (timerStatus !== 'running') return;

        let currentSeconds = timerSeconds;
        if (timerStartedAt) {
          // 基于时间戳计算真实剩余时间
          const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
          currentSeconds = Math.max(0, timerSeconds - elapsed);
        }

        if (currentSeconds <= 0) {
          // 时间到：先停止计时器，再完成
          set({ timerSeconds: 0, timerStartedAt: null });
          get().completePomodoro();
        } else {
          set({ timerSeconds: currentSeconds, timerStartedAt: new Date().toISOString() });
        }
      },

      completePomodoro: () => {
        const { activeTimerTaskId, timerMode, pomodoroSettings, completedPomodoros } = get();
        const totalSeconds =
          timerMode === 'focus'
            ? pomodoroSettings.focusMinutes * 60
            : timerMode === 'shortBreak'
            ? pomodoroSettings.shortBreakMinutes * 60
            : pomodoroSettings.longBreakMinutes * 60;

        if (activeTimerTaskId) {
          const session: PomodoroSession = {
            id: generateId(),
            taskId: activeTimerTaskId,
            mode: timerMode,
            startedAt: new Date(Date.now() - totalSeconds * 1000).toISOString(),
            endedAt: new Date().toISOString(),
            durationMinutes:
              timerMode === 'focus'
                ? pomodoroSettings.focusMinutes
                : timerMode === 'shortBreak'
                ? pomodoroSettings.shortBreakMinutes
                : pomodoroSettings.longBreakMinutes,
            completed: true,
          };
          set((state) => ({
            pomodoroSessions: [...state.pomodoroSessions, session],
          }));
        }

        if (timerMode === 'focus') {
          const newCount = completedPomodoros + 1;
          const isLong = newCount % pomodoroSettings.longBreakInterval === 0;
          const nextMode = isLong ? 'longBreak' : 'shortBreak';
          const nextSeconds = isLong
            ? pomodoroSettings.longBreakMinutes * 60
            : pomodoroSettings.shortBreakMinutes * 60;
          set({
            completedPomodoros: newCount,
            timerMode: nextMode,
            timerSeconds: nextSeconds,
            timerStatus: pomodoroSettings.autoStartBreak ? 'running' : 'idle',
            timerStartedAt: pomodoroSettings.autoStartBreak ? new Date().toISOString() : null,
          });
          // Increment pomodoro count on the active task
          if (activeTimerTaskId) {
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === activeTimerTaskId
                  ? { ...t, pomodoroCount: (t.pomodoroCount || 0) + 1, updatedAt: new Date().toISOString() }
                  : t
              ),
            }));
            // Also update planned/completed pomodoro counts on the task
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === activeTimerTaskId
                  ? { ...t, completedPomodoros: t.completedPomodoros + 1, updatedAt: new Date().toISOString() }
                  : t
              ),
            }));
          }
        } else {
          set({
            timerMode: 'focus',
            timerSeconds: pomodoroSettings.focusMinutes * 60,
            timerStatus: pomodoroSettings.autoStartPomodoro ? 'running' : 'idle',
          });
        }
      },

      updatePomodoroSettings: (settings) => {
        set((state) => ({
          pomodoroSettings: { ...state.pomodoroSettings, ...settings },
        }));
      },

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

      resetStore: () => {
        set({
          tasks: [],
          projects: [],
          sections: [],
          labels: [],
          comments: [],
          activeView: 'inbox',
          selectedProjectId: null,
          selectedTaskId: null,
          searchQuery: '',
        });
      },
    }),
    {
      name: 'todoist-clone-storage',
      version: 3,  // bump this to force reset localStorage
      // Persist data + UI preferences
      partialize: (state) => ({
        tasks: state.tasks,
        projects: state.projects,
        sections: state.sections,
        labels: state.labels,
        comments: state.comments,
        pomodoroSettings: state.pomodoroSettings,
        completedPomodoros: state.completedPomodoros,
        activeTimerTaskId: state.activeTimerTaskId,
        viewMode: state.viewMode,
        darkMode: state.darkMode,
      }),
    }
  )
);

import { enqueueMutation, flushQueuedMutations } from './lib/offlineQueue';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api`;

function getToken(): string | null {
  return localStorage.getItem('todoist_token');
}

const offlineTaskMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, options: RequestInit = {}, allowQueue = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    const method = (options.method || 'GET').toUpperCase();
    if (allowQueue && path.startsWith('/tasks') && offlineTaskMethods.has(method)) {
      const queuedHeaders = Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() === 'if-match-updated-at'));
      await enqueueMutation(path, method as 'POST' | 'PUT' | 'PATCH' | 'DELETE', typeof options.body === 'string' ? options.body : null, queuedHeaders);
      return { __offlineQueued: true } as T;
    }
    throw error;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new ApiRequestError(response.status, error, error.error || '请求失败');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Auth API
export const authAPI = {
  register: (data: { email: string; name: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<{ id: string; email: string; name: string }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  sessions: () => request<{ sessions: Array<{ id: string; deviceLabel: string; createdAt: string; lastSeenAt: string; current: boolean }> }>('/auth/sessions'),
  revokeSession: (sessionId: string) => request<{ success: boolean }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeOtherSessions: () => request<{ success: boolean }>('/auth/sessions/revoke-others', { method: 'POST' }),
};

// Tasks API
export const tasksAPI = {
  getAll: () => request<any[]>('/tasks'),
  create: (data: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any, updatedAt?: string) => request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: updatedAt ? { 'If-Match-Updated-At': updatedAt } : {} }),
  delete: (id: string, updatedAt?: string) => request<any>(`/tasks/${id}`, { method: 'DELETE', headers: updatedAt ? { 'If-Match-Updated-At': updatedAt } : {} }),
  complete: (id: string, updatedAt?: string) => request<any>(`/tasks/${id}/complete`, { method: 'POST', headers: updatedAt ? { 'If-Match-Updated-At': updatedAt } : {} }),
};

export async function flushTaskQueue(ownerId: string | null) {
  return flushQueuedMutations(ownerId, async (mutation) => {
    await request(mutation.path, { method: mutation.method, body: mutation.body, headers: mutation.headers || {} }, false);
  });
}

// Projects API
export const projectsAPI = {
  getAll: () => request<any[]>('/projects'),
  create: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),
};

// Sections API
export const sectionsAPI = {
  getAll: () => request<any[]>('/sections'),
  create: (data: any) => request<any>('/sections', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/sections/${id}`, { method: 'DELETE' }),
};

// Labels API
export const labelsAPI = {
  getAll: () => request<any[]>('/labels'),
  create: (data: any) => request<any>('/labels', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/labels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/labels/${id}`, { method: 'DELETE' }),
};

// Pomodoro API
export const pomodoroAPI = {
  getSessions: () => request<any[]>('/pomodoro/sessions'),
  start: (data: any) => request<any>('/pomodoro/start', { method: 'POST', body: JSON.stringify(data) }),
  stop: (data: any) => request<any>('/pomodoro/stop', { method: 'POST', body: JSON.stringify(data) }),
};

// Filters API
export const filtersAPI = {
  getAll: () => request<any[]>('/filters'),
  getTasks: (id: string) => request<any[]>(`/filters/${id}/tasks`),
  create: (data: any) => request<any>('/filters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/filters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/filters/${id}`, { method: 'DELETE' }),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => request<any[]>('/notifications'),
  unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request<any>('/notifications/read-all', { method: 'POST' }),
};

export interface BillingPlan {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  limits: { maxProjects: number; maxAiPerDay: number; hosted: boolean };
}

export interface SubscriptionSnapshot {
  plan: string;
  planExpiresAt: string | null;
  entitlement: { maxProjects: number; maxAiPerDay: number; hosted: boolean };
  subscription: {
    id: string;
    plan: string;
    status: string;
    source: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: number | boolean;
    grace_period_end?: string | null;
    failed_attempts?: number;
    last_payment_error?: string | null;
  } | null;
}

export const billingAPI = {
  plans: () => request<{ plans: BillingPlan[] }>('/billing/plans'),
  subscription: () => request<SubscriptionSnapshot>('/billing/subscription'),
  orders: () => request<{ data: Array<{ id: string; provider: string; plan: string; amount_cents: number; currency: string; status: string; processed_at: string | null; created_at: string }> }>('/billing/orders'),
};

export const aiAPI = {
  optimizeText: (text: string) => request<{ result: string; mode: 'ai' | 'local' }>('/ai/optimize-text', {
    method: 'POST', body: JSON.stringify({ text }),
  }),
  extractImage: (image: string) => request<{ result: string; mode?: 'ai' | 'blocked' }>('/ai/extract-image', {
    method: 'POST', body: JSON.stringify({ image }),
  }),
  extractTasks: (text: string, image: string | null) => request<{ tasks: Array<{ title?: string; priority?: string; dueDate?: string }>; mode: 'ai' | 'local' }>('/ai/extract-tasks', {
    method: 'POST', body: JSON.stringify({ text, image }),
  }),
  organize: (legacyContext: { tasks: unknown[]; projects: unknown[]; sections: unknown[] }) => request<{ result: string; mode: 'ai' | 'local' }>('/ai/organize', {
    // Older local servers required a snapshot. Current servers deliberately ignore it
    // and rebuild context from the authenticated user's database rows.
    method: 'POST', body: JSON.stringify(legacyContext),
  }),
};

export const adminAPI = {
  overview: () => request<any>('/admin/overview'),
  users: (page = 1, pageSize = 25) => request<any>(`/admin/users?page=${page}&pageSize=${pageSize}`),
  orders: (page = 1, pageSize = 25) => request<any>(`/admin/orders?page=${page}&pageSize=${pageSize}`),
  teams: (page = 1, pageSize = 25) => request<any>(`/admin/teams?page=${page}&pageSize=${pageSize}`),
  config: () => request<any>('/admin/config'),
  setFrozen: (userId: string, frozen: boolean, reason: string) => request<any>(`/admin/users/${userId}/freeze`, {
    method: 'POST', body: JSON.stringify({ frozen, reason }),
  }),
};

export const teamsAPI = {
  list: () => request<any[]>('/teams'),
  create: (name: string, description: string) => request<any>('/teams', { method: 'POST', body: JSON.stringify({ name, description }) }),
  members: (teamId: string) => request<any[]>(`/teams/${teamId}/members`),
  invite: (teamId: string, email: string, role: string) => request<any>(`/teams/${teamId}/invite`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  updateMember: (teamId: string, userId: string, role: string) => request<any>(`/teams/${teamId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (teamId: string, userId: string) => request<any>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  transferOwnership: (teamId: string, userId: string) => request<any>(`/teams/${teamId}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ userId }) }),
};

export const sharesAPI = {
  list: (projectId: string) => request<any[]>(`/projects/${projectId}/shares`),
  invite: (projectId: string, email: string, role: 'admin' | 'member' | 'viewer') => request<any>(`/projects/${projectId}/share`, {
    method: 'POST', body: JSON.stringify({ email, role }),
  }),
  updateRole: (projectId: string, userId: string, role: 'admin' | 'member' | 'viewer') => request<any>(`/projects/${projectId}/shares/${userId}`, {
    method: 'PUT', body: JSON.stringify({ role }),
  }),
  remove: (projectId: string, userId: string) => request<any>(`/projects/${projectId}/shares/${userId}`, { method: 'DELETE' }),
};

export const accountAPI = {
  exportData: () => request<any>('/users/me/export'),
  deleteAccount: (confirmationEmail: string, password: string) => request<{ success: boolean }>('/users/me', {
    method: 'DELETE', body: JSON.stringify({ confirmationEmail, password }),
  }),
};

// Insights API: activity log and statistics are intentionally separate.
export const insightsAPI = {
  activity: (limit = 100) => request<any[]>(`/insights/activity?limit=${limit}`),
  stats: () => request<any>('/insights/stats'),
};

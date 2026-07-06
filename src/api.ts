const API_URL = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('todoist_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '璇锋眰澶辫触' }));
    throw new Error(error.error || '璇锋眰澶辫触');
  }

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
};

// Tasks API
export const tasksAPI = {
  getAll: () => request<any[]>('/tasks'),
  create: (data: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),
  complete: (id: string) => request<any>(`/tasks/${id}/complete`, { method: 'POST' }),
};

// Projects API
export const projectsAPI = {
  getAll: () => request<any[]>('/projects'),
  create: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),
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

// Insights API: activity log and statistics are intentionally separate.
export const insightsAPI = {
  activity: (limit = 100) => request<any[]>(`/insights/activity?limit=${limit}`),
  stats: () => request<any>('/insights/stats'),
};

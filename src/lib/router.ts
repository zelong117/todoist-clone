export interface AppRoute {
  view: string;
  projectId: string | null;
  sectionId: string | null;
  taskId: string | null;
}

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function parseRoute(pathname: string): AppRoute {
  const parts = pathname.split('/').filter(Boolean).map(decode);

  if (parts[0] === 'admin') {
    return { view: 'admin', projectId: null, sectionId: null, taskId: null };
  }

  if (parts[0] === 'app' && parts[1] === 'project' && parts[2]) {
    const projectId = parts[2];
    if (parts[3] === 'task' && parts[4]) {
      return { view: `project-${projectId}`, projectId, sectionId: null, taskId: parts[4] };
    }
    if (parts[3] === 'section' && parts[4]) {
      return { view: `project-${projectId}`, projectId, sectionId: parts[4], taskId: null };
    }
    return { view: `project-${projectId}`, projectId, sectionId: null, taskId: null };
  }

  if (parts[0] === 'app' && parts[1] === 'inbox' && parts[2] === 'task' && parts[3]) {
    return { view: 'inbox', projectId: null, sectionId: null, taskId: parts[3] };
  }

  const view = parts[0] === 'app' && parts[1] ? parts[1] : 'inbox';
  const supported = new Set(['inbox', 'today', 'upcoming', 'filters', 'log', 'stats', 'settings']);
  return {
    view: supported.has(view) ? view : 'inbox',
    projectId: null,
    sectionId: null,
    taskId: null,
  };
}

export function pathForView(view: string, sectionId?: string | null): string {
  if (view === 'admin') return '/admin';
  if (view.startsWith('project-')) {
    const projectId = encodeURIComponent(view.slice('project-'.length));
    return sectionId
      ? `/app/project/${projectId}/section/${encodeURIComponent(sectionId)}`
      : `/app/project/${projectId}`;
  }
  const safeView = view === 'filter' ? 'filters' : view;
  return `/app/${encodeURIComponent(safeView)}`;
}

export function pathForTask(projectId: string | null, taskId: string): string {
  return projectId
    ? `/app/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
    : `/app/inbox/task/${encodeURIComponent(taskId)}`;
}

export interface QueuedMutation {
  id: string;
  ownerId: string | null;
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: string | null;
  headers: Record<string, string>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  status: 'pending' | 'conflict';
  conflictTask: unknown | null;
}

const DATABASE = 'taskflow-offline';
const STORE = 'mutations';
const CHANGE_EVENT = 'taskflow:offline-queue-change';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getCurrentQueueOwner(): string | null {
  const token = localStorage.getItem('todoist_token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).id || null;
  } catch {
    return null;
  }
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isOfflineQueued(value: unknown): value is { __offlineQueued: true } {
  return Boolean(value && typeof value === 'object' && '__offlineQueued' in value);
}

export async function enqueueMutation(path: string, method: QueuedMutation['method'], body: string | null, headers: Record<string, string> = {}) {
  const db = await openDatabase();
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    ownerId: getCurrentQueueOwner(),
    path,
    method,
    body,
    headers,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    status: 'pending',
    conflictTask: null,
  };
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(mutation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  notify();
  return mutation;
}

export async function listQueuedMutations(ownerId: string | null) {
  const db = await openDatabase();
  const records = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.filter((item) => item.ownerId === ownerId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return records;
}

export async function getQueuedMutationCount(ownerId: string | null) {
  return (await listQueuedMutations(ownerId)).length;
}

export async function removeQueuedMutation(id: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  notify();
}

export async function flushQueuedMutations(ownerId: string | null, execute: (mutation: QueuedMutation) => Promise<void>) {
  const mutations = (await listQueuedMutations(ownerId)).filter((mutation) => mutation.status !== 'conflict');
  const db = await openDatabase();
  let flushed = 0;
  for (const mutation of mutations) {
    try {
      await execute(mutation);
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).delete(mutation.id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      flushed += 1;
    } catch (error) {
      const apiError = error as Error & { status?: number; payload?: { code?: string; task?: unknown } };
      const isConflict = apiError.status === 409 && apiError.payload?.code === 'TASK_VERSION_CONFLICT';
      const message = isConflict
        ? 'Conflict: this task changed on another device. Review the server version, then discard this queued change.'
        : error instanceof Error ? error.message.slice(0, 300) : 'Synchronization failed';
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).put({
          ...mutation,
          attempts: (mutation.attempts || 0) + 1,
          lastError: message,
          status: isConflict ? 'conflict' : 'pending',
          conflictTask: isConflict ? apiError.payload?.task || null : mutation.conflictTask || null,
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      break;
    }
  }
  db.close();
  notify();
  return flushed;
}

export { CHANGE_EVENT };

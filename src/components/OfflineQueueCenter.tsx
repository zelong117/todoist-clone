import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { flushTaskQueue } from "../api";
import {
  CHANGE_EVENT,
  getCurrentQueueOwner,
  listQueuedMutations,
  removeQueuedMutation,
  type QueuedMutation,
} from "../lib/offlineQueue";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../store";

export default function OfflineQueueCenter() {
  const { user } = useAuth();
  const { fetchData } = useStore();
  const [items, setItems] = useState<QueuedMutation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const canRetry = items.some((item) => item.status !== "conflict");

  const load = () =>
    listQueuedMutations(getCurrentQueueOwner())
      .then(setItems)
      .catch(() => setError("Unable to read local sync queue."));
  useEffect(() => {
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, []);

  const retry = async () => {
    if (!user || !navigator.onLine) {
      setError("Reconnect to the internet before retrying queued changes.");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      const flushed = await flushTaskQueue(user.id);
      if (flushed) await fetchData();
      await load();
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError.message : "Retry failed.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const discard = async (item: QueuedMutation) => {
    if (
      !window.confirm(
        `Discard this pending ${item.method} change? This cannot be restored.`,
      )
    )
      return;
    await removeQueuedMutation(item.id);
    await load();
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <header className="flex justify-between gap-4 flex-wrap border-b border-[var(--border-color)] pb-5 mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Offline synchronization
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Sync queue</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Task changes are saved locally until the API confirms them.
          </p>
        </div>
        <button
          disabled={syncing || !canRetry}
          onClick={retry}
          className="inline-flex h-fit items-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Retry now"}
        </button>
      </header>
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded-lg">
          {error}
        </p>
      )}
      {!navigator.onLine && (
        <p className="mb-4 flex gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 rounded-lg">
          <WifiOff size={17} />
          You are offline. New retries will remain paused.
        </p>
      )}
      {!items.length ? (
        <section className="border border-dashed border-[var(--border-color)] p-10 text-center rounded-lg">
          <RefreshCw
            size={28}
            className="mx-auto text-[var(--text-tertiary)]"
          />
          <h3 className="mt-4 font-semibold">Everything is synchronized</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            There are no queued task changes for this account.
          </p>
        </section>
      ) : (
        <section className="border border-[var(--border-color)] rounded-lg divide-y divide-[var(--border-color)]">
          {items.map((item) => (
            <article
              key={item.id}
              className="p-4 flex gap-4 items-start flex-wrap"
            >
              <span className="px-2 py-1 rounded bg-[var(--bg-active)] text-xs font-semibold">
                {item.method}
              </span>
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-medium">{item.path}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Queued {new Date(item.createdAt).toLocaleString()} ·{" "}
                  {item.attempts || 0} failed attempt
                  {item.attempts === 1 ? "" : "s"}
                </p>
                {item.status === "conflict" && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Conflict needs review. Refresh the workspace to see the server
                    version, then discard this queued change before applying a new edit.
                  </p>
                )}
                {item.lastError && (
                  <p className="mt-2 inline-flex gap-1 text-xs text-red-700">
                    <AlertTriangle size={13} />
                    {item.lastError}
                  </p>
                )}
              </div>
              <button
                onClick={() => discard(item)}
                className="inline-flex items-center gap-1 text-xs text-red-700"
              >
                <Trash2 size={14} />
                Discard
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

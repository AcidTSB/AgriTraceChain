const STORAGE_KEY = "agritrace-realtime-notifications";
const CHANNEL_NAME = "agritrace-realtime-notifications";
const MAX_ITEMS = 20;

const listeners = new Set();
let broadcastChannel = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStorage() {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

function notifyListeners(items) {
  listeners.forEach((listener) => {
    try {
      listener(items);
    } catch {
      // Ignore subscriber errors so notification delivery keeps flowing.
    }
  });
}

function ensureBroadcastChannel() {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = () => {
      cache = readStorage();
      notifyListeners(cache);
    };
  }
  return broadcastChannel;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeNotification(notification) {
  const createdAt = new Date().toISOString();
  return {
    id: createId(),
    title: notification?.title ?? "Thông báo mới",
    message: notification?.message ?? "",
    kind: notification?.kind ?? "INFO",
    route: notification?.route ?? "",
    batchCode: notification?.batchCode ?? "",
    actorRole: notification?.actorRole ?? "",
    createdAt,
    readAt: null,
    tone: notification?.tone ?? "info",
  };
}

let cache = readStorage();

function persist(nextItems) {
  cache = nextItems.slice(0, MAX_ITEMS);
  writeStorage(cache);
  notifyListeners(cache);
  const channel = ensureBroadcastChannel();
  channel?.postMessage({ type: "sync" });
}

export const realtimeNotificationService = {
  getAll() {
    if (!cache.length) {
      cache = readStorage();
    }
    return cache;
  },

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};

    listeners.add(listener);
    listener(cache);

    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      cache = readStorage();
      notifyListeners(cache);
    };

    if (isBrowser()) {
      window.addEventListener("storage", onStorage);
      ensureBroadcastChannel();
    }

    return () => {
      listeners.delete(listener);
      if (isBrowser()) {
        window.removeEventListener("storage", onStorage);
      }
    };
  },

  push(notification) {
    const item = normalizeNotification(notification);
    persist([item, ...cache]);
    return item;
  },

  markRead(id) {
    const nextItems = cache.map((item) =>
      item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item,
    );
    persist(nextItems);
  },

  markAllRead() {
    const nextItems = cache.map((item) =>
      item.readAt ? item : { ...item, readAt: new Date().toISOString() },
    );
    persist(nextItems);
  },

  clear() {
    persist([]);
  },
};
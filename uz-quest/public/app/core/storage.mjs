// Everything the app keeps on the device: settings and progress in localStorage, photos in IndexedDB.
// Every call swallows storage errors (private mode, quota), so the app keeps working without persistence.
export const KEYS = { state: "uzq3-state", profile: "uzq2-profile", outbox: "uzq3-outbox", device: "uzq2-device", detox: "uzq2-detox", log: "uzq3-log", auth: "uzq-auth", testPolicy: "uzq-test-events" };
export const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
};

export const photos = (() => {
  let dbPromise = null;
  const open = () => dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("uzquest-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "questId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, operation) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", mode);
      const request = operation(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
    });
  };
  return {
    put: (record) => run("readwrite", (s) => s.put(record)).catch(() => undefined),
    all: () => run("readonly", (s) => s.getAll()).catch(() => []),
    clear: () => run("readwrite", (s) => s.clear()).catch(() => undefined)
  };
})();

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16);
}));

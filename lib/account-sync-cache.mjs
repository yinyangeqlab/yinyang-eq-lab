// Large merge bases live in IndexedDB, outside localStorage's small synchronous quota.
// Saved music files are never included; callers supply only validated saved-data values.
const BASE_KEY = 'yinyang-account-sync-base-v1';
function database() { return new Promise((resolve, reject) => { const request = indexedDB.open('yinyang-private-sync', 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('bases'))
    request.result.createObjectStore('bases'); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(Error('Browser sync storage is unavailable. Saved listening data is unchanged.')); request.onblocked = () => reject(Error('Close older YinYangEQ tabs to update browser sync storage.')); }); }
async function operation(mode, work) { const db = await database(); try {
    return await new Promise((resolve, reject) => { const transaction = db.transaction('bases', mode), request = work(transaction.objectStore('bases')); let result; request.onsuccess = () => result = request.result; transaction.oncomplete = () => resolve(result); transaction.onerror = transaction.onabort = () => reject(Error('Browser sync storage could not be saved. Existing results are unchanged.')); });
}
finally {
    db.close();
} }
export async function readSyncBase(storage) { const legacy = storage.getItem(BASE_KEY); if (typeof indexedDB === 'undefined')
    return legacy ? JSON.parse(legacy) : null; const saved = await operation('readonly', store => store.get('current')); return saved ?? (legacy ? JSON.parse(legacy) : null); }
export async function writeSyncBase(storage, value) { if (typeof indexedDB === 'undefined') {
    storage.setItem(BASE_KEY, JSON.stringify(value));
    return;
} await operation('readwrite', store => store.put(value, 'current')); storage.removeItem(BASE_KEY); }
export async function clearSyncBase(storage) { storage.removeItem(BASE_KEY); if (typeof indexedDB !== 'undefined')
    await operation('readwrite', store => store.delete('current')); }

import type { MatchRecord } from "./types";
import type { PlayerProfile } from "./types";

const DB = "campograma-wcs";
const STORE = "matches";
const PROFILES = "player_profiles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
      if (!req.result.objectStoreNames.contains(PROFILES)) req.result.createObjectStore(PROFILES, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listPlayerProfiles(): Promise<PlayerProfile[]> {
  const db = await openDb();
  const result = await new Promise<PlayerProfile[]>((resolve, reject) => {
    const req = db.transaction(PROFILES).objectStore(PROFILES).getAll();
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  db.close(); return result;
}

export async function savePlayerProfiles(profiles: PlayerProfile[]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROFILES, "readwrite");
    profiles.forEach(p => tx.objectStore(PROFILES).put(p));
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveMatch(match: MatchRecord) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(match);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listMatches(): Promise<MatchRecord[]> {
  const db = await openDb();
  const result = await new Promise<MatchRecord[]>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteMatch(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

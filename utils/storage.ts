import { Voice, TrackInfo } from '../types';
import { INITIAL_VOICES, INITIAL_BACKGROUND_TRACKS } from '../constants';

const DB_NAME = 'LocutandoDB';
const DB_VERSION = 1;
const STORE_VOICES = 'voices';
const STORE_TRACKS = 'tracks';

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event);
            reject('Erro ao abrir o banco de dados.');
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_VOICES)) {
                db.createObjectStore(STORE_VOICES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_TRACKS)) {
                db.createObjectStore(STORE_TRACKS, { keyPath: 'name' });
            }
        };
    });
};

import { BackendService } from '../services/backend';

export const saveVoices = async (voices: Voice[]): Promise<void> => {
    try {
        // Backend sync removed for Serverless Mode. using IndexedDB directly.
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_VOICES], 'readwrite');
            const store = transaction.objectStore(STORE_VOICES);
            store.clear().onsuccess = () => {
                let completed = 0;
                if (voices.length === 0) return resolve();
                voices.forEach(voice => {
                    store.put(voice).onsuccess = () => {
                        completed++;
                        if (completed === voices.length) resolve();
                    };
                });
            };
        });

    } catch (e) {
        console.error('Error saving voices:', e);
        throw e;
    }
};

export const getVoices = async (): Promise<Voice[]> => {
    // 1. Backend sync removed. Try IndexedDB First.
    try {
        const db = await initDB();
        const cachedVoices = await new Promise<Voice[]>((resolve, reject) => {
            const transaction = db.transaction([STORE_VOICES], 'readonly');
            const store = transaction.objectStore(STORE_VOICES);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as Voice[]);
            request.onerror = () => reject('IDB Error');
        });

        if (cachedVoices && cachedVoices.length > 0) return cachedVoices;
    } catch (e) { /* ignore */ }

    // 2. Fallback to Constants
    return INITIAL_VOICES;
};

// Helper for caching without triggering recursive backend save
const saveVoicesToCache = async (voices: Voice[]) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_VOICES], 'readwrite');
        const store = transaction.objectStore(STORE_VOICES);
        store.clear();
        voices.forEach(v => store.put(v));
    } catch (e) { console.error('Cache error', e); }
};

export const saveTracks = async (tracks: TrackInfo[]): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_TRACKS], 'readwrite');
        const store = transaction.objectStore(STORE_TRACKS);

        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            let completed = 0;
            if (tracks.length === 0) {
                resolve();
                return;
            }

            tracks.forEach(track => {
                const request = store.put(track);
                request.onsuccess = () => {
                    completed++;
                    if (completed === tracks.length) resolve();
                };
                request.onerror = () => reject('Erro ao salvar trilha.');
            });
        };

        clearRequest.onerror = () => reject('Erro ao limpar trilhas antigas.');
    });
};

export const getTracks = async (): Promise<TrackInfo[]> => {
    // 1. Backend sync removed. Try IndexedDB First.
    try {
        const db = await initDB();
        const cachedTracks = await new Promise<TrackInfo[]>((resolve, reject) => {
            const transaction = db.transaction([STORE_TRACKS], 'readonly');
            const store = transaction.objectStore(STORE_TRACKS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as TrackInfo[]);
            request.onerror = () => reject('IDB Error');
        });

        if (cachedTracks && cachedTracks.length > 0) return cachedTracks;
    } catch (e) { /* ignore */ }

    // 2. Fallback
    return INITIAL_BACKGROUND_TRACKS;
};

const saveTracksToCache = async (tracks: TrackInfo[]) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_TRACKS], 'readwrite');
        const store = transaction.objectStore(STORE_TRACKS);
        store.clear();
        tracks.forEach(track => store.put(track));
    } catch (e) { console.error('Cache error', e); }
};

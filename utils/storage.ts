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

export const saveVoices = async (voices: Voice[]): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_VOICES], 'readwrite');
        const store = transaction.objectStore(STORE_VOICES);

        // Clear existing to avoid duplicates if IDs changed or items removed
        // A simpler approach for this use case is to clear and rewrite, 
        // or we can put each item. Since we are saving the whole state, 
        // clearing first ensures deleted items are removed.
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            let completed = 0;
            if (voices.length === 0) {
                resolve();
                return;
            }

            voices.forEach(voice => {
                const request = store.put(voice);
                request.onsuccess = () => {
                    completed++;
                    if (completed === voices.length) resolve();
                };
                request.onerror = () => reject('Erro ao salvar voz.');
            });
        };

        clearRequest.onerror = () => reject('Erro ao limpar vozes antigas.');
    });
};

export const getVoices = async (): Promise<Voice[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_VOICES], 'readonly');
        const store = transaction.objectStore(STORE_VOICES);
        const request = store.getAll();

        request.onsuccess = () => {
            const result = request.result as Voice[];
            if (result && result.length > 0) {
                resolve(result);
            } else {
                // If empty, return initial voices
                resolve(INITIAL_VOICES);
            }
        };

        request.onerror = () => reject('Erro ao carregar vozes.');
    });
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
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_TRACKS], 'readonly');
        const store = transaction.objectStore(STORE_TRACKS);
        const request = store.getAll();

        request.onsuccess = () => {
            const result = request.result as TrackInfo[];
            if (result && result.length > 0) {
                resolve(result);
            } else {
                resolve(INITIAL_BACKGROUND_TRACKS);
            }
        };

        request.onerror = () => reject('Erro ao carregar trilhas.');
    });
};

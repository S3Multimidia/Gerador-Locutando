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
import { supabase } from '../utils/supabaseClient';

export const saveVoices = async (voices: Voice[]): Promise<void> => {
    try {
        // Save to Supabase (Source of Truth)
        if (voices.length > 0) {
            // Upsert (Insert or Update) all voices
            const { error } = await supabase
                .from('voices')
                .upsert(voices.map(v => ({
                    id: v.id,
                    name: v.name,
                    display_name: v.displayName, // Map displayName -> display_name
                    gender: v.gender,
                    language: v.language || 'pt-BR',
                    image_url: v.imageUrl,
                    demo_url: v.demoUrl, // Map demoUrl -> demo_url
                    description: v.description,
                    prompt: v.prompt
                })), { onConflict: 'id' });

            if (error) console.error("Supabase Save Error:", error);
        }

        // Also update IndexedDB for offline capability/cache
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
    // 1. Try Supabase First (Cloud Source)
    try {
        const { data, error } = await supabase.from('voices').select('*');

        if (!error && data && data.length > 0) {
            // Map Supabase Columns (snake_case) to Frontend Type (camelCase)
            const supabaseVoices: Voice[] = data.map((row: any) => ({
                id: row.id,
                name: row.name,
                displayName: row.display_name || row.name,
                gender: row.gender as 'Masculino' | 'Feminino',
                language: row.language as 'pt-BR' | 'en-US',
                description: row.description || '',
                prompt: row.prompt || '',
                imageUrl: row.image_url || '',
                demoUrl: row.demo_url || '',
            }));

            // Update local cache
            saveVoicesToCache(supabaseVoices);
            return supabaseVoices;
        } else if (data && data.length === 0 && !error) {
            // If explicit empty list from DB, it means user deleted everything.
            // Do NOT fallback to INITIAL_VOICES locally.
            saveVoicesToCache([]);
            return [];
        }
    } catch (e) {
        console.warn('Supabase voices unreachable, trying cache/defaults...', e);
    }

    // 2. Fallback to IndexedDB (as before)
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

    // 3. Fallback to Constants
    return INITIAL_VOICES;
};

export const deleteVoice = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase.from('voices').delete().eq('id', id);
        if (error) throw error;

        // Update local cache too
        const db = await initDB();
        const transaction = db.transaction([STORE_VOICES], 'readwrite');
        const store = transaction.objectStore(STORE_VOICES);
        store.delete(id);
    } catch (e) {
        console.error("Error deleting voice:", e);
        throw e;
    }
}


/**
 * Zera TODO o sistema:
 * 1. Remove todas as vozes do Supabase
 * 2. Limpa o Cache Local (IndexedDB)
 * 3. (Opcional) Limpa configurações locais
 */
export const resetSystem = async (): Promise<void> => {
    try {
        console.log('RESET: Iniciando limpeza completa...');

        // 1. Limpar Supabase (Tenta deletar tudo que tem ID diferente de '0')
        const { error } = await supabase.from('voices').delete().neq('id', '0');
        if (error) {
            console.error('RESET: Erro ao limpar Supabase:', error);
            // Pode ser RLS.
        }

        // 2. Limpar IndexedDB
        const db = await initDB();

        // Limpar Vozes
        const txVoices = db.transaction([STORE_VOICES], 'readwrite');
        txVoices.objectStore(STORE_VOICES).clear();

        // Limpar Trilhas
        const txTracks = db.transaction([STORE_TRACKS], 'readwrite');
        txTracks.objectStore(STORE_TRACKS).clear();

        console.log('RESET: Concluído com sucesso.');
    } catch (e) {
        console.error('RESET: Falha crítica', e);
        throw e;
    }
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
    try {
        // Save to Supabase (Source of Truth)
        if (tracks.length > 0) {
            const { error } = await supabase
                .from('tracks')
                .upsert(tracks.map(t => ({
                    name: t.name,
                    url: t.url,
                    category: 'background'
                })), { onConflict: 'name' });

            if (error) {
                console.error("Supabase Save Error:", error);
                throw new Error('Erro ao salvar trilhas no Supabase: ' + error.message);
            }
        }

        // Also update IndexedDB for offline capability/cache
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
                    request.onerror = () => reject('Erro ao salvar trilha no cache.');
                });
            };

            clearRequest.onerror = () => reject('Erro ao limpar trilhas antigas do cache.');
        });
    } catch (e) {
        console.error('Error saving tracks:', e);
        throw e;
    }
};

export const getTracks = async (): Promise<TrackInfo[]> => {
    // 1. Try Supabase First (Cloud Source of Truth)
    try {
        const { data, error } = await supabase.from('tracks').select('*');

        if (!error && data) {
            if (data.length > 0) {
                // Map Supabase Columns to Frontend Type
                const supabaseTracks: TrackInfo[] = data.map((row: any) => ({
                    name: row.name,
                    url: row.url
                }));
                saveTracksToCache(supabaseTracks);
                return supabaseTracks;
            } else {
                // Supabase is EMPTY → auto-seed with initial tracks
                console.log('Supabase tracks table is empty. Seeding with initial tracks...');
                await supabase.from('tracks').upsert(
                    INITIAL_BACKGROUND_TRACKS.map(t => ({
                        name: t.name,
                        url: t.url,
                        category: 'background'
                    })),
                    { onConflict: 'name' }
                );
                saveTracksToCache(INITIAL_BACKGROUND_TRACKS);
                return INITIAL_BACKGROUND_TRACKS;
            }
        }
    } catch (e) {
        console.warn('Supabase tracks unreachable, trying cache/defaults...', e);
    }

    // 2. Try IndexedDB Fallback
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

    // 3. Fallback to Constants
    return INITIAL_BACKGROUND_TRACKS;
};

export const deleteTrack = async (name: string): Promise<void> => {
    try {
        const { error } = await supabase.from('tracks').delete().eq('name', name);
        if (error) throw error;

        // Update local cache too
        const db = await initDB();
        const transaction = db.transaction([STORE_TRACKS], 'readwrite');
        const store = transaction.objectStore(STORE_TRACKS);
        store.delete(name);
    } catch (e) {
        console.error("Error deleting track:", e);
        throw e;
    }
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

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'locutando_mixer_state';

interface MixerState {
    selectedBackgroundName: string | null;
    volumes: {
        opening: number;
        voice: number;
        background: number;
        closing: number;
    };
}

export const useMixerPersistence = (
    initialVolumes: MixerState['volumes']
) => {
    const [savedState, setSavedState] = useState<MixerState | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSavedState(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load mixer state', e);
        }
    }, []);

    const saveMixerState = (state: MixerState) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save mixer state', e);
        }
    };

    return {
        savedMixerState: savedState,
        saveMixerState
    };
};

import { useState, useEffect, useRef, useCallback } from 'react';

// Keys for localStorage
const STORAGE_KEY_PREFIX = 'locutando_dashboard_';

export interface DashboardState {
    text: string;
    selectedVoiceId: string | null;
    activeTab: 'generate' | 'record';
    cutStartSec: number;
    cutEndSec: number;
    finalCutStartSec: number;
    finalCutEndSec: number;
}

const INITIAL_STATE: DashboardState = {
    text: '',
    selectedVoiceId: null,
    activeTab: 'generate',
    cutStartSec: 0,
    cutEndSec: 0,
    finalCutStartSec: 0,
    finalCutEndSec: 0,
};

export const useDashboardPersistence = () => {
    const [state, setState] = useState<DashboardState>(INITIAL_STATE);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load state on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const savedState = localStorage.getItem(`${STORAGE_KEY_PREFIX}state`);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                setState({ ...INITIAL_STATE, ...parsed });
            }
        } catch (e) {
            console.error('Failed to load dashboard state:', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save state on change (debounced)
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isLoaded) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}state`, JSON.stringify(state));
            } catch (e) {
                console.error('Failed to save dashboard state:', e);
            }
        }, 1000); // Save after 1 second of inactivity

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [state, isLoaded]);

    const updateState = useCallback((updates: Partial<DashboardState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    return {
        dashboardState: state,
        updateDashboardState: updateState,
        isPersistenceLoaded: isLoaded
    };
};

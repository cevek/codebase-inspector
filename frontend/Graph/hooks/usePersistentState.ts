import {useState, useEffect} from 'react';

export function usePersistentState<T>(
    params: {key: string; storage?: 'local' | 'session'},
    initialState: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const storage = params.storage === 'session' ? sessionStorage : localStorage;
    const [state, setState] = useState<T>(() => {
        try {
            const saved = storage.getItem(params.key);
            if (saved) return JSON.parse(saved);
        } catch (error) {
            console.error('Error reading from localStorage', error);
        }
        return initialState;
    });

    useEffect(() => {
        try {
            storage.setItem(params.key, JSON.stringify(state));
        } catch (error) {
            console.error('Error writing to localStorage', error);
        }
    }, [params.key, state]);

    return [state, setState];
}

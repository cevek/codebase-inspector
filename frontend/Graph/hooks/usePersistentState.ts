import {useState, useEffect} from 'react';

export function usePersistentState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) return JSON.parse(saved);
        } catch (error) {
            console.error('Error reading from localStorage', error);
        }
        return initialState;
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error('Error writing to localStorage', error);
        }
    }, [key, state]);

    return [state, setState];
}

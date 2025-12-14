import {useRef, useLayoutEffect, useCallback} from 'react';

export function useEvent<T extends (...args: any[]) => any>(fn: T): T {
    const fnRef = useRef(fn);
    useLayoutEffect(() => {
        fnRef.current = fn;
    }, [fn]);
    return useCallback((...args: Parameters<T>) => {
        return fnRef.current(...args);
    }, []) as T;
}

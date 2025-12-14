import {useEffect, useRef} from 'react';

export type ParserType = 'string' | 'json' | 'boolean';

const parsers: Record<ParserType, (val: string) => unknown> = {
    string: (val) => val,
    boolean: (val) => val === 'true',
    json: (val) => {
        try {
            return JSON.parse(val);
        } catch {
            return undefined;
        }
    },
};

export function urlSyncFactory<T>() {
    return <C extends {[P in keyof T]?: ParserType} & {[P in Exclude<keyof C, keyof T>]: never}>(config: C) => {
        const readUrlData = (): Partial<T> => {
            const params = new URLSearchParams(window.location.hash.slice(1));
            const result: Partial<T> = {};
            (Object.keys(config) as Array<keyof C & keyof T>).forEach((key) => {
                const type = config[key];
                const urlValue = params.get(String(key));
                if (urlValue !== null) {
                    result[key] = parsers[type](urlValue) as T[keyof C & keyof T];
                }
            });
            return result;
        };

        const useUrlSync = (state: T) => {
            const isReadyRef = useRef(false);

            useEffect(() => {
                if (!isReadyRef.current) {
                    isReadyRef.current = true;
                    return;
                }

                const params = new URLSearchParams(window.location.hash.slice(1));
                let hasChanges = false;

                (Object.keys(config) as Array<keyof C & keyof T>).forEach((key) => {
                    const value = state[key];
                    const isEmpty =
                        value === undefined ||
                        value === null ||
                        value === '' ||
                        (Array.isArray(value) && value.length === 0);

                    const currentUrlValue = params.get(String(key));

                    if (isEmpty) {
                        if (currentUrlValue !== null) {
                            params.delete(String(key));
                            hasChanges = true;
                        }
                    } else {
                        const newValueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        if (currentUrlValue !== newValueStr) {
                            params.set(String(key), newValueStr);
                            hasChanges = true;
                        }
                    }
                });

                if (hasChanges) {
                    const newHash = params.toString();
                    if (window.location.hash.slice(1) !== newHash) {
                        window.location.hash = newHash;
                    }
                }
            }, [state]);
        };

        return {readUrlData, useUrlSync};
    };
}

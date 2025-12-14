import {useEffect, useMemo, useState} from 'react';
import {GraphViewState} from './useGraphState';
import {Id} from '../../../../types';
import {LayoutDirection} from '../../types';

// 1. Единый источник правды для ключей
const URL_KEYS = {
    SELECTED_ID: 'selectedId',
    FOCUS_ID: 'focusId',
    LAYOUT: 'layoutDirection',
    REMOVED: 'removedIds',
    WHITELIST: 'whiteListIds',
    GROUP_MODULES: 'groupByModules',
    EMBED_SPECIAL_ACTIONS: 'embedSpecialActions',
} as const;

// Тип возвращаемых данных при чтении
interface UrlState extends Partial<GraphViewState> {
    groupByModules?: boolean;
    embedSpecialActions?: boolean;
}

export function useUrlState() {
    return useMemo(() => readUrlState(), []);
}
const readUrlState = (): UrlState => {
    try {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);

        const parseJson = <T>(key: string, defaultValue: T): T => {
            const val = params.get(key);
            if (!val) return defaultValue;
            try {
                return JSON.parse(val);
            } catch {
                return defaultValue;
            }
        };

        return {
            selectedId: (params.get(URL_KEYS.SELECTED_ID) as Id) || undefined,
            focusId: (params.get(URL_KEYS.FOCUS_ID) as Id) || undefined,
            layoutDirection: (params.get(URL_KEYS.LAYOUT) as LayoutDirection) || undefined,

            removedIds: parseJson(URL_KEYS.REMOVED, []),
            whiteListIds: parseJson(URL_KEYS.WHITELIST, []),

            groupByModules: params.get(URL_KEYS.GROUP_MODULES) === 'true' ? true : undefined,
            embedSpecialActions: params.get(URL_KEYS.EMBED_SPECIAL_ACTIONS) === 'true' ? true : undefined,
        };
    } catch (e) {
        console.error('Failed to parse URL', e);
        return {removedIds: [], whiteListIds: []};
    }
};

// 3. Логика записи (Хук)
interface UseUrlSyncParams {
    state: GraphViewState;
}

export const useUrlSync = ({state}: UseUrlSyncParams) => {
    // Защита от записи при первом рендере (пока не произошла гидратация)
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!isReady) return;

        // Читаем текущий hash, чтобы сохранить чужие параметры
        const params = new URLSearchParams(window.location.hash.slice(1));

        // Хелпер для записи
        const setOrDelete = (key: string, value: any) => {
            if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
                params.delete(key);
            } else {
                // Если объект/массив -> JSON stringify, иначе String
                const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
                params.set(key, strVal);
            }
        };

        setOrDelete(URL_KEYS.SELECTED_ID, state.selectedId);
        setOrDelete(URL_KEYS.FOCUS_ID, state.focusId);
        setOrDelete(URL_KEYS.LAYOUT, state.layoutDirection);
        setOrDelete(URL_KEYS.REMOVED, state.removedIds);
        setOrDelete(URL_KEYS.WHITELIST, state.whiteListIds);
        setOrDelete(URL_KEYS.GROUP_MODULES, state.groupByModules);
        setOrDelete(URL_KEYS.EMBED_SPECIAL_ACTIONS, state.embedSpecialActions);

        const newHash = params.toString();
        if (window.location.hash.slice(1) !== newHash) {
            window.location.hash = newHash;
        }
    }, [state, isReady]);
};

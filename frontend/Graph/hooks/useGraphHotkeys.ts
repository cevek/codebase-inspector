import {useEffect} from 'react';
import {Id} from '../../../types';
import {Rect} from '../GraphViewer';
import {ArrowDirection} from '../types';
import {SpatialNavigator} from '../utils/SpatialNavigator';

interface HotkeysParams {
    selectedId: Id | null;
    nodeRects: Rect[];
    navigator: React.MutableRefObject<SpatialNavigator>;

    actions: {
        focusNode: (id: Id) => void;
        removeNode: (id: Id, dir: 'backward' | 'forward') => void;
        revealNode: (id: Id, dir: 'backward' | 'forward') => void;
        selectNode: (id: Id) => void;
    };
    history: {
        undo: () => void;
        redo: () => void;
    };
}

export const useGraphHotkeys = ({selectedId, nodeRects, navigator, actions, history}: HotkeysParams) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Игнорируем ввод текста в инпутах
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            // --- 1. Undo / Redo ---
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                if (e.shiftKey) history.redo();
                else history.undo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                history.redo();
                return;
            }

            // --- 2. Действия с узлом (Enter, Backspace) ---
            if (selectedId) {
                if (e.key === 'Enter') {
                    actions.focusNode(selectedId);
                }

                if (e.key === 'Backspace') {
                    const dir = e.shiftKey ? 'backward' : 'forward';
                    actions.removeNode(selectedId, dir);
                }
            }

            // --- 3. Навигация (Стрелки) ---
            if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const isReveal = e.ctrlKey || e.metaKey || e.shiftKey;

                if (isReveal) {
                    // Reveal logic (Раскрытие связей)
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') actions.revealNode(selectedId, 'backward');
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') actions.revealNode(selectedId, 'forward');
                } else {
                    // Move logic (Геометрическая навигация)
                    const dirMap: Record<string, ArrowDirection> = {
                        ArrowUp: 'up',
                        ArrowDown: 'down',
                        ArrowLeft: 'left',
                        ArrowRight: 'right',
                    };

                    const direction = dirMap[e.key];
                    const nextId = navigator.current.findNext(selectedId, direction, nodeRects);

                    if (nextId) {
                        actions.selectNode(nextId);
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, nodeRects, actions, history, navigator]); // Зависимости
};

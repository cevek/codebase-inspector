import {useEffect} from 'react';
import {Rect} from '../../GraphViewer/types';
import {ArrowDirection, Id} from '../../types';
import {SpatialNavigator} from '../logic/SpatialNavigator';

interface HotkeysParams {
    selectedId: Id | null;
    nodeRects: Rect[];
    spatialNavigator: React.RefObject<SpatialNavigator>;

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

export const useGraphHotkeys = ({selectedId, nodeRects, spatialNavigator, actions, history}: HotkeysParams) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if ((target.tagName === 'INPUT' && target.getAttribute('type') === 'text') || target.tagName === 'TEXTAREA')
                return;

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

            // --- 2. Handle selected node (Enter, Backspace) ---
            if (selectedId) {
                if (e.key === 'Enter') {
                    actions.focusNode(selectedId);
                    e.preventDefault();
                }

                if (e.key === 'Backspace') {
                    const dir = e.shiftKey ? 'backward' : 'forward';
                    actions.removeNode(selectedId, dir);
                    e.preventDefault();
                }
            }

            // --- 3. Handle navigation (Arrow keys) ---
            if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const isReveal = e.ctrlKey || e.metaKey || e.shiftKey;

                if (isReveal) {
                    // Reveal logic (Reveal connections)
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') actions.revealNode(selectedId, 'backward');
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') actions.revealNode(selectedId, 'forward');
                } else {
                    // Move logic (Geometric navigation)
                    const dirMap: Record<string, ArrowDirection> = {
                        ArrowUp: 'up',
                        ArrowDown: 'down',
                        ArrowLeft: 'left',
                        ArrowRight: 'right',
                    };

                    const direction = dirMap[e.key];
                    const nextId = spatialNavigator.current.findNext(selectedId, direction, nodeRects);

                    if (nextId) {
                        actions.selectNode(nextId);
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, nodeRects, actions, history, spatialNavigator]);
};

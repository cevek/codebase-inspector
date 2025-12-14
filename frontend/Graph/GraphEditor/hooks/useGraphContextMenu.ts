import {useCallback} from 'react';
import {Id} from '../../../../types';
import {ContextMenuCb} from '../../GraphViewer/GraphViewer';
import {Direction} from '../../types';

interface MenuActions {
    focusNode: (id: Id) => void;
    revealNode: (id: Id, dir: Direction) => void;
    removeNode: (id: Id, dir: Direction) => void;
}

export const useGraphContextMenu = (actions: MenuActions): ContextMenuCb => {
    return useCallback(
        (id: Id) => {
            return [
                {label: 'Focus subtree', hotkey: ['↵'], onClick: () => actions.focusNode(id)},
                {label: 'Reveal backward', hotkey: ['⌘ ↑'], onClick: () => actions.revealNode(id, 'backward')},
                {label: 'Reveal forward', hotkey: ['⌘ ↓'], onClick: () => actions.revealNode(id, 'forward')},
                {label: 'Delete backward', hotkey: ['⇧ ⌫'], onClick: () => actions.removeNode(id, 'backward')},
                {label: 'Delete forward', hotkey: ['⌫'], onClick: () => actions.removeNode(id, 'forward')},
            ];
        },
        [actions],
    );
};

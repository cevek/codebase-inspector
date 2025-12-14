import {Id} from '../../../../types';
import {ContextMenuCb} from '../../GraphViewer/types';
import {useEvent} from '../../hooks/useEvent';
import {Direction} from '../../types';

interface MenuActions {
    focusNode: (id: Id) => void;
    revealNode: (id: Id, dir: Direction) => void;
    removeNode: (id: Id, dir: Direction) => void;
}

export const useGraphContextMenu = (actions: MenuActions): ContextMenuCb => {
    return useEvent((id: Id) => {
        return [
            {
                label: 'Focus subtree',
                hotkey: ['↵'],
                onClick: () => actions.focusNode(id),
            },
            {
                label: 'Reveal backward',
                hotkey: ['⌘ ↑'],
                onClick: () => actions.revealNode(id, 'backward'),
            },
            {
                label: 'Reveal forward',
                hotkey: ['⌘ ↓'],
                onClick: () => actions.revealNode(id, 'forward'),
            },
            {
                label: 'Delete backward',
                hotkey: ['⇧ ⌫'],
                onClick: () => actions.removeNode(id, 'backward'),
            },
            {
                label: 'Delete forward',
                hotkey: ['⌫'],
                onClick: () => actions.removeNode(id, 'forward'),
            },
        ];
    });
};

import {Id} from '../types';

export interface Rect {
    id: Id;
    cx: number;
    cy: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export type ContextMenuCb = (id: Id) => ContextMenuItem[];
export interface DOMMapping {
    domIdToIdMap: Map<string, Id>;
    idToDomIdMap: Map<Id, string>;
}
export type ContextMenuItem = {
    label: string;
    disabled?: boolean;
    hotkey?: string[];
    onClick: () => void;
};

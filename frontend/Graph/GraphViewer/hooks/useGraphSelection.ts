import React from 'react';
import {Id} from '../../../../types';
import {DOMMapping} from '../types';

export function useGraphSelection(
    containerRef: React.RefObject<HTMLDivElement | null>,
    mapRef: React.RefObject<DOMMapping>,
    selectedId: Id | null,
    mainId: Id | null,
    renderVersion: number,
    classes: {
        selected: string;
        selectedEdge: string;
        mainNode: string;
    },
) {
    const clearClasses = (selector: string, className: string) => {
        containerRef.current?.querySelectorAll(selector).forEach((el) => el.classList.remove(className));
    };

    React.useEffect(() => {
        if (!containerRef.current) return;

        // Clear everything to avoid leftovers from old renders
        clearClasses('.' + classes.selected, classes.selected);
        clearClasses('.' + classes.selectedEdge, classes.selectedEdge);

        if (selectedId) {
            // mapRef.current already updated in useGraphRender before setRenderVersion
            const domId = mapRef.current.idToDomIdMap.get(selectedId);

            // If the graph has been rebuilt, the DOM nodes are new, so we search for them again
            const element = containerRef.current.querySelector(`#${domId}`);
            element?.classList.add(classes.selected);

            const selectors = [
                `[id^="${selectedId}__"]`,
                `[id^="${selectedId}_trigger__"]`,
                `[id^="${selectedId}_success__"]`,
                `[id^="${selectedId}_error__"]`,
                `[id$="__${selectedId}"]`,
                `[id$="__${selectedId}_trigger"]`,
                `[id$="__${selectedId}_success"]`,
                `[id$="__${selectedId}_error"]`,
            ].join(', ');

            const edges = containerRef.current.querySelectorAll(selectors);
            edges.forEach((edge) => edge.classList.add(classes.selectedEdge));
        }
    }, [selectedId, renderVersion, containerRef]);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const oldMain = containerRef.current.querySelector('.' + classes.mainNode);
        oldMain?.classList.remove(classes.mainNode);

        if (mainId) {
            const domId = mapRef.current.idToDomIdMap.get(mainId);
            const element = containerRef.current.querySelector(`#${domId}`);
            element?.classList.add(classes.mainNode);
        }
    }, [mainId, renderVersion, containerRef]);
}

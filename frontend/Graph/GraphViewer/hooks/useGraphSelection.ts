import React from 'react';
import {Id} from '../../../../types';
import {DOMMapping} from '../types';

export function useGraphSelection(
    containerRef: React.RefObject<HTMLDivElement | null>,
    mapRef: React.MutableRefObject<DOMMapping>,
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

        // Сначала чистим всё, чтобы не осталось хвостов от старых рендеров
        clearClasses('.' + classes.selected, classes.selected);
        clearClasses('.' + classes.selectedEdge, classes.selectedEdge);

        if (selectedId) {
            // Важно: mapRef.current уже обновлен в useGraphRender перед setRenderVersion
            const domId = mapRef.current.idToDomIdMap.get(selectedId);

            // Если граф перестроился, DOM узлы новые, ищем их заново
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
        // ДОБАВИЛИ renderVersion в зависимости.
        // Теперь эффект сработает, когда изменится ID ИЛИ когда граф закончит рисоваться.
    }, [selectedId, renderVersion, containerRef]);

    // То же самое для MainId
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

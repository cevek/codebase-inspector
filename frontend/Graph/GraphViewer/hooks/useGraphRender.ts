import React from 'react';
import {ReactZoomPanPinchContentRef} from 'react-zoom-pan-pinch';
import {Graph} from '../../Graph';
import {LayoutDirection} from '../../types';
import {Rect, DOMMapping} from '../types';
import {assignStableIds} from '../utils/assignStableIds';
import {generateGraphviz} from '../logic/generateGraphviz';
import {RawSnapshot, createAttributeSnapshot, animateRawAttributes} from '../utils/svgAnimate';
import {Graphviz} from '@hpcc-js/wasm';
const MAX_ANIMATION_HTML_SIZE = 100000;

const graphvizPromise = Graphviz.load();

export function useGraphRender({
    containerRef,
    graph,
    initialGraph,
    groupByModules,
    layoutDirection,
    transformComponentRef,
    onNodeRectsChange,
}: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    graph: Graph;
    initialGraph: Graph;
    groupByModules: boolean;
    layoutDirection: LayoutDirection;
    transformComponentRef: React.RefObject<ReactZoomPanPinchContentRef | null>;
    onNodeRectsChange?: (rects: Rect[]) => void;
}) {
    const [renderVersion, setRenderVersion] = React.useState(0);

    const mapRef = React.useRef<DOMMapping>({domIdToIdMap: new Map(), idToDomIdMap: new Map()});

    // Утилита для получения координат
    const updateNodeRects = React.useCallback(() => {
        if (!containerRef.current || !onNodeRectsChange) return;

        const nodeElements = Array.from(containerRef.current.querySelectorAll<SVGGElement>('g.node[id]'));
        const rects = nodeElements
            .map<Rect | null>((el) => {
                const id = mapRef.current.domIdToIdMap.get(el.id);
                if (!id) return null;
                const r = el.getBoundingClientRect();
                return {
                    id,
                    cx: r.left + r.width / 2,
                    cy: r.top + r.height / 2,
                    left: r.left,
                    top: r.top,
                    right: r.right,
                    bottom: r.bottom,
                };
            })
            .filter((r): r is Rect => !!r);

        onNodeRectsChange(rects);
    }, [containerRef, onNodeRectsChange]);

    React.useLayoutEffect(() => {
        let isMounted = true;

        const render = async () => {
            try {
                const graphviz = await graphvizPromise;
                const {dotString, domIdToIdMap, idToDomIdMap} = generateGraphviz({
                    graph,
                    initialGraph,
                    groupByModules,
                    layoutDirection,
                });

                if (!isMounted) return;

                mapRef.current = {domIdToIdMap, idToDomIdMap};
                const svgString = graphviz.layout(dotString, 'svg', 'dot');
                const container = containerRef.current;
                if (!container) return;

                // Логика снапшотов для анимации
                let snapshot: RawSnapshot | undefined;
                const currentSvg = container.firstElementChild as SVGSVGElement;
                if (currentSvg && container.innerHTML.length < MAX_ANIMATION_HTML_SIZE) {
                    snapshot = createAttributeSnapshot(currentSvg);
                }

                // Вставка нового SVG
                container.innerHTML = svgString;
                const newSvg = container.firstElementChild as SVGSVGElement;

                updateNodeRects();

                if (!newSvg) return;

                assignStableIds(newSvg);
                newSvg.querySelectorAll('title').forEach((el) => el.remove());

                // Анимация или просто показ
                if (snapshot) {
                    newSvg.style.opacity = '0';
                    await animateRawAttributes(newSvg, snapshot);
                    transformComponentRef.current?.centerView();
                    newSvg.style.opacity = '1';
                } else {
                    newSvg.style.opacity = '1';
                    // setTimeout нужен, чтобы DOM успел обновиться перед центрированием
                    setTimeout(() => transformComponentRef.current?.centerView(), 0);
                }
                if (isMounted) {
                    setRenderVersion((v) => v + 1);
                }
            } catch (err) {
                console.error('Graph render failed:', err);
            }
        };

        render();

        return () => {
            isMounted = false;
        };
    }, [graph, groupByModules, layoutDirection, initialGraph, containerRef, transformComponentRef, updateNodeRects]);

    return {mapRef, renderVersion};
}

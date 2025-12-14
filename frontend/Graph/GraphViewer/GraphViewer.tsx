import {Graphviz} from '@hpcc-js/wasm';
import * as React from 'react';
import {Item, Menu, useContextMenu} from 'react-contexify';
import {ReactZoomPanPinchContentRef, TransformComponent, TransformWrapper} from 'react-zoom-pan-pinch';
import {Id} from '../../../types';
import {Graph} from '../Graph';
import classes from './GraphViewer.module.css';
import {useIgnoreClickOnDrag} from './hooks/useIgnoreDraggin';
import {assignStableIds} from './utils/assignStableIds';
import {generateGraphviz} from './utils/generateGraphviz';
import {animateRawAttributes, createAttributeSnapshot, RawSnapshot} from './utils/svgAnimate';
import {LayoutDirection} from '../types';
const graphvizPromise = Graphviz.load();

export type ContextMenuItem = {
    label: string;
    disabled?: boolean;
    hotkey?: string[];
    onClick: () => void;
};
const MENU_ID = 'graph_context_menu';

export type ContextMenuCb = (id: Id) => ContextMenuItem[];

export interface Rect {
    id: Id;
    cx: number;
    cy: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
}
interface DOMMapping {
    domIdToIdMap: Map<string, Id>;
    idToDomIdMap: Map<Id, string>;
}

const MAX_ANIMATION_HTML_SIZE = 100000; // Избавляемся от магических чисел

function useGraphRender({
    containerRef,
    graph,
    initialData,
    groupByModules,
    layoutDirection,
    transformComponentRef,
    onNodeRectsChange,
}: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    graph: Graph;
    initialData: Graph;
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
                    data: graph,
                    initialData,
                    groupByModules,
                    direction: layoutDirection,
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
    }, [graph, groupByModules, layoutDirection, initialData, containerRef, transformComponentRef, updateNodeRects]);

    return {mapRef, renderVersion};
}

// --- 3. Хук для управления выделением (Selection Logic) ---

function useGraphSelection(
    containerRef: React.RefObject<HTMLDivElement | null>,
    mapRef: React.MutableRefObject<DOMMapping>,
    selectedId: Id | null,
    mainId: Id | null,
    renderVersion: number,
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

export const GraphViewer: React.FC<{
    graph: Graph;
    initialData: Graph;
    selectedId: Id | null;
    mainId: Id | null;
    onSelect?: (id: Id | null) => void;
    onDoubleClick?: (id: Id) => void;
    groupByModules: boolean;
    onContextMenuOpen?: (id: Id) => ContextMenuItem[];
    layoutDirection?: LayoutDirection;
    onNodeRectsChange?: (rects: Rect[]) => void;
}> = ({
    graph,
    initialData,
    selectedId,
    mainId,
    onContextMenuOpen,
    onSelect,
    onDoubleClick,
    groupByModules,
    onNodeRectsChange,
    layoutDirection = 'TB',
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    const {show: showContextMenu, hideAll: hideContextMenu} = useContextMenu({id: MENU_ID});
    function handleContextMenu(e: React.MouseEvent) {
        const target = e.target as HTMLElement;
        const nodeId = findNodeByElement(target);
        if (nodeId) {
            setMenuItems(onContextMenuOpen?.(nodeId) ?? []);
            showContextMenu({
                event: e,
            });
        } else {
            e.preventDefault();
        }
    }
    const [menuItems, setMenuItems] = React.useState<ContextMenuItem[]>([]);
    const transformComponentRef = React.useRef<ReactZoomPanPinchContentRef>(null);

    // Подключаем логику рендеринга
    const {mapRef, renderVersion} = useGraphRender({
        containerRef,
        graph,
        initialData,
        groupByModules,
        layoutDirection,
        transformComponentRef,
        onNodeRectsChange,
    });

    // Подключаем логику выделения (визуальные эффекты)
    useGraphSelection(containerRef, mapRef, selectedId, mainId, renderVersion);

    const handleGraphClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const nodeId = findNodeByElement(target);
        if (nodeId) onSelect?.(selectedId === nodeId ? null : nodeId);
        else onSelect?.(null);
        e.stopPropagation();
        hideContextMenu();
    };

    const handleGraphDoubleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const nodeId = findNodeByElement(target);
        if (nodeId) onDoubleClick?.(nodeId);
    };

    function findNodeByElement(target: HTMLElement) {
        const groupElement = target.closest('g.node, g.cluster');
        if (groupElement) {
            const id = groupElement.getAttribute('id');
            if (id) return mapRef.current?.domIdToIdMap.get(id);
        }
    }
    const clickHandlers = useIgnoreClickOnDrag();

    return (
        <>
            <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={4}
                limitToBounds={false}
                alignmentAnimation={{disabled: true}}
                velocityAnimation={{disabled: true}}
                centerOnInit={true}
                panning={{velocityDisabled: true}}
                doubleClick={{disabled: true}}
                ref={transformComponentRef}
            >
                <TransformComponent wrapperStyle={{width: '100%', height: '100%'}}>
                    <div
                        className={classes.svg}
                        ref={containerRef}
                        style={{width: '100%', height: '100%'}}
                        {...clickHandlers}
                        onClick={handleGraphClick}
                        onDoubleClick={handleGraphDoubleClick}
                        onContextMenu={handleContextMenu}
                    />
                </TransformComponent>
            </TransformWrapper>
            <Menu id={MENU_ID}>
                {menuItems.map((item, i) => (
                    <Item key={i} onClick={item.onClick} disabled={item.disabled}>
                        <div className={classes.ctxMenuItem}>
                            {item.label}{' '}
                            {item.hotkey && (
                                <span className={classes.ctxMenuItemHotkey}>{item.hotkey.join(' + ')}</span>
                            )}
                        </div>
                    </Item>
                ))}
            </Menu>
        </>
    );
};

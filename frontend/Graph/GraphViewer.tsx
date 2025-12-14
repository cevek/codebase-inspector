import {Graphviz} from '@hpcc-js/wasm';
import * as React from 'react';
import {Item, Menu, useContextMenu} from 'react-contexify';
import {ReactZoomPanPinchContentRef, TransformComponent, TransformWrapper} from 'react-zoom-pan-pinch';
import {Id} from '../../types';
import {Graph} from './Graph';
import classes from './GraphViewer.module.css';
import {useIgnoreClickOnDrag} from './hooks/useIgnoreDraggin';
import {generateGraphviz} from './utils/generateGraphviz';
import {animateRawAttributes, createAttributeSnapshot, RawSnapshot} from './utils/svgAnimate';
import {assignStableIds} from './utils/assignStableIds';
import {HotKeyView} from './HotKeyView/HotKeyView';
const graphviz = await Graphviz.load();
export type LayoutDirection = 'TB' | 'LR';

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
    const mapRef = React.useRef<{
        domIdToIdMap: Map<string, Id>;
        idToDomIdMap: Map<Id, string>;
    }>({
        domIdToIdMap: new Map(),
        idToDomIdMap: new Map(),
    });
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
    const getGraphNodesRects = React.useCallback((): Rect[] => {
        if (!containerRef.current) return [];
        const nodeElements = Array.from(containerRef.current.querySelectorAll<SVGGElement>('g.node[id]'));
        return nodeElements
            .map<Rect | null>((el) => {
                const id = mapRef.current.domIdToIdMap.get(el.id);
                if (!id) return null;
                const rect = el.getBoundingClientRect();
                return {
                    id,
                    cx: rect.left + rect.width / 2,
                    cy: rect.top + rect.height / 2,
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                };
            })
            .filter((r): r is Rect => !!r);
    }, [containerRef]);
    const [menuItems, setMenuItems] = React.useState<ContextMenuItem[]>([]);
    const transformComponentRef = React.useRef<ReactZoomPanPinchContentRef>(null);

    React.useLayoutEffect(() => {
        let isMounted = true;

        const renderGraph = () => {
            try {
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

                let snapshot: RawSnapshot | undefined;
                const currentSvg = container.firstElementChild as SVGSVGElement;

                if (currentSvg && container.innerHTML.length < 100000) {
                    snapshot = createAttributeSnapshot(currentSvg);
                }

                container.innerHTML = svgString;
                const newSvg = container.firstElementChild as SVGSVGElement;
                const rects = getGraphNodesRects();
                onNodeRectsChange?.(rects);

                if (snapshot && newSvg) {
                    newSvg.style.opacity = '0';
                }

                if (newSvg) {
                    assignStableIds(newSvg);
                    newSvg.querySelectorAll('title').forEach((el) => el.remove());
                }

                if (snapshot && newSvg) {
                    animateRawAttributes(newSvg, snapshot);
                } else if (newSvg) {
                    newSvg.style.opacity = '1';
                }
            } catch (err) {
                console.error('Graph render failed:', err);
            }
        };

        renderGraph();
        reselectMainId();
        reselectSelection();
        transformComponentRef.current?.centerView();

        console.log('redraw graph');

        return () => {
            isMounted = false;
        };
    }, [graph, groupByModules, layoutDirection]);

    React.useEffect(() => {
        console.log('effect reselectSelection', selectedId);
        reselectSelection();
    }, [selectedId]);

    React.useEffect(() => {
        reselectMainId();
    }, [mainId]);

    function reselectSelection() {
        if (containerRef.current) {
            const previouslySelected = containerRef.current.querySelectorAll('.' + classes.selected);
            previouslySelected.forEach((el) => el.classList.remove(classes.selected));
            const previouslySelectedEdges = containerRef.current.querySelectorAll('.' + classes.selectedEdge);
            previouslySelectedEdges.forEach((el) => el.classList.remove(classes.selectedEdge));
        }
        if (selectedId && containerRef.current) {
            const element = containerRef.current.querySelector(`#${mapRef.current?.idToDomIdMap.get(selectedId)}`);
            element?.classList.add(classes.selected);

            const edges = containerRef.current.querySelectorAll(
                `[id^="${selectedId}__"], [id^="${selectedId}_trigger__"],[id^="${selectedId}_success__"], [id^="${selectedId}_error__"], [id$="__${selectedId}"], [id$="__${selectedId}_trigger"],[id$="__${selectedId}_success"], [id$="__${selectedId}_error"]`,
            );
            for (const edge of edges) {
                edge.classList.add(classes.selectedEdge);
            }
        }
    }
    function reselectMainId() {
        if (containerRef.current) {
            if (mainId) {
                const element = containerRef.current.querySelector(`#${mapRef.current?.idToDomIdMap.get(mainId)}`);
                element?.classList.add(classes.mainNode);
            } else {
                const element = containerRef.current.querySelector(`.${classes.mainNode}`);
                element?.classList.remove(classes.mainNode);
            }
        }
    }

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

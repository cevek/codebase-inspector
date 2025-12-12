import {Graphviz} from '@hpcc-js/wasm';
import * as React from 'react';
import {Item, Menu, useContextMenu} from 'react-contexify';
import {ReactZoomPanPinchContentRef, TransformComponent, TransformWrapper} from 'react-zoom-pan-pinch';
import {Id} from '../../types';
import {Graph} from './Graph';
import classes from './GraphViewer.module.css';
import {useIgnoreClickOnDrag} from './hooks/useIgnoreDraggin';
import {generateGraphviz} from './utils/generateGraphviz';
const graphviz = await Graphviz.load();

export type LayoutDirection = 'TB' | 'LR';

export type ContextMenuItem = {
    label: string;
    disabled?: boolean;
    onClick: () => void;
};
const MENU_ID = 'graph_context_menu';

export type ContextMenuCb = (id: Id) => ContextMenuItem[];

export const GraphViewer: React.FC<{
    graph: Graph;
    selectedId: Id | null;
    mainId: Id | null;
    onSelect?: (id: Id | null) => void;
    onDoubleClick?: (id: Id) => void;
    groupByModules: boolean;
    onContextMenuOpen?: (id: Id) => ContextMenuItem[];
    layoutDirection?: LayoutDirection;
}> = ({
    graph,
    selectedId,
    mainId,
    onContextMenuOpen,
    onSelect,
    onDoubleClick,
    groupByModules,
    layoutDirection = 'TB',
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [{domIdToIdMap, idToDomIdMap}, setMap] = React.useState<{
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
    const [menuItems, setMenuItems] = React.useState<ContextMenuItem[]>([]);
    const transformComponentRef = React.useRef<ReactZoomPanPinchContentRef>(null);
    React.useEffect(() => {
        const renderGraph = async () => {
            try {
                const {dotString, domIdToIdMap, idToDomIdMap} = generateGraphviz(
                    graph,
                    groupByModules,
                    layoutDirection,
                );
                setMap({domIdToIdMap, idToDomIdMap});
                const svg = graphviz.layout(dotString, 'svg', 'dot');
                containerRef.current!.innerHTML = svg;
                for (const el of containerRef.current!.querySelectorAll('title')) {
                    el.remove();
                }
            } catch (err) {
                console.error(err);
            }
        };

        renderGraph();
        reselectMainId();
        reselectSelection();
    }, [graph, groupByModules, layoutDirection]);

    React.useEffect(() => {
        reselectSelection();
    }, [selectedId]);

    React.useEffect(() => {
        reselectMainId();
    }, [mainId, idToDomIdMap]);

    function reselectSelection() {
        if (containerRef.current) {
            const previouslySelected = containerRef.current.querySelectorAll('.' + classes.selected);
            previouslySelected.forEach((el) => el.classList.remove(classes.selected));
            const previouslySelectedEdges = containerRef.current.querySelectorAll('.' + classes.selectedEdge);
            previouslySelectedEdges.forEach((el) => el.classList.remove(classes.selectedEdge));
        }
        if (selectedId && containerRef.current) {
            const element = containerRef.current.querySelector(`#${idToDomIdMap.get(selectedId)}`);
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
                const element = containerRef.current.querySelector(`#${idToDomIdMap.get(mainId)}`);
                element?.classList.add(classes.mainNode);
            } else {
                const element = containerRef.current.querySelector(`.${classes.mainNode}`);
                element?.classList.remove(classes.mainNode);
            }
            transformComponentRef.current?.centerView();
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
            if (id) return domIdToIdMap.get(id);
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
                        {item.label}
                    </Item>
                ))}
            </Menu>
        </>
    );
};

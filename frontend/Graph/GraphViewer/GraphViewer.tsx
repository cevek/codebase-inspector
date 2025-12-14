import * as React from 'react';
import {Item, Menu, useContextMenu} from 'react-contexify';
import {ReactZoomPanPinchContentRef, TransformComponent, TransformWrapper} from 'react-zoom-pan-pinch';
import {Graph} from '../Graph';
import {LayoutDirection, Id} from '../types';
import classes from './GraphViewer.module.css';
import {useIgnoreClickOnDrag} from './hooks/useIgnoreDraggin';
import {ContextMenuCb, ContextMenuItem, Rect} from './types';
import {useGraphSelection} from './hooks/useGraphSelection';
import {useGraphRender} from './hooks/useGraphRender';

const MENU_ID = 'graph_context_menu';

export const GraphViewer: React.FC<{
    graph: Graph;
    initialGraph: Graph;
    selectedId: Id | null;
    mainId: Id | null;
    onSelect?: (id: Id | null) => void;
    onDoubleClick?: (id: Id) => void;
    groupByModules: boolean;
    onContextMenuOpen?: ContextMenuCb;
    layoutDirection?: LayoutDirection;
    onNodeRectsChange?: (rects: Rect[]) => void;
}> = ({
    graph,
    selectedId,
    mainId,
    initialGraph,
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

    const {mapRef, renderVersion} = useGraphRender({
        containerRef,
        graph,
        initialGraph,
        groupByModules,
        layoutDirection,
        transformComponentRef,
        onNodeRectsChange,
    });

    useGraphSelection(containerRef, mapRef, selectedId, mainId, renderVersion, {
        selected: classes.selected,
        selectedEdge: classes.selectedEdge,
        mainNode: classes.mainNode,
    });

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

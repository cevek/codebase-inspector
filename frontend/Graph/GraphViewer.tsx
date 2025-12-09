import {Graphviz} from '@hpcc-js/wasm';
import * as React from 'react';
import {ReactZoomPanPinchContentRef, TransformComponent, TransformWrapper} from 'react-zoom-pan-pinch';
import {generateGraphviz} from './utils/generateGraphviz';
import classes from './GraphViewer.module.css';
import {Cluster, Graph, Id} from '../../types';
import {useIgnoreClickOnDrag} from './hooks/useIgnoreDraggin';
const graphviz = await Graphviz.load();

export type LayoutDirection = 'TB' | 'LR';

export const GraphViewer: React.FC<{
    graph: Graph;
    clusters: Map<Id, Cluster>;
    selectedId: Id | null;
    mainId: Id | null;
    onSelect?: (id: Id | null) => void;
    onDoubleClick?: (id: Id) => void;
    layoutDirection?: LayoutDirection;
}> = ({graph, clusters, selectedId, mainId, onSelect, onDoubleClick, layoutDirection = 'TB'}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [{domIdToIdMap, idToDomIdMap}, setMap] = React.useState<{
        domIdToIdMap: Map<string, Id>;
        idToDomIdMap: Map<Id, string>;
    }>({
        domIdToIdMap: new Map(),
        idToDomIdMap: new Map(),
    });
    const transformComponentRef = React.useRef<ReactZoomPanPinchContentRef>(null);
    React.useEffect(() => {
        const renderGraph = async () => {
            try {
                const {dotString, domIdToIdMap, idToDomIdMap} = generateGraphviz(graph, clusters, layoutDirection);
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
    }, [graph, clusters, layoutDirection]);

    React.useEffect(() => {
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
                `[id^="${selectedId}__"], [id^="${selectedId}_success__"], [id^="${selectedId}_error__"], [id$="__${selectedId}"], [id$="__${selectedId}_success"], [id$="__${selectedId}_error"]`,
            );
            for (const edge of edges) {
                edge.classList.add(classes.selectedEdge);
            }
        }
    }, [selectedId]);

    React.useEffect(() => {
        if (containerRef.current) {
            if (mainId) {
                console.log(idToDomIdMap.get(mainId));
                const element = containerRef.current.querySelector(`#${idToDomIdMap.get(mainId)}`);
                element?.classList.add(classes.mainNode);
            } else {
                const element = containerRef.current.querySelector(`.${classes.mainNode}`);
                element?.classList.remove(classes.mainNode);
            }
            transformComponentRef.current?.centerView();
        }
    }, [mainId, idToDomIdMap]);

    const handleGraphClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const nodeId = findNodeByElement(target);
        if (nodeId) onSelect?.(selectedId === nodeId ? null : nodeId);
        else onSelect?.(null);
        e.stopPropagation();
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
                />
            </TransformComponent>
        </TransformWrapper>
    );
};

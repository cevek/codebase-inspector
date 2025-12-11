import {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {Graph, Id} from '../../types';
import {GraphViewer, LayoutDirection} from './GraphViewer';
import {useIde} from './hooks/useIde';
import {usePersistentState} from './hooks/usePersistentState';
import {Sidebar} from './Sidebar/Sidebar';
import {generateGraphClusters} from './utils/generateGraphClusters';
import {getSubgraph} from './utils/getSubgraph';
import {prettifyName} from './utils/prettifyName';
import {removeNodeRecursive} from './utils/removeNodeRecursive';
import {EnrichedGraph} from './types';
import {enrichGraph} from './utils/enrichGraph';

export const App: React.FC<{data: EnrichedGraph}> = ({data: initialData}) => {
    const [selectedId, setSelectedId] = useState<Id | null>(null);
    const [removedIds, setRemovedIds] = usePersistentState<Id[]>({key: 'removedIds'}, []);
    const [focusId, setFocusId] = usePersistentState<Id | null>({key: 'focusId'}, null);
    const [graphData, setGraphData] = useState(initialData);
    const [editHistory, setEditHistory] = useState<{removedId: Id}[]>([]);
    const {selectedIde, setSelectedIde, ideOptions, handleOpenFileInIde} = useIde(graphData.graph);
    const [layoutDirection, setLayoutDirection] = usePersistentState<LayoutDirection>({key: 'layoutDirection'}, 'LR');

    useLayoutEffect(() => {
        let newGraph = initialData.graph;
        for (const someId of removedIds) {
            const node = initialData.graph.nodes.get(someId);
            if (node) {
                newGraph = removeNodeRecursive(newGraph, someId, (n) => n.location.module === node.location.module);
            } else {
                let newGraph2 = newGraph;
                const cluster = initialData.clusters.get(someId);
                if (cluster) {
                    for (const [id, node] of newGraph.nodes) {
                        if (
                            node.location.module === cluster.name ||
                            node.location.module.startsWith(cluster.name + '/')
                        ) {
                            newGraph2 = removeNodeRecursive(
                                newGraph2,
                                id,
                                (n) => n.location.module === node.location.module,
                            );
                        }
                    }
                }
                newGraph = newGraph2;
            }
        }
        if (focusId) {
            newGraph = getSubgraph(newGraph, focusId);
        }
        // console.log(enrichGraph(newGraph));
        setGraphData(enrichGraph(newGraph));
    }, [removedIds, focusId, initialData]);

    useEffect(() => {
        setSelectedId(null);
    }, [graphData]);

    useEffect(() => {
        const handleGraphKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                if (selectedId) {
                    const newRemovedIds = [...removedIds, selectedId];
                    setRemovedIds(newRemovedIds);
                    setEditHistory([{removedId: selectedId}, ...editHistory]);
                    setSelectedId(null);
                }
            }
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                if (editHistory.length === 0) return;
                const [lastHistoryItem, ...newHistoryEdit] = editHistory.slice().reverse();
                const newRemovedIds = removedIds.filter((v) => v !== lastHistoryItem.removedId);
                setRemovedIds(newRemovedIds);
                setEditHistory(newHistoryEdit);
            }
        };
        document.addEventListener('keydown', handleGraphKeyDown);
        return () => document.removeEventListener('keydown', handleGraphKeyDown);
    }, [selectedId, removedIds, editHistory, setRemovedIds]);

    const handleRestoreId = (idToRestore: string) => {
        setRemovedIds(removedIds.filter((id) => id !== idToRestore));
    };
    const handleRestoreAll = () => {
        setRemovedIds([]);
    };

    function generateNodeName(id: Id | null, prettify = true) {
        if (!id) return null;
        const node = initialData.graph.nodes.get(id);
        if (node)
            return prettify
                ? prettifyName(node.location.module + '/' + node.name)
                : node.location.module + '/' + node.name;
    }
    function generateClusterName(id: Id, prettify = true) {
        const cluster = initialData.clusters.get(id);
        if (cluster) return prettify ? prettifyName(cluster.name) : cluster.name;
    }

    const handleFocusNode = () => {
        setFocusId(selectedId);
    };
    const handleClearFocusNode = () => {
        setFocusId(null);
    };

    const selectedNode = selectedId ? initialData.graph.nodes.get(selectedId) ?? null : null;
    const embeddedNodes =
        selectedId && selectedNode?.type === 'epic'
            ? graphData.embeddedNodesMap.epicToActionsMap.get(selectedId)
            : null;
    const triggerAction = embeddedNodes?.find((v) => v.portName === 'trigger');
    const successAction = embeddedNodes?.find((v) => v.portName === 'success');
    const errorAction = embeddedNodes?.find((v) => v.portName === 'error');

    return (
        <div style={{width: '100%', height: '100%'}}>
            <div onClick={() => setSelectedId(null)}>
                <GraphViewer
                    graph={graphData.graph}
                    embeddedNodesMap={graphData.embeddedNodesMap}
                    clusters={graphData.clusters}
                    onSelect={setSelectedId}
                    onDoubleClick={handleOpenFileInIde}
                    selectedId={selectedId}
                    layoutDirection={layoutDirection}
                    mainId={focusId}
                />
            </div>
            <Sidebar
                path={
                    selectedId
                        ? (
                              generateNodeName(selectedId, false) ??
                              generateClusterName(selectedId, false) ??
                              selectedId
                          ).split('/')
                        : null
                }
                focusNode={generateNodeName(focusId, true) ?? null}
                removedNodes={removedIds.map((id) => ({
                    id,
                    name: generateNodeName(id, true) ?? generateClusterName(id, true) ?? id,
                }))}
                nodeDetails={[
                    selectedNode?.type === 'epic' && selectedNode.apiCall.requests.length > 0 ? (
                        <div>
                            {selectedNode.apiCall.requests[0].type} {selectedNode.apiCall.requests[0].url}
                        </div>
                    ) : null,
                    triggerAction ? (
                        <div>
                            Trigger Action 📍<div>{generateNodeName(triggerAction.subId, true)}</div>
                        </div>
                    ) : null,
                    successAction ? (
                        <div>
                            Success Action ✔ <div>{generateNodeName(successAction.subId, true)}</div>
                        </div>
                    ) : null,
                    errorAction ? (
                        <div>
                            Error Action ✖ <div>{generateNodeName(errorAction.subId, true)}</div>
                        </div>
                    ) : null,
                ].filter((v) => v !== null)}
                layoutDirection={layoutDirection}
                ideOptions={ideOptions}
                selectedIde={selectedIde}
                onIdeChange={setSelectedIde}
                onLayoutChange={setLayoutDirection}
                onFocusSubtree={handleFocusNode}
                onClearFocus={handleClearFocusNode}
                onRestoreAll={handleRestoreAll}
                onRestoreNode={handleRestoreId}
            />
        </div>
    );
};

import {useEffect, useLayoutEffect, useState} from 'react';
import 'react-contexify/ReactContexify.css';
import {Id} from '../../types';
import {Graph} from './Graph';
import {ContextMenuCb, GraphViewer, LayoutDirection} from './GraphViewer';
import {useIde} from './hooks/useIde';
import {usePersistentState} from './hooks/usePersistentState';
import {Sidebar} from './Sidebar/Sidebar';
import {prettifyName} from './utils/prettifyName';
import {embedActionNodes} from './utils/analyzeEmbeddedNodes';
import {Direction} from './types';
import {SearchItem} from './Sidebar/Search/Search';

type Removing = {id: Id; dir: Direction};
type HistoryItem = {
    removedIds: Removing[];
    whiteListIds: Id[];
    selectedId: Id | null;
    focusId: Id | null;
    layoutDirection: LayoutDirection;
};

export const App: React.FC<{data: Graph}> = ({data: initialData}) => {
    const [selectedId, setSelectedId] = useState<Id | null>(null);
    const [removedIds, setRemovedIds] = usePersistentState<Removing[]>({key: 'removedIds'}, []);
    const [whiteListIds, setWhiteListIds] = useState<Id[]>([]);
    const [focusId, setFocusId] = usePersistentState<Id | null>({key: 'focusId'}, null);
    const [graphData, setGraphData] = useState(initialData);
    const [editHistory, setEditHistory] = useState<HistoryItem[]>([]);
    const {selectedIde, setSelectedIde, ideOptions, handleOpenFileInIde} = useIde(graphData);
    const [layoutDirection, setLayoutDirection] = usePersistentState<LayoutDirection>({key: 'layoutDirection'}, 'LR');
    const [groupByModules, setGroupByModules] = usePersistentState<boolean>({key: 'groupByModules'}, false);

    useLayoutEffect(() => {
        let newGraph = initialData.clone();
        embedActionNodes(newGraph);

        for (const {id: removedId, dir} of removedIds) {
            const node = initialData.nodes.get(removedId);
            if (node) {
                newGraph.removeNodeRecursive(
                    removedId,
                    dir,
                    whiteListIds,
                    undefined,
                    // (n, id) => id === removedId || n.location.module === node.location.module,
                );
            } else {
                const cluster = initialData.clusters.get(removedId);
                if (cluster) {
                    for (const [id, node] of newGraph.nodes) {
                        if (
                            node.location.module === cluster.name ||
                            node.location.module.startsWith(cluster.name + '/')
                        ) {
                            if (!whiteListIds.includes(id)) newGraph.removeNode(id);
                        }
                    }
                }
            }
        }
        if (focusId && newGraph.nodes.has(focusId)) {
            newGraph.removeAllExceptSubgraph(focusId, whiteListIds);
        }
        console.log({newGraph});
        setGraphData(newGraph);
    }, [removedIds, whiteListIds, focusId, initialData]);

    useEffect(() => {
        const handleGraphKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                if (selectedId) {
                    const dir = e.shiftKey ? ('backward' as const) : ('forward' as const);
                    handleRemove(selectedId, dir);
                }
            }
            if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
                if (selectedId) handleReveal(selectedId, 'backward');
            }
            if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
                if (selectedId) handleReveal(selectedId, 'forward');
            }
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                handleUndo();
            }
        };
        document.addEventListener('keydown', handleGraphKeyDown);
        return () => document.removeEventListener('keydown', handleGraphKeyDown);
    }, [selectedId, removedIds, editHistory, setRemovedIds]);

    const handleRestoreId = (idToRestore: string) => {
        setRemovedIds(removedIds.filter(({id}) => id !== idToRestore));
    };
    const handleRestoreAll = () => {
        setRemovedIds([]);
    };

    function generateNodeName(id: Id | null, prettify = true): Id | null {
        if (!id) return null;
        const node = initialData.nodes.get(id);
        if (node)
            return prettify
                ? (prettifyName(node.location.module + '/' + node.name) as Id)
                : ((node.location.module + '/' + node.name) as Id);
        return null;
    }
    function generateClusterName(id: Id, prettify = true) {
        const cluster = initialData.clusters.get(id);
        if (cluster) return prettify ? prettifyName(cluster.name) : cluster.name;
    }

    function saveUndoState() {
        setEditHistory([
            ...editHistory,
            {
                focusId,
                layoutDirection,
                removedIds,
                selectedId,
                whiteListIds,
            },
        ]);
    }

    function handleUndo() {
        const lastItem = editHistory.at(-1);
        if (lastItem) {
            setFocusId(lastItem.focusId);
            setLayoutDirection(lastItem.layoutDirection);
            setRemovedIds(lastItem.removedIds);
            setSelectedId(lastItem.selectedId);
            setWhiteListIds(lastItem.whiteListIds);
            setEditHistory([...editHistory.slice(0, -1)]);
        }
    }

    const handleFocusNode = (nodeId: Id | null) => {
        saveUndoState();

        setFocusId(nodeId);
        setWhiteListIds([]);
    };

    function handleRemove(nodeId: Id, dir: Direction) {
        saveUndoState();

        const nodes = graphData.findRecursive(nodeId, dir);
        const whiteListSet = new Set(whiteListIds);
        const newRemovedIds = removedIds.slice();
        for (const id of nodes) {
            if (whiteListSet.has(id)) {
                whiteListSet.delete(id);
            }
        }
        newRemovedIds.push({id: nodeId, dir});
        setWhiteListIds([...whiteListSet]);
        setRemovedIds(newRemovedIds);
        setSelectedId(null);
    }

    function handleReveal(nodeId: Id, dir: Direction) {
        saveUndoState();

        const sources = dir === 'backward' ? initialData.findParents(nodeId) : initialData.findChildren(nodeId);
        const set = new Set([...whiteListIds, ...sources.map((v) => v.from)]);
        setWhiteListIds([...set]);
    }

    const selectedNode = selectedId ? initialData.nodes.get(selectedId) ?? null : null;
    // const triggerActionPM =
    //     selectedId &&
    //     graphData.reverseRelationsMap
    //         .get(selectedId)
    //         ?.find((v) => selectedId + ':trigger' === graphData.getRedirectedNodeId(v.from));
    // const successActionPM =
    //     selectedId &&
    //     graphData.relationsMap
    //         .get(selectedId)
    //         ?.find((v) => selectedId + ':success' === graphData.getRedirectedNodeId(v.to));
    // const errorActionPM =
    //     selectedId &&
    //     graphData.relationsMap
    //         .get(selectedId)
    //         ?.find((v) => selectedId + ':error' === graphData.getRedirectedNodeId(v.to));

    const handleContextMenuOpen: ContextMenuCb = (id: Id) => {
        return [
            {
                label: 'Focus subtree',
                onClick: () => {
                    setFocusId(id);
                },
            },
            {
                label: 'Reveal backward',
                onClick: () => {
                    handleReveal(id, 'backward');
                },
            },
            {
                label: 'Reveal forward',
                onClick: () => {
                    handleReveal(id, 'forward');
                },
            },
            {
                label: 'Delete backward',
                onClick: () => {
                    handleRemove(id, 'backward');
                },
            },
            {
                label: 'Delete forward',
                onClick: () => {
                    handleRemove(id, 'forward');
                },
            },
        ];
    };

    return (
        <div style={{width: '100%', height: '100%'}}>
            <div onClick={() => setSelectedId(null)}>
                <GraphViewer
                    graph={graphData}
                    onSelect={setSelectedId}
                    onDoubleClick={handleOpenFileInIde}
                    selectedId={selectedId}
                    layoutDirection={layoutDirection}
                    groupByModules={groupByModules}
                    mainId={focusId}
                    onContextMenuOpen={handleContextMenuOpen}
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
                focusNode={focusId}
                removedNodes={removedIds
                    .map(({id, dir}) => ({
                        id,
                        dir,
                        name: generateNodeName(id, true) ?? generateClusterName(id, true) ?? id,
                    }))
                    .reverse()}
                nodeDetails={[
                    // selectedNode?.type === 'epic' && selectedNode.apiCall.requests.length > 0 ? (
                    //     <div>
                    //         {selectedNode.apiCall.requests[0].type} {selectedNode.apiCall.requests[0].url}
                    //     </div>
                    // ) : null,
                    // triggerActionPM ? (
                    //     <div>
                    //         Trigger Action 📍<div>{generateNodeName(triggerActionPM.from, true)}</div>
                    //     </div>
                    // ) : null,
                    // successActionPM ? (
                    //     <div>
                    //         Success Action ✔ <div>{generateNodeName(successActionPM.to, true)}</div>
                    //     </div>
                    // ) : null,
                    // errorActionPM ? (
                    //     <div>
                    //         Error Action ✖ <div>{generateNodeName(errorActionPM.to, true)}</div>
                    //     </div>
                    // ) : null,
                ].filter((v) => v !== null)}
                searchItems={[...initialData.nodes.entries()].map<SearchItem>(([id, node]) => ({
                    fileName: node.location.url,
                    module: node.location.module,
                    name: node.name,
                    id,
                }))}
                onFocusNode={handleFocusNode}
                layoutDirection={layoutDirection}
                ideOptions={ideOptions}
                selectedIde={selectedIde}
                onIdeChange={setSelectedIde}
                onLayoutChange={setLayoutDirection}
                onFocusSubtree={() => selectedId && handleFocusNode(selectedId)}
                onRestoreAll={handleRestoreAll}
                onRestoreNode={handleRestoreId}
                groupByModules={groupByModules}
                onGroupByModulesChange={setGroupByModules}
            />
        </div>
    );
};

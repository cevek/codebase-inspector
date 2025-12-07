import {useEffect, useLayoutEffect, useState} from 'react';
import {Graph, Id} from '../../types';
import classes from './App.module.css';
import {GraphViewer, LayoutDirection} from './GraphViewer';
import {useIde} from './hooks/useIde';
import {usePersistentState} from './hooks/usePersistentState';
import {removeNodeRecursive} from './utils/removeNodeRecursive';

export const App: React.FC<{data: Graph}> = ({data: initialData}) => {
    const [selectedId, setSelectedId] = useState<Id | null>(null);
    const [removedIds, setRemovedIds] = usePersistentState<Id[]>({key: 'removedIds'}, []);
    const [graphData, setGraphData] = useState(initialData);
    const [editHistory, setEditHistory] = useState<{removedId: Id}[]>([]);
    const {selectedIde, setSelectedIde, ideOptions, handleOpenFileInIde} = useIde(graphData);
    const [layoutDirection, setLayoutDirection] = usePersistentState<LayoutDirection>({key: 'layoutDirection'}, 'TB');

    useLayoutEffect(() => {
        let newGraph = initialData;
        for (const someId of removedIds) {
            const node = newGraph.nodes.get(someId);
            if (node) {
                newGraph = removeNodeRecursive(newGraph, someId, (n) => n.location.module === node.location.module);
            } else {
                let newGraph2 = newGraph;
                for (const [id, node] of newGraph.nodes) {
                    if (node.location.module === someId || node.location.module.startsWith(someId + '/')) {
                        newGraph2 = removeNodeRecursive(
                            newGraph2,
                            id as Id,
                            (n) => n.location.module === node.location.module,
                        );
                    }
                }
                newGraph = newGraph2;
            }
        }
        setGraphData(newGraph);
    }, [removedIds, initialData]);

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

    const selectedNode = selectedId ? graphData.nodes.get(selectedId) : null;

    return (
        <div style={{width: '100%', height: '100%'}}>
            <GraphViewer
                data={graphData}
                onSelect={setSelectedId}
                onDoubleClick={handleOpenFileInIde}
                selectedId={selectedId}
                layoutDirection={layoutDirection}
            />

            <div className={classes.sidebar}>
                <div className={classes.selected}>
                    <h3>{selectedId?.replaceAll('/', ' › ') || 'Nothing selected'}</h3>
                    {selectedNode?.type === 'epic' && selectedNode.apiCall.requests.length > 0 && (
                        <div className={classes.apiCall}>
                            {selectedNode.apiCall.requests[0].type} {selectedNode.apiCall.requests[0].url}
                        </div>
                    )}
                </div>

                <div className={classes.ideSelector}>
                    <h4>Open in IDE:</h4>
                    <select value={selectedIde} onChange={(e) => setSelectedIde(e.target.value as any)}>
                        {ideOptions.map((ide) => (
                            <option key={ide.value} value={ide.value}>
                                {ide.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={classes.ideSelector}>
                    <h4>Layout:</h4>
                    <select
                        value={layoutDirection}
                        onChange={(e) => setLayoutDirection(e.target.value as LayoutDirection)}
                    >
                        <option value="TB">Top-to-Bottom</option>
                        <option value="LR">Left-to-Right</option>
                    </select>
                </div>

                {removedIds.length > 0 && (
                    <div className={classes.removedList}>
                        <div className={classes.removedListHeader}>
                            <h4>Removed Nodes: </h4>
                            <button onClick={handleRestoreAll}>Restore All</button>
                        </div>
                        <div className={classes.removedListScroll}>
                            {removedIds
                                .slice()
                                .reverse()
                                .map((id) => (
                                    <div key={id} className={classes.removedItem}>
                                        <span>{id}</span>
                                        <button onClick={() => handleRestoreId(id)}>Restore</button>
                                    </div>
                                ))}
                            {removedIds.length === 0 && <small>None</small>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

import {useEffect, useLayoutEffect, useState} from 'react';
import classes from './App.module.css';
import {GraphViewer} from './GraphViewer';
import {usePersistentState} from './hooks/usePersistentState';
import {generateGraphClusters} from './utils/generateGraphClusters';
import {removeNodeRecursive} from './utils/removeNodeRecursive';
import {Graph, Id} from '../../types';

export const App: React.FC<{data: Graph}> = ({data: initialData}) => {
    const [selectedId, setSelectedId] = useState<Id | null>(null);
    const [removedIds, setRemovedIds] = usePersistentState<Id[]>('removedIds', []);
    const [graphData, setGraphData] = useState(initialData);

    useLayoutEffect(() => {
        let newGraph = graphData;
        for (const someId of removedIds) {
            const node = newGraph.nodes.get(someId);
            if (node) {
                newGraph = removeNodeRecursive(newGraph, someId, (n) => n.location.module === node.location.module);
            } else {
                let newGraph2 = newGraph;
                for (const [id, node] of newGraph.nodes) {
                    if (node.location.module.startsWith(someId)) {
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
                    setSelectedId(null);
                }
            }
        };
        document.addEventListener('keydown', handleGraphKeyDown);
        return () => document.removeEventListener('keydown', handleGraphKeyDown);
    }, [selectedId, removedIds, setRemovedIds]);

    const handleRestoreId = (idToRestore: string) => {
        setRemovedIds(removedIds.filter((id) => id !== idToRestore));
    };
    const handleRestoreAll = () => {
        setRemovedIds([]);
    };

    return (
        <div style={{width: '100%', height: '100%'}}>
            <GraphViewer data={graphData} onSelect={setSelectedId} selectedId={selectedId} />

            <div className={classes.sidebar}>
                <div className={classes.selected}>
                    <h2>Selected:</h2>
                    <div>{selectedId || 'None'}</div>
                </div>

                {removedIds.length > 0 && (
                    <div className={classes.removedList}>
                        <div className={classes.removedListHeader}>
                            <h4>Removed Nodes: </h4>
                            <button onClick={handleRestoreAll}>Restore All</button>
                        </div>
                        <div className={classes.removedListScroll}>
                            {removedIds.slice().reverse().map((id) => (
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

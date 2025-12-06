import {useEffect, useLayoutEffect, useState} from 'react';
import {removeClusterFromGraph} from './utils/removeClustersAndNodesFromGraph';
import {Graph} from './types';
import {GraphViewer} from './GraphViewer';
import classes from './App.module.css';
import {usePersistentState} from './hooks/usePersistentState';

export const App: React.FC<{data: Graph}> = ({data: initialData}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [removedIds, setRemovedIds] = usePersistentState<string[]>('removedIds', []);
    const [graphData, setGraphData] = useState(initialData);

    useLayoutEffect(() => {
        const newData = removeClusterFromGraph(initialData, removedIds);
        setGraphData(newData);
        console.log({newData, removedIds});
    }, [removedIds, initialData]);

    useEffect(() => {
        setSelectedId(null);
    }, [graphData]);

    useEffect(() => {
        const handleGraphKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                if (selectedId) {
                    const newRemovedIds = [...removedIds, selectedId.replace('group_', '').replaceAll('_', '/')];
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
                            {removedIds.map((id) => (
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

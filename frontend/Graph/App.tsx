import {useEffect, useState} from 'react';
import {removeClusterFromGraph} from './utils/removeClustersFromGraph';
import {Graph} from './types';
import {GraphViewer} from './GraphViewer';
import classes from './App.module.css';

export const App: React.FC<{data: Graph}> = ({data}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [data2, setData] = useState(data);
    useEffect(() => {
        setSelectedId(null);
    }, [data2]);

    const [removedIds, setRemovedIds] = useState<string[]>([]);

    useEffect(() => {
        const handleGraphKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                if (selectedId) {
                    const newRemovedIds = [...removedIds, selectedId.replace('group_', '').replaceAll('_', '/')];
                    setData(removeClusterFromGraph(data2, newRemovedIds));
                    setRemovedIds(newRemovedIds);
                    setSelectedId(null);
                }
            }
        };
        document.addEventListener('keydown', handleGraphKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGraphKeyDown);
        };
    }, [selectedId]);

    return (
        <div style={{width: '100%', height: '100%'}}>
            <GraphViewer data={data2} onSelect={setSelectedId} selectedId={selectedId} />

            <div className={classes.sidebar}>
                Selected: <b>{selectedId || 'None'}</b>
            </div>
        </div>
    );
};

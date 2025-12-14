import {useState, useCallback} from 'react';
import {Id} from '../../../../types';
import {Graph} from '../../Graph';
import {Direction, LayoutDirection} from '../../types';

export interface GraphViewState {
    selectedId: Id | null;
    focusId: Id | null;
    removedIds: Array<{id: Id; dir: Direction}>;
    whiteListIds: Id[];
    layoutDirection: LayoutDirection;
}

export const INITIAL_STATE: GraphViewState = {
    selectedId: null,
    focusId: null,
    removedIds: [],
    whiteListIds: [],
    layoutDirection: 'LR',
};

// Добавили второй аргумент `initialStateOverrides`
export const useGraphState = (initialGraph: Graph, initialStateOverrides?: Partial<GraphViewState>) => {
    // Инициализируем стейт сразу с учетом данных из URL (синхронно)
    const [state, setState] = useState<GraphViewState>(() => ({
        ...INITIAL_STATE,
        ...initialStateOverrides,
    }));

    const [history, setHistory] = useState<GraphViewState[]>([]);
    const [future, setFuture] = useState<GraphViewState[]>([]);

    const commit = useCallback((updater: (prev: GraphViewState) => Partial<GraphViewState>) => {
        setState((current) => {
            setHistory((prev) => [...prev, current]);
            setFuture([]);
            const changes = updater(current);
            return {...current, ...changes};
        });
    }, []);

    const undo = useCallback(() => {
        setHistory((prevHist) => {
            if (prevHist.length === 0) return prevHist;
            const previous = prevHist[prevHist.length - 1];
            setState((current) => {
                setFuture((prevFut) => [current, ...prevFut]);
                return previous;
            });
            return prevHist.slice(0, -1);
        });
    }, []);

    const redo = useCallback(() => {
        setFuture((prevFut) => {
            if (prevFut.length === 0) return prevFut;
            const next = prevFut[0];
            setState((current) => {
                setHistory((prevHist) => [...prevHist, current]);
                return next;
            });
            return prevFut.slice(1);
        });
    }, []);

    const actions = {
        selectNode: useCallback((id: Id | null) => {
            setState((s) => ({...s, selectedId: id}));
        }, []),

        focusNode: useCallback(
            (id: Id | null) => {
                commit(() => ({focusId: id, whiteListIds: []}));
            },
            [commit],
        ),

        changeLayout: useCallback(
            (dir: LayoutDirection) => {
                commit(() => ({layoutDirection: dir}));
            },
            [commit],
        ),

        removeNode: useCallback(
            (nodeId: Id, dir: Direction) => {
                commit((currentState) => {
                    const newWhiteList = new Set(currentState.whiteListIds);
                    let nodesToCheck: Set<Id> = new Set();
                    const cluster = initialGraph.clusters.get(nodeId);

                    if (cluster) {
                        nodesToCheck = new Set(cluster.nodes);
                    } else {
                        nodesToCheck = initialGraph.findRecursive(nodeId, dir);
                    }

                    for (const id of nodesToCheck) newWhiteList.delete(id);
                    newWhiteList.delete(nodeId);

                    return {
                        removedIds: [...currentState.removedIds, {id: nodeId, dir}],
                        whiteListIds: Array.from(newWhiteList),
                        selectedId: null,
                    };
                });
            },
            [commit, initialGraph],
        ),

        revealNode: useCallback(
            (nodeId: Id, dir: Direction) => {
                const sources =
                    dir === 'backward' ? initialGraph.findParents(nodeId) : initialGraph.findChildren(nodeId);
                if (sources.length === 0) return;
                commit((currentState) => {
                    const ids = sources.map((v) => (dir === 'backward' ? v.from : v.to));
                    const newWhiteList = new Set([...currentState.whiteListIds, ...ids]);
                    return {whiteListIds: Array.from(newWhiteList), selectedId: ids[0] || null};
                });
            },
            [commit, initialGraph],
        ),

        restoreNode: useCallback(
            (idToRestore: Id) => {
                commit((s) => ({removedIds: s.removedIds.filter((item) => item.id !== idToRestore)}));
            },
            [commit],
        ),

        restoreAll: useCallback(() => {
            commit(() => ({removedIds: []}));
        }, [commit]),
    };

    return {state, actions, history: {undo, redo, canUndo: history.length > 0, canRedo: future.length > 0}};
};

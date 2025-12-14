import {useState, useMemo} from 'react';
import {Id} from '../../../../types';
import {Graph} from '../../Graph';
import {Direction, LayoutDirection} from '../../types';
import {embedActionNodes} from '../../logic/embedActionNodes';
import {useEvent} from '../../hooks/useEvent';

export interface GraphViewState {
    selectedId: Id | null;
    focusId: Id | null;
    removedIds: Array<{id: Id; dir: Direction}>;
    whiteListIds: Id[];
    layoutDirection: LayoutDirection;
    embedSpecialActions: boolean;
    groupByModules: boolean;
}

export const INITIAL_STATE: GraphViewState = {
    selectedId: null,
    focusId: null,
    removedIds: [],
    whiteListIds: [],
    layoutDirection: 'LR',
    groupByModules: true,
    embedSpecialActions: true,
};

export const useGraphState = (rawInitialGraph: Graph, initialStateOverrides?: Partial<GraphViewState>) => {
    const [state, setState] = useState<GraphViewState>(() => ({
        ...INITIAL_STATE,
        ...initialStateOverrides,
    }));

    const initialGraph = useMemo(
        () => (state.embedSpecialActions ? embedActionNodes(rawInitialGraph) : rawInitialGraph),
        [rawInitialGraph, state.embedSpecialActions],
    );

    const [history, setHistory] = useState<GraphViewState[]>([]);
    const [future, setFuture] = useState<GraphViewState[]>([]);

    const commit = useEvent((updater: (prev: GraphViewState) => Partial<GraphViewState>) => {
        setState((current) => {
            setHistory((prev) => [...prev, current]);
            setFuture([]);
            const changes = updater(current);
            return {...current, ...changes};
        });
    });

    const undo = useEvent(() => {
        setHistory((prevHist) => {
            if (prevHist.length === 0) return prevHist;
            const previous = prevHist[prevHist.length - 1];
            setState((current) => {
                setFuture((prevFut) => [current, ...prevFut]);
                return previous;
            });
            return prevHist.slice(0, -1);
        });
    });

    const redo = useEvent(() => {
        setFuture((prevFut) => {
            if (prevFut.length === 0) return prevFut;
            const next = prevFut[0];
            setState((current) => {
                setHistory((prevHist) => [...prevHist, current]);
                return next;
            });
            return prevFut.slice(1);
        });
    });

    const selectNode = useEvent((id: Id | null) => {
        setState((s) => ({...s, selectedId: id}));
    });

    const focusNode = useEvent((id: Id | null) => {
        commit(() => ({focusId: id, whiteListIds: []}));
    });

    const changeLayout = useEvent((dir: LayoutDirection) => {
        commit(() => ({layoutDirection: dir}));
    });

    const changeEmbedSpecialActions = useEvent((embedSpecialActions: boolean) => {
        commit(() => ({embedSpecialActions}));
    });

    const removeNode = useEvent((nodeId: Id, dir: Direction) => {
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
    });

    const revealNode = useEvent((nodeId: Id, dir: Direction) => {
        const sources = dir === 'backward' ? initialGraph.findParents(nodeId) : initialGraph.findChildren(nodeId);
        if (sources.length === 0) return;
        commit((currentState) => {
            const ids = sources.map((v) => (dir === 'backward' ? v.from : v.to));
            const newWhiteList = new Set([...currentState.whiteListIds, ...ids]);
            return {whiteListIds: Array.from(newWhiteList), selectedId: ids[0] || null};
        });
    });

    const restoreNode = useEvent((idToRestore: Id) => {
        commit((s) => ({removedIds: s.removedIds.filter((item) => item.id !== idToRestore)}));
    });

    const restoreAll = useEvent(() => {
        commit(() => ({removedIds: []}));
    });

    const changeGroupByModules = useEvent((groupByModules: boolean) => {
        commit(() => ({groupByModules}));
    });

    const actions = useMemo(
        () => ({
            selectNode,
            focusNode,
            changeLayout,
            changeEmbedSpecialActions,
            removeNode,
            revealNode,
            restoreNode,
            restoreAll,
            changeGroupByModules,
        }),
        [],
    );

    return {
        state,
        actions,
        initialGraph,
        history: {undo, redo, canUndo: history.length > 0, canRedo: future.length > 0},
    };
};

import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import 'react-contexify/ReactContexify.css';
import {Id} from '../../types';
import {Graph} from './Graph';
import {ContextMenuCb, GraphViewer, LayoutDirection, Rect} from './GraphViewer';
import {useIde} from './hooks/useIde';
import {usePersistentState} from './hooks/usePersistentState';
import {SearchItem} from './Sidebar/Search/Search';
import {Sidebar} from './Sidebar/Sidebar';
import {ArrowDirection, Direction} from './types';
import {embedActionNodes} from './utils/analyzeEmbeddedNodes';
import {prettifyName} from './utils/prettifyName';

type Removing = {id: Id; dir: Direction};
type HistoryItem = {
    removedIds: Removing[];
    whiteListIds: Id[];
    selectedId: Id | null;
    focusId: Id | null;
    layoutDirection: LayoutDirection;
};

const getOppositeDirection = (dir: ArrowDirection): ArrowDirection => {
    switch (dir) {
        case 'left':
            return 'right';
        case 'right':
            return 'left';
        case 'up':
            return 'down';
        case 'down':
            return 'up';
    }
};

export const App: React.FC<{data: Graph}> = ({data: initialData}) => {
    const [selectedId, setSelectedId] = useState<Id | null>(null);
    const [removedIds, setRemovedIds] = usePersistentState<Removing[]>({key: 'removedIds'}, []);
    const [whiteListIds, setWhiteListIds] = useState<Id[]>([]);
    const [focusId, setFocusId] = usePersistentState<Id | null>({key: 'focusId'}, null);
    const [graphData, setGraphData] = useState(initialData);

    const [editHistory, setEditHistory] = useState<HistoryItem[]>([]);
    const [redoHistory, setRedoHistory] = useState<HistoryItem[]>([]);

    const {selectedIde, setSelectedIde, ideOptions, handleOpenFileInIde} = useIde(graphData);
    const [layoutDirection, setLayoutDirection] = usePersistentState<LayoutDirection>({key: 'layoutDirection'}, 'LR');
    const [groupByModules, setGroupByModules] = usePersistentState<boolean>({key: 'groupByModules'}, false);
    const [nodeRects, setNodeRects] = useState<Rect[]>([]);

    const [isUrlLoaded, setIsUrlLoaded] = useState(false);

    useEffect(() => {
        try {
            const hash = window.location.hash.slice(1);
            const params = new URLSearchParams(hash);

            let hasUpdates = false;

            const parseJsonParam = (key: string) => {
                const val = params.get(key);
                if (val) {
                    try {
                        return JSON.parse(val);
                    } catch (e) {
                        console.error('Error parsing url param', key);
                        return null;
                    }
                }
                return null;
            };

            const urlSelectedId = params.get('selectedId') as Id | null;
            if (urlSelectedId) {
                setSelectedId(urlSelectedId);
                hasUpdates = true;
            }

            const urlFocusId = params.get('focusId') as Id | null;
            if (urlFocusId) {
                setFocusId(urlFocusId);
                hasUpdates = true;
            }

            const urlLayoutDirection = params.get('layoutDirection') as LayoutDirection | null;
            if (urlLayoutDirection) {
                setLayoutDirection(urlLayoutDirection);
                hasUpdates = true;
            }

            const urlGroupByModules = params.get('groupByModules');
            if (urlGroupByModules !== null) {
                setGroupByModules(urlGroupByModules === 'true');
                hasUpdates = true;
            }

            const urlRemovedIds = parseJsonParam('removedIds');
            if (urlRemovedIds) {
                setRemovedIds(urlRemovedIds);
                hasUpdates = true;
            }

            const urlWhiteListIds = parseJsonParam('whiteListIds');
            if (urlWhiteListIds) {
                setWhiteListIds(urlWhiteListIds);
                hasUpdates = true;
            }
        } catch (e) {
            console.error('Failed to sync state from URL', e);
        } finally {
            setIsUrlLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!isUrlLoaded) return;

        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);

        if (selectedId) params.set('selectedId', selectedId);
        else params.delete('selectedId');

        if (focusId) params.set('focusId', focusId);
        else params.delete('focusId');

        params.set('layoutDirection', layoutDirection);
        params.set('groupByModules', String(groupByModules));

        if (removedIds.length > 0) params.set('removedIds', JSON.stringify(removedIds));
        else params.delete('removedIds');

        if (whiteListIds.length > 0) params.set('whiteListIds', JSON.stringify(whiteListIds));
        else params.delete('whiteListIds');

        window.location.hash = params.toString();
    }, [selectedId, focusId, layoutDirection, groupByModules, removedIds, whiteListIds, isUrlLoaded]);

    const lastKeyboardMove = useRef<{
        fromId: Id;
        toId: Id;
        direction: ArrowDirection;
    } | null>(null);

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

    const getCurrentSnapshot = (): HistoryItem => ({
        focusId,
        layoutDirection,
        removedIds,
        selectedId,
        whiteListIds,
    });

    function saveUndoState() {
        setEditHistory((prev) => [...prev, getCurrentSnapshot()]);
        setRedoHistory([]);
    }

    function handleUndo() {
        const lastItem = editHistory.at(-1);
        if (lastItem) {
            setRedoHistory((prev) => [...prev, getCurrentSnapshot()]);

            setFocusId(lastItem.focusId);
            setLayoutDirection(lastItem.layoutDirection);
            setRemovedIds(lastItem.removedIds);
            setSelectedId(lastItem.selectedId);
            setWhiteListIds(lastItem.whiteListIds);

            setEditHistory((prev) => prev.slice(0, -1));
        }
    }

    function handleRedo() {
        const nextItem = redoHistory.at(-1);
        if (nextItem) {
            setEditHistory((prev) => [...prev, getCurrentSnapshot()]);

            setFocusId(nextItem.focusId);
            setLayoutDirection(nextItem.layoutDirection);
            setRemovedIds(nextItem.removedIds);
            setSelectedId(nextItem.selectedId);
            setWhiteListIds(nextItem.whiteListIds);

            setRedoHistory((prev) => prev.slice(0, -1));
        }
    }

    useEffect(() => {
        const handleGraphKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Enter') {
                if (selectedId) {
                    handleFocusNode(selectedId);
                }
            }
            if (e.key === 'Backspace') {
                if (selectedId) {
                    const dir = e.shiftKey ? ('backward' as const) : ('forward' as const);
                    handleRemove(selectedId, dir);
                }
            }
            if (e.key === 'ArrowUp') {
                if (selectedId) {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) handleReveal(selectedId, 'backward');
                    else handleArrows(selectedId, 'up');
                }
            }
            if (e.key === 'ArrowDown') {
                if (selectedId) {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) handleReveal(selectedId, 'forward');
                    else handleArrows(selectedId, 'down');
                }
            }
            if (e.key === 'ArrowLeft') {
                if (selectedId) {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) handleReveal(selectedId, 'backward');
                    else handleArrows(selectedId, 'left');
                }
            }
            if (e.key === 'ArrowRight') {
                if (selectedId) {
                    if (e.ctrlKey || e.metaKey || e.shiftKey) handleReveal(selectedId, 'forward');
                    else handleArrows(selectedId, 'right');
                }
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
                e.preventDefault();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                handleRedo();
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', handleGraphKeyDown);
        return () => document.removeEventListener('keydown', handleGraphKeyDown);
    }, [selectedId, nodeRects, removedIds, editHistory, redoHistory, focusId, whiteListIds, layoutDirection]);

    useEffect(() => {
        const handleMouseClick = () => {
            lastKeyboardMove.current = null;
        };
        document.addEventListener('mousedown', handleMouseClick);
        return () => document.removeEventListener('mousedown', handleMouseClick);
    }, []);

    const handleRestoreId = (idToRestore: string) => {
        saveUndoState();
        setRemovedIds(removedIds.filter(({id}) => id !== idToRestore));
    };
    const handleRestoreAll = () => {
        saveUndoState();
        setRemovedIds([]);
    };

    const findNextNode = (currentId: Id, direction: ArrowDirection): Id | undefined => {
        const currentRect = nodeRects.find((r) => r.id === currentId);
        if (!currentRect) return;

        if (lastKeyboardMove.current) {
            if (
                lastKeyboardMove.current.toId === currentId &&
                direction === getOppositeDirection(lastKeyboardMove.current.direction)
            ) {
                const sourceId = lastKeyboardMove.current.fromId;
                const sourceExists = nodeRects.some((r) => r.id === sourceId);

                if (sourceExists) {
                    lastKeyboardMove.current = {
                        fromId: currentId,
                        toId: sourceId,
                        direction: direction,
                    };
                    return sourceId;
                }
            }
        }

        let bestCandidate: Rect | null = null;
        let minScore = Infinity;

        nodeRects.forEach((cand) => {
            if (cand.id === currentId) return;

            let distMain = 0;
            let isOverlapping = false;
            let distCross = 0;
            let distCenter = 0;

            let isValid = false;

            switch (direction) {
                case 'right':
                    if (cand.left >= currentRect.right) {
                        isValid = true;
                        distMain = cand.left - currentRect.right;
                        const overlapY =
                            Math.min(currentRect.bottom, cand.bottom) - Math.max(currentRect.top, cand.top);
                        isOverlapping = overlapY > 0;
                        if (!isOverlapping) {
                            distCross = Math.max(
                                0,
                                Math.max(currentRect.top, cand.top) - Math.min(currentRect.bottom, cand.bottom),
                            );
                        }
                        distCenter = Math.abs(cand.cy - currentRect.cy);
                    }
                    break;

                case 'left':
                    if (cand.right <= currentRect.left) {
                        isValid = true;
                        distMain = currentRect.left - cand.right;
                        const overlapY =
                            Math.min(currentRect.bottom, cand.bottom) - Math.max(currentRect.top, cand.top);
                        isOverlapping = overlapY > 0;
                        if (!isOverlapping) {
                            distCross = Math.max(
                                0,
                                Math.max(currentRect.top, cand.top) - Math.min(currentRect.bottom, cand.bottom),
                            );
                        }
                        distCenter = Math.abs(cand.cy - currentRect.cy);
                    }
                    break;

                case 'down':
                    if (cand.top >= currentRect.bottom) {
                        isValid = true;
                        distMain = cand.top - currentRect.bottom;
                        const overlapX =
                            Math.min(currentRect.right, cand.right) - Math.max(currentRect.left, cand.left);
                        isOverlapping = overlapX > 0;
                        if (!isOverlapping) {
                            distCross = Math.max(
                                0,
                                Math.max(currentRect.left, cand.left) - Math.min(currentRect.right, cand.right),
                            );
                        }
                        distCenter = Math.abs(cand.cx - currentRect.cx);
                    }
                    break;

                case 'up':
                    if (cand.bottom <= currentRect.top) {
                        isValid = true;
                        distMain = currentRect.top - cand.bottom;
                        const overlapX =
                            Math.min(currentRect.right, cand.right) - Math.max(currentRect.left, cand.left);
                        isOverlapping = overlapX > 0;
                        if (!isOverlapping) {
                            distCross = Math.max(
                                0,
                                Math.max(currentRect.left, cand.left) - Math.min(currentRect.right, cand.right),
                            );
                        }
                        distCenter = Math.abs(cand.cx - currentRect.cx);
                    }
                    break;
            }

            if (isValid) {
                let score = distMain;
                score += distCross * 10;
                score += distCenter * 0.1;

                if (score < minScore) {
                    minScore = score;
                    bestCandidate = cand;
                }
            }
        });

        if (bestCandidate) {
            lastKeyboardMove.current = {
                fromId: currentId,
                toId: (bestCandidate as Rect).id,
                direction: direction,
            };
            return (bestCandidate as Rect).id;
        }
    };

    const handleArrows = (nodeId: Id, dir: ArrowDirection) => {
        const nextId = findNextNode(nodeId, dir);
        if (nextId) setSelectedId(nextId);
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

    const handleFocusNode = (nodeId: Id | null) => {
        saveUndoState();

        setFocusId(nodeId);
        setWhiteListIds([]);
    };

    function handleRemove(nodeId: Id, dir: Direction) {
        saveUndoState();
        const whiteListSet = new Set(whiteListIds);

        let nodes: Set<Id> = new Set();
        const cluster = graphData.clusters.get(nodeId);
        if (cluster) {
            nodes = new Set(cluster.nodes);
            for (const id of nodes) {
                if (whiteListSet.has(id)) {
                    whiteListSet.delete(id);
                }
            }
        } else {
            nodes = graphData.findRecursive(nodeId, dir);
        }
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
        if (sources.length === 0) return;
        const set = new Set([...whiteListIds, ...sources.map((v) => (dir === 'backward' ? v.from : v.to))]);
        setWhiteListIds([...set]);
        setSelectedId(dir === 'backward' ? sources[0].from : sources[0].to);
        // handleArrows(nodeId, dir === 'backward' ? 'up' : 'down');
    }

    const selectedNode = selectedId ? initialData.nodes.get(selectedId) ?? null : null;

    const handleContextMenuOpen: ContextMenuCb = (id: Id) => {
        return [
            {
                label: 'Focus subtree',
                hotkey: ['↵'],
                onClick: () => {
                    setFocusId(id);
                },
            },
            {
                label: 'Reveal backward',
                hotkey: ['⌘ ↑'],
                onClick: () => {
                    handleReveal(id, 'backward');
                },
            },
            {
                label: 'Reveal forward',
                hotkey: ['⌘ ↓'],
                onClick: () => {
                    handleReveal(id, 'forward');
                },
            },
            {
                label: 'Delete backward',
                hotkey: ['⇧ ⌫'],
                onClick: () => {
                    handleRemove(id, 'backward');
                },
            },
            {
                label: 'Delete forward',
                hotkey: ['⌫'],
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
                    initialData={initialData}
                    graph={graphData}
                    onSelect={setSelectedId}
                    onDoubleClick={handleOpenFileInIde}
                    selectedId={selectedId}
                    layoutDirection={layoutDirection}
                    groupByModules={groupByModules}
                    mainId={focusId}
                    onContextMenuOpen={handleContextMenuOpen}
                    onNodeRectsChange={setNodeRects}
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
                nodeDetails={[].filter((v) => v !== null)}
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

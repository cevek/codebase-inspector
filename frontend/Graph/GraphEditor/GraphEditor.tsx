import React, {useEffect, useMemo, useRef, useState} from 'react';
import 'react-contexify/ReactContexify.css';

import {Graph} from '../Graph';
import {GraphViewer} from '../GraphViewer/GraphViewer';
import {Rect} from '../GraphViewer/types';
import {Sidebar} from '../Sidebar/Sidebar';

import {GraphFormatter} from '../utils/formatters';
import {useGraphContextMenu} from './hooks/useGraphContextMenu';
import {useGraphHotkeys} from './hooks/useGraphHotkeys';
import {GraphViewState, useGraphState} from './hooks/useGraphState';
import {useIde} from './hooks/useIde';
import {SpatialNavigator} from './logic/SpatialNavigator';
import {urlSyncFactory} from '../hooks/useUrlSync';
import {filterGraph} from './logic/filterGraph';

const {readUrlData, useUrlSync} = urlSyncFactory<GraphViewState>()({
    selectedId: 'string',
    focusId: 'string',
    layoutDirection: 'string',
    removedIds: 'json',
    whiteListIds: 'json',
    groupByModules: 'boolean',
    embedSpecialActions: 'boolean',
});

export const GraphEditor: React.FC<{data: Graph}> = ({data: rawInitialGraph}) => {
    const {state, actions, history, initialGraph} = useGraphState(rawInitialGraph, readUrlData());
    useUrlSync(state);

    const filteredGraph = useMemo(
        () =>
            filterGraph(initialGraph, {
                removedIds: state.removedIds,
                whiteListIds: state.whiteListIds,
                focusId: state.focusId,
            }),
        [initialGraph, state.removedIds, state.whiteListIds, state.focusId],
    );

    const spatialNavigator = useRef(new SpatialNavigator());
    const [nodeRects, setNodeRects] = useState<Rect[]>([]);

    useGraphHotkeys({
        selectedId: state.selectedId,
        nodeRects,
        spatialNavigator,
        actions,
        history,
    });

    const handleContextMenuOpen = useGraphContextMenu(actions);

    const {selectedIde, setSelectedIde, ideOptions, handleOpenFileInIde} = useIde(filteredGraph);

    useEffect(() => {
        const handleMouseClick = () => spatialNavigator.current.reset();
        document.addEventListener('mousedown', handleMouseClick);
        return () => document.removeEventListener('mousedown', handleMouseClick);
    }, []);

    const sidebarPath = state.selectedId
        ? (
              GraphFormatter.nodeName(initialGraph, state.selectedId, false) ??
              GraphFormatter.clusterName(initialGraph, state.selectedId, false) ??
              state.selectedId
          ).split('/')
        : null;

    const removedNodesList = state.removedIds
        .map(({id, dir}) => ({
            id,
            dir,
            name: GraphFormatter.displayName(initialGraph, id),
        }))
        .reverse();

    const searchItems = useMemo(
        () =>
            [...initialGraph.nodes.entries()].map(([id, node]) => ({
                fileName: node.location.url,
                module: node.location.module,
                name: node.name,
                id,
            })),
        [initialGraph],
    );

    return (
        <div style={{width: '100%', height: '100%'}}>
            <div onClick={() => actions.selectNode(null)}>
                <GraphViewer
                    initialGraph={initialGraph}
                    graph={filteredGraph}
                    selectedId={state.selectedId}
                    layoutDirection={state.layoutDirection}
                    groupByModules={state.groupByModules}
                    mainId={state.focusId}
                    onSelect={actions.selectNode}
                    onDoubleClick={handleOpenFileInIde}
                    onContextMenuOpen={handleContextMenuOpen}
                    onNodeRectsChange={setNodeRects}
                />
            </div>
            <Sidebar
                path={sidebarPath}
                focusNode={state.focusId}
                removedNodes={removedNodesList}
                nodeDetails={[]}
                searchItems={searchItems}
                onFocusNode={actions.focusNode}
                onRestoreNode={actions.restoreNode}
                onRestoreAll={actions.restoreAll}
                onFocusSubtree={() => state.selectedId && actions.focusNode(state.selectedId)}
                layoutDirection={state.layoutDirection}
                onLayoutChange={actions.changeLayout}
                ideOptions={ideOptions}
                selectedIde={selectedIde}
                onIdeChange={setSelectedIde}
                groupByModules={state.groupByModules}
                onGroupByModulesChange={actions.changeGroupByModules}
                embedSpecialActions={state.embedSpecialActions}
                onEmbedSpecialActionsChange={actions.changeEmbedSpecialActions}
            />
        </div>
    );
};

import React, {useEffect, useMemo, useRef, useState} from 'react';
import 'react-contexify/ReactContexify.css';

import {Graph} from './Graph';
import {GraphViewer, Rect} from './GraphViewer';
import {Sidebar} from './Sidebar/Sidebar';

import {useUrlState} from './hooks/useUrlSync';
import {useGraphContextMenu} from './hooks/useGraphContextMenu';
import {useGraphHotkeys} from './hooks/useGraphHotkeys';
import {useGraphState} from './hooks/useGraphState';
import {useIde} from './hooks/useIde';
import {usePersistentState} from './hooks/usePersistentState';
import {useUrlSync} from './hooks/useUrlSync';
import {GraphFilter} from './utils/GraphFilter';
import {SpatialNavigator} from './utils/SpatialNavigator';
import {GraphFormatter} from './utils/formatters';

/*

src/
├── features/
│   └── GraphNavigation/        # Всё, что касается графа
│       ├── domain/             # Чистая логика (без React)
│       │   ├── SpatialNavigator.ts  # Класс для расчета findNextNode
│       │   └── GraphFilter.ts       # Логика фильтрации графа (удаление, скрытие)
│       ├── hooks/              # React хуки
│       │   ├── useGraphState.ts     # Основной стейт + undo/redo
│       │   ├── useUrlSync.ts        # Синхронизация стейта с URL
│       │   ├── useGraphHotkeys.ts   # Обработка клавиатуры
│       │   └── useGraphLayout.ts    # Вычисление "нового" графа на основе фильтров
│       └── GraphEditor.tsx     # Бывший App, теперь чистый компонент-координатор

*/

export const App: React.FC<{data: Graph}> = ({data: initialData}) => {
    const initialUrlData = useUrlState();
    const {state, actions, history} = useGraphState(initialData, initialUrlData);

    // 2. Persistent UI Settings
    const [groupByModules, setGroupByModules] = usePersistentState<boolean>(
        {key: 'groupByModules'},
        initialUrlData.groupByModules ?? false,
    );

    // 3. Infrastructure: URL Sync
    useUrlSync({state, groupByModules});

    // 4. Domain Logic: Filtering
    const graphData = useMemo(() => {
        return GraphFilter.apply(initialData, {
            removedIds: state.removedIds,
            whiteListIds: state.whiteListIds,
            focusId: state.focusId,
        });
    }, [initialData, state.removedIds, state.whiteListIds, state.focusId]);

    // 5. UI: Navigation & Helpers
    const navigator = useRef(new SpatialNavigator());
    const [nodeRects, setNodeRects] = useState<Rect[]>([]);

    // Подключаем хоткеи (Вся логика клавиатуры ушла сюда)
    useGraphHotkeys({
        selectedId: state.selectedId,
        nodeRects,
        navigator,
        actions,
        history,
    });

    // Подключаем контекстное меню
    const handleContextMenuOpen = useGraphContextMenu(actions);

    // Подключаем IDE интеграцию
    const {selectedIde, setSelectedIde, ideOptions, handleOpenFileInIde} = useIde(graphData);

    // Сброс навигатора при клике мышкой
    useEffect(() => {
        const handleMouseClick = () => navigator.current.reset();
        document.addEventListener('mousedown', handleMouseClick);
        return () => document.removeEventListener('mousedown', handleMouseClick);
    }, []);

    // 6. View Helpers (Sidebar Props Preparation)
    const sidebarPath = state.selectedId
        ? (
              GraphFormatter.nodeName(initialData, state.selectedId, false) ??
              GraphFormatter.clusterName(initialData, state.selectedId, false) ??
              state.selectedId
          ).split('/')
        : null;

    const removedNodesList = state.removedIds
        .map(({id, dir}) => ({
            id,
            dir,
            name: GraphFormatter.displayName(initialData, id),
        }))
        .reverse();

    const searchItems = useMemo(
        () =>
            [...initialData.nodes.entries()].map(([id, node]) => ({
                fileName: node.location.url,
                module: node.location.module,
                name: node.name,
                id,
            })),
        [initialData],
    );

    return (
        <div style={{width: '100%', height: '100%'}}>
            <div onClick={() => actions.selectNode(null)}>
                <GraphViewer
                    initialData={initialData}
                    graph={graphData}
                    selectedId={state.selectedId}
                    layoutDirection={state.layoutDirection}
                    groupByModules={groupByModules}
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
                groupByModules={groupByModules}
                onGroupByModulesChange={setGroupByModules}
            />
        </div>
    );
};

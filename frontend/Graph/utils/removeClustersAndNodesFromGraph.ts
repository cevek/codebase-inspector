import { Graph, NodeInfo, Cluster } from '../types';

export function removeClusterFromGraph(graph: Graph, idsToRemove: string[]): Graph {
    const nodesIDToRemove = new Set<string>();

    // 1. СНАЧАЛА проверяем, передали ли нам конкретные ID нод для удаления
    idsToRemove.forEach(id => {
        if (graph.nodes[id]) {
            nodesIDToRemove.add(id);
        }
    });

    // 2. Вспомогательная функция для сбора всех нод из кластера (если удаляем целый кластер)
    const collectAllNodeIds = (cluster: Cluster) => {
        cluster.nodes.forEach((id) => nodesIDToRemove.add(id));
        cluster.subClusters.forEach((sub) => collectAllNodeIds(sub));
    };

    // 3. Фильтрация кластеров + сбор нод из удаляемых кластеров
    const filterClusters = (clusters: Cluster[]): Cluster[] => {
        return clusters.reduce<Cluster[]>((acc, cluster) => {
            // Если ID кластера есть в списке на удаление
            if (idsToRemove.includes(cluster.id)) {
                collectAllNodeIds(cluster);
                return acc; // Исключаем кластер из структуры
            }

            const filteredSubClusters = filterClusters(cluster.subClusters);

            acc.push({
                ...cluster,
                subClusters: filteredSubClusters,
            });

            return acc;
        }, []);
    };

    // Получаем новую структуру кластеров (сами объекты кластеров удалены, если нужно)
    let newClusters = filterClusters(graph.clusters);

    // Если список на удаление пуст, возвращаем оригинал
    if (nodesIDToRemove.size === 0) return graph;

    // 4. Подготовка к каскадному удалению (строим карту родителей)
    const incomingEdges: Record<string, Set<string>> = {};
    Object.keys(graph.nodes).forEach(id => incomingEdges[id] = new Set());
    
    Object.entries(graph.relations).forEach(([sourceId, targetIds]) => {
        targetIds.forEach(targetId => {
            if (!incomingEdges[targetId]) incomingEdges[targetId] = new Set();
            incomingEdges[targetId].add(sourceId);
        });
    });

    // 5. Каскадное удаление (Очередь)
    // Добавляем ноды в очередь по мере обнаружения "сирот"
    const queue = Array.from(nodesIDToRemove);
    let head = 0;

    while (head < queue.length) {
        const nodeIdToRemove = queue[head++];
        
        // Берем детей удаляемой ноды
        const children = graph.relations[nodeIdToRemove] || [];

        for (const childId of children) {
            if (nodesIDToRemove.has(childId)) continue;

            // Проверяем родителей ребенка
            const parents = incomingEdges[childId];
            let aliveParentsCount = 0;
            
            if (parents) {
                for (const parentId of parents) {
                    if (!nodesIDToRemove.has(parentId)) {
                        aliveParentsCount++;
                        break; // Есть живой родитель, не удаляем
                    }
                }
            }

            // Если живых родителей нет — ребенок тоже удаляется
            if (aliveParentsCount === 0) {
                nodesIDToRemove.add(childId);
                queue.push(childId);
            }
        }
    }

    // 6. Сборка нового графа

    // Удаляем ноды
    const newNodes: Record<string, NodeInfo> = {};
    for (const [id, info] of Object.entries(graph.nodes)) {
        if (!nodesIDToRemove.has(id)) {
            newNodes[id] = info;
        }
    }

    // Удаляем связи
    const newRelations: Record<string, string[]> = {};
    for (const [sourceId, targetIds] of Object.entries(graph.relations)) {
        if (nodesIDToRemove.has(sourceId)) continue;

        const filteredTargets = targetIds.filter((targetId) => !nodesIDToRemove.has(targetId));
        // Опционально: можно не добавлять ключ, если массив пуст, 
        // но для совместимости лучше оставить filteredTargets
        if (filteredTargets.length > 0) {
             newRelations[sourceId] = filteredTargets;
        }
    }

    // Очищаем содержимое оставшихся кластеров от ID удаленных нод
    // (ведь мы могли удалить ноду по ID, но оставить её кластер)
    const cleanClustersContent = (clusters: Cluster[]): Cluster[] => {
        return clusters.map(cluster => ({
            ...cluster,
            nodes: cluster.nodes.filter(id => !nodesIDToRemove.has(id)),
            subClusters: cleanClustersContent(cluster.subClusters)
        }));
    };

    newClusters = cleanClustersContent(newClusters);

    return {
        nodes: newNodes,
        relations: newRelations,
        clusters: newClusters,
    };
}
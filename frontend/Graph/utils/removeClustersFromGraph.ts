import {Graph, NodeInfo, Cluster} from '../types';

export function removeClusterFromGraph(graph: Graph, ids: string[]): Graph {
    const nodesIDToRemove = new Set<string>();

    const collectAllNodeIds = (cluster: Cluster) => {
        cluster.nodes.forEach((id) => nodesIDToRemove.add(id));
        cluster.subClusters.forEach((sub) => collectAllNodeIds(sub));
    };

    const filterClusters = (clusters: Cluster[]): Cluster[] => {
        return clusters.reduce<Cluster[]>((acc, cluster) => {
            if (ids.includes(cluster.id)) {
                collectAllNodeIds(cluster);
                return acc;
            }

            const filteredSubClusters = filterClusters(cluster.subClusters);

            acc.push({
                ...cluster,
                subClusters: filteredSubClusters,
            });

            return acc;
        }, []);
    };

    const newClusters = filterClusters(graph.clusters);
    if (nodesIDToRemove.size === 0) return graph;

    const newNodes: Record<string, NodeInfo> = {};
    for (const [id, info] of Object.entries(graph.nodes)) {
        if (!nodesIDToRemove.has(id)) {
            newNodes[id] = info;
        }
    }

    const newRelations: Record<string, string[]> = {};
    for (const [sourceId, targetIds] of Object.entries(graph.relations)) {
        if (nodesIDToRemove.has(sourceId)) continue;
        const filteredTargets = targetIds.filter((targetId) => !nodesIDToRemove.has(targetId));
        newRelations[sourceId] = filteredTargets;
    }

    return {
        nodes: newNodes,
        relations: newRelations,
        clusters: newClusters,
    };
}

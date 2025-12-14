import {Id} from '../../../../types';
import {Graph} from '../../Graph';
import {Direction} from '../../types';

export type Removing = {id: Id; dir: Direction};

export interface FilterOptions {
    removedIds: Removing[];
    whiteListIds: Id[];
    focusId: Id | null;
}

export function filterGraph(initialGraph: Graph, options: FilterOptions): Graph {
    const {removedIds, whiteListIds, focusId} = options;
    const graph = initialGraph.clone();
    applyRemovals({graph, initialGraph, removedIds, whiteListIds});
    if (focusId) {
        graph.removeAllExceptSubgraph(focusId, whiteListIds);
    }
    return graph;
}

function applyRemovals({
    graph,
    initialGraph,
    removedIds,
    whiteListIds,
}: {
    graph: Graph;
    initialGraph: Graph;
    removedIds: Removing[];
    whiteListIds: Id[];
}): void {
    if (!Array.isArray(removedIds)) return;
    for (const {id: removedId, dir} of removedIds) {
        const node = initialGraph.nodes.get(removedId);
        if (node) {
            graph.removeNodeRecursive(removedId, dir, whiteListIds, undefined);
        } else {
            removeCluster({graph, initialGraph, clusterId: removedId, whiteListIds});
        }
    }
}

function removeCluster({
    graph,
    initialGraph,
    clusterId,
    whiteListIds,
}: {
    graph: Graph;
    initialGraph: Graph;
    clusterId: Id;
    whiteListIds: Id[];
}): void {
    const cluster = initialGraph.clusters.get(clusterId);
    if (!cluster) return;
    for (const [id, node] of graph.nodes) {
        const isInCluster =
            node.location.module === cluster.name || node.location.module.startsWith(cluster.name + '/');
        if (isInCluster) {
            if (!whiteListIds.includes(id)) {
                graph.removeNode(id);
            }
        }
    }
}

import {Id} from '../../../types';
import {Graph} from '../Graph';
import {Direction} from '../types';
import {embedActionNodes} from './analyzeEmbeddedNodes';

export type Removing = {id: Id; dir: Direction};

export interface FilterOptions {
    removedIds: Removing[];
    whiteListIds: Id[];
    focusId: Id | null;
}

export class GraphFilter {
    static apply(initialGraph: Graph, options: FilterOptions): Graph {
        const {removedIds, whiteListIds, focusId} = options;

        const newGraph = initialGraph.clone();
        embedActionNodes(newGraph);

        this.applyRemovals(newGraph, initialGraph, removedIds, whiteListIds);

        if (focusId && newGraph.nodes.has(focusId)) {
            newGraph.removeAllExceptSubgraph(focusId, whiteListIds);
        }

        return newGraph;
    }

    private static applyRemovals(
        targetGraph: Graph,
        sourceGraph: Graph,
        removedIds: Removing[],
        whiteListIds: Id[],
    ): void {
        if (!Array.isArray(removedIds)) return;
        
        for (const {id: removedId, dir} of removedIds) {
            const node = sourceGraph.nodes.get(removedId);

            if (node) {
                targetGraph.removeNodeRecursive(removedId, dir, whiteListIds, undefined);
            } else {
                this.removeCluster(targetGraph, sourceGraph, removedId, whiteListIds);
            }
        }
    }

    private static removeCluster(targetGraph: Graph, sourceGraph: Graph, clusterId: Id, whiteListIds: Id[]): void {
        const cluster = sourceGraph.clusters.get(clusterId);

        if (!cluster) return;

        for (const [id, node] of targetGraph.nodes) {
            const isInCluster =
                node.location.module === cluster.name || node.location.module.startsWith(cluster.name + '/');

            if (isInCluster) {
                if (!whiteListIds.includes(id)) {
                    targetGraph.removeNode(id);
                }
            }
        }
    }
}

import {Graph, Cluster, Id} from '../../../types';

export function generateGraphClusters(graph: Graph): Map<Id, Cluster> {
    const clusters = new Map<Id, Cluster>();
    const pathKeyToIdMap = new Map<string, Id>();

    for (const [nodeId, node] of graph.nodes) {
        const pathString = node.location.module;

        if (!pathString) continue;

        const pathParts = pathString.split('/').filter(Boolean);
        const partsForId: string[] = [];

        let parentId: Id | null = null;

        pathParts.forEach((part, index) => {
            partsForId.push(part);

            const fullPathKey = partsForId.join('/');

            let clusterId = pathKeyToIdMap.get(fullPathKey);
            let cluster: Cluster;

            if (!clusterId) {
                clusterId = ('cluster_' + fullPathKey) as Id;
                pathKeyToIdMap.set(fullPathKey, clusterId);

                cluster = {
                    id: clusterId,
                    name: fullPathKey,
                    subClusters: [],
                    nodes: [],
                };

                clusters.set(clusterId, cluster);

                if (parentId) {
                    const parentCluster = clusters.get(parentId);
                    if (parentCluster) {
                        if (!parentCluster.subClusters.includes(clusterId)) {
                            parentCluster.subClusters.push(clusterId);
                        }
                    }
                }
            } else {
                cluster = clusters.get(clusterId)!;
            }

            const isLastPart = index === pathParts.length - 1;
            if (isLastPart) {
                cluster.nodes.push(nodeId);
            }

            parentId = clusterId;
        });
    }

    return clusters;
}

import {Graph, Cluster, Id} from '../../../types';

export function generateGraphClusters(graph: Graph): Cluster[] {
    const rootClusters: Cluster[] = [];

    for (const [nodeId, node] of graph.nodes) {
        const pathString = node.location.module;

        if (!pathString) continue;

        const pathParts = pathString.split('/').filter(Boolean);

        let currentLevelClusters = rootClusters;
        const partsForId: string[] = [];

        pathParts.forEach((part, index) => {
            partsForId.push(part);

            const fullPathName = partsForId.join('/');

            let cluster = currentLevelClusters.find((c) => c.name === fullPathName);

            if (!cluster) {
                cluster = {
                    id: fullPathName as Id,
                    name: fullPathName,
                    subClusters: [],
                    nodes: [],
                };
                currentLevelClusters.push(cluster);
            }

            const isLastPart = index === pathParts.length - 1;
            if (isLastPart) {
                cluster.nodes.push(nodeId as Id);
            }
            currentLevelClusters = cluster.subClusters;
        });
    }

    return rootClusters;
}

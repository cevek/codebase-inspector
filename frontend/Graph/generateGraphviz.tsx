import {Graph, Cluster} from './types';

export function generateGraphviz(data: Graph): string {
    let dotString = 'digraph G {\n';
    dotString += '  compound=true;\n';
    dotString += '  rankdir=TB;\n';
    // dotString += '  ranksep=1.0;\n';
    // dotString += '  nodesep=0.5;\n';
    dotString += '  node [fontname="Arial", fontsize=12];\n';
    dotString += '  edge [color="#555555"];\n\n';

    const renderedNodeIds = new Set<string>();
    let clusterGlobalIndex = 0;

    const renderNode = (id: string): string => {
        const node = data.nodes[id];
        if (!node) return '';
        renderedNodeIds.add(id);
        const label = node.name.replace(/"/g, '\\"');

        const domId = `node_${id.replaceAll('/', '_')}`;

        if (node.type === 'epic') {
            return `    "${id}" [id="${domId}", label="${label}", shape=box, style="filled,rounded", fillcolor="#ff99ff", penwidth=2];\n`;
        } else {
            if (node.name === 'Success')
                return `    "${id}" [id="${domId}", label="✔", shape=circle, fixedsize=true, width=0.4, fillcolor="#90EE90", style="filled", color="#006400"];\n`;
            if (node.name === 'Error')
                return `    "${id}" [id="${domId}", label="✖", shape=circle, fixedsize=true, width=0.4, fillcolor="#FFB6C1", style="filled", color="#8B0000"];\n`;
            return `    "${id}" [id="${domId}", label="${label}", shape=box, style="filled,rounded", fillcolor="#bbbbf9", penwidth=1];\n`;
        }
    };

    const traverseCluster = (cluster: Cluster): string => {
        const clusterDotId = `cluster_${clusterGlobalIndex++}`;
        const domId = `group_${cluster.id.replaceAll('/', '_')}`;

        let content = `\n  subgraph "${clusterDotId}" {\n`;
        content += `    id="${domId}";\n`;

        if (cluster.name.endsWith('Epic')) {
            content += '    { rank=same; }\n';
            content += `    label = "";\n`;
        } else {
            content += `    label = "${cluster.name}";\n`;
        }
        content += '    style = "rounded,dashed";\n';
        content += '    color = "#888888";\n';
        content += '    bgcolor = "#fdfdfd";\n';

        if (cluster.nodes) {
            cluster.nodes.forEach((nodeId) => {
                content += renderNode(nodeId);
            });
        }
        if (cluster.subClusters) {
            cluster.subClusters.forEach((sub) => {
                content += traverseCluster(sub);
            });
        }
        content += '  }\n';
        return content;
    };

    if (data.clusters) {
        data.clusters.forEach((cluster) => {
            dotString += traverseCluster(cluster);
        });
    }

    Object.keys(data.nodes).forEach((id) => {
        if (!renderedNodeIds.has(id)) {
            dotString += renderNode(id);
        }
    });

    dotString += '\n  /* Relationships */\n';
    Object.entries(data.relations).forEach(([sourceId, targets]) => {
        if (data.nodes[sourceId]) {
            targets.forEach((targetId) => {
                if (data.nodes[targetId]) {
                    dotString += `  "${sourceId}" -> "${targetId}" ;\n`;
                }
            });
        }
    });

    dotString += '}';
    return dotString;
}

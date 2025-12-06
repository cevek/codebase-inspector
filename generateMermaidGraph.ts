import * as fs from 'node:fs';
import * as path from 'node:path';

interface NodeInfo {
    name: string;
    type: string;
}

interface Cluster {
    name: string;
    subClusters: Cluster[];
    nodes: string[];
}

interface GraphInput {
    nodes: Record<string, NodeInfo>;
    relations: Record<string, string[]>;
    clusters: Cluster[];
}

function generateGraphviz(data: GraphInput): string {
    let dotString = 'digraph G {\n';
    dotString += '  compound=true;\n';
    dotString += '  rankdir=TB;\n';
    // dotString += '  ranksep=1.0;\n';
    // dotString += '  nodesep=0.1;\n';
    dotString += '  node [fontname="Arial", fontsize=12];\n';
    dotString += '  edge [color="#555555"];\n\n';

    const renderedNodeIds = new Set<string>();

    let clusterGlobalIndex = 0;

    const renderNode = (id: string): string => {
        const node = data.nodes[id];
        if (!node) return '';

        renderedNodeIds.add(id);
        const label = node.name;

        if (node.type === 'epic') {
            return `    "${id}" [label="${label}", shape=box, style="filled,rounded", fillcolor="#ff99ff", penwidth=2];\n`;
        } else {
            if (node.name === 'Success')
                return `    "${id}" [label="✔", shape=circle, fixedsize=true, width=0.4, fillcolor="#90EE90", style="filled", color="#006400"];\n`;
            if (node.name === 'Error')
                return `    "${id}" [label="✖", shape=circle, fixedsize=true, width=0.4, fillcolor="#FFB6C1", style="filled", color="#8B0000"];\n`;
            return `    "${id}" [label="${label}", shape=box, style="filled,rounded", fillcolor="#bbbbf9", penwidth=1];\n`;
        }
    };

    const traverseCluster = (cluster: Cluster): string => {
        const clusterId = `cluster_${clusterGlobalIndex++}`;

        let content = `\n  subgraph "${clusterId}" {\n`;
        if (cluster.name.endsWith('Epic')) {
            content += '    { rank=same; }\n';
            content += `    label = "";\n`;
        } else {
            content += `    label = "${cluster.name}";\n`;
        }
        content += '    style = "rounded,dashed";\n';
        content += '    color = "#888888";\n';
        content += '    bgcolor = "#fdfdfd";\n';

        if (cluster.nodes && cluster.nodes.length > 0) {
            cluster.nodes.forEach((nodeId) => {
                content += renderNode(nodeId);
            });
        }

        if (cluster.subClusters && cluster.subClusters.length > 0) {
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
                    dotString += `  "${sourceId}" -> "${targetId}";\n`;
                }
            });
        }
    });

    dotString += '}';
    return dotString;
}

function main() {
    const inputFile = 'data.json';
    const outputFile = 'grouped_graph.dot';

    try {
        const inputPath = path.join(__dirname, inputFile);

        if (!fs.existsSync(inputPath)) {
            console.error(`❌ File not found: ${inputPath}`);
            return;
        }

        const fileContent = fs.readFileSync(inputPath, 'utf-8');
        const graphData: GraphInput = JSON.parse(fileContent);

        const dotContent = generateGraphviz(graphData);
        fs.writeFileSync(path.join(__dirname, outputFile), dotContent);

        console.log(`✅ Graphviz generated: '${outputFile}'`);
        console.log(`   👉 View at https://dreampuf.github.io/GraphvizOnline/`);
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

main();

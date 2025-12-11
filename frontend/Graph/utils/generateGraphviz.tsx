import {Cluster, Graph, Id} from '../../../types';
import {EmbeddedNodeMap, PortMapping} from '../types';
import {analyzeEmbeddedNodes} from './analyzeEmbeddedNodes';
import {THEME} from './THEME';

const sanitizeId = (id: string) => id.replace(/\$|:|\//g, '_');
const escapeLabel = (label: string) => label.replace(/"/g, '\\"');

const createEpicHtmlLabel = ({
    layer,
    label,
    method,
    triggerPort,
    successPort,
    errorPort,
}: {
    layer: string;
    label: string;
    method: string | null;
    triggerPort: boolean | null;
    successPort: boolean | null;
    errorPort: boolean | null;
}) => `
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="3">
        <TR>
            ${layer ? `<TD>${layer}</TD>` : ''}
            ${triggerPort ? `<TD PORT="trigger">📍</TD>` : ''}
            <TD>${escapeLabel(label)}</TD>
            ${method ? `<TD><font color="${THEME.colors.apiCall}">${method ?? ''}</font></TD>` : ''}
            ${successPort ? `<TD PORT="success">✔</TD>` : ''}
            ${errorPort ? `<TD PORT="error">✖</TD>` : ''}
        </TR>
    </TABLE>
`;
// ${url ? `<TR><TD COLSPAN="3"><font color="${THEME.colors.apiCall}">${url}</font></TD></TR>` : ''}

export function generateGraphviz(
    data: Graph,
    embeddedNodesMap: EmbeddedNodeMap,
    clusters: Map<Id, Cluster>,
    direction: 'TB' | 'LR' = 'TB',
) {
    const domIdToIdMap = new Map<string, Id>();
    const idToDomIdMap = new Map<Id, string>();
    const renderedNodeIds = new Set<Id>();

    const lines: string[] = [];

    lines.push('digraph G {');
    lines.push('  compound=true;');
    lines.push(`  rankdir=${direction};`);
    lines.push(`  graph [fontname = "${THEME.font}", fontsize = ${THEME.fontSize.clusterLabel}];`);
    lines.push(`  node [fontname="${THEME.font}", fontsize=${THEME.fontSize.nodeLabel}];`);
    lines.push(`  edge [color="${THEME.colors.edge}"];\n`);

    let clusterGlobalIndex = 0;

    function registerDomId(id: Id, prefix: string = 'node') {
        const domId = `${prefix}_${sanitizeId(id)}`;
        domIdToIdMap.set(domId, id);
        idToDomIdMap.set(id, domId);
        return domId;
    }

    function renderNode(id: Id): string {
        const node = data.nodes.get(id);
        if (!node || embeddedNodesMap.actionToEpicMap.has(id)) return '';

        renderedNodeIds.add(id);
        const domId = registerDomId(id);

        let layerHtml = '';
        if (node.location.layer) layerHtml = `<font color="gray">${node.location.layer}</font> `;
        const label = layerHtml + escapeLabel(node.name);

        if (node.type === 'epic') {
            const embeddedNodes = embeddedNodesMap.epicToActionsMap.get(id);
            const [req] = node.apiCall.requests ?? [];
            return `    "${id}" [id="${domId}", shape=box, style="filled,rounded", fillcolor="${
                THEME.colors.epic.fill
            }", color="${THEME.colors.epic.border}", label=<${createEpicHtmlLabel({
                layer: layerHtml,
                label: node.name,
                method: req?.type ?? null,
                triggerPort: embeddedNodes?.some((v) => v.portName === 'trigger') ?? null,
                successPort: embeddedNodes?.some((v) => v.portName === 'success') ?? null,
                errorPort: embeddedNodes?.some((v) => v.portName === 'error') ?? null,
            })}>];`;
        }
        return `    "${id}" [id="${domId}", label=<${label}>, shape=box, style="filled,rounded", fillcolor="${THEME.colors.actionNode.fill}", color="${THEME.colors.actionNode.border}"];`;
    }

    function traverseCluster(cluster: Cluster) {
        const clusterDotId = `cluster_${clusterGlobalIndex++}`;
        const domId = registerDomId(cluster.id, 'group');

        lines.push(`\n  subgraph "${clusterDotId}" {`);
        lines.push(`    id="${domId}";`);
        lines.push(`    label = "${escapeLabel(cluster.name)}";`);
        lines.push(`    style = "rounded,dashed";`);
        lines.push(`    color = "${THEME.colors.clusterBorder}";`);
        lines.push(`    bgcolor = "${THEME.colors.clusterBg}";`);

        cluster.nodes?.forEach((nodeId) => {
            const nodeStr = renderNode(nodeId);
            if (nodeStr) lines.push(nodeStr);
        });
        cluster.subClusters?.forEach((sub) => traverseCluster(clusters.get(sub)!));
        lines.push('  }\n');
    }

    clusters.forEach(traverseCluster);

    for (const id of data.nodes.keys()) {
        if (!renderedNodeIds.has(id)) {
            const nodeStr = renderNode(id);
            if (nodeStr) lines.push(nodeStr);
        }
    }

    lines.push('\n  /* Relationships */');
    for (const [sourceId, targets] of data.relations) {
        if (!data.nodes.has(sourceId)) continue;

        targets.forEach((targetId) => {
            if (!data.nodes.has(targetId)) return;

            const aEmbedded = embeddedNodesMap.epicToActionsMap.get(sourceId);
            const bEmbedded = embeddedNodesMap.actionToEpicMap.get(sourceId);
            if (aEmbedded?.some((v) => v.subId === targetId) || bEmbedded?.ownerId === targetId) return;

            const from = transformId(sourceId, embeddedNodesMap);
            const to = transformId(targetId, embeddedNodesMap);

            lines.push(
                `  ${from} -> ${to} [id="${transformEdgeId(sourceId, embeddedNodesMap)}__${transformEdgeId(
                    targetId,
                    embeddedNodesMap,
                )}"];`,
            );
        });
    }
    lines.push('}');
    const dotString = lines.join('\n');
    // console.log(dotString);
    return {dotString, domIdToIdMap, idToDomIdMap};
}

function transformId(id: Id, embeddedMap: EmbeddedNodeMap): string {
    const mapping = embeddedMap.actionToEpicMap.get(id);
    return mapping ? `"${mapping.ownerId}":"${mapping.portName}"` : `"${id}"`;
}
function transformEdgeId(id: Id, embeddedMap: EmbeddedNodeMap): string {
    const mapping = embeddedMap.actionToEpicMap.get(id);
    return mapping ? `${mapping.ownerId}_${mapping.portName}` : id;
}

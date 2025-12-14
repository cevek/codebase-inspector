import {Cluster, Id} from '../../../../types';
import {Graph} from '../../Graph';
import {PortName} from '../../types';
import {THEME} from './THEME';

const sanitizeId = (id: string) => id.replace(/\$|:|\//g, '_');
const escapeLabel = (label: string) => label.replace(/"/g, '\\"');

const createHtmlLabel = ({
    layer,
    label,
    module,
    method,
    triggerPort,
    successPort,
    errorPort,
    hiddenBackwardNodesCount,
    hiddenForwardNodesCount,
}: {
    layer: string;
    label: string;
    module?: string | null;
    method?: string | null;
    triggerPort?: boolean | null;
    successPort?: boolean | null;
    errorPort?: boolean | null;
    hiddenBackwardNodesCount?: number;
    hiddenForwardNodesCount?: number;
}) => {
    const hiddensArr: string[] = [];
    const hiddensTooltipArr: string[] = [];
    if (hiddenBackwardNodesCount) {
        hiddensArr.push(`▲${hiddenBackwardNodesCount}`);
        hiddensTooltipArr.push(`Backward hidden nodes: ${hiddenBackwardNodesCount}`);
    }
    if (hiddenForwardNodesCount) {
        hiddensArr.push(`▼${hiddenForwardNodesCount}`);
        hiddensTooltipArr.push(`Forward hidden nodes: ${hiddenForwardNodesCount}`);
    }
    const tds = [
        layer ? `<TD>${layer}</TD>` : null,
        triggerPort ? `<TD PORT="trigger">📍</TD>` : null,
        `<TD>${escapeLabel(label)}</TD>`,
        method ? `<TD><font color="${THEME.colors.apiCall}">${method ?? ''}</font></TD>` : null,
        successPort ? `<TD PORT="success">✔</TD>` : null,
        errorPort ? `<TD PORT="error">✖</TD>` : null,
    ].filter(Boolean);

    const hiddensTd =
        hiddensArr.length > 0
            ? `<TD align="right" TOOLTIP="${hiddensTooltipArr.join('\n')}"><font color="${
                  THEME.colors.hidden
              }" point-size="10">${hiddensArr.join(' ')}</font></TD>`
            : '';

    const moduleTd = module
        ? `<TD align="left"><font color="${THEME.colors.nodeModule}" point-size="10">${module}</font></TD>`
        : '';

    return `<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="2"><TR>${tds.join('\n')}</TR>${
        moduleTd || hiddensTd
            ? `<TR><TD colspan="${tds.length}"><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR>${moduleTd}${hiddensTd}</TR></TABLE></TD></TR>`
            : ''
    }</TABLE>`;
};

export function generateGraphviz({
    graph,
    initialGraph,
    groupByModules,
    layoutDirection = 'TB',
}: {
    graph: Graph;
    initialGraph: Graph;
    groupByModules: boolean;
    layoutDirection?: 'TB' | 'LR';
}) {
    const domIdToIdMap = new Map<string, Id>();
    const idToDomIdMap = new Map<Id, string>();
    const renderedNodeIds = new Set<Id>();

    const lines: string[] = [];

    lines.push('digraph G {');
    lines.push('  compound=true;');
    lines.push(`  rankdir=${layoutDirection};`);
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
        const node = graph.nodes.get(id);
        if (!node) return '';

        renderedNodeIds.add(id);
        const domId = registerDomId(id);

        const hiddenBackwardNodesCount = initialGraph.findParents2(id).length - graph.findParents2(id).length;
        const hiddenForwardNodesCount = initialGraph.findChildren2(id).length - graph.findChildren2(id).length;

        let layerHtml = '';
        if (node.location.layer) layerHtml = `<font color="${THEME.colors.layer}">${node.location.layer}</font> `;

        if (node.type === 'epic') {
            const epicId = id;
            const reverseRelations = graph.reverseRelationsMap.get(epicId) ?? [];
            const relations = graph.relationsMap.get(epicId) ?? [];
            const [req] = node.apiCall.requests ?? [];
            const triggerPort = Boolean(
                reverseRelations.some((relation) =>
                    graph.portMappings.some(
                        (pm) =>
                            pm.relation === relation && (pm.toPortName === 'trigger' || pm.fromPortName === 'trigger'),
                    ),
                ),
            );
            const successPort = Boolean(
                relations.some((relation) =>
                    graph.portMappings.some(
                        (pm) =>
                            pm.relation === relation && (pm.toPortName === 'success' || pm.fromPortName === 'success'),
                    ),
                ),
            );
            const errorPort = Boolean(
                relations.some((relation) =>
                    graph.portMappings.some(
                        (pm) => pm.relation === relation && (pm.toPortName === 'error' || pm.fromPortName === 'error'),
                    ),
                ),
            );

            const label = createHtmlLabel({
                layer: layerHtml,
                label: node.name,
                module: groupByModules ? null : node.location.module,
                method: req?.type ?? null,
                triggerPort,
                successPort,
                errorPort,
                hiddenBackwardNodesCount,
                hiddenForwardNodesCount,
            });

            return `    "${epicId}" [id="${domId}", shape=box, style="filled,rounded", fillcolor="${THEME.colors.epic.fill}", color="#00000044", label=<${label}>];`;
        }
        if (node.type === 'action') {
            const labelHTML = createHtmlLabel({
                layer: layerHtml,
                label: node.name,
                module: groupByModules ? null : node.location.module,
                hiddenBackwardNodesCount,
                hiddenForwardNodesCount,
            });
            return `    "${id}" [id="${domId}", label=<${labelHTML}>, shape=box, style="filled,rounded", fillcolor="${THEME.colors.actionNode.fill}", color="#00000044"];`;
        }
        if (node.type === 'component') {
            const labelHTML = createHtmlLabel({
                layer: layerHtml,
                label: node.name,
                module: groupByModules ? null : node.location.module,
                hiddenBackwardNodesCount,
                hiddenForwardNodesCount,
            });
            return `    "${id}" [id="${domId}", label=<${labelHTML}>, shape=note, style="filled,rounded", fillcolor="${THEME.colors.componentNode.fill}", color="#00000044"];`;
        }
        return `    "${id}" [id="${domId}", label="unknown",  style="filled,rounded", fillcolor="${THEME.colors.actionNode.fill}", color="#00000044"];`;
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
        cluster.subClusters?.forEach((sub) => traverseCluster(graph.clusters.get(sub)!));
        lines.push('  }\n');
    }

    if (groupByModules) graph.clusters.forEach(traverseCluster);

    for (const id of graph.nodes.keys()) {
        if (!renderedNodeIds.has(id)) {
            const nodeStr = renderNode(id);
            if (nodeStr) lines.push(nodeStr);
        }
    }

    lines.push('\n  /* Relationships */');
    for (const relation of graph.relations) {
        const fromPortName = graph.portMappings.find((pm) => pm.relation === relation)?.fromPortName ?? null;
        const toPortName = graph.portMappings.find((pm) => pm.relation === relation)?.toPortName ?? null;

        const from = transformId(relation.from, fromPortName);
        const to = transformId(relation.to, toPortName);

        lines.push(
            `  ${from} -> ${to} [id="${transformEdgeId(relation.from, fromPortName)}__${transformEdgeId(
                relation.to,
                toPortName,
            )}"];`,
        );
    }
    lines.push('}');
    const dotString = lines.join('\n');
    // console.log(dotString);
    return {dotString, domIdToIdMap, idToDomIdMap};
}

function transformId(id: Id, portName: PortName | null): string {
    return portName ? `"${id}":${portName}` : `"${id}"`;
}
function transformEdgeId(id: Id, portName: PortName | null): string {
    return portName ? `${id}_${portName}` : id;
}

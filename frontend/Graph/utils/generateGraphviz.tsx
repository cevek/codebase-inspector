import {Cluster, Id} from '../../../types';
import {Graph} from '../Graph';
import {PortName} from '../types';
import {THEME} from './THEME';

const sanitizeId = (id: string) => id.replace(/\$|:|\//g, '_');
const escapeLabel = (label: string) => label.replace(/"/g, '\\"');

const createHtmlLabel = ({
    layer,
    label,
    method,
    triggerPort,
    successPort,
    errorPort,
    hiddens,
}: {
    layer: string;
    label: string;
    method?: string | null;
    triggerPort?: boolean | null;
    successPort?: boolean | null;
    errorPort?: boolean | null;
    hiddens?: string;
}) => `
    <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0">
        <TR>
            ${layer ? `<TD>${layer}</TD>` : ''}
            ${triggerPort ? `<TD PORT="trigger">📍</TD>` : ''}
            <TD>${escapeLabel(label)}</TD>
            ${method ? `<TD><font color="${THEME.colors.apiCall}">${method ?? ''}</font></TD>` : ''}
            ${successPort ? `<TD PORT="success">✔</TD>` : ''}
            ${errorPort ? `<TD PORT="error">✖</TD>` : ''}
        </TR>
        ${hiddens ? `<TR><TD colspan="10">${hiddens}</TD></TR>` : ''}
    </TABLE>
`;
// ${url ? `<TR><TD COLSPAN="3"><font color="${THEME.colors.apiCall}">${url}</font></TD></TR>` : ''}

export function generateGraphviz({
    data,
    initialData,
    groupByModules,
    direction = 'TB',
}: {
    data: Graph;
    initialData: Graph;
    groupByModules: boolean;
    direction?: 'TB' | 'LR';
}) {
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
        if (!node) return '';

        renderedNodeIds.add(id);
        const domId = registerDomId(id);

        const hiddenBackwardNodesCount = initialData.findParents2(id).length - data.findParents2(id).length;
        const hiddenForwardNodesCount = initialData.findChildren2(id).length - data.findChildren2(id).length;
        const hiddensArr: string[] = [];
        if (hiddenBackwardNodesCount) hiddensArr.push(`▲${hiddenBackwardNodesCount}`);
        if (hiddenForwardNodesCount) hiddensArr.push(`▼${hiddenForwardNodesCount}`);

        if (id === 'getFetchUserEpic') {
            console.log({
                initialDataParents: initialData.findParents2(id),
                dataParents: data.findParents2(id),
                initialDataChildren: initialData.findChildren2(id),
                dataChildren: data.findChildren2(id),
            });
        }

        const hiddensHtml =
            hiddensArr.length > 0
                ? `<font point-size="10" color="${THEME.colors.hidden}">${hiddensArr.join(' ')}</font>`
                : '';

        let layerHtml = '';
        if (node.location.layer) layerHtml = `<font color="${THEME.colors.layer}">${node.location.layer}</font> `;

        if (node.type === 'epic') {
            const epicId = id;
            const reverseRelations = data.reverseRelationsMap.get(epicId) ?? [];
            const relations = data.relationsMap.get(epicId) ?? [];
            const [req] = node.apiCall.requests ?? [];
            const triggerPort = Boolean(
                reverseRelations.some((relation) =>
                    data.portMappings.some(
                        (pm) =>
                            pm.relation === relation && (pm.toPortName === 'trigger' || pm.fromPortName === 'trigger'),
                    ),
                ),
            );
            const successPort = Boolean(
                relations.some((relation) =>
                    data.portMappings.some(
                        (pm) =>
                            pm.relation === relation && (pm.toPortName === 'success' || pm.fromPortName === 'success'),
                    ),
                ),
            );
            const errorPort = Boolean(
                relations.some((relation) =>
                    data.portMappings.some(
                        (pm) => pm.relation === relation && (pm.toPortName === 'error' || pm.fromPortName === 'error'),
                    ),
                ),
            );

            const label = createHtmlLabel({
                layer: layerHtml,
                label: node.name,
                method: req?.type ?? null,
                triggerPort,
                successPort,
                errorPort,
                hiddens: hiddensHtml,
            });

            return `    "${epicId}" [id="${domId}", shape=box, style="filled,rounded", fillcolor="${THEME.colors.epic.fill}", color="#00000044", label=<${label}>];`;
        }
        if (node.type === 'action') {
            const labelHTML = createHtmlLabel({
                layer: layerHtml,
                label: node.name,
                hiddens: hiddensHtml,
            });
            return `    "${id}" [id="${domId}", label=<${labelHTML}>, shape=box, style="filled,rounded", fillcolor="${THEME.colors.actionNode.fill}", color="#00000044"];`;
        }
        if (node.type === 'component') {
            const labelHTML = createHtmlLabel({
                layer: layerHtml,
                label: node.name,
                hiddens: hiddensHtml,
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
        cluster.subClusters?.forEach((sub) => traverseCluster(data.clusters.get(sub)!));
        lines.push('  }\n');
    }

    if (groupByModules) data.clusters.forEach(traverseCluster);

    for (const id of data.nodes.keys()) {
        if (!renderedNodeIds.has(id)) {
            const nodeStr = renderNode(id);
            if (nodeStr) lines.push(nodeStr);
        }
    }

    lines.push('\n  /* Relationships */');
    for (const relation of data.relations) {
        const fromPortName = data.portMappings.find((pm) => pm.relation === relation)?.fromPortName ?? null;
        const toPortName = data.portMappings.find((pm) => pm.relation === relation)?.toPortName ?? null;

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

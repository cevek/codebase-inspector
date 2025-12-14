import {Id} from '../../../types';
import {Graph} from '../Graph';

export const GraphFormatter = {
    nodeName: (graph: Graph, id: Id | null, prettify = true): string | null => {
        if (!id) return null;
        const node = graph.nodes.get(id);
        if (!node) return null;

        const raw = `${node.location.module}/${node.name}`;
        return prettify ? prettifyName(raw) : raw;
    },

    clusterName: (graph: Graph, id: Id, prettify = true): string | undefined => {
        const cluster = graph.clusters.get(id);
        if (!cluster) return undefined;
        return prettify ? prettifyName(cluster.name) : cluster.name;
    },

    // Хелпер для сайдбара, чтобы не мапить вручную
    displayName: (graph: Graph, id: Id): string => {
        return GraphFormatter.nodeName(graph, id, true) ?? GraphFormatter.clusterName(graph, id, true) ?? id;
    },
};
export function prettifyName(name: string) {
    return name.replaceAll('/', ' › ');
}

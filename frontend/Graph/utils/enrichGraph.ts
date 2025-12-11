import {Graph} from '../../../types';
import {EnrichedGraph} from '../types';
import {analyzeEmbeddedNodes} from './analyzeEmbeddedNodes';
import {generateGraphClusters} from './generateGraphClusters';

export function enrichGraph(graph: Graph): EnrichedGraph {
    return {
        graph,
        embeddedNodesMap: analyzeEmbeddedNodes(graph),
        clusters: generateGraphClusters(graph),
    };
}

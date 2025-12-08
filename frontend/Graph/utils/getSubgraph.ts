import {Graph, Id, Item} from '../../../types';

export function getSubgraph(graph: Graph, startNodeId: Id): Graph {
    const visitedIds = new Set<Id>();
    const stack: Id[] = [startNodeId];

    if (!graph.nodes.has(startNodeId)) {
        console.warn(`Node with id ${startNodeId} not found in graph.`);
        return {nodes: new Map(), relations: new Map()};
    }

    while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visitedIds.has(currentId)) continue;
        visitedIds.add(currentId);
        const children = graph.relations.get(currentId);
        if (children) {
            for (const childId of children) {
                if (!visitedIds.has(childId)) {
                    stack.push(childId);
                }
            }
        }
    }

    const subNodes = new Map<Id, Item>();
    const subRelations = new Map<Id, Id[]>();

    for (const id of visitedIds) {
        const node = graph.nodes.get(id);
        if (node) {
            subNodes.set(id, node);
        }

        const children = graph.relations.get(id);
        if (children) {
            subRelations.set(id, children);
        }
    }

    return {
        nodes: subNodes,
        relations: subRelations,
    };
}

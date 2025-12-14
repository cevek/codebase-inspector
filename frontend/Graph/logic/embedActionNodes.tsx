import {Graph} from '../Graph';

export function embedActionNodes(graph: Graph): Graph {
    const newGraph = graph.clone();
    for (const [id, node] of newGraph.nodes) {
        if (node.type === 'epic') {
            const epicId = id;
            const actionRelations = newGraph.relationsMap.get(epicId) ?? [];
            for (const epicActionRelation of actionRelations) {
                const actionId = epicActionRelation.to;
                const action = newGraph.nodes.get(actionId);
                if (!action || action.type !== 'action') continue;

                const actionRelations = newGraph.relationsMap.get(actionId) ?? [];
                if (action.name.includes('Success')) {
                    newGraph.removeRelation(epicId, actionId);
                    for (const actionRelation of actionRelations) {
                        const nextId = actionRelation.to;
                        newGraph.removeRelation(actionId, nextId);
                        newGraph.addRelation(epicId, nextId);
                        newGraph.addFromPortForRelation(epicId, 'success', nextId);
                    }
                    newGraph.removeNode(actionId);
                } else if (action.name.includes('Error')) {
                    newGraph.removeRelation(epicId, actionId);
                    for (const actionRelation of actionRelations) {
                        const nextId = actionRelation.to;
                        newGraph.removeRelation(actionId, nextId);
                        newGraph.addRelation(epicId, nextId);
                        newGraph.addFromPortForRelation(epicId, 'error', nextId);
                    }
                    newGraph.removeNode(actionId);
                }
            }
        } else if (node.type === 'action') {
            const actionId = id;
            const actionEpicRelations = newGraph.relationsMap.get(actionId);
            if (!actionEpicRelations || actionEpicRelations.length !== 1) continue;
            const epicId = actionEpicRelations[0].to;
            const epicNode = newGraph.nodes.get(epicId);
            if (!epicNode || epicNode.type !== 'epic') continue;
            if (epicNode.location.module !== node.location.module || epicNode.location.layer !== node.location.layer)
                continue;
            if (actionId.match(/:|Success|Error/)) continue;
            newGraph.removeRelation(actionId, epicId);
            const actionRelations = newGraph.reverseRelationsMap.get(actionId) ?? [];
            for (const actionRelation of actionRelations) {
                const prevId = actionRelation.from;
                newGraph.removeRelation(prevId, actionId);
                newGraph.addRelation(prevId, epicId);
                newGraph.addToPortForRelation(prevId, epicId, 'trigger');
            }
            newGraph.removeNode(actionId);
        }
    }
    return newGraph;
}

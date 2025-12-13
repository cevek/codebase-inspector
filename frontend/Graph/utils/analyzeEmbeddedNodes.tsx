import {Graph} from '../Graph';

export function embedActionNodes(graph: Graph) {
    // return;
    for (const [id, node] of graph.nodes) {
        if (node.type === 'epic') {
            const epicId = id;
            const actionRelations = graph.relationsMap.get(epicId) ?? [];
            for (const epicActionRelation of actionRelations) {
                const actionId = epicActionRelation.to;
                const action = graph.nodes.get(actionId);
                if (!action || action.type !== 'action') continue;

                const actionRelations = graph.relationsMap.get(actionId) ?? [];
                if (action.name.includes('Success')) {
                    graph.removeRelation(epicId, actionId);
                    for (const actionRelation of actionRelations) {
                        const nextId = actionRelation.to;
                        graph.removeRelation(actionId, nextId);
                        graph.addRelation(epicId, nextId);
                        graph.addFromPortForRelation(epicId, 'success', nextId);
                    }
                    graph.removeNode(actionId);
                } else if (action.name.includes('Error')) {
                    graph.removeRelation(epicId, actionId);
                    for (const actionRelation of actionRelations) {
                        const nextId = actionRelation.to;
                        graph.removeRelation(actionId, nextId);
                        graph.addRelation(epicId, nextId);
                        graph.addFromPortForRelation(epicId, 'error', nextId);
                    }
                    graph.removeNode(actionId);
                }
            }
        } else if (node.type === 'action') {
            const actionId = id;
            const actionEpicRelations = graph.relationsMap.get(actionId);
            if (!actionEpicRelations || actionEpicRelations.length !== 1) continue;
            const epicId = actionEpicRelations[0].to;
            const epicNode = graph.nodes.get(epicId);
            if (!epicNode || epicNode.type !== 'epic') continue;
            if (epicNode.location.module !== node.location.module || epicNode.location.layer !== node.location.layer)
                continue;
            if (actionId.match(/:|Success|Error/)) continue;
            graph.removeRelation(actionId, epicId);
            const actionRelations = graph.reverseRelationsMap.get(actionId) ?? [];
            for (const actionRelation of actionRelations) {
                const prevId = actionRelation.from;
                graph.removeRelation(prevId, actionId);
                graph.addRelation(prevId, epicId);
                graph.addToPortForRelation(prevId, epicId, 'trigger');
            }
            graph.removeNode(actionId);
        }
    }
}

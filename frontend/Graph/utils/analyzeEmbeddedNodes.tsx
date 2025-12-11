import {Graph, Id} from '../../../types';
import {EmbeddedNodeMap, PortMapping} from '../types';

export function analyzeEmbeddedNodes(graph: Graph): EmbeddedNodeMap {
    const map: EmbeddedNodeMap = {
        actionToEpicMap: new Map(),
        epicToActionsMap: new Map(),
    };

    for (const [id, node] of graph.nodes) {
        if (node.type === 'epic') {
            const actions = graph.relations.get(id) ?? [];
            for (const actionId of actions) {
                const action = graph.nodes.get(actionId);
                if (!action) continue;

                if (action.name.includes('Success')) {
                    addActionToEpicMap(actionId, id, 'success');
                } else if (action.name.includes('Error')) {
                    addActionToEpicMap(actionId, id, 'error');
                }
            }
        } else if (node.type === 'action') {
            const epicRelations = graph.relations.get(id);
            if (!epicRelations || epicRelations.length !== 1) continue;
            const epicId = epicRelations[0];
            const epicNode = graph.nodes.get(epicId);
            if (!epicNode || epicNode.type !== 'epic') continue;
            if (epicNode.location.module !== node.location.module || epicNode.location.layer !== node.location.layer)
                continue;
            addActionToEpicMap(id, epicId, 'trigger');
        }
    }
    return map;
    function addActionToEpicMap(actionId: Id, epicId: Id, portName: PortMapping['portName']) {
        map.actionToEpicMap.set(actionId, {ownerId: epicId, portName});
        let epic = map.epicToActionsMap.get(epicId);
        if (!epic) {
            epic = [];
            map.epicToActionsMap.set(epicId, epic);
        }
        epic.push({subId: actionId, portName});
    }
}

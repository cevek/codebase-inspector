import {Id, Item} from './types';

export function renormalizeGraphIds(input: {nodes: Map<Id, Item>; relations: Map<Id, Id[]>}): {
    nodes: Map<Id, Item>;
    relations: Map<Id, Id[]>;
} {
    const idMap = new Map<Id, Id>();
    const usedNewIds = new Set<Id>();

    const newNodes: Map<Id, Item> = new Map();
    const newRelations: Map<Id, Id[]> = new Map();

    for (const [oldId, node] of input.nodes) {
        const moduleName = node.location?.module || 'unknown';
        const cleanName = node.name || 'unnamed';

        const baseNewId = `${moduleName}/${cleanName}` as Id;

        let candidateId = baseNewId;
        let counter = 1;

        while (usedNewIds.has(candidateId)) {
            candidateId = `${baseNewId}$${counter}` as Id;
            counter++;
        }
        usedNewIds.add(candidateId);
        idMap.set(oldId, candidateId);

        newNodes.set(candidateId, node);
    }

    for (const [oldSourceId, oldTargets] of input.relations) {
        const newSourceId = idMap.get(oldSourceId);

        if (!newSourceId) continue;
        const newTargets: Id[] = [];

        for (const oldTargetId of oldTargets) {
            const newTargetId = idMap.get(oldTargetId);
            if (newTargetId) {
                newTargets.push(newTargetId);
            } else {
                console.warn(`⚠️ Warning: Relation points to missing node ID: ${oldTargetId}`);
            }
        }

        if (newTargets.length > 0) {
            newRelations.set(newSourceId, newTargets);
        }
    }

    return {
        nodes: newNodes,
        relations: newRelations,
    };
}

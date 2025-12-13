import {Cluster, Id, Item} from '../../types';
import {Direction, PortName} from './types';
import {generateGraphClusters} from './utils/generateGraphClusters';

export type Relation = {
    readonly from: Id;
    readonly to: Id;
};
export type PortMapping = {
    readonly relation: Relation;
    readonly fromPortName: PortName | null;
    readonly toPortName: PortName | null;
};

export class Graph {
    id = Math.random();
    relationsMap: Map<Id, Relation[]> = new Map();
    reverseRelationsMap: Map<Id, Relation[]> = new Map();
    protected _clusters: Map<Id, Cluster> | null = null;
    constructor(public nodes: Map<Id, Item>, public relations: Relation[], public portMappings: PortMapping[]) {
        for (const relation of this.relations) {
            this.relationsMap.set(relation.from, [...(this.relationsMap.get(relation.from) ?? []), relation]);
            this.reverseRelationsMap.set(relation.to, [...(this.reverseRelationsMap.get(relation.to) ?? []), relation]);
        }
    }
    get clusters() {
        if (!this._clusters)
            this._clusters = generateGraphClusters(
                [...this.nodes.entries()].map(([id, node]) => ({id, module: node.location.module})),
            );
        return this._clusters;
    }
    clone() {
        return new Graph(new Map(this.nodes), this.relations.slice(), this.portMappings.slice());
    }

    addFromPortForRelation(from: Id, fromPort: PortName, to: Id) {
        this._clusters = null;
        const relation = this.findRelation(from, to);
        if (!relation) return;

        let mapping = this.portMappings.find((pm) => pm.relation === relation);
        if (mapping) {
            (mapping as any).fromPortName = fromPort;
        } else {
            this.portMappings.push({relation, fromPortName: fromPort, toPortName: null});
        }
    }
    addToPortForRelation(from: Id, to: Id, toPort: PortName) {
        this._clusters = null;
        const relation = this.findRelation(from, to);
        if (!relation) return;

        let mapping = this.portMappings.find((pm) => pm.relation === relation);
        if (mapping) {
            (mapping as any).toPortName = toPort;
        } else {
            this.portMappings.push({relation, fromPortName: null, toPortName: toPort});
        }
    }

    findRelation(fromId: Id, toId: Id) {
        return this.relationsMap.get(fromId)?.find((v) => v.to === toId);
    }
    findChildren(id: Id) {
        return this.relationsMap.get(id) ?? [];
    }
    findChildren2(id: Id) {
        return this.relationsMap.get(id)?.map((v) => v.to) ?? [];
    }
    findParents(id: Id) {
        return this.reverseRelationsMap.get(id) ?? [];
    }
    findParents2(id: Id) {
        return this.reverseRelationsMap.get(id)?.map((v) => v.from) ?? [];
    }
    findSiblings(id: Id, withinParent?: Id) {
        const parents = this.findParents(id);
        const siblings = new Set<Id>();
        for (const parent of parents) {
            if (withinParent && parent.from !== withinParent) continue;
            for (const child of this.findChildren(parent.from)) {
                siblings.add(child.to);
            }
        }
        siblings.delete(id);
        return [...siblings];
    }

    addRelation(parent: Id, child: Id) {
        if (this.findRelation(parent, child)) return;

        this._clusters = null;
        const relation: Relation = {
            from: parent,
            to: child,
        };
        this.relations.push(relation);
        this.relationsMap.set(parent, [...(this.relationsMap.get(parent) ?? []), relation]);
        this.reverseRelationsMap.set(child, [...(this.reverseRelationsMap.get(child) ?? []), relation]);
    }
    removeRelation(parent: Id, child: Id) {
        this._clusters = null;
        const relationsToRemove = this.relationsMap.get(parent)?.filter((r) => r.to === child) ?? [];
        if (relationsToRemove.length === 0) return;

        this.relationsMap.set(parent, this.relationsMap.get(parent)?.filter((r) => r.to !== child) ?? []);

        this.reverseRelationsMap.set(
            child,
            this.reverseRelationsMap.get(child)?.filter((r) => r.from !== parent) ?? [],
        );

        relationsToRemove.forEach((rel) => {
            this.portMappings = this.portMappings.filter((pm) => pm.relation !== rel);
            const idx = this.relations.indexOf(rel);
            if (idx > -1) this.relations.splice(idx, 1);
        });
    }
    removeNode(id: Id) {
        this.nodes.delete(id);
        this.findChildren(id).forEach((child) => this.removeRelation(id, child.to));
        this.findParents(id).forEach((parent) => this.removeRelation(parent.from, id));
        this.relationsMap.delete(id);
        this.reverseRelationsMap.delete(id);
        this._clusters = null;
    }
    removeNodeRecursive(id: Id, dir: Direction, exceptIds?: Id[], exceptFn?: (node: Item, id: Id) => boolean) {
        const nodes = this.dfs(id, dir);
        for (const node of nodes) {
            if (exceptIds?.includes(node)) continue;
            if (exceptFn?.(this.nodes.get(node)!, node)) continue;
            this.removeNode(node);
        }
    }
    findRecursive(startId: Id, dir: Direction) {
        return this.dfs(startId, dir);
    }

    protected dfs(startId: Id, dir: Direction) {
        const visitedIds = new Set<Id>();
        const stack: Id[] = [startId];
        while (stack.length > 0) {
            const currentId = stack.pop()!;
            if (visitedIds.has(currentId)) continue;
            visitedIds.add(currentId);
            if (dir === 'forward') {
                this.findChildren(currentId).forEach((child) => {
                    if (this.findParents(child.to).length === 1) stack.push(child.to);
                });
            } else {
                this.findParents(currentId).forEach((parent) => {
                    if (this.findChildren(parent.from).length === 1) stack.push(parent.from);
                });
            }
        }
        return visitedIds;
    }

    removeAllExceptSubgraph(startNodeId: Id, exceptIds: Id[] = []) {
        const visitedIds = new Set<Id>();
        const stack: Id[] = [startNodeId];

        while (stack.length > 0) {
            const currentId = stack.pop()!;
            if (visitedIds.has(currentId)) continue;
            visitedIds.add(currentId);
            const children = this.relationsMap.get(currentId) ?? [];
            for (const childId of children) {
                if (!visitedIds.has(childId.to)) stack.push(childId.to);
            }
        }
        for (const [id] of this.nodes) {
            if (!visitedIds.has(id) && !exceptIds.includes(id)) this.removeNode(id);
        }
    }
}

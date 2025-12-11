import {Cluster, Graph, Id} from '../../types';

export type PortMapping = {
    ownerId: Id;
    portName: 'success' | 'error' | 'trigger';
};
export type ReversePortMapping = {
    subId: Id;
    portName: 'success' | 'error' | 'trigger';
};

export type EnrichedGraph = {
    graph: Graph;
    embeddedNodesMap: EmbeddedNodeMap;
    clusters: Map<Id, Cluster>;
};

export type EmbeddedNodeMap = {
    actionToEpicMap: Map<Id, PortMapping>;
    epicToActionsMap: Map<Id, ReversePortMapping[]>;
};

export interface NodeInfo {
    name: string;
    type: 'action' | 'epic';
    location: {
        module: string;
        url: string;
    };
}

export interface Cluster {
    id: string;
    name: string;
    subClusters: Cluster[];
    nodes: string[];
}

export interface Graph {
    nodes: Record<string, NodeInfo>;
    relations: Record<string, string[]>;
    clusters: Cluster[];
}

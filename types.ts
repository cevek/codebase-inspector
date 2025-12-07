export type Id = {_brand: 'Id'} & string;
export type BaseItem = {
    name: string;
    location: Loc;
};

export type Loc = {
    url: string;
    module: string;
};

export type ApiRequest = {
    type: 'POST' | 'GET' | 'PUT' | 'DELETE';
    url: string;
    location: Loc;
};
export type ApiCall = {
    requests: ApiRequest[];
    successId: Id | null;
    errorId: Id | null;
};
export type Action = BaseItem & {
    type: 'action';
};

export type Epic = BaseItem & {
    type: 'epic';
    apiCall: ApiCall;
};

export type Item = Action | Epic;

export interface Cluster {
    id: Id;
    name: string;
    subClusters: Id[];
    nodes: Id[];
}

export type Graph = {
    nodes: Map<Id, Item>;
    relations: Map<Id, Id[]>;
};

export type GraphSerialized = {
    nodes: {[k: Id]: Item};
    relations: {[k: Id]: Id[]};
};

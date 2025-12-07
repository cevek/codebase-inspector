import {createRoot} from 'react-dom/client';
import * as data from '../data.json';
import {App} from './Graph/App';
import {Graph, GraphSerialized, Id, Item} from '../types';

const graphSerialized = data as GraphSerialized;
const graph: Graph = {
    nodes: new Map(Object.entries(graphSerialized.nodes) as [Id, Item][]),
    relations: new Map(Object.entries(graphSerialized.relations) as [Id, Id[]][]),
};

createRoot(document.getElementById('root')!).render(<App data={graph} />);

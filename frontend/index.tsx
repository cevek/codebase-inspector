import {createRoot} from 'react-dom/client';
import {App} from './Graph/App';
import {Graph, GraphSerialized, Id, Item} from '../types';
import {loadStateFromUrl} from './Graph/utils/decodeUrlPayload';

const urlPayload = window.location.hash.slice('#payload='.length);
let graphSerialized = urlPayload ? await loadStateFromUrl<GraphSerialized>(urlPayload) : null;

const reactRoot = createRoot(document.getElementById('root')!);
if (graphSerialized) {
    const graph: Graph = {
        nodes: new Map(Object.entries(graphSerialized.nodes) as [Id, Item][]),
        relations: new Map(Object.entries(graphSerialized.relations) as [Id, Id[]][]),
    };
    reactRoot.render(<App data={graph} />);
} else {
    reactRoot.render(<h1 style={{textAlign: 'center', marginTop: 100}}>Nothing to show</h1>);
}

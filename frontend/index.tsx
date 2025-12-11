import {createRoot} from 'react-dom/client';
import {App} from './Graph/App';
import {Graph, GraphSerialized, Id, Item} from '../types';
import {loadStateFromUrl} from './Graph/utils/decodeUrlPayload';
import {enrichGraph} from './Graph/utils/enrichGraph';

const urlPayload = window.location.hash.slice('#payload='.length);
let graphSerialized = urlPayload ? await loadStateFromUrl<GraphSerialized>(urlPayload) : null;

const reactRoot = createRoot(document.getElementById('root')!);
if (graphSerialized) {
    const graph: Graph = {
        nodes: new Map(Object.entries(graphSerialized.nodes) as [Id, Item][]),
        relations: new Map(Object.entries(graphSerialized.relations) as [Id, Id[]][]),
    };
    const enrichedGraph = enrichGraph(graph);
    reactRoot.render(<App data={enrichedGraph} />);
} else {
    reactRoot.render(<h1 style={{textAlign: 'center', marginTop: 100}}>Nothing to show</h1>);
}

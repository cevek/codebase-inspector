import {createRoot} from 'react-dom/client';
import {GraphData, GraphSerialized, Id, Item} from '../types';
import {App} from './Graph/App';
import {Graph} from './Graph/Graph';
import {loadStateFromUrl} from './Graph/utils/decodeUrlPayload';
import {embedActionNodes} from './Graph/utils/analyzeEmbeddedNodes';

const urlPayload = window.location.hash.slice('#payload='.length);
let graphSerialized = urlPayload ? await loadStateFromUrl<GraphSerialized>(urlPayload) : null;

const reactRoot = createRoot(document.getElementById('root')!);
if (graphSerialized) {
    const graph = new Graph(
        new Map(Object.entries(graphSerialized.nodes) as [Id, Item][]),
        Object.entries(graphSerialized.relations).flatMap(([from, toList]) =>
            toList.map((to) => ({from: from as Id, to})),
        ),
        [],
    );
    embedActionNodes(graph);
    reactRoot.render(<App data={graph} />);
} else {
    reactRoot.render(<h1 style={{textAlign: 'center', marginTop: 100}}>Nothing to show</h1>);
}

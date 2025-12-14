import {createRoot} from 'react-dom/client';
import {GraphSerialized, Id, Item} from '../types';
import {GraphEditor} from './Graph/GraphEditor/GraphEditor';
import {Graph} from './Graph/Graph';
import {embedActionNodes} from './Graph/logic/embedActionNodes';
import {loadStateFromUrl} from './Graph/utils/decodeUrlPayload';

const urlPayload = window.location.hash.match(/payload=([^&]*)/)?.[1];
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
    reactRoot.render(<GraphEditor data={graph} />);
} else {
    reactRoot.render(<h1 style={{textAlign: 'center', marginTop: 100}}>Nothing to show</h1>);
}

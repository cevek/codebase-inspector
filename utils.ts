import * as ts from 'typescript';
import {Id, Loc, printer} from './findEpicsAndActions';
import {basename, dirname} from 'node:path';

export function getNodeKey(node: ts.Node): Id {
    const sourceFile = node.getSourceFile();
    return `${sourceFile.fileName}:${node.getStart()}` as Id;
}

export function getUrlFromArgument(arg: ts.Node, sourceFile: ts.SourceFile): string {
    if (!arg) return 'undefined';
    if (ts.isStringLiteral(arg)) {
        return arg.text;
    }
    return printer.printNode(ts.EmitHint.Unspecified, arg, sourceFile);
}

export function getLocation(node: ts.Node): Loc {
    const sourceFile = node.getSourceFile();

    const {line, character} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    let module = basename(dirname(sourceFile.fileName));

    if (sourceFile.fileName.includes('/common/')) module = 'common/' + module;

    return {
        url: sourceFile.fileName + ':' + (line + 1) + ':' + (character + 1),
        module,
    };
}

export function getOrCreateInMap<K, V>(map: Map<K, V>, key: K, factory: () => V) {
    if (map.has(key)) {
        return map.get(key)!;
    }
    const value = factory();
    map.set(key, value);
    return value;
}

type NodeData = {
    name: string;
    location: {
        module: string;
    };
};

type InputGraph = {
    nodes: Record<string, NodeData>;
    relations: Record<string, string[]>;
};

type Cluster = {
    id: string;
    name: string;
    subClusters: Cluster[];
    nodes: string[];
};

type GraphWithClusters = InputGraph & {
    clusters: Cluster[];
};

export function enrichGraphWithClusters(graph: InputGraph): GraphWithClusters {
    const rootClusters: Cluster[] = [];

    Object.entries(graph.nodes).forEach(([nodeId, node]) => {
        const pathString = node.location.module;

        if (!pathString) return;

        const pathParts = pathString.split('/').filter(Boolean);

        let currentLevelClusters = rootClusters;
        const partsForId: string[] = [];

        pathParts.forEach((part, index) => {
            partsForId.push(part);

            const fullPathName = partsForId.join('/');

            let cluster = currentLevelClusters.find((c) => c.name === fullPathName);

            if (!cluster) {
                cluster = {
                    id: fullPathName,
                    name: fullPathName,
                    subClusters: [],
                    nodes: [],
                };
                currentLevelClusters.push(cluster);
            }

            const isLastPart = index === pathParts.length - 1;
            if (isLastPart) {
                cluster.nodes.push(nodeId);
            }
            currentLevelClusters = cluster.subClusters;
        });
    });

    return {
        ...graph,
        clusters: rootClusters,
    };
}

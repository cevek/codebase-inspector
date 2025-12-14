import * as ts from 'typescript';
import { Id } from '../types';


export function getNodeKey(node: ts.Node): Id {
    const sourceFile = node.getSourceFile();
    return `${sourceFile.fileName}:${node.getStart()}` as Id;
}

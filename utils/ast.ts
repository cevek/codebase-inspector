import * as ts from 'typescript';
import {basename, dirname} from 'node:path';
import {Id, Loc} from '../types';

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

export const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed, omitTrailingSemicolon: true});

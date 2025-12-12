import * as ts from 'typescript';
import path, {basename, dirname} from 'node:path';
import {Id, Loc} from '../types';
import {CONFIG} from '../analyzeProject';

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

export function getLocation(tsconfigDir: string, node: ts.Node): Loc {
    const sourceFile = node.getSourceFile();
    const fileName = path.resolve(tsconfigDir, sourceFile.fileName);

    const {line, character} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    let module = basename(dirname(fileName));
    if (fileName.match(/\/(components|containers)\//)) module = 'Components';
    if (fileName.includes('/common/')) module = 'common/' + module;

    let type: Loc['layer'] = null;
    for (const layer of CONFIG.layers) {
        if (fileName.match(layer.regex)) {
            type = layer.type;
            break;
        }
    }

    return {
        url: fileName + ':' + (line + 1) + ':' + (character + 1),
        module,
        layer: type,
    };
}

export const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed, omitTrailingSemicolon: true});

import path from 'path';
import {basename, dirname} from 'path/posix';
import * as ts from 'typescript';
import {CONFIG} from '../config';
import {Loc} from '../types';

export function getLocation(tsconfigDir: string, node: ts.Node): Loc {
    const sourceFile = node.getSourceFile();
    const fileName = path.resolve(tsconfigDir, sourceFile.fileName);

    const {line, character} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    let module = basename(dirname(fileName));
    if (fileName.match(/\/(components|containers|screens|forms|app|layouts)\//)) module = 'Components';
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

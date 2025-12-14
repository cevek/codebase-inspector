import * as ts from 'typescript';
import {CONFIG} from '../config';
import {AnalyzerContext} from '../core/AnalyzerContext';
import {getNodeKey} from '../utils/getNodeKey';
import {getLocation} from '../utils/getLocation';

export function collectActions(context: AnalyzerContext) {
    for (const sourceFile of context.program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;

        const visit = (node: ts.Node) => {
            if (ts.isVariableDeclaration(node) || ts.isBindingElement(node)) {
                const ident = node.name;
                if (ts.isIdentifier(ident)) {
                    checkIdentifierForAction(context, ident);
                }
            }
            ts.forEachChild(node, visit);
        };

        ts.forEachChild(sourceFile, visit);
    }
}

function checkIdentifierForAction(context: AnalyzerContext, ident: ts.Identifier) {
    const type = context.checker.getTypeAtLocation(ident);
    const typeString = context.checker.typeToString(type, ident, ts.TypeFormatFlags.NoTruncation);
    const isAction = CONFIG.actions.typeKeywords.some((keyword) => typeString.includes(keyword));

    if (isAction) {
        context.actions.set(getNodeKey(ident), {
            name: ident.text,
            location: getLocation(context.folder, ident),
            type: 'action',
        });
    }
}

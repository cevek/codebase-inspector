import * as ts from 'typescript';
import {CONFIG} from '../config';
import {AnalyzerContext} from '../core/AnalyzerContext';
import {Id} from '../types';
import {getNodeKey} from '../utils/getNodeKey';
import {getLocation} from '../utils/getLocation';

export function collectComponents(context: AnalyzerContext) {
    for (const sourceFile of context.program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;

        const visit = (node: ts.Node) => {
            if (ts.isVariableDeclaration(node)) {
                const ident = node.name;
                if (ts.isIdentifier(ident)) {
                    checkIdentifierForComponent(context, ident, node);
                }
            }
            if (ts.isFunctionDeclaration(node)) {
                if (node.name && ts.isIdentifier(node.name)) {
                    checkIdentifierForComponent(context, node.name, node.body!);
                }
            }
            ts.forEachChild(node, visit);
        };

        ts.forEachChild(sourceFile, visit);
    }
}

function checkIdentifierForComponent(context: AnalyzerContext, ident: ts.Identifier, body: ts.Node) {
    if (!/^[A-Z]/.test(ident.text)) return;
    const type = context.checker.getTypeAtLocation(ident);
    let typeString = context.checker.typeToString(type, ident, ts.TypeFormatFlags.NoTruncation);
    typeString = typeString.replace(/import\(\".*?node_modules\/\@types\/react\/.*?\"\)/g, 'React');
    const isComponent = CONFIG.components.types.some((keyword) => typeString.includes(keyword));

    if (isComponent) {
        context.components.set(getNodeKey(ident), {
            data: {
                name: ident.text,
                location: getLocation(context.folder, ident),
                type: 'component',
            },
            node: ident,
        });
    }
}

export function analyzeComponentUsage(context: AnalyzerContext) {
    for (const [componentId, {node: componentNode}] of context.components) {
        let body: ts.Node | undefined;
        const parent = componentNode.parent;
        if (ts.isVariableDeclaration(parent) && parent.initializer) {
            body = parent.initializer;
        } else if (ts.isFunctionDeclaration(parent)) {
            body = parent.body;
        }
        if (!body) continue;

        const visit = (node: ts.Node) => {
            if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
                const tagName = node.tagName;
                if (ts.isIdentifier(tagName)) {
                    checkUsage(context, tagName, componentId, 'component');
                } else if (ts.isPropertyAccessExpression(tagName)) {
                    checkUsage(context, tagName.name, componentId, 'component');
                }
            }
            if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
                checkImportCall(context, node, componentId);
            }
            if (ts.isIdentifier(node)) {
                checkUsage(context, node, componentId, 'action');
            }
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(body, visit);
    }
}

function checkImportCall(context: AnalyzerContext, node: ts.CallExpression, componentId: Id) {
    const arg = node.arguments[0];
    if (!arg || !ts.isStringLiteral(arg)) return;
    const symbol = context.checker.getSymbolAtLocation(arg);
    if (!symbol) return;
    const exports = context.checker.getExportsOfModule(symbol);
    const defaultExport = exports.find((e) => e.name === 'default');
    if (!defaultExport) return;
    let targetSymbol = defaultExport;
    if (targetSymbol.flags & ts.SymbolFlags.Alias) {
        targetSymbol = context.checker.getAliasedSymbol(targetSymbol);
    }
    const declarations = targetSymbol.getDeclarations();
    if (!declarations) return;
    for (const declaration of declarations) {
        let keyNode: ts.Node = declaration;
        if ((ts.isVariableDeclaration(declaration) || ts.isFunctionDeclaration(declaration)) && declaration.name) {
            keyNode = declaration.name;
        }
        const key = getNodeKey(keyNode);
        if (context.components.has(key)) {
            context.addRelation(componentId, key);
            return;
        }
    }
}

function checkUsage(
    context: AnalyzerContext,
    identifier: ts.Identifier | ts.MemberName,
    sourceId: Id,
    targetType: 'component' | 'action',
) {
    let symbol = context.checker.getSymbolAtLocation(identifier);
    if (!symbol) return;
    if (symbol.flags & ts.SymbolFlags.Alias) {
        symbol = context.checker.getAliasedSymbol(symbol);
    }
    const declarations = symbol.getDeclarations();
    if (!declarations) return;
    for (const declaration of declarations) {
        let keyNode: ts.Node = declaration;
        if ((ts.isVariableDeclaration(declaration) || ts.isFunctionDeclaration(declaration)) && declaration.name) {
            keyNode = declaration.name;
        }
        const key = getNodeKey(keyNode);
        if (targetType === 'component' && context.components.has(key)) {
            if (key !== sourceId) context.addRelation(sourceId, key);
            return;
        }
        if (targetType === 'action' && context.actions.has(key)) {
            context.addRelation(sourceId, key);
            return;
        }
    }
}

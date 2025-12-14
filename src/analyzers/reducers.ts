import * as ts from 'typescript';
import {CONFIG} from '../config';
import {AnalyzerContext} from '../core/AnalyzerContext';
import {Id} from '../types';
import {getLocation, getNodeKey} from '../utils/ast';

export function collectReducers(context: AnalyzerContext) {
    for (const sourceFile of context.program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;

        const visit = (node: ts.Node) => {
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
                if (CONFIG.reducers.creators.includes(node.expression.text as 'createSlice')) {
                    processSliceCreation(context, node);
                }
            }
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(sourceFile, visit);
    }
}

function processSliceCreation(context: AnalyzerContext, node: ts.CallExpression) {
    if (node.arguments.length === 0) return;
    const creatorName = (node.expression as ts.Identifier).text;

    // 1. Determine Slice Name and ID
    let sliceName = 'UnknownSlice';
    let locationNode: ts.Node = node;

    // If assigned to variable: const myReducer = createReducer(...)
    if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
        sliceName = node.parent.name.text;
        locationNode = node.parent.name;
    }

    // Register Slice (implied by reducers usually, but here we just need the ID to link)
    const sliceId = getNodeKey(locationNode);

    // 2. Find builder function or reducers object
    let builderNode: ts.Node | undefined;

    if (creatorName === 'createSlice') {
        const configArg = node.arguments[0];
        if (ts.isObjectLiteralExpression(configArg)) {
            const extraReducersProp = configArg.properties.find(
                (p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'extraReducers',
            );

            if (extraReducersProp && ts.isPropertyAssignment(extraReducersProp)) {
                builderNode = extraReducersProp.initializer;
            } else if (extraReducersProp && ts.isMethodDeclaration(extraReducersProp)) {
                // @ts-ignore
                builderNode = extraReducersProp.body;
            }
        }
    } else if (creatorName === 'createReducer') {
        if (node.arguments.length > 1) {
            builderNode = node.arguments[1];
        }
    }

    // 3. Analyze Builder and create CaseReducer nodes
    if (builderNode) {
        analyzeBuilder(context, builderNode, sliceId, sliceName);
    }
}

function analyzeBuilder(context: AnalyzerContext, builderNode: ts.Node, sliceId: Id, sliceName: string) {
    let body: ts.Node = builderNode;
    // Unwrap arrow function
    if (ts.isArrowFunction(builderNode) || ts.isFunctionExpression(builderNode)) {
        body = builderNode.body;
    }

    let counter = 1;

    const visitBuilderOps = (node: ts.Node) => {
        // Find builder.addCase(...)
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const methodName = node.expression.name.text;

            if (methodName === CONFIG.reducers.builderMethods.case && node.arguments.length >= 2) {
                const actionArg = node.arguments[0];
                const reducerFn = node.arguments[1];

                // Create node for CaseReducer
                const caseReducerName = `${sliceName}_${counter++}`;
                const caseReducerId = getNodeKey(reducerFn); // ID from the reducer function itself

                context.reducers.set(caseReducerId, {
                    name: caseReducerName,
                    type: 'reducer',
                    location: getLocation(context.folder, reducerFn),
                    parentSliceName: sliceName,
                });

                // Link: CaseReducer -> Slice
                context.addRelation(caseReducerId, sliceId);

                // Link: Action -> CaseReducer
                connectActionToReducer(context, actionArg, caseReducerId);
            }
        }
        ts.forEachChild(node, visitBuilderOps);
    };

    ts.forEachChild(body, visitBuilderOps);
}

function connectActionToReducer(context: AnalyzerContext, actionArg: ts.Node, reducerId: Id) {
    let identifier: ts.Identifier | undefined;

    // 1. Direct identifier: addCase(myAction, ...)
    if (ts.isIdentifier(actionArg)) {
        identifier = actionArg;
    }
    // 2. AsyncThunk property: addCase(fetchUser.fulfilled, ...)
    else if (ts.isPropertyAccessExpression(actionArg) && ts.isIdentifier(actionArg.expression)) {
        identifier = actionArg.expression;
    }
    // 3. Call: addCase(someAction(), ...)
    else if (ts.isCallExpression(actionArg) && ts.isIdentifier(actionArg.expression)) {
        identifier = actionArg.expression;
    }

    if (identifier) {
        resolveAndLinkAction(context, identifier, reducerId);
    }
}

function resolveAndLinkAction(context: AnalyzerContext, identifier: ts.Identifier, reducerId: Id) {
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

        const actionId = getNodeKey(keyNode);

        // If we have this action registered - link it
        if (context.actions.has(actionId)) {
            context.addRelation(actionId, reducerId);
            return;
        }
    }
}

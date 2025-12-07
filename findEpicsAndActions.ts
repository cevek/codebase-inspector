import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import {renormalizeGraphIds} from './renormalizeGraphIds';
import {getLocation, getNodeKey, getUrlFromArgument} from './utils/ast';
import {Action, ApiCall, ApiRequest, Epic, Id, Item} from './types';

function findActions(program: ts.Program): Map<Id, Action> {
    const actions = new Map<Id, Action>();
    const checker = program.getTypeChecker();

    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;

        ts.forEachChild(sourceFile, function visit(node) {
            if (ts.isVariableDeclaration(node) || ts.isBindingElement(node)) {
                const ident = node.name;
                if (ts.isIdentifier(ident)) {
                    const type = checker.getTypeAtLocation(ident);
                    const typeString = checker.typeToString(type, ident, ts.TypeFormatFlags.NoTruncation);
                    const isAction =
                        (typeString.includes('.ActionCreator') && typeString.includes('@reduxjs/toolkit')) ||
                        typeString.includes('CallHistoryMethodAction') ||
                        typeString.includes('@@router/');
                    if (isAction) {
                        actions.set(getNodeKey(ident), {
                            name: ident.text,
                            location: getLocation(ident),
                            type: 'action',
                        });
                    }
                }
            }

            ts.forEachChild(node, visit);
        });
    }
    return actions;
}

function analyzeEpicBody(
    epicName: string,
    epicId: Id,
    body: ts.Node | undefined,
    checker: ts.TypeChecker,
    actionsMap: Map<Id, Action>,
    sourceFile: ts.SourceFile,
): {subscriptions: Id[]; dispatches: Id[]; apiCall: ApiCall} {
    const subscriptions: Id[] = [];
    const dispatches: Id[] = [];
    const apiCall: ApiCall = {
        requests: [],
        successId: null,
        errorId: null,
    };

    if (!body) return {subscriptions, dispatches, apiCall};

    function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const propAccess = node.expression;

            if (ts.isIdentifier(propAccess.expression)) {
                const objectName = propAccess.expression.text;
                const methodName = propAccess.name.text;

                if (objectName === 'RestAPI') {
                    let type: ApiRequest['type'] | null = null;
                    if (methodName === 'get') type = 'GET';
                    if (methodName === 'post') type = 'POST';
                    if (methodName === 'put') type = 'PUT';
                    if (methodName === 'del') type = 'DELETE';

                    if (type) {
                        const urlArg = node.arguments[1];
                        if (urlArg) {
                            apiCall.requests.push({
                                type,
                                url: getUrlFromArgument(urlArg, sourceFile),
                                location: getLocation(node),
                            });
                        }
                    }
                }

                if (objectName === 'gatewayBookingClient') {
                    let type: ApiRequest['type'] | null = null;
                    if (['GET', 'POST', 'PUT', 'DELETE'].includes(methodName)) {
                        type = methodName as ApiRequest['type'];
                    }

                    if (type) {
                        const urlArg = node.arguments[0];
                        if (urlArg) {
                            apiCall.requests.push({
                                type,
                                url: getUrlFromArgument(urlArg, sourceFile),
                                location: getLocation(node),
                            });
                        }
                    }
                }
            }
        }

        const processIdentifier = (identifier: ts.Identifier, type: 'subscription' | 'dispatch') => {
            let symbol = checker.getSymbolAtLocation(identifier);
            if (!symbol) return;

            if (symbol.flags & ts.SymbolFlags.Alias) {
                symbol = checker.getAliasedSymbol(symbol);
            }

            const declarations = symbol.getDeclarations();
            if (!declarations) return;
            for (const declaration of declarations) {
                const key = getNodeKey(declaration);
                // if (identifier.text === 'fetchLeadsDataProviderAction') console.log('replace', key);
                if (actionsMap.has(key)) {
                    if (type === 'subscription') {
                        subscriptions.push(key);
                    } else {
                        dispatches.push(key);
                    }
                    break;
                }
            }
        };

        if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression) && node.expression.text === 'ofType') {
                for (const arg of node.arguments) {
                    let identifier: ts.Identifier | undefined;

                    if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.name) && arg.name.text === 'type') {
                        const expression = arg.expression;
                        if (ts.isIdentifier(expression)) {
                            identifier = expression;
                        } else if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
                            identifier = expression.expression;
                        }
                    } else if (ts.isIdentifier(arg)) {
                        identifier = arg;
                    }

                    if (identifier) {
                        processIdentifier(identifier, 'subscription');
                    }
                }
            }
        } else if (ts.isIdentifier(node)) {
            processIdentifier(node, 'dispatch');
        }
        ts.forEachChild(node, visit);
    }

    visit(body);
    const subsMap = new Set(subscriptions);
    const dispatchMap = new Set(dispatches);
    return {
        subscriptions: [...subsMap],
        dispatches: [...dispatchMap].filter((d) => !subsMap.has(d)),
        apiCall,
    };
}

function findEpics(program: ts.Program, actionsMap: Map<Id, Action>, relations: Map<Id, Id[]>): Map<Id, Epic> {
    const epics: Map<Id, Epic> = new Map();
    const checker = program.getTypeChecker();

    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;

        ts.forEachChild(sourceFile, function visit(node) {
            const processEpic = (name: string, body: ts.Node | undefined, startNode: ts.Node) => {
                if (name.endsWith('Epic')) {
                    const id = getNodeKey(startNode);
                    const {subscriptions, dispatches, apiCall} = analyzeEpicBody(
                        name,
                        id,
                        body,
                        checker,
                        actionsMap,
                        sourceFile,
                    );
                    function addRelation(from: Id, to: Id) {
                        relations.set(from, [...(relations.get(from) ?? []), to]);
                    }
                    for (const subscription of subscriptions) {
                        addRelation(subscription, id);
                    }
                    for (const dispatch of dispatches) {
                        addRelation(id, dispatch);
                    }

                    epics.set(id, {
                        name,
                        type: 'epic',
                        location: getLocation(startNode),
                        apiCall: apiCall,
                    });
                }
            };

            if (ts.isFunctionDeclaration(node) && node.name) {
                processEpic(node.name.text, node.body, node);
            } else if (ts.isVariableStatement(node)) {
                for (const decl of node.declarationList.declarations) {
                    if (
                        ts.isIdentifier(decl.name) &&
                        decl.initializer &&
                        (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
                    ) {
                        processEpic(decl.name.text, decl.initializer.body, node);
                    }
                }
            }
            ts.forEachChild(node, visit);
        });
    }
    return epics;
}

function analyzeProject(folder: string) {
    const tsConfigPath = ts.findConfigFile(folder, ts.sys.fileExists, 'tsconfig.json');
    if (!tsConfigPath) {
        console.error('Could not find a valid "tsconfig.json".');
        return;
    }

    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(tsConfigPath));
    const program = ts.createProgram(compilerOptions.fileNames, compilerOptions.options);

    const relations_ = new Map<Id, Id[]>();
    const actionsMap = findActions(program);
    const epicsMap = findEpics(program, actionsMap, relations_);
    const nodes_ = new Map<Id, Item>([...actionsMap, ...epicsMap]);
    const {nodes, relations} = renormalizeGraphIds({nodes: nodes_, relations: relations_});

    const data = {
        nodes: Object.fromEntries(nodes),
        relations: Object.fromEntries(relations),
    };
    fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

const folderPath = '/Users/cody/Dev/backoffice/apps/scheduler/';
// const folderPath = '/Users/cody/Dev/backoffice/apps/patient-care/';
analyzeProject(folderPath);

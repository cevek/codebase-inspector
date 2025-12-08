import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import {renormalizeGraphIds} from './renormalizeGraphIds';
import {getLocation, getNodeKey, getUrlFromArgument} from './utils/ast';
import {Action, ApiCall, ApiRequest, Epic, Id, Item} from './types';
import {compressFileIntoUrlSafeString} from './utils/compressFile';
import open from 'open';

const CONFIG = {
    apiClients: {
        RestAPI: {
            methods: {get: 'GET', post: 'POST', put: 'PUT', del: 'DELETE'},
            urlArgIndex: 1,
        },
        gatewayBookingClient: {
            methods: {GET: 'GET', POST: 'POST', PUT: 'PUT', DELETE: 'DELETE'},
            urlArgIndex: 0,
        },
    },
    actions: {
        typeKeywords: ['ActionCreator', 'CallHistoryMethodAction', '@@router/'],
    },
    epics: {
        rootEpicNames: ['rootEpic'],
        typeKeywords: ['Epic'],
        operators: {filter: 'ofType'},
    },
};

type HttpMethod = ApiRequest['type'];

class ReduxProjectAnalyzer {
    private program: ts.Program;
    private checker: ts.TypeChecker;
    private actions = new Map<Id, Action>();
    private epics = new Map<Id, Epic>();
    private relations = new Map<Id, Id[]>();

    constructor(folder: string) {
        const {program, checker} = this.createProgram(folder);
        this.program = program;
        this.checker = checker;
    }

    private createProgram(folder: string) {
        const tsConfigPath = ts.findConfigFile(folder, ts.sys.fileExists, 'tsconfig.json');
        if (!tsConfigPath) throw new Error(`Could not find tsconfig.json in ${folder}`);

        const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(tsConfigPath));
        const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
        return {
            program,
            checker: program.getTypeChecker(),
        };
    }

    public analyze() {
        this.collectActions();
        this.collectEpics();

        const allNodes = new Map<Id, Item>([...this.actions, ...this.epics]);
        const result = renormalizeGraphIds({nodes: allNodes, relations: this.relations});

        const output = {
            nodes: Object.fromEntries(result.nodes),
            relations: Object.fromEntries(result.relations),
        };
        // fs.writeFileSync('./data.json', JSON.stringify(output));

        open('https://cevek.github.io/codebase-inspector/#payload=' + compressFileIntoUrlSafeString(JSON.stringify(output)));
        console.log('Analysis complete. data.json saved.');
    }

    private collectActions() {
        for (const sourceFile of this.program.getSourceFiles()) {
            if (sourceFile.isDeclarationFile) continue;

            const visit = (node: ts.Node) => {
                if (ts.isVariableDeclaration(node) || ts.isBindingElement(node)) {
                    const ident = node.name;
                    if (ts.isIdentifier(ident)) {
                        this.checkIdentifierForAction(ident);
                    }
                }
                ts.forEachChild(node, visit);
            };

            ts.forEachChild(sourceFile, visit);
        }
    }

    private checkIdentifierForAction(ident: ts.Identifier) {
        const type = this.checker.getTypeAtLocation(ident);
        const typeString = this.checker.typeToString(type, ident, ts.TypeFormatFlags.NoTruncation);

        const isAction = CONFIG.actions.typeKeywords.some((keyword) => typeString.includes(keyword));

        if (isAction) {
            this.actions.set(getNodeKey(ident), {
                name: ident.text,
                location: getLocation(ident),
                type: 'action',
            });
        }
    }

    private collectEpics() {
        for (const sourceFile of this.program.getSourceFiles()) {
            if (sourceFile.isDeclarationFile) continue;

            for (const statement of sourceFile.statements) {
                if (ts.isVariableStatement(statement)) {
                    for (const decl of statement.declarationList.declarations) {
                        // const x: Epic = ... ?
                        if (ts.isIdentifier(decl.name) && decl.initializer && this.isNodeEpic(decl, decl.name.text)) {
                            this.processEpic(decl.name.text, decl.initializer, statement, sourceFile);
                        }
                    }
                }
            }
        }
    }

    private isNodeEpic(decl: ts.VariableDeclaration, epicName: string): boolean {
        if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) return false;
        const type = this.checker.getTypeAtLocation(decl.name);
        const typeString = this.checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
        if (CONFIG.epics.rootEpicNames.some((name) => name.includes(epicName))) return false;
        return CONFIG.epics.typeKeywords.some((keyword) => typeString.includes(keyword));
    }

    private processEpic(name: string, body: ts.Node, startNode: ts.Node, sourceFile: ts.SourceFile) {
        const epicId = getNodeKey(startNode);

        let realBody = body;
        if (ts.isArrowFunction(body) || ts.isFunctionExpression(body)) {
            realBody = body.body;
        }

        const analyzer = new EpicBodyAnalyzer(realBody, this.checker, this.actions, sourceFile);
        const {subscriptions, dispatches, apiCall} = analyzer.analyze();

        subscriptions.forEach((subId) => this.addRelation(subId, epicId));
        dispatches.forEach((dispatchId) => this.addRelation(epicId, dispatchId));

        this.epics.set(epicId, {
            name,
            type: 'epic',
            location: getLocation(startNode),
            apiCall,
        });
    }

    private addRelation(from: Id, to: Id) {
        const existing = this.relations.get(from) ?? [];
        this.relations.set(from, [...existing, to]);
    }
}

class EpicBodyAnalyzer {
    private subscriptions: Id[] = [];
    private dispatches: Id[] = [];
    private apiCall: ApiCall = {requests: [], successId: null, errorId: null};

    constructor(
        private body: ts.Node | undefined,
        private checker: ts.TypeChecker,
        private actionsMap: Map<Id, Action>,
        private sourceFile: ts.SourceFile,
    ) {}

    public analyze() {
        if (!this.body) return {subscriptions: [], dispatches: [], apiCall: this.apiCall};

        this.visit(this.body);

        const subsSet = new Set(this.subscriptions);
        const dispatchSet = new Set(this.dispatches);

        return {
            subscriptions: [...subsSet],
            dispatches: [...dispatchSet].filter((d) => !subsSet.has(d)),
            apiCall: this.apiCall,
        };
    }

    private visit = (node: ts.Node) => {
        // 1. API Calls Check
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            this.checkApiCall(node, node.expression);
        }

        // 2. Subscriptions (ofType) Check
        if (ts.isCallExpression(node)) {
            this.checkOfType(node);
        }

        // 3. Dispatches Check (Any Identifier)
        if (ts.isIdentifier(node)) {
            this.processIdentifier(node, 'dispatch');
        }

        ts.forEachChild(node, this.visit);
    };

    private checkApiCall(node: ts.CallExpression, propAccess: ts.PropertyAccessExpression) {
        if (!ts.isIdentifier(propAccess.expression)) return;

        const objectName = propAccess.expression.text as keyof typeof CONFIG.apiClients;
        const methodName = propAccess.name.text as never;

        const clientConfig = CONFIG.apiClients[objectName];

        if (!clientConfig) return;

        const httpMethod = clientConfig.methods[methodName];

        if (httpMethod) {
            const urlIndex = clientConfig.urlArgIndex;
            if (node.arguments.length > urlIndex) {
                const urlArg = node.arguments[urlIndex];
                this.apiCall.requests.push({
                    type: httpMethod as HttpMethod,
                    url: getUrlFromArgument(urlArg, this.sourceFile),
                    location: getLocation(node),
                });
            }
        }
    }
    private checkOfType(node: ts.CallExpression) {
        let isOfType = false;
        if (ts.isIdentifier(node.expression) && node.expression.text === CONFIG.epics.operators.filter) {
            isOfType = true;
        } else if (
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === CONFIG.epics.operators.filter
        ) {
            isOfType = true;
        }

        if (isOfType) {
            for (const arg of node.arguments) {
                let identifier: ts.Identifier | undefined;

                // Case: action.type
                if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.name) && arg.name.text === 'type') {
                    const expression = arg.expression;
                    if (ts.isIdentifier(expression)) {
                        identifier = expression;
                    } else if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
                        // Case: someAction().type
                        identifier = expression.expression;
                    }
                }
                // Case: action
                else if (ts.isIdentifier(arg)) {
                    identifier = arg;
                }

                if (identifier) {
                    this.processIdentifier(identifier, 'subscription');
                }
            }
        }
    }

    private processIdentifier(identifier: ts.Identifier, type: 'subscription' | 'dispatch') {
        let symbol = this.checker.getSymbolAtLocation(identifier);
        if (!symbol) return;

        if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = this.checker.getAliasedSymbol(symbol);
        }

        const declarations = symbol.getDeclarations();
        if (!declarations) return;

        for (const declaration of declarations) {
            const key = getNodeKey(declaration);
            if (this.actionsMap.has(key)) {
                if (type === 'subscription') {
                    this.subscriptions.push(key);
                } else {
                    this.dispatches.push(key);
                }
                break;
            }
        }
    }
}

try {
    const analyzer = new ReduxProjectAnalyzer('./');
    analyzer.analyze();
} catch (e) {
    console.error('Error:', e);
}

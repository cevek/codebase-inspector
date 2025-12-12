import * as path from 'node:path';
import open from 'open';
import * as ts from 'typescript';
import {renormalizeGraphIds} from './renormalizeGraphIds';
import {Action, ApiCall, ApiRequest, Component, Epic, Id, Item} from './types';
import {getLocation, getNodeKey, getUrlFromArgument} from './utils/ast';
import {compressFileIntoUrlSafeString} from './utils/compressFile';
import {readdirSync, writeFileSync} from 'node:fs';

export const CONFIG = {
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
    layers: [
        {
            regex: /\/services\/(?!dataProviders\/)/,
            type: 'S',
        },
        {
            regex: /\/dataProviders\//,
            type: 'DP',
        },
        {
            regex: /\/entities\//,
            type: 'E',
        },
        {
            regex: /\/mappings\//,
            type: 'M',
        },
    ],
    actions: {
        typeKeywords: ['ActionCreator', 'CallHistoryMethodAction', '@@router/'],
    },
    epics: {
        rootEpicNames: ['rootEpic'],
        typeKeywords: ['Epic'],
        operators: {filter: 'ofType'},
    },
    components: {
        types: [
            ' => JSX.Element',
            '.JSX.Element',
            '.JSXElementConstructor',
            'React.FC',
            'React.FunctionComponent',
            'React.NamedExoticComponent',
            'React.MemoExoticComponent',
            'React.LazyExoticComponent',
            'React.ForwardRefExoticComponent',
            'React.ComponentType',
            '.OverridableComponent',
        ],
    },
} as const;

type HttpMethod = ApiRequest['type'];

class ReduxProjectAnalyzer {
    private program: ts.Program;
    private checker: ts.TypeChecker;
    private actions = new Map<Id, Action>();
    private epics = new Map<Id, Epic>();
    private components = new Map<Id, {data: Component; node: ts.Node}>();
    private relations = new Map<Id, Id[]>();

    constructor(private folder: string) {
        const {program, checker} = this.createProgram();
        this.program = program;
        this.checker = checker;
    }

    private createProgram() {
        const tsConfigPath = ts.findConfigFile(this.folder, ts.sys.fileExists, 'tsconfig.json');
        if (!tsConfigPath) throw new Error(`Could not find tsconfig.json in ${this.folder}`);

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
        this.collectComponents();
        this.analyzeComponentUsage();

        const allNodes = new Map<Id, Item>([
            ...this.actions,
            ...this.epics,
            ...[...this.components.entries()].map(([k, v]) => [k, v.data] as const),
        ]);
        const result = renormalizeGraphIds(DEV_MODE, {nodes: allNodes, relations: this.relations});

        const output = {
            nodes: Object.fromEntries(result.nodes),
            relations: Object.fromEntries(result.relations),
        };
        if (DEV_MODE) open('http://localhost:5174/#payload=' + compressFileIntoUrlSafeString(JSON.stringify(output)));
        if (DEV_MODE) writeFileSync('./data.json', JSON.stringify(output, null, 2));
        if (!DEV_MODE)
            open(
                'https://cevek.github.io/codebase-inspector/#payload=' +
                    compressFileIntoUrlSafeString(JSON.stringify(output)),
            );
        console.log('Analysis complete');
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
                location: getLocation(this.folder, ident),
                type: 'action',
            });
        }
    }

    private collectComponents() {
        for (const sourceFile of this.program.getSourceFiles()) {
            if (sourceFile.isDeclarationFile) continue;

            const visit = (node: ts.Node) => {
                if (ts.isVariableDeclaration(node)) {
                    const ident = node.name;
                    if (ts.isIdentifier(ident)) {
                        this.checkIdentifierForComponent(ident, node);
                    }
                }
                if (ts.isFunctionDeclaration(node)) {
                    if (node.name && ts.isIdentifier(node.name)) {
                        this.checkIdentifierForComponent(node.name, node.body!);
                    }
                }
                ts.forEachChild(node, visit);
            };

            ts.forEachChild(sourceFile, visit);
        }
    }

    private checkIdentifierForComponent(ident: ts.Identifier, body: ts.Node) {
        if (!/^[A-Z]/.test(ident.text)) return;

        const type = this.checker.getTypeAtLocation(ident);
        let typeString = this.checker.typeToString(type, ident, ts.TypeFormatFlags.NoTruncation);

        typeString = typeString.replace(/import\(\".*?node_modules\/\@types\/react\/.*?\"\)/g, 'React');

        const isComponent = CONFIG.components.types.some((keyword) => typeString.includes(keyword));

        if (isComponent) {
            this.components.set(getNodeKey(ident), {
                data: {
                    name: ident.text,
                    location: getLocation(this.folder, ident),
                    type: 'component',
                },
                node: ident,
            });
        } else {
            // console.log(ident.text, isComponent, typeString);
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

        const analyzer = new EpicBodyAnalyzer(this.folder, realBody, this.checker, this.actions, sourceFile);
        const {subscriptions, dispatches, apiCall} = analyzer.analyze();

        // if (name === 'addNotificationOnDataProvidersErrorEpic')
        // console.log(name, {subscriptions, dispatches});

        subscriptions.forEach((subId) => this.addRelation(subId, epicId));
        dispatches.forEach((dispatchId) => this.addRelation(epicId, dispatchId));

        this.epics.set(epicId, {
            name,
            type: 'epic',
            location: getLocation(this.folder, startNode),
            apiCall,
        });
    }

    private analyzeComponentUsage() {
        for (const [componentId, {node: componentNode}] of this.components) {
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
                        this.checkUsage(tagName, componentId, 'component');
                    } else if (ts.isPropertyAccessExpression(tagName)) {
                        this.checkUsage(tagName.name, componentId, 'component');
                    }
                }

                if (ts.isIdentifier(node)) {
                    this.checkUsage(node, componentId, 'action');
                }

                ts.forEachChild(node, visit);
            };

            ts.forEachChild(body, visit);
        }
    }

    private checkUsage(identifier: ts.Identifier | ts.MemberName, sourceId: Id, targetType: 'component' | 'action') {
        let symbol = this.checker.getSymbolAtLocation(identifier);
        if (!symbol) return;

        if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = this.checker.getAliasedSymbol(symbol);
        }

        const declarations = symbol.getDeclarations();
        if (!declarations) return;

        for (const declaration of declarations) {
            let keyNode: ts.Node = declaration;
            if ((ts.isVariableDeclaration(declaration) || ts.isFunctionDeclaration(declaration)) && declaration.name) {
                keyNode = declaration.name;
            }

            const key = getNodeKey(keyNode);

            if (targetType === 'component' && this.components.has(key)) {
                if (key !== sourceId) {
                    this.addRelation(sourceId, key);
                }
                return;
            }

            if (targetType === 'action' && this.actions.has(key)) {
                this.addRelation(sourceId, key);
                return;
            }
        }
    }

    private addRelation(from: Id, to: Id) {
        const existing = new Set(this.relations.get(from) ?? []);
        existing.add(to);
        this.relations.set(from, [...existing]);
    }
}

class EpicBodyAnalyzer {
    private subscriptions: Id[] = [];
    private dispatches: Id[] = [];
    private apiCall: ApiCall = {requests: []};

    constructor(
        private folder: string,
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
                    location: getLocation(this.folder, node),
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

const DEV_MODE = true;
try {
    // for (const app of readdirSync('/Users/cody/Dev/backoffice/apps/')) {
    if (DEV_MODE) {
        const app = 'scheduler';
        const analyzer = new ReduxProjectAnalyzer('/Users/cody/Dev/backoffice/apps/' + app);
        analyzer.analyze();
    } else {
        const analyzer = new ReduxProjectAnalyzer('./');
        analyzer.analyze();
    }
} catch (e) {
    console.error('Error:', e);
}

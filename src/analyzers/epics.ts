import * as ts from 'typescript';
import {CONFIG} from '../config';
import {AnalyzerContext} from '../core/AnalyzerContext';
import {Action, ApiCall, ApiRequest, Id} from '../types';
import {getLocation, getNodeKey, getUrlFromArgument} from '../utils/ast';

type HttpMethod = ApiRequest['type'];

export function collectEpics(context: AnalyzerContext) {
    for (const sourceFile of context.program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;

        for (const statement of sourceFile.statements) {
            if (ts.isVariableStatement(statement)) {
                for (const decl of statement.declarationList.declarations) {
                    if (
                        ts.isIdentifier(decl.name) &&
                        decl.initializer &&
                        isNodeEpic(context, decl, decl.name.text)
                    ) {
                        processEpic(context, decl.name.text, decl.initializer, statement, sourceFile);
                    }
                }
            }
        }
    }
}

function isNodeEpic(context: AnalyzerContext, decl: ts.VariableDeclaration, epicName: string): boolean {
    if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) return false;
    const type = context.checker.getTypeAtLocation(decl.name);
    const typeString = context.checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
    if (CONFIG.epics.rootEpicNames.some((name) => name.includes(epicName))) return false;
    return CONFIG.epics.typeKeywords.some((keyword) => typeString.includes(keyword));
}

function processEpic(
    context: AnalyzerContext,
    name: string,
    body: ts.Node,
    startNode: ts.Node,
    sourceFile: ts.SourceFile,
) {
    const epicId = getNodeKey(startNode);
    let realBody = body;
    if (ts.isArrowFunction(body) || ts.isFunctionExpression(body)) {
        realBody = body.body;
    }

    const analyzer = new EpicBodyAnalyzer(context.folder, realBody, context.checker, context.actions, sourceFile);
    const {subscriptions, dispatches, apiCall} = analyzer.analyze();

    subscriptions.forEach((subId) => context.addRelation(subId, epicId));
    dispatches.forEach((dispatchId) => context.addRelation(epicId, dispatchId));

    context.epics.set(epicId, {
        name,
        type: 'epic',
        location: getLocation(context.folder, startNode),
        apiCall,
    });
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
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            this.checkApiCall(node, node.expression);
        }
        if (ts.isCallExpression(node)) {
            this.checkOfType(node);
        }
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
                if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.name) && arg.name.text === 'type') {
                    const expression = arg.expression;
                    if (ts.isIdentifier(expression)) identifier = expression;
                    else if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression))
                        identifier = expression.expression;
                } else if (ts.isIdentifier(arg)) {
                    identifier = arg;
                }
                if (identifier) this.processIdentifier(identifier, 'subscription');
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
                if (type === 'subscription') this.subscriptions.push(key);
                else this.dispatches.push(key);
                break;
            }
        }
    }
}

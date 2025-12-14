import * as ts from 'typescript';
import {Action, Component, Epic, Id, Reducer} from '../types';

export class AnalyzerContext {
    public actions = new Map<Id, Action>();
    public epics = new Map<Id, Epic>();
    public reducers = new Map<Id, Reducer>();
    public components = new Map<Id, {data: Component; node: ts.Node}>();

    // Relations
    public relations = new Map<Id, Id[]>();

    constructor(
        public program: ts.Program,
        public checker: ts.TypeChecker,
        public folder: string,
    ) {}

    public addRelation(from: Id, to: Id) {
        const existing = new Set(this.relations.get(from) ?? []);
        existing.add(to);
        this.relations.set(from, [...existing]);
    }
}

import {writeFileSync} from 'node:fs';
import open from 'open';
import {collectActions} from './analyzers/actions';
import {analyzeComponentUsage, collectComponents} from './analyzers/components';
import {collectEpics} from './analyzers/epics';
import {collectReducers} from './analyzers/reducers';
import {AnalyzerContext} from './core/AnalyzerContext';
import {createProgram} from './core/program';
import {Id, Item} from './types';
import {compressStrIntoUrlSafeString} from './utils/compressStrIntoUrlSafeString';
import {renormalizeGraphIds} from './utils/renormalizeGraphIds';

const DEV_MODE = false;

function main() {
    try {
        let folder = './';
        if (DEV_MODE) {
            const app = 'scheduler';
            folder = '/Users/cody/Dev/backoffice/apps/' + app;
            // folder = './';
        }

        console.log('Starting analysis on:', folder);
        const {program, checker} = createProgram(folder);
        const context = new AnalyzerContext(program, checker, folder);

        collectActions(context);
        collectEpics(context);
        collectReducers(context); // Depends on Actions
        collectComponents(context); 
        analyzeComponentUsage(context); // Depends on Components and Actions

        // Collect all nodes
        const allNodes = new Map<Id, Item>([
            ...context.actions,
            ...context.epics,
            ...context.reducers,
            ...[...context.components.entries()].map(([k, v]) => [k, v.data] as const),
        ]);

        const result = renormalizeGraphIds(DEV_MODE, {nodes: allNodes, relations: context.relations});

        const output = {
            nodes: Object.fromEntries(result.nodes),
            relations: Object.fromEntries(result.relations),
        };

        const payload = compressStrIntoUrlSafeString(JSON.stringify(output));

        if (DEV_MODE) {
            open('http://localhost:5174/#payload=' + payload);
            writeFileSync('./data.json', JSON.stringify(output, null, 2));
        } else {
            open('https://cevek.github.io/codebase-inspector/#payload=' + payload);
        }
        console.log('Analysis complete. Nodes found:', allNodes.size);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();

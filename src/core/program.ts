import * as ts from 'typescript';
import * as path from 'node:path';

export function createProgram(folder: string) {
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

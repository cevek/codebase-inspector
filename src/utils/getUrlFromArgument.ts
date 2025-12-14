import * as ts from 'typescript';

export const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed, omitTrailingSemicolon: true});
export function getUrlFromArgument(arg: ts.Node, sourceFile: ts.SourceFile): string {
    if (!arg) return 'undefined';
    if (ts.isStringLiteral(arg)) {
        return arg.text;
    }
    return printer.printNode(ts.EmitHint.Unspecified, arg, sourceFile);
}

import * as ts from 'typescript';
import * as fs from 'fs';
import path from 'path';

// --- 1. Определение нашей структуры типов (Выходной формат) ---

export type TypeKind =
    | 'primitive'
    | 'interface'
    | 'object_literal'
    | 'array'
    | 'function'
    | 'union'
    | 'intersection'
    | 'reference' // Для циклических зависимостей
    | 'unknown';

export interface TypeInfo {
    kind: TypeKind;
    name?: string; // Например "Foo<string>" или "number"
    baseName?: string;
    generics?: TypeInfo[]; // <--- НОВОЕ ПОЛЕ: список типов-аргументов
    aliasName?: string; // Если это type alias
    details?: any; // UnionItems, Fields, etc.
}

export interface InterfaceDetails {
    fields: {name: string; type: TypeInfo; optional: boolean}[];
}

export interface UnionOrIntersectionDetails {
    types: TypeInfo[];
}

export interface FunctionDetails {
    signatures: string[]; // Упрощенно в виде строк, можно раскрыть глубже
}

export interface ArrayDetails {
    elementType: TypeInfo;
}

// --- 2. Класс Инспектора ---

export class TypeInspector {
    private checker: ts.TypeChecker;
    program: ts.Program;
    // Используем WeakMap для отслеживания уже посещенных типов и предотвращения рекурсии
    private seenTypes = new Map<ts.Type, string>();

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
    public inspect(node: ts.Node): TypeInfo {
        const type = this.checker.getTypeAtLocation(node);
        return this.serializeType(type, node, new Set<ts.Type>());
    }

    private isSimpleType(type: ts.Type, depth = 0): boolean {
        if (depth > 6) return false;

        // 1. Enum - всегда сложный
        if (type.flags & ts.TypeFlags.EnumLiteral) return false;

        // 2. Union и Intersection
        if (type.isUnion() || type.isIntersection()) {
            // Boolean считается простым
            if (type.flags & ts.TypeFlags.Boolean) return true;

            // Если есть Alias (имя типа), считаем сложным
            if (type.aliasSymbol) return false;

            // [FIX] Проверяем содержимое Union
            for (const t of type.types) {
                // Если внутри есть сложная структура (объект) - выходим
                if (!this.isSimpleType(t, depth + 1)) return false;

                // [FIX] Если внутри есть ЛИТЕРАЛЫ (строковые или числовые значения),
                // то считаем весь Union сложным. Мы хотим, чтобы serializeType
                // обработал их и, возможно, склеил, но сохранил как Union.
                if (t.isStringLiteral() || t.isNumberLiteral()) {
                    return false;
                }
            }

            // Если дошли сюда, значит внутри только простые типы без литералов (string, number, null)
            return true;
        }

        // 3. Массивы
        if (this.checker.isArrayType(type)) {
            const typeRef = type as ts.TypeReference;
            const elemType = typeRef.typeArguments?.[0];
            return elemType ? this.isSimpleType(elemType, depth + 1) : true;
        }

        // 4. Примитивы (string, number, void, null...)
        if (
            type.flags &
            (ts.TypeFlags.String |
                ts.TypeFlags.Number |
                ts.TypeFlags.Boolean |
                ts.TypeFlags.BooleanLiteral |
                ts.TypeFlags.Void |
                ts.TypeFlags.Undefined |
                ts.TypeFlags.Null |
                ts.TypeFlags.Any |
                ts.TypeFlags.Unknown |
                ts.TypeFlags.Never |
                ts.TypeFlags.ESSymbol)
        ) {
            return true;
        }

        // 5. Одиночные литералы ("hello") - считаем простыми для отображения
        if (type.isStringLiteral() || type.isNumberLiteral()) {
            return true;
        }

        return false;
    }

    private serializeType(type: ts.Type, contextNode: ts.Node, stack: Set<ts.Type>): TypeInfo {
        const fullTypeName = this.checker.typeToString(type);

        let baseName = fullTypeName;
        if (type.aliasSymbol) {
            baseName = type.aliasSymbol.getName();
        } else if (type.symbol) {
            baseName = type.symbol.getName();
        }

        // Обработка массивов для имени
        let isArray = this.checker.isArrayType(type);
        let arrayElemInfo: TypeInfo | undefined;

        if (isArray) {
            const typeRef = type as ts.TypeReference;
            const elemType = typeRef.typeArguments?.[0];
            if (elemType) {
                arrayElemInfo = this.serializeType(elemType, contextNode, new Set(stack));
                const elemName = arrayElemInfo.baseName || arrayElemInfo.name || 'unknown';
                const needsParens = elemName.includes('|') || elemName.includes('=>');
                baseName = needsParens ? `(${elemName})[]` : `${elemName}[]`;
            } else {
                baseName = '[]';
            }
        } else {
            if (baseName.includes('<')) {
                baseName = baseName.substring(0, baseName.indexOf('<'));
            }
            if (baseName.includes('.')) {
                const parts = baseName.split('.');
                baseName = parts[parts.length - 1];
            }
        }

        if (stack.has(type)) {
            return {kind: 'reference', name: fullTypeName, baseName};
        }

        if (this.isSimpleType(type)) {
            return {kind: 'primitive', name: fullTypeName, baseName};
        }

        let generics: TypeInfo[] | undefined;
        if (!isArray) {
            const typeRef = type as ts.TypeReference;
            if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
                generics = typeRef.typeArguments.map((t) => this.serializeType(t, contextNode, new Set(stack)));
            }
        }

        stack.add(type);

        let result: TypeInfo = {kind: 'unknown', name: fullTypeName, baseName, generics};

        try {
            if (isArray) {
                result.kind = 'array';
                if (!arrayElemInfo) {
                    const elemType = (type as ts.TypeReference).typeArguments?.[0];
                    arrayElemInfo = elemType
                        ? this.serializeType(elemType, contextNode, stack)
                        : {kind: 'unknown', name: 'any'};
                }
                result.details = {elementType: arrayElemInfo};
            } else if (type.getCallSignatures().length > 0) {
                result.kind = 'function';
            }
            // --- UNION + ОПТИМИЗАЦИЯ РАЗМЕРА ---
            else if (type.isUnion()) {
                result.kind = 'union';

                // Проверяем, состоит ли Union ТОЛЬКО из литералов (строки, числа, null)
                // Если да - мы склеим их в одну строку для компактности JSON.
                const isLiteralUnion = type.types.every(
                    (t) =>
                        t.isStringLiteral() ||
                        t.isNumberLiteral() ||
                        t.flags &
                            (ts.TypeFlags.Boolean |
                                ts.TypeFlags.BooleanLiteral |
                                ts.TypeFlags.Null |
                                ts.TypeFlags.Undefined |
                                ts.TypeFlags.Void),
                );

                if (isLiteralUnion) {
                    // Генерируем красивую строку значений
                    const joinedName = type.types.map((t) => this.checker.typeToString(t)).join(' | ');

                    result.details = {
                        types: [
                            {
                                kind: 'primitive',
                                // ВАЖНО: сохраняем длинную строку внутри имени ребенка
                                name: joinedName,
                                baseName: joinedName,
                            },
                        ],
                    };
                } else {
                    // Стандартный рекурсивный обход для сложных Union (с объектами)
                    result.details = {
                        types: type.types.map((t) => this.serializeType(t, contextNode, stack)),
                    };
                }
            } else if (type.isIntersection()) {
                result.kind = 'intersection';
                result.details = {
                    types: type.types.map((t) => this.serializeType(t, contextNode, stack)),
                };
            } else if (type.isClassOrInterface() || type.flags & ts.TypeFlags.Object) {
                result.kind = type.isClassOrInterface() ? 'interface' : 'object_literal';
                const properties = type.getApparentProperties();
                const fields = properties.map((symbol) => {
                    const name = symbol.getName();
                    const propType = this.checker.getTypeOfSymbolAtLocation(symbol, contextNode);
                    const isOptional = (symbol.flags & ts.SymbolFlags.Optional) !== 0;

                    return {
                        name,
                        optional: isOptional,
                        type: this.serializeType(propType, contextNode, stack),
                    };
                });
                result.details = {fields};
            }
        } finally {
            stack.delete(type);
        }

        return result;
    }
}

// --- 3. Пример использования (Runner) ---

function run() {
    // const fileName = 'test-file.ts'; // Имя вашего файла с кодом

    // // Создаем код в памяти для теста (или читаем с диска)
    // const fileContent = `
    //     interface User<T> {
    //         id: number;
    //         data: T;
    //         metadata: {
    //             createdAt: string;
    //         }
    //     }

    //     interface Wrapper<T> {
    //         value: T;
    //         status: "ok" | "error";
    //     }

    //     // Вот это мы хотим раскрыть:
    //     const myVar: Wrapper<User<string[]>> = {
    //         value: {
    //             id: 1,
    //             data: ["hello"],
    //             metadata: { createdAt: "now" }
    //         },
    //         status: "ok"
    //     };
    // `;

    // // Создаем виртуальную файловую систему для компилятора
    // const host = ts.createCompilerHost({});
    // const originalGetSourceFile = host.getSourceFile;
    // host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
    //     console.log(name);
    //     if (name === fileName) {
    //         return ts.createSourceFile(name, fileContent, languageVersion);
    //     }
    //     return originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
    // };

    // const program = ts.createProgram([fileName], {}, host);
    // const sourceFile = program.getSourceFile(fileName);

    // if (!sourceFile) return;

    // // Ищем наш идентификатор 'myVar' в AST
    // let targetNode: ts.Node | undefined;

    // function visit(node: ts.Node) {
    //     if (ts.isVariableDeclaration(node) && node.name.getText() === 'myVar') {
    //         targetNode = node.name; // Берем сам идентификатор
    //     } else {
    //         ts.forEachChild(node, visit);
    //     }
    // }
    // visit(sourceFile);

    // if (targetNode) {
    const inspector = new TypeInspector('/Users/cody/Dev/backoffice/apps/scheduler/');
    // const inspector = new TypeInspector('./test/');
    const sourceFile = inspector.program.getSourceFile(
        '/Users/cody/Dev/backoffice/apps/scheduler/src/services/dataProviders/modules/bookingDurations/actions.ts',
    )!;
    let targetNode!: ts.Node;
    function visit(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && node.name.getText() === 'fetchBookingDurationsSuccessAction') {
            targetNode = node.name; // Берем сам идентификатор
        } else {
            ts.forEachChild(node, visit);
        }
    }
    visit(sourceFile);
    const result = inspector.inspect(targetNode);
    fs.writeFileSync(
        './type-explorer-react/src/sampleData.ts',
        `import {TypeInfo} from './types';
    
    export const sampleTypeData: TypeInfo = ` + JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
    // } else {
    //     console.error('Variable not found');
    // }
}

run();

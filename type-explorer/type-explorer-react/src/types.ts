export type TypeKind =
    | 'primitive'
    | 'interface'
    | 'object_literal'
    | 'array'
    | 'function'
    | 'union'
    | 'intersection'
    | 'reference'
    | 'unknown';

export interface TypeInfo {
    kind: TypeKind;
    generics?: TypeInfo[]; // <--- Добавили
    name?: string; // Полное имя: "Array<string>"
    baseName?: string; // Чистое имя: "Array"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any; // В реальном проекте лучше уточнить типы через Generic или Union
}

export interface FieldDetails {
    name: string;
    type: TypeInfo;
    optional: boolean;
}

export interface InterfaceDetails {
    fields: FieldDetails[];
}

export interface UnionOrIntersectionDetails {
    types: TypeInfo[];
}

export interface ArrayDetails {
    elementType: TypeInfo;
}

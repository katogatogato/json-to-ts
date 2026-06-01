export type TypeKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'date'
  | 'array'
  | 'reference'
  | 'union';

export interface PrimitiveType {
  kind: 'string' | 'number' | 'boolean' | 'null' | 'date';
}

export interface ArrayType {
  kind: 'array';
  elementType: TypeInfo;
}

export interface ReferenceType {
  kind: 'reference';
  refName: string;
}

export interface UnionType {
  kind: 'union';
  members: TypeInfo[];
}

export type TypeInfo = PrimitiveType | ArrayType | ReferenceType | UnionType;

export interface PropertyInfo {
  name: string;
  type: TypeInfo;
  optional: boolean;
}

export interface InterfaceDef {
  name: string;
  properties: PropertyInfo[];
}

export interface AnalysisResult {
  interfaces: InterfaceDef[];
  rootType: TypeInfo;
}

export interface ConversionOptions {
  rootName: string;
  useType: boolean;
  exportKeyword: boolean;
  indentSize: number;
  semiColons: boolean;
  sortAlphabetically: boolean;
}

export const DEFAULT_OPTIONS: ConversionOptions = {
  rootName: 'RootObject',
  useType: false,
  exportKeyword: false,
  indentSize: 2,
  semiColons: true,
  sortAlphabetically: false,
};

export interface ConvertResult {
  code: string;
  highlighted: string;
  error: string | null;
}

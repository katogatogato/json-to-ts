import type {
  TypeInfo,
  InterfaceDef,
  PropertyInfo,
  AnalysisResult,
} from './types.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const IRREGULAR_SINGULARS: Record<string, string> = {
  people: 'person',
  men: 'man',
  women: 'woman',
  children: 'child',
  feet: 'foot',
  teeth: 'tooth',
  geese: 'goose',
  mice: 'mouse',
  lice: 'louse',
  oxen: 'ox',
  data: 'datum',
  indices: 'index',
  matrices: 'matrix',
  analyses: 'analysis',
  crises: 'crisis',
  criteria: 'criterion',
  phenomena: 'phenomenon',
  dice: 'die',
};

class AnalysisContext {
  private interfaces: InterfaceDef[] = [];
  private usedNames = new Set<string>();
  private structureMap = new Map<string, string>();

  analyze(value: unknown, rootName: string): AnalysisResult {
    this.interfaces = [];
    this.usedNames = new Set<string>();
    this.structureMap = new Map<string, string>();

    const rootType = this.analyzeValue(value, rootName);

    return { interfaces: this.interfaces, rootType };
  }

  private analyzeValue(value: unknown, propName: string): TypeInfo {
    if (value === null) {
      return { kind: 'null' };
    }
    if (typeof value === 'string') {
      if (ISO_DATE_RE.test(value)) {
        return { kind: 'date' };
      }
      return { kind: 'string' };
    }
    if (typeof value === 'number') {
      return { kind: 'number' };
    }
    if (typeof value === 'boolean') {
      return { kind: 'boolean' };
    }
    if (Array.isArray(value)) {
      return this.analyzeArray(value, propName);
    }
    if (typeof value === 'object') {
      return this.analyzeObject(value as Record<string, unknown>, propName);
    }
    return { kind: 'string' };
  }

  private analyzeArray(arr: unknown[], propName: string): TypeInfo {
    if (arr.length === 0) {
      return { kind: 'array', elementType: { kind: 'string' } };
    }

    const objects: Record<string, unknown>[] = [];
    const nonObjectValues: unknown[] = [];

    for (const item of arr) {
      if (this.isPlainObject(item)) {
        objects.push(item as Record<string, unknown>);
      } else {
        nonObjectValues.push(item);
      }
    }

    const elementTypes: TypeInfo[] = [];

    if (objects.length > 0) {
      const mergedRef = this.mergeObjects(objects, propName);
      elementTypes.push(mergedRef);
    }

    for (const val of nonObjectValues) {
      const singular = this.singularize(this.toPascalCase(propName));
      elementTypes.push(this.analyzeValue(val, singular));
    }

    const elementType =
      elementTypes.length === 1
        ? elementTypes[0]
        : this.mergeTypes(elementTypes);

    return { kind: 'array', elementType };
  }

  private analyzeObject(
    obj: Record<string, unknown>,
    propName: string,
  ): TypeInfo {
    const properties: PropertyInfo[] = Object.keys(obj).map((key) => ({
      name: key,
      type: this.analyzeValue(obj[key], key),
      optional: false,
    }));

    const structKey = this.computeStructKey(properties);
    const existingName = this.structureMap.get(structKey);
    if (existingName) {
      return { kind: 'reference', refName: existingName };
    }

    const name = this.generateName(propName);
    const iface: InterfaceDef = { name, properties };

    this.interfaces.push(iface);
    this.structureMap.set(structKey, name);

    return { kind: 'reference', refName: name };
  }

  private mergeObjects(
    objects: Record<string, unknown>[],
    propName: string,
  ): TypeInfo {
    const allKeys = new Set<string>();
    for (const obj of objects) {
      for (const key of Object.keys(obj)) {
        allKeys.add(key);
      }
    }

    const properties: PropertyInfo[] = [];

    for (const key of allKeys) {
      const presentCount = objects.filter((obj) => key in obj).length;
      const isOptional = presentCount < objects.length;

      const values = objects
        .filter((obj) => key in obj)
        .map((obj) => obj[key]);

      const type = this.analyzeMergedValues(values, key);
      properties.push({ name: key, type, optional: isOptional });
    }

    const structKey = this.computeStructKey(properties);
    const existingName = this.structureMap.get(structKey);
    if (existingName) {
      return { kind: 'reference', refName: existingName };
    }

    const singular = this.singularize(this.toPascalCase(propName));
    const name = this.generateName(singular);
    const iface: InterfaceDef = { name, properties };

    this.interfaces.push(iface);
    this.structureMap.set(structKey, name);

    return { kind: 'reference', refName: name };
  }

  private analyzeMergedValues(values: unknown[], propName: string): TypeInfo {
    if (values.length === 0) {
      return { kind: 'string' };
    }
    if (values.length === 1) {
      return this.analyzeValue(values[0], propName);
    }

    const objects: Record<string, unknown>[] = [];
    const nonObjectValues: unknown[] = [];

    for (const val of values) {
      if (this.isPlainObject(val)) {
        objects.push(val as Record<string, unknown>);
      } else {
        nonObjectValues.push(val);
      }
    }

    const types: TypeInfo[] = [];

    if (objects.length > 0) {
      types.push(this.mergeObjects(objects, propName));
    }

    for (const val of nonObjectValues) {
      types.push(this.analyzeValue(val, propName));
    }

    if (types.length === 1) {
      return types[0];
    }
    return this.mergeTypes(types);
  }

  private mergeTypes(types: TypeInfo[]): TypeInfo {
    const unique: TypeInfo[] = [];
    const seen = new Set<string>();

    for (const t of types) {
      const sig = this.typeSignature(t);
      if (!seen.has(sig)) {
        seen.add(sig);
        unique.push(t);
      }
    }

    const flat: TypeInfo[] = [];
    const flatSeen = new Set<string>();

    for (const t of unique) {
      if (t.kind === 'union') {
        for (const member of t.members) {
          const sig = this.typeSignature(member);
          if (!flatSeen.has(sig)) {
            flatSeen.add(sig);
            flat.push(member);
          }
        }
      } else {
        flat.push(t);
      }
    }

    if (flat.length === 0) {
      return { kind: 'string' };
    }
    if (flat.length === 1) {
      return flat[0];
    }

    const hasString = flat.some(
      (t) => t.kind === 'string' || t.kind === 'date',
    );
    const filtered = flat.filter((t) => {
      if (hasString && t.kind === 'date') return false;
      return true;
    });

    const finalTypes: TypeInfo[] = [];
    const finalSeen = new Set<string>();
    for (const t of filtered) {
      const sig = this.typeSignature(t);
      if (!finalSeen.has(sig)) {
        finalSeen.add(sig);
        finalTypes.push(t);
      }
    }

    if (finalTypes.length === 1) {
      return finalTypes[0];
    }
    return { kind: 'union', members: finalTypes };
  }

  private generateName(propName: string): string {
    const base = this.toPascalCase(propName);
    if (base.length === 0) {
      let name = 'Unknown';
      let counter = 2;
      while (this.usedNames.has(name)) {
        name = `Unknown${counter}`;
        counter++;
      }
      this.usedNames.add(name);
      return name;
    }

    let name = base;
    let counter = 2;
    while (this.usedNames.has(name)) {
      name = `${base}${counter}`;
      counter++;
    }
    this.usedNames.add(name);
    return name;
  }

  private computeStructKey(properties: PropertyInfo[]): string {
    return properties
      .map(
        (p) =>
          `${p.name}:${this.typeSignature(p.type)}${p.optional ? '?' : ''}`,
      )
      .sort()
      .join('|');
  }

  private typeSignature(type: TypeInfo): string {
    switch (type.kind) {
      case 'string':
        return 's';
      case 'number':
        return 'n';
      case 'boolean':
        return 'b';
      case 'null':
        return 'N';
      case 'date':
        return 'd';
      case 'array':
        return `a<${this.typeSignature(type.elementType)}>`;
      case 'reference':
        return `r<${type.refName}>`;
      case 'union':
        return `u<${type.members
          .map((m) => this.typeSignature(m))
          .sort()
          .join('+')}>`;
    }
  }

  private singularize(word: string): string {
    if (word.length === 0) return word;
    const lower = word.toLowerCase();

    if (lower in IRREGULAR_SINGULARS) {
      const singular = IRREGULAR_SINGULARS[lower];
      return this.matchCase(word, singular);
    }

    if (lower.endsWith('ies') && lower.length > 3) {
      return this.matchCase(word, word.slice(0, -3) + 'y');
    }
    if (
      lower.endsWith('ses') ||
      lower.endsWith('xes') ||
      lower.endsWith('zes')
    ) {
      return this.matchCase(word, word.slice(0, -2));
    }
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 1) {
      return this.matchCase(word, word.slice(0, -1));
    }

    return word;
  }

  private matchCase(original: string, replacement: string): string {
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[^a-zA-Z0-9]+/)
      .filter((s) => s.length > 0)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
  }

  private isPlainObject(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }
}

export function analyze(value: unknown, rootName: string): AnalysisResult {
  const ctx = new AnalysisContext();
  return ctx.analyze(value, rootName);
}

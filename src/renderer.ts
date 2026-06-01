import type {
  TypeInfo,
  InterfaceDef,
  AnalysisResult,
  ConversionOptions,
} from './types.js';

export interface RenderedType {
  typeString: string;
  isDate: boolean;
}

function renderType(type: TypeInfo): RenderedType {
  switch (type.kind) {
    case 'string':
      return { typeString: 'string', isDate: false };
    case 'number':
      return { typeString: 'number', isDate: false };
    case 'boolean':
      return { typeString: 'boolean', isDate: false };
    case 'null':
      return { typeString: 'null', isDate: false };
    case 'date':
      return { typeString: 'string', isDate: true };
    case 'array': {
      const elem = renderType(type.elementType);
      const needsParens = type.elementType.kind === 'union';
      const inner = needsParens ? `(${elem.typeString})` : elem.typeString;
      return { typeString: `${inner}[]`, isDate: false };
    }
    case 'reference':
      return { typeString: type.refName, isDate: false };
    case 'union': {
      const members = type.members.map(renderType);
      const uniqueTypes = [...new Set(members.map((m) => m.typeString))];
      if (uniqueTypes.length === 1) {
        return { typeString: uniqueTypes[0], isDate: false };
      }
      return {
        typeString: uniqueTypes.join(' | '),
        isDate: false,
      };
    }
  }
}

function collectReferences(iface: InterfaceDef): Set<string> {
  const refs = new Set<string>();
  for (const prop of iface.properties) {
    collectTypeRefs(prop.type, refs);
  }
  return refs;
}

function collectTypeRefs(type: TypeInfo, refs: Set<string>): void {
  switch (type.kind) {
    case 'reference':
      refs.add(type.refName);
      break;
    case 'array':
      collectTypeRefs(type.elementType, refs);
      break;
    case 'union':
      for (const member of type.members) {
        collectTypeRefs(member, refs);
      }
      break;
  }
}

function topologicalSort(interfaces: InterfaceDef[]): InterfaceDef[] {
  const nameMap = new Map(interfaces.map((i) => [i.name, i]));
  const depMap = new Map<string, Set<string>>();
  for (const iface of interfaces) {
    depMap.set(iface.name, collectReferences(iface));
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: InterfaceDef[] = [];

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) return;
    visiting.add(name);

    const deps = depMap.get(name);
    if (deps) {
      for (const dep of deps) {
        visit(dep);
      }
    }

    visiting.delete(name);
    visited.add(name);

    const iface = nameMap.get(name);
    if (iface) result.push(iface);
  }

  for (const iface of interfaces) {
    visit(iface.name);
  }

  return result;
}

export function render(
  result: AnalysisResult,
  options: ConversionOptions,
): string {
  const lines: string[] = [];
  const indent = ' '.repeat(options.indentSize);
  const semi = options.semiColons ? ';' : '';
  const exportKw = options.exportKeyword ? 'export ' : '';

  const sorted = topologicalSort(result.interfaces);

  for (const iface of sorted) {
    if (options.useType) {
      lines.push(`${exportKw}type ${iface.name} = {`);
    } else {
      lines.push(`${exportKw}interface ${iface.name} {`);
    }

    const props = options.sortAlphabetically
      ? [...iface.properties].sort((a, b) => a.name.localeCompare(b.name))
      : iface.properties;

    for (const prop of props) {
      const { typeString, isDate } = renderType(prop.type);
      const opt = prop.optional ? '?' : '';
      const dateComment = isDate ? ' // ISO date' : '';
      lines.push(
        `${indent}${prop.name}${opt}: ${typeString}${semi}${dateComment}`,
      );
    }

    if (options.useType) {
      lines.push(`}${semi}`);
    } else {
      lines.push('}');
    }
    lines.push('');
  }

  if (result.rootType.kind !== 'reference') {
    const { typeString } = renderType(result.rootType);
    lines.push(`${exportKw}type ${options.rootName} = ${typeString}${semi}`);
  }

  return lines.join('\n').trimEnd();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlight(code: string): string {
  return code
    .split('\n')
    .map((line) => highlightLine(line))
    .join('\n');
}

function highlightLine(line: string): string {
  let comment = '';
  let code = line;

  const commentIdx = line.indexOf('//');
  if (commentIdx !== -1) {
    code = line.substring(0, commentIdx);
    comment = `<span class="cmt">${escapeHtml(line.substring(commentIdx))}</span>`;
  }

  let html = escapeHtml(code);

  html = html.replace(
    /\b(interface|type|export)\b/g,
    '<span class="kw">$1</span>',
  );

  html = html.replace(
    /\b(string|number|boolean|null|undefined|never|unknown)\b/g,
    '<span class="tp">$1</span>',
  );

  html = html.replace(
    /\b([A-Z][a-zA-Z0-9]*)\b/g,
    (match: string) => {
      const builtIn = new Set([
        'String', 'Number', 'Boolean', 'Null', 'Undefined',
        'Object', 'Array', 'Symbol', 'BigInt', 'Never', 'Unknown',
      ]);
      if (builtIn.has(match)) return match;
      return `<span class="if">${match}</span>`;
    },
  );

  return html + comment;
}

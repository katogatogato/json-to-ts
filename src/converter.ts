import { analyze } from './analyzer.js';
import { render, highlight } from './renderer.js';
import { DEFAULT_OPTIONS } from './types.js';
import type { ConversionOptions, ConvertResult } from './types.js';

type UserOptions = Partial<ConversionOptions>;

export function convert(
  json: string,
  userOptions?: UserOptions,
): ConvertResult {
  const options: ConversionOptions = { ...DEFAULT_OPTIONS, ...userOptions };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const message =
      err instanceof SyntaxError ? err.message : 'Invalid JSON';
    return {
      code: '',
      highlighted: '',
      error: message,
    };
  }

  const result = analyze(parsed, options.rootName);

  if (result.rootType.kind === 'reference') {
    const refName = result.rootType.refName;
    const rootIface = result.interfaces.find(
      (i) => i.name === refName,
    );
    if (rootIface) {
      rootIface.name = options.rootName;
    }
  }

  const code = render(result, options);
  const html = highlight(code);

  return { code, highlighted: html, error: null };
}

export { DEFAULT_OPTIONS } from './types.js';
export type { ConversionOptions, ConvertResult } from './types.js';

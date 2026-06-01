# JSON → TypeScript

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Paste JSON, get clean TypeScript interfaces. Instant, client-side, shareable.

**[Try it live →](https://katogatogato.github.io/json-to-ts/)**

## Features

- **Instant conversion** — type or paste JSON, get TypeScript immediately
- **Smart type inference** — detects strings, numbers, booleans, null, ISO dates
- **Nested objects** — generates separate named interfaces, not inline types
- **Array handling** — uniform arrays become `Type[]`, mixed arrays become unions
- **Optional fields** — detects fields present in some array items but not others
- **Union types** — merges different types across array items automatically
- **Duplicate detection** — reuses interfaces for structurally identical objects
- **Shareable URLs** — encode your JSON in a link, share it with anyone
- **Configurable output** — root name, `type` vs `interface`, export keyword, indentation, semicolons, sorting
- **Dark theme** — easy on the eyes, code-editor inspired
- **No server** — everything runs in your browser
- **No dependencies** — pure HTML, CSS, and TypeScript

## Quick Start

### As a web app

1. Clone the repo
2. Run `npm run build`
3. Open `public/index.html` in a browser (use a local server for module support)

Or deploy the `public/` folder to any static host (GitHub Pages, Netlify, Vercel).

### As an npm library

```bash
npm install json-to-ts-playground
```

```typescript
import { convert } from 'json-to-ts-playground';

const result = convert('{"name": "Alice", "age": 30}', {
  rootName: 'User',
});

console.log(result.code);
// interface User {
//   name: string;
//   age: number;
// }
```

## Conversion Rules

| JSON Value | TypeScript Type |
|---|---|
| `"hello"` | `string` |
| `42` | `number` |
| `true` / `false` | `boolean` |
| `null` | `null` |
| `"2024-01-15T10:30:00Z"` | `string` (with `// ISO date` comment) |
| `{ ... }` | Named `interface` (or `type`) |
| `[1, 2, 3]` | `number[]` |
| `[1, "two"]` | `(number \| string)[]` |
| `[{...}, {...}]` | `InterfaceName[]` (merged into one interface) |
| Field in some array items only | `field?: Type` (optional) |
| Identical nested objects | Same interface reused |

### Example

**Input:**

```json
{
  "id": 1,
  "name": "Jane Doe",
  "createdAt": "2024-01-15T10:30:00Z",
  "address": {
    "city": "Springfield",
    "zip": "62704"
  },
  "projects": [
    { "name": "Alpha", "status": "active" },
    { "name": "Beta", "status": "completed", "budget": null }
  ]
}
```

**Output:**

```typescript
interface RootObject {
  id: number;
  name: string;
  createdAt: string; // ISO date
  address: Address;
  projects: Project[];
}

interface Address {
  city: string;
  zip: string;
}

interface Project {
  name: string;
  status: string;
  budget?: null;
}
```

## Options

| Option | Default | Description |
|---|---|---|
| Root name | `RootObject` | Name for the root interface/type |
| Use `type` | off | Use `type Name = { ... }` instead of `interface Name { ... }` |
| Export | off | Add `export` keyword before each declaration |
| Semicolons | on | Append `;` after each property |
| Indentation | 2 spaces | 2 or 4 space indent |
| Sort properties | off | Sort properties alphabetically |

## URL Sharing

Click the **Share** button to copy a URL with your JSON encoded in the hash fragment. Anyone opening that URL will see your JSON pre-loaded.

Example:

```
https://katogatogato.github.io/json-to-ts/#data=eyJuYW1lIjoi...
```

## API Reference

### `convert(json, options?)`

```typescript
import { convert } from 'json-to-ts-playground';

const result = convert(jsonString, {
  rootName: 'MyType',
  useType: false,
  exportKeyword: true,
  indentSize: 2,
  semiColons: true,
  sortAlphabetically: false,
});
```

**Parameters:**

- `json` (`string`) — Valid JSON string
- `options` (`Partial<ConversionOptions>`) — Optional configuration

**Returns:** `ConvertResult`

```typescript
interface ConvertResult {
  code: string;        // Plain TypeScript code
  highlighted: string; // HTML with syntax highlighting
  error: string | null; // Error message if JSON is invalid
}
```

## Development

```bash
# Install TypeScript (if not global)
npm install -g typescript

# Build
npm run build

# Serve locally
cd public && python3 -m http.server 8000
```

## Contributing

Issues and pull requests welcome at [github.com/katogatogato/json-to-ts](https://github.com/katogatogato/json-to-ts).

## License

[MIT](LICENSE) — katogatogato

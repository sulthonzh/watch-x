# watch-x

Zero-dependency file watching utility with advanced pattern matching and event handling.

## Features

- 🔍 **Advanced Pattern Matching**: Glob-like syntax with support for wildcards, recursive directories, and negation
- ⚡ **Debouncing & Throttling**: Control event frequency to handle rapid file changes
- 🎯 **Flexible Filtering**: Include/exclude files with sophisticated pattern matching
- 🔄 **Recursive Watching**: Watch entire directory trees with configurable depth
- 📊 **Rich Event Data**: Detailed events with file metadata (size, timestamps)
- 🚀 **Zero Dependencies**: Pure Node.js implementation
- 🔧 **Command Line Interface**: Full-featured CLI for quick file watching
- 📦 **Easy Integration**: Simple API for JavaScript/TypeScript projects
- 🎯 **Initial Scan**: Optionally watch existing files when starting

## Installation

```bash
npm install watch-x
```

Or use the CLI directly:

```bash
npx watch-x
```

## Quick Start

### JavaScript/TypeScript

```javascript
import { watchFiles } from 'watch-x';

// Simple file watching
await watchFiles({
  root: './src',
  patterns: ['**/*.js'],
  ignore: ['**/test/**']
}, (event) => {
  console.log(`${event.type}: ${event.path}`);
});
```

### Command Line

```bash
# Watch all files in current directory
watch-x

# Watch only JavaScript files
watch-x --pattern "**/*.js"

# Watch with debouncing (500ms)
watch-x --debounce 500

# Watch with JSON output
watch-x --json

# Ignore test directories
watch-x --ignore "**/test/**" --ignore "**/spec/**"
```

## API Reference

### watchFiles(options, callback)

Watch files with the specified options.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | string | `process.cwd()` | Root directory to watch |
| `patterns` | string[] | `['**/*']` | File patterns to include |
| `ignore` | string[] | `['node_modules/**', '.git/**']` | Patterns to exclude |
| `debounce` | number | `100` | Debounce delay in milliseconds |
| `throttle` | number | `0` | Throttle delay in milliseconds |
| `recursive` | boolean | `true` | Watch subdirectories recursively |
| `initial` | boolean | `false` | Watch existing files initially |
| `follow` | boolean | `false` | Follow symbolic links |

#### Event Data

Each event contains the following properties:

```javascript
{
  type: 'change' | 'add' | 'unlink' | 'rename',
  path: string,
  size?: number,     // File size in bytes
  mtime?: Date,      // Last modified time
  isDirectory: boolean
}
```

## Pattern Syntax

The pattern matching supports a glob-like syntax:

| Pattern | Description | Example |
|---------|-------------|---------|
| `**` | Match any directory (recursive) | `**/*.js` |
| `*` | Match any characters except `/` | `*.txt` |
| `?` | Match any single character except `/` | `file?.js` |
| `!` | Negate pattern (must be at start) | `!**/test/**` |
| `{ext}` | Match specific extensions | `**/*.{js,ts}` |

### Pattern Examples

```javascript
// Watch all JavaScript files
patterns: ['**/*.js']

// Watch all files except test files
patterns: ['**/*', '!**/test/**', '!**/spec/**']

// Watch specific file types
patterns: ['**/*.{js,ts,jsx,tsx}']

// Watch only src and lib directories
patterns: ['src/**/*', 'lib/**/*']
```

## Advanced Usage

### Debouncing and Throttling

```javascript
import { watchFiles } from 'watch-x';

// Debounce rapid file changes (useful for editors)
await watchFiles({
  root: './src',
  patterns: ['**/*.js'],
  debounce: 300  // Wait 300ms after last change
}, (event) => {
  console.log('File settled:', event.path);
});

// Throttle event frequency
await watchFiles({
  root: './build',
  patterns: ['**/*'],
  throttle: 1000  // Maximum one event per second
}, (event) => {
  console.log('Build changed:', event.path);
});
```

### Initial File Scan

```javascript
// Watch existing files when starting
await watchFiles({
  root: './src',
  patterns: ['**/*.js'],
  initial: true
}, (event) => {
  if (event.type === 'ready') {
    console.log('Initial file:', event.path);
  } else {
    console.log('Change detected:', event.path);
  }
});
```

### Multiple Patterns

```javascript
// Watch source files but exclude tests
await watchFiles({
  root: './src',
  patterns: [
    '**/*.js',
    '**/*.ts',
    '**/*.jsx',
    '**/*.tsx'
  ],
  ignore: [
    '**/test/**',
    '**/spec/**',
    '**/*.test.*',
    '**/*.spec.*'
  ]
}, (event) => {
  console.log(event.type, event.path);
});
```

## Command Line Interface

### Basic Usage

```bash
# Watch current directory
watch-x

# Watch specific directory
watch-x /path/to/directory

# Watch with patterns
watch-x --pattern "**/*.js" --pattern "!**/test/**"

# Quiet mode
watch-x --quiet

# JSON output
watch-x --json
```

### Options

```bash
# Show help
watch-x --help

# Show version
watch-x --version

# File patterns
watch-x --pattern "**/*.js"

# Ignore patterns
watch-x --ignore "node_modules/**" --ignore ".git/**"

# Debounce settings
watch-x --debounce 500

# Throttle settings
watch-x --throttle 1000

# Recursive watching (default: true)
watch-x --recursive

# Initial file scan
watch-x --initial

# Follow symlinks
watch-x --follow

# Verbose output
watch-x --verbose

# Quiet mode
watch-x --quiet

# JSON output
watch-x --json
```

### Examples

```bash
# Watch only TypeScript files
watch-x --pattern "**/*.ts" --pattern "!**/*.d.ts"

# Watch with 1-second debounce
watch-x --debounce 1000

# Watch and output JSON for CI
watch-x --json --quiet

# Watch everything except build artifacts
watch-x --ignore "dist/**" --ignore "build/**" --ignore "*.log"

# Watch with verbose output
watch-x --verbose --pattern "**/*" --ignore "node_modules/**"
```

## Error Handling

```javascript
import { watchFiles } from 'watch-x';

try {
  const watcher = await watchFiles({
    root: './src',
    patterns: ['**/*']
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error.message);
  });

  watcher.on('change', (event) => {
    console.log('File changed:', event.path);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await watcher.close();
    process.exit(0);
  });

} catch (error) {
  console.error('Failed to start watcher:', error.message);
}
```

## Performance Tips

1. **Use debouncing** when watching files in editors to reduce noise
2. **Be specific with patterns** to avoid watching unnecessary files
3. **Use ignore patterns** to exclude large directories like `node_modules`
4. **Adjust throttle settings** for high-frequency file systems
5. **Consider initial scan** for large projects to establish baseline

## Comparison

| Feature | watch-x | chokidar | gaze | node-watch |
|---------|---------|----------|------|------------|
| Zero Dependencies | ✅ | ❌ | ❌ | ❌ |
| Debouncing | ✅ | ❌ | ❌ | ❌ |
| Throttling | ✅ | ❌ | ❌ | ❌ |
| Pattern Matching | ✅ | ✅ | ✅ | ❌ |
| Initial Scan | ✅ | ✅ | ❌ | ❌ |
| CLI Tool | ✅ | ❌ | ❌ | ❌ |
| TypeScript Support | ✅ | ✅ | ✅ | ❌ |

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Core file watching functionality
- Pattern matching and filtering
- Debouncing and throttling
- Command line interface
- Comprehensive test suite
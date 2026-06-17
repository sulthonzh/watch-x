# watch-x

Zero-dependency file watching utility with advanced pattern matching and event handling.

## Installation

```bash
npm install watch-x
```

## Usage

### JavaScript/TypeScript

```javascript
import { watchFiles } from 'watch-x';

// Watch all files in current directory
await watchFiles({
  root: './',
  patterns: ['**/*'],
  ignore: ['node_modules/**']
}, (event) => {
  console.log(event.type, event.path);
});
```

### Command Line

```bash
# Watch all files
watch-x

# Watch only JavaScript files
watch-x --pattern "**/*.js"

# Watch with debouncing
watch-x --debounce 500

# Watch with JSON output
watch-x --json
```

## API

### watchFiles(options, callback)

Watch files with the given options.

### Options

- `root`: Root directory to watch (default: cwd)
- `patterns`: File patterns to watch (default: ['**/*'])
- `ignore`: Patterns to ignore (default: ['node_modules/**', '.git/**'])
- `debounce`: Debounce delay in ms (default: 100)
- `throttle`: Throttle delay in ms (default: 0)
- `recursive`: Watch subdirectories (default: true)
- `initial`: Watch existing files initially (default: false)
- `follow`: Follow symlinks (default: false)

### Events

- `change`: File changed
- `add`: File added
- `unlink`: File removed
- `rename`: File renamed
- `ready`: Watcher is ready
- `error`: Error occurred

## License

MIT

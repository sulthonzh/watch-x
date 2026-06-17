#!/usr/bin/env node

import { readdirSync, writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build script for watch-x
 * Creates distribution files with bundled versions
 */

const distDir = 'dist';
const srcDir = 'src';

// Create dist directory if it doesn't exist
if (!existsSync(distDir)) {
  mkdirSync(distDir);
}

// Copy all source files to dist
const copyFiles = (from, to) => {
  const files = readdirSync(from);
  
  for (const file of files) {
    const srcPath = join(from, file);
    const destPath = join(to, file);
    
    if (file.endsWith('.js')) {
      // Read the JavaScript file
      let content = readFileSync(srcPath, 'utf8');
      
      // For CLI, just copy as-is
      writeFileSync(destPath, content);
    } else if (file.endsWith('.json')) {
      // Copy package.json with modifications
      const content = JSON.parse(readFileSync(srcPath, 'utf8'));
      delete content.scripts; // Remove scripts from dist package.json
      writeFileSync(destPath, JSON.stringify(content, null, 2));
    } else {
      // Copy non-JavaScript files as-is
      writeFileSync(destPath, readFileSync(srcPath, 'utf8'));
    }
  }
};

// Copy source files to dist
copyFiles(srcDir, distDir);

console.log('Build completed! Files created in dist/ directory.');

// Create README for dist
const readmeContent = `# watch-x

Zero-dependency file watching utility with advanced pattern matching and event handling.

## Installation

\`\`\`bash
npm install watch-x
\`\`\`

## Usage

### JavaScript/TypeScript

\`\`\`javascript
import { watchFiles } from 'watch-x';

// Watch all files in current directory
await watchFiles({
  root: './',
  patterns: ['**/*'],
  ignore: ['node_modules/**']
}, (event) => {
  console.log(event.type, event.path);
});
\`\`\`

### Command Line

\`\`\`bash
# Watch all files
watch-x

# Watch only JavaScript files
watch-x --pattern "**/*.js"

# Watch with debouncing
watch-x --debounce 500

# Watch with JSON output
watch-x --json
\`\`\`

## API

### watchFiles(options, callback)

Watch files with the given options.

### Options

- \`root\`: Root directory to watch (default: cwd)
- \`patterns\`: File patterns to watch (default: ['**/*'])
- \`ignore\`: Patterns to ignore (default: ['node_modules/**', '.git/**'])
- \`debounce\`: Debounce delay in ms (default: 100)
- \`throttle\`: Throttle delay in ms (default: 0)
- \`recursive\`: Watch subdirectories (default: true)
- \`initial\`: Watch existing files initially (default: false)
- \`follow\`: Follow symlinks (default: false)

### Events

- \`change\`: File changed
- \`add\`: File added
- \`unlink\`: File removed
- \`rename\`: File renamed
- \`ready\`: Watcher is ready
- \`error\`: Error occurred

## License

MIT
`;

writeFileSync(join(distDir, 'README.md'), readmeContent);

console.log('README.md created in dist/ directory.');
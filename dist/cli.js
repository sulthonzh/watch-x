#!/usr/bin/env node

import { watchFiles } from './index.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * CLI for watch-x - Zero-dependency file watching utility
 */
class WatchCLI {
  constructor() {
    this.commands = {
      'watch': this.watchCommand.bind(this),
      'help': this.helpCommand.bind(this),
      'version': this.versionCommand.bind(this)
    };
    
    this.options = {
      'help': { alias: 'h', description: 'Show help' },
      'version': { alias: 'v', description: 'Show version' },
      'pattern': { alias: 'p', description: 'File pattern to watch (can be repeated)' },
      'ignore': { alias: 'i', description: 'Pattern to ignore (can be repeated)' },
      'debounce': { alias: 'd', description: 'Debounce delay in ms' },
      'throttle': { alias: 't', description: 'Throttle delay in ms' },
      'recursive': { alias: 'r', description: 'Watch subdirectories recursively' },
      'initial': { alias: 'I', description: 'Watch existing files initially' },
      'follow': { alias: 'f', description: 'Follow symlinks' },
      'quiet': { alias: 'q', description: 'Quiet mode (minimal output)' },
      'verbose': { alias: 'V', description: 'Verbose output' },
      'json': { alias: 'j', description: 'JSON output format' }
    };
    
    this.args = process.argv.slice(2);
    this.root = process.cwd();
    this.config = this.parseArgs();
    
    if (!this.config.command || this.config.options.help) {
      this.helpCommand();
      return;
    }
    
    this.run();
  }
  
  parseArgs() {
    const result = {
      command: 'watch',
      options: {},
      args: [],
      patterns: ['**/*'],
      ignore: ['node_modules/**', '.git/**', '*.tmp', '*.log'],
      debounce: 100,
      throttle: 0,
      recursive: true,
      initial: false,
      follow: false,
      quiet: false,
      verbose: false,
      json: false
    };
    
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      // Check for options
      if (arg.startsWith('--')) {
        const optionName = arg.substring(2);
        if (this.options[optionName]) {
          result.options[optionName] = true;
          
          // Handle options with values
          if (['debounce', 'throttle'].includes(optionName)) {
            result[optionName] = parseInt(this.args[i + 1]) || 0;
            i++;
          } else if (['pattern', 'ignore'].includes(optionName)) {
            const value = this.args[i + 1];
            if (value && !value.startsWith('-')) {
              if (!result[optionName]) {
                result[optionName] = [];
              }
              result[optionName].push(value);
              i++;
            }
          }
        }
      } else if (arg.startsWith('-')) {
        const optionName = this.getOptionName(arg);
        if (optionName) {
          result.options[optionName] = true;
          
          // Handle aliases with values
          if (['d', 't'].includes(optionName)) {
            result[optionName === 'd' ? 'debounce' : 'throttle'] = parseInt(this.args[i + 1]) || 0;
            i++;
          } else if (['p', 'i'].includes(optionName)) {
            const value = this.args[i + 1];
            if (value && !value.startsWith('-')) {
              const propName = optionName === 'p' ? 'patterns' : 'ignore';
              if (!result[propName]) {
                result[propName] = [];
              }
              result[propName].push(value);
              i++;
            }
          }
        }
      } else if (!result.command || arg === 'watch') {
        result.command = 'watch';
      } else {
        result.args.push(arg);
      }
    }
    
    return result;
  }
  
  getOptionName(alias) {
    for (const [name, opts] of Object.entries(this.options)) {
      if (opts.alias === alias.substring(1)) {
        return name;
      }
    }
    return null;
  }
  
  async run() {
    try {
      await this.commands[this.config.command]();
    } catch (error) {
      this.error(error.message);
      process.exit(1);
    }
  }
  
  async watchCommand() {
    const {
      patterns,
      ignore,
      debounce,
      throttle,
      recursive,
      initial,
      follow,
      quiet,
      verbose,
      json
    } = this.config;
    
    if (verbose) {
      this.log(`Starting watcher in ${this.root}`);
      this.log(`Patterns: ${patterns.join(', ')}`);
      this.log(`Ignore: ${ignore.join(', ')}`);
      this.log(`Debounce: ${debounce}ms, Throttle: ${throttle}ms`);
      this.log(`Recursive: ${recursive}, Initial: ${initial}`);
    }
    
    // Debug: log the config
    if (verbose) {
      this.log(`Config: ${JSON.stringify({ patterns, ignore, debounce, throttle, recursive, initial, follow, quiet, verbose, json }, null, 2)}`);
    }
    
    const watcher = await watchFiles({
      root: this.root,
      patterns,
      ignore,
      debounce,
      throttle,
      recursive,
      initial,
      follow
    });
    
    // Event handlers
    const eventHandlers = {
      change: (event) => this.handleEvent('change', event, quiet, json),
      add: (event) => this.handleEvent('add', event, quiet, json),
      unlink: (event) => this.handleEvent('unlink', event, quiet, json),
      rename: (event) => this.handleEvent('rename', event, quiet, json),
      ready: (event) => {
        if (!quiet && event && event.type === 'ready') {
          if (json) {
            this.log(JSON.stringify({ type: 'ready', path: event.path, size: event.size }, null, 2));
          } else {
            this.log(`Ready: ${event.path}`);
          }
        }
      }
    };
    
    // Add event listeners
    for (const [event, handler] of Object.entries(eventHandlers)) {
      watcher.on(event, handler);
    }
    
    watcher.on('error', (error) => {
      this.error(`Error: ${error.message}`);
    });
    
    // Handle signals
    process.on('SIGINT', async () => {
      if (!quiet) this.log('\nShutting down watcher...');
      await watcher.close();
      process.exit(0);
    });
    
    if (!quiet) {
      this.log(`Watching: ${this.root}`);
      this.log('Press Ctrl+C to stop');
    }
  }
  
  handleEvent(type, event, quiet, json) {
    if (quiet) return;
    
    if (json) {
      this.log(JSON.stringify({ type, ...event }, null, 2));
    } else {
      const timestamp = new Date().toLocaleTimeString();
      const size = event.size ? ` (${event.size} bytes)` : '';
      const mtime = event.mtime ? ` @ ${event.mtime.toISOString()}` : '';
      
      this.log(`${timestamp} ${type.toUpperCase()}: ${event.path}${size}${mtime}`);
    }
  }
  
  helpCommand() {
    const helpText = `
watch-x - Zero-dependency file watching utility

Usage: watch-x [options] [command]

Commands:
  watch         Watch files (default)
  help          Show this help message
  version       Show version

Options:
  -h, --help           Show this help message
  -v, --version        Show version
  -p, --pattern PATTERN  File pattern to watch (can be repeated)
                         Example: --pattern "**/*.js" --pattern "!**/test/**"
  -i, --ignore PATTERN   Pattern to ignore (can be repeated)
  -d, --debounce MS    Debounce delay in milliseconds (default: 100)
  -t, --throttle MS    Throttle delay in milliseconds (default: 0)
  -r, --recursive       Watch subdirectories recursively (default: true)
  -I, --initial        Watch existing files initially
  -f, --follow         Follow symlinks
  -q, --quiet          Quiet mode (minimal output)
  -V, --verbose        Verbose output
  -j, --json           JSON output format

Examples:
  # Watch all files in current directory
  watch-x
  
  # Watch only JavaScript files
  watch-x --pattern "**/*.js"
  
  # Watch all files except node_modules and .git
  watch-x --ignore "node_modules/**" --ignore ".git/**"
  
  # Watch with 500ms debounce
  watch-x --debounce 500
  
  # Watch with JSON output
  watch-x --json
  
  # Watch specific files only
  watch-x --pattern "src/**/*.js" --pattern "!src/**/*.test.js"

Pattern Syntax:
  **           Match any directory (recursive)
  *            Match any characters except /
  ?            Match any single character except /
  !            Negate pattern (must be at start)
  {ext}        File extension (e.g., {js,ts})
  
Exit with Ctrl+C
`;
    console.log(helpText);
  }
  
  versionCommand() {
    console.log('watch-x v1.0.0');
  }
  
  log(message) {
    console.log(message);
  }
  
  error(message) {
    console.error(`\x1b[31mError: ${message}\x1b[0m`);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  new WatchCLI();
}

export { WatchCLI };
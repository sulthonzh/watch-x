import { EventEmitter } from 'node:events';
import { watch, watch as watchFs } from 'node:fs';
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { performance } from 'node:perf_hooks';

/**
 * Advanced file watching utility with pattern matching and event handling
 */
class Watcher extends EventEmitter {
  /**
   * Create a new Watcher instance
   * @param {Object} options - Configuration options
   * @param {string} options.root - Root directory to watch
   * @param {Array<string>} options.patterns - File patterns to watch (glob-like)
   * @param {Array<string>} options.ignore - Patterns to ignore
   * @param {number} options.debounce - Debounce delay in ms
   * @param {number} options.throttle - Throttle delay in ms
   * @param {boolean} options.recursive - Watch subdirectories recursively
   * @param {boolean} options.initial - Watch existing files initially
   * @param {boolean} options.follow - Follow symlinks
   */
  constructor(options = {}) {
    super();
    this.options = {
      root: process.cwd(),
      patterns: ['**/*'],
      ignore: ['node_modules/**', '.git/**', '*.tmp', '*.log'],
      debounce: 100,
      throttle: 200,
      recursive: true,
      initial: false,
      follow: false,
      ...options
    };
    
    this.watches = new Map();
    this.stats = new Map();
    this.debouncedEvents = new Map();
    this.throttledEvents = new Map();
    this.initialScanCompleted = false;
    this.closed = false;
    
    this.setupEventHandlers();
  }

  /**
   * Setup internal event handlers
   */
  setupEventHandlers() {
    this.on('newListener', (event) => {
      if (event === 'ready' && this.initialScanCompleted) {
        process.nextTick(() => this.emit('ready'));
      }
    });
  }

  /**
   * Start watching the specified directory
   */
  async start() {
    if (this.closed) {
      throw new Error('Watcher has been closed');
    }

    try {
      await this.watchDirectory(this.options.root);
      
      if (this.options.initial) {
        await this.scanInitialFiles();
      }
      
      this.initialScanCompleted = true;
      this.emit('ready');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Watch a specific directory
   */
  async watchDirectory(dir) {
    try {
      const watcher = watchFs(dir, { recursive: false });
      this.watches.set(dir, watcher);

      watcher.on('change', (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = join(dir, filename);
        this.handleFileEvent(fullPath, eventType);
      });

      watcher.on('error', (error) => {
        this.emit('error', error);
      });

      // Watch subdirectories if recursive is enabled
      if (this.options.recursive) {
        try {
          const entries = await readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subDir = join(dir, entry.name);
              if (this.shouldInclude(subDir)) {
                await this.watchDirectory(subDir);
              }
            }
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            this.emit('error', error);
          }
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Handle file system events with debouncing and throttling
   */
  handleFileEvent(path, eventType) {
    if (!this.shouldInclude(path)) {
      return;
    }

    // Map fs.watch event types to standard event types
    const event = {
      type: eventType === 'rename' ? 'add' : eventType,
      path,
      timestamp: performance.now()
    };

    // Apply debouncing
    if (this.options.debounce > 0) {
      const key = `${eventType}:${path}`;
      const existing = this.debouncedEvents.get(key);
      
      if (existing) {
        clearTimeout(existing.timer);
      }
      
      const timer = setTimeout(() => {
        this.debouncedEvents.delete(key);
        this.emitEvent(event);
      }, this.options.debounce);
      
      this.debouncedEvents.set(key, { event, timer });
      return;
    }

    // Apply throttling
    if (this.options.throttle > 0) {
      const key = eventType;
      const existing = this.throttledEvents.get(key);
      
      if (existing && performance.now() - existing.timestamp < this.options.throttle) {
        return;
      }
      
      this.throttledEvents.set(key, { event, timestamp: performance.now() });
    }

    this.emitEvent(event);
  }

  /**
   * Emit the actual event
   */
  async emitEvent(event) {
    try {
      const stats = await stat(event.path).catch(() => null);
      
      // Map event types appropriately
      let eventType = event.type;
      if (event.type === 'rename' && stats) {
        // If file exists after rename, it's an 'add' event
        eventType = 'add';
      } else if (event.type === 'rename' && !stats) {
        // If file doesn't exist after rename, it's an 'unlink' event
        eventType = 'unlink';
      }
      
      this.emit(eventType, {
        ...event,
        size: stats?.size,
        mtime: stats?.mtime,
        isDirectory: stats?.isDirectory() || false
      });
      
      // Also emit original event type for compatibility
      if (event.type !== eventType) {
        this.emit(event.type, {
          ...event,
          size: stats?.size,
          mtime: stats?.mtime,
          isDirectory: stats?.isDirectory() || false
        });
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Scan existing files initially
   */
  async scanInitialFiles() {
    const files = await this.findFiles(this.options.root);
    
    for (const file of files) {
      const stats = await stat(file);
      this.emit('ready', {
        type: 'ready',
        path: file,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory() || false
      });
    }
  }

  /**
   * Find files matching patterns
   */
  async findFiles(dir) {
    const results = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (this.shouldIgnore(fullPath)) {
          continue;
        }
        
        if (entry.isDirectory() && this.options.recursive) {
          results.push(...await this.findFiles(fullPath));
        } else if (entry.isFile() && this.matchesPattern(fullPath)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directory not found errors during scanning
      if (error.code !== 'ENOENT') {
        this.emit('error', error);
      }
    }
    
    return results;
  }

  /**
   * Check if a path should be included
   */
  shouldInclude(path) {
    return !this.shouldIgnore(path) && this.matchesPattern(path);
  }

  /**
   * Check if a path should be ignored
   */
  shouldIgnore(path) {
    const relative = this.getRelativePath(path);
    return this.options.ignore.some(pattern => {
      const regex = this.patternToRegex(pattern);
      return regex.test(relative);
    });
  }

  /**
   * Check if a path matches the watch patterns
   */
  matchesPattern(path) {
    const relative = this.getRelativePath(path);
    
    const matches = this.options.patterns.some(pattern => {
      const regex = this.patternToRegex(pattern);
      const result = regex.test(relative);
      
      // Debug output
      if (!result && this.options.patterns.includes('**/*')) {
        console.log('Pattern mismatch:', {
          path,
          relative,
          pattern,
          regex: regex.toString(),
          result
        });
      }
      
      return result;
    });
    
    return matches;
  }

  /**
   * Convert glob-like pattern to regex
   */
  patternToRegex(pattern) {
    // Special handling for **/* pattern to match both files and directories
    if (pattern === '**/*') {
      return new RegExp(`^([^/]+/)*[^/]+$`);
    }
    
    // Convert glob pattern to regex token-by-token to avoid replacement conflicts
    let regex = '';
    let i = 0;
    while (i < pattern.length) {
      if (pattern[i] === '*' && pattern[i + 1] === '*') {
        // ** — matches anything (including slashes)
        if (pattern[i + 2] === '/') {
          // **/ — optional directory prefix
          regex += '(?:.*/)?';
          i += 3;
        } else {
          regex += '.*';
          i += 2;
        }
      } else if (pattern[i] === '*') {
        // * — matches anything except slash
        regex += '[^/]*';
        i++;
      } else if (pattern[i] === '?') {
        regex += '[^/]';
        i++;
      } else if ('.+^$(){}|[]\\'.includes(pattern[i])) {
        regex += '\\' + pattern[i];
        i++;
      } else {
        regex += pattern[i];
        i++;
      }
    }
    
    return new RegExp(`^${regex}$`);
  }

  /**
   * Get relative path from root
   */
  getRelativePath(path) {
    return path.replace(this.options.root, '').replace(/^\//, '');
  }

  /**
   * Stop watching all directories
   */
  async close() {
    if (this.closed) return;
    
    this.closed = true;
    
    // Clear all timers
    for (const { timer } of this.debouncedEvents.values()) {
      clearTimeout(timer);
    }
    
    // Close all file watchers
    for (const watcher of this.watches.values()) {
      watcher.close();
    }
    
    this.watches.clear();
    this.debouncedEvents.clear();
    this.throttledEvents.clear();
    
    this.emit('close');
  }
}

/**
 * Factory function to create a watcher
 */
function createWatcher(options) {
  return new Watcher(options);
}

/**
 * Convenience function to watch files
 */
async function watchFiles(options = {}, callback) {
  const watcher = createWatcher(options);
  
  if (callback) {
    watcher.on('all', callback);
    watcher.on('error', callback);
  }
  
  // Auto-start the watcher
  await watcher.start();
  
  // Return the watcher, not the result of start()
  return watcher;
}

export { Watcher, createWatcher, watchFiles };
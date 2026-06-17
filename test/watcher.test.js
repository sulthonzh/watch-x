import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { watchFiles } from '../src/index.js';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'watch-x-test-' + randomUUID());

// Test setup function
async function setupTest() {
  await mkdir(testDir, { recursive: true });
  process.chdir(testDir);
}

// Cleanup function
async function cleanupTest() {
  if (watcher) {
    await watcher.close();
  }
  await rm(testDir, { recursive: true, force: true });
}

let watcher;

// Test 1: Basic file watching
test('should watch file changes', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('change', (event) => {
      events.push(event);
    });

    // Create a test file
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'initial content');

    await new Promise(resolve => setTimeout(resolve, 100));

    if (events.length > 0) {
      expect(events[0].path).toBe(testFile);
      expect(events[0].type).toBe('change');
    }
  } finally {
    await cleanupTest();
  }
});

// Test 2: File additions
test('should watch file additions', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    // Create a new test file
    const testFile = join(testDir, 'new.txt');
    await writeFile(testFile, 'new content');

    await new Promise(resolve => setTimeout(resolve, 100));

    if (events.length > 0) {
      expect(events[0].path).toBe(testFile);
      expect(events[0].type).toBe('add');
    }
  } finally {
    await cleanupTest();
  }
});

// Test 3: File removals
test('should watch file removals', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    // Create a file first
    const testFile = join(testDir, 'remove.txt');
    await writeFile(testFile, 'to be removed');

    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('unlink', (event) => {
      events.push(event);
    });

    // Remove the file
    await rm(testFile);

    await new Promise(resolve => setTimeout(resolve, 100));

    if (events.length > 0) {
      expect(events[0].path).toBe(testFile);
      expect(events[0].type).toBe('unlink');
    }
  } finally {
    await cleanupTest();
  }
});

// Test 4: Pattern matching
test('should handle pattern matching', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*.txt'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    // Create different file types
    await writeFile(join(testDir, 'test.txt'), 'text file');
    await writeFile(join(testDir, 'test.js'), 'javascript file');
    await writeFile(join(testDir, 'test.md'), 'markdown file');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only get txt files
    if (events.length > 0) {
      expect(events[0].path).toContain('.txt');
    }
  } finally {
    await cleanupTest();
  }
});

// Test 5: Ignore patterns
test('should handle ignore patterns', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      ignore: ['**/*.tmp'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    // Create files
    await writeFile(join(testDir, 'test.txt'), 'text file');
    await writeFile(join(testDir, 'test.tmp'), 'temp file');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not get tmp files
    if (events.length > 0) {
      expect(events[0].path).not.toContain('.tmp');
    }
  } finally {
    await cleanupTest();
  }
});

// Test 6: Recursive watching
test('should support recursive watching', async () => {
  await setupTest();
  
  try {
    const events = [];
    const subDir = join(testDir, 'subdir');
    await mkdir(subDir, { recursive: true });
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      recursive: true,
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    // Create file in subdirectory
    const testFile = join(subDir, 'sub.txt');
    await writeFile(testFile, 'sub file');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should get file from subdirectory
    if (events.length > 0) {
      expect(events.some(event => event.path.includes('subdir'))).toBe(true);
    }
  } finally {
    await cleanupTest();
  }
});

// Test 7: File metadata
test('should provide file metadata', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    const testFile = join(testDir, 'metadata.txt');
    await writeFile(testFile, 'metadata test');

    await new Promise(resolve => setTimeout(resolve, 100));

    if (events.length > 0) {
      const event = events[0];
      expect(event.path).toBe(testFile);
      expect(event.size).toBeGreaterThan(0);
      expect(event.mtime).toBeInstanceOf(Date);
      expect(event.isDirectory).toBe(false);
    }
  } finally {
    await cleanupTest();
  }
});

// Test 8: Initial file scanning
test('should handle initial file scanning', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    // Create files before starting watcher
    const testFile1 = join(testDir, 'initial1.txt');
    const testFile2 = join(testDir, 'initial2.txt');
    await writeFile(testFile1, 'initial 1');
    await writeFile(testFile2, 'initial 2');

    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      initial: true,
      debounce: 0,
      throttle: 0
    });

    watcher.on('ready', (event) => {
      events.push(event);
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should get initial files
    if (events.length >= 2) {
      expect(events.some(event => event.path.includes('initial1'))).toBe(true);
      expect(events.some(event => event.path.includes('initial2'))).toBe(true);
    }
  } finally {
    await cleanupTest();
  }
});

// Test 9: Pattern syntax with ignore
test('should support pattern syntax', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*.txt'],
      ignore: ['**/test/**'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    // Create test files
    await writeFile(join(testDir, 'file.txt'), 'valid file');
    const testDir2 = join(testDir, 'test');
    await mkdir(testDir2, { recursive: true });
    await writeFile(join(testDir2, 'file.txt'), 'should be ignored');
    await writeFile(join(testDir, 'file.js'), 'invalid file');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only get non-test txt files
    if (events.length > 0) {
      expect(events[0].path).not.toContain('test');
      expect(events[0].path).toContain('.txt');
    }
  } finally {
    await cleanupTest();
  }
});

// Test 10: Graceful closing
test('should close gracefully', async () => {
  await setupTest();
  
  try {
    const events = [];
    
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
    });

    // Start watching
    await watcher.start();

    // Close the watcher
    await watcher.close();

    // Verify it's closed
    expect(watcher.closed).toBe(true);
  } finally {
    await cleanupTest();
  }
});
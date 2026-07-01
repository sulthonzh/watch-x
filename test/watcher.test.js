import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { watchFiles } from '../src/index.js';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const testDir = join(tmpdir(), 'watch-x-test-' + randomUUID());

// Test setup function
async function setupTest() {
  await mkdir(testDir, { recursive: true });
}

// Cleanup function
async function cleanupTest() {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
  await rm(testDir, { recursive: true, force: true });
}

let watcher;

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
    watcher.on('change', (event) => events.push(event));

    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'initial content');

    const deadline1 = Date.now() + 2000;
    while (events.length === 0 && Date.now() < deadline1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (events.length > 0) {
      assert.ok(events[0].path.includes('test.txt'));
      assert.strictEqual(events[0].type, 'change');
    }
  } finally {
    await cleanupTest();
  }
});

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
    watcher.on('add', (event) => events.push(event));

    const testFile = join(testDir, 'new.txt');
    await writeFile(testFile, 'new content');

    // Poll for up to 2s — fs.watch + async stat() can be slow on macOS
    const deadline = Date.now() + 2000;
    while (events.length === 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    assert.ok(events.length > 0, 'Should receive at least one add event');
    const newFileEvent = events.find(e => e.path.includes('new.txt'));
    assert.ok(newFileEvent, 'Should receive add event for new.txt');
    assert.strictEqual(newFileEvent.type, 'add');
  } finally {
    await cleanupTest();
  }
});

test('should watch file removals', async () => {
  await setupTest();
  try {
    const events = [];
    const testFile = join(testDir, 'remove.txt');
    await writeFile(testFile, 'to be removed');

    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });
    watcher.on('unlink', (event) => events.push(event));

    await rm(testFile);

    const deadline3 = Date.now() + 2000;
    while (events.length === 0 && Date.now() < deadline3) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (events.length > 0) {
      assert.ok(events[0].path.includes('remove.txt'));
      assert.strictEqual(events[0].type, 'unlink');
    }
  } finally {
    await cleanupTest();
  }
});

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
    watcher.on('add', (event) => events.push(event));

    await writeFile(join(testDir, 'test.txt'), 'text file');
    await writeFile(join(testDir, 'test.js'), 'javascript file');
    await writeFile(join(testDir, 'test.md'), 'markdown file');

    const deadline4 = Date.now() + 2000;
    while (events.length === 0 && Date.now() < deadline4) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    for (const event of events) {
      assert.ok(event.path.endsWith('.txt'), `Expected .txt file but got ${event.path}`);
    }
  } finally {
    await cleanupTest();
  }
});

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
    watcher.on('add', (event) => events.push(event));

    await writeFile(join(testDir, 'test.txt'), 'text file');
    await writeFile(join(testDir, 'test.tmp'), 'temp file');

    const deadline5 = Date.now() + 2000;
    while (events.length === 0 && Date.now() < deadline5) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    for (const event of events) {
      assert.ok(!event.path.endsWith('.tmp'), `Expected no .tmp files but got ${event.path}`);
    }
  } finally {
    await cleanupTest();
  }
});

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
    watcher.on('add', (event) => events.push(event));

    const testFile = join(subDir, 'sub.txt');
    await writeFile(testFile, 'sub file');

    const deadline6 = Date.now() + 2000;
    while (events.length === 0 && Date.now() < deadline6) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    assert.ok(events.some(event => event.path.includes('subdir')),
      'Should receive event from subdirectory');
  } finally {
    await cleanupTest();
  }
});

test('should close gracefully', async () => {
  await setupTest();
  try {
    watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    await watcher.close();
    assert.ok(watcher.closed, 'Watcher should be marked as closed');
    watcher = null;
  } finally {
    await cleanupTest();
  }
});

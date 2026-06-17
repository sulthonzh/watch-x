import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'internal-debug-test-' + randomUUID());

async function debugInternal() {
  try {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    console.log('Created test directory:', testDir);

    // Import and create watcher
    const { watchFiles } = await import('../src/index.js');
    console.log('✓ watchFiles imported successfully');
    
    // Create a watcher with verbose options
    const watcher = watchFiles({
      root: testDir,
      patterns: ['**/*'],
      ignore: [],
      debounce: 0,
      throttle: 0,
      recursive: true,
      initial: false
    });
    
    console.log('✓ Watcher created');
    
    // Override the emit method to debug events
    const originalEmit = watcher.emit;
    let eventsEmitted = 0;
    
    watcher.emit = function(eventType, ...args) {
      eventsEmitted++;
      console.log(`[${eventsEmitted}] Event emitted:`, eventType, args[0]);
      return originalEmit.apply(this, [eventType, ...args]);
    };
    
    // Override handleFileEvent to see when it's called
    const originalHandleFileEvent = watcher.handleFileEvent;
    watcher.handleFileEvent = function(path, eventType) {
      console.log(`handleFileEvent called:`, path, eventType, '-> creating event with type:', eventType === 'rename' ? 'add' : eventType, 'debouncedEvents size:', this.debouncedEvents.size, 'throttledEvents size:', this.throttledEvents.size);
      
      // Check if there are existing events
      if (this.debouncedEvents.size > 0 || this.throttledEvents.size > 0) {
        console.log('Existing debounced events:', Array.from(this.debouncedEvents.entries()));
        console.log('Existing throttled events:', Array.from(this.throttledEvents.entries()));
      }
      
      return originalHandleFileEvent.call(this, path, eventType);
    };
    
    // Set up event listeners
    watcher.on('change', (event) => {
      console.log('Change event received:', event);
    });
    
    watcher.on('add', (event) => {
      console.log('Add event received:', event);
    });
    
    watcher.on('error', (error) => {
      console.log('Error event received:', error);
    });
    
    // Start the watcher
    console.log('\nStarting watcher...');
    await watcher.start();
    console.log('Watcher started');
    
    // Create a test file
    console.log('\nCreating test file...');
    const testFile = join(testDir, 'test.txt');
    writeFileSync(testFile, 'test content');
    console.log('File created:', testFile);
    
    // Wait for events
    console.log('Waiting for events...');
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log(`\nTotal events emitted: ${eventsEmitted}`);
        watcher.close();
        resolve();
      }, 3000);
    });
    
    return eventsEmitted > 0;
    
  } catch (error) {
    console.error('Error in internal debug:', error);
    return false;
  } finally {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run the debug
debugInternal().then((result) => {
  console.log(`\n🔍 Internal debug result: ${result ? '✅ EVENTS DETECTED' : '❌ NO EVENTS'}`);
  process.exit(result ? 0 : 1);
}).catch((error) => {
  console.error('Debug execution failed:', error);
  process.exit(1);
});
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'minimal-test-' + randomUUID());

async function testMinimal() {
  try {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    console.log('Created test directory:', testDir);

    // Import and create watcher
    const { watchFiles } = await import('../src/index.js');
    console.log('✓ watchFiles imported successfully');
    
    // Create a watcher
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
    
    // Track events
    let eventsReceived = [];
    
    // Set up event listeners
    watcher.on('add', (event) => {
      eventsReceived.push({ type: 'add', event });
      console.log('Add event received:', event);
    });
    
    watcher.on('change', (event) => {
      eventsReceived.push({ type: 'change', event });
      console.log('Change event received:', event);
    });
    
    watcher.on('error', (error) => {
      eventsReceived.push({ type: 'error', error: error.message });
      console.log('Error event received:', error.message);
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
        console.log(`\nTotal events received: ${eventsReceived.length}`);
        eventsReceived.forEach((event, index) => {
          console.log(`${index + 1}. ${event.type}:`, event.event || event.error);
        });
        watcher.close();
        resolve();
      }, 3000);
    });
    
    return eventsReceived.length > 0;
    
  } catch (error) {
    console.error('Error in minimal test:', error);
    return false;
  } finally {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run the test
testMinimal().then((result) => {
  console.log(`\n🎯 Minimal test result: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
  process.exit(result ? 0 : 1);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
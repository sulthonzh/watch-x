import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'watch-x-simple-test-' + randomUUID());

async function testWatchXFunctionality() {
  try {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    console.log('Created test directory:', testDir);

    // Import and test watch-x
    console.log('\n=== Testing watch-x functionality ===');
    
    // Try to import and create a simple test
    const { watchFiles } = await import('/Users/sulthonzh/Data/projects/quadbyte/open-source-lab/oss-builder/watch-x/src/index.js');
    console.log('✓ watchFiles imported successfully');
    
    // Create a watcher instance
    const watcherResult = watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });
    
    console.log('watchFiles result:', watcherResult);
    console.log('watchFiles result type:', typeof watcherResult);
    console.log('watchFiles result constructor:', watcherResult.constructor.name);
    
    // Wait for the async operation to complete
    const watcher = await watcherResult;
    
    console.log('Resolved watcher:', watcher);
    console.log('Resolved watcher type:', typeof watcher);
    console.log('Resolved watcher constructor:', watcher.constructor.name);
    
    console.log('✓ Watcher created');
    
    // Check if it has the expected methods
    console.log('Watcher object:', watcher);
    console.log('Watcher prototype:', Object.getPrototypeOf(watcher));
    console.log('Watcher constructor:', watcher.constructor);
    console.log('Watcher methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(watcher)));
    
    if (typeof watcher.start === 'function') {
      console.log('✓ start() method exists');
    } else {
      console.log('✗ start() method missing');
      return false;
    }
    
    if (typeof watcher.on === 'function') {
      console.log('✓ on() method exists');
    } else {
      console.log('✗ on() method missing');
      return false;
    }
    
    // Test the start method
    await watcher.start();
    console.log('✓ Watcher started');
    
    // Set up event listeners
    let eventsReceived = 0;
    
    watcher.on('change', (event) => {
      eventsReceived++;
      console.log('Change event:', event);
    });
    
    watcher.on('add', (event) => {
      eventsReceived++;
      console.log('Add event:', event);
    });
    
    watcher.on('error', (error) => {
      console.log('Error event:', error.message);
    });
    
    // Create a test file and see if events are received
    setTimeout(() => {
      console.log('Creating test file...');
      const testFile = join(testDir, 'test.txt');
      writeFileSync(testFile, 'test content');
      console.log('File created, waiting for events...');
    }, 1000);
    
    // Wait for events
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Total events received: ${eventsReceived}`);
        watcher.close();
        resolve();
      }, 3000);
    });
    
    return eventsReceived > 0;
    
  } catch (error) {
    console.error('Error testing watch-x:', error);
    return false;
  } finally {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run the test
testWatchXFunctionality().then((result) => {
  console.log(`\n🎯 watch-x functionality test: ${result ? '✅ PASSED' : '❌ FAILED'}`);
  process.exit(result ? 0 : 1);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
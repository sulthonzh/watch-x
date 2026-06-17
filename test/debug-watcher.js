import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'debug-watcher-test-' + randomUUID());

async function debugWatcher() {
  try {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    console.log('Created test directory:', testDir);

    // Import and test watch-x
    console.log('\n=== Debugging watch-x ===');
    
    const { watchFiles } = await import('../src/index.js');
    console.log('✓ watchFiles imported successfully');
    
    // Create a watcher instance
    const watcher = watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });
    
    console.log('Watcher created:', typeof watcher);
    console.log('Watcher properties:', Object.getOwnPropertyNames(watcher));
    console.log('Watcher prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(watcher)));
    
    // Check methods
    console.log('\n=== Method checks ===');
    console.log('start method:', typeof watcher.start);
    console.log('on method:', typeof watcher.on);
    console.log('close method:', typeof watcher.close);
    console.log('emit method:', typeof watcher.emit);
    
    // Check if it's an EventEmitter
    console.log('Has EventEmitter methods:', typeof watcher.emit === 'function');
    
    // Test the start method
    if (typeof watcher.start === 'function') {
      await watcher.start();
      console.log('✓ Watcher started');
    } else {
      console.log('✗ start() method is not a function');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Error debugging watcher:', error);
    return false;
  } finally {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run the debug
debugWatcher().then((result) => {
  console.log(`\n🔧 Debug result: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
  process.exit(result ? 0 : 1);
}).catch((error) => {
  console.error('Debug execution failed:', error);
  process.exit(1);
});
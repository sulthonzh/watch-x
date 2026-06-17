import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { watch } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'simple-debug-' + randomUUID());

async function testNativeWatch() {
  console.log('Testing native fs.watch...');
  
  await mkdir(testDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    const watcher = watch(testDir, (eventType, filename) => {
      console.log('Native fs.watch event:', eventType, filename);
      watcher.close();
      resolve(true);
    });

    // Create a file after a short delay
    setTimeout(async () => {
      try {
        const testFile = join(testDir, 'test.txt');
        await writeFile(testFile, 'test content');
        console.log('Created file:', testFile);
      } catch (error) {
        reject(error);
      }
    }, 100);

    // Timeout after 2 seconds
    setTimeout(() => {
      watcher.close();
      resolve(false);
    }, 2000);
  });
}

async function testWatchFiles() {
  console.log('Testing watchFiles function...');
  
  await mkdir(testDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    let eventsReceived = 0;
    
    // Import the watchFiles function
    import('../src/index.js').then(({ watchFiles }) => {
      console.log('watchFiles imported successfully');
      
      const watcher = watchFiles({
        root: testDir,
        patterns: ['**/*'],
        debounce: 0,
        throttle: 0
      });

      watcher.on('change', (event) => {
        eventsReceived++;
        console.log('Change event:', event);
        watcher.close();
        resolve(true);
      });

      watcher.on('add', (event) => {
        eventsReceived++;
        console.log('Add event:', event);
        watcher.close();
        resolve(true);
      });

      watcher.on('error', (error) => {
        console.log('Error event:', error);
        watcher.close();
        resolve(false);
      });

      // Create a file after a short delay
      setTimeout(async () => {
        try {
          const testFile = join(testDir, 'test.txt');
          await writeFile(testFile, 'test content');
          console.log('Created file for watchFiles test:', testFile);
          
          // Wait a bit more for any events
          setTimeout(() => {
            console.log('Total events received:', eventsReceived);
            watcher.close();
            resolve(eventsReceived > 0);
          }, 1000);
        } catch (error) {
          reject(error);
        }
      }, 500);

    }).catch(reject);
  });
}

async function main() {
  console.log('Starting simple debug tests...\n');
  
  try {
    console.log('=== Test 1: Native fs.watch ===');
    const nativeResult = await testNativeWatch();
    console.log(`Native fs.watch: ${nativeResult ? '✓ WORKS' : '✗ FAIL'}\n`);
    
    console.log('=== Test 2: watchFiles Function ===');
    const watchResult = await testWatchFiles();
    console.log(`watchFiles: ${watchResult ? '✓ WORKS' : '✗ FAIL'}\n`);
    
    console.log('=== Results ===');
    console.log(`Native fs.watch: ${nativeResult ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`watchFiles: ${watchResult ? '✓ PASS' : '✗ FAIL'}`);
    
    if (nativeResult && watchResult) {
      console.log('\n🎉 All tests passed!');
    } else if (nativeResult) {
      console.log('\n⚠️ Native fs.watch works, but watchFiles has issues');
    } else {
      console.log('\n❌ Issues found');
    }
    
  } catch (error) {
    console.log('Debug test failed:', error);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
}

main().catch(console.error);
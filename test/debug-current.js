import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { watch } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'watch-debug-' + randomUUID());

async function testWatchX() {
  console.log('Testing watch-x implementation...');
  
  await mkdir(testDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    try {
      // Import the implementation
      import('../src/index.js').then(({ watchFiles }) => {
        console.log('watchFiles imported successfully');
        
        const watcher = watchFiles({
          root: testDir,
          patterns: ['**/*'],
          debounce: 0,
          throttle: 0
        });

        let eventsReceived = 0;
        
        watcher.on('change', (event) => {
          eventsReceived++;
          console.log('Change event received:', event);
          watcher.close();
          resolve(true);
        });

        watcher.on('add', (event) => {
          eventsReceived++;
          console.log('Add event received:', event);
          watcher.close();
          resolve(true);
        });

        watcher.on('error', (error) => {
          console.log('Error event:', error);
          watcher.close();
          resolve(false);
        });

        // Create a test file after a short delay
        setTimeout(async () => {
          const testFile = join(testDir, 'test.txt');
          await writeFile(testFile, 'test content');
          console.log('Created file:', testFile);
          
          // Wait for events
          setTimeout(() => {
            console.log('Total events received:', eventsReceived);
            watcher.close();
            resolve(eventsReceived > 0);
          }, 1000);
        }, 500);

      }).catch((error) => {
        console.log('Error importing watchFiles:', error);
        resolve(false);
      });
    } catch (error) {
      console.log('Error in test setup:', error);
      resolve(false);
    }
  });
}

async function main() {
  console.log('Starting watch-x debug test...');
  
  const result = await testWatchX();
  
  if (result) {
    console.log('✅ watch-x is working correctly');
  } else {
    console.log('❌ watch-x has issues');
  }
}

main().catch(console.error);
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { watchFiles } from '../src/index.js';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'watch-x-specific-debug-' + randomUUID());

async function testWatchXImplementation() {
  console.log('Testing watch-x implementation...');
  
  await mkdir(testDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    let eventsReceived = 0;
    let timeout;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        console.log('Timeout reached, checking events...');
        resolve(eventsReceived > 0);
      }, 3000);
    });
    
    const watcherPromise = new Promise(async (resolve) => {
      try {
        console.log('Creating watcher...');
        
        const watcher = await watchFiles({
          root: testDir,
          patterns: ['**/*'],
          debounce: 0,
          throttle: 0
        });

        console.log('Watcher created, setting up event handlers...');
        
        watcher.on('change', (event) => {
          eventsReceived++;
          console.log('Change event received:', event);
          clearTimeout(timeout);
          resolve(true);
        });

        watcher.on('add', (event) => {
          eventsReceived++;
          console.log('Add event received:', event);
          clearTimeout(timeout);
          resolve(true);
        });

        watcher.on('error', (error) => {
          console.log('Error event received:', error);
          clearTimeout(timeout);
          resolve(false);
        });

        console.log('Waiting for watcher to be ready...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create a test file
        const testFile = join(testDir, 'debug-test.txt');
        console.log('Creating test file:', testFile);
        await writeFile(testFile, 'debug content');
        console.log('File created, waiting for events...');
        
        // Wait a bit more for any pending events
        setTimeout(() => {
          console.log('Final check - events received:', eventsReceived);
          clearTimeout(timeout);
          resolve(eventsReceived > 0);
        }, 1000);
        
      } catch (error) {
        console.log('Error creating watcher:', error);
        clearTimeout(timeout);
        resolve(false);
      }
    });
    
    return Promise.race([watcherPromise, timeoutPromise]);
  });
}

async function testImmediateFileCreation() {
  console.log('Testing immediate file creation...');
  
  await mkdir(testDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    let eventsReceived = 0;
    let timeout;
    
    // Create file immediately, then start watcher
    const testFile = join(testDir, 'immediate-test.txt');
    console.log('Creating file before watcher:', testFile);
    writeFile(testFile, 'immediate content')
      .then(() => {
        console.log('File created, now starting watcher...');
        
        return watchFiles({
          root: testDir,
          patterns: ['**/*'],
          debounce: 0,
          throttle: 0
        });
      })
      .then((watcher) => {
        console.log('Watcher started, waiting for events...');
        
        watcher.on('change', (event) => {
          eventsReceived++;
          console.log('Change event for immediate file:', event);
          clearTimeout(timeout);
          resolve(true);
        });

        watcher.on('add', (event) => {
          eventsReceived++;
          console.log('Add event for immediate file:', event);
          clearTimeout(timeout);
          resolve(true);
        });

        watcher.on('error', (error) => {
          console.log('Error with immediate file:', error);
          clearTimeout(timeout);
          resolve(false);
        });

        // Timeout after 2 seconds
        timeout = setTimeout(() => {
          console.log('Timeout for immediate file test');
          resolve(eventsReceived > 0);
        }, 2000);
      })
      .catch((error) => {
        console.log('Error in immediate file test:', error);
        clearTimeout(timeout);
        resolve(false);
      });
  });
}

async function main() {
  console.log('Starting watch-x specific debug tests...\n');
  
  try {
    console.log('=== Test 1: watch-x Implementation ===');
    const watchXResult = await testWatchXImplementation();
    console.log(`Watch-x implementation: ${watchXResult ? '✓ WORKS' : '✗ FAIL'}\n`);
    
    console.log('=== Test 2: Immediate File Creation ===');
    const immediateResult = await testImmediateFileCreation();
    console.log(`Immediate file creation: ${immediateResult ? '✓ WORKS' : '✗ FAIL'}\n`);
    
    console.log('=== Watch-X Debug Results ===');
    console.log(`Watch-x implementation: ${watchXResult ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Immediate file creation: ${immediateResult ? '✓ PASS' : '✗ FAIL'}`);
    
    if (watchXResult || immediateResult) {
      console.log('\n🎉 watch-x has some functionality working!');
    } else {
      console.log('\n❌ watch-x needs debugging');
    }
    
  } catch (error) {
    console.log('Debug test failed:', error);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
}

main().catch(console.error);
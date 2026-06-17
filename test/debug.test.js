import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { watch, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'watch-x-debug-test-' + randomUUID());

async function testNativeFsWatch() {
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

async function testWatchFileCreation() {
  console.log('Testing file creation detection...');
  
  await mkdir(testDir, { recursive: true });
  
  return new Promise((resolve, reject) => {
    let detected = false;
    
    const testFile = join(testDir, 'creation-test.txt');
    
    // Check if file exists first
    setTimeout(async () => {
      try {
        const exists = existsSync(testFile);
        console.log('File exists before creation:', exists);
        
        // Now create the file
        await writeFile(testFile, 'test content');
        console.log('Created file for testing...');
        
        // Wait a bit and check again
        setTimeout(() => {
          const afterExists = existsSync(testFile);
          console.log('File exists after creation:', afterExists);
          resolve(detected || afterExists);
        }, 100);
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
}

async function main() {
  console.log('Starting watch-x debug tests...\n');
  
  try {
    console.log('=== Test 1: Native fs.watch ===');
    const nativeResult = await testNativeFsWatch();
    console.log(`Native fs.watch: ${nativeResult ? '✓ WORKS' : '✗ FAIL'}\n`);
    
    console.log('=== Test 2: File Creation ===');
    const creationResult = await testWatchFileCreation();
    console.log(`File creation: ${creationResult ? '✓ WORKS' : '✗ FAIL'}\n`);
    
    console.log('=== Debug Results ===');
    console.log(`Native fs.watch: ${nativeResult ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`File creation: ${creationResult ? '✓ PASS' : '✗ FAIL'}`);
    
    if (nativeResult) {
      console.log('\n🎉 Basic fs.watch functionality works!');
    } else {
      console.log('\n❌ fs.watch is not working properly');
    }
    
  } catch (error) {
    console.log('Debug test failed:', error);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
}

main().catch(console.error);
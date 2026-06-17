import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { watch } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'basic-watch-test-' + randomUUID());

async function testNativeWatch() {
  return new Promise((resolve, reject) => {
    const watcher = watch(testDir, (eventType, filename) => {
      console.log('Native fs.watch event:', eventType, filename);
      watcher.close();
      resolve(true);
    });

    // Create a file after a short delay
    setTimeout(() => {
      try {
        const testFile = join(testDir, 'test.txt');
        writeFileSync(testFile, 'test content');
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

async function main() {
  try {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    console.log('Created test directory:', testDir);

    // Test 1: Native fs.watch
    console.log('\n=== Test 1: Native fs.watch ===');
    const nativeResult = await testNativeWatch();
    console.log(`Native fs.watch: ${nativeResult ? '✓ WORKS' : '✗ FAIL'}`);

    console.log('\n✅ Basic functionality test completed');

  } catch (error) {
    console.error('Error in basic functionality test:', error);
    throw error;
  } finally {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

main().catch(console.error);
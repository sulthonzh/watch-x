import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { watchFiles } from '../src/index.js';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDir = join(tmpdir(), 'watch-x-basic-test-' + randomUUID());

async function testBasicFunctionality() {
  console.log('Setting up test directory...');
  await mkdir(testDir, { recursive: true });
  
  try {
    console.log('Testing basic file watching...');
    
    const events = [];
    
    const watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('change', (event) => {
      events.push(event);
      console.log('Change event:', event);
    });

    // Create a test file
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'initial content');
    console.log('Created test file:', testFile);

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 200));

    if (events.length > 0) {
      console.log('✓ Test passed: File changes detected');
      console.log('Events received:', events.length);
      return true;
    } else {
      console.log('✗ Test failed: No events detected');
      return false;
    }
  } catch (error) {
    console.log('✗ Test failed with error:', error.message);
    return false;
  } finally {
    // Cleanup
    console.log('Cleaning up...');
    await rm(testDir, { recursive: true, force: true });
  }
}

async function testPatternMatching() {
  console.log('\nTesting pattern matching...');
  
  await mkdir(testDir, { recursive: true });
  
  try {
    const events = [];
    
    const watcher = await watchFiles({
      root: testDir,
      patterns: ['**/*.txt'],
      debounce: 0,
      throttle: 0
    });

    watcher.on('add', (event) => {
      events.push(event);
      console.log('Add event:', event);
    });

    // Create different file types
    await writeFile(join(testDir, 'test.txt'), 'text file');
    await writeFile(join(testDir, 'test.js'), 'javascript file');
    await writeFile(join(testDir, 'test.md'), 'markdown file');

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 200));

    const txtFiles = events.filter(event => event.path.endsWith('.txt'));
    if (txtFiles.length > 0) {
      console.log('✓ Pattern matching test passed');
      console.log('TXT files detected:', txtFiles.length);
      return true;
    } else {
      console.log('✗ Pattern matching test failed');
      return false;
    }
  } catch (error) {
    console.log('✗ Pattern matching test failed with error:', error.message);
    return false;
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('Starting watch-x basic tests...\n');
  
  const test1 = await testBasicFunctionality();
  const test2 = await testPatternMatching();
  
  console.log('\n=== Test Results ===');
  console.log(`Basic functionality: ${test1 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Pattern matching: ${test2 ? '✓ PASS' : '✗ FAIL'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

main().catch(console.error);
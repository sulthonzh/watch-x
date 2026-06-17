import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const testDir = join(tmpdir(), 'pattern-test-' + randomUUID());

function patternToRegex(pattern) {
  console.log('Original pattern:', pattern);
  
  let regex = pattern
    .replace(/\*\*/g, '.*') // Match any directory
    .replace(/\*/g, '[^/]*') // Match any non-slash characters
    .replace(/\?/g, '[^/]') // Match any single non-slash character
    .replace(/\./g, '\\.'); // Escape literal dots
  
  console.log('After replacements:', regex);
  console.log('Final regex:', `^${regex}$`);
  
  const finalRegex = new RegExp(`^${regex}$`);
  console.log('Regex object:', finalRegex);
  return finalRegex;
}

function correctPatternToRegex(pattern) {
  console.log('Original pattern:', pattern);
  
  let regex = pattern
    .replace(/\*\*/g, '.*') // Match any directory
    .replace(/\*/g, '[^/]*') // Match any non-slash characters
    .replace(/\?/g, '[^/]') // Match any single non-slash character
  
  // Don't escape dots that are part of the pattern
  // Only escape standalone dots that are meant to be literal dots
  // This is more complex - for now, let's not escape dots at all
  // regex = regex.replace(/\./g, '\\.');
  
  console.log('Corrected regex:', `^${regex}$`);
  return new RegExp(`^${regex}$`);
}

function fixStarStarPattern(pattern) {
  // Special handling for **/* pattern to match both files and directories
  if (pattern === '**/*') {
    console.log('Special handling for **/* pattern');
    // This should match both files and directories
    return new RegExp(`^([^/]+/)*[^/]+$`);
  }
  
  // Use the corrected pattern conversion for other patterns
  return correctPatternToRegex(pattern);
}

function getRelativePath(path, root) {
  return path.replace(root, '').replace(/^\//, '');
}

async function testPattern() {
  console.log('Testing pattern matching...');
  
  // Test cases
  const testCases = [
    {
      path: join(testDir, 'test.txt'),
      root: testDir,
      patterns: ['**/*'],
      expected: true
    },
    {
      path: join(testDir, 'subdir/file.js'),
      root: testDir,
      patterns: ['**/*'],
      expected: true
    },
    {
      path: join(testDir, 'test.txt'),
      root: testDir,
      patterns: ['*.txt'],
      expected: true
    }
  ];
  
  for (const testCase of testCases) {
    const relative = getRelativePath(testCase.path, testCase.root);
    const regex = patternToRegex(testCase.patterns[0]);
    const correctedRegex = correctPatternToRegex(testCase.patterns[0]);
    const fixedRegex = fixStarStarPattern(testCase.patterns[0]);
    const matches = regex.test(relative);
    const correctedMatches = correctedRegex.test(relative);
    const fixedMatches = fixedRegex.test(relative);
    
    console.log(`Test: ${testCase.patterns[0]}`);
    console.log(`  Path: ${testCase.path}`);
    console.log(`  Relative: ${relative}`);
    console.log(`  Original Regex: ${regex}`);
    console.log(`  Matches: ${matches} (expected: ${testCase.expected})`);
    console.log(`  Result: ${matches === testCase.expected ? '✓' : '✗'}`);
    console.log(`  Corrected Regex: ${correctedRegex}`);
    console.log(`  Corrected Matches: ${correctedMatches} (expected: ${testCase.expected})`);
    console.log(`  Corrected Result: ${correctedMatches === testCase.expected ? '✓' : '✗'}`);
    console.log(`  Fixed Regex: ${fixedRegex}`);
    console.log(`  Fixed Matches: ${fixedMatches} (expected: ${testCase.expected})`);
    console.log(`  Fixed Result: ${fixedMatches === testCase.expected ? '✓' : '✗'}\n`);
  }
}

testPattern().catch(console.error);
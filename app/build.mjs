// Build step of the pb-l1-node fixture: records the mode and a build-scope value, so the page
// proves the build ran in root_dir with its env (BUILD_MARK is build-scope in the live proof).
import { readFileSync, writeFileSync } from 'node:fs';

const mode = readFileSync('mode.txt', 'utf8').trim();
const mark = process.env.BUILD_MARK || 'none';
writeFileSync('built.json', JSON.stringify({ mode, stamp: `${mode}-${mark}` }) + '\n');
console.log(`pb-l1: built mode=${mode}`);

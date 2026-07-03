const fs = require('fs');

const path = 'c:/Users/Tomas/.antigravity-ide/Autosportingg-main/src/lib/help/helpRegistry.js';
const code = fs.readFileSync(path, 'utf8');

// The array starts at `export const helpRegistry = [`
const arrayStartIndex = code.indexOf('export const helpRegistry = [');
const innerCode = code.substring(arrayStartIndex + 'export const helpRegistry = ['.length, code.lastIndexOf('];'));

// Naive object extraction by matching braces.
let objects = [];
let braceCount = 0;
let currentObject = '';
let inString = false;
let stringChar = '';

for (let i = 0; i < innerCode.length; i++) {
    const char = innerCode[i];
    
    if (inString) {
        if (char === stringChar && innerCode[i-1] !== '\\') {
            inString = false;
        }
        currentObject += char;
        continue;
    }

    if (char === "'" || char === '"' || char === "`") {
        inString = true;
        stringChar = char;
        currentObject += char;
        continue;
    }

    if (char === '{') {
        braceCount++;
        currentObject += char;
    } else if (char === '}') {
        braceCount--;
        currentObject += char;
        if (braceCount === 0) {
            objects.push(currentObject.trim());
            currentObject = '';
        }
    } else if (braceCount > 0) {
        currentObject += char;
    }
}

let map = {};
objects.forEach(obj => {
    // Extract ID
    const idMatch = obj.match(/id:\s*['"`](.*?)['"`]/);
    const titleMatch = obj.match(/title:\s*['"`](.*?)['"`]/);
    if (idMatch && titleMatch) {
        map[idMatch[1]] = {
            id: idMatch[1],
            title: titleMatch[1],
            code: obj
        };
    }
});

fs.writeFileSync('c:/Users/Tomas/.antigravity-ide/Autosportingg-main/scratch/chapters_map.json', JSON.stringify(map, null, 2));
console.log(`Found ${Object.keys(map).length} chapters.`);

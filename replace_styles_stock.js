const fs = require('fs');
const path = require('path');

const directoriesToProcess = [
    'src/components/crm/stock',
    'src/components/crm/documentacion'
];

const replacements = [
    { regex: /bg-\[#0B0B0D\]/g, replacement: 'bg-crm-bg' },
    { regex: /bg-\[#141416\]/g, replacement: 'bg-crm-surface' },
    { regex: /bg-\[#1a1a1f\]/g, replacement: 'bg-crm-surface' },
    { regex: /bg-\[#1e1e22\]/g, replacement: 'bg-crm-surface' },
    { regex: /bg-\[#28282E\]/g, replacement: 'bg-crm-surface-raised' },
    { regex: /bg-\[#2a2a2e\]/g, replacement: 'bg-crm-surface-raised' },
    { regex: /bg-\[#33333A\]/g, replacement: 'bg-crm-surface-raised' },
    { regex: /border-white\/5/g, replacement: 'border-crm-border' },
    { regex: /border-white\/10/g, replacement: 'border-crm-border' },
    { regex: /border-\[#33333A\]/g, replacement: 'border-crm-border' },
    { regex: /text-gray-400/g, replacement: 'text-crm-fg-muted' },
    { regex: /text-gray-500/g, replacement: 'text-crm-fg-muted' },
    { regex: /text-gray-600/g, replacement: 'text-crm-fg-muted' },
    { regex: /text-\[#A1A1AA\]/g, replacement: 'text-crm-fg-muted' },
    { regex: /text-\[#71717A\]/g, replacement: 'text-crm-fg-subtle' },
    { regex: /bg-red-500/g, replacement: 'bg-crm-red' },
    { regex: /bg-\[#EF3329\]/g, replacement: 'bg-crm-red' },
    { regex: /bg-\[#e63027\]/g, replacement: 'bg-crm-red-brand' }
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            for (const { regex, replacement } of replacements) {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

const basePath = process.cwd();
for (const dir of directoriesToProcess) {
    const fullDirPath = path.join(basePath, dir);
    if (fs.existsSync(fullDirPath)) {
        processDirectory(fullDirPath);
    } else {
        console.warn(`Directory not found: ${fullDirPath}`);
    }
}
console.log('Done.');

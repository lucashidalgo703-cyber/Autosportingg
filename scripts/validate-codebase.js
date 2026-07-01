import fs from 'fs';
import path from 'path';

// Directorios y archivos a revisar
const TARGETS = ['server.js', 'src'];

const ERRORS = [];
const WARNINGS = [];

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
        callback(dir);
    } else if (stat.isDirectory()) {
        fs.readdirSync(dir).forEach(file => {
            walk(path.join(dir, file), callback);
        });
    }
}

// 1. Extraer los PERMISSIONS válidos desde el lugar donde se definen
let validPermissions = new Set();

try {
    const serverCode = fs.readFileSync('src/utils/adminPermissions.js', 'utf8');
    const permMatch = serverCode.match(/export const PERMISSIONS\s*=\s*{([\s\S]*?)}/);
    if (permMatch) {
        const perms = permMatch[1].match(/[A-Z_]+:/g);
        if (perms) {
            validPermissions = new Set(perms.map(p => p.replace(':', '')));
            console.log(`Successfully parsed ${validPermissions.size} permissions from adminPermissions.js`);
        } else {
            console.warn("Could not find any permissions inside PERMISSIONS block");
        }
    } else {
        console.warn("Could not find PERMISSIONS block in adminPermissions.js");
    }
} catch (e) {
    console.error("Could not read adminPermissions.js", e);
}

let checkedFiles = 0;

TARGETS.forEach(target => {
    walk(target, (filePath) => {
        // Skip node_modules, .git, etc just in case
        if (filePath.includes('node_modules') || filePath.includes('.next') || filePath.includes('.git')) return;
        // Solo archivos JS/JSX
        if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;

        checkedFiles++;
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
            const lineNum = i + 1;

            // 1. Check for invalid PERMISSIONS.* usage
            const permUsageRegex = /PERMISSIONS\.([A-Z_]+)/g;
            let match;
            while ((match = permUsageRegex.exec(line)) !== null) {
                const usedPerm = match[1];
                if (!validPermissions.has(usedPerm)) {
                    ERRORS.push(`[${filePath}:${lineNum}] Invalid permission used: PERMISSIONS.${usedPerm}`);
                }
            }

            // 2. Check for old logAudit calls (signatures without object parameter)
            if (line.match(/logAudit\(\s*[^{\s]/)) {
                ERRORS.push(`[${filePath}:${lineNum}] Found old call to logAudit() without object signature.`);
            }

            // 3. Check for removed endpoints
            if (line.includes('/api/admin/settings/general')) {
                ERRORS.push(`[${filePath}:${lineNum}] Found reference to removed endpoint /api/admin/settings/general`);
            }

            // 4. Check that Next route handlers have authentication if they are in /api/admin
            // This is a naive regex check. If a file is in app/api/admin/.../route.js, it should probably import authenticateToken or similar
            if (filePath.replace(/\\/g, '/').includes('/app/api/admin/') && filePath.endsWith('route.js')) {
                // If it's a route handler defining GET/POST/etc, it should have some auth
                if (line.match(/export (async )?function (GET|POST|PUT|PATCH|DELETE)/)) {
                    if (!content.includes('getServerSession') && !content.includes('authenticateToken')) {
                        WARNINGS.push(`[${filePath}:${lineNum}] Route handler might be missing authentication check.`);
                    }
                }
            }
        });
    });
});

console.log(`\nChecked ${checkedFiles} files.`);

if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Found ${WARNINGS.length} warnings:`);
    WARNINGS.forEach(w => console.log(`  ${w}`));
}

if (ERRORS.length > 0) {
    console.error(`\n❌ Found ${ERRORS.length} validation errors:`);
    ERRORS.forEach(e => console.error(`  ${e}`));
    process.exit(1);
} else {
    console.log(`\n✅ All validations passed!\n`);
    process.exit(0);
}

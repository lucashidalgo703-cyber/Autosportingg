const fs = require('fs');

const path = 'server.js';
let content = fs.readFileSync(path, 'utf8');

const target = `        const newClient = new Client({
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            fullName: fullName,
            phone: phone,
            email: email,
            status: 'Comprador'
        });`;

const replacement = `        const newClient = new Client({
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            fullName: fullName,
            phone: phone,
            email: email,
            dniCuit: dni,
            source: 'otro',
            type: 'comprador',
            status: 'activo'
        });`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed successfully.");
} else {
    console.log("Target not found. Let's try with flexible whitespace matching");
    // Just replace using regex or find the index of "const newClient = new Client({" inside create-link-client
    const startIdx = content.indexOf("app.post('/api/admin/sales/:id/create-link-client'");
    if (startIdx > -1) {
        const clientStartIdx = content.indexOf("const newClient = new Client({", startIdx);
        const clientEndIdx = content.indexOf("});", clientStartIdx) + 3;
        if (clientStartIdx > -1 && clientEndIdx > -1) {
             const before = content.substring(0, clientStartIdx);
             const after = content.substring(clientEndIdx);
             content = before + replacement + after;
             fs.writeFileSync(path, content, 'utf8');
             console.log("Fixed successfully via index slice.");
        }
    }
}

const fs = require('fs');

const files = [
    'src/app/admin/liquidaciones/page.jsx',
    'src/app/admin/mis-comisiones/page.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Replace \` with `
    content = content.replace(/\\\`/g, '`');
    // Replace \$ with $
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(file, content);
});

console.log('Fixed syntax errors');

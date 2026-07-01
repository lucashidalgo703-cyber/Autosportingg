import fs from 'fs';
import path from 'path';

const dir = 'src/components/crm/leads';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (!file.endsWith('.jsx')) return;
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let original = content;
    content = content.replace(/cotizacion/gi, 'lead');
    content = content.replace(/cotizaciones/gi, 'leads');
    content = content.replace(/Cotizacion/g, 'Lead');
    content = content.replace(/Cotizaciones/g, 'Leads');
    content = content.replace(/cotización/gi, 'lead');
    
    // Some minor grammar fixes
    content = content.replace(/Esta lead/g, 'Este lead');
    content = content.replace(/esta lead/g, 'este lead');
    content = content.replace(/las leads/gi, 'los leads');
    content = content.replace(/Las leads/g, 'Los leads');
    content = content.replace(/una lead/g, 'un lead');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});

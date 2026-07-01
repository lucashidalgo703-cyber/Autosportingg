const fs = require('fs');
const files = [
  'server.js',
  'src/components/crm/finance/tabs/ChequesTab.jsx',
  'src/models/Check.js'
];

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const newContent = content.split('\n').map(line => line.trimEnd()).join('\n');
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Fixed trailing whitespaces in', file);
    }
  } catch (err) {
    console.error('Error processing', file, err.message);
  }
});

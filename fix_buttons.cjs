const fs = require('fs');
const path = 'src/styles/index.css';

let css = fs.readFileSync(path, 'utf8');

if (!css.includes('background-color: transparent; /* SOTE FIX */')) {
    const fix = `
/* GLOBAL BUTTON FIX FOR MISSING TAILWIND BASE */
button {
  background-color: transparent; /* SOTE FIX */
  background-image: none;
  border: none;
}
`;
    fs.writeFileSync(path, css + fix);
    console.log('index.css updated');
} else {
    console.log('Already fixed');
}

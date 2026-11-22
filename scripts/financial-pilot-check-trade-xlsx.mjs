import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {parseTradeWorkbook} from '../src/services/financialTradeWorkbook.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upload = process.argv[2];
export function readTradeWorkbook(upload) {
    if (!upload || path.extname(upload).toLowerCase() !== '.xlsx') throw new Error('Indicá la ruta de una copia local .xlsx.');
    const file = fs.realpathSync(upload);
    const relative = path.relative(repo, file);
    if (file.startsWith('\\\\') || (!relative.startsWith('..'+path.sep) && !path.isAbsolute(relative))) {
        throw new Error('Guardá la copia local fuera del repositorio y de rutas de red.');
    }
    if (fs.statSync(file).size > 2_000_000) throw new Error('El archivo supera 2 MB. Usá una copia de la plantilla.');
    return parseTradeWorkbook(fs.readFileSync(file));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try {
    const {cashEntered,issues} = readTradeWorkbook(upload);
    if (issues.length) {
        for (const issue of issues) console.error(issue);
        process.exitCode = 1;
    } else {
        console.log('Controles locales de estructura y saldo aprobados. No se importó al chat ni se envió a OpenAI.');
        if (cashEntered) console.log('Revisá manualmente los flujos de caja, fondos restringidos y movimientos ya incluidos antes de probar el mínimo.');
        else console.log('Sin escenario de caja. La muestra no permite probar el mínimo bajo estrés.');
    }
} catch (error) {
    const known = ['Indicá','Guardá','El archivo','Usá'].some(prefix => error.message.startsWith(prefix));
    console.error(known ? error.message : 'No se pudo leer la copia local de Excel. Revisá que exista y que el archivo abra en Excel.');
    process.exitCode = 1;
}

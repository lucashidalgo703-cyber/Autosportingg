import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,copyFile,cp,readdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'public','ocr');
const packageRoot=name=>dirname(require.resolve(name+'/package.json'));
const tess=packageRoot('tesseract.js'),core=packageRoot('tesseract.js-core'),pdf=packageRoot('pdfjs-dist');
await mkdir(join(destination,'core'),{recursive:true});await mkdir(join(destination,'lang'),{recursive:true});
await copyFile(join(tess,'dist','worker.min.js'),join(destination,'worker.min.js'));
for(const name of await readdir(core))if(/^tesseract-core.*\.(wasm|js)$/.test(name))await copyFile(join(core,name),join(destination,'core',name));
for(const language of ['spa','eng'])await copyFile(join(packageRoot('@tesseract.js-data/'+language),'4.0.0_best_int',language+'.traineddata.gz'),join(destination,'lang',language+'.traineddata.gz'));
await copyFile(join(pdf,'build','pdf.worker.min.mjs'),join(destination,'pdf.worker.min.mjs'));
for(const folder of ['cmaps','standard_fonts','wasm','iccs'])await cp(join(pdf,folder),join(destination,folder),{recursive:true});
for(const [source,target]of [[join(tess,'LICENSE.md'),'LICENSE-tesseract.md'],[join(core,'LICENSE'),'LICENSE-tesseract-core'],[join(pdf,'LICENSE'),'LICENSE-pdfjs']])try{await copyFile(source,join(destination,target));}catch(error){if(error.code!=='ENOENT')throw error;}
const version=async path=>JSON.parse(await readFile(join(path,'package.json'),'utf8')).version;
await writeFile(join(destination,'manifest.json'),JSON.stringify({tesseract:await version(tess),core:await version(core),pdfjs:await version(pdf),languages:['spa','eng']},null,2)+'\n');
console.log('OCR local preparado en public/ocr: worker, WASM, PDF y modelos spa/eng. Sin documentos de usuario.');

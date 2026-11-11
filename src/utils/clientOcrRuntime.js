const abortError=()=>new DOMException('Lectura cancelada.','AbortError');
const check=signal=>{if(signal?.aborted)throw abortError();};
// Use the protocol exposed by the locally bundled Tesseract worker. Owning the
// Worker from construction permits immediate cancellation during model loading,
// as well as recognition. prepare-ocr-assets copies the matching installed build.
function localOcrSession(signal,onProgress){
 check(signal);
 const worker=new Worker(new URL('/ocr/worker.min.js',window.location.origin));
 const jobs=new Map();let number=0,stopped=false;
 const stop=()=>{if(stopped)return;stopped=true;worker.terminate();for(const job of jobs.values())job.reject(abortError());jobs.clear();signal?.removeEventListener('abort',stop);};
 signal?.addEventListener('abort',stop,{once:true});
 worker.onmessage=event=>{
  const packet=event.data,job=jobs.get(packet.jobId);
  if(packet.status==='progress'){onProgress?.(packet.data);return;}
  if(!job)return;
  if(packet.status==='resolve'){jobs.delete(packet.jobId);job.resolve(packet.data);}
  else if(packet.status==='reject'){jobs.delete(packet.jobId);job.reject(Error(String(packet.data || 'No se pudo reconocer el documento.')));}
 };
 worker.onerror=event=>{for(const job of jobs.values())job.reject(Error(event.message || 'No se pudo iniciar el motor local de OCR.'));jobs.clear();stop();};
 const send=(action,payload)=>new Promise((resolve,reject)=>{
  if(stopped || signal?.aborted){reject(abortError());return;}
  const jobId='client-ocr-'+(++number);jobs.set(jobId,{resolve,reject});worker.postMessage({workerId:'client-local',jobId,action,payload});
 });
 const origin=window.location.origin;
 const ready=(async()=>{
  await send('load',{options:{lstmOnly:true,corePath:origin+'/ocr/core',logging:false}});
  await send('loadLanguage',{langs:'spa+eng',options:{langPath:origin+'/ocr/lang',cacheMethod:'none',gzip:true,lstmOnly:true}});
  await send('initialize',{langs:'spa+eng',oem:1,config:{tessedit_pageseg_mode:'6'}});
 })();ready.catch(()=>{});
 return {stop,recognize:async bytes=>{await ready;check(signal);return send('recognize',{image:new Uint8Array(bytes),options:{},output:{text:true}});}};
}
async function canvasBytes(canvas){
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value ? resolve(value) : reject(Error('No se pudo preparar la imagen.')),'image/png'));
 return blob.arrayBuffer();
}
async function imageBytes(file,signal){
 check(signal);const image=await createImageBitmap(file);
 try{
  check(signal);const scale=Math.min(2,2200/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const bytes=await canvasBytes(canvas);canvas.width=canvas.height=1;check(signal);return bytes;
 }finally{image.close();}
}
export async function extractClientDocumentText(file,{signal,onProgress}={}){
 if(!file || !file.size || file.size>5*1024*1024)throw Error('Elegí un archivo con contenido de hasta 5 MB.');
 const isPdf=file.type==='application/pdf' || /\.pdf$/i.test(file.name || '');
 if(!isPdf && !['image/png','image/jpeg','image/webp'].includes(file.type) && !(file.type==='' && /\.(png|jpe?g|webp)$/i.test(file.name || '')))throw Error('Usá PDF, PNG, JPEG o WebP.');
 check(signal);let ocr=null,pdfTask=null,pdf=null,progressPage=1,progressTotal=1;
 const recognize=async(bytes,page,total)=>{
  progressPage=page;progressTotal=total;
  if(!ocr)ocr=localOcrSession(signal,progress=>onProgress?.({stage:progress?.status==='recognizing text' ? 'ocr' : 'engine',page:progressPage,total:progressTotal,progress:Number(progress?.progress) || 0}));
  const result=await ocr.recognize(bytes);check(signal);return result.text || '';
 };
 const cancelPdf=()=>{pdfTask?.destroy().catch(()=>{});};
 signal?.addEventListener('abort',cancelPdf,{once:true});
 try{
  if(!isPdf){onProgress?.({stage:'prepare',page:1,total:1,progress:0});const text=await recognize(await imageBytes(file,signal),1,1);return {text,pages:1,method:'ocr',truncated:false};}
  onProgress?.({stage:'pdf',page:0,total:0,progress:0});
  const pdfjs=await import('pdfjs-dist/build/pdf.mjs');check(signal);
  const origin=window.location.origin;pdfjs.GlobalWorkerOptions.workerSrc=origin+'/ocr/pdf.worker.min.mjs';
  const bytes=await file.arrayBuffer();check(signal);
  pdfTask=pdfjs.getDocument({data:new Uint8Array(bytes),cMapUrl:origin+'/ocr/cmaps/',cMapPacked:true,standardFontDataUrl:origin+'/ocr/standard_fonts/',wasmUrl:origin+'/ocr/wasm/',iccUrl:origin+'/ocr/iccs/',useSystemFonts:false,isEvalSupported:false,enableXfa:false});
  pdf=await pdfTask.promise;check(signal);
  const total=Math.min(pdf.numPages,3),parts=[];let usedOcr=false,usedText=false;
  for(let number=1;number<=total;number++){
   check(signal);onProgress?.({stage:'pdf',page:number,total,progress:0});
   const page=await pdf.getPage(number);let text='';
   try{const content=await page.getTextContent();text=content.items.map(item=>String(item.str || '')+(item.hasEOL ? '\n' : ' ')).join('').trim();}catch{/* Scanned pages use local image recognition. */}
   check(signal);
   if(text.replace(/[^\p{L}\p{N}]/gu,'').length>=25){parts.push(text);usedText=true;}
   else{
    const original=page.getViewport({scale:1}),scale=Math.min(2,2200/Math.max(original.width,original.height)),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const rendering=page.render({canvas,viewport,annotationMode:0}),cancel=()=>rendering.cancel();
    signal?.addEventListener('abort',cancel,{once:true});
    try{await rendering.promise;check(signal);parts.push(await recognize(await canvasBytes(canvas),number,total));usedOcr=true;}
    finally{signal?.removeEventListener('abort',cancel);canvas.width=canvas.height=1;}
   }
   page.cleanup();
  }
  return {text:parts.join('\n\n').slice(0,60000),pages:total,method:usedOcr && usedText ? 'mixed' : usedOcr ? 'ocr' : 'text',truncated:pdf.numPages>3};
 }catch(error){if(signal?.aborted)throw abortError();throw error;}
 finally{ocr?.stop();signal?.removeEventListener('abort',cancelPdf);if(pdfTask)await pdfTask.destroy().catch(()=>{});}
}

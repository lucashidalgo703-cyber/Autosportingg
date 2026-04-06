(()=>{var e={};e.id=902,e.ids=[902],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},7862:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>s.a,__next_app__:()=>m,pages:()=>d,routeModule:()=>g,tree:()=>c});var i=r(260),a=r(8203),o=r(5155),s=r.n(o),n=r(7292),l={};for(let e in n)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>n[e]);r.d(t,l);let c=["",{children:["auto",{children:["[id]",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,4141)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\auto\\[id]\\page.jsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,1206)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\layout.jsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,9937,23)),"next/dist/client/components/not-found-error"],forbidden:[()=>Promise.resolve().then(r.t.bind(r,9116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(r.t.bind(r,1485,23)),"next/dist/client/components/unauthorized-error"]}],d=["C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\auto\\[id]\\page.jsx"],m={require:r,loadChunk:()=>Promise.resolve()},g=new i.AppPageRouteModule({definition:{kind:a.RouteKind.APP_PAGE,page:"/auto/[id]/page",pathname:"/auto/[id]",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},8886:(e,t,r)=>{Promise.resolve().then(r.bind(r,5122))},8622:(e,t,r)=>{Promise.resolve().then(r.bind(r,4195))},5668:(e,t,r)=>{"use strict";r.d(t,{A:()=>i});let i=(0,r(1680).A)("arrow-left",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]])},4195:(e,t,r)=>{"use strict";r.d(t,{default:()=>j});var i=r(5512),a=r(8009),o=r.n(a),s=r(8531),n=r.n(s),l=r(9334),c=r(5668),d=r(1680);let m=(0,d.A)("chevron-left",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]),g=(0,d.A)("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);var p=r(453);let h=(0,d.A)("calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]),u=(0,d.A)("gauge",[["path",{d:"m12 14 4-4",key:"9kzdfg"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0",key:"19p75a"}]]),x=(0,d.A)("fuel",[["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5",key:"1wtuz0"}],["path",{d:"M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16",key:"e09ifn"}],["path",{d:"M2 21h13",key:"1x0fut"}],["path",{d:"M3 9h11",key:"1p7c0w"}]]);var b=r(4269),f=r(7717),v=r(9019),y=r(5330);let j=()=>{let{id:e}=(0,l.useParams)(),{cars:t,loading:r}=(0,f.f)(),{isFavorite:a,toggleFavorite:s}=(0,y.r)(),d=t.find(t=>t._id===e||t.id&&t.id.toString()===e),j=d?d._id||d.id:null,w=!!j&&a(j),[k,N]=o().useState(null),[z,C]=o().useState(!1);o().useEffect(()=>{d&&N(d.coverImage||d.images&&d.images[0])},[d]);let _=e=>{if(e.stopPropagation(),!d.images)return;let t=(d.images.indexOf(k||d.coverImage||d.images&&d.images[0])+1)%d.images.length;N(d.images[t])},A=e=>{if(e.stopPropagation(),!d.images)return;let t=(d.images.indexOf(k||d.coverImage||d.images&&d.images[0])-1+d.images.length)%d.images.length;N(d.images[t])};return(o().useEffect(()=>{if(!d||!d.images||d.images.length<2)return;let e=k||d.coverImage||d.images[0],t=d.images.indexOf(e);if(-1===t)return;let r=(t+1)%d.images.length,i=(t-1+d.images.length)%d.images.length;[...new Set([d.images[r],d.images[i]])].forEach(e=>{new Image().src=(0,v.Q)(e,1200),new Image().src=(0,v.Q)(e,1600)})},[k,d]),d)?(0,i.jsxs)("main",{className:"container page-padding",children:[(0,i.jsxs)(n(),{to:"/catalogo",className:"back-link",children:[(0,i.jsx)(c.A,{size:20})," Volver al cat\xe1logo"]}),(0,i.jsxs)("div",{className:"detail-grid",children:[(0,i.jsxs)("div",{className:"image-section",children:[(0,i.jsxs)("div",{className:"main-image-container overflow-hidden rounded-xl relative",children:[(0,i.jsx)("div",{className:"flex",children:(0,i.jsxs)("div",{className:"relative min-w-full aspect-[4/3]",children:[(0,i.jsxs)("div",{className:"relative w-full h-full overflow-hidden group bg-color-bg-secondary cursor-zoom-in border border-neutral-600",onClick:()=>C(!0),children:[(0,i.jsx)("div",{className:"w-full h-full flex items-center justify-center",children:(0,i.jsx)("img",{alt:d.name,className:"object-cover w-full h-full fade-in",style:{objectPosition:d.imagePosition||"50% 75%"},src:(0,v.Q)(k||d.coverImage||d.images&&d.images[0],1200)})}),(0,i.jsx)("div",{className:"absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"})]}),d.images&&d.images.length>1&&(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)("button",{className:"absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10",onClick:e=>{e.stopPropagation(),A(e)},children:(0,i.jsx)(m,{size:24})}),(0,i.jsx)("button",{className:"absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10",onClick:e=>{e.stopPropagation(),_(e)},children:(0,i.jsx)(g,{size:24})})]})]})}),d.images&&d.images.length>0&&(0,i.jsxs)("div",{className:"absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg z-10 md:hidden",children:[d.images.indexOf(k||d.images[0])+1," / ",d.images.length]})]}),d.images&&d.images.length>1&&(0,i.jsx)("div",{className:"hidden md:grid grid-cols-3 gap-3 mt-3",children:d.images.slice(1,4).map((e,t)=>{let r=2===t,a=d.images.length-4;return(0,i.jsxs)("button",{className:`relative aspect-[4/3] rounded-lg overflow-hidden border border-neutral-600 ${k===e?"ring-2 ring-primary":""}`,onClick:()=>{r&&a>0?C(!0):N(e)},children:[(0,i.jsx)("div",{className:"w-full h-full flex items-center justify-center",children:(0,i.jsx)("img",{src:(0,v.Q)(e,400),alt:`${d.name} view ${t+2}`,className:`object-cover w-full h-full transition duration-300 ${r&&a>0?"blur-sm":""}`,style:{objectPosition:d.imagePosition||"50% 75%"}})}),r&&a>0&&(0,i.jsx)("div",{className:"absolute inset-0 bg-black/40 flex items-center justify-center text-white",children:(0,i.jsxs)("div",{className:"text-3xl font-bold",children:["+",a]})})]},t)})})]}),(0,i.jsxs)("div",{className:"info-section",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between mb-2",children:[(0,i.jsx)("div",{className:"condition-badge mb-0",children:d.condition}),(0,i.jsxs)("button",{className:"detail-favorite-btn flex items-center gap-2",onClick:()=>s(j),children:[(0,i.jsx)(p.A,{size:24,fill:w?"var(--color-primary)":"none",color:w?"var(--color-primary)":"white"}),(0,i.jsx)("span",{className:"text-sm font-medium",children:w?"Guardado":"Guardar"})]})]}),(0,i.jsxs)("h1",{className:"car-title",children:[d.brand," ",d.name]}),(0,i.jsxs)("div",{className:"specs-grid",children:[(0,i.jsxs)("div",{className:"spec-item",children:[(0,i.jsxs)("div",{className:"spec-label",children:[(0,i.jsx)(h,{size:18})," ",(0,i.jsx)("span",{children:"A\xf1o"})]}),(0,i.jsx)("div",{className:"spec-value",children:d.year})]}),(0,i.jsxs)("div",{className:"spec-item",children:[(0,i.jsxs)("div",{className:"spec-label",children:[(0,i.jsx)(u,{size:18})," ",(0,i.jsx)("span",{children:"Kilometraje"})]}),(0,i.jsxs)("div",{className:"spec-value",children:[d.km.toLocaleString()," km"]})]}),(0,i.jsxs)("div",{className:"spec-item",children:[(0,i.jsxs)("div",{className:"spec-label",children:[(0,i.jsx)(x,{size:18})," ",(0,i.jsx)("span",{children:"Combustible"})]}),(0,i.jsx)("div",{className:"spec-value",children:d.fuel})]})]}),d.description&&(0,i.jsxs)("div",{className:"car-description",children:[(0,i.jsx)("h3",{children:"Sobre este veh\xedculo"}),(0,i.jsx)("p",{children:d.description})]}),(0,i.jsx)("button",{onClick:()=>window.open(`https://wa.me/5492974045378?text=${encodeURIComponent(`Hola AutoSporting, estoy interesado en el ${d.brand} ${d.name} ${d.year}`)}`,"_blank"),className:"btn btn-primary full-width",children:"Consultar por WhatsApp"}),(0,i.jsxs)("div",{className:"mt-16 space-y-3 p-4 bg-white/5 rounded-lg border border-white/10",children:[(0,i.jsxs)("p",{className:"flex items-center gap-2 text-lg font-light text-white tracking-wide",children:[(0,i.jsx)("span",{className:"text-primary text-2xl",children:"*"})," Consulte por financiaci\xf3n."]}),(0,i.jsxs)("p",{className:"flex items-center gap-2 text-lg font-light text-white tracking-wide",children:[(0,i.jsx)("span",{className:"text-primary text-2xl",children:"*"})," Tomamos su usado en parte de pago."]})]})]})]}),z&&(0,i.jsxs)("div",{className:"lightbox-overlay",onClick:()=>C(!1),children:[(0,i.jsx)("button",{className:"lightbox-close",children:(0,i.jsx)(b.A,{size:32})}),(0,i.jsx)("button",{className:"lightbox-nav prev",onClick:A,children:(0,i.jsx)(m,{size:48})}),(0,i.jsx)("img",{src:(0,v.Q)(k||d.coverImage||d.images&&d.images[0],1600),alt:d.name,className:"lightbox-img fade-in",onClick:e=>e.stopPropagation()},k),(0,i.jsx)("button",{className:"lightbox-nav next",onClick:_,children:(0,i.jsx)(g,{size:48})})]}),(0,i.jsx)("style",{children:`
                .container {
                    max-width: 1280px; /* Reverted to 1280px to match reference size exactly */
                    margin: 0 auto;
                    width: 100%;
                    padding-left: 1rem;
                    padding-right: 1rem;
                }

                .page-padding {
                    padding-top: 2rem;
                    padding-bottom: 5rem;
                }

                .not-found {
                    min-height: 60vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: white;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--color-text-muted);
                    text-decoration: none;
                    margin-bottom: 2rem;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: var(--color-primary);
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }

                @media (min-width: 768px) {
                    .detail-grid {
                        grid-template-columns: 7fr 5fr;
                    }
                }

                /* Tailwind Utility Replacements / New Components */
                .rounded-xl { border-radius: 0.75rem; }
                .rounded-lg { border-radius: 0.5rem; }
                .overflow-hidden { overflow: hidden; }
                .relative { position: relative; }
                .absolute { position: absolute; }
                
                /* Double escaped characters for CSS-in-JS */
                .top-1\\/2 { top: 50%; }
                .left-2 { left: 0.5rem; }
                .right-2 { right: 0.5rem; }
                .-translate-y-1\\/2 { transform: translateY(-50%); }
                .p-2 { padding: 0.5rem; }
                
                .bg-black\\/50 { background-color: rgba(0, 0, 0, 0.5); }
                .hover\\:bg-black\\/70:hover { background-color: rgba(0, 0, 0, 0.7); }
                
                .transition-colors { transition-property: background-color, border-color, color, fill, stroke; transition-duration: 0.2s; }
                
                .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
                .bottom-4 { bottom: 1rem; }
                .right-4 { right: 1rem; }
                .w-full { width: 100%; }
                .h-full { height: 100%; }
                .min-w-full { min-width: 100%; }
                .object-cover { object-fit: cover; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-center { justify-content: center; }
                
                .bg-black\\/20 { background-color: rgba(0, 0, 0, 0.2); }
                .bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4); }
                .bg-black\\/80 { background-color: rgba(0, 0, 0, 0.8); }
                
                .text-white { color: white; }
                .text-sm { font-size: 0.875rem; }
                .text-3xl { font-size: 1.875rem; }
                .font-bold { font-weight: 700; }
                .font-medium { font-weight: 500; }
                
                .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                .z-10 { z-index: 10; }
                .z-20 { z-index: 20; }
                .z-30 { z-index: 30; }
                
                .transition-opacity { transition-property: opacity; }
                .duration-300 { transition-duration: 300ms; }
                .opacity-0 { opacity: 0; }
                .group:hover .group-hover\\:opacity-100 { opacity: 1; }
                
                .cursor-zoom-in { cursor: zoom-in; }
                .blur-sm { filter: blur(4px); }
                .border-neutral-600 { border-color: #525252; }
                .bg-color-bg-secondary { background-color: #1a1a1a; }
                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                .rounded-full { border-radius: 9999px; }
                .mt-3 { margin-top: 0.75rem; }
                .gap-3 { gap: 0.75rem; }

                /* Grid System Replacements */
                .hidden { display: none; }
                @media (min-width: 768px) {
                    .md\\:grid { display: grid; }
                    .md\\:hidden { display: none; }
                    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                }

                /* Escaped bracket selectors */
                .aspect-\\[4\\/3\\] { aspect-ratio: 4/3; }
                
                /* Cleanup of old classes */
                .main-image, .thumbnails-grid, .thumbnail-btn, .thumb-wrapper, .more-images-overlay {
                    /* Disabled/Superseded by utilities above */
                }

                /* Lightbox Styles */
                .lightbox-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.95);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    animation: fadeIn 0.3s ease;
                }

                .lightbox-img {
                    max-width: 95%;
                    max-height: 95%;
                    object-fit: contain;
                    border-radius: 4px;
                    box-shadow: 0 0 30px rgba(0,0,0,0.5);
                    /* Animation class added dynamically */
                }
                
                .lightbox-img.fade-in {
                    animation: zoomInLight 0.2s ease-out;
                }

                .lightbox-close {
                    position: absolute;
                    top: 2rem;
                    right: 2rem;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.5rem;
                    transition: transform 0.2s;
                    z-index: 2001;
                }

                .lightbox-close:hover {
                    transform: scale(1.1);
                    color: var(--color-primary);
                }
                
                .lightbox-nav {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    padding: 1rem;
                    transition: all 0.2s;
                    z-index: 2001;
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                }
                
                .lightbox-nav.prev {
                    left: 20px;
                }

                .lightbox-nav.next {
                    right: 20px;
                }
                
                .lightbox-nav:hover {
                    color: white;
                    background-color: rgba(0,0,0,0.3);
                    border-radius: 50%;
                }

                @keyframes zoomIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                
                @keyframes zoomInLight {
                    from { transform: scale(0.98); opacity: 0.8; }
                    to { transform: scale(1); opacity: 1; }
                }

                .condition-badge {
                    color: var(--color-primary);
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.9rem;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }

                .detail-favorite-btn {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 9999px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .detail-favorite-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.4);
                }

                .car-title {
                    font-size: clamp(2rem, 4vw, 3rem);
                    line-height: 1.1;
                    margin-bottom: 0.5rem;
                }

                .car-price {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #333;
                }

                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .spec-item {
                    background-color: var(--color-surface);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid #333;
                }

                .spec-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--color-text-muted);
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                }

                .spec-value {
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .full-width {
                    width: 100%;
                    justify-content: center;
                    font-size: 1.1rem;
                    padding: 1rem;
                }

                .car-description {
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #333;
                }

                .car-description h3 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: white;
                }

                .car-description p {
                    color: #ccc;
                    line-height: 1.6;
                    white-space: pre-wrap; /* Preserve line breaks */
                }

                .legal-text {
                    margin-top: 2rem;
                    color: #666;
                    font-size: 0.9rem;
                }
            `})]}):(0,i.jsxs)("div",{className:"not-found",children:[(0,i.jsx)("h2",{children:"Veh\xedculo no encontrado"}),(0,i.jsxs)(n(),{to:"/catalogo",className:"btn btn-primary",children:[(0,i.jsx)(c.A,{size:20})," Volver al cat\xe1logo"]})]})}},4141:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s,generateMetadata:()=>o});var i=r(2740),a=r(5122);async function o({params:e}){let{id:t}=await e;try{let e=process.env.NEXT_PUBLIC_API_URL||"http://localhost:3001",r=await fetch(`${e}/api/cars`,{cache:"no-store"}),i=(await r.json()).find(e=>e._id===t||e.id&&e.id.toString()===t);if(i){let e=i.coverImage||i.images&&i.images[0],t=e&&e.includes("cloudinary")?e.replace("/upload/","/upload/w_1200,h_630,c_fill/"):e;return{title:`${i.brand} ${i.name} | AutoSporting`,description:`Conoc\xe9 este ${i.brand} ${i.name} ${i.year} en excelentes condiciones. Kilometraje: ${i.km}km. Concesionaria en Comodoro Rivadavia.`,openGraph:{title:`${i.brand} ${i.name} | ${i.year}`,description:`Cat\xe1logo AutoSporting: ${i.condition} - ${i.km}km | Consultanos por financiaci\xf3n.`,images:[{url:t||"/autosporting-hero-v2.jpg",width:1200,height:630}]}}}}catch(e){console.error("Error generating metadata in SSR:",e)}return{title:"Detalle del Veh\xedculo | AutoSporting"}}function s(){return(0,i.jsx)(a.default,{})}},5122:(e,t,r)=>{"use strict";r.d(t,{default:()=>i});let i=(0,r(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\views\\\\CarDetail.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\views\\CarDetail.jsx","default")},7717:(e,t,r)=>{"use strict";r.d(t,{f:()=>o});var i=r(8009),a=r(3835);let o=()=>{let[e,t]=(0,i.useState)([]),[r,o]=(0,i.useState)(!0),[s,n]=(0,i.useState)(null),{logout:l}=(0,a.A)(),c=async()=>{try{o(!0),process.env.NEXT_PUBLIC_API_URL;let e=await fetch(`/api/cars?t=${Date.now()}`);if(!e.ok)throw Error("Failed to fetch cars");let r=await e.json();t(r)}catch(e){console.error("Error fetching cars:",e),n(e.message)}finally{o(!1)}};return(0,i.useEffect)(()=>{c()},[]),{cars:e,loading:r,error:s,refresh:c,deleteCar:async e=>{if(confirm("Are you sure?"))try{process.env.NEXT_PUBLIC_API_URL;let r=`/api/cars/${e}`,i=await fetch(r,{method:"DELETE",headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!i.ok){if(401===i.status||403===i.status){alert("Session expired"),l();return}throw Error("Failed to delete")}t(t=>t.filter(t=>t._id!==e))}catch(e){console.error("Error deleting car:",e),alert("Error deleting car")}},setCars:t}}},9019:(e,t,r)=>{"use strict";r.d(t,{Q:()=>i});let i=(e,t=600)=>{if(!e)return"";if(!e.includes("cloudinary.com"))return e;let r=e.split("/upload/");return 2===r.length?`${r[0]}/upload/f_auto,q_auto,w_${t},c_limit/${r[1]}`:e}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[238,640],()=>r(7862));module.exports=i})();
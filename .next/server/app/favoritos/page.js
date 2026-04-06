(()=>{var e={};e.id=26,e.ids=[26],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},6306:(e,r,t)=>{"use strict";t.r(r),t.d(r,{GlobalError:()=>s.a,__next_app__:()=>p,pages:()=>l,routeModule:()=>m,tree:()=>c});var a=t(260),o=t(8203),i=t(5155),s=t.n(i),n=t(7292),d={};for(let e in n)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>n[e]);t.d(r,d);let c=["",{children:["favoritos",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,5755)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\favoritos\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(t.bind(t,1206)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\layout.jsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,9937,23)),"next/dist/client/components/not-found-error"],forbidden:[()=>Promise.resolve().then(t.t.bind(t,9116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(t.t.bind(t,1485,23)),"next/dist/client/components/unauthorized-error"]}],l=["C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\favoritos\\page.jsx"],p={require:t,loadChunk:()=>Promise.resolve()},m=new a.AppPageRouteModule({definition:{kind:o.RouteKind.APP_PAGE,page:"/favoritos/page",pathname:"/favoritos",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},3859:(e,r,t)=>{Promise.resolve().then(t.bind(t,5755))},7931:(e,r,t)=>{Promise.resolve().then(t.bind(t,3934))},5668:(e,r,t)=>{"use strict";t.d(r,{A:()=>a});let a=(0,t(1680).A)("arrow-left",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]])},5907:(e,r,t)=>{"use strict";t.d(r,{A:()=>a});let a=(0,t(1680).A)("arrow-right",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]])},3934:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>u});var a=t(5512),o=t(8009),i=t(8531),s=t.n(i),n=t(5668);let d=(0,t(1680).A)("car",[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",key:"5owen"}],["circle",{cx:"7",cy:"17",r:"2",key:"u2ysq9"}],["path",{d:"M9 17h6",key:"r8uit2"}],["circle",{cx:"17",cy:"17",r:"2",key:"axvx0g"}]]);var c=t(2427),l=t(7717),p=t(5330);let m=()=>{let{cars:e,loading:r}=(0,l.f)(),{favorites:t}=(0,p.r)(),i=(0,o.useMemo)(()=>e.filter(e=>t.includes((e._id||e.id).toString())),[e,t]);return(0,a.jsxs)("main",{className:"container page-padding",children:[(0,a.jsxs)(s(),{to:"/catalogo",className:"back-link",children:[(0,a.jsx)(n.A,{size:20})," Volver al cat\xe1logo"]}),(0,a.jsxs)("div",{className:"page-header",children:[(0,a.jsx)("h1",{children:"Tus Veh\xedculos Favoritos"}),(0,a.jsx)("p",{children:"Autos que has guardado para revisar m\xe1s tarde."})]}),r?(0,a.jsxs)("div",{className:"loading-state",children:[(0,a.jsx)("div",{className:"animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"}),(0,a.jsx)("p",{className:"mt-4 text-white text-center",children:"Cargando..."})]}):i.length>0?(0,a.jsx)("div",{className:"cars-grid",children:i.map(e=>(0,a.jsx)(c.A,{car:e},e._id||e.id))}):(0,a.jsxs)("div",{className:"empty-favorites",children:[(0,a.jsx)(d,{size:64,className:"empty-icon"}),(0,a.jsx)("h2",{children:"A\xfan no tienes favoritos"}),(0,a.jsx)("p",{children:"Explora nuestro cat\xe1logo y guarda los veh\xedculos que m\xe1s te interesen haciendo clic en el coraz\xf3n."}),(0,a.jsx)(s(),{to:"/catalogo",className:"btn btn-primary mt-6",children:"Explorar Cat\xe1logo"})]}),(0,a.jsx)("style",{children:`
                .page-padding {
                    padding-top: 2rem;
                    padding-bottom: 5rem;
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

                .page-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .page-header h1 {
                    font-size: clamp(2rem, 4vw, 3rem);
                    margin-bottom: 0.5rem;
                    color: white;
                }

                .page-header p {
                    color: var(--color-text-muted);
                    font-size: 1.1rem;
                }

                .cars-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }

                @media (min-width: 640px) {
                    .cars-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (min-width: 1024px) {
                    .cars-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                .empty-favorites {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px border rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    text-align: center;
                    margin-top: 2rem;
                }

                .empty-icon {
                    color: var(--color-text-muted);
                    margin-bottom: 1.5rem;
                    opacity: 0.5;
                }

                .empty-favorites h2 {
                    font-size: 1.5rem;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .empty-favorites p {
                    color: var(--color-text-muted);
                    max-width: 400px;
                }
                
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s;
                    cursor: pointer;
                    border: none;
                }

                .btn-primary {
                    background-color: var(--color-primary);
                    color: white;
                }

                .btn-primary:hover {
                    background-color: #c91f21;
                    transform: translateY(-2px);
                }
            `})]})};function u(){return(0,a.jsx)(m,{})}},2427:(e,r,t)=>{"use strict";t.d(r,{A:()=>l});var a=t(5512),o=t(453),i=t(5907),s=t(8531),n=t.n(s),d=t(9019),c=t(5330);let l=({car:e})=>{let{isFavorite:r,toggleFavorite:t}=(0,c.r)(),s=e._id||e.id,l=r(s);return(0,a.jsxs)(n(),{to:`/auto/${e._id||e.id}`,className:"car-card group",children:[(0,a.jsxs)("div",{className:"card-image-wrapper",children:[(0,a.jsx)("img",{src:(0,d.Q)(e.coverImage||e.images&&e.images[0]||e.image,600),alt:e.name,className:"card-image",style:{objectPosition:e.imagePosition||"50% 75%"}}),(0,a.jsx)("button",{className:"favorite-btn",onClick:e=>{e.preventDefault(),e.stopPropagation(),t(s)},"aria-label":l?"Quitar de favoritos":"Agregar a favoritos",children:(0,a.jsx)(o.A,{size:20,fill:l?"var(--color-primary)":"rgba(0,0,0,0.5)",color:l?"var(--color-primary)":"white"})})]}),(0,a.jsxs)("div",{className:"card-content",children:[(0,a.jsx)("h3",{className:"card-title text-xl font-bold text-white mb-0.5",children:e.name}),(0,a.jsxs)("div",{className:"card-subtitle text-white/80 text-xs mb-2 font-medium uppercase tracking-wide",children:[e.brand," | ",e.year]}),(0,a.jsx)("div",{className:"card-status text-white font-bold text-xs mb-3 uppercase tracking-wider",children:"Nuevo"===e.condition||0===e.km?"NUEVO • 0 KM":`USADO • ${e.km.toLocaleString()} KM`}),(0,a.jsx)("div",{className:"card-footer mt-auto",children:(0,a.jsxs)("span",{className:"view-more flex items-center gap-2 text-white text-xs font-medium transition-all group-hover:text-[var(--color-primary)]",children:["Ver m\xe1s ",(0,a.jsx)(i.A,{size:14,className:"transition-transform group-hover:translate-x-1"})]})})]}),(0,a.jsx)("style",{children:`
                .car-card {
                    background-color: transparent;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    border: none;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
                    isolation: isolate; /* keeps ::before inside the rounding */
                }

                /* Shine effect */
                .car-card::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.15) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    transform: skewX(-25deg);
                    transition: left 0.6s ease-in-out;
                    z-index: 10;
                    pointer-events: none;
                }
                
                .car-card:hover::before {
                    left: 200%;
                }
                
                .car-card:hover {
                    box-shadow: 0 15px 35px rgba(235, 38, 40, 0.25);
                    transform: translateY(-6px);
                }

                .card-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background-color: #0a0a0a;
                    overflow: hidden;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }

                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    /* object-position handled inline */
                    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                .car-card:hover .card-image {
                    transform: scale(1.08); /* Smooth deep zoom on hover */
                }

                .favorite-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 20;
                    transition: all 0.2s ease;
                }

                .favorite-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .card-content {
                    padding: 1.25rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    /* Vertical Gradient: Darker near image (top) -> Redder at bottom */
                    background: linear-gradient(to bottom, #1a0505 0%, #991b1b 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1); 
                    border-top: none;
                }
                
                .card-status {
                    color: white;
                    background: rgba(0,0,0,0.2);
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    align-self: start;
                }
                
                .text-primary {
                    color: white !important; /* Override primary text on red background */
                }
            `})]})}},5755:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>a});let a=(0,t(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\app\\\\favoritos\\\\page.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\favoritos\\page.jsx","default")},7717:(e,r,t)=>{"use strict";t.d(r,{f:()=>i});var a=t(8009),o=t(3835);let i=()=>{let[e,r]=(0,a.useState)([]),[t,i]=(0,a.useState)(!0),[s,n]=(0,a.useState)(null),{logout:d}=(0,o.A)(),c=async()=>{try{i(!0),process.env.NEXT_PUBLIC_API_URL;let e=await fetch(`/api/cars?t=${Date.now()}`);if(!e.ok)throw Error("Failed to fetch cars");let t=await e.json();r(t)}catch(e){console.error("Error fetching cars:",e),n(e.message)}finally{i(!1)}};return(0,a.useEffect)(()=>{c()},[]),{cars:e,loading:t,error:s,refresh:c,deleteCar:async e=>{if(confirm("Are you sure?"))try{process.env.NEXT_PUBLIC_API_URL;let t=`/api/cars/${e}`,a=await fetch(t,{method:"DELETE",headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!a.ok){if(401===a.status||403===a.status){alert("Session expired"),d();return}throw Error("Failed to delete")}r(r=>r.filter(r=>r._id!==e))}catch(e){console.error("Error deleting car:",e),alert("Error deleting car")}},setCars:r}}},9019:(e,r,t)=>{"use strict";t.d(r,{Q:()=>a});let a=(e,r=600)=>{if(!e)return"";if(!e.includes("cloudinary.com"))return e;let t=e.split("/upload/");return 2===t.length?`${t[0]}/upload/f_auto,q_auto,w_${r},c_limit/${t[1]}`:e}}};var r=require("../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),a=r.X(0,[238,640],()=>t(6306));module.exports=a})();
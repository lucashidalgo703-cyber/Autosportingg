(()=>{var e={};e.id=411,e.ids=[411],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},9144:(e,r,t)=>{"use strict";t.r(r),t.d(r,{GlobalError:()=>s.a,__next_app__:()=>p,pages:()=>d,routeModule:()=>u,tree:()=>c});var a=t(260),o=t(8203),i=t(5155),s=t.n(i),n=t(7292),l={};for(let e in n)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>n[e]);t.d(r,l);let c=["",{children:["catalogo",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,9593)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\catalogo\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(t.bind(t,1206)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\layout.jsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,9937,23)),"next/dist/client/components/not-found-error"],forbidden:[()=>Promise.resolve().then(t.t.bind(t,9116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(t.t.bind(t,1485,23)),"next/dist/client/components/unauthorized-error"]}],d=["C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\catalogo\\page.jsx"],p={require:t,loadChunk:()=>Promise.resolve()},u=new a.AppPageRouteModule({definition:{kind:o.RouteKind.APP_PAGE,page:"/catalogo/page",pathname:"/catalogo",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},4379:(e,r,t)=>{Promise.resolve().then(t.bind(t,9593))},3608:(e,r,t)=>{Promise.resolve().then(t.bind(t,5639))},5907:(e,r,t)=>{"use strict";t.d(r,{A:()=>a});let a=(0,t(1680).A)("arrow-right",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]])},5639:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>d});var a=t(5512),o=t(8009);let i=(0,t(1680).A)("search",[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]),s=({filters:e,onFilterChange:r,brands:t=[],years:o=[]})=>{let s=e=>{let{name:t,value:a}=e.target;r(t,a)};return(0,a.jsxs)("div",{className:"filters-container",children:[(0,a.jsxs)("div",{className:"search-group",children:[(0,a.jsx)(i,{className:"search-icon",size:20}),(0,a.jsx)("input",{type:"text",name:"search",placeholder:"Buscar por nombre, modelo...",className:"search-input",value:e.search,onChange:s})]}),(0,a.jsxs)("div",{className:"select-group",children:[(0,a.jsxs)("select",{className:"filter-select",name:"brand",value:e.brand,onChange:s,children:[(0,a.jsx)("option",{value:"",children:"Todas las Marcas"}),t.map(e=>(0,a.jsx)("option",{value:e,children:e},e))]}),(0,a.jsxs)("select",{className:"filter-select",name:"condition",value:e.condition,onChange:s,children:[(0,a.jsx)("option",{value:"",children:"Cualquier Condici\xf3n"}),(0,a.jsx)("option",{value:"Nuevo",children:"Nuevo"}),(0,a.jsx)("option",{value:"Usado",children:"Usado"})]}),(0,a.jsxs)("select",{className:"filter-select",name:"year",value:e.year,onChange:s,children:[(0,a.jsx)("option",{value:"",children:"Cualquier A\xf1o"}),o.map(e=>(0,a.jsx)("option",{value:e,children:e},e))]}),(0,a.jsx)("button",{className:"btn-filter",onClick:()=>r("reset"),children:"Limpiar"})]}),(0,a.jsx)("style",{children:`
        .filters-container {
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 3rem;
          /* Glassmorphism */
          background: rgba(20, 20, 20, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .search-group {
          flex: 2;
          min-width: 300px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }

        .search-input {
          width: 100%;
          height: 48px;
          background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent inputs */
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding-left: 40px;
          padding-right: 16px;
          color: white;
          font-family: inherit;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          background-color: rgba(0, 0, 0, 0.6);
        }

        .select-group {
          flex: 3;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-select {
          flex: 1;
          height: 48px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 0 16px;
          color: white;
          font-family: inherit;
          min-width: 140px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-select:focus {
             outline: none;
             border-color: var(--color-primary);
             background-color: rgba(0, 0, 0, 0.6);
        }

        .btn-filter {
          background-color: var(--color-primary);
          color: white;
          border: none;
          padding: 0 2rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          height: 48px;
          box-shadow: 0 4px 15px rgba(235, 38, 40, 0.3);
          transition: transform 0.2s, background-color 0.2s;
        }
        
        .btn-filter:hover {
            background-color: var(--color-primary-dark);
        }

        @media (max-width: 768px) {
          .filters-container {
            flex-direction: column;
          }
          .select-group {
            flex-direction: column;
          }
        }
      `})]})};var n=t(2427),l=t(7717);let c=()=>{let{cars:e,loading:r}=(0,l.f)(),[t,i]=(0,o.useState)({search:"",brand:"",year:"",condition:""}),c=(e,r)=>{"reset"===e?i({search:"",brand:"",year:"",condition:""}):i(t=>({...t,[e]:r}))},d=(0,o.useMemo)(()=>[...new Set(e.map(e=>{let r=e.brand.trim();return r.charAt(0).toUpperCase()+r.slice(1).toLowerCase()}))].sort(),[e]),p=(0,o.useMemo)(()=>[...new Set(e.map(e=>e.year))].sort((e,r)=>r-e),[e]),u=(0,o.useMemo)(()=>e.filter(e=>{let r=e.name.toLowerCase().includes(t.search.toLowerCase())||e.brand.toLowerCase().includes(t.search.toLowerCase()),a=e.brand.trim().charAt(0).toUpperCase()+e.brand.trim().slice(1).toLowerCase(),o=""===t.brand||a===t.brand,i=""===t.year||e.year.toString()===t.year,s=!0;return"Nuevo"===t.condition?s="Nuevo"===e.condition||"0km"===e.condition:""!==t.condition&&(s=e.condition===t.condition),r&&o&&i&&s}),[t,e]);return(0,a.jsxs)("main",{className:"container page-padding",children:[(0,a.jsxs)("div",{className:"page-header",children:[(0,a.jsx)("h1",{children:"Cat\xe1logo de Veh\xedculos"}),(0,a.jsx)("p",{children:"Explor\xe1 nuestra selecci\xf3n premium"})]}),(0,a.jsx)(s,{filters:t,onFilterChange:c,brands:d,years:p}),(0,a.jsx)("div",{className:"cars-grid",children:u.length>0?u.map(e=>(0,a.jsx)(n.A,{car:e},e.id)):(0,a.jsxs)("div",{className:"no-results",children:[(0,a.jsx)("p",{children:"No se encontraron veh\xedculos con esos criterios."}),(0,a.jsx)("button",{className:"btn-text",onClick:()=>c("reset"),children:"Limpiar filtros"})]})}),(0,a.jsx)("style",{children:`
                .page-padding {
                    padding-top: 4rem;
                    padding-bottom: 4rem;
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .page-header h1 {
                    font-size: 3rem;
                    margin-bottom: 0.5rem;
                }

                .page-header p {
                    color: var(--color-text-muted);
                    font-size: 1.2rem;
                }
                
                .cars-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 3rem; /* Larger gap like reference */
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

                .no-results {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem;
                    color: var(--color-text-muted);
                }

                .btn-text {
                    background: none;
                    border: none;
                    color: var(--color-primary);
                    text-decoration: underline;
                    cursor: pointer;
                    margin-top: 1rem;
                    font-size: 1rem;
                }
            `})]})};function d(){return(0,a.jsx)(c,{})}},2427:(e,r,t)=>{"use strict";t.d(r,{A:()=>d});var a=t(5512),o=t(453),i=t(5907),s=t(8531),n=t.n(s),l=t(9019),c=t(5330);let d=({car:e})=>{let{isFavorite:r,toggleFavorite:t}=(0,c.r)(),s=e._id||e.id,d=r(s);return(0,a.jsxs)(n(),{to:`/auto/${e._id||e.id}`,className:"car-card group",children:[(0,a.jsxs)("div",{className:"card-image-wrapper",children:[(0,a.jsx)("img",{src:(0,l.Q)(e.coverImage||e.images&&e.images[0]||e.image,600),alt:e.name,className:"card-image",style:{objectPosition:e.imagePosition||"50% 75%"}}),(0,a.jsx)("button",{className:"favorite-btn",onClick:e=>{e.preventDefault(),e.stopPropagation(),t(s)},"aria-label":d?"Quitar de favoritos":"Agregar a favoritos",children:(0,a.jsx)(o.A,{size:20,fill:d?"var(--color-primary)":"rgba(0,0,0,0.5)",color:d?"var(--color-primary)":"white"})})]}),(0,a.jsxs)("div",{className:"card-content",children:[(0,a.jsx)("h3",{className:"card-title text-xl font-bold text-white mb-0.5",children:e.name}),(0,a.jsxs)("div",{className:"card-subtitle text-white/80 text-xs mb-2 font-medium uppercase tracking-wide",children:[e.brand," | ",e.year]}),(0,a.jsx)("div",{className:"card-status text-white font-bold text-xs mb-3 uppercase tracking-wider",children:"Nuevo"===e.condition||0===e.km?"NUEVO • 0 KM":`USADO • ${e.km.toLocaleString()} KM`}),(0,a.jsx)("div",{className:"card-footer mt-auto",children:(0,a.jsxs)("span",{className:"view-more flex items-center gap-2 text-white text-xs font-medium transition-all group-hover:text-[var(--color-primary)]",children:["Ver m\xe1s ",(0,a.jsx)(i.A,{size:14,className:"transition-transform group-hover:translate-x-1"})]})})]}),(0,a.jsx)("style",{children:`
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
            `})]})}},9593:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>a});let a=(0,t(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\app\\\\catalogo\\\\page.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\catalogo\\page.jsx","default")},7717:(e,r,t)=>{"use strict";t.d(r,{f:()=>i});var a=t(8009),o=t(3835);let i=()=>{let[e,r]=(0,a.useState)([]),[t,i]=(0,a.useState)(!0),[s,n]=(0,a.useState)(null),{logout:l}=(0,o.A)(),c=async()=>{try{i(!0),process.env.NEXT_PUBLIC_API_URL;let e=await fetch(`/api/cars?t=${Date.now()}`);if(!e.ok)throw Error("Failed to fetch cars");let t=await e.json();r(t)}catch(e){console.error("Error fetching cars:",e),n(e.message)}finally{i(!1)}};return(0,a.useEffect)(()=>{c()},[]),{cars:e,loading:t,error:s,refresh:c,deleteCar:async e=>{if(confirm("Are you sure?"))try{process.env.NEXT_PUBLIC_API_URL;let t=`/api/cars/${e}`,a=await fetch(t,{method:"DELETE",headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!a.ok){if(401===a.status||403===a.status){alert("Session expired"),l();return}throw Error("Failed to delete")}r(r=>r.filter(r=>r._id!==e))}catch(e){console.error("Error deleting car:",e),alert("Error deleting car")}},setCars:r}}},9019:(e,r,t)=>{"use strict";t.d(r,{Q:()=>a});let a=(e,r=600)=>{if(!e)return"";if(!e.includes("cloudinary.com"))return e;let t=e.split("/upload/");return 2===t.length?`${t[0]}/upload/f_auto,q_auto,w_${r},c_limit/${t[1]}`:e}}};var r=require("../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),a=r.X(0,[238,640],()=>t(9144));module.exports=a})();
(()=>{var e={};e.id=520,e.ids=[520],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},2958:(e,r,t)=>{"use strict";t.r(r),t.d(r,{GlobalError:()=>a.a,__next_app__:()=>c,pages:()=>p,routeModule:()=>g,tree:()=>l});var o=t(260),n=t(8203),i=t(5155),a=t.n(i),s=t(7292),d={};for(let e in s)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>s[e]);t.d(r,d);let l=["",{children:["login",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,7697)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\login\\page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(t.bind(t,1206)),"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\layout.jsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,9937,23)),"next/dist/client/components/not-found-error"],forbidden:[()=>Promise.resolve().then(t.t.bind(t,9116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(t.t.bind(t,1485,23)),"next/dist/client/components/unauthorized-error"]}],p=["C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\login\\page.jsx"],c={require:t,loadChunk:()=>Promise.resolve()},g=new o.AppPageRouteModule({definition:{kind:n.RouteKind.APP_PAGE,page:"/login/page",pathname:"/login",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},2757:(e,r,t)=>{Promise.resolve().then(t.bind(t,7697))},6325:(e,r,t)=>{Promise.resolve().then(t.bind(t,337))},337:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>l});var o=t(5512),n=t(8009),i=t(9334),a=t(3835);let s=(0,t(1680).A)("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]),d=()=>{let[e,r]=(0,n.useState)(""),[t,d]=(0,n.useState)(""),[l,p]=(0,n.useState)(!1),{login:c}=(0,a.A)(),g=(0,i.useRouter)(),u=async r=>{r.preventDefault(),d(""),p(!0);try{process.env.NEXT_PUBLIC_API_URL;let r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:e})}),t=await r.json();r.ok?(c(t.token),g.push("/admin")):d(t.message||"Contrase\xf1a incorrecta")}catch(e){d("Error de conexi\xf3n con el servidor")}finally{p(!1)}};return(0,o.jsxs)("div",{className:"login-container",children:[(0,o.jsxs)("div",{className:"login-box",children:[(0,o.jsx)("div",{className:"icon-wrapper",children:(0,o.jsx)(s,{size:32,color:"var(--color-primary)"})}),(0,o.jsx)("h1",{children:"Acceso Admin"}),(0,o.jsx)("p",{children:"Ingresa la contrase\xf1a maestra para gestionar el sitio."}),(0,o.jsxs)("form",{onSubmit:u,children:[(0,o.jsx)("div",{className:"input-group",children:(0,o.jsx)("input",{type:"password",value:e,onChange:e=>r(e.target.value),placeholder:"Contrase\xf1a...",required:!0})}),t&&(0,o.jsx)("div",{className:"error-msg",children:t}),(0,o.jsx)("button",{type:"submit",disabled:l,className:"btn-login",children:l?"Verificando...":"Ingresar"})]})]}),(0,o.jsx)("style",{children:`
        .login-container {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .login-box {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .icon-wrapper {
          background: rgba(235, 38, 40, 0.1);
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          border: 1px solid rgba(235, 38, 40, 0.2);
        }

        h1 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          color: white;
        }

        p {
          color: var(--color-text-muted);
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        input {
          width: 100%;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--color-primary);
          background: rgba(0, 0, 0, 0.6);
        }

        .btn-login {
          width: 100%;
          padding: 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-login:hover {
          background: var(--color-primary-dark);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-msg {
          background: rgba(235, 38, 40, 0.1);
          color: #ff4d4d;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          border: 1px solid rgba(235, 38, 40, 0.2);
        }
      `})]})};function l(){return(0,o.jsx)(d,{})}},7697:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>o});let o=(0,t(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\app\\\\login\\\\page.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\app\\login\\page.jsx","default")}};var r=require("../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),o=r.X(0,[238,640],()=>t(2958));module.exports=o})();
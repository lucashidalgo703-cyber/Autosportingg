exports.id=640,exports.ids=[640],exports.modules={9408:(e,t,o)=>{Promise.resolve().then(o.bind(o,8633)),Promise.resolve().then(o.bind(o,2470)),Promise.resolve().then(o.bind(o,5797)),Promise.resolve().then(o.bind(o,4001))},2960:(e,t,o)=>{Promise.resolve().then(o.bind(o,249)),Promise.resolve().then(o.bind(o,4314)),Promise.resolve().then(o.bind(o,6729)),Promise.resolve().then(o.bind(o,4533))},3887:(e,t,o)=>{Promise.resolve().then(o.t.bind(o,3219,23)),Promise.resolve().then(o.t.bind(o,4863,23)),Promise.resolve().then(o.t.bind(o,5155,23)),Promise.resolve().then(o.t.bind(o,802,23)),Promise.resolve().then(o.t.bind(o,9350,23)),Promise.resolve().then(o.t.bind(o,8530,23)),Promise.resolve().then(o.t.bind(o,8921,23))},3719:(e,t,o)=>{Promise.resolve().then(o.t.bind(o,6959,23)),Promise.resolve().then(o.t.bind(o,3875,23)),Promise.resolve().then(o.t.bind(o,1284,23)),Promise.resolve().then(o.t.bind(o,7174,23)),Promise.resolve().then(o.t.bind(o,4178,23)),Promise.resolve().then(o.t.bind(o,7190,23)),Promise.resolve().then(o.t.bind(o,1365,23))},4314:(e,t,o)=>{"use strict";o.d(t,{default:()=>i});var r=o(5512),a=o(3835),n=o(5330);function i({children:e}){return(0,r.jsx)(n.H,{children:(0,r.jsx)(a.O,{children:e})})}},6729:(e,t,o)=>{"use strict";o.d(t,{default:()=>g});var r=o(5512),a=o(8009),n=o(8531),i=o.n(n),s=o(9334),l=o(453),c=o(722),d=o(4269),p=o(6438),m=o(3835),h=o(5330);let g=()=>{let[e,t]=(0,a.useState)(!1),{isAuthenticated:o,logout:n}=(0,m.A)(),{favorites:g}=(0,h.r)(),x=(0,s.usePathname)();return(0,r.jsxs)("header",{className:"navbar",children:[(0,r.jsxs)("div",{className:"container navbar-content",children:[(0,r.jsx)(i(),{to:"/",className:"logo",children:(0,r.jsx)("img",{src:"/logo-header-final-user.png",alt:"AutoSporting",className:"navbar-logo-img"})}),(0,r.jsxs)("nav",{className:"desktop-nav",children:[(0,r.jsx)(i(),{to:"/",className:`nav-link ${"/"===x?"active":""}`,children:"Inicio"}),(0,r.jsx)(i(),{to:"/catalogo",className:`nav-link ${"/catalogo"===x?"active":""}`,children:"Cat\xe1logo"}),(0,r.jsx)(i(),{to:"/financiacion",className:`nav-link ${"/financiacion"===x?"active":""}`,children:"Financiaci\xf3n"}),(0,r.jsx)(i(),{to:"/nosotros",className:`nav-link ${"/nosotros"===x?"active":""}`,children:"Nosotros"}),(0,r.jsx)(i(),{to:"/contacto",className:`nav-link ${"/contacto"===x?"active":""}`,children:"Contacto"}),(0,r.jsxs)(i(),{to:"/favoritos",className:`nav-link flex items-center gap-1 ${"/favoritos"===x?"active":""}`,style:{position:"relative"},children:[(0,r.jsx)(l.A,{size:20,fill:"/favoritos"===x?"var(--color-primary)":"none",color:"/favoritos"===x?"var(--color-primary)":"currentColor"}),g.length>0&&(0,r.jsx)("span",{className:"favorites-badge",children:g.length})]}),o&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(i(),{to:"/admin",className:`nav-link ${"/admin"===x?"text-primary":""}`,children:"Admin"}),(0,r.jsx)("button",{onClick:n,className:"nav-link btn-logout",children:(0,r.jsx)(c.A,{size:18})})]})]}),(0,r.jsx)("button",{className:"mobile-toggle",onClick:()=>t(!e),children:e?(0,r.jsx)(d.A,{color:"white"}):(0,r.jsx)(p.A,{color:"white"})}),e&&(0,r.jsxs)("div",{className:"mobile-nav",children:[(0,r.jsx)(i(),{to:"/",onClick:()=>t(!1),children:"Inicio"}),(0,r.jsx)(i(),{to:"/catalogo",onClick:()=>t(!1),children:"Cat\xe1logo"}),(0,r.jsx)(i(),{to:"/financiacion",onClick:()=>t(!1),children:"Financiaci\xf3n"}),(0,r.jsx)(i(),{to:"/nosotros",onClick:()=>t(!1),children:"Nosotros"}),(0,r.jsx)(i(),{to:"/contacto",onClick:()=>t(!1),children:"Contacto"}),(0,r.jsxs)(i(),{to:"/favoritos",onClick:()=>t(!1),style:{display:"flex",alignItems:"center",gap:"0.5rem",justifyContent:"space-between"},children:[(0,r.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[(0,r.jsx)(l.A,{size:20})," Favoritos"]}),g.length>0&&(0,r.jsx)("span",{className:"favorites-badge-mobile",children:g.length})]}),o&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(i(),{to:"/admin",onClick:()=>t(!1),style:{color:"#EB2628"},children:"Admin"}),(0,r.jsx)("button",{onClick:()=>{n(),t(!1)},className:"mobile-logout",children:"Cerrar Sesi\xf3n"})]})]})]}),(0,r.jsx)("style",{children:`
        .navbar {
          background-color: rgba(5, 5, 5, 0.6); /* More transparent */
          backdrop-filter: blur(16px); /* Stronger blur */
          position: sticky;
          top: 0;
          z-index: 1000;
          height: var(--header-height);
          display: flex;
          align-items: center;
          /* Shadow for depth */
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        
        /* Gradient Border Bottom */
        .navbar::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
        }

        .navbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo {
          text-decoration: none;
          display: flex;
          align-items: center;
        }

        .navbar-logo-img {
          height: 40px; 
          width: auto;
          object-fit: contain;
          margin-left: 3px; /* Precise adjustment requested */
        }
        
        @media (min-width: 768px) {
            .navbar-logo-img { height: 60px; }
        }

        .desktop-nav {
          display: flex;
          gap: 2rem;
        }

        .nav-link {
          color: var(--color-text-muted);
          font-weight: 500;
          transition: color 0.2s;
          font-size: 0.95rem;
        }

        .nav-link:hover, .nav-link.active {
          color: var(--color-primary);
        }

        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
        }

        .mobile-nav {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: var(--color-bg);
          border-bottom: 1px solid var(--color-surface);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mobile-nav a {
          color: white;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--color-surface);
        }
        
        .btn-logout {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0;
        }
        
        .btn-logout:hover {
            color: #EB2628;
        }

        .mobile-logout {
            background: rgba(235, 38, 40, 0.1);
            color: #EB2628;
            border: 1px solid rgba(235, 38, 40, 0.3);
            padding: 0.8rem;
            border-radius: 6px;
            margin-top: 1rem;
            cursor: pointer;
            width: 100%;
            text-align: center;
            font-weight: 600;
        }

        .favorites-badge {
            position: absolute;
            top: -8px;
            right: -12px;
            background-color: var(--color-primary);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid var(--color-bg);
        }

        .favorites-badge-mobile {
            background-color: var(--color-primary);
            color: white;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 12px;
        }

        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-toggle { display: block; }
        }
      `})]})}},4533:(e,t,o)=>{"use strict";o.d(t,{default:()=>n});var r=o(5512),a=o(8009);let n=()=>{let[e,t]=(0,a.useState)(!0);return(0,a.useEffect)(()=>{let e=setTimeout(()=>{t(!1)},2800);return()=>clearTimeout(e)},[]),(0,r.jsx)("div",{className:`preloader-overlay ${e?"":"fade-out"}`,children:(0,r.jsxs)("div",{className:"preloader-content",children:[(0,r.jsx)("div",{className:"preloader-particles-flare"}),(0,r.jsxs)("div",{className:"preloader-logo-container",children:[(0,r.jsx)("img",{src:"/logo-header-final-user.png",alt:"Autosporting",className:"preloader-logo"}),(0,r.jsx)("div",{className:"light-sweep red-sweep"})]}),(0,r.jsx)("div",{className:"preloader-slogan",children:"Eleg\xed con seguridad, conduc\xed con confianza."})]})})}},3835:(e,t,o)=>{"use strict";o.d(t,{A:()=>s,O:()=>i});var r=o(5512),a=o(8009);let n=(0,a.createContext)(null),i=({children:e})=>{let[t,o]=(0,a.useState)(!1),[i,s]=(0,a.useState)(!0);return(0,a.useEffect)(()=>{localStorage.getItem("token")&&o(!0),s(!1)},[]),(0,r.jsx)(n.Provider,{value:{isAuthenticated:t,login:e=>{localStorage.setItem("token",e),o(!0)},logout:()=>{localStorage.removeItem("token"),o(!1)},loading:i},children:!i&&e})},s=()=>{let e=(0,a.useContext)(n);if(!e)throw Error("useAuth must be used within an AuthProvider");return e}},5330:(e,t,o)=>{"use strict";o.d(t,{H:()=>i,r:()=>s});var r=o(5512),a=o(8009);let n=(0,a.createContext)(),i=({children:e})=>{let[t,o]=(0,a.useState)(()=>{try{let e=localStorage.getItem("autosporting_favorites");return e?JSON.parse(e):[]}catch(e){return console.error("Error loading favorites:",e),[]}});return(0,a.useEffect)(()=>{try{localStorage.setItem("autosporting_favorites",JSON.stringify(t))}catch(e){console.error("Error saving favorites:",e)}},[t]),(0,r.jsx)(n.Provider,{value:{favorites:t,toggleFavorite:e=>{if(!e)return;let t=e.toString();o(e=>e.includes(t)?e.filter(e=>e!==t):[...e,t])},isFavorite:e=>!!e&&t.includes(e.toString())},children:e})},s=()=>(0,a.useContext)(n)},1206:(e,t,o)=>{"use strict";o.r(t),o.d(t,{default:()=>g,metadata:()=>h});var r=o(2740);o(2396);var a=o(2470),n=o(5797),i=o(8029),s=o(8357),l=o(7285);let c=()=>(0,r.jsxs)("footer",{className:"footer",children:[(0,r.jsxs)("div",{className:"container",children:[(0,r.jsxs)("div",{className:"footer-grid",children:[(0,r.jsxs)("div",{className:"footer-col",children:[(0,r.jsx)("h3",{children:"AUTOSPORTING"}),(0,r.jsx)("p",{children:"Eleg\xed con seguridad. Conduc\xed con confianza."})]}),(0,r.jsxs)("div",{className:"footer-col",children:[(0,r.jsx)("h4",{children:"Navegaci\xf3n"}),(0,r.jsx)("a",{href:"/",children:"Inicio"}),(0,r.jsx)("a",{href:"/catalogo",children:"Cat\xe1logo"}),(0,r.jsx)("a",{href:"/nosotros",children:"Nosotros"}),(0,r.jsx)("a",{href:"/contacto",children:"Contacto"})]}),(0,r.jsxs)("div",{className:"footer-col",children:[(0,r.jsx)("h4",{children:"Contacto"}),(0,r.jsxs)("div",{className:"contact-item",children:[(0,r.jsx)(i.A,{size:18,color:"var(--color-primary)"}),(0,r.jsx)("span",{children:"Av. Roca 116, Comodoro Rivadavia"})]}),(0,r.jsxs)("div",{className:"contact-item",children:[(0,r.jsx)(s.A,{size:18,color:"var(--color-primary)"}),(0,r.jsx)("span",{children:"297-4045378"})]}),(0,r.jsx)("div",{className:"social-links-footer",style:{marginTop:"1rem",display:"flex",gap:"1rem"},children:(0,r.jsxs)("a",{href:"https://instagram.com/autosporting.cr",target:"_blank",rel:"noreferrer",style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[(0,r.jsx)(l.A,{size:20,color:"var(--color-primary)"}),(0,r.jsx)("span",{children:"@autosporting.cr"})]})})]})]}),(0,r.jsx)("div",{className:"footer-bottom",children:(0,r.jsxs)("p",{children:["\xa9 ",new Date().getFullYear()," AutoSporting. Todos los derechos reservados."]})})]}),(0,r.jsx)("style",{children:`
        .footer {
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
          backdrop-filter: blur(5px);
          padding: 4rem 0 2rem;
          margin-top: auto;
          position: relative;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        
        /* "Shine" separator with Red Accent */
        .footer::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            /* Transparent -> Subtle Red -> Transparent */
            background: linear-gradient(90deg, transparent, rgba(235, 38, 40, 0.5), transparent);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          margin-bottom: 3rem;
        }

        .footer-col h3 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .footer-col h4 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .footer-col p, .footer-col a, .contact-item span {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
          display: block;
        }

        .footer-col a:hover {
          color: var(--color-primary);
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid #333;
        }

        .footer-bottom p {
          color: #555;
          font-size: 0.9rem;
        }
      `})]}),d=()=>(0,r.jsxs)("div",{className:"whatsapp-container",children:[(0,r.jsx)("a",{href:"https://wa.me/5492974045378",target:"_blank",rel:"noopener noreferrer",className:"whatsapp-float","aria-label":"Contactarnos por WhatsApp",children:(0,r.jsx)("div",{className:"whatsapp-icon-wrapper",children:(0,r.jsx)("svg",{width:"32",height:"32",viewBox:"0 0 24 24",fill:"currentColor",xmlns:"http://www.w3.org/2000/svg",children:(0,r.jsx)("path",{d:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"})})})}),(0,r.jsx)("style",{children:`
                .whatsapp-container {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .whatsapp-float {
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    color: #FFF;
                    border-radius: 50px;
                    box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-decoration: none;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                }

                .whatsapp-float::before {
                    content: '';
                    position: absolute;
                    inset: -5px;
                    border-radius: 50%;
                    border: 2px solid #25D366;
                    opacity: 0;
                    animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
                }

                @keyframes pulse-ring {
                    0% {
                        transform: scale(0.95);
                        opacity: 0.8;
                    }
                    70% {
                        transform: scale(1.3);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(0.95);
                        opacity: 0;
                    }
                }

                .whatsapp-float:hover {
                    transform: scale(1.1) translateY(-5px);
                    box-shadow: 0 10px 25px rgba(37, 211, 102, 0.6);
                    background: linear-gradient(135deg, #128C7E 0%, #075E54 100%);
                }

                .whatsapp-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s ease;
                }

                .whatsapp-float:hover .whatsapp-icon-wrapper {
                    transform: rotate(-10deg) scale(1.1);
                }

                @media (max-width: 768px) {
                    .whatsapp-container {
                        bottom: 20px;
                        right: 20px;
                    }
                    .whatsapp-float {
                        width: 50px;
                        height: 50px;
                    }
                    .whatsapp-float svg {
                        width: 26px;
                        height: 26px;
                    }
                }
            `})]});var p=o(4001),m=o(8633);let h={title:"AutoSporting",description:"Eleg\xed con seguridad. Conduc\xed con confianza. Concesionaria Multimarca en Comodoro Rivadavia."};function g({children:e}){return(0,r.jsxs)("html",{lang:"es",children:[(0,r.jsxs)("head",{children:[(0,r.jsx)("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),(0,r.jsx)("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),(0,r.jsx)("link",{href:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",rel:"stylesheet"})]}),(0,r.jsx)("body",{children:(0,r.jsx)(a.default,{children:(0,r.jsxs)("div",{className:"app",children:[(0,r.jsx)(p.default,{}),(0,r.jsx)(n.default,{}),(0,r.jsx)(d,{}),e,(0,r.jsx)(c,{}),(0,r.jsx)(m.Analytics,{})]})})})]})}},2470:(e,t,o)=>{"use strict";o.d(t,{default:()=>r});let r=(0,o(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\components\\\\ClientProviders.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\components\\ClientProviders.jsx","default")},5797:(e,t,o)=>{"use strict";o.d(t,{default:()=>r});let r=(0,o(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\components\\\\Navbar.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\components\\Navbar.jsx","default")},4001:(e,t,o)=>{"use strict";o.d(t,{default:()=>r});let r=(0,o(6760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\tomas\\\\.gemini\\\\antigravity\\\\scratch\\\\Autosportingg-main\\\\src\\\\components\\\\Preloader.jsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\tomas\\.gemini\\antigravity\\scratch\\Autosportingg-main\\src\\components\\Preloader.jsx","default")},2396:()=>{}};
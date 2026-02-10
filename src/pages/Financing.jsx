import { Banknote, Calculator, FileCheck, ArrowRight, Wallet } from 'lucide-react';

const Financing = () => {
    return (
        <main className="financing-page">
            {/* Header Section */}
            <section className="financing-header">
                <div className="header-overlay"></div>
                <div className="container header-content">
                    <span className="badge">FINANCIACIÓN</span>
                    <h1 className="header-title">
                        Financiá tu próximo <br />
                        vehículo con nosotros
                    </h1>
                    <p className="header-subtitle">
                        Planes a medida, aprobación inmediata y las mejores tasas del mercado.
                        Subite a tu auto nuevo hoy mismo.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="container financing-body">

                {/* Intro / Highlight Card */}
                <div className="highlight-card">
                    <div className="highlight-text">
                        <h2>¿Cómo funciona?</h2>
                        <p>
                            En AutoSporting simplificamos el proceso para que obtener tu auto sea rápido y transparente.
                            Ofrecemos financiación propia y bancaria para unidades seleccionadas.
                        </p>
                    </div>
                    <div className="highlight-stats">
                        <div className="stat">
                            <span className="stat-number">50%</span>
                            <span className="stat-label">Entrega mínima</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">24/48</span>
                            <span className="stat-label">Cuotas fijas</span>
                        </div>
                    </div>
                </div>

                {/* Steps Grid */}
                <div className="steps-grid">
                    <div className="step-card">
                        <div className="icon-box">
                            <Calculator size={32} color="white" />
                        </div>
                        <h3>1. Elegí tu vehículo</h3>
                        <p>Explorá nuestro catálogo y seleccioná la unidad que mejor se adapte a tus necesidades.</p>
                    </div>
                    <div className="step-card">
                        <div className="icon-box">
                            <FileCheck size={32} color="white" />
                        </div>
                        <h3>2. Pre-aprobación</h3>
                        <p>Presenta tu DNI y comprobante de ingresos. Evaluamos tu perfil crediticio en el acto.</p>
                    </div>
                    <div className="step-card">
                        <div className="icon-box">
                            <Wallet size={32} color="white" />
                        </div>
                        <h3>3. Entrega y Cuotas</h3>
                        <p>Aboná el anticipo y financia el saldo en cuotas fijas en pesos. ¡Te llevás el auto!</p>
                    </div>
                </div>

                {/* Requirements Section */}
                <div className="requirements-section">
                    <div className="req-content">
                        <div className="icon-box-large">
                            <Banknote size={40} color="var(--color-primary)" />
                        </div>
                        <div className="req-text">
                            <h3>Requisitos Mínimos</h3>
                            <ul className="req-list">
                                <li><ArrowRight size={16} color="var(--color-primary)" /> DNI vigente</li>
                                <li><ArrowRight size={16} color="var(--color-primary)" /> Servicio a nombre del solicitante</li>
                                <li><ArrowRight size={16} color="var(--color-primary)" /> Comprobante de ingresos (Recibo de sueldo / Monotributo)</li>
                                <li><ArrowRight size={16} color="var(--color-primary)" /> No estar en Veraz (sujeto a evaluación)</li>
                            </ul>
                        </div>
                    </div>
                    <div className="req-cta">
                        <a href="https://wa.me/5492974938642" target="_blank" rel="noopener noreferrer" className="btn-whatsapp-financing">
                            Consultar por WhatsApp
                        </a>
                    </div>
                </div>

            </section>

            <style>{`
        .financing-page {
            padding-bottom: 5rem;
            position: relative;
        }

        /* Background Overlay */
        .financing-page::before {
            content: '';
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 0;
            pointer-events: none;
        }

        /* Header */
        .financing-header {
            position: relative;
            height: 450px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            margin-top: calc(var(--header-height) * -1);
            z-index: 10;
            background: radial-gradient(circle at 50% 30%, rgba(200, 0, 0, 0.15) 0%, transparent 70%);
        }

        .header-content {
            position: relative;
            z-index: 10;
            padding-top: var(--header-height);
        }

        .badge {
            display: inline-block;
            background-color: rgba(255, 0, 0, 0.15);
            color: #ff4444;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 0.825rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(255, 0, 0, 0.3);
            letter-spacing: 0.05em;
        }

        .header-title {
            font-size: 3.5rem; 
            font-weight: 800;
            line-height: 1.1;
            color: #ffffff;
            margin-bottom: 1.5rem;
            letter-spacing: -0.02em;
        }

        .header-subtitle {
            font-size: 1.25rem;
            color: #d4d4d4;
            max-width: 600px;
            line-height: 1.6;
        }

        /* Body & Cards */
        .financing-body {
            position: relative;
            z-index: 20;
            margin-top: -3rem;
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }

        /* Highlight Card */
        .highlight-card {
            background: rgba(20, 20, 20, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 3rem;
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 4rem;
            align-items: center;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .highlight-text h2 {
            font-size: 2rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }

        .highlight-text p {
            color: #a3a3a3;
            font-size: 1.1rem;
            line-height: 1.7;
        }

        .highlight-stats {
            display: flex;
            gap: 3rem;
            border-left: 1px solid rgba(255,255,255,0.1);
            padding-left: 3rem;
        }

        .stat-number {
            display: block;
            font-size: 3.5rem;
            font-weight: 800;
            color: var(--color-primary);
            line-height: 1;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: white;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 500;
        }

        /* Steps Grid */
        .steps-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .step-card {
            background: rgba(15, 15, 15, 0.6);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 18px;
            padding: 2.5rem;
            transition: transform 0.3s ease;
        }

        .step-card:hover {
            transform: translateY(-5px);
            background: rgba(20, 20, 20, 0.8);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .step-card .icon-box {
            background: var(--color-surface);
            width: 60px;
            height: 60px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .step-card h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }

        .step-card p {
            color: #a3a3a3;
            line-height: 1.6;
        }

        /* Requirements Section */
        .requirements-section {
            background: linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%);
            border: 1px solid #333;
            border-radius: 20px;
            padding: 3rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 4rem;
        }

        .req-content {
            display: flex;
            gap: 2rem;
            align-items: flex-start;
        }

        .icon-box-large {
            background: rgba(255, 0, 0, 0.1);
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .req-text h3 {
            font-size: 1.75rem;
            margin-bottom: 1.5rem;
            font-weight: 700;
        }

        .req-list {
            list-style: none;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .req-list li {
            display: flex;
            align-items: center;
            gap: 1rem;
            color: #d4d4d4;
            font-size: 1.1rem;
        }

        .btn-whatsapp-financing {
            display: inline-block;
            background: #25D366;
            color: black;
            font-weight: 700;
            padding: 1rem 2rem;
            border-radius: 12px;
            text-decoration: none;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 5px 20px rgba(37, 211, 102, 0.2);
        }

        .btn-whatsapp-financing:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.3);
            background: #22c55e;
        }

        /* Responsive */
        @media (max-width: 900px) {
            .header-title { font-size: 2.5rem; }
            .highlight-card { grid-template-columns: 1fr; gap: 2rem; padding: 2rem; }
            .highlight-stats { border-left: none; border-top: 1px solid rgba(255,255,255,0.1); padding-left: 0; padding-top: 2rem; width: 100%; justify-content: space-around; }
            .stat-number { font-size: 2.5rem; }
            .requirements-section { flex-direction: column; align-items: stretch; gap: 2rem; }
            .req-content { flex-direction: column; }
            .btn-whatsapp-financing { width: 100%; text-align: center; }
        }
      `}</style>
        </main>
    );
};

export default Financing;

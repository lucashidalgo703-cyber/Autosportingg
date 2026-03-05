const WhatsAppButton = () => {
  return (
    <div className="whatsapp-container">
      <a
        href="https://wa.me/5492974938642"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        aria-label="Contactarnos por WhatsApp"
      >
        <div className="whatsapp-icon-wrapper">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
          </svg>
        </div>
      </a>
      <style>{`
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
            `}</style>
    </div>
  );
};

export default WhatsAppButton;

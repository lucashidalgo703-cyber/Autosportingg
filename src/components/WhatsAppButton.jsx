import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
    return (
        <>
            <a
                href="https://wa.me/5492974938642"
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-float"
                aria-label="Contactarnos por WhatsApp"
            >
                <MessageCircle size={32} color="white" />
            </a>
            <style>{`
        .whatsapp-float {
          position: fixed;
          width: 60px;
          height: 60px;
          bottom: 30px;
          right: 30px;
          background-color: #25d366;
          color: #FFF;
          border-radius: 50px;
          box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .whatsapp-float:hover {
          transform: scale(1.1);
          background-color: #20b858;
          box-shadow: 2px 2px 20px rgba(37, 211, 102, 0.5);
        }
        
        @media (max-width: 768px) {
          .whatsapp-float {
            width: 50px;
            height: 50px;
            bottom: 20px;
            right: 20px;
          }
          .whatsapp-float svg {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
        </>
    );
};

export default WhatsAppButton;

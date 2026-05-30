import React from 'react';
import { MessageCircle, Phone, Mail, User, Instagram, Facebook, Globe, FileText, HelpCircle } from 'lucide-react';

export default function CommunicationChannelBadge({ channel, className = '' }) {
    const getChannelData = (c) => {
        switch (c) {
            case 'whatsapp': return { icon: MessageCircle, text: 'WhatsApp', color: 'bg-green-500/20 text-green-400' };
            case 'phone': return { icon: Phone, text: 'Llamada', color: 'bg-blue-500/20 text-blue-400' };
            case 'email': return { icon: Mail, text: 'Email', color: 'bg-yellow-500/20 text-yellow-400' };
            case 'in_person': return { icon: User, text: 'Presencial', color: 'bg-purple-500/20 text-purple-400' };
            case 'instagram': return { icon: Instagram, text: 'Instagram', color: 'bg-pink-500/20 text-pink-400' };
            case 'facebook': return { icon: Facebook, text: 'Facebook', color: 'bg-blue-600/20 text-blue-500' };
            case 'web': return { icon: Globe, text: 'Web', color: 'bg-teal-500/20 text-teal-400' };
            case 'internal_note': return { icon: FileText, text: 'Nota Interna', color: 'bg-gray-500/20 text-gray-400' };
            case 'other': default: return { icon: HelpCircle, text: 'Otro', color: 'bg-gray-600/20 text-gray-500' };
        }
    };

    const data = getChannelData(channel);
    const Icon = data.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${data.color} ${className}`}>
            <Icon size={12} />
            {data.text}
        </span>
    );
}

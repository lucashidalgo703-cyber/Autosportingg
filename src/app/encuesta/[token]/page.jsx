"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NpsSurveyPage() {
    const params = useParams();
    const token = params?.token;

    const [status, setStatus] = useState('loading'); // loading, valid, submitted, error
    const [errorMsg, setErrorMsg] = useState('');
    const [score, setScore] = useState(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('Enlace de encuesta inválido.');
            return;
        }

        const validateToken = async () => {
            try {
                const res = await fetch(`/api/public/nps/${token}`);
                const data = await res.json();
                
                if (!res.ok) {
                    setStatus('error');
                    setErrorMsg(data.message || 'La encuesta no está disponible.');
                    return;
                }

                if (data.valid) {
                    setStatus('valid');
                }
            } catch (error) {
                setStatus('error');
                setErrorMsg('Error de conexión. Inténtalo de nuevo más tarde.');
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (score === null) return toast.error('Por favor, selecciona una puntuación.');

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/public/nps/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, comment })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Error al enviar respuesta');
            }

            setStatus('submitted');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 tracking-tight">Enlace Inválido</h2>
                    <p className="text-gray-500 font-medium">{errorMsg}</p>
                </div>
            </div>
        );
    }

    if (status === 'submitted') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 tracking-tight">¡Gracias por tu respuesta!</h2>
                    <p className="text-gray-500 font-medium">Valoramos mucho tu opinión para seguir mejorando nuestro servicio.</p>
                </div>
            </div>
        );
    }

    // Status 'valid'
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
                    <h1 className="text-2xl font-black text-white tracking-tight">AutoSporting</h1>
                    <p className="text-red-100 mt-2 font-medium">Encuesta de Satisfacción</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    <div className="mb-8 text-center">
                        <h2 className="text-xl font-bold mb-6">¿Qué tan probable es que recomiendes AutoSporting a un amigo o colega?</h2>
                        
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setScore(num)}
                                    className={`w-11 h-11 md:w-12 md:h-12 rounded-full font-bold text-sm md:text-base transition-all duration-200 ${
                                        score === num 
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-110' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">
                            <span>0 - Nada probable</span>
                            <span>10 - Muy probable</span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            ¿Cuál es la razón principal de tu puntuación? (Opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Cuéntanos más sobre tu experiencia..."
                            className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={score === null || isSubmitting}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-wider"
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}
                    </button>
                </form>
            </div>
        </div>
    );
}

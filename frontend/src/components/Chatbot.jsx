// src/components/Chatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { enviarMensajeChatbot } from '../services/chatService';

import ReactMarkdown from 'react-markdown';

export const Chatbot = ({ contextoActual }) => {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      remitente: 'ia',
      texto: '¡Hola! Soy tu asistente de ingeniería. Puedo resolver dudas sobre IEEE Std 80 (Mallas de Tierra), IEC 60071-2 (Coordinación de Aislamiento) o analizar tus resultados actuales.',
    },
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll al final del chat cuando llega un nuevo mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!inputTexto.trim() || cargando) return;

    const preguntaUsuario = inputTexto;
    setInputTexto('');

    // Agregar mensaje del usuario a la lista
    setMensajes((prev) => [...prev, { remitente: 'usuario', texto: preguntaUsuario }]);
    setCargando(true);

    try {
      // Llamar al servicio backend enviando el contexto actual si está disponible
      const respuestaIA = await enviarMensajeChatbot(preguntaUsuario, contextoActual);
      setMensajes((prev) => [...prev, { remitente: 'ia', texto: respuestaIA }]);
    } catch (error) {
      setMensajes((prev) => [
        ...prev,
        {
          remitente: 'ia',
          texto: '⚠️ Ocurrió un error al conectar con el asistente de IA. Revisa si el servidor backend está encendido y la API Key de Gemini configurada.',
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Botón Flotante para abrir/cerrar */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105"
          title="Abrir Asistente IA"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-semibold text-sm hidden md:inline">Asistente IA</span>
        </button>
      )}

      {/* Ventana del Chatbot */}
      {abierto && (
        <div className="bg-white dark:bg-gray-800 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
          
          {/* Encabezado del Chat */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-bold text-sm">Asistente de Ingeniería</h3>
                <p className="text-xs text-blue-100">IEEE 80 / IEC 60071-2</p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Banner de Contexto Detectado (Si hay cálculos realizados) */}
          {contextoActual && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
              <span>⚡ Datos de cálculo vinculados</span>
              <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded text-[10px] font-bold">Activo</span>
            </div>
          )}

          {/* Cuerpo del Chat (Lista de Mensajes) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-900">
            {mensajes.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.remitente === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm shadow-sm ${
                msg.remitente === 'usuario'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-[#050b03] text-[#e8f5c0] border border-[#2a3d10] rounded-bl-none prose prose-invert max-w-none'
                }`}>
                {msg.remitente === 'usuario' ? (
                    msg.texto
                ) : (
                    <ReactMarkdown
                    components={{
                        strong: ({ node, ...props }) => <span className="font-bold text-[#a3e635]" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-1 space-y-1" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0 leading-relaxed" {...props} />
                    }}
                    >
                    {msg.texto}
                    </ReactMarkdown>
                )}
                </div>
              </div>
            ))}

            {/* Animación de Carga/Escribiendo */}
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 rounded-bl-none flex items-center space-x-1.5 shadow-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Pie de Página e Input */}
          <form onSubmit={handleEnviar} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              type="text"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              placeholder="Haz una pregunta técnica..."
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={cargando || !inputTexto.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
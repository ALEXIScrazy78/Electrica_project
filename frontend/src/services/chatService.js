const API_BASE_URL = 'http://127.0.0.1:8000/api';

/**
 * Envia una consulta técnica al chatbot de la API con contexto opcional.
 * @param {string} pregunta - La pregunta o mensaje del usuario.
 * @param {Object|null} contextoCalculo - El JSON de resultados de Malla (IEEE 80) o Aislamiento (IEC 60071-2).
 * @returns {Promise<string>} La respuesta generada por Gemini.
 */
export const enviarMensajeChatbot = async (pregunta, contextoCalculo = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pregunta: pregunta,
        contexto_calculo: contextoCalculo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error al comunicarse con el chatbot');
    }

    const data = await response.json();
    return data.respuesta;
  } catch (error) {
    console.error('Error en chatService:', error);
    throw error;
  }
};
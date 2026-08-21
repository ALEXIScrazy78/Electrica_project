import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Cargar automáticamente las variables definidas en el archivo .env
load_dotenv()

class SolicitudChat(BaseModel):
    pregunta: str = Field(..., description="Pregunta del usuario sobre el diseño o las normas IEEE/IEC")
    contexto_calculo: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="JSON de salida devuelto por el cálculo actual de la malla o aislamiento"
    )

class RespuestaChat(BaseModel):
    respuesta: str
    status: str = "success"

def obtener_cliente_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("No se encontró GEMINI_API_KEY en el archivo .env")
    return genai.Client(api_key=api_key)

SYSTEM_INSTRUCTION = """
Eres un Ingeniero Electricista Senior en la plataforma web.
Tus áreas: IEEE Std 80 (Mallas de Tierra) e IEC 60071-2 (Coordinación de Aislamiento).

REGLAS DE FORMATO Y ESTILO (ESTRICTAS):
1. **Sé conciso y directo al grano**: Máximo 3 o 4 párrafos/secciones cortas. Evita introducciones como "Estimado usuario" o "Con gusto le explicaré".
2. **Estructura scannable**: Usa siempre negritas (**texto**) para destacar valores clave y listas breves con viñetas (*) para dar los diagnósticos.
3. **Analiza los datos (si hay contexto)**:
   - Indica en 1 línea si el terreno cumple uniformidad (Δ% < 30%).
   - Indica en 1 línea si Rg es aceptable y su valor exacto en Ohmios.
   - Proporciona máximo 2-3 recomendaciones concretas (ej. ajustar varillas, modificar profundidad).
4. **Tono**: Profesional, técnico, directo y conciso. Evita la redundancia matemática si el resultado ya es evidente.
"""
def responder_consulta_asistente(solicitud: SolicitudChat) -> str:
    client = obtener_cliente_gemini()
    
    prompt = ""
    if solicitud.contexto_calculo:
        prompt += f"=== DATOS Y RESULTADOS DEL CÁLCULO ACTUAL ===\n"
        prompt += f"{solicitud.contexto_calculo}\n"
        prompt += f"============================================\n\n"
    
    prompt += f"Pregunta del usuario: {solicitud.pregunta}"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.3, # Respuestas técnicas, formales y objetivas
        )
    )
    
    return response.text
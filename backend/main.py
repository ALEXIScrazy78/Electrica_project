from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import math

# Inicializar la aplicación de FastAPI
app = FastAPI(
    title="API de Puesta a Tierra - Método de Schwarz",
    description="Backend en Python para el cálculo de resistencia de malla con varillas.",
    version="1.0.0"
)

# -----------------------------------------------------------------------------
# CONFIGURACIÓN DE CORS (Control de Acceso de Origen Cruzado)
# -----------------------------------------------------------------------------
# Esto permite que tu aplicación de React (que corre en http://localhost:5173)
# pueda hacer peticiones a este servidor de Python sin bloqueos de seguridad.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En desarrollo permite todo. En producción pon la URL de tu web.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# MODELO DE DATOS (Validación con Pydantic)
# -----------------------------------------------------------------------------
class DatosMalla(BaseModel):
    rho: float = Field(..., description="Resistividad del suelo [Ω·m]", gt=0)
    seccion: float = Field(..., description="Sección del conductor [mm²]", gt=0)
    Lx: float = Field(..., description="Longitud de la malla [m]", gt=0)
    Ly: float = Field(..., description="Ancho de la malla [m]", gt=0)
    h: float = Field(..., description="Profundidad de enterramiento [m]", gt=0)
    rlim: float = Field(..., description="Límite admisible de resistencia [Ω]", gt=0)
    nr: int = Field(..., description="Número de varillas", gt=0)
    Lr: float = Field(..., description="Longitud de cada varilla [m]", gt=0)

# -----------------------------------------------------------------------------
# ENDPOINT DE CÁLCULO
# -----------------------------------------------------------------------------
@app.post("/api/calcular")
def calcular_schwarz(datos: DatosMalla):
    try:
        PI = math.pi

        # ── Parámetros geométricos derivados ──────────────────────────────
        Lc = 9 * datos.Ly + 6 * datos.Lx
        dc = math.sqrt(datos.seccion * 1e-6 * 4 / PI)
        A  = datos.Lx * datos.Ly
        K1 = -0.05 * (datos.Lx / datos.Ly) + 1.2
        K2 =  0.10 * (datos.Lx / datos.Ly) + 4.68
        dr = 2.54 / 2 / 100  # Varilla de 1" de diámetro convertida a metros

        # Evitar divisiones por cero o logaritmos de números negativos por datos inconsistentes
        if dc * datos.h <= 0 or A <= 0:
            raise ValueError("Las dimensiones geométricas resultan en valores inconsistentes.")

        # ── Resistencia de la malla sola (R1) ──────────────────
        R1 = (datos.rho / (PI * Lc)) * (
            math.log(2 * Lc / math.sqrt(dc * datos.h))
            + K1 * (Lc / math.sqrt(A))
            - K2
        )

        # ── Resistencia de las varillas solas (R2) ─────────────
        R2 = (datos.rho / (2 * PI * datos.nr * datos.Lr)) * (
            math.log(8 * datos.Lr / dr)
            - 1
            + (2 * K1 * datos.Lr / math.sqrt(A)) * (math.sqrt(datos.nr) - 1) ** 2
        )

        # ── Resistencia mutua malla-varillas (Rm) ──────────────
        Rm = (datos.rho / (PI * Lc)) * (
            math.log(2 * Lc / datos.Lr)
            + K1 * (Lc / math.sqrt(A))
            - K2
            + 1
        )

        # Evitar errores en la ecuación combinada si el denominador se aproxima a cero
        denominador = R1 + R2 - 2 * Rm
        if abs(denominador) < 1e-7:
            raise ValueError("Error de indeterminación matemática en el sistema combinatorio.")

        # ── Resistencia total combinada (R) ────────────────────
        R = (R1 * R2 - Rm ** 2) / denominador

        return {
            "status": "success",
            "Lc": Lc,
            "dc": dc,
            "A": A,
            "K1": K1,
            "K2": K2,
            "dr": dr,
            "R1": R1,
            "R2": R2,
            "Rm": Rm,
            "R": R,
            "cumple": R <= datos.rlim
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno procesando los cálculos.")

# -----------------------------------------------------------------------------
# EJECUCIÓN DEL SERVIDOR
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    # Corre el servidor local en el puerto 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
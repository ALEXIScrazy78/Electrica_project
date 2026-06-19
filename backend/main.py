from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import math

app = FastAPI(
    title="API de Puesta a Tierra - IEEE-80 (Wenner + Sverak)",
    description="Backend para cálculo de resistividad de diseño y resistencia de malla según IEEE-80.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# MODELOS DE ENTRADA (Validación con Pydantic)
# -----------------------------------------------------------------------------
class MedicionWenner(BaseModel):
    a: float = Field(..., description="Espaciado entre electrodos [m]", gt=0)
    R: float = Field(..., description="Resistencia medida de campo [Ω]", gt=0)

class DatosDiseno(BaseModel):
    mediciones: List[MedicionWenner] = Field(..., description="Lista de mediciones de campo")
    Lx: float = Field(..., description="Largo del terreno [m]", gt=0)
    Ly: float = Field(..., description="Ancho del terreno [m]", gt=0)
    D: float = Field(..., description="Separación entre conductores de la malla [m]", gt=0)
    h: float = Field(..., description="Profundidad de enterramiento [m]", gt=0)
    nr: int = Field(..., description="Número de varillas", ge=0)
    Lr: float = Field(..., description="Longitud de cada varilla [m]", ge=0)
    rlim: float = Field(5.0, description="Límite admisible de resistencia [Ω]", gt=0)

# -----------------------------------------------------------------------------
# ENDPOINT DE CÁLCULO MIGRADO
# -----------------------------------------------------------------------------
@app.post("/api/calcular")
def calcular_puesta_a_tierra(datos: DatosDiseno):
    if len(datos.mediciones) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 mediciones válidas para el análisis de Wenner.")

    try:
        # ── PASO 1: Procesar Resistividad Aparente (Wenner) ──
        detalle_wenner = []
        suma_rhos = 0.0
        
        for med in datos.mediciones:
            rho_a = 2 * math.pi * med.a * med.R
            suma_rhos += rho_a
            detalle_wenner.append({"a": med.a, "R": med.R, "rho_a": rho_a})

        valores_rho = [m["rho_a"] for m in detalle_wenner]
        rho_promedio = suma_rhos / len(valores_rho)
        rho_max = max(valores_rho)
        rho_min = min(valores_rho)
        delta_pct = ((rho_max - rho_min) / rho_promedio) * 100
        uniforme = delta_pct < 30.0

        # ── PASO 2: Geometría de la Malla (Sverak) ──
        N1 = (datos.Ly / datos.D) + 1
        L1 = N1 * datos.Lx

        N2 = (datos.Lx / datos.D) + 1
        L2 = N2 * datos.Ly

        Lc = L1 + L2
        Lr_tot = datos.nr * datos.Lr
        LT = Lc + Lr_tot
        A = datos.Lx * datos.Ly

        # ── PASO 3: Cálculos de Resistencia (Sverak) ──
        term1 = 1 / LT
        raiz_20A = math.sqrt(20 * A)
        term2_base = 1 / raiz_20A
        raiz_20_A = math.sqrt(20 / A)
        h_factor = datos.h * raiz_20_A
        term2_paren = 1 + 1 / (1 + h_factor)
        term2 = term2_base * term2_paren

        # Resistencia final de la red
        Rg = rho_promedio * (term1 + term2)

        return {
            "status": "success",
            "wenner": {
                "detalle": detalle_wenner,
                "rho_promedio": rho_promedio,
                "rho_max": rho_max,
                "rho_min": rho_min,
                "delta_pct": delta_pct,
                "uniforme": uniforme
            },
            "sverak": {
                "N1": N1, "L1": L1,
                "N2": N2, "L2": L2,
                "Lc": Lc,
                "Lr_tot": Lr_tot,
                "LT": LT,
                "A": A,
                "term1": term1,
                "term2": term2,
                "Rg": Rg
            },
            "cumple": Rg <= datos.rlim
        }

    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Error matemático: Verifique que la separación D o las dimensiones no generen divisiones por cero.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
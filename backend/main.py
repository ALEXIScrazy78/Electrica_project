from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import math

# --- IMPORTACIÓN DEL NUEVO MÓDULO DEL CHATBOT ---
from chatbot import SolicitudChat, RespuestaChat, responder_consulta_asistente

app = FastAPI(
    title="API de Ingeniería Eléctrica - Mallas, Coordinación & Asistente IA",
    description="Backend unificado para cálculo de puesta a tierra (IEEE-80), coordinación de aislamiento (IEC 60071-2) y chatbot técnico con Gemini.",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# MODELOS DE ENTRADA: SECCIÓN PUESTA A TIERRA (IEEE-80) - NO MODIFICADO
# =============================================================================
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


# =============================================================================
# MODELOS DE ENTRADA: SECCIÓN COORDINACIÓN DE AISLAMIENTO (IEC 60071-2)
# =============================================================================
class DatosAislamiento(BaseModel):
    Us: float = Field(..., description="Tensión nominal del sistema fase-fase [kV]", gt=0)
    H: float = Field(..., description="Altitud de instalación [msnm]", ge=0)
    X1: float = Field(..., description="Impedancia secuencia positiva X1 [Ω]")
    R1: float = Field(..., description="Impedancia secuencia positiva R1 [Ω]")
    X0: float = Field(..., description="Impedancia secuencia cero X0 [Ω]")
    R0: float = Field(..., description="Impedancia secuencia cero R0 [Ω]")
    Kf: float = Field(..., description="Factor de falla a tierra (ej. 1.3)", ge=1.0)
    Kd: float = Field(..., description="Factor de rechazo de carga (ej. 1.15)", ge=1.0)
    Ue2max: float = Field(..., description="Máximo de Ue2 (extremo remoto) [p.u.]", gt=0)
    Ue2min: float = Field(..., description="Mínimo de Ue2 [p.u.]", gt=0)
    ratioUp: float = Field(..., description="Relación Up2/Ue2 extremo remoto (ej. 1.6)", ge=1.0)
    Upl: float = Field(..., description="Nivel de protección a impulso tipo rayo [kV]", gt=0)
    Ups: float = Field(..., description="Nivel de protección a impulso tipo maniobra [kV]", gt=0)
    Atab: float = Field(..., description="Factor A de tabla E.2 (ej. 900)", gt=0)
    nlin: int = Field(..., description="Número de líneas conectadas a la SE", gt=0)
    Lsp: float = Field(..., description="Longitud del vano [m]", gt=0)
    a1: float = Field(..., description="Distancia parcial a1 [m]", ge=0)
    a2: float = Field(..., description="Distancia parcial a2 [m]", ge=0)
    a3: float = Field(..., description="Distancia parcial a3 [m]", ge=0)
    a4e: float = Field(..., description="a4 aislamiento externo [m]", ge=0)
    a4i: float = Field(..., description="a4 aislamiento interno [m]", ge=0)
    Ra: float = Field(..., description="Tasa de fallas admisible equipos [fallas/año]", gt=0)
    Rkm: float = Field(..., description="Tasa de fallas de la línea [fallas/km·año]", gt=0)
    mtov: float = Field(..., description="Parámetro m para sobretensiones temporales", ge=0)
    msl_ft: float = Field(..., description="Parámetro m para frente lento f-t", ge=0)
    msl_ff: float = Field(..., description="Parámetro m para frente lento f-f", ge=0)
    mfast: float = Field(..., description="Parámetro m para frente rápido", ge=0)


# -----------------------------------------------------------------------------
# ENDPOINT EXISTENTE: PUESTA A TIERRA (IEEE-80) - NO MODIFICADO
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


# -----------------------------------------------------------------------------
# NUEVO ENDPOINT: COORDINACIÓN DE AISLAMIENTO (IEC 60071-2)
# -----------------------------------------------------------------------------
@app.post("/api/calcular-aislamiento")
def calcular_coordinacion_aislamiento(d: DatosAislamiento):
    try:
        SQ2 = math.sqrt(2)
        SQ3 = math.sqrt(3)

        # ── PARÁMETROS BÁSICOS ──
        Um = d.Us * 1.05
        Ub = (SQ2 / SQ3) * Um
        Us_ft = d.Us / SQ3
        X0X1 = d.X0 / d.X1 if d.X1 != 0 else 0.0
        R0X1 = d.R0 / d.X1 if d.X1 != 0 else 0.0

        # ── ETAPA 1A: SOBRETENSIONES TEMPORALES ──
        Urp_ft_falla = d.Kf * Um / SQ3
        Urp_ft_rechazo = d.Kd * Um / SQ3
        Urp_ff_rechazo = d.Kd * Um
        Urp_ft = max(Urp_ft_falla, Urp_ft_rechazo)
        Urp_ff = Urp_ff_rechazo

        # ── ETAPA 1B: FRENTE LENTO ──
        Ue2_prom = (d.Ue2max + d.Ue2min) / 2
        Up2_max = d.Ue2max * d.ratioUp
        Uet = (1.25 * d.Ue2max - 0.25) * (SQ2 / SQ3) * d.Us
        Upt = (1.25 * Up2_max - 0.43) * (SQ2 / SQ3) * d.Us

        ratio_Ups_Ue2 = d.Ups / (d.Ue2max * Ub) if (d.Ue2max * Ub) != 0 else 0.0
        ratio_2Ups_Up2 = (2 * d.Ups) / (Up2_max * Ub) if (Up2_max * Ub) != 0 else 0.0

        # ── ETAPA 1C: FRENTE RÁPIDO ──
        La = 1000 * (d.Ra / d.Rkm) if d.Rkm != 0 else 0.0
        L_ext = d.a1 + d.a2 + d.a3 + d.a4e
        L_int = d.a1 + d.a2 + d.a3 + d.a4i
        
        divisor_fast = d.Lsp + La
        Ucw_rapido_ext = d.Upl + (d.Atab / d.nlin) * (L_ext / divisor_fast) if divisor_fast != 0 else d.Upl
        Ucw_rapido_int = d.Upl + (d.Atab / d.nlin) * (L_int / divisor_fast) if divisor_fast != 0 else d.Upl

        # ── ETAPA 2: Ucw ──
        Ucw_temp_ft = Urp_ft
        Ucw_temp_ff = Urp_ff
        Ucw_lento_ft = Uet
        Ucw_lento_ff = Upt

        # ── ETAPA 3: FACTORES Ka ──
        Ka_tov = math.exp(d.mtov * d.H / 8150)
        Ka_slow_ft = math.exp(d.msl_ft * d.H / 8150)
        Ka_slow_ff = math.exp(d.msl_ff * d.H / 8150)
        Ka_fast = math.exp(d.mfast * d.H / 8150)

        # ── ETAPA 4: Urw ──
        Ks_ext, Ks_int = 1.05, 1.15
        Urw_tov_ext_ft = Ks_ext * Ka_tov * Ucw_temp_ft
        Urw_tov_int_ft = Ks_int * Ucw_temp_ft
        Urw_tov_ext_ff = Ks_ext * Ka_tov * Ucw_temp_ff
        Urw_tov_int_ff = Ks_int * Ucw_temp_ff

        Urw_slow_ext_ft = Ks_ext * Ka_slow_ft * Ucw_lento_ft
        Urw_slow_int_ft = Ks_int * Ucw_lento_ft
        Urw_slow_ext_ff = Ks_ext * Ka_slow_ff * Ucw_lento_ff
        Urw_slow_int_ff = Ks_int * Ucw_lento_ff

        Urw_fast_ext = Ks_ext * Ka_fast * Ucw_rapido_ext
        Urw_fast_int = Ks_int * Ucw_rapido_int

        # ── ETAPA 5: CONVERSIÓN A NORMALIZADAS ──
        SDWV_ext_ft = Urw_slow_ext_ft * 0.6
        SDWV_ext_ff = Urw_slow_ext_ff * 0.6
        SDWV_int_ft = Urw_slow_int_ft * 0.5
        SDWV_int_ff = Urw_slow_int_ff * 0.5

        BIL_ext_ft = Urw_fast_ext * (1.05 + Urw_fast_ext / 6000)
        BIL_ext_ff = Urw_fast_ext * (1.05 + Urw_fast_ext / 9000)
        # Basados fielmente en tus celdas D160 de Excel:
        BIL_int_ft = 1.1 * Ucw_rapido_int
        BIL_int_ff = 1.1 * Ucw_rapido_int

        return {
            "status": "success",
            "derivados": {
                "Um": Um, "Ub": Ub, "Us_ft": Us_ft, "X0X1": X0X1, "R0X1": R0X1
            },
            "etapa1a": {
                "Urp_ft_falla": Urp_ft_falla, "Urp_ft_rechazo": Urp_ft_rechazo,
                "Urp_ff_rechazo": Urp_ff_rechazo, "Urp_ft": Urp_ft, "Urp_ff": Urp_ff
            },
            "etapa1b": {
                "Ue2_prom": Ue2_prom, "Up2_max": Up2_max, "ratio_Ups_Ue2": ratio_Ups_Ue2,
                "ratio_2Ups_Up2": ratio_2Ups_Up2, "Uet": Uet, "Upt": Upt
            },
            "etapa1c": {
                "La": La, "L_ext": L_ext, "L_int": L_int,
                "Ucw_rapido_ext": Ucw_rapido_ext, "Ucw_rapido_int": Ucw_rapido_int
            },
            "etapa3": {
                "Ka_tov": Ka_tov, "Ka_slow_ft": Ka_slow_ft, "Ka_slow_ff": Ka_slow_ff, "Ka_fast": Ka_fast
            },
            "etapa4": {
                "Urw_tov_ext_ft": Urw_tov_ext_ft, "Urw_tov_int_ft": Urw_tov_int_ft,
                "Urw_tov_ext_ff": Urw_tov_ext_ff, "Urw_tov_int_ff": Urw_tov_int_ff,
                "Urw_slow_ext_ft": Urw_slow_ext_ft, "Urw_slow_int_ft": Urw_slow_int_ft,
                "Urw_slow_ext_ff": Urw_slow_ext_ff, "Urw_slow_int_ff": Urw_slow_int_ff,
                "Urw_fast_ext": Urw_fast_ext, "Urw_fast_int": Urw_fast_int
            },
            "etapa5": {
                "SDWV_ext_ft": SDWV_ext_ft, "SDWV_ext_ff": SDWV_ext_ff,
                "SDWV_int_ft": SDWV_int_ft, "SDWV_int_ff": SDWV_int_ff,
                "BIL_ext_ft": BIL_ext_ft, "BIL_ext_ff": BIL_ext_ff,
                "BIL_int_ft": BIL_int_ft, "BIL_int_ff": BIL_int_ff
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en motor de aislamiento: {str(e)}")


import traceback

@app.post("/api/chatbot", response_model=RespuestaChat)
def endpoint_chatbot(solicitud: SolicitudChat):
    try:
        respuesta_texto = responder_consulta_asistente(solicitud)
        return RespuestaChat(respuesta=respuesta_texto, status="success")
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno del chatbot: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
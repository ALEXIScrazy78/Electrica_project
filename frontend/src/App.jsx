import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';

// ============================================================================
// COMPONENTE 3D: Escena con Etiquetas
// ============================================================================
function EscenaMalla({ Lx, Ly, h, nr, Lr }) {
  const maxDim = Math.max(Lx, Ly, Lr, 1);
  const escala = 15 / maxDim; 

  const w = Lx * escala;
  const l = Ly * escala;
  const profMalla = -h * escala;
  const largoVarilla = Lr * escala;

  const posicionesVarillas = useMemo(() => {
    const pos = [];
    if (nr <= 0) return pos;
    const perimetro = 2 * (w + l);
    const espaciado = perimetro / nr;

    for (let i = 0; i < nr; i++) {
      const d = i * espaciado;
      let x, z;
      if (d < w) { x = d - w / 2; z = l / 2; } 
      else if (d < w + l) { x = w / 2; z = l / 2 - (d - w); } 
      else if (d < 2 * w + l) { x = w / 2 - (d - w - l); z = -l / 2; } 
      else { x = -w / 2; z = -l / 2 + (d - 2 * w - l); }
      pos.push([x, profMalla - largoVarilla / 2, z]);
    }
    return pos;
  }, [w, l, profMalla, largoVarilla, nr]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[15, 15, 15]} intensity={1.5} />
      <Grid sectionColor="#2a3d10" cellColor="#13220a" cellSize={1} sectionSize={5} fadeDistance={30} />

      <group position={[0, 0, 0]}>
        <mesh position={[0, profMalla, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, l]} />
          <meshBasicMaterial color="#a3e635" wireframe wireframeLineWidth={2} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, profMalla, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, l]} />
          <meshBasicMaterial color="#a3e635" transparent opacity={0.05} side={2} />
        </mesh>

        <mesh position={[0, profMalla, l / 2]}>
          <Html distanceFactor={15} center>
            <div className="bg-[#0f1a0a]/90 border border-[#a3e635] text-[#a3e635] text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap pointer-events-none shadow-md">
              Malla: {Lx}m × {Ly}m (h: {h}m)
            </div>
          </Html>
        </mesh>

        {posicionesVarillas.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <cylinderGeometry args={[0.03, 0.03, largoVarilla, 8]} />
            <meshStandardMaterial color="#ffe033" emissive="#221800" />
            {(idx === 0 || idx === nr - 1) && (
              <Html position={[0, -largoVarilla / 4, 0]} distanceFactor={15} center>
                <div className="bg-[#1f1600]/90 border border-[#ffe033] text-[#ffe033] text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                  Varilla {idx + 1} ({Lr}m)
                </div>
              </Html>
            )}
          </mesh>
        ))}
      </group>
      <OrbitControls makeDefault minDistance={2} maxDistance={40} />
    </>
  );
}

// ============================================================================
// APLICACIÓN PRINCIPAL
// ============================================================================
export default function App() {
  // Lista dinámica de mediciones de campo (Wenner)
  const [mediciones, setMediciones] = useState([
    { a: 2, R: 7.56 },
    { a: 4, R: 3.98 },
    { a: 6, R: 2.81 },
    { a: 8, R: 2.21 },
    { a: 10, R: 1.85 },
    { a: 15, R: 1.29 },
    { a: 20, R: 1.01 }
  ]);

  // Parámetros de diseño geométrico preliminar
  const [params, setParams] = useState({
    Lx: 80, Ly: 50, D: 10, h: 0.6, nr: 14, Lr: 3, rlim: 5
  });

  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorApi, setErrorApi] = useState("");

  // Manejadores de cambios
  const handleParamChange = (e) => {
    const { id, value } = e.target;
    setParams(prev => ({ ...prev, [id]: value === '' ? '' : parseFloat(value) }));
  };

  const handleMedicionChange = (index, field, value) => {
    const nuevasMediciones = [...mediciones];
    nuevasMediciones[index][field] = value === '' ? '' : parseFloat(value);
    setMediciones(nuevasMediciones);
  };

  const agregarFila = () => {
    setMediciones([...mediciones, { a: 10, R: 1.0 }]);
  };

  const eliminarFila = (index) => {
    if (mediciones.length <= 2) {
      alert("Se requieren al menos 2 mediciones para realizar los cálculos.");
      return;
    }
    setMediciones(mediciones.filter((_, i) => i !== index));
  };

  const consultarBackend = async () => {
    setErrorApi("");
    setLoading(true);

    // Estructurar el cuerpo exactamente como pide la nueva API
    const payload = {
      mediciones: mediciones.filter(m => m.a > 0 && m.R > 0),
      ...params
    };

    try {
      const response = await fetch('https://electrica-project.onrender.com/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error procesando el diseño.");
      }

      const data = await response.json();
      setResultados(data);
    } catch (err) {
      setErrorApi(err.message || "No se pudo conectar con el servidor.");
      setResultados(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden font-sans bg-[#050b03] text-[#e8f5c0]">
      
      {/* PANEL DE CONTROL IZQUIERDO */}
      <div className="w-full lg:w-[480px] bg-[#0f1a0a] border-r border-[#2a3d10] p-5 overflow-y-auto flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold text-[#a3e635] tracking-wide">⚡ Ingeniería de Tierras</h2>
          <p className="text-xs text-[#7aad3a]">Análisis Avanzado IEEE-80 (Wenner + Sverak)</p>
        </div>

        {/* SECCIÓN 1: TABLA WENNER */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7aad3a] border-b border-[#2a3d10] pb-1 mb-2">
            1. Mediciones de Campo (Método Wenner)
          </div>
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[#7aad3a] border-b border-[#2a3d10]">
                <th className="py-1 w-10">N°</th>
                <th className="py-1">a [m]</th>
                <th className="py-1">R [Ω]</th>
                <th className="py-1 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {mediciones.map((med, idx) => (
                <tr key={idx} className="border-b border-[#162a0c]/50">
                  <td className="py-1 text-[#7aad3a]">{idx + 1}</td>
                  <td className="py-1">
                    <input 
                      type="number" 
                      value={med.a} 
                      step="0.1"
                      onChange={(e) => handleMedicionChange(idx, 'a', e.target.value)}
                      className="w-20 bg-[#050b03] border border-[#2a3d10] text-[#e8f5c0] px-1.5 py-0.5 rounded focus:outline-none focus:border-[#a3e635]"
                    />
                  </td>
                  <td className="py-1">
                    <input 
                      type="number" 
                      value={med.R} 
                      step="0.01"
                      onChange={(e) => handleMedicionChange(idx, 'R', e.target.value)}
                      className="w-20 bg-[#050b03] border border-[#2a3d10] text-[#e8f5c0] px-1.5 py-0.5 rounded focus:outline-none focus:border-[#a3e635]"
                    />
                  </td>
                  <td className="py-1 text-center">
                    <button 
                      onClick={() => eliminarFila(idx)}
                      className="bg-red-950/60 text-red-400 border border-red-900/50 rounded px-2 py-0.5 hover:bg-red-900/50"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            onClick={agregarFila}
            className="mt-2 text-[11px] bg-[#1e3210] text-[#a3e635] border border-[#2a3d10] px-3 py-1 rounded hover:bg-[#2a4418]"
          >
            + Agregar Medición
          </button>
        </div>

        {/* SECCIÓN 2: PARÁMETROS GEOMÉTRICOS */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7aad3a] border-b border-[#2a3d10] pb-1 mb-2">
            2. Parámetros del Diseño Preliminar
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(params).map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[11px] text-[#7aad3a] uppercase">
                  {key === 'rlim' ? 'Límite Admisible [Ω]' : key === 'D' ? 'Separación D [m]' : key}
                </label>
                <input 
                  type="number" 
                  id={key} 
                  value={params[key]} 
                  onChange={handleParamChange} 
                  className="bg-[#050b03] border border-[#2a3d10] rounded px-3 py-1.5 text-xs text-[#e8f5c0] focus:outline-none focus:border-[#a3e635]" 
                />
              </div>
            ))}
          </div>
        </div>

        {/* DISPARADOR */}
        <button
          onClick={consultarBackend}
          disabled={loading}
          className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all ${
            loading ? 'bg-[#1a2d12] text-[#527d21] cursor-not-allowed' : 'bg-[#a3e635] text-[#0f1a0a] hover:bg-[#c6f135]'
          }`}
        >
          {loading ? '⚡ Calculando con Servidor...' : 'Calcular Estructura Terrestre'}
        </button>

        {errorApi && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded p-2.5">
            ⚠️ {errorApi}
          </div>
        )}

        {/* SECCIÓN 3: COMPILADO DE RESULTADOS IEEE-80 */}
        {resultados && !loading && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* CAJA RESISTIVIDAD */}
            <div className="bg-[#050b03] border border-[#2a3d10] p-3 rounded font-mono text-xs flex flex-col gap-1.5">
              <div className="text-[#a3e635] font-sans font-semibold uppercase text-[10px]">Paso 1 — Diseño del Terreno</div>
              <div className="text-2xl font-bold text-[#e8f5c0]">{resultados.wenner.rho_promedio.toFixed(2)} <span className="text-xs text-[#7aad3a]">Ω·m</span></div>
              <div className="flex justify-between text-[#7aad3a]">Variación (Δ%): <span>{resultados.wenner.delta_pct.toFixed(2)} %</span></div>
              <div className="mt-1">
                {resultados.wenner.uniforme ? (
                  <span className="bg-[#1a3a0a] text-[#a3e635] border border-[#a3e635] text-[10px] px-2 py-0.5 rounded">✔ Suelo Uniforme (&lt;30%)</span>
                ) : (
                  <span className="bg-[#3a2a00] text-[#ffe033] border border-[#ffe033] text-[10px] px-2 py-0.5 rounded">⚠ Suelo No Uniforme (≥30%)</span>
                )}
              </div>
            </div>

            {/* CAJA GEOMETRÍA SVERAK */}
            <div className="bg-[#050b03] border border-[#2a3d10] p-3 rounded font-mono text-xs flex flex-col gap-1">
              <div className="text-[#a3e635] font-sans font-semibold uppercase text-[10px]">Paso 2 — Desglose de Conductores</div>
              <div className="flex justify-between text-[#7aad3a]">Longitud Malla (Lc): <span>{resultados.sverak.Lc.toFixed(2)} m</span></div>
              <div className="flex justify-between text-[#7aad3a]">Longitud Varillas: <span>{resultados.sverak.Lr_tot.toFixed(2)} m</span></div>
              <div className="flex justify-between text-[#7aad3a] font-bold border-t border-[#162a0c] pt-1 mt-1 text-[#e8f5c0]">LT Enterrada Total: <span>{resultados.sverak.LT.toFixed(2)} m</span></div>
            </div>

            {/* CAJA MARCO FINAL */}
            <div className="bg-[#050b03] border-2 border-[#a3e635] p-4 rounded-lg font-mono text-xs">
              <div className="text-[#a3e635] font-sans font-semibold uppercase text-[10px]">Paso 3 — Resistencia de Malla (Sverak)</div>
              <div className="text-3xl font-black text-[#e8f5c0] my-1">{resultados.sverak.Rg.toFixed(4)} <span className="text-sm font-normal text-[#7aad3a]">Ω</span></div>
              <div className="mt-2">
                {resultados.cumple ? (
                  <span className="bg-[#1a3a0a] text-[#a3e635] border border-[#a3e635] font-sans px-3 py-1 rounded text-xs font-bold">✔ SISTEMA ADMISIBLE</span>
                ) : (
                  <span className="bg-red-950/60 text-red-400 border border-red-900 font-sans px-3 py-1 rounded text-xs font-bold">✘ EXCEDE EL LÍMITE</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VISOR 3D FLUIDO */}
      <div className="flex-1 h-full relative bg-[#050b03]">
        <div className="absolute top-4 left-4 z-10 pointer-events-none bg-[#0f1a0a]/80 backdrop-blur border border-[#2a3d10] rounded px-3 py-2 text-xs">
          <p className="text-[#a3e635] font-semibold">VISOR TOPOLÓGICO 3D (IEEE-80)</p>
          <p className="text-[#7aad3a] text-[11px]">La geometría se altera dinámicamente con los inputs locales de Lx, Ly y Varillas.</p>
        </div>

        <Canvas camera={{ position: [14, 11, 14], fov: 45 }}>
          <EscenaMalla 
            Lx={params.Lx || 1} 
            Ly={params.Ly || 1} 
            h={params.h || 0.1} 
            nr={params.nr || 0} 
            Lr={params.Lr || 0} 
          />
        </Canvas>
      </div>

    </div>
  );
}
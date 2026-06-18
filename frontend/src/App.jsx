import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';

// ============================================================================
// COMPONENTE 3D: Escena con Etiquetas (Tags)
// ============================================================================
function EscenaMalla({ Lx, Ly, h, nr, Lr }) {
  // Escala visual inteligente para evitar desproporciones en el Canvas
  const maxDim = Math.max(Lx, Ly, Lr, 1);
  const escala = 15 / maxDim; 

  const w = Lx * escala;
  const l = Ly * escala;
  const profMalla = -h * escala;
  const largoVarilla = Lr * escala;

  // Distribuir las posiciones de las varillas en el perímetro
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
      
      {/* Nivel del Terreno 0 */}
      <Grid sectionColor="#2a3d10" cellColor="#13220a" cellSize={1} sectionSize={5} fadeDistance={30} />

      <group position={[0, 0, 0]}>
        {/* MALLA HORIZONTAL */}
        <mesh position={[0, profMalla, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, l]} />
          <meshBasicMaterial color="#a3e635" wireframe wireframeLineWidth={2} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, profMalla, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, l]} />
          <meshBasicMaterial color="#a3e635" transparent opacity={0.05} side={2} />
        </mesh>

        {/* Etiqueta de la Malla */}
        <mesh position={[0, profMalla, l / 2]}>
          <Html distanceFactor={15} center>
            <div className="bg-[#0f1a0a]/90 border border-[#a3e635] text-[#a3e635] text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap pointer-events-none shadow-md">
              Malla: {Lx}m × {Ly}m (h: {h}m)
            </div>
          </Html>
        </mesh>

        {/* VARILLAS VERTICALES */}
        {posicionesVarillas.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <cylinderGeometry args={[0.05, 0.05, largoVarilla, 8]} />
            <meshStandardMaterial color="#ffe033" emissive="#221800" />
            
            {/* Colocamos una etiqueta informativa solo en la primera y última varilla para no saturar la pantalla */}
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
// INTERFAZ DE USUARIO CON VALIDACIONES PASO A PASO
// ============================================================================
export default function App() {
  const [inputs, setInputs] = useState({
    rho: 350, seccion: 70, Lx: 100, Ly: 80, h: 0.6, rlim: 5, nr: 18, Lr: 10
  });

  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState("");
  const [errorApi, setErrorApi] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;
    // Permitir escribir valores intermedios (como cadenas vacías o puntos), pero guardamos el float
    setInputs(prev => ({ ...prev, [id]: value === '' ? '' : parseFloat(value) }));
  };

  // Validar entradas antes de mandarlas a la API de Python
  const validarCampos = () => {
    if (inputs.rho <= 0) return "La resistividad (rho) debe ser mayor a 0 Ω·m.";
    if (inputs.seccion <= 0) return "La sección del conductor debe ser mayor a 0 mm².";
    if (inputs.Lx <= 0 || inputs.Ly <= 0) return "Las dimensiones de la malla (Lx, Ly) deben ser mayores a 0 metros.";
    if (inputs.h <= 0) return "La profundidad (h) debe ser un valor positivo mayor a 0.";
    if (inputs.rlim <= 0) return "El límite admisible debe ser mayor a 0 Ω.";
    if (inputs.nr <= 0) return "El número de varillas (nr) debe ser al menos 1.";
    if (inputs.Lr <= 0) return "La longitud de varilla (Lr) debe ser mayor a 0 metros.";
    return "";
  };

  const consultarBackend = async () => {
    const errorMsg = validarCampos();
    if (errorMsg) {
      setErrorValidacion(errorMsg);
      setResultados(null);
      return;
    }
    
    setErrorValidacion("");
    setErrorApi("");
    setLoading(true);

    try {
      const response = await fetch('https://electrica-project.onrender.com/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error en los cálculos del servidor.");
      }
      
      const data = await response.json();
      setResultados(data);
    } catch (err) {
      setErrorApi(err.message || "No se pudo conectar con el backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      // Solo consultar si ningún campo está vacío temporalmente mientras el usuario escribe
      if (Object.values(inputs).every(v => v !== '')) {
        consultarBackend();
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [inputs]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden font-sans bg-[#050b03] text-[#e8f5c0]">
      
      {/* FORMULARIO */}
      <div className="w-full lg:w-[450px] bg-[#0f1a0a] border-r border-[#2a3d10] p-6 overflow-y-auto flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold text-[#a3e635] tracking-wide">⚡ Puesta a Tierra 3D</h2>
          <p className="text-xs text-[#7aad3a]">Filtro de Seguridad y Etiquetas Activas</p>
        </div>

        {/* Formulario Dinámico */}
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(inputs).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-[#7aad3a]">
                {key === 'rlim' ? 'Límite [Ω]' : key === 'rho' ? 'ρ [Ω·m]' : key}
              </label>
              <input 
                type="number" 
                id={key} 
                value={inputs[key]} 
                onChange={handleChange} 
                step={key === 'h' ? '0.01' : '1'}
                className="bg-[#050b03] border border-[#2a3d10] rounded px-3 py-1.5 text-sm text-[#e8f5c0] focus:outline-none focus:border-[#a3e635]" 
              />
            </div>
          ))}
        </div>

        {/* ALERTAS DE ERROR / CONTROL */}
        {errorValidacion && (
          <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded p-2.5 animate-pulse">
             {errorValidacion}
          </div>
        )}

        {errorApi && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded p-2.5">
             Backend: {errorApi}
          </div>
        )}

        {loading && <div className="text-xs text-[#a3e635] animate-pulse">⚡ Solicitando telemetría al servidor...</div>}
        
        {/* BLOQUE DE RESULTADOS */}
        {resultados && !loading && !errorValidacion && !errorApi && (
          <>
            <div className="bg-[#050b03] border border-[#2a3d10] rounded-lg p-4 font-mono">
              <div className="text-[11px] text-[#7aad3a] uppercase font-sans font-semibold tracking-wider">Resistencia Combinada</div>
              <div className="text-3xl font-medium text-[#e8f5c0] my-1">{resultados.R.toFixed(6)} <span className="text-sm text-[#7aad3a]">Ω</span></div>
              {resultados.cumple ? (
                <span className="inline-block bg-[#1a3a0a] text-[#a3e635] border border-[#a3e635] rounded px-2.5 py-0.5 text-xs font-sans mt-1">✔ Diseño Seguro</span>
              ) : (
                <span className="inline-block bg-[#3a2a00] text-[#ffe033] border border-[#ffe033] rounded px-2.5 py-0.5 text-xs font-sans mt-1">✘ Fuera de Límite</span>
              )}
            </div>

            <div className="bg-[#050b03] border border-[#2a3d10] rounded-lg p-4 font-mono text-xs flex flex-col gap-2">
              <div className="flex justify-between text-[#7aad3a]">R1 (Malla sola): <span className="text-[#ffe033]">{resultados.R1.toFixed(4)} Ω</span></div>
              <div className="flex justify-between text-[#7aad3a]">R2 (Varillas solas): <span className="text-[#ffe033]">{resultados.R2.toFixed(4)} Ω</span></div>
              <div className="flex justify-between text-[#7aad3a]">Rm (Resistencia Mutua): <span className="text-[#ffe033]">{resultados.Rm.toFixed(4)} Ω</span></div>
            </div>
          </>
        )}
      </div>

      {/* VISOR 3D CON RENDERING DE TEXTO */}
      <div className="flex-1 h-full relative bg-[#050b03]">
        <div className="absolute top-4 left-4 z-10 pointer-events-none bg-[#0f1a0a]/80 backdrop-blur border border-[#2a3d10] rounded px-3 py-2 text-xs">
          <p className="text-[#a3e635] font-semibold">SIMULADOR GEOMÉTRICO 3D</p>
          <p className="text-[#7aad3a] text-[11px]">Las etiquetas flotantes se orientan automáticamente.</p>
        </div>
        
        {/* Renderizado condicional para evitar romper las geometrías de Three.js si hay inputs corruptos */}
        {!errorValidacion ? (
          <Canvas camera={{ position: [12, 10, 12], fov: 50 }}>
            <EscenaMalla Lx={inputs.Lx || 1} Ly={inputs.Ly || 1} h={inputs.h || 0} nr={inputs.nr || 0} Lr={inputs.Lr || 0} />
          </Canvas>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-[#7aad3a] bg-[#030702]">
            Corrija las dimensiones para reestructurar la malla 3D.
          </div>
        )}
      </div>

    </div>
  );
}
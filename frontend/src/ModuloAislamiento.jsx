import React, { useState } from 'react';

const DEFAULT_AISLAMIENTO = {
  Us: 22.9, H: 1000, X1: 1.73, R1: 0.65, X0: 2.60, R0: 0.93,
  Kf: 1.3, Kd: 1.15, Ue2max: 2.6, Ue2min: 1.4, ratioUp: 1.6,
  Upl: 56.4, Ups: 41.7, Atab: 900, nlin: 2, Lsp: 100,
  a1: 1, a2: 3, a3: 0.5, a4e: 0.64, a4i: 0.268, Ra: 0.0025, Rkm: 0.06,
  mtov: 0.8, msl_ft: 1.0, msl_ff: 1.0, mfast: 1.0
};

export default function ModuloAislamiento() {
  const [form, setForm] = useState(DEFAULT_AISLAMIENTO);
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value === '' ? '' : Number(value) }));
  };

  const handleReset = () => {
    setForm(DEFAULT_AISLAMIENTO);
    setRes(null);
    setError(null);
  };

  const handleCalculate = async () => {
    setError(null);
    try {
      const response = await fetch('https://electrica-project.onrender.com/api/calcular-aislamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Error en el cálculo');
      }
      const data = await response.json();
      setRes(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderRow = (label, val, unit = "kV") => (
    <div className="flex justify-between items-center py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
      <span dangerouslySetInnerHTML={{ __html: label }} />
      <span className="text-[#ffe033] font-medium">{val !== undefined ? val.toFixed(4) : '0.0000'} {unit}</span>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto space-y-5 text-[#e8f5c0]">
      {/* HEADER DE LA SECCIÓN */}
      <div className="bg-[#0f1a0a] border-l-4 border-[#a3e635] rounded p-5 text-left">
        <h2 className="text-[20px] font-bold text-[#a3e635] tracking-wide m-0">⚡ Coordinación de Aislamiento — Gama I</h2>
        <p className="text-[13px] text-[#7aad3a] m-0 mt-1">Método completo IEC 60071-2:2018 · Anexo G.4 (pág. 153-159) · Rango 1 hasta 36 kV</p>
      </div>

      {/* FORMULARIO DE ENTRADAS EXTRAS */}
      <div className="space-y-4 text-left">
        {/* SECCIÓN 1 */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#7aad3a] uppercase border-b border-[#2a3d10] pb-1 mb-3">1. Parámetros del sistema</div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Tensión nominal Us fase-fase [kV]" val={form.Us} onChange={v => handleInputChange('Us', v)} />
            <InputField label="Altitud H [msnm]" val={form.H} onChange={v => handleInputChange('H', v)} />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            <InputField label="X1 [Ω]" val={form.X1} onChange={v => handleInputChange('X1', v)} />
            <InputField label="R1 [Ω]" val={form.R1} onChange={v => handleInputChange('R1', v)} />
            <InputField label="X0 [Ω]" val={form.X0} onChange={v => handleInputChange('X0', v)} />
            <InputField label="R0 [Ω]" val={form.R0} onChange={v => handleInputChange('R0', v)} />
          </div>
        </div>

        {/* SECCIÓN 2 */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#7aad3a] uppercase border-b border-[#2a3d10] pb-1 mb-3">2. Factores de sobretensiones temporales</div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="K — Factor falla a tierra (ej. 1.3)" val={form.Kf} onChange={v => handleInputChange('Kf', v)} />
            <InputField label="Kd — Factor rechazo de carga (ej. 1.15)" val={form.Kd} onChange={v => handleInputChange('Kd', v)} />
          </div>
        </div>

        {/* SECCIÓN 3 */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#7aad3a] uppercase border-b border-[#2a3d10] pb-1 mb-3">3. Sobretensiones de frente lento [p.u.] — Tabla G.3 / Anexo C</div>
          <div className="grid grid-cols-3 gap-4">
            <InputField label="Ue2 máximo [p.u.]" val={form.Ue2max} onChange={v => handleInputChange('Ue2max', v)} />
            <InputField label="Ue2 mínimo [p.u.]" val={form.Ue2min} onChange={v => handleInputChange('Ue2min', v)} />
            <InputField label="Relación Up2/Ue2 remoto" val={form.ratioUp} onChange={v => handleInputChange('ratioUp', v)} />
          </div>
        </div>

        {/* SECCIÓN 4 */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#7aad3a] uppercase border-b border-[#2a3d10] pb-1 mb-3">4. Pararrayos seleccionado</div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Upl — Impulso rayo 8/20 µs [kV]" val={form.Upl} onChange={v => handleInputChange('Upl', v)} />
            <InputField label="Ups — Impulso maniobra 60/100 µs [kV]" val={form.Ups} onChange={v => handleInputChange('Ups', v)} />
          </div>
        </div>

        {/* SECCIÓN 5 */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#7aad3a] uppercase border-b border-[#2a3d10] pb-1 mb-3">5. Geometría de instalación — Frente rápido (E.18/E.19)</div>
          <div className="grid grid-cols-3 gap-4">
            <InputField label="Factor A tabla E.2" val={form.Atab} onChange={v => handleInputChange('Atab', v)} />
            <InputField label="N° de líneas conectadas n" val={form.nlin} onChange={v => handleInputChange('nlin', v)} />
            <InputField label="Lsp — Longitud del vano [m]" val={form.Lsp} onChange={v => handleInputChange('Lsp', v)} />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            <InputField label="a1 [m]" val={form.a1} onChange={v => handleInputChange('a1', v)} />
            <InputField label="a2 [m]" val={form.a2} onChange={v => handleInputChange('a2', v)} />
            <InputField label="a3 [m]" val={form.a3} onChange={v => handleInputChange('a3', v)} />
            <InputField label="a4 externo (punta-punta) [m]" val={form.a4e} onChange={v => handleInputChange('a4e', v)} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <InputField label="a4 interno (chibolo) [m]" val={form.a4i} onChange={v => handleInputChange('a4i', v)} />
            <InputField label="Ra — Tasa fallas equipo [f/año]" val={form.Ra} onChange={v => handleInputChange('Ra', v)} />
            <InputField label="Rkm — Tasa fallas línea [f/km·año]" val={form.Rkm} onChange={v => handleInputChange('Rkm', v)} />
          </div>
        </div>

        {/* SECCIÓN 6 */}
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#7aad3a] uppercase border-b border-[#2a3d10] pb-1 mb-3">6. Parámetro m por tipo de sobretensión (ec. 11 IEC 60071-2)</div>
          <div className="grid grid-cols-4 gap-3">
            <InputField label="m — Temporales (TOV)" val={form.mtov} onChange={v => handleInputChange('mtov', v)} />
            <InputField label="m — Frente lento f-t" val={form.msl_ft} onChange={v => handleInputChange('msl_ft', v)} />
            <InputField label="m — Frente lento f-f" val={form.msl_ff} onChange={v => handleInputChange('msl_ff', v)} />
            <InputField label="m — Frente rápido" val={form.mfast} onChange={v => handleInputChange('mfast', v)} />
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="pt-3 text-left">
        <button onClick={handleCalculate} className="bg-[#a3e635] text-[#0f1a0a] border-none rounded px-7 py-2 font-bold text-[14px] cursor-pointer mr-2 hover:bg-[#c6f135] transition-all">Calcular</button>
        <button onClick={handleReset} className="bg-[#1e3210] text-[#7aad3a] border-none rounded px-4 py-2 text-[14px] cursor-pointer hover:bg-[#253f14] transition-all">Resetear</button>
      </div>

      {error && (
        <div className="bg-[#2a1f00] border border-[#ffe033] rounded p-3 text-[#ffe033] font-mono text-[13px] mt-3 text-left">
          ❌ Error: {error}
        </div>
      )}

      {/* RESULTADOS */}
      {res && (
        <div className="space-y-3 pt-2 text-left">
          
          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Parámetros del sistema derivados</div>
            {renderRow('Um = Us × 1.05', res.derivados.Um)}
            {renderRow('Ub = (√2/√3) × Um &nbsp;[1.0 p.u. cresta]', res.derivados.Ub)}
            {renderRow('Us fase-tierra = Us/√3', res.derivados.Us_ft)}
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>X0/X1</span><span className="text-[#ffe033]">{res.derivados.X0X1.toFixed(4)} —</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>R0/X1</span><span className="text-[#ffe033]">{res.derivados.R0X1.toFixed(4)} —</span>
            </div>
          </div>

          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Etapa 1 · A — Sobretensiones temporales representativas (Urp)</div>
            {renderRow('Urp f-t falla a tierra &nbsp;= K × Um/√3', res.etapa1a.Urp_ft_falla)}
            {renderRow('Urp f-t rechazo carga &nbsp; = Kd × Um/√3', res.etapa1a.Urp_ft_rechazo)}
            {renderRow('Urp f-f rechazo carga &nbsp; = Kd × Um', res.etapa1a.Urp_ff_rechazo)}
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <b className="text-[#e8f5c0] font-semibold">Urp f-t = max(falla, rechazo)</b>
              <span className="text-[#ffe033] font-medium">{res.etapa1a.Urp_ft.toFixed(4)} kV</span>
            </div>
            <div className="flex justify-between py-1 font-mono text-[13px] text-[#7aad3a]">
              <b className="text-[#e8f5c0] font-semibold">Urp f-f</b>
              <span className="text-[#ffe033] font-medium">{res.etapa1a.Urp_ff.toFixed(4)} kV</span>
            </div>
          </div>

          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Etapa 1 · B — Sobretensiones de frente lento (Anexo C)</div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>Ue2 promedio &nbsp;= (Ue2max+Ue2min)/2</span><span className="text-[#ffe033]">{res.etapa1b.Ue2_prom.toFixed(4)} p.u.</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>Up2 máximo &nbsp; &nbsp;= Ue2max × ratio</span><span className="text-[#ffe033]">{res.etapa1b.Up2_max.toFixed(4)} p.u.</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>Ups/Ue2·Ub (verificación Kcd)</span><span className="text-[#ffe033]">{res.etapa1b.ratio_Ups_Ue2.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>2Ups/Up2·Ub (verificación Kcd f-f)</span><span className="text-[#ffe033]">{res.etapa1b.ratio_2Ups_Up2.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <b className="text-[#e8f5c0] font-semibold">Uet = (1.25Ue2-0.25)·(√2/√3)·Us &nbsp;[f-t entrada línea]</b>
              <span className="text-[#ffe033] font-medium">{res.etapa1b.Uet.toFixed(4)} kV</span>
            </div>
            <div className="flex justify-between py-1 font-mono text-[13px] text-[#7aad3a]">
              <b className="text-[#e8f5c0] font-semibold">Upt = (1.25Up2-0.43)·(√2/√3)·Us &nbsp;[f-f entrada línea]</b>
              <span className="text-[#ffe033] font-medium">{res.etapa1b.Upt.toFixed(4)} kV</span>
            </div>
          </div>

          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Etapa 1 · C — Sobretensiones de frente rápido (ec. E.18 / E.19)</div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>La = 1000·(Ra/Rkm) &nbsp;[alcance de protección]</span><span className="text-[#ffe033]">{res.etapa1c.La.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>L total externo = a1+a2+a3+a4ext</span><span className="text-[#ffe033]">{res.etapa1c.L_ext.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>L total interno = a1+a2+a3+a4int</span><span className="text-[#ffe033]">{res.etapa1c.L_int.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <b className="text-[#e8f5c0] font-semibold">Ucw externo = Upl+(A/n)·(Lext/(Lsp+La))</b>
              <span className="text-[#ffe033] font-medium">{res.etapa1c.Ucw_rapido_ext.toFixed(4)} kV</span>
            </div>
            <div className="flex justify-between py-1 font-mono text-[13px] text-[#7aad3a]">
              <b className="text-[#e8f5c0] font-semibold">Ucw interno = Upl+(A/n)·(Lint/(Lsp+La))</b>
              <span className="text-[#ffe033] font-medium">{res.etapa1c.Ucw_rapido_int.toFixed(4)} kV</span>
            </div>
          </div>

          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Etapa 3 — Factores de corrección de altura Ka = e^(m·H/8150)</div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>Ka TOV &nbsp; &nbsp; (m={form.mtov})</span><span className="text-[#ffe033]">{res.etapa3.Ka_tov.toFixed(6)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>Ka lento f-t (m={form.msl_ft})</span><span className="text-[#ffe033]">{res.etapa3.Ka_slow_ft.toFixed(6)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#162a0c] font-mono text-[13px] text-[#7aad3a]">
              <span>Ka lento f-f (m={form.msl_ff})</span><span className="text-[#ffe033]">{res.etapa3.Ka_slow_ff.toFixed(6)}</span>
            </div>
            <div className="flex justify-between py-1 font-mono text-[13px] text-[#7aad3a]">
              <span>Ka rápido &nbsp; &nbsp;(m={form.mfast})</span><span className="text-[#ffe033]">{res.etapa3.Ka_fast.toFixed(6)}</span>
            </div>
          </div>

          {/* TABLA: ETAPA 4 */}
          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Etapa 4 — Tensiones soportadas especificadas (Urw) [kV]</div>
            <table className="w-full border-collapse font-mono text-[12px] text-center mt-2">
              <thead>
                <tr className="bg-[#1a3010] text-[#a3e635]">
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Tipo</th>
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Condición</th>
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Externo</th>
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Interno</th>
                </tr>
              </thead>
              <tbody className="text-[#e8f5c0]">
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Temporal (TOV)</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Tierra</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_tov_ext_ft.toFixed(3)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_tov_int_ft.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Temporal (TOV)</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Fase</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_tov_ext_ff.toFixed(3)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_tov_int_ff.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Frente lento</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Tierra</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_slow_ext_ft.toFixed(3)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_slow_int_ft.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Frente lento</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Fase</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_slow_ext_ff.toFixed(3)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_slow_int_ff.toFixed(3)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Frente rápido</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">F-T y F-F</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_fast_ext.toFixed(3)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa4.Urw_fast_int.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABLA DESTACADA: ETAPA 5 */}
          <div className="bg-[#0f1a0a] border border-[#a3e635] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#a3e635] border-b border-[#2a3d10] pb-1 mb-2">Etapa 5 — Tensiones normalizadas (SDWV / BIL) [kV]</div>
            <table className="w-full border-collapse font-mono text-[12px] text-center mt-2">
              <thead>
                <tr className="bg-[#1a3010] text-[#a3e635]">
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Tensión normalizada</th>
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Condición</th>
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Externo</th>
                  <th className="border border-[#2a3d10] p-1.5 font-semibold text-[11px]">Interno</th>
                </tr>
              </thead>
              <tbody className="text-[#e8f5c0]">
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">SDWV (frec. industrial)</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Tierra</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.SDWV_ext_ft.toFixed(2)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.SDWV_int_ft.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">SDWV (frec. industrial)</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Fase</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.SDWV_ext_ff.toFixed(2)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.SDWV_int_ff.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">BIL (impulso tipo rayo)</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Tierra</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.BIL_ext_ft.toFixed(2)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.BIL_int_ft.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">BIL (impulso tipo rayo)</td><td className="border border-[#162a0c] p-1 text-left text-[#7aad3a]">Fase-Fase</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.BIL_ext_ff.toFixed(2)}</td>
                  <td className="border border-[#162a0c] p-1 text-[#ffe033] font-semibold">{res.etapa5.BIL_int_ff.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CUADRO INFORMATIVO DE ECUACIONES */}
          <div className="bg-[#0f1a0a] border border-[#2a3d10] rounded p-4">
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#4a7a2a] border-b border-[#2a3d10] pb-1 mb-2">Ecuaciones — IEC 60071-2:2018 Anexo G.4 + Excel método completo</div>
            <div className="bg-[#080f04] rounded p-3 font-mono text-[11px] text-[#4a7a2a] line-clamp-none whitespace-pre-wrap leading-relaxed">
              <b className="text-[#a3e635]">Um</b> = Us × 1.05   |   <b className="text-[#a3e635]">Ub</b> = (√2/√3)·Um<br />
              <b className="text-[#a3e635]">Urp f-t</b> = max(K·Um/√3 , Kd·Um/√3)   |   <b className="text-[#a3e635]">Urp f-f</b> = Kd·Um<br />
              <b className="text-[#a3e635]">Uet</b> = (1.25·Ue2max − 0.25)·(√2/√3)·Us   [f-t frente lento]<br />
              <b className="text-[#a3e635]">Upt</b> = (1.25·Up2max − 0.43)·(√2/√3)·Us   [f-f frente lento]<br />
              <b className="text-[#a3e635]">La</b> = 1000·(Ra/Rkm)   [m alcance de protección, ec. E.18]<br />
              <b className="text-[#a3e635]">Ucw rápido</b> = Upl + (A/n)·(L/(Lsp+La))   [ec. E.19]<br />
              <b className="text-[#a3e635]">Ka</b> = e^(m·H/8150)   [ec. 11 IEC 60071-2]<br />
              <b className="text-[#a3e635]">Urw ext</b> = Ucw·Ks_ext·Ka   (Ks_ext=1.05)<br />
              <b className="text-[#a3e635]">Urw int</b> = Ucw·Ks_int     (Ks_int=1.15)<br />
              <b className="text-[#a3e635]">SDWV ext</b> = Urw_lento·0.6   |   int = Urw_lento·0.5<br />
              <b className="text-[#a3e635]">BIL ext</b> = Urw_rápido·(1.05+Urw/6000) f-t   |   ·(1.05+Urw/9000) f-f<br />
              <b className="text-[#a3e635]">BIL int</b> = 1.1·Ucw_rápido_int
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function InputField({ label, val, onChange }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[11px] text-[#7aad3a]">{label}</label>
      <input
        type="number"
        step="any"
        value={val}
        onChange={e => onChange(e.target.value)}
        className="bg-[#0f1a0a] border border-[#2a3d10] rounded text-[#e8f5c0] px-3 py-1.5 font-mono text-[13px] w-full box-border outline-none focus:border-[#a3e635]"
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const ReportView = () => {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarVentasDelDia = async () => {
    // --- LÓGICA DE CIERRE AUTOMÁTICO ---
    const ahora = new Date();
    // Inicio del día actual (00:00:00)
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0).toISOString();
    // Inicio del día siguiente (00:00:00) para delimitar el cierre
    const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0).toISOString();

    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .gte('fecha', inicioDia)
      .lt('fecha', finDia)
      .order('fecha', { ascending: false });

    if (!error) setVentas(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarVentasDelDia();
    // Recarga automática cada 5 minutos para detectar el cambio de día o nuevas ventas
    const interval = setInterval(cargarVentasDelDia, 300000);
    return () => clearInterval(interval);
  }, []);

  // --- CÁLCULOS POR MÉTODO ---
  const totalDia = ventas.reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const filtrarMonto = (metodo) => ventas
    .filter(v => v.metodos_pago?.metodo?.toLowerCase() === metodo.toLowerCase())
    .reduce((a, b) => a + (parseFloat(b.total) || 0), 0);

  const efectivo = filtrarMonto('Efectivo');
  const yape = filtrarMonto('Yape');
  const plin = filtrarMonto('Plin');

  // --- HORA TRUJILLO CORREGIDA (AJUSTE MANUAL UTC-5) ---
  const formatearHoraPeru = (fechaISO) => {
    if (!fechaISO) return "--:--";
    const fecha = new Date(fechaISO);
    
    // Restamos manualmente las 5 horas de diferencia con el servidor (UTC)
    fecha.setHours(fecha.getHours() - 5); 

    return fecha.toLocaleTimeString('es-PE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <main className="p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-end no-print">
        <div>
          <h2 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Reporte <span className="text-green-600">Diario</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-transform">
          📄 Generar PDF del Día
        </button>
      </div>

      {/* DASHBOARD DE CAJA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl md:col-span-3 text-center relative overflow-hidden border-b-8 border-green-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">TOTAL</div>
          <span className="text-[10px] font-black uppercase text-slate-500">Recaudación Neta Hoy</span>
          <p className="text-7xl font-black text-green-400 drop-shadow-md">S/ {totalDia.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-full mb-2">Efectivo</span>
          <p className="text-3xl font-black text-slate-800">S/ {efectivo.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-3 py-1 rounded-full mb-2">Yape</span>
          <p className="text-3xl font-black text-slate-800">S/ {yape.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full mb-2">Plin</span>
          <p className="text-3xl font-black text-slate-800">S/ {plin.toFixed(2)}</p>
        </div>
      </div>

      {/* LISTADO DE VENTAS */}
      <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movimientos Registrados</span>
          <span className="text-[10px] font-black text-slate-400 px-3 py-1 bg-white rounded-lg">{ventas.length} ventas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                  <td className="p-6">
                    <p className="text-[10px] font-black text-slate-300 uppercase leading-none">Hora Local</p>
                    <p className="text-sm font-bold text-slate-600">{formatearHoraPeru(v.fecha)}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-[10px] font-black text-slate-300 uppercase leading-none">Mesa</p>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">#{v.mesa_nro}</p>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${
                      v.metodos_pago?.metodo === 'Efectivo' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {v.metodos_pago?.metodo}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">S/ {parseFloat(v.total).toFixed(2)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default ReportView;
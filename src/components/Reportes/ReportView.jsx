import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const ReportView = () => {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarVentasDelDia = async () => {
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0).toISOString();
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
  }, []);

  const totalDia = ventas.reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const filtrarMonto = (metodo) => ventas
    .filter(v => v.metodos_pago?.metodo?.toLowerCase() === metodo.toLowerCase())
    .reduce((a, b) => a + (parseFloat(b.total) || 0), 0);

  const efectivo = filtrarMonto('Efectivo');
  const yape = filtrarMonto('Yape');
  const plin = filtrarMonto('Plin');

  const formatearHoraPeru = (fechaISO) => {
    if (!fechaISO) return "--:--";
    const fecha = new Date(fechaISO);
    fecha.setHours(fecha.getHours() - 5); 
    return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <main className="p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* ESTILOS DE IMPRESIÓN (Solo afectan al PDF) */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          main { max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .shadow-xl, .shadow-sm { shadow: none !important; border: 1px solid #eee !important; }
          .rounded-[3rem], .rounded-[2.5rem] { border-radius: 8px !important; }
          .bg-slate-900 { background: #f8fafc !important; color: black !important; border: 2px solid black !important; }
          .text-green-400 { color: black !important; font-size: 40px !important; }
        }
      `}</style>

      {/* CABECERA */}
      <div className="flex justify-between items-end no-print">
        <div>
          <h2 className="text-3xl font-black uppercase text-slate-800 tracking-tighter italic">Chelita <span className="text-green-600 font-bold">POS</span></h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={() => window.print()} 
          className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-green-700 transition-all flex items-center gap-2"
        >
          <span>📄</span> Imprimir Cierre (PDF)
        </button>
      </div>

      {/* RECUADRO DE TOTALES (En PDF saldrá minimalista) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl md:col-span-3 text-center border-b-8 border-green-500">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Balance Final Hoy</span>
          <p className="text-7xl font-black text-green-400">S/ {totalDia.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase text-slate-400">Cash (Efectivo)</span>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">S/ {efectivo.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center border-purple-200">
          <span className="text-[10px] font-black uppercase text-purple-600">Yape</span>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">S/ {yape.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center border-cyan-200">
          <span className="text-[10px] font-black uppercase text-cyan-600">Plin</span>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">S/ {plin.toFixed(2)}</p>
        </div>
      </div>

      {/* LISTADO DE MOVIMIENTOS */}
      <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center print:bg-white">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Detalle de Ventas Trujillo</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-300 uppercase bg-slate-50/50 print:text-black">
                <th className="p-6">Hora</th>
                <th className="p-6">Mesa</th>
                <th className="p-6">Método</th>
                <th className="p-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ventas.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/30">
                  <td className="p-6 text-sm font-bold text-slate-500">{formatearHoraPeru(v.fecha)}</td>
                  <td className="p-6 text-lg font-black text-slate-800 uppercase">Mesa #{v.mesa_nro}</td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                      {v.metodos_pago?.metodo}
                    </span>
                  </td>
                  <td className="p-6 text-right font-black text-2xl text-slate-900 tracking-tighter">
                    S/ {parseFloat(v.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* PIE DE PÁGINA SOLO PARA IMPRESIÓN */}
      <footer className="hidden print:block text-center mt-10 border-t pt-4 text-slate-400 text-[10px] uppercase font-black">
        Chelita POS - Reporte Generado en Trujillo, Perú
      </footer>
    </main>
  );
};

export default ReportView;
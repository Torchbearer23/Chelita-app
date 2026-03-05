import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; //
import Login from './components/Login';
import POSView from './components/POS/POSView';
import AdminView from './components/Admin/AdminView';
import ReportView from './components/Reportes/ReportView';

function App() {
  const [perfil, setPerfil] = useState(null); //
  const [vistaActual, setVistaActual] = useState('pos');
  const [productos, setProductos] = useState([]);

  // 1. FUNCIÓN PARA CARGAR PRODUCTOS DESDE LA NUBE
  const cargarProductos = async () => {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });
    if (data) setProductos(data);
  };

  // 2. EFECTO INICIAL Y TIEMPO REAL
  useEffect(() => {
    cargarProductos();

    // SUSCRIPCIÓN MÁGICA: Escucha cambios manuales en Supabase
    const canal = supabase.channel('cambios-productos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        cargarProductos();
      })
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  // Bloqueo de seguridad: Si no hay perfil, va al Login
  if (!perfil) {
    return <Login alLoguear={setPerfil} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* HEADER DINÁMICO */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center no-print shadow-lg">
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-orange-400 italic leading-tight uppercase">
            CHELITA <span className="text-white">POS</span>
          </h1>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Sesión: {perfil.nombre} ({perfil.rol})
          </span>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setVistaActual('pos')} 
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${vistaActual === 'pos' ? 'bg-orange-500 shadow-lg' : 'bg-slate-800 text-slate-400'}`}
          >
            🛒 Ventas
          </button>
          
          {perfil.rol === 'admin' && (
            <>
              <button 
                onClick={() => setVistaActual('admin')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${vistaActual === 'admin' ? 'bg-blue-600 shadow-lg' : 'bg-slate-800 text-slate-400'}`}
              >
                ⚙️ Carta
              </button>
              <button 
                onClick={() => setVistaActual('reporte')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${vistaActual === 'reporte' ? 'bg-green-600 shadow-lg' : 'bg-slate-800 text-slate-400'}`}
              >
                📊 Reportes
              </button>
            </>
          )}
          
          <button 
            onClick={() => setPerfil(null)} 
            className="bg-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* VISTAS PRINCIPALES */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {vistaActual === 'pos' && (
          <POSView productos={productos} perfil={perfil} />
        )}
        
        {/* PASAMOS alCambiar PARA QUE EL ADMIN AVISE AL APP CUANDO EDITE */}
        {vistaActual === 'admin' && (
          <AdminView alCambiar={cargarProductos} />
        )}
        
        {vistaActual === 'reporte' && (
          <ReportView />
        )}
      </main>
    </div>
  );
}

export default App;
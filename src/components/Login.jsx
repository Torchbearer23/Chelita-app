import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; //

const Login = ({ alLoguear }) => {
  const [nombreInput, setNombreInput] = useState(''); // Ahora pedimos nombre
  const [pinInput, setPinInput] = useState('');
  const [errorLogin, setErrorLogin] = useState(false);
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setCargando(true);
    setErrorLogin(false);

    try {
      // Consultamos a la base de datos
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('nombre', nombreInput)
        .eq('pin', pinInput)
        .eq('estado', 'activo')
        .maybeSingle(); //

      if (error || !data) {
        setErrorLogin(true);
        setPinInput('');
      } else {
        // Pasamos el objeto del usuario (nombre, rol, id) al App.jsx
        alLoguear(data); 
      }
    } catch (err) {
      console.error("Error de conexión:", err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
        <h1 className="text-4xl font-black italic tracking-tighter mb-10">CHELITA <span className="text-orange-500 not-italic">POS</span></h1>
        
        <form onSubmit={manejarLogin} className="space-y-4">
          {/* Input para el Nombre */}
          <input 
            type="text" 
            placeholder="USUARIO" 
            value={nombreInput}
            onChange={(e) => setNombreInput(e.target.value)}
            className="w-full p-5 bg-slate-50 rounded-3xl text-center font-black text-sm outline-none border border-slate-100 focus:ring-4 focus:ring-orange-100"
            required
          />

          {/* Input para el PIN */}
          <input 
            type="password" 
            placeholder="PIN" 
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className={`w-full p-5 bg-slate-50 rounded-3xl text-center font-black text-3xl mb-4 outline-none focus:ring-4 ${errorLogin ? 'ring-red-100 border-red-200' : 'focus:ring-orange-100'}`} 
            required
          />

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-orange-500 text-white py-5 rounded-3xl font-black shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            {cargando ? 'VERIFICANDO...' : '🔓 ENTRAR'}
          </button>

          {errorLogin && <p className="text-red-500 text-[10px] font-black mt-3 uppercase tracking-widest text-center">Datos Incorrectos</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;
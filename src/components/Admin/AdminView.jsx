import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AdminView = ({ alCambiar }) => {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('creado_at', { ascending: false });
    if (data) setProductos(data);
    setCargando(false);
  };

  useEffect(() => { cargarProductos(); }, []);

  const agregarPlato = async (e) => {
    e.preventDefault();
    const nombre = e.target.nombre.value;
    const precio = parseFloat(e.target.precio.value);
    const tipo = e.target.tipo.value;

    const { error } = await supabase.from('productos').insert([{ nombre, precio, tipo }]);
    if (!error) {
      e.target.reset();
      await cargarProductos();
      if (alCambiar) alCambiar();
    }
  };

  const actualizarPrecio = async (id, nuevoPrecio) => {
    const precioNum = parseFloat(nuevoPrecio);
    if (isNaN(precioNum)) return;
    const { error } = await supabase.from('productos').update({ precio: precioNum }).eq('id', id);
    if (!error) {
      setProductos(productos.map(p => p.id === id ? { ...p, precio: precioNum } : p));
      if (alCambiar) alCambiar();
    }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Eliminar este producto?")) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (!error) { await cargarProductos(); if (alCambiar) alCambiar(); }
    }
  };

  if (cargando) return <div className="p-20 text-center font-black animate-pulse text-slate-400">⚙️ ACTUALIZANDO...</div>;

  return (
    <main className="p-6 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black italic text-center text-slate-800 uppercase">Gestión de <span className="text-orange-500">Inventario</span></h2>

      {/* FORMULARIO MEJORADO CON NUEVAS CATEGORÍAS */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-50">
        <form onSubmit={agregarPlato} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Nombre</label>
            <input name="nombre" type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 ring-orange-50" required />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Precio S/</label>
            <input name="precio" type="number" step="0.10" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 ring-orange-50" required />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Categoría</label>
            <select name="tipo" className="w-full p-4 bg-orange-50 text-orange-600 rounded-2xl font-black outline-none cursor-pointer">
              <option value="menu">🍱 MENÚ DEL DÍA</option>
              <option value="carta">📖 LA CARTA</option>
              <option value="bebida">🥤 BEBIDAS Y LICORES</option>
              <option value="guarnicion">🍚 GUARNICIONES</option>
            </select>
          </div>
          <button type="submit" className="md:col-span-4 bg-orange-500 text-white p-5 rounded-2xl font-black uppercase hover:bg-orange-600 shadow-lg">
            + AGREGAR PRODUCTO
          </button>
        </form>
      </section>

      {/* LISTADO POR BLOQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['menu', 'carta', 'bebida', 'guarnicion'].map(seccion => (
          <div key={seccion} className="bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
            <h3 className="text-center font-black uppercase text-slate-400 text-[9px] mb-4 tracking-widest">
              {seccion === 'menu' ? 'Menú' : seccion === 'carta' ? 'Carta' : seccion === 'bebida' ? 'Bebidas' : 'Guarniciones'}
            </h3>
            <div className="space-y-2">
              {productos.filter(p => p.tipo === seccion).map(p => (
                <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center group">
                  <div className="flex-1">
                    <p className="font-bold text-[11px] text-slate-700 uppercase leading-none">{p.nombre}</p>
                    <input 
                      type="number" 
                      step="0.10"
                      defaultValue={p.precio} 
                      onBlur={(e) => actualizarPrecio(p.id, e.target.value)}
                      className="w-full bg-transparent font-black text-orange-500 text-xs outline-none" 
                    />
                  </div>
                  <button onClick={() => eliminar(p.id)} className="text-slate-200 hover:text-red-500 text-xl">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

export default AdminView;
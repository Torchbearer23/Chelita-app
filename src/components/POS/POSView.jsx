import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; 

const POSView = ({ productos, perfil }) => {
  const [pestaña, setPestaña] = useState('menu');
  const [mesaActiva, setMesaActiva] = useState('1');
  const [pedidosEnNube, setPedidosEnNube] = useState([]); 
  const [mostrarPago, setMostrarPago] = useState(false);
  const [montoPagar, setMontoPagar] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [pagosTemporales, setPagosTemporales] = useState([]);

  // 1. CARGA Y SINCRONIZACIÓN EN TIEMPO REAL
  const cargarPedidos = async () => {
    const { data } = await supabase.from('pedidos').select('*');
    if (data) setPedidosEnNube(data);
  };

  useEffect(() => {
    cargarPedidos();
    const canal = supabase.channel('cambios-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarPedidos())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  // --- LÓGICA DE NEGOCIO ---
  const pedidoDeMesaActual = pedidosEnNube.find(p => p.mesa_nro === mesaActiva) || { items: [], total: 0 };

  const agregarAlPedido = async (p) => {
    const pedidoExistente = pedidosEnNube.find(ped => ped.mesa_nro === mesaActiva);
    const nuevosItems = [...pedidoDeMesaActual.items, { ...p, instanceId: Math.random() }];
    const nuevoTotal = nuevosItems.reduce((a, b) => a + (parseFloat(b.precio) || 0), 0);

    const tempPedidos = pedidoExistente 
      ? pedidosEnNube.map(ped => ped.mesa_nro === mesaActiva ? { ...ped, items: nuevosItems, total: nuevoTotal } : ped)
      : [...pedidosEnNube, { mesa_nro: mesaActiva, items: nuevosItems, total: nuevoTotal }];
    setPedidosEnNube(tempPedidos);

    if (pedidoExistente) {
      await supabase.from('pedidos').update({ items: nuevosItems, total: nuevoTotal }).eq('id', pedidoExistente.id);
    } else {
      await supabase.from('pedidos').insert([{ mesa_nro: mesaActiva, items: nuevosItems, total: nuevoTotal, mesero_id: perfil.id }]);
    }
  };

  const eliminarItem = async (instanceId) => {
    const nuevosItems = pedidoDeMesaActual.items.filter(i => i.instanceId !== instanceId);
    const nuevoTotal = nuevosItems.reduce((a, b) => a + (parseFloat(b.precio) || 0), 0);
    
    setPedidosEnNube(pedidosEnNube.map(p => p.mesa_nro === mesaActiva ? { ...p, items: nuevosItems, total: nuevoTotal } : p));

    if (nuevosItems.length === 0) {
      await supabase.from('pedidos').delete().eq('mesa_nro', mesaActiva);
    } else {
      await supabase.from('pedidos').update({ items: nuevosItems, total: nuevoTotal }).eq('mesa_nro', mesaActiva);
    }
  };

  const vaciarMesa = async () => {
    if (window.confirm("¿Seguro que quieres CANCELAR todo el pedido de esta mesa?")) {
      setPedidosEnNube(pedidosEnNube.filter(p => p.mesa_nro !== mesaActiva));
      await supabase.from('pedidos').delete().eq('mesa_nro', mesaActiva);
    }
  };

  // --- LÓGICA DE COBRO ---
  const yaPagado = pagosTemporales.reduce((a, b) => a + b.monto, 0);
  const saldoRestante = (pedidoDeMesaActual.total - yaPagado).toFixed(2);

  const registrarPagoParcial = () => {
    const monto = parseFloat(montoPagar);
    if (!monto || monto <= 0 || monto > parseFloat(saldoRestante)) return;
    setPagosTemporales([...pagosTemporales, { metodo: metodoPago, monto }]);
    setMontoPagar('');
  };

  // FUNCIÓN CORREGIDA PARA REPORTE Y LIMPIEZA INMEDIATA
  const cerrarMesaFinal = async () => {
    if (parseFloat(saldoRestante) > 0) {
      return alert(`Falta cobrar S/ ${saldoRestante}`);
    }

    const montoFinal = parseFloat(pedidoDeMesaActual.total);

    const nuevaVenta = {
      mesa_nro: mesaActiva,
      mesero_nombre: perfil.nombre,
      total: montoFinal, // Enviamos el número limpio
      metodos_pago: { 
        metodo: pagosTemporales[0]?.metodo || 'Efectivo', 
        detalle: pagosTemporales 
      }
    };

    const { error: errorVenta } = await supabase.from('ventas').insert([nuevaVenta]);

    if (!errorVenta) {
      // Limpieza visual inmediata
      setPedidosEnNube(prev => prev.filter(p => p.mesa_nro !== mesaActiva));
      
      // Borramos de la base de datos
      await supabase.from('pedidos').delete().eq('mesa_nro', mesaActiva);
      
      setPagosTemporales([]);
      setMostrarPago(false);
      setMontoPagar('');
      alert("✅ Venta registrada y mesa liberada");
    } else {
      alert("Error al guardar venta: " + errorVenta.message);
    }
  };

  const platosVisibles = productos.filter(p => p.tipo === pestaña); 

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="bg-slate-900 p-2 flex gap-2 overflow-x-auto no-print">
          {['1','2','3','4','5','7','8','9','10','11','12','13','14','15','16','17','18'].map(m => {
            const tienePedido = pedidosEnNube.some(p => p.mesa_nro === m);
            return (
              <button key={m} onClick={() => { setMesaActiva(m); setPagosTemporales([]); }} 
                className={`px-5 py-2 rounded-2xl font-black text-[10px] whitespace-nowrap transition-all
                ${mesaActiva === m ? 'bg-orange-500 text-white scale-110 z-10' : (tienePedido ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-slate-800 text-slate-500')}`}>
                MESA {m} {tienePedido && "•"}
              </button>
            );
          })}
        </div>

        <nav className="flex bg-white border-b shadow-sm overflow-x-auto">
          {[
            { id: 'menu', label: '🍱 MENÚ' },
            { id: 'carta', label: '📖 CARTA' },
            { id: 'bebida', label: '🥤 BEBIDAS' },
            { id: 'guarnicion', label: '🍚 GUARN.' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setPestaña(tab.id)} 
              className={`flex-1 py-4 px-4 font-black text-[10px] tracking-widest whitespace-nowrap transition-all
              ${pestaña === tab.id ? 'text-orange-600 border-b-4 border-orange-600 bg-orange-50/20' : 'text-slate-400'}`}>
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto bg-slate-50">
          {platosVisibles.map(p => (
            <button key={p.id} onClick={() => agregarAlPedido(p)} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-orange-300 text-left transition-all active:scale-95 group">
              <h3 className="font-black text-slate-800 text-base uppercase leading-tight group-hover:text-orange-600">{p.nombre}</h3>
              <p className="text-orange-500 font-black text-xl mt-1 tracking-tighter italic">S/ {parseFloat(p.precio).toFixed(2)}</p>
            </button>
          ))}
        </main>
      </div>

      <aside className="w-full md:w-96 bg-white flex flex-col shadow-2xl z-20 border-l border-slate-100">
        <div className="p-5 border-b bg-orange-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Mesa</span>
            <span className="text-4xl font-black text-slate-900">{mesaActiva}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-orange-500 block leading-none mb-1">Mesero</span>
            <span className="text-sm font-bold text-slate-700 uppercase">{perfil.nombre}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {pedidoDeMesaActual.items.map(item => (
            <div key={item.instanceId} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group animate-in slide-in-from-right-2">
              <div className="flex flex-col flex-1">
                <span className="text-sm font-black text-slate-800 uppercase leading-tight">{item.nombre}</span>
                <span className="text-xl font-black text-orange-600 italic">S/ {parseFloat(item.precio).toFixed(2)}</span>
              </div>
              <button onClick={() => eliminarItem(item.instanceId)} className="ml-3 bg-red-50 text-red-500 w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-2xl font-light">×</button>
            </div>
          ))}
        </div>

        <div className="p-8 bg-slate-900 text-white rounded-t-[3.5rem] shadow-[0_-15px_30px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-end mb-6">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Total</span>
            <span className="text-5xl font-black text-orange-400 tracking-tighter">
              <small className="text-lg mr-1 opacity-50 font-medium">S/</small>
              {pedidoDeMesaActual.total.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={vaciarMesa} disabled={pedidoDeMesaActual.items.length === 0} className="col-span-1 bg-slate-800 p-5 rounded-3xl flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-10">🗑️</button>
            <button onClick={() => setMostrarPago(true)} disabled={pedidoDeMesaActual.total <= 0} className="col-span-3 bg-orange-500 py-5 rounded-3xl font-black shadow-xl uppercase text-sm tracking-widest active:scale-95 disabled:opacity-30 transition-all">Pagar / Cobrar</button>
          </div>
        </div>
      </aside>

      {/* MODAL DE COBRO DINÁMICO */}
      {mostrarPago && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3.5rem] max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-4xl font-black mb-1 italic tracking-tighter uppercase">Cobrar</h2>
            <div className="flex justify-between items-center mb-8 border-b pb-4">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</span>
               <span className="text-3xl font-black text-red-500">S/ {saldoRestante}</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(m => (
                  <button key={m} onClick={() => setMetodoPago(m)} className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${metodoPago === m ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 text-slate-300'}`}>{m}</button>
                ))}
              </div>
              <input type="number" value={montoPagar} onChange={(e) => setMontoPagar(e.target.value)} className="w-full p-6 bg-slate-100 rounded-[2.5rem] text-4xl font-black text-center outline-none focus:ring-4 ring-orange-100 transition-all" placeholder="0.00" />
              <button onClick={registrarPagoParcial} className="w-full bg-slate-800 text-white py-4 rounded-3xl font-black uppercase text-[10px] hover:bg-black transition-all">+ Registrar Pago</button>
              
              <div className="flex gap-2">
                <button onClick={() => { setMostrarPago(false); setPagosTemporales([]); }} className="flex-1 py-5 bg-slate-100 rounded-[2.5rem] font-black text-slate-400 text-[10px] uppercase tracking-widest">Atrás</button>
                <button onClick={cerrarMesaFinal} disabled={parseFloat(saldoRestante) > 0} className={`flex-[2] py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-lg transition-all ${parseFloat(saldoRestante) === 0 ? 'bg-green-500 text-white animate-bounce' : 'bg-slate-200 text-slate-400'}`}>Finalizar Venta ✓</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSView;
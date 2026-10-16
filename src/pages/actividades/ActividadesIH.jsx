import { procesarCursadasActividad, procesarExamenesActividad, procesarIndicesActividad } from "../../services/servicesCursadas";

import { useState } from "react";

const añoActual = new Date().getFullYear();
const anios = Array.from({ length: 10 }, (_, index) => añoActual - index);

// El orden de este arreglo es el orden en que se ejecuta el proceso completo
const sedes = [
  { value: '1', label: 'Mendoza' },
  { value: '2', label: 'San Rafael' },
  { value: '4', label: 'Este' },
];

// Idem: cursadas -> aprobadas ciclo -> indices ciclo
const procesos = [
  { clave: 'cursadas', titulo: 'Indices de Cursada', fondo: 'bg-emerald-500', ejecutar: (anio, sede) => procesarCursadasActividad(anio, sede, 'N') },
  { clave: 'aprobadas', titulo: 'Aprobadas Ciclos', fondo: 'bg-emerald-600', ejecutar: (anio, sede) => procesarExamenesActividad(anio, sede) },
  { clave: 'indices', titulo: 'Calculo Indices Ciclos', fondo: 'bg-emerald-700', ejecutar: (anio, sede) => procesarIndicesActividad(anio, sede) },
];

const estilosEstado = {
  pendiente: 'bg-gray-200 text-gray-700',
  en_curso: 'bg-blue-200 text-blue-900 animate-pulse',
  ok: 'bg-green-200 text-green-900',
  error: 'bg-red-200 text-red-900',
  omitido: 'bg-gray-100 text-gray-400',
};

// Los servicios devuelven "error" o { error } cuando la llamada falla
const fallo = (result) => !result || result === 'error' || Boolean(result.error);

const ActividadesIH = () => {

  const [anio, setAnio] = useState(añoActual);
  const [sede, setSede] = useState('1');
  const [ejecutando, setEjecutando] = useState(false);
  const [pasos, setPasos] = useState([]);

  const actualizarPaso = (indice, cambios) =>
    setPasos((prev) => prev.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));

  const ejecutarProcesoCompleto = async () => {
    const plan = sedes.flatMap((s) =>
      procesos.map((p) => ({ sede: s, proceso: p, estado: 'pendiente' }))
    );
    setPasos(plan);
    setEjecutando(true);

    try {
      for (let i = 0; i < plan.length; i++) {
        const { sede: s, proceso } = plan[i];
        actualizarPaso(i, { estado: 'en_curso' });
        const t0 = Date.now();
        const result = await proceso.ejecutar(anio, s.value);
        const segundos = ((Date.now() - t0) / 1000).toFixed(1);

        if (fallo(result)) {
          actualizarPaso(i, { estado: 'error', segundos });
          // Cada paso depende del anterior: si uno falla no se sigue
          setPasos((prev) => prev.map((p) => (p.estado === 'pendiente' ? { ...p, estado: 'omitido' } : p)));
          return;
        }
        actualizarPaso(i, { estado: 'ok', segundos });
      }
    } finally {
      setEjecutando(false);
    }
  };

  const ejecutarProceso = async (proceso) => {
    setEjecutando(true);
    try {
      const result = await proceso.ejecutar(anio, sede);
      console.log(result);
      alert(fallo(result) ? `Error en ${proceso.titulo}` : `${proceso.titulo}: ${result.message}`);
    } finally {
      setEjecutando(false);
    }
  };

  const selectAnio = (
    <>
      <label htmlFor="anio" className="block mb-2 text-sm font-medium text-gray-700">Año</label>
      <select
        id="anio"
        value={anio}
        disabled={ejecutando}
        onChange={(e) => setAnio(Number(e.target.value))}
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {anios.map((a) => (
          <option key={a} value={a}>{a}{a === añoActual ? ' (en curso)' : ''}</option>
        ))}
      </select>
    </>
  );

  const claseBoton = `w-50 rounded-4xl bg-blue-700 hover:bg-blue-400 p-3 my-6 text-white
    active:scale-95
    transition
    duration-200
    disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="p-4 bg-amber-100 min-h-screen max-w-screen">
      <div className="h-15 w-[80%] bg-emerald-400 p-2 mx-auto">
        <h1 className="text-3xl font-bold">Calculo de Indices Historicos </h1>
      </div>

      <div className="w-[80%] mx-auto my-3 bg-emerald-300 p-5">
        <h2 className="text-2xl font-black">Proceso Completo</h2>
        <p className="text-sm text-gray-700 mb-2">
          Ejecuta {procesos.map((p) => p.titulo).join(' → ')} para {sedes.map((s) => s.label).join(', ')}, en ese orden.
        </p>
        <div className="w-[30%]">{selectAnio}</div>
        <button className={claseBoton} disabled={ejecutando} onClick={ejecutarProcesoCompleto}>
          {ejecutando ? 'Ejecutando...' : 'Ejecutar Todo'}
        </button>

        {pasos.length > 0 && (
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {pasos.map((p, i) => (
              <li key={`${p.sede.value}-${p.proceso.clave}`} className={`p-2 rounded-md text-sm ${estilosEstado[p.estado]}`}>
                <span className="font-bold">{i + 1}. {p.sede.label}</span> – {p.proceso.titulo}
                <span className="block text-xs">
                  {p.estado.replace('_', ' ')}{p.segundos ? ` (${p.segundos}s)` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="p-3 bg-amber-100 flex place-content-around ">
        {procesos.map((proceso) => (
          <div key={proceso.clave} className={`w-[30%] ${proceso.fondo} p-5`}>
            <h2 className="text-2xl font-black">{proceso.titulo}</h2>
            <label htmlFor={`sede-${proceso.clave}`} className="block mb-2 text-sm font-medium text-gray-700">Sede</label>
            <select
              id={`sede-${proceso.clave}`}
              value={sede}
              disabled={ejecutando}
              onChange={(e) => setSede(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sedes.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <p className="mt-2 text-sm font-medium text-gray-700">Año: {anio}</p>
            <button className={claseBoton} disabled={ejecutando} onClick={() => ejecutarProceso(proceso)}>
              Ejecutar Proceso
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActividadesIH

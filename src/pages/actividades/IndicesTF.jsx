import { procesarIndicesTotalSede  } from "../../services/servicesRendimiento";
import { useState } from "react";

const añoActual = new Date().getFullYear();
const anios = Array.from({ length: 10 }, (_, index) => añoActual - index);

const sedes = [
  { value: '1', label: 'Mendoza' },
  { value: '2', label: 'San Rafael' },
  { value: '3', label: 'Gral.Alvear' },
  { value: '4', label: 'Este' },
];

// Sedes del proceso completo, en el orden en que se ejecutan
const sedesProcesoCompleto = ['1', '2', '4'].map((v) => sedes.find((s) => s.value === v));

const estilosEstado = {
  pendiente: 'bg-gray-200 text-gray-700',
  en_curso: 'bg-blue-200 text-blue-900 animate-pulse',
  ok: 'bg-green-200 text-green-900',
  error: 'bg-red-200 text-red-900',
  omitido: 'bg-gray-100 text-gray-400',
};

// El servicio devuelve "error" o { error } si la llamada falla; el backend responde 200
// aunque falle la grabacion de una propuesta y deja el error como texto dentro de results
const fallo = (result) =>
  !result ||
  result === 'error' ||
  Boolean(result.error) ||
  (result.results || []).some((r) => typeof r === 'string' && r.startsWith('Error'));

function IndicesTF() {
  const [anio, setAnio] = useState(añoActual);
  const [sede, setSede] = useState('1');
  const [ejecutando, setEjecutando] = useState(false);
  const [pasos, setPasos] = useState([]);

  const actualizarPaso = (indice, cambios) =>
    setPasos((prev) => prev.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));

  const ejecutarProcesoCompleto = async () => {
    const plan = sedesProcesoCompleto.map((s) => ({ sede: s, estado: 'pendiente' }));
    setPasos(plan);
    setEjecutando(true);

    try {
      for (let i = 0; i < plan.length; i++) {
        actualizarPaso(i, { estado: 'en_curso' });
        const t0 = Date.now();
        const result = await procesarIndicesTotalSede(anio, plan[i].sede.value);
        const segundos = ((Date.now() - t0) / 1000).toFixed(1);

        if (fallo(result)) {
          console.log(result);
          actualizarPaso(i, { estado: 'error', segundos });
          setPasos((prev) => prev.map((p) => (p.estado === 'pendiente' ? { ...p, estado: 'omitido' } : p)));
          return;
        }
        actualizarPaso(i, { estado: 'ok', segundos });
      }
    } finally {
      setEjecutando(false);
    }
  };

  const ejecutarProcesoIndiceTotal = async () => {
    setEjecutando(true);
    try {
      const result = await procesarIndicesTotalSede(anio, sede);
      console.log(result);
      alert(fallo(result) ? 'Error al calcular los indices' : result.message);
    } finally {
      setEjecutando(false);
    }
  };

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
          Calcula los indices de {sedesProcesoCompleto.map((s) => s.label).join(', ')}, en ese orden.
        </p>
        <div className="w-[30%]">
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
        </div>
        <button className={claseBoton} disabled={ejecutando} onClick={ejecutarProcesoCompleto}>
          {ejecutando ? 'Ejecutando...' : 'Ejecutar Todo'}
        </button>

        {pasos.length > 0 && (
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {pasos.map((p, i) => (
              <li key={p.sede.value} className={`p-2 rounded-md text-sm ${estilosEstado[p.estado]}`}>
                <span className="font-bold">{i + 1}. {p.sede.label}</span>
                <span className="block text-xs">
                  {p.estado.replace('_', ' ')}{p.segundos ? ` (${p.segundos}s)` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="w-[80%] mx-auto">
        <div className="w-[30%] bg-emerald-700 p-5">
          <h2 className="text-2xl font-black">Calculo Indices Ciclos</h2>
          <label htmlFor="sede" className="block mb-2 text-sm font-medium text-gray-700">Sede</label>
          <select
            id="sede"
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
          <button className={claseBoton} disabled={ejecutando} onClick={ejecutarProcesoIndiceTotal}>
            Ejecutar Proceso
          </button>
        </div>
      </div>
    </div>
  )
}


export default IndicesTF

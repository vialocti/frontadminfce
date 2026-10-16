import React, { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

import { analizarDatosAlumnos } from '../../services/servicesOpenAI';
import { traerDatosinformacionAlumnos } from '../../services/servicesAlumnos';

const TODAS = '';
const FILAS_POR_PAGINA = 50;

const UBICACIONES = {
  1: 'Mendoza',
  2: 'San Rafael',
  3: 'Gral. Alvear',
  4: 'Este',
};

const PROPUESTAS = {
  8: 'CP - Contador Público',
  2: 'LA - Lic. en Administración',
  3: 'LE - Lic. en Economía',
  7: 'LLO - Lic. en Logística',
  6: 'LNRG',
};

const CALIDADES = {
  A: 'Activo',
  P: 'Pasivo',
};

const ORDENES = [
  { value: 'apellido_asc', label: 'Apellido (A → Z)' },
  { value: 'apellido_desc', label: 'Apellido (Z → A)' },
  { value: 'promedio_desc', label: 'Promedio (mayor a menor)' },
  { value: 'promedio_asc', label: 'Promedio (menor a mayor)' },
];

// Si el código no está en el mapa se muestra tal cual viene
const etiqueta = (mapa, valor) => mapa[valor] ?? valor;

const valoresDistintos = (filas, campo) =>
  [...new Set(filas.map((f) => String(f[campo] ?? '')).filter((v) => v !== ''))].sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true })
  );

const numero = (valor) => {
  const n = parseFloat(valor);
  return Number.isNaN(n) ? null : n;
};

const formatoDecimal = (valor) => {
  const n = numero(valor);
  return n === null ? '-' : n.toFixed(2);
};

const compararApellido = (a, b) =>
  String(a.apellido ?? '').localeCompare(String(b.apellido ?? ''), 'es') ||
  String(a.nombres ?? '').localeCompare(String(b.nombres ?? ''), 'es');

// Los alumnos sin promedio quedan siempre al final
const compararPromedio = (a, b, sentido) => {
  const pa = numero(a.promedioca);
  const pb = numero(b.promedioca);
  if (pa === null || pb === null) return (pa === null) - (pb === null);
  return (pa - pb) * sentido || compararApellido(a, b);
};

const COMPARADORES = {
  apellido_asc: compararApellido,
  apellido_desc: (a, b) => compararApellido(b, a),
  promedio_desc: (a, b) => compararPromedio(a, b, -1),
  promedio_asc: (a, b) => compararPromedio(a, b, 1),
};

const AlumnosInfo = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conclusion, setConclusion] = useState("");
  const [habilitado, setHabilitado] = useState(false);
  const [propuestas, setPropuestas] = useState([]);
  const [loadingConclusion, setLoadingConclusion] = useState(false);

  const [ubicacion, setUbicacion] = useState(TODAS);
  const [propuesta, setPropuesta] = useState(TODAS);
  const [calidad, setCalidad] = useState(TODAS);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('apellido_asc');
  const [pagina, setPagina] = useState(1);

  const generarPropuestas = (alumnosDat) => {
    const propuestasMap = new Map();

    alumnosDat.forEach((alumno) => {
      const propuestaId = alumno.propuesta;

      if (propuestasMap.has(propuestaId)) {
        const propuestaExistente = propuestasMap.get(propuestaId);
        if (propuestaExistente) {
          propuestaExistente.totali += 1;
        }
      } else {
        propuestasMap.set(propuestaId, {
          propuesta: propuestaId.toString(),
          totali: 1,
        });
      }
    });

    return Array.from(propuestasMap.values());
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await traerDatosinformacionAlumnos();
        // El servicio devuelve "error" (texto) cuando la llamada falla
        if (!Array.isArray(response)) throw new Error('Respuesta inválida del servidor');
        setAlumnos(response);
        const propuestasGeneradas = generarPropuestas(response);
        setPropuestas(propuestasGeneradas);
      } catch (err) {
        console.error("Error al cargar los datos", err);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };
    setHabilitado(false);
    fetchData();
  }, []);

  useEffect(() => {
    const fetchConclusion = async (propuestas) => {
      setLoadingConclusion(true);
      try {
        const conclusion = await analizarDatosAlumnos(propuestas);
        setConclusion(conclusion);
      } catch (err) {
        console.error("Error al obtener la conclusión:", err);
        setConclusion("No se pudo obtener la conclusión.");
      } finally {
        setLoadingConclusion(false);
      }
    };

    if (propuestas.length > 0 && habilitado) {
      fetchConclusion(propuestas);
    }
  }, [propuestas, habilitado]);

  const opcionesUbicacion = useMemo(() => valoresDistintos(alumnos, 'ubicacion'), [alumnos]);
  const opcionesPropuesta = useMemo(() => valoresDistintos(alumnos, 'propuesta'), [alumnos]);

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return alumnos
      .filter((a) => ubicacion === TODAS || String(a.ubicacion) === ubicacion)
      .filter((a) => propuesta === TODAS || String(a.propuesta) === propuesta)
      .filter((a) => calidad === TODAS || String(a.calidad ?? '').trim() === calidad)
      .filter(
        (a) =>
          !texto ||
          [a.apellido, a.nombres, a.legajo, a.nro_documento].some((v) =>
            String(v ?? '').toLowerCase().includes(texto)
          )
      )
      .sort(COMPARADORES[orden]);
  }, [alumnos, ubicacion, propuesta, calidad, busqueda, orden]);

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const alumnosPagina = alumnosFiltrados.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA,
    paginaActual * FILAS_POR_PAGINA
  );

  // Cualquier cambio de filtro u orden vuelve a la primera página
  const alCambiar = (setter) => (e) => {
    setter(e.target.value);
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setUbicacion(TODAS);
    setPropuesta(TODAS);
    setCalidad(TODAS);
    setBusqueda('');
    setPagina(1);
  };

  // Exporta lo que se está viendo: filtrado y ordenado, todas las páginas
  const exportToCSV = () => {
    const csv = Papa.unparse(alumnosFiltrados);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "alumnos.csv");
  };

  const claseCampo = "w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const claseEtiqueta = "block mb-1 text-sm font-medium text-gray-700";
  const claseTh = "px-3 py-2 text-left font-semibold whitespace-nowrap";
  const claseThNum = "px-3 py-2 text-right font-semibold whitespace-nowrap";
  const claseTd = "px-3 py-2 whitespace-nowrap";
  const claseTdNum = "px-3 py-2 text-right tabular-nums whitespace-nowrap";
  const clasePaginador = "px-3 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Información de Alumnos</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          {/* Filtros y orden */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-3 p-3 bg-gray-100 rounded-lg">
            <div>
              <label htmlFor="ubicacion" className={claseEtiqueta}>Ubicación</label>
              <select id="ubicacion" value={ubicacion} onChange={alCambiar(setUbicacion)} className={claseCampo}>
                <option value={TODAS}>Todas</option>
                {opcionesUbicacion.map((u) => (
                  <option key={u} value={u}>{etiqueta(UBICACIONES, u)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="propuesta" className={claseEtiqueta}>Propuesta</label>
              <select id="propuesta" value={propuesta} onChange={alCambiar(setPropuesta)} className={claseCampo}>
                <option value={TODAS}>Todas</option>
                {opcionesPropuesta.map((p) => (
                  <option key={p} value={p}>{etiqueta(PROPUESTAS, p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="calidad" className={claseEtiqueta}>Calidad</label>
              <select id="calidad" value={calidad} onChange={alCambiar(setCalidad)} className={claseCampo}>
                <option value={TODAS}>Todas</option>
                {Object.entries(CALIDADES).map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>{codigo} - {nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="orden" className={claseEtiqueta}>Ordenar por</label>
              <select id="orden" value={orden} onChange={alCambiar(setOrden)} className={claseCampo}>
                {ORDENES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="busqueda" className={claseEtiqueta}>Buscar</label>
              <input
                id="busqueda"
                type="search"
                value={busqueda}
                onChange={alCambiar(setBusqueda)}
                placeholder="Apellido, nombre, legajo o documento"
                className={claseCampo}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm text-gray-700">
              {alumnosFiltrados.length} de {alumnos.length} alumnos
            </p>
            <div className="flex gap-2">
              <button
                onClick={limpiarFiltros}
                className="border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg"
              >
                Limpiar filtros
              </button>
              <button
                onClick={exportToCSV}
                disabled={alumnosFiltrados.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Tabla de Alumnos */}
          <div className="max-h-150 overflow-auto border border-gray-300 rounded-lg shadow-lg">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-200 text-gray-700">
                <tr>
                  <th className={claseTh}>Legajo</th>
                  <th className={claseTh}>Nro Doc</th>
                  <th className={claseTh}>Apellido</th>
                  <th className={claseTh}>Nombres</th>
                  <th className={claseTh}>Ubicación</th>
                  <th className={claseTh}>Propuesta</th>
                  <th className={claseTh}>Calidad</th>
                  <th className={claseTh}>Plan</th>
                  <th className={claseTh}>Versión Plan</th>
                  <th className={claseThNum}>Año Ingr.</th>
                  <th className={claseThNum}>Promedio</th>
                  <th className={claseThNum}>Coeficiente</th>
                  <th className={claseThNum}>Perdidas Reg.</th>
                  <th className={claseTh}>Ultima Perd.</th>
                </tr>
              </thead>
              <tbody>
                {alumnosPagina.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-gray-500">
                      No hay alumnos para los filtros elegidos.
                    </td>
                  </tr>
                ) : (
                  alumnosPagina.map((alumno, index) => (
                    <tr key={index} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 border-t border-gray-200">
                      <td className={claseTd}>{alumno.legajo}</td>
                      <td className={claseTd}>{alumno.nro_documento}</td>
                      <td className={`${claseTd} font-medium`}>{alumno.apellido}</td>
                      <td className={claseTd}>{alumno.nombres}</td>
                      <td className={claseTd}>{etiqueta(UBICACIONES, alumno.ubicacion)}</td>
                      <td className={claseTd}>{etiqueta(PROPUESTAS, alumno.propuesta)}</td>
                      <td className={claseTd}>{etiqueta(CALIDADES, String(alumno.calidad ?? '').trim())}</td>
                      <td className={claseTd}>{alumno.plan}</td>
                      <td className={claseTd}>{alumno.plan_version}</td>
                      <td className={claseTdNum}>{alumno.anio_ingreso_pro}</td>
                      <td className={claseTdNum}>{formatoDecimal(alumno.promedioca)}</td>
                      <td className={claseTdNum}>{formatoDecimal(alumno.coef_tcarrera)}</td>
                      <td className={claseTdNum}>{alumno.perdidasreg}</td>
                      <td className={claseTd}>{alumno.ultimaperdireg}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-end gap-3 mt-3 text-sm">
            <button className={clasePaginador} disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>
              Anterior
            </button>
            <span>Página {paginaActual} de {totalPaginas}</span>
            <button className={clasePaginador} disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)}>
              Siguiente
            </button>
          </div>

          {/* Resumen de Propuestas */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Propuestas Totales</h3>
            {propuestas.length === 0 ? (
              <p>No hay propuestas disponibles.</p>
            ) : (
              <ul className="list-disc pl-5">
                {propuestas.map((prop) => (
                  <li key={prop.propuesta}>
                    {etiqueta(PROPUESTAS, prop.propuesta)}: {prop.totali} alumnos
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conclusión del Asistente */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Conclusión del Asistente</h3>
            {loadingConclusion ? (
              <p>Analizando propuestas...</p>
            ) : (
              <textarea
                className="w-full p-2 border rounded-lg"
                rows={4}
                value={conclusion}
                readOnly
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AlumnosInfo;

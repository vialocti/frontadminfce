import React, { useState } from "react";
import {
  procesoIngresoInfoInicial,
  procesoInicialReinscriptos
} from "../../services/servicesAlumnos";

const InicialRei=() => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tipoO, setTipoO]=useState('C')
  const [etapa, setEtapa]= useState('I')

  const handleProcess = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await procesoInicialReinscriptos(year);
      console.log(result.data);
      setMessage("Proceso inicial ejecutado con éxito.");
    } catch (error) {
      setMessage("Error al ejecutar el proceso inicial.");
      console.error(error);
    }
    setLoading(false);
  };

  const handleInsertarInfo = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await procesoIngresoInfoInicial(tipoO, etapa);
      console.log(result.data);
      setMessage("Información insertada con éxito.");
    } catch (error) {
      setMessage("Error al insertar información.");
      console.error(error);
    }
    setLoading(false);
  };

  const handleEjecutarTodo = async () => {
    setLoading(true);
    setMessage("Paso 1/2: Ejecutando Proceso Inicial (Reinscriptos)...");
    try {
      const resultReinscriptos = await procesoInicialReinscriptos(year);
      if (!resultReinscriptos || resultReinscriptos === "error" || resultReinscriptos.error) {
        setMessage("Error en el Proceso Inicial (Reinscriptos). Se detuvo el proceso.");
        setLoading(false);
        return;
      }
      console.log(resultReinscriptos.data ?? resultReinscriptos);

      setMessage("Paso 2/2: Insertando Información...");
      const resultInfo = await procesoIngresoInfoInicial(tipoO, etapa);
      if (!resultInfo || resultInfo === "error" || resultInfo.error) {
        setMessage("Proceso Inicial completado, pero falló al Insertar Información.");
        setLoading(false);
        return;
      }
      console.log(resultInfo.data ?? resultInfo);

      setMessage("Proceso completo ejecutado con éxito: Reinscriptos + Insertar Info.");
    } catch (error) {
      console.error(error);
      setMessage("Error inesperado al ejecutar el proceso completo.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto bg-white p-6">
      {/* Sección Proceso Completo Automatizado */}
      <div className="max-w-5xl rounded-lg shadow-md p-6 mb-6 border-2 border-blue-600">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Proceso Completo</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ejecuta Reinscriptos e Insertar Info en un solo paso, usando el año y la configuración seleccionados abajo.
        </p>
        <button
          className="w-full bg-blue-800 text-white p-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-50"
          onClick={handleEjecutarTodo}
          disabled={loading}
        >
          {loading ? "Ejecutando Proceso Completo..." : "Ejecutar Proceso Completo"}
        </button>
      </div>

      {/* Sección Seleccionar Año y Proceso Inicial */}
      <div className="max-w-5xl rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Seleccionar Año</h2>
        <select
          className="w-full p-2 border rounded-lg focus:ring focus:ring-blue-300"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[...Array(10)].map((_, index) => (
            <option key={index} value={currentYear - index}>
              {currentYear - index}
            </option>
          ))}
        </select>

        <button
          className="w-full mt-4 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
          onClick={handleProcess}
          disabled={loading}
        >
          {loading ? "Proceso Inicial: Procesando..." : "Ejecutar Proceso Inicial"}
        </button>
      </div>

      {/* Sección Insertar Información */}
      <div className="max-w-5xl rounded-lg shadow-md p-6">

      <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Operación
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={tipoO}
              onChange={(e) => setTipoO(e.target.value)}
            >
              <option value="C">Completo</option>
              <option value="P">Parcial</option>
            </select>
      </div>

       <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Etapa
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
            >    
              <option value="I">Inicial</option>
              <option value="A">Actualizacion</option>
          
            </select>
      </div>


        <button
          className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition"
          onClick={handleInsertarInfo}
          disabled={loading}
        >
          {loading ? "Insertar Info: Procesando..." : "Insertar Info"}
        </button>
      </div>

      {/* Mensaje de estado */}
      {message && <p className="mt-3 text-center text-gray-600">{message}</p>}
    </div>
  );
};

export default InicialRei;

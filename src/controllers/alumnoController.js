const db = require("../config/database");
const AlumnoModel = require("../models/Alumno");
const PersonaModel = require("../models/Persona");
const pool = require("../config/database");

const listarAlumnosConApoderados = async (req, res) => {
  try {
    const anio = req.params.anio;
    const grado = req.params.grado;

    const [alumnos] = await db.pool.query(
      `
      SELECT
        e.id AS alumno_id,
        p.dni AS alumno_dni,
        p.nombre AS alumno_nombre,
        p.ap_p AS alumno_apellido_paterno,
        p.ap_m AS alumno_apellido_materno,
        p.fecha_nacimiento,

        pa.dni AS apoderado_dni,
        pa.nombre AS apoderado_nombre,
        pa.ap_p AS apoderado_apellido_paterno,
        pa.ap_m AS apoderado_apellido_materno,
        ap.telefono,
        ap.relacion,

        g.descripcion AS grado,
        m.fecha_matricula

      FROM alumno e
      JOIN persona p ON e.id_persona = p.id
      JOIN alumno_apoderado ea ON ea.id_alumno = e.id
      JOIN apoderado ap ON ap.id = ea.id_apoderado
      JOIN persona pa ON pa.id = ap.id_persona
      JOIN matricula m ON m.id_alumno = e.id
      JOIN grado g ON g.id = m.id_grado

      WHERE YEAR(m.fecha_matricula) = ? AND g.id = ?
      LIMIT 100
      `,
      [anio, grado]
    );

    res.status(200).json(alumnos);
  } catch (error) {
    console.error("Error al listar alumnos:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const verMiAsistencia = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id_persona = req.user.id_persona;
    // Buscar el alumno por id_persona
    const alumno = await AlumnoModel.buscarPorIdPersona(connection, id_persona);
    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el alumno."
      });
    }
    // Buscar asistencias del alumno, incluyendo datos de curso y grado
    const [asistencias] = await connection.query(
      `SELECT a.*, dc.id_curso, c.nombre AS curso, dc.id_grado, g.descripcion AS grado
       FROM asistencia a
       JOIN docente_curso dc ON dc.id = a.id_docente_curso
       JOIN curso c ON c.id = dc.id_curso
       JOIN grado g ON g.id = dc.id_grado
       WHERE a.id_alumno = ?
       ORDER BY a.fecha DESC, c.nombre, g.descripcion`,
      [alumno.id]
    );
    return res.status(200).json({
      success: true,
      data: asistencias
    });
  } catch (error) {
    console.error("Error al ver asistencia del alumno:", error);
    res.status(500).json({
      success: false,
      message: "Error al ver asistencia del alumno.",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener datos del estudiante autenticado (solo lectura)
const obtenerMisDatos = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id_persona = req.user.id_persona;
    
    // Obtener datos completos del alumno
    const datosAlumno = await AlumnoModel.obtenerDatosCompletosPorIdPersona(connection, id_persona);
    
    if (!datosAlumno) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el alumno."
      });
    }

    return res.status(200).json({
      success: true,
      data: datosAlumno
    });
  } catch (error) {
    console.error("Error al obtener datos del alumno:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del alumno.",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener datos de un estudiante específico (para directores)
const obtenerDatosEstudiante = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    
    // Obtener datos completos del alumno
    const datosAlumno = await AlumnoModel.obtenerDatosCompletos(connection, id);
    
    if (!datosAlumno) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el alumno."
      });
    }

    return res.status(200).json({
      success: true,
      data: datosAlumno
    });
  } catch (error) {
    console.error("Error al obtener datos del alumno:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del alumno.",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Editar datos de un estudiante específico (solo para directores)
const editarDatosEstudiante = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { dni, nombre, ap_p, ap_m, fecha_nacimiento } = req.body;

    // Verificar que el alumno existe
    const alumno = await AlumnoModel.buscarPorId(connection, id);
    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: "No se encontró el alumno."
      });
    }

    // Obtener datos actuales de la persona
    const personaActual = await PersonaModel.buscarPorId(connection, alumno.id_persona);
    if (!personaActual) {
      return res.status(404).json({
        success: false,
        message: "No se encontró la persona."
      });
    }

    // Usar datos actuales si no se proporcionan nuevos
    const dniFinal = dni || personaActual.dni;
    const nombreFinal = nombre || personaActual.nombre;
    const ap_pFinal = ap_p || personaActual.ap_p;
    const ap_mFinal = ap_m || personaActual.ap_m;
    const fechaNacimientoFinal = fecha_nacimiento || personaActual.fecha_nacimiento;

    // Verificar que el DNI no esté en uso por otra persona (solo si se está cambiando)
    if (dni && dni !== personaActual.dni) {
      const personaExistente = await PersonaModel.buscarPorDni(connection, dni);
      if (personaExistente && personaExistente.id !== alumno.id_persona) {
        return res.status(400).json({
          success: false,
          message: "El DNI ya está registrado por otra persona."
        });
      }
    }

    // Actualizar datos de la persona
    const actualizado = await PersonaModel.actualizar(
      connection, 
      alumno.id_persona, 
      dniFinal, 
      nombreFinal, 
      ap_pFinal, 
      ap_mFinal, 
      fechaNacimientoFinal
    );

    if (!actualizado) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar los datos."
      });
    }

    // Obtener datos actualizados
    const datosActualizados = await AlumnoModel.obtenerDatosCompletos(connection, id);

    return res.status(200).json({
      success: true,
      message: "Datos actualizados exitosamente.",
      data: datosActualizados
    });
  } catch (error) {
    console.error("Error al editar datos del alumno:", error);
    res.status(500).json({
      success: false,
      message: "Error al editar datos del alumno.",
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  listarAlumnosConApoderados,
  verMiAsistencia,
  obtenerMisDatos,
  obtenerDatosEstudiante,
  editarDatosEstudiante,
};

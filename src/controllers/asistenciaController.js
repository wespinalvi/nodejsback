const pool = require('../config/database');

// Marcar asistencia (falta o presente)
const marcarAsistencia = async (req, res) => {
  let connection;
  try {
    const { id_alumno, id_curso, id_grado, fecha, estado } = req.body;
    const id_persona = req.user.id_persona;

    connection = await pool.getConnection();

    // Obtener el id_docente desde docente_curso
    const [docenteCursoRow] = await connection.query(
      'SELECT id_docente FROM docente_curso WHERE id_curso = ? AND id_grado = ?',
      [id_curso, id_grado]
    );

    if (!docenteCursoRow || docenteCursoRow.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No se encontró el docente para este curso y grado' 
      });
    }

    const id_docente = docenteCursoRow[0].id_docente;

    // Verificar si ya existe una asistencia para este alumno en esta fecha
    const [existingRow] = await connection.query(
      'SELECT id FROM asistencia WHERE id_alumno = ? AND fecha = ?',
      [id_alumno, fecha]
    );

    if (existingRow && existingRow.length > 0) {
      // Actualizar asistencia existente
      await connection.query(
        'UPDATE asistencia SET id_docente = ?, estado = ? WHERE id_alumno = ? AND fecha = ?',
        [id_docente, estado, id_alumno, fecha]
      );
    } else {
      // Crear nueva asistencia
      await connection.query(
        'INSERT INTO asistencia (id_alumno, id_docente, fecha, estado) VALUES (?, ?, ?, ?)',
        [id_alumno, id_docente, fecha, estado]
      );
    }

    res.json({
      success: true,
      message: 'Asistencia marcada exitosamente',
      data: {
        id_alumno,
        id_docente,
        fecha,
        estado
      }
    });

  } catch (error) {
    console.error('Error al marcar asistencia:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al marcar la asistencia',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener asistencias por docente
const obtenerAsistenciasPorDocente = async (req, res) => {
  let connection;
  try {
    const id_persona = req.user.id_persona;
    const { fecha } = req.query;

    connection = await pool.getConnection();

    const [docenteRow] = await connection.query(
      'SELECT id FROM docente WHERE id_persona = ?',
      [id_persona]
    );

    if (!docenteRow || docenteRow.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No se encontró el docente' 
      });
    }

    const id_docente = docenteRow[0].id;

    let query = `
      SELECT a.*, 
             p.nombre, p.ap_p, p.ap_m,
             al.id as id_alumno,
             a.docente_id as id_docente_marcador,
             CONCAT(p.nombre, ' ', p.ap_p, ' ', p.ap_m) as nombre_completo_alumno
      FROM asistencia a
      JOIN alumno al ON a.id_alumno = al.id
      JOIN persona p ON al.id_persona = p.id
      WHERE a.docente_id = ?
    `;
    let params = [id_docente];

    if (fecha) {
      query += ' AND a.fecha = ?';
      params.push(fecha);
    }

    query += ' ORDER BY a.fecha DESC, p.ap_p, p.ap_m, p.nombre';

    const [rows] = await connection.query(query, params);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las asistencias',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener asistencias por alumno
const obtenerAsistenciasPorAlumno = async (req, res) => {
  let connection;
  try {
    const id_persona = req.user.id_persona;
    const { fecha } = req.query;

    connection = await pool.getConnection();

    // Obtener el id del alumno basado en la persona autenticada
    const [alumnoRow] = await connection.query(
      'SELECT id FROM alumno WHERE id_persona = ?',
      [id_persona]
    );

    if (!alumnoRow || alumnoRow.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No se encontró el alumno' 
      });
    }

    const id_alumno = alumnoRow[0].id;

    let query = `
      SELECT a.*, 
             pd.nombre as nombre_docente, pd.ap_p as ap_p_docente, pd.ap_m as ap_m_docente,
             CONCAT(pd.nombre, ' ', pd.ap_p, ' ', pd.ap_m) as nombre_completo_docente
      FROM asistencia a
      LEFT JOIN docente_curso dc ON a.id_docente_curso = dc.id
      LEFT JOIN docente d ON dc.id_docente = d.id
      LEFT JOIN persona pd ON d.id_persona = pd.id
      WHERE a.id_alumno = ?
    `;
    let params = [id_alumno];

    if (fecha) {
      query += ' AND a.fecha = ?';
      params.push(fecha);
    }

    query += ' ORDER BY a.fecha DESC';

    const [rows] = await connection.query(query, params);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error al obtener asistencias del alumno:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las asistencias',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener faltas disponibles para justificar
const obtenerFaltasParaJustificar = async (req, res) => {
  let connection;
  try {
    const id_persona = req.user.id_persona;
    const { fecha } = req.query;

    connection = await pool.getConnection();

    // Obtener el id del alumno basado en la persona autenticada
    const [alumnoRow] = await connection.query(
      'SELECT id FROM alumno WHERE id_persona = ?',
      [id_persona]
    );

    if (!alumnoRow || alumnoRow.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No se encontró el alumno' 
      });
    }

    const id_alumno = alumnoRow[0].id;

    let query = `
      SELECT a.id, a.id_docente_curso, a.fecha, a.asistio,
             pd.nombre as nombre_docente, pd.ap_p as ap_p_docente, pd.ap_m as ap_m_docente,
             CONCAT(pd.nombre, ' ', pd.ap_p, ' ', pd.ap_m) as nombre_completo_docente
      FROM asistencia a
      LEFT JOIN docente_curso dc ON a.id_docente_curso = dc.id
      LEFT JOIN docente d ON dc.id_docente = d.id
      LEFT JOIN persona pd ON d.id_persona = pd.id
      WHERE a.id_alumno = ? AND a.asistio = 0
    `;
    let params = [id_alumno];

    if (fecha) {
      query += ' AND a.fecha = ?';
      params.push(fecha);
    }

    query += ' ORDER BY a.fecha DESC';

    const [rows] = await connection.query(query, params);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error al obtener faltas para justificar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las faltas',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  marcarAsistencia,
  obtenerAsistenciasPorDocente,
  obtenerAsistenciasPorAlumno,
  obtenerFaltasParaJustificar
}; 
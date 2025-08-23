const pool = require('../config/database');

class Justificacion {
  // Crear una nueva justificación
  static async crear(justificacionData) {
    const connection = await pool.getConnection();
    try {
      const {
        id_alumno,
        id_docente,
        titulo,
        descripcion,
        tipo_justificacion,
        url_pdf,
        public_id_cloudinary,
        fecha_falta
      } = justificacionData;

      const [result] = await connection.query(
        `INSERT INTO justificaciones 
         (id_alumno, id_docente, titulo, descripcion, tipo_justificacion, url_pdf, public_id_cloudinary, fecha_falta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_alumno, id_docente, titulo, descripcion, tipo_justificacion, url_pdf, public_id_cloudinary, fecha_falta]
      );

      return result.insertId;
    } finally {
      connection.release();
    }
  }

  // Obtener justificaciones por alumno
  static async obtenerPorAlumno(id_alumno) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         WHERE j.id_alumno = ?
         ORDER BY j.fecha_subida DESC`,
        [id_alumno]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener justificaciones por docente
  static async obtenerPorDocente(id_docente) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         WHERE j.id_docente = ?
         ORDER BY j.fecha_subida DESC`,
        [id_docente]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener todas las justificaciones (para admin)
  static async obtenerTodas() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         ORDER BY j.fecha_subida DESC`
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener justificación por ID
  static async obtenerPorId(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         WHERE j.id = ?`,
        [id]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  // Actualizar estado de justificación
  static async actualizarEstado(id, estado, comentario_revision = null, id_docente = null) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        `UPDATE justificaciones 
         SET estado = ?, 
             comentario_revision = ?, 
             fecha_revision = CURRENT_TIMESTAMP,
             id_docente = COALESCE(?, id_docente)
         WHERE id = ?`,
        [estado, comentario_revision, id_docente, id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  // Eliminar justificación
  static async eliminar(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'DELETE FROM justificaciones WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  // Obtener justificaciones pendientes
  static async obtenerPendientes() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         WHERE j.estado = 'pendiente'
         ORDER BY j.fecha_subida ASC`
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener justificaciones por alumno con paginación
  static async obtenerPorAlumnoPaginado(id_alumno, limit = 5, offset = 0) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         WHERE j.id_alumno = ?
         ORDER BY j.fecha_subida DESC
         LIMIT ? OFFSET ?`,
        [id_alumno, limit, offset]
      );
      const [[{ total }]] = await connection.query(
        `SELECT COUNT(*) as total FROM justificaciones WHERE id_alumno = ?`,
        [id_alumno]
      );
      return { rows, total };
    } finally {
      connection.release();
    }
  }

  // Obtener justificaciones por docente con paginación y filtro por fecha_falta
  static async obtenerPorDocentePaginado(id_docente, limit = 5, offset = 0, fecha_inicio = null, fecha_fin = null) {
    const connection = await pool.getConnection();
    try {
      let where = "j.id_docente = ? AND j.id_docente IS NOT NULL";
      let params = [id_docente];

      if (fecha_inicio && fecha_fin) {
        where += " AND j.fecha_falta BETWEEN ? AND ?";
        params.push(fecha_inicio, fecha_fin);
      } else if (fecha_inicio) {
        where += " AND j.fecha_falta = ?";
        params.push(fecha_inicio);
      }

      const [rows] = await connection.query(
        `SELECT j.*, 
                pa.nombre as nombre_alumno,
                pd.nombre as nombre_docente
         FROM justificaciones j
         LEFT JOIN alumno a ON j.id_alumno = a.id
         LEFT JOIN persona pa ON a.id_persona = pa.id
         LEFT JOIN docente d ON j.id_docente = d.id
         LEFT JOIN persona pd ON d.id_persona = pd.id
         WHERE ${where}
         ORDER BY j.fecha_subida DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const [[{ total }]] = await connection.query(
        `SELECT COUNT(*) as total FROM justificaciones j WHERE ${where}`,
        params
      );
      return { rows, total };
    } finally {
      connection.release();
    }
  }
}

module.exports = Justificacion; 
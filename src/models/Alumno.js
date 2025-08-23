const db = require("../config/database");

class AlumnoModel {
  static async crear(connection, idPersona) {
    try {
      const [result] = await connection.execute(
        "INSERT INTO alumno (id_persona) VALUES (?)",
        [idPersona]
      );
      return result.insertId;
    } catch (error) {
      // Comprobar si ya existe un alumno con ese id_persona
      const [rows] = await connection.execute(
        "SELECT id FROM alumno WHERE id_persona = ?",
        [idPersona]
      );
      if (rows.length > 0) {
        return rows[0].id;
      }
      throw error;
    }
  }

  static async buscarPorIdPersona(connection, idPersona) {
    const [rows] = await connection.execute(
      "SELECT * FROM alumno WHERE id_persona = ?",
      [idPersona]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async buscarPorId(connection, id) {
    const [rows] = await connection.execute(
      "SELECT * FROM alumno WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async obtenerDatosCompletos(connection, idAlumno) {
    const [rows] = await connection.execute(
      `SELECT 
        a.id AS alumno_id,
        p.id AS persona_id,
        p.dni,
        p.nombre,
        p.ap_p,
        p.ap_m,
        p.fecha_nacimiento,
        p.created_at,
        p.updated_at
      FROM alumno a
      JOIN persona p ON a.id_persona = p.id
      WHERE a.id = ?`,
      [idAlumno]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async obtenerDatosCompletosPorIdPersona(connection, idPersona) {
    const [rows] = await connection.execute(
      `SELECT 
        a.id AS alumno_id,
        p.id AS persona_id,
        p.dni,
        p.nombre,
        p.ap_p,
        p.ap_m,
        p.fecha_nacimiento,
        p.created_at,
        p.updated_at
      FROM alumno a
      JOIN persona p ON a.id_persona = p.id
      WHERE p.id = ?`,
      [idPersona]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = AlumnoModel;

const db = require("../config/database");

class DocenteModel {
  static async crear(connection, idPersona) {
    const [result] = await connection.execute(
      "INSERT INTO docente (id_persona) VALUES (?)",
      [idPersona]
    );
    return result.insertId;
  }

  static async obtenerDatosCompletos(connection, id_docente) {
    const query = `
      SELECT 
        p.id as id_persona,
        p.dni,
        p.nombre,
        p.ap_p,
        p.ap_m,
        p.fecha_nacimiento,
        d.id as id_docente,
        GROUP_CONCAT(
          DISTINCT
          JSON_OBJECT(
            'id_curso', c.id,
            'nombre_curso', c.nombre,
            'id_grado', g.id,
            'descripcion_grado', g.descripcion
          )
          SEPARATOR ','
        ) as cursos
      FROM docente d
      INNER JOIN persona p ON d.id_persona = p.id
      LEFT JOIN docente_curso dc ON d.id = dc.id_docente
      LEFT JOIN curso c ON dc.id_curso = c.id
      LEFT JOIN grado g ON dc.id_grado = g.id
      WHERE d.id = ?
      GROUP BY d.id, p.id
    `;

    const [rows] = await connection.execute(query, [id_docente]);

    if (rows.length === 0) {
      return null;
    }

    const docente = rows[0];

    // Convertir la cadena de cursos a un array de objetos
    if (docente.cursos) {
      docente.cursos = docente.cursos
        .split(",")
        .map((curso) => JSON.parse(curso));
    } else {
      docente.cursos = [];
    }

    return docente;
  }

  static async listar(connection) {
    const [rows] = await connection.execute("SELECT * FROM docente");
    return rows;
  }

  static async buscarPorId(connection, id) {
    const [rows] = await connection.execute(
      "SELECT * FROM docente WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async obtenerDocentesConCursos(connection, anio = null) {
    const query = `
      SELECT 
        d.id AS docente_id,
        p.dni,
        CONCAT(p.nombre, ' ', p.ap_p, ' ', p.ap_m) AS nombre_completo,
        d.created_at,
        dc.id AS docente_curso_id,
        c.nombre AS curso,
        g.descripcion AS grado
      FROM docente d
      JOIN persona p ON d.id_persona = p.id
      LEFT JOIN docente_curso dc ON dc.id_docente = d.id
      LEFT JOIN curso c ON dc.id_curso = c.id
      LEFT JOIN grado g ON dc.id_grado = g.id
      ${anio ? "WHERE YEAR(d.created_at) = ?" : ""}
      ORDER BY p.ap_p, p.ap_m, p.nombre
    `;

    const [rows] = await connection.execute(query, anio ? [anio] : []);
    return rows;
  }

  static async buscarPorIdPersona(connection, idPersona) {
    const [rows] = await connection.execute(
      "SELECT * FROM docente WHERE id_persona = ?",
      [idPersona]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = DocenteModel;

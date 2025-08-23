const db = require("../config/database");

class MatriculaModel {
  static async crear(
    connection,
    idAlumno,
    idGrado,
    dniEntregado,
    certificadoEstudiosEntregado
  ) {
    const [result] = await connection.execute(
      "INSERT INTO matricula (id_alumno, id_grado, dni_entregado, certificado_estudios) VALUES (?, ?, ?, ?)",
      [idAlumno, idGrado, dniEntregado, certificadoEstudiosEntregado]
    );
    return result.insertId;
  }

  static async buscarPorAlumnoGrado(connection, idAlumno, idGrado) {
    const [rows] = await connection.execute(
      "SELECT * FROM matricula WHERE id_alumno = ? AND id_grado = ?",
      [idAlumno, idGrado]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}
module.exports = MatriculaModel;

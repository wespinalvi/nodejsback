const db = require("../config/database");

class CuotasModel {
  static async crear(
    connection,
    idMatricula,
    matriculaPrecio,
    matriculaEstado,
    c1, c1_estado,
    c2, c2_estado,
    c3, c3_estado,
    c4, c4_estado,
    c5, c5_estado,
    c6, c6_estado,
    c7, c7_estado,
    c8, c8_estado,
    c9, c9_estado,
    c10, c10_estado
  ) {
    const [result] = await connection.execute(
      `INSERT INTO cuotas (
        id_matricula, matricula_precio, matricula_estado,
        c1, c1_estado, c2, c2_estado, c3, c3_estado, c4, c4_estado, c5, c5_estado,
        c6, c6_estado, c7, c7_estado, c8, c8_estado, c9, c9_estado, c10, c10_estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idMatricula, matriculaPrecio, matriculaEstado,
        c1, c1_estado,
        c2, c2_estado,
        c3, c3_estado,
        c4, c4_estado,
        c5, c5_estado,
        c6, c6_estado,
        c7, c7_estado,
        c8, c8_estado,
        c9, c9_estado,
        c10, c10_estado
      ]
    );
    return result.insertId;
  }

  // Nuevo método para listar cuotas por id_persona (alumno autenticado)
  static async listarPorIdPersona(idPersona) {
    // 1. Buscar id del alumno
    const [alumnoRows] = await db.pool.query(
      'SELECT id FROM alumno WHERE id_persona = ?',
      [idPersona]
    );
    if (alumnoRows.length === 0) return null;
    const idAlumno = alumnoRows[0].id;

    // 2. Buscar matrículas del alumno
    const [matriculaRows] = await db.pool.query(
      'SELECT id FROM matricula WHERE id_alumno = ?',
      [idAlumno]
    );
    if (matriculaRows.length === 0) return null;
    // Si hay varias matrículas, devolvemos todas las cuotas
    const matriculaIds = matriculaRows.map(row => row.id);

    // 3. Buscar cuotas de esas matrículas
    const [cuotasRows] = await db.pool.query(
      `SELECT * FROM cuotas WHERE id_matricula IN (${matriculaIds.map(() => '?').join(',')})`,
      matriculaIds
    );
    return cuotasRows;
  }

  // Nuevo método para obtener cuotas con datos completos por DNI y año
  static async obtenerCuotasCompletasPorDniYAnio(dni, anio) {
    const query = `
      SELECT 
        -- Datos del estudiante
        p.dni,
        p.nombre,
        p.ap_p,
        p.ap_m,
        p.fecha_nacimiento,
        
        -- Datos de la matrícula
        m.id AS id_matricula,
        m.fecha_matricula,
        m.dni_entregado,
        m.certificado_estudios,
        
        -- Datos del grado
        g.id AS id_grado,
        g.descripcion AS grado,
        
        -- Datos de las cuotas
        c.id AS id_cuota,
        c.matricula_precio,
        c.matricula_estado,
        c.c1, c.c1_estado,
        c.c2, c.c2_estado,
        c.c3, c.c3_estado,
        c.c4, c.c4_estado,
        c.c5, c.c5_estado,
        c.c6, c.c6_estado,
        c.c7, c.c7_estado,
        c.c8, c.c8_estado,
        c.c9, c.c9_estado,
        c.c10, c.c10_estado,
        c.created_at,
        c.updated_at
        
      FROM persona p
      INNER JOIN alumno a ON a.id_persona = p.id
      INNER JOIN matricula m ON m.id_alumno = a.id
      INNER JOIN grado g ON g.id = m.id_grado
      INNER JOIN cuotas c ON c.id_matricula = m.id
      WHERE p.dni = ? AND YEAR(m.fecha_matricula) = ?
      ORDER BY m.fecha_matricula DESC, c.created_at DESC
    `;
    
    const [rows] = await db.pool.query(query, [dni, anio]);
    return rows;
  }

  // Método para actualizar el estado de una cuota específica
  static async actualizarEstadoCuota(idCuota, tipoCuota, nuevoEstado) {
    let campoEstado;
    let campoMonto;
    
    // Determinar qué campo actualizar según el tipo de cuota
    switch (tipoCuota.toLowerCase()) {
      case 'matricula':
        campoEstado = 'matricula_estado';
        break;
      case '1':
      case 'c1':
        campoEstado = 'c1_estado';
        break;
      case '2':
      case 'c2':
        campoEstado = 'c2_estado';
        break;
      case '3':
      case 'c3':
        campoEstado = 'c3_estado';
        break;
      case '4':
      case 'c4':
        campoEstado = 'c4_estado';
        break;
      case '5':
      case 'c5':
        campoEstado = 'c5_estado';
        break;
      case '6':
      case 'c6':
        campoEstado = 'c6_estado';
        break;
      case '7':
      case 'c7':
        campoEstado = 'c7_estado';
        break;
      case '8':
      case 'c8':
        campoEstado = 'c8_estado';
        break;
      case '9':
      case 'c9':
        campoEstado = 'c9_estado';
        break;
      case '10':
      case 'c10':
        campoEstado = 'c10_estado';
        break;
      default:
        throw new Error('Tipo de cuota no válido');
    }

    const query = `UPDATE cuotas SET ${campoEstado} = ? WHERE id = ?`;
    const [result] = await db.pool.query(query, [nuevoEstado ? 1 : 0, idCuota]);
    
    if (result.affectedRows === 0) {
      throw new Error('No se encontró la cuota especificada');
    }
    
    return result.affectedRows > 0;
  }

  // Actualizar estado de cuota por webhook usando DNI, año y tipo de cuota
  static async actualizarEstadoYPrecioCuota(idCuota, tipoCuota, nuevoEstado, nuevoMonto = 0) {
    let campoEstado, campoMonto;
  
    switch (tipoCuota.toLowerCase()) {
      case 'matricula':
        campoEstado = 'matricula_estado';
        campoMonto = 'matricula_precio';
        break;
      case '1': case 'c1':
        campoEstado = 'c1_estado';
        campoMonto = 'c1';
        break;
      case '2': case 'c2':
        campoEstado = 'c2_estado';
        campoMonto = 'c2';
        break;
      case '3': case 'c3':
        campoEstado = 'c3_estado';
        campoMonto = 'c3';
        break;
      case '4': case 'c4':
        campoEstado = 'c4_estado';
        campoMonto = 'c4';
        break;
      case '5': case 'c5':
        campoEstado = 'c5_estado';
        campoMonto = 'c5';
        break;
      case '6': case 'c6':
        campoEstado = 'c6_estado';
        campoMonto = 'c6';
        break;
      case '7': case 'c7':
        campoEstado = 'c7_estado';
        campoMonto = 'c7';
        break;
      case '8': case 'c8':
        campoEstado = 'c8_estado';
        campoMonto = 'c8';
        break;
      case '9': case 'c9':
        campoEstado = 'c9_estado';
        campoMonto = 'c9';
        break;
      case '10': case 'c10':
        campoEstado = 'c10_estado';
        campoMonto = 'c10';
        break;
      default:
        throw new Error('Tipo de cuota no válido');
    }
  
    const query = `UPDATE cuotas SET ${campoEstado} = ?, ${campoMonto} = ? WHERE id = ?`;
    const [result] = await db.pool.query(query, [nuevoEstado ? 1 : 0, nuevoMonto, idCuota]);
  
    if (result.affectedRows === 0) {
      throw new Error('No se encontró la cuota especificada');
    }
  
    return true;
  }
  
  static async actualizarEstadoCuotaPorWebhook(dni, anio, tipo_cuota) {
    const cuotas = await this.obtenerCuotasCompletasPorDniYAnio(dni, anio);
    if (!cuotas || cuotas.length === 0) return false;
    const cuota = cuotas[0];
    const idCuota = cuota.id_cuota;
    return this.actualizarEstadoYPrecioCuota(idCuota, tipo_cuota, true, 0);
  }
  

  // Método para obtener una cuota específica por ID
  static async obtenerCuotaPorId(idCuota) {
    const query = `
      SELECT 
        c.*,
        p.dni,
        p.nombre,
        p.ap_p,
        p.ap_m,
        g.descripcion AS grado,
        m.fecha_matricula
      FROM cuotas c
      INNER JOIN matricula m ON m.id = c.id_matricula
      INNER JOIN alumno a ON a.id = m.id_alumno
      INNER JOIN persona p ON p.id = a.id_persona
      INNER JOIN grado g ON g.id = m.id_grado
      WHERE c.id = ?
    `;
    
    const [rows] = await db.pool.query(query, [idCuota]);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = CuotasModel;

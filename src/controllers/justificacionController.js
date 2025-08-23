const cloudinary = require('cloudinary').v2;
const Justificacion = require('../models/Justificacion');
const pool = require('../config/database');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'dszdc6rh8', // Cambia esto por tu cloud name real
  api_key: '919272483314272',
  api_secret: 's4hxHUmwJSfav_PB0TnHjZoHIVc'
});

// Subir PDF a Cloudinary
const subirPDF = async (file) => {
  try {
    const base64String = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${base64String}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'raw',
      folder: 'justificaciones',
      public_id: `justificacion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      format: 'pdf',
      access_mode: 'public',
      delivery_type: 'upload'
    });

    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Error al subir PDF a Cloudinary:', error);
    throw new Error('Error al subir el archivo PDF');
  }
};

// Crear nueva justificación
const crearJustificacion = async (req, res) => {
  let connection;
  try {
    const { titulo, descripcion, tipo_justificacion, id_asistencia } = req.body;
    const id_persona = req.user.id_persona;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe subir un archivo PDF' 
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se permiten archivos PDF' 
      });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        message: 'El archivo no puede ser mayor a 10MB' 
      });
    }

    connection = await pool.getConnection();

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

    // Obtener la asistencia y el docente correspondiente
    let id_docente_correcto = null;
    let fecha_falta = null;
    
    if (id_asistencia) {
      const [asistenciaRow] = await connection.query(
        `SELECT a.id_docente_curso, a.fecha, dc.id_docente
         FROM asistencia a
         LEFT JOIN docente_curso dc ON a.id_docente_curso = dc.id
         WHERE a.id = ? AND a.id_alumno = ?`,
        [id_asistencia, id_alumno]
      );

      console.log('Buscando asistencia con:', { id_asistencia, id_alumno });
      console.log('Resultado:', asistenciaRow);

      if (asistenciaRow && asistenciaRow.length > 0) {
        id_docente_correcto = asistenciaRow[0].id_docente;
        fecha_falta = asistenciaRow[0].fecha;
      }
    }

    const { url, public_id } = await subirPDF(req.file);

    const justificacionData = {
      id_alumno,
      id_docente: id_docente_correcto,
      titulo,
      descripcion: descripcion || '',
      tipo_justificacion: tipo_justificacion || 'otro',
      url_pdf: url,
      public_id_cloudinary: public_id,
      fecha_falta: fecha_falta
    };

    const justificacionId = await Justificacion.crear(justificacionData);

    res.status(201).json({
      success: true,
      message: 'Justificación creada exitosamente',
      data: {
        id: justificacionId,
        titulo,
        url_pdf: url,
        estado: 'pendiente',
        id_docente: id_docente_correcto,
        id_asistencia: id_asistencia
      }
    });

  } catch (error) {
    console.error('Error al crear justificación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear la justificación',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener justificaciones del alumno
const obtenerJustificacionesAlumno = async (req, res) => {
  let connection;
  try {
    const id_persona = req.user.id_persona;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    connection = await pool.getConnection();

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
    const { rows, total } = await Justificacion.obtenerPorAlumnoPaginado(id_alumno, limit, offset);

    res.json({
      success: true,
      data: rows,
      page,
      total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error al obtener justificaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las justificaciones',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener justificaciones por docente
const obtenerJustificacionesDocente = async (req, res) => {
  let connection;
  try {
    const id_persona = req.user.id_persona;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

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
    const { rows, total } = await Justificacion.obtenerPorDocentePaginado(id_docente, limit, offset);

    res.json({
      success: true,
      data: rows,
      page,
      total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error al obtener justificaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las justificaciones',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener todas las justificaciones (admin)
const obtenerTodasJustificaciones = async (req, res) => {
  try {
    const justificaciones = await Justificacion.obtenerTodas();

    res.json({
      success: true,
      data: justificaciones
    });

  } catch (error) {
    console.error('Error al obtener justificaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las justificaciones',
      error: error.message 
    });
  }
};

// Obtener justificación por ID
const obtenerJustificacionPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const justificacion = await Justificacion.obtenerPorId(id);

    if (!justificacion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Justificación no encontrada' 
      });
    }

    res.json({
      success: true,
      data: justificacion
    });

  } catch (error) {
    console.error('Error al obtener justificación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener la justificación',
      error: error.message 
    });
  }
};

// Actualizar estado de justificación
const actualizarEstadoJustificacion = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { estado, comentario_revision } = req.body;
    const id_persona = req.user.id_persona;

    const estadosValidos = ['pendiente', 'aprobada', 'rechazada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Estado no válido' 
      });
    }

    connection = await pool.getConnection();

    let id_docente = null;
    const [docenteRow] = await connection.query(
      'SELECT id FROM docente WHERE id_persona = ?',
      [id_persona]
    );

    if (docenteRow && docenteRow.length > 0) {
      id_docente = docenteRow[0].id;
    }

    const actualizado = await Justificacion.actualizarEstado(
      id, 
      estado, 
      comentario_revision, 
      id_docente
    );

    if (!actualizado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Justificación no encontrada' 
      });
    }

    res.json({
      success: true,
      message: 'Estado de justificación actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar el estado',
      error: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Eliminar justificación
const eliminarJustificacion = async (req, res) => {
  try {
    const { id } = req.params;

    const justificacion = await Justificacion.obtenerPorId(id);
    
    if (!justificacion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Justificación no encontrada' 
      });
    }

    try {
      await cloudinary.uploader.destroy(justificacion.public_id_cloudinary, {
        resource_type: 'raw'
      });
    } catch (cloudinaryError) {
      console.error('Error al eliminar de Cloudinary:', cloudinaryError);
    }

    const eliminado = await Justificacion.eliminar(id);

    if (!eliminado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Justificación no encontrada' 
      });
    }

    res.json({
      success: true,
      message: 'Justificación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar justificación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar la justificación',
      error: error.message 
    });
  }
};

module.exports = {
  crearJustificacion,
  obtenerJustificacionesAlumno,
  obtenerJustificacionesDocente,
  obtenerTodasJustificaciones,
  obtenerJustificacionPorId,
  actualizarEstadoJustificacion,
  eliminarJustificacion
}; 
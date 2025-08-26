const axios = require("axios");
const Cuota = require("../models/Cuota");
const pool = require("../config/database");

// Utilidad: detectar intención simple (cuotas vs asistencia vs perfil) y extraer DNI/año
function detectIntentAndParams(text, user) {
  const normalized = String(text || "").toLowerCase();
  const intent = /\b(cuota|cuotas|pago|pagos|matricula|matrícula)\b/.test(normalized)
    ? "cuotas"
    : /(asistencia|faltas|inasistencia|asistencias)/.test(normalized)
    ? "asistencia"
    : /(como se llama|nombre|identidad|quien es|de que grado|grado|nivel)/.test(normalized)
    ? "perfil"
    : "general";

  const dniMatch = normalized.match(/\b(\d{8})\b/);
  const yearMatch = normalized.match(/\b(20\d{2})\b/);

  const params = {
    dni: dniMatch ? dniMatch[1] : undefined,
    anio: yearMatch ? Number(yearMatch[1]) : undefined,
  };

  return { intent, params };
}

async function fetchCuotas({ reqUser, dni, anio }) {
  const resolvedYear = anio || new Date().getFullYear();

  // Si es director puede consultar por DNI, si es alumno usa su DNI
  let dniToUse = dni;
  if (!dniToUse && reqUser?.role_id !== 1) {
    // Buscar DNI del usuario autenticado desde persona
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        "SELECT p.dni FROM persona p WHERE p.id = ?",
        [reqUser.id_persona]
      );
      if (rows && rows.length > 0) dniToUse = rows[0].dni;
    } finally {
      connection.release();
    }
  }

  if (!dniToUse) {
    return { error: "Falta DNI para consultar cuotas" };
  }

  const data = await Cuota.obtenerCuotasCompletasPorDniYAnio(String(dniToUse), resolvedYear);
  return { data, anio: resolvedYear, dni: dniToUse };
}

async function fetchPerfil({ reqUser, dni }) {
  // Si es director puede consultar por DNI; si no, usar su propia persona
  let dniToUse = dni;
  const connection = await pool.getConnection();
  try {
    if (!dniToUse) {
      const [dniRow] = await connection.query(
        "SELECT p.dni FROM persona p WHERE p.id = ?",
        [reqUser.id_persona]
      );
      if (dniRow && dniRow.length > 0) dniToUse = dniRow[0].dni;
    }
    if (!dniToUse) return { error: "Falta DNI para consultar perfil" };

    const [rows] = await connection.query(
      `SELECT p.id AS id_persona, p.dni, p.nombre, p.ap_p, p.ap_m,
              a.id AS id_alumno,
              m.id AS id_matricula, m.fecha_matricula,
              g.id AS id_grado, g.descripcion AS grado
       FROM persona p
       LEFT JOIN alumno a ON a.id_persona = p.id
       LEFT JOIN matricula m ON m.id_alumno = a.id
       LEFT JOIN grado g ON g.id = m.id_grado
       WHERE p.dni = ?
       ORDER BY m.fecha_matricula DESC
      `,
      [dniToUse]
    );
    if (!rows || rows.length === 0) return { error: "No se encontró persona/alumno con ese DNI" };

    const first = rows[0];
    const nombreCompleto = `${first.nombre} ${first.ap_p} ${first.ap_m}`.trim();
    return {
      data: {
        dni: first.dni,
        nombre_completo: nombreCompleto,
        grado: first.grado || null,
        historial: rows.map(r => ({ grado: r.grado, fecha_matricula: r.fecha_matricula }))
      }
    };
  } finally {
    connection.release();
  }
}

async function fetchAsistencias({ reqUser }) {
  // Obtener asistencias del alumno autenticado
  const connection = await pool.getConnection();
  try {
    const [alumnoRow] = await connection.query(
      "SELECT id FROM alumno WHERE id_persona = ?",
      [reqUser.id_persona]
    );
    if (!alumnoRow || alumnoRow.length === 0) {
      return { error: "No se encontró el alumno del usuario" };
    }
    const idAlumno = alumnoRow[0].id;

    const [rows] = await connection.query(
      `SELECT a.*, 
              pd.nombre as nombre_docente, pd.ap_p as ap_p_docente, pd.ap_m as ap_m_docente,
              CONCAT(pd.nombre, ' ', pd.ap_p, ' ', pd.ap_m) as nombre_completo_docente
       FROM asistencia a
       LEFT JOIN docente_curso dc ON a.id_docente_curso = dc.id
       LEFT JOIN docente d ON dc.id_docente = d.id
       LEFT JOIN persona pd ON d.id_persona = pd.id
       WHERE a.id_alumno = ?
       ORDER BY a.fecha DESC
      `,
      [idAlumno]
    );

    return { data: rows };
  } finally {
    connection.release();
  }
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");

  const payload = {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.2,
  };

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    payload,
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );
  const content = res.data?.choices?.[0]?.message?.content || "";
  return content;
}

// POST /api/chat
const chat = async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: "message es requerido" });

    const { intent, params } = detectIntentAndParams(message, req.user);

    let toolResult = null;
    if (intent === "cuotas") {
      toolResult = await fetchCuotas({ reqUser: req.user, dni: params.dni, anio: params.anio });
    } else if (intent === "asistencia") {
      toolResult = await fetchAsistencias({ reqUser: req.user });
    } else if (intent === "perfil") {
      toolResult = await fetchPerfil({ reqUser: req.user, dni: params.dni });
    }

    const roleDesc = req.user?.role_id === 1 ? "director" : "estudiante";

    const system = `Eres un asistente escolar que responde en español, breve y claro. Tienes rol de ${roleDesc}. Si hay datos consultados, respóndelos en lista simple; si falta info (e.g. DNI para director), pídela de forma directa. Nunca inventes.`;

    const dataSummary = toolResult?.error
      ? `ERROR: ${toolResult.error}`
      : intent === "cuotas"
      ? JSON.stringify({
          dni: toolResult?.dni,
          anio: toolResult?.anio,
          cuotas: toolResult?.data?.map((c) => ({
            id_cuota: c.id_cuota,
            matricula_estado: c.matricula_estado,
            c1_estado: c.c1_estado, c2_estado: c.c2_estado, c3_estado: c.c3_estado, c4_estado: c.c4_estado,
            c5_estado: c.c5_estado, c6_estado: c.c6_estado, c7_estado: c.c7_estado, c8_estado: c.c8_estado,
            c9_estado: c.c9_estado, c10_estado: c.c10_estado,
          })) || []
        })
      : intent === "asistencia"
      ? JSON.stringify({ asistencias: toolResult?.data })
      : intent === "perfil"
      ? JSON.stringify({ perfil: toolResult?.data })
      : "";

    const finalMessage = await callOpenAI([
      { role: "system", content: system },
      { role: "user", content: String(message) },
      dataSummary ? { role: "system", content: `DatosConsultados: ${dataSummary}` } : null,
    ].filter(Boolean));

    return res.json({ success: true, intent, data: toolResult?.data || null, message: finalMessage, error: toolResult?.error || null });
  } catch (err) {
    console.error("Error en chat:", err);
    return res.status(500).json({ success: false, message: "Error interno", error: err.message });
  }
};

module.exports = chat;



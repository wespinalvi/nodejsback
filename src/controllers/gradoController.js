const Grado = require("../models/Grado");
const { pool } = require("../config/database");

const getGrados = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM grado"); // tabla 'grados'
    res.json({
      status: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Error al obtener grados",
    });
  }
};

module.exports = {
  getGrados,
};

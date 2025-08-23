const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const pool = require("../config/database"); // Asegúrate de que este archivo exporte tu pool de MySQL

// Registro de usuario
const register = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, email, password, role_id } = req.body;

    if (!username || !email || !password || !role_id) {
      return res.status(400).json({
        message:
          "Todos los campos son obligatorios: username, email, password, role_id",
      });
    }

    const existingUser = await User.findByEmailOrUsername(
      email,
      username,
      connection
    );
    if (existingUser) {
      return res.status(400).json({ message: "Usuario o email ya existe" });
    }

    const role = await Role.findById(role_id, connection);
    if (!role) {
      return res.status(400).json({ message: "Rol no válido" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = await User.crear(connection, {
      username,
      email,
      password: hashedPassword,
      role_id,
      id_persona: 1, // Puedes cambiar esto si manejas personas aparte
    });

    res
      .status(201)
      .json({ message: "Usuario registrado exitosamente", userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  } finally {
    connection.release();
  }
};

// Login
const login = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username y password son obligatorios" });
    }

    const user = await User.findByUsername(username, connection);
    if (!user) {
      return res
        .status(400)
        .json({ message: "Usuario o contraseña incorrectos" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Usuario o contraseña incorrectos" });
    }

    if (user.change_password_required) {
      return res.status(403).json({
        message: "Debe cambiar su contraseña antes de continuar",
        change_password_required: true,
      });
    }

    const token = jwt.sign(
      { id: user.id, id_persona: user.id_persona, username: user.username, role_id: user.role_id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.json({ token, roleId: user.role_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  } finally {
    connection.release();
  }
};

const changePassword = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, email, password, newPassword, repeatPassword } = req.body;

    if (!username || !email || !password || !newPassword || !repeatPassword) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    if (newPassword !== repeatPassword) {
      return res
        .status(400)
        .json({ message: "Las nuevas contraseñas no coinciden" });
    }

    const user = await User.findByEmailOrUsername(email, username, connection);
    if (!user || user.username !== username || user.email !== email) {
      return res
        .status(404)
        .json({ message: "Usuario no encontrado o credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Contraseña actual incorrecta" });
    }

    // CORRECCIÓN: El orden de parámetros aquí debe coincidir con la función updatePassword
    await User.updatePassword(user.id, connection, newPassword);

    return res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  } finally {
    connection.release();
  }
};

const logout = async (req, res) => {
  try {
    // En JWT, el logout se maneja principalmente en el frontend
    // invalidando el token. Aquí solo confirmamos el logout.
    res.json({ 
      message: "Sesión cerrada exitosamente",
      success: true 
    });
  } catch (error) {
    console.error("Error en logout:", error);
    res.status(500).json({ 
      message: "Error al cerrar sesión",
      success: false 
    });
  }
};

module.exports = {
  register,
  login,
  changePassword,
  logout,
};

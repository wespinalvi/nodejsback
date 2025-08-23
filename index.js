const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const matriculaRoutes = require("./src/routes/matriculaRoutes");
const gradoRoutes = require("./src/routes/gradoRoutes");
const reniecRoutes = require("./src/routes/reniecRoutes");
const alumnoRoutes = require("./src/routes/alumnoRoutes");
const docenteRoutes = require("./src/routes/docenteRoutes");
const periodoPagoasRoutes = require("./src/routes/periodoPagoasRoutes");
const cuotasRoutes = require("./src/routes/cuotasRoutes");
const pagoRoutes = require("./src/routes/pagoRoutes");
const justificacionRoutes = require("./src/routes/justificacionRoutes");
const asistenciaRoutes = require("./src/routes/asistenciaRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/das", matriculaRoutes);

app.use("/api/grado", gradoRoutes);

app.use("/api/dni", reniecRoutes);

app.use("/api/alumno", alumnoRoutes);

app.use("/api/docente", docenteRoutes);

app.use("/api/cuotas", periodoPagoasRoutes);
app.use("/api/cuotas", cuotasRoutes);

app.use("/api/pago", pagoRoutes);
app.use("/api/justificaciones", justificacionRoutes);
app.use("/api/asistencia", asistenciaRoutes);

app.get("/pago-exitoso", (req, res) => {
  res.send("¡Pago exitoso! Gracias por tu compra.");
});
app.get("/pago-error", (req, res) => {
  res.send("El pago fue cancelado o falló. Intenta nuevamente.");
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "API funcionando correctamente" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

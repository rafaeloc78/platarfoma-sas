const mysql = require('mysql2/promise');
require('dotenv').config();

// Usamos el entorno para conectarnos (o fallback a los valores del make.yml)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'wordpressuser',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'wordpressdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Base de Datos conectada con éxito a MySQL.');
        connection.release();
    } catch (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        console.log('⚠️ Revisa que el contenedor de Docker u otro servidor MySQL local esté corriendo.');
    }
}

checkConnection();

module.exports = pool;

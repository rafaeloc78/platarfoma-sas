const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = require('./db'); 

const app = express();
const port = 8080;

app.use(express.json());
app.use(express.static('./'));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_saas';

// --- MIDDLEWARE AUTENTICACIÓN ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Acceso denegado, se requiere iniciar sesión.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Sesión inválida o expirada. Vuelve a ingresar.' });
        req.user = user;
        next();
    });
};

// --- INICIALIZACIÓN DE TABLAS ---
async function initializeDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('usuario', 'admin') DEFAULT 'usuario',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS anuncios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                titulo VARCHAR(100) NOT NULL,
                descripcion TEXT NOT NULL,
                precio DECIMAL(10, 2) NOT NULL,
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Tablas sincronizadas en la base de datos.");
    } catch (error) {
        console.error("❌ Error inicializando base de datos:", error.message);
    }
}
initializeDB();

// --- RUTAS AUTENTICACIÓN ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

        const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if(existing.length > 0) return res.status(409).json({ error: 'El usuario ya existe' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        
        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
        
        res.json({ message: 'Login exitoso', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- RUTAS ANUNCIOS ---

app.get('/anuncios', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM anuncios ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo anuncios' });
    }
});

// Proteger creación de anuncios (requiere JWT)
app.post('/anuncios', authenticateToken, async (req, res) => {
    try {
        const { titulo, descripcion, precio } = req.body;
        const userId = req.user.id; 

        if (!titulo || !descripcion || !precio) {
            return res.status(400).json({ error: "Faltan datos" });
        }

        const [result] = await pool.query(
            'INSERT INTO anuncios (titulo, descripcion, precio, user_id) VALUES (?, ?, ?, ?)',
            [titulo, descripcion, precio, userId]
        );
        
        res.status(201).json({ 
            message: "Anuncio creado con éxito", 
            anuncio: { id: result.insertId, titulo, descripcion, precio, user_id: userId } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando anuncio' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);
});

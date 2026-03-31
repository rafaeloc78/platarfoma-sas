const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const getDB = require('./db'); 

const app = express();
// Render asigna dinámicamente el puerto
const port = process.env.PORT || 8080;

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
let db;
async function initializeDB() {
    try {
        db = await getDB();
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'usuario',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.exec(`
            CREATE TABLE IF NOT EXISTS anuncios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                precio REAL NOT NULL,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Tablas inicializadas en SQLite nativo.");
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

        const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if(existing) return res.status(409).json({ error: 'El usuario ya existe' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        
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

        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ message: 'Login exitoso', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- RUTAS ANUNCIOS ---

app.get('/anuncios', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM anuncios ORDER BY created_at DESC');
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

        const result = await db.run(
            'INSERT INTO anuncios (titulo, descripcion, precio, user_id) VALUES (?, ?, ?, ?)',
            [titulo, descripcion, precio, userId]
        );
        
        res.status(201).json({ 
            message: "Anuncio creado con éxito", 
            anuncio: { id: result.lastID, titulo, descripcion, precio, user_id: userId } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando anuncio' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor backend corriendo en el puerto ${port}`);
});

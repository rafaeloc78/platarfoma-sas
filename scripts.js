// Función para formatear moneda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
};

// Función para renderizar anuncios dinámicamente con UI Premium
function renderAnuncios() {
    const listaAnuncios = document.getElementById("lista-anuncios");
    
    // Simulate fetching delay to show loading (optional, just for wow effect)
    fetch("/anuncios")
        .then(response => response.json())
        .then(data => {
            listaAnuncios.innerHTML = ''; // Limpiar lista
            
            if (data.length === 0) {
                listaAnuncios.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#64748b;">Aún no hay anuncios. ¡Sé el primero en crear uno!</p>';
                return;
            }

            data.forEach(anuncio => {
                const li = document.createElement('li');
                li.className = 'anuncio-item';
                li.innerHTML = `
                    <h3>${anuncio.titulo}</h3>
                    <p>${anuncio.descripcion}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                        <span class="anuncio-precio">${formatCurrency(anuncio.precio)}</span>
                        <button class="icon-btn" style="border:none; background:#f1f5f9; border-radius:8px;">❤️</button>
                    </div>
                `;
                listaAnuncios.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Error al obtener anuncios:", error);
            listaAnuncios.innerHTML = '<p style="color:red;">Hubo un error cargando los anuncios.</p>';
        });
}

// Función para crear un nuevo anuncio
function createAnuncio() {
    const formulario = document.getElementById("formulario-creacion");
    const titulo = formulario.titulo.value.trim();
    const descripcion = formulario.descripcion.value.trim();
    const precio = parseFloat(formulario.precio.value.trim());
    const submitBtn = formulario.querySelector('.submit-btn');

    if (titulo && descripcion && precio) {
        // Change button state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Procesando... 🚀';
        submitBtn.disabled = true;

        const token = localStorage.getItem('token');
        if (!token) {
            alert("Debes iniciar sesión para publicar un anuncio.");
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }

        fetch("/anuncios", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ titulo, descripcion, precio }),
        })
            .then(response => response.json())
            .then(data => {
                formulario.reset();
                renderAnuncios();
                
                // Reset button
                submitBtn.innerHTML = '¡Publicado con éxito! ✅';
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            })
            .catch(error => {
                console.error("Error al crear anuncio:", error);
                submitBtn.innerHTML = 'Error ❌';
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            });
    }
}

// Event listeners
window.addEventListener("load", renderAnuncios);

document.getElementById("formulario-creacion").addEventListener("submit", (e) => {
    e.preventDefault();
    createAnuncio();
});

// --- LÓGICA DE AUTENTICACIÓN Y MODALES ---

const authModal = document.getElementById('auth-modal');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');

const showModal = (view) => {
    authModal.style.display = 'flex';
    if (view === 'login') {
        loginView.style.display = 'block';
        registerView.style.display = 'none';
    } else {
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    }
};

const hideModal = () => { authModal.style.display = 'none'; };

document.getElementById('open-login-btn').addEventListener('click', (e) => { e.preventDefault(); showModal('login'); });
document.getElementById('open-register-btn').addEventListener('click', (e) => { e.preventDefault(); showModal('register'); });
document.getElementById('close-modal-btn').addEventListener('click', hideModal);
document.getElementById('switch-to-register').addEventListener('click', (e) => { e.preventDefault(); showModal('register'); });
document.getElementById('switch-to-login').addEventListener('click', (e) => { e.preventDefault(); showModal('login'); });

// Verificación de estado de UI según Auth
const checkAuthState = () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
        document.getElementById('auth-actions').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('user-greeting').innerText = `¡Hola, ${username}!`;
    } else {
        document.getElementById('auth-actions').style.display = 'flex';
        document.getElementById('user-profile').style.display = 'none';
    }
};

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    checkAuthState();
    renderAnuncios();
});

// Submit de Formularios
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Iniciando...";
    
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: e.target.username.value, password: e.target.password.value })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', e.target.username.value);
            e.target.reset();
            hideModal();
            checkAuthState();
            document.getElementById('login-error').style.display = 'none';
        } else {
            document.getElementById('login-error').innerText = data.error || 'Error en login';
            document.getElementById('login-error').style.display = 'block';
        }
    } catch (err) {
        console.error(err);
    }
    btn.disabled = false; btn.innerText = "Acceder a mi cuenta";
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Registrando...";
    
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: e.target.username.value, password: e.target.password.value })
        });
        const data = await res.json();
        if (res.ok) {
            e.target.reset();
            document.getElementById('register-error').style.display = 'none';
            showModal('login');
            // Notificamos opcionalmente a nivel visual
            const loginTitle = loginView.querySelector('h2');
            loginTitle.innerText = '¡Registro exitoso! Inicia sesión';
            loginTitle.style.color = '#10B981';
        } else {
            document.getElementById('register-error').innerText = data.error || 'Error al registrar';
            document.getElementById('register-error').style.display = 'block';
        }
    } catch (err) {
        console.error(err);
    }
    btn.disabled = false; btn.innerText = "Registrarme";
});

// Llamada para configurar UI visual inicial
window.addEventListener('load', checkAuthState);

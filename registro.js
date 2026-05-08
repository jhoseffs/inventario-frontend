async function registrar() {
    const nombre = document.getElementById("nombre").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const mensaje = document.getElementById("mensaje");

    if (!nombre || !email || !password) {
        mensaje.className = "error";
        mensaje.innerText = "✗ Por favor, completa todos los campos";
        return;
    }

    try {
        const response = await fetch("https://inventario-backend-eqe7.onrender.com/api/usuarios/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre: nombre,
                email: email,
                password: password,
                rol: "ADMIN"
            })
        });

        if (response.ok) {
            mensaje.className = "exito";
            mensaje.innerText = "✓ Registro exitoso. Redirigiendo al login...";
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            const errorText = await response.text();
            mensaje.className = "error";
            mensaje.innerText = "✗ Error: " + errorText;
        }
    } catch (error) {
        mensaje.className = "error";
        mensaje.innerText = "✗ Error de conexión con el servidor";
    }
}

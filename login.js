async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:8080/api/usuarios/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (response.ok) {
            const usuario = await response.json();
            localStorage.setItem("usuario", JSON.stringify(usuario));

            // ✅ Verde — éxito
            mensaje.className = "exito";
            mensaje.innerText = "✓ Login correcto, redirigiendo...";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000); // espera 1 segundo para que vean el mensaje
        }
        else {
            // ❌ Rojo — credenciales incorrectas
            mensaje.className = "error";
            mensaje.innerText = "✗ Correo o contraseña incorrectos";
        }

    } catch (error) {
        // 🔴 Rojo — fallo de red
        mensaje.className = "error";
        mensaje.innerText = "✗ Error de conexión con el servidor";
    }
}
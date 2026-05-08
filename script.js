    // ✅ ASÍ DEBE QUEDAR — primeras líneas del JS de index.html
    document.body.style.visibility = "hidden";  // ← AGREGAR ESTA LÍNEA PRIMERO
    const usuarioLogueado = localStorage.getItem("usuario");

    if (!usuarioLogueado) {
        window.location.href = "login.html";
    }else {
    document.body.style.visibility = "visible";  // ← mostrar solo si hay sesión
    }
     const API_URL = "http://localhost:8080/api"; // Cambia esto si tu backend está en otra URL o puerto
        let productDataCache = {};
        let resumenFinancieroChart, tendenciasChart;

        document.addEventListener('DOMContentLoaded', () => {
            setupNavigation();
            loadInitialData();
            setupForms();
        });
        
        function setupNavigation() {
            const navLinks = document.querySelectorAll('.sidebar-nav a');
            const sections = document.querySelectorAll('.main-content .content-section');
            
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('data-section');

                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    sections.forEach(section => {
                        if (section.id === targetId) {
                            section.classList.add('active');
                            if (targetId === 'dashboard') {
                                handleLoadDashboard();
                            } else if (targetId === 'inventario') {
                                document.getElementById('cargarInventarioBtn').click();
                            }
                        } else {
                            section.classList.remove('active');
                        }
                    });
                });
            });
        }

        async function loadInitialData() {
            try {
                const response = await fetch(`${API_URL}/categorias`);
                const data = await response.json();

                populateCategories(data);

            } catch (error) {
                displayStatus('statusProducto', 'error', 'Error al cargar categorías');
                populateCategories([]);
            }
        }

        function populateCategories(categories) {
            const selectProducto = document.getElementById('p_categoria');
            selectProducto.innerHTML = '';

            if (categories.length === 0) {
                selectProducto.innerHTML = '<option disabled>No hay categorías</option>';
                return;
            }

            selectProducto.innerHTML = '<option disabled selected>Seleccione</option>';

            categories.forEach(cat => {
                selectProducto.innerHTML += `
                    <option value="${cat.id}">${cat.nombre}</option>
                `;
            });

            // lista visual
            document.getElementById('listaCategorias').innerHTML =
                categories.map(c => `<li>${c.nombre}</li>`).join('');
        }

        function setupForms() {
            // Configuración
            document.getElementById('iniciarDBBtn').addEventListener('click', async () => {
                try {
                    const response = await fetch(`${API_URL}/reportes/productos/pdf`);

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "reporte_productos.pdf";
                    document.body.appendChild(a);
                    a.click();

                    a.remove();
                    window.URL.revokeObjectURL(url);

                } catch (error) {
                    console.error("Error al descargar PDF:", error);
                    alert("Error al generar el PDF");
                }
            });
            /*document.getElementById('resetDBBtn').addEventListener('click', () => {
                if (window.confirm("¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.")) {
                    handleConfigAction('resetear');
                }
            });*/

            // Categorías y Productos
            document.getElementById('categoriaForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const nombre = document.getElementById('c_nombre').value;

                try {
                    const response = await fetch(`${API_URL}/categorias`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ nombre })
                    }); 

                    if (response.ok) {
                        displayStatus('statusCategoria', 'success', 'Categoría registrada');
                        e.target.reset();
                        loadInitialData();
                    } else {
                        displayStatus('statusCategoria', 'error', 'Error al guardar');
                    }

                } catch (error) {
                    displayStatus('statusCategoria', 'error', error.message);
                }
            });
            document.getElementById('productoForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const producto = {
                    codigo: document.getElementById('p_codigo').value,
                    nombre: document.getElementById('p_nombre').value,
                    categoria: {
                        id: parseInt(document.getElementById('p_categoria').value)
                    },
                    precioCompra: parseFloat(document.getElementById('p_precio_compra').value),
                    precioVenta: parseFloat(document.getElementById('p_precio_venta').value),
                    stock: parseInt(document.getElementById('p_stock').value)
                };

                try {
                    const response = await fetch(`${API_URL}/productos`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(producto)
                    });

                    if (response.ok) {
                        displayStatus('statusProducto', 'success', 'Producto registrado correctamente');
                        e.target.reset();
                    } else {
                        displayStatus('statusProducto', 'error', 'Error al registrar producto');
                    }

                } catch (error) {
                    displayStatus('statusProducto', 'error', error.message);
                }
            });
            
            // Compras/Ventas
            document.getElementById('co_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'co'));
            document.getElementById('v_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'v'));
            
            document.getElementById('compraForm').addEventListener('submit', (e) => handleTransactionPost(e, 'compra'));
            document.getElementById('ventaForm').addEventListener('submit', (e) => handleTransactionPost(e, 'venta'));

            // Resúmenes
            document.getElementById('resumenVentasBtn').addEventListener('click', () => loadSummary('Ventas'));
            document.getElementById('resumenComprasBtn').addEventListener('click', () => loadSummary('Compras'));

            // Dashboard
            document.getElementById('cargarInventarioBtn').addEventListener('click', loadInventario);
            document.getElementById('cargarDatosGraficosBtn').addEventListener('click', handleLoadDashboard);
            document.getElementById('calcularResumenBtn').addEventListener('click', calcularResumenFinanciero);

            // LOGOUT
            document.getElementById("logoutBtn").addEventListener("click", () => {
                localStorage.removeItem("usuario");
                window.location.href = "login.html";
            });
        }

        // ================= DASHBOARD FUNCTIONS =================
        
        async function handleLoadDashboard() {
            await calcularResumenFinanciero();
            await cargarDatosGraficos();
        }

        async function calcularResumenFinanciero() {
            displayStatus('statusDashboard', 'info', 'Calculando resumen financiero...');

            try {
                const [ventasResponse, comprasResponse] = await Promise.all([
                    fetch(`${API_URL}/ventas`),
                    fetch(`${API_URL}/compras`)
                ]);

                const ventasJson = await ventasResponse.json();
                const comprasJson = await comprasResponse.json();

                // ✔️ SOPORTA AMBOS FORMATOS (array o {data:[]})
                const ventasData = Array.isArray(ventasJson) ? ventasJson : (ventasJson.data || []);
                const comprasData = Array.isArray(comprasJson) ? comprasJson : (comprasJson.data || []);

                let totalVentas = 0;
                let totalCompras = 0;

                // ✔️ VENTAS SEGURAS
                ventasData.forEach(venta => {
                    const cantidad = parseFloat(venta.cantidad) || 0;
                    const precio = parseFloat(venta.precioVenta) || 0;
                    totalVentas += cantidad * precio;
                });

                // ✔️ COMPRAS SEGURAS
                comprasData.forEach(compra => {
                    const cantidad = parseFloat(compra.cantidad) || 0;
                    const precio = parseFloat(compra.precioCompra) || 0;
                    totalCompras += cantidad * precio;
                });

                const ganancias = totalVentas - totalCompras;

                document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
                document.getElementById('totalCompras').textContent = `$${totalCompras.toFixed(2)}`;
                document.getElementById('totalGanancias').textContent = `$${ganancias.toFixed(2)}`;
                document.getElementById('totalGastos').textContent = `$${totalCompras.toFixed(2)}`;

                const gananciasElement = document.getElementById('totalGanancias');

                if (ganancias > 0) {
                    gananciasElement.style.color = 'var(--secondary-color)';
                } else if (ganancias < 0) {
                    gananciasElement.style.color = 'var(--danger-color)';
                } else {
                    gananciasElement.style.color = '#666';
                }

                displayStatus(
                    'statusDashboard',
                    'success',
                    `Resumen calculado: Ventas: $${totalVentas.toFixed(2)} | Compras: $${totalCompras.toFixed(2)} | Ganancia: $${ganancias.toFixed(2)}`
                );

                return { totalVentas, totalCompras, ganancias };

            } catch (error) {
                displayStatus('statusDashboard', 'error', `Error al calcular resumen: ${error.message}`);
                return { totalVentas: 0, totalCompras: 0, ganancias: 0 };
            }
        }
        async function cargarDatosGraficos() {
            try {

                // ❌ ya no usamos resumen-diario
                // const resumenResponse = await fetch(`${API_URL}/resumen-diario`);
                // const resumenData = await resumenResponse.json();

                // if (resumenData.status === 'success' && resumenData.data && resumenData.data.length > 0) {
                //     renderCharts(resumenData.data);
                // } else {
                //     await renderChartsFromRawData();
                // }

                // ✔️ SOLO USAMOS DATOS REALES
                await renderChartsFromRawData();

            } catch (error) {
                displayStatus('statusDashboard', 'error', `Error al cargar gráficos: ${error.message}`);
            }
        }

        async function renderChartsFromRawData() {
    try {
        const [ventasResponse, comprasResponse] = await Promise.all([
            fetch(`${API_URL}/ventas`),
            fetch(`${API_URL}/compras`)
        ]);

        const ventasData = await ventasResponse.json();
        const comprasData = await comprasResponse.json();

        // Agrupar por fecha
        const ventasPorFecha = {};
        const comprasPorFecha = {};

        // Procesar ventas (ahora es array)
        if (Array.isArray(ventasData)) {
            ventasData.forEach(venta => {
                const fecha = new Date(venta.fecha).toLocaleDateString();
                const monto =
                    parseFloat(venta.cantidad) *
                    parseFloat(venta.precioVenta);

                ventasPorFecha[fecha] =
                    (ventasPorFecha[fecha] || 0) + monto;
            });
        }

        // Procesar compras (ahora es array)
        if (Array.isArray(comprasData)) {
            comprasData.forEach(compra => {
                const fecha = new Date(compra.fecha).toLocaleDateString();
                const monto =
                    parseFloat(compra.cantidad) *
                    parseFloat(compra.precioCompra);

                comprasPorFecha[fecha] =
                    (comprasPorFecha[fecha] || 0) + monto;
            });
        }

        // Combinar fechas
        const todasFechas = [
            ...new Set([
                ...Object.keys(ventasPorFecha),
                ...Object.keys(comprasPorFecha)
            ])
        ];

        todasFechas.sort((a, b) => new Date(a) - new Date(b));

        const datosResumen = todasFechas.map(fecha => ({
            fecha: fecha,
            total_ventas: ventasPorFecha[fecha] || 0,
            total_compras: comprasPorFecha[fecha] || 0,
            ganancia:
                (ventasPorFecha[fecha] || 0) -
                (comprasPorFecha[fecha] || 0)
        }));

        renderCharts(datosResumen);

    } catch (error) {
        console.error('Error al procesar datos para gráficos:', error);
        displayStatus(
            'statusDashboard',
            'warning',
            'No hay datos suficientes para generar gráficos.'
        );
    }
}

        function renderCharts(resumenData) {
            const labels = resumenData.map(row => {
                if (row.fecha instanceof Date) {
                    return row.fecha.toLocaleDateString();
                }
                return row.fecha;
            });

            const ventas = resumenData.map(row => row.total_ventas || 0);
            const compras = resumenData.map(row => row.total_compras || 0);
            const ganancias = resumenData.map(row => row.ganancia || 0);

            // 1. Gráfico de Resumen Financiero
            const ctx1 = document.getElementById('resumenFinancieroChart').getContext('2d');
            if (resumenFinancieroChart) resumenFinancieroChart.destroy();
            resumenFinancieroChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ventas',
                            data: ventas,
                            backgroundColor: 'rgba(0, 123, 255, 0.7)',
                            borderColor: 'rgba(0, 123, 255, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Compras',
                            data: compras,
                            backgroundColor: 'rgba(23, 162, 184, 0.7)',
                            borderColor: 'rgba(23, 162, 184, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Ganancias',
                            data: ganancias,
                            type: 'line',
                            fill: false,
                            backgroundColor: 'rgba(40, 167, 69, 0.7)',
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 2,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Resumen Financiero - Ventas, Compras y Ganancias'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Monto ($)'
                            }
                        }
                    }
                }
            });

            // 2. Gráfico de Tendencias
            const ctx2 = document.getElementById('tendenciasChart').getContext('2d');
            if (tendenciasChart) tendenciasChart.destroy();
            tendenciasChart = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ventas Acumuladas',
                            data: ventas.reduce((acc, curr, i) => [...acc, (acc[i-1] || 0) + curr], []),
                            borderColor: 'rgba(0, 123, 255, 1)',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            tension: 0.1,
                            fill: true
                        },
                        {
                            label: 'Compras Acumuladas',
                            data: compras.reduce((acc, curr, i) => [...acc, (acc[i-1] || 0) + curr], []),
                            borderColor: 'rgba(23, 162, 184, 1)',
                            backgroundColor: 'rgba(23, 162, 184, 0.1)',
                            tension: 0.1,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tendencias Acumuladas - Ventas vs Compras'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Monto Acumulado ($)'
                            }
                        }
                    }
                }
            });
        }

        // ================= REST OF THE FUNCTIONS (sin cambios) =================
        
        async function handlePostAction(e, action, statusDivId) {
            e.preventDefault();
            const form = e.target;
            const submitBtn = e.submitter;
            submitBtn.disabled = true;
            displayStatus(statusDivId, 'info', `Procesando...`);

            const data = {};
            Array.from(form.elements).forEach(input => {
                if (input.id && input.id.startsWith('p_') || input.id.startsWith('c_')) {
                    data[input.id.replace(/p_|c_/, '')] = input.value;
                }
            });
            data.action = action;

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const responseData = await response.json();

                if (responseData.status === 'success') {
                    displayStatus(statusDivId, 'success', responseData.message);
                    form.reset(); 
                    if (action === 'agregarCategoria') {
                        loadInitialData();
                    }
                } else {
                    displayStatus(statusDivId, 'error', responseData.message);
                }
            } catch (error) {
                displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
            }
        }
        let timeout;
        
        async function handleQueryFilter(query, prefix) {
            const detailDiv = document.getElementById(`${prefix}_product_details`);
            const submitBtn = document.getElementById(`${prefix}_submit_btn`);
            const idInput = document.getElementById(`${prefix}_producto_id`);

            detailDiv.classList.add('hidden');
            detailDiv.innerHTML = '';
            idInput.value = '';
            submitBtn.disabled = true;

            if (query.length < 2) return;

            try {
                const response = await fetch(
                    `${API_URL}/productos/buscar?query=${encodeURIComponent(query)}`
                );

                if (!response.ok) {
                    throw new Error("Error en servidor");
                }

                const data = await response.json();

                if (data.length > 0) {
                    const product = data[0];
                    productDataCache[product.id] = product;
                    updateProductDetails(product, detailDiv, prefix);
                    idInput.value = product.id;
                    submitBtn.disabled = false;
                } else {
                    detailDiv.classList.remove('hidden');
                    detailDiv.innerHTML = `<p>No se encontraron productos</p>`;
                }

            } catch (error) {
                detailDiv.classList.remove('hidden');
                detailDiv.innerHTML = `<p>Error: ${error.message}</p>`;
            }
        }

        function updateProductDetails(product, detailDiv, prefix) {
            detailDiv.classList.remove('hidden');
            
            const isCompra = prefix === 'co';
            const price = isCompra ? product.precioCompra : product.precioVenta;
            const priceLabel = isCompra ? 'Precio Compra Actual' : 'Precio Venta Actual';

            const stockStyle = product.stock < 5 ? 'style="font-weight:bold; color:var(--danger-color);"' : 'style="font-weight:bold; color:var(--secondary-color);"';

            detailDiv.innerHTML = `
                <p><b>ID:</b> ${product.id} | <b>Producto:</b> ${product.nombre} (Cód: ${product.codigo})</p>
                <p><b>Categoría:</b> ${product.categoria?.nombre || 'Sin categoría'}</p>
                <p><b>Stock Actual:</b> <span ${stockStyle}>${product.stock}</span></p>
                <p><b>${priceLabel}:</b> $${parseFloat(price).toFixed(2)}</p>
            `;
            
            document.getElementById(`${prefix}_precio_${isCompra ? 'compra' : 'venta'}`).value = parseFloat(price).toFixed(2);
            
            if (!isCompra && product.stock < 5) {
                detailDiv.innerHTML += `<p class="status-message warning" style="display:block; margin-top: 10px;">Stock bajo. Solo quedan ${product.stock} unidades.</p>`;
            }
        }

        async function handleTransactionPost(e, type) {
            e.preventDefault();

            const form = e.target;
            const prefix = type === 'compra' ? 'co' : 'v';
            const statusDivId = type === 'compra' ? 'statusCompra' : 'statusVenta';

            const submitBtn = document.getElementById(`${prefix}_submit_btn`);
            submitBtn.disabled = true;

            displayStatus(statusDivId, 'info', `Registrando ${type}...`);

            const productoId = document.getElementById(`${prefix}_producto_id`).value;

            if (!productoId) {
                displayStatus(statusDivId, 'error', `No hay producto seleccionado. Busque y seleccione uno.`);
                submitBtn.disabled = false;
                return;
            }

            const transaccionData = {
                producto: {
                    id: parseInt(productoId)
                },
                cantidad: parseInt(document.getElementById(`${prefix}_cantidad`).value),

                [type === 'compra' ? 'precioCompra' : 'precioVenta']:
                    parseFloat(
                        document.getElementById(
                            `${prefix}_precio_${type === 'compra' ? 'compra' : 'venta'}`
                        ).value
                    ),

                cliente: type === 'venta'
                    ? document.getElementById('v_cliente').value
                    : null,

                proveedor: type === 'compra'
                    ? document.getElementById('co_proveedor').value
                    : null
            };
            try {

                // 🔥 AQUÍ ESTÁ LA CORRECCIÓN IMPORTANTE
                const url = type === 'compra'
                            ? `${API_URL}/compras`
                            : `${API_URL}/ventas`;

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(transaccionData)
                        });

                        const data = await response.json();

                        if (data.status === 'success') {
                            displayStatus(statusDivId, 'success', data.message);

                            form.reset();
                            delete productDataCache[productoId];

                            document
                                .getElementById(`${prefix}_product_details`)
                                .classList.add('hidden');

                        } else {
                            displayStatus(statusDivId, 'error', data.message);
                        }

                    } catch (error) {
                        displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
                    } finally {
                        submitBtn.disabled = false;
                    }
         }
        async function loadInventario() {
            displayStatus('statusInventario', 'info', 'Cargando datos de inventario...');
            
            const tableBody = document.getElementById('inventarioTableBody');
            tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

            try {
                const response = await fetch(`${API_URL}/productos`);
                const data = await response.json();

                if (data.length > 0) {
                    displayStatus('statusInventario', 'success', `Inventario cargado: ${data.length} productos.`);

                    tableBody.innerHTML = data.map(p => {
                        const stockStyle = p.stock < 5 
                            ? 'style="color: var(--danger-color); font-weight: bold;"' 
                            : '';

                        return `
                            <tr>
                                <td>${p.id}</td>
                                <td>${p.nombre}</td>
                                <td>${p.codigo}</td>
                                <td>${p.categoria?.nombre || 'Sin categoría'}</td>
                                <td ${stockStyle}>${p.stock}</td>
                                <td>$${p.precioVenta.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');

                } else {
                    displayStatus('statusInventario', 'warning', 'No hay productos en inventario.');
                    tableBody.innerHTML = '<tr><td colspan="6">No hay productos.</td></tr>';
                }

            } catch (error) {
                displayStatus('statusInventario', 'error', `Error al cargar inventario: ${error.message}`);
                tableBody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
            }
        }
        
        async function loadSummary(type) {
            const endpoint = type === 'Ventas'
                ? `${API_URL}/ventas`
                : `${API_URL}/compras`;

            displayStatus('statusResumen', 'info', `Cargando resumen de ${type}...`);

            const table = document.getElementById('resumenTable');
            const tableHead = table.querySelector('thead');
            const tableBody = document.getElementById('resumenTableBody');

            table.classList.add('hidden');
            tableBody.innerHTML = '';

            try {
                const response = await fetch(endpoint);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    displayStatus(
                        'statusResumen',
                        'success',
                        `${data.length} ${type} registradas.`
                    );

                    table.classList.remove('hidden');

                    const headers = Object.keys(data[0])
                        .map(h => `<th>${h.toUpperCase()}</th>`)
                        .join('');

                    tableHead.innerHTML = `<tr>${headers}</tr>`;

                    tableBody.innerHTML = data.map(row => {
                    const cells = Object.values(row).map(value => {

                        // Si es objeto (producto), mostrar código
                        if (typeof value === 'object' && value !== null) {
                            if (value.nombre) {
                                return `<td>${value.nombre}</td>`;
                            }
                        }
                        // Si viene null (cliente/proveedor vacío)
                        if (value === null || value === undefined) {
                            value = 'Sin registrar';
                        }

                        // Si es número
                        if (typeof value === 'number') {
                            value = value.toFixed(2);
                        }

                        return `<td>${value}</td>`;
                    }).join('');

                    return `<tr>${cells}</tr>`;
                }).join('');

                } else {
                    displayStatus(
                        'statusResumen',
                        'warning',
                        `No hay registros de ${type}.`
                    );
                }

            } catch (error) {
                displayStatus(
                    'statusResumen',
                    'error',
                    `Error al cargar resumen: ${error.message}`
                );
            }
        }
        
        async function handleConfigAction(action) {
            const statusConfig = document.getElementById('statusConfig');
            setButtonState(true);
            displayStatus('statusConfig', 'info', `Procesando la acción de ${action}...`);

            try {
                const response = await fetch(`${API_URL}?action=${action}`);
                const data = await response.json();

                if (data.status === 'success') {
                    displayStatus('statusConfig', 'success', data.message);
                    loadInitialData();
                } else {
                    displayStatus('statusConfig', 'error', data.message);
                }
            } catch (error) {
                displayStatus('statusConfig', 'error', `Error de conexión: ${error.message}.`);
            } finally {
                setButtonState(false);
            }
        }

        function setButtonState(disabled) {
            document.getElementById('iniciarDBBtn').disabled = disabled;
            document.getElementById('resetDBBtn').disabled = disabled;
        }
        
        function displayStatus(elementId, type, message) {
            const el = document.getElementById(elementId);
            el.style.display = 'block';
            el.className = `status-message ${type}`;
            el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i> ${message}`;
        }
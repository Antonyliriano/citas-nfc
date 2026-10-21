import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBSjhCqBUHYNjMezea-dvlyD10dSmWOrU",
    authDomain: "peluqueria-citas-nfc.firebaseapp.com",
    projectId: "peluqueria-citas-nfc",
    storageBucket: "peluqueria-citas-nfc.firebasestorage.app",
    messagingSenderId: "208411256453",
    appId: "1:208411256453:web:af2239961cf3e743d7ebec"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const horasTotales = [
    "10:00 AM", "11:00 AM", "12:00 PM", 
    "02:00 PM", "03:00 PM", "04:00 PM", 
    "05:00 PM", "06:30 PM"
];

window.onload = function() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').min = hoy;
    document.getElementById('fecha').value = hoy;
    document.getElementById('fechaAdmin').value = hoy;
    cargarServicios();
    cargarHorasDisponibles();
};

// Cargar servicios dinámicos desde Firestore
async function cargarServicios() {
    const selectServicio = document.getElementById('servicio');
    const selectServicioAdmin = document.getElementById('listaServiciosAdmin');
    
    selectServicio.innerHTML = '<option value="">Cargando servicios...</option>';
    if(selectServicioAdmin) selectServicioAdmin.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "servicios"));
        selectServicio.innerHTML = "";
        
        if (querySnapshot.empty) {
            // Servicios por defecto si la base de datos está vacía
            const defs = ["Corte Ejecutivo - $500 DOP", "Corte + Barba - $800 DOP"];
            defs.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s; opt.textContent = s;
                selectServicio.appendChild(opt);
            });
            return;
        }

        querySnapshot.forEach((documento) => {
            const data = documento.data();
            const textoServicio = `${data.nombre} - ${data.precio}`;
            
            // Para el cliente
            const opt = document.createElement('option');
            opt.value = textoServicio;
            opt.textContent = textoServicio;
            selectServicio.appendChild(opt);

            // Para el panel admin (guardamos el ID del documento en el value para borrarlo fácil)
            if(selectServicioAdmin) {
                const optAdmin = document.createElement('option');
                optAdmin.value = documento.id;
                optAdmin.textContent = textoServicio;
                selectServicioAdmin.appendChild(optAdmin);
            }
        });
    } catch (error) {
        console.error("Error al cargar servicios:", error);
    }
}

// Crear nuevo servicio desde el panel de admin
window.crearServicio = async function() {
    const nombre = document.getElementById('nuevoServicioNombre').value.trim();
    const precio = document.getElementById('nuevoServicioPrecio').value.trim();

    if (!nombre || !precio) {
        alert("Por favor, ingresa el nombre y el precio del servicio.");
        return;
    }

    try {
        await addDoc(collection(db, "servicios"), { nombre, precio });
        alert("¡Servicio agregado con éxito!");
        document.getElementById('nuevoServicioNombre').value = "";
        document.getElementById('nuevoServicioPrecio').value = "";
        cargarServicios();
    } catch (error) {
        alert("Error al guardar el servicio.");
    }
};

// Eliminar servicio seleccionado
window.eliminarServicioSeleccionado = async function() {
    const selectAdmin = document.getElementById('listaServiciosAdmin');
    const idServicio = selectAdmin.value;

    if (!idServicio) {
        alert("Selecciona un servicio válido para eliminar.");
        return;
    }

    if (confirm("¿Estás seguro de que deseas eliminar este servicio?")) {
        try {
            await deleteDoc(doc(db, "servicios", idServicio));
            alert("Servicio eliminado correctamente.");
            cargarServicios();
        } catch (error) {
            alert("Error al eliminar el servicio.");
        }
    }
};

// Cargar horas disponibles
window.cargarHorasDisponibles = async function() {
    const fechaSeleccionada = document.getElementById('fecha').value;
    const selectHora = document.getElementById('hora');
    
    if (!fechaSeleccionada) return;

    selectHora.innerHTML = '<option value="">Cargando horarios...</option>';

    try {
        const q = query(collection(db, "citas"), where("fecha", "==", fechaSeleccionada));
        const querySnapshot = await getDocs(q);
        let horasOcupadas = [];
        let diaBloqueado = false;
        
        querySnapshot.forEach((documento) => {
            const data = documento.data();
            if (data.tipo === "bloqueo" && data.hora === "TODAS") diaBloqueado = true;
            horasOcupadas.push(data.hora);
        });

        selectHora.innerHTML = ""; 

        if (diaBloqueado) {
            const option = document.createElement('option');
            option.textContent = "❌ Día no laborable / Cerrado";
            option.disabled = true;
            selectHora.appendChild(option);
            selectHora.disabled = true;
            return;
        }

        let disponiblesCount = 0;
        horasTotales.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            
            if (horasOcupadas.includes(hora)) {
                option.textContent = `${hora} - ❌ No disponible`;
                option.disabled = true;
                option.style.color = "#ef4444";
            } else {
                option.textContent = `${hora} - ✅ Disponible`;
                disponiblesCount++;
            }
            selectHora.appendChild(option);
        });

        selectHora.disabled = (disponiblesCount === 0);
    } catch (error) {
        console.error("Error al cargar horas:", error);
    }
};

// Registrar cita
window.enviarReserva = async function() {
    const nombre = document.getElementById('nombre').value.trim();
    const fecha = document.getElementById('fecha').value;
    const servicio = document.getElementById('servicio').value;
    const hora = document.getElementById('hora').value;
    
    if (!nombre || !fecha || !hora || !servicio) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    try {
        await addDoc(collection(db, "citas"), { nombre, fecha, servicio, hora, tipo: "reserva" });

        const telefonoNegocio = "8293790241"; // Cambiar por el real
        const mensaje = `Hola! Nueva cita:%0A*Cliente:* ${nombre}%0A*Fecha:* ${fecha}%0A*Servicio:* ${servicio}%0A*Hora:* ${hora}`;

        alert("¡Cita registrada con éxito!");
        window.location.href = `https://wa.me/${telefonoNegocio}?text=${mensaje}`;
    } catch (error) {
        alert("Error al registrar la cita.");
    }
};

// Panel de Administración Acceso
window.activarAdmin = function() {
    const clave = prompt("Ingresa la contraseña de administrador:");
    if (clave === "1234") {
        document.getElementById('seccion-cliente').style.display = 'none';
        document.getElementById('seccion-admin').style.display = 'block';
    } else if (clave !== null) {
        alert("Contraseña incorrecta.");
    }
};

window.cambiarVista = function(isAdmin) {
    document.getElementById('seccion-cliente').style.display = isAdmin ? 'none' : 'block';
    document.getElementById('seccion-admin').style.display = isAdmin ? 'block' : 'none';
};

window.bloquearHorarioAdmin = async function() {
    const fecha = document.getElementById('fechaAdmin').value;
    const hora = document.getElementById('horaAdmin').value;

    if (!fecha) { alert("Selecciona una fecha."); return; }

    try {
        await addDoc(collection(db, "citas"), { nombre: "BLOQUEO_ADMIN", fecha, servicio: "N/A", hora, tipo: "bloqueo" });
        alert("¡Bloqueo aplicado con éxito!");
        document.getElementById('seccion-admin').style.display = 'none';
        document.getElementById('seccion-cliente').style.display = 'block';
        cargarHorasDisponibles();
    } catch (error) { alert("Error al bloquear."); }
};

window.cancelarCita = async function() {
    const nombreBuscado = document.getElementById('buscarNombre').value.trim();
    if (!nombreBuscado) { alert("Ingresa tu nombre."); return; }

    try {
        const q = query(collection(db, "citas"), where("nombre", "==", nombreBuscado));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) { alert("No se encontró cita."); return; }

        querySnapshot.forEach(async (docRef) => { await deleteDoc(doc(db, "citas", docRef.id)); });
        alert("Cita cancelada con éxito.");
        location.reload();
    } catch (error) { alert("Error al cancelar."); }
};

window.buscarYModificarCita = async function() {
    const nombreBuscado = document.getElementById('buscarNombre').value.trim();
    if (!nombreBuscado) { alert("Ingresa tu nombre."); return; }

    try {
        const q = query(collection(db, "citas"), where("nombre", "==", nombreBuscado));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) { alert("No se encontró cita."); return; }

        querySnapshot.forEach(async (docRef) => { await deleteDoc(doc(db, "citas", docRef.id)); });
        document.getElementById('nombre').value = nombreBuscado;
        alert("Cita anterior liberada. Selecciona tu nueva fecha y hora.");
        cargarHorasDisponibles();
    } catch (error) { alert("Error al modificar."); }
};
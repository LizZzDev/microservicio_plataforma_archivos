import { useState, useEffect } from "react";
import styles from "../../styles/Profile.module.css";

const Profile = () => {
  // estados para controlar la informacion de la pantalla
  const [userData, setUserData] = useState(null); // guarda los datos del usuario cuando llegan del servidor
  const [loading, setLoading] = useState(true);   // controla si se muestra el mensaje de carga
  const [error, setError] = useState(null);       // almacena el mensaje de error si algo falla

  useEffect(() => {
    // funcion encargada de solicitar los datos al backend
    const fetchUserProfile = async () => {
      try {
        // 1. busca el token de autenticacion en el almacenamiento local
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No se encontró el token de sesión. Por favor, inicia sesión de nuevo.");
          setLoading(false);
          return;
        }

        // 2. decodifica el token jwt de forma nativa para extraer el contenido
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));

        // obtiene el identificador del usuario segun las propiedades de .net
        const userId = payload.nameid || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

        if (!userId) {
          setError("El token de sesión no es válido.");
          setLoading(false);
          return;
        }

        // 3. realiza la peticion al servidor usando el identificador obtenido
        const response = await fetch(`http://localhost:5217/api/User/${userId}`, {
          headers: {
            "Authorization": `Bearer ${token}` // envia el token para autorizar la solicitud
          }
        });

        if (response.ok) {
          const data = await response.json();

          // funcion interna para dar un formato legible a las fechas
          const formatDate = (dateString) => {
            if (!dateString) return "-";
            const date = new Date(dateString);
            return date.toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric"
            });
          };

          // 4. asigna los datos del servidor a las propiedades que usa el diseño
          setUserData({
            username: data.name,
            email: data.email,
            role: data.role.toLowerCase() === "admin" ? "Administrador" : "Usuario Común",
            status: data.isActive ? "Activado" : "Inactivo",
            birthdate: formatDate(data.birth),
            registeredAt: formatDate(data.createdAt)
          });
        } else {
          setError("No se pudo obtener la información del usuario.");
        }
      } catch (err) {
        console.error("Error al cargar el perfil:", err);
        setError("Error de conexión con el servidor.");
      } finally {
        setLoading(false); // finaliza el estado de carga en cualquier caso
      }
    };

    fetchUserProfile();
  }, []);

  // muestra un mensaje de espera si los datos aun no se han recibido
  if (loading) return <div className={styles.container}><p>Cargando perfil...</p></div>;
  // muestra el mensaje de error si ocurrio un problema en la solicitud
  if (error) return <div className={styles.container}><p style={{ color: "red" }}>{error}</p></div>;
  if (!userData) return null;

  return (
    <div className={styles.container}>
      {/* cabecera con el titulo de la seccion */}
      <div className={styles.header}>
        <h2>Mi Perfil</h2>
        <p>Administra tu información personal y la seguridad de tu cuenta.</p>
      </div>

      <div className={styles.card}>
        
        {/* panel izquierdo que muestra el avatar y el rol del usuario */}
        <div className={styles.leftPanel}>
          <div className={styles.avatar}>{userData.username ? userData.username.charAt(0).toUpperCase() : "?"}</div>
          <h3 className={styles.username}>{userData.username}</h3>
          <span className={styles.badge}>{userData.role}</span>
        </div>

        {/* panel derecho que contiene los campos detallados de la cuenta */}
        <div className={styles.rightPanel}>
          
          <div className={styles.section}>
            <h3>Información de la cuenta</h3>
            
            {/* cuadricula organizada con los valores del usuario */}
            <div className={styles.dataGrid}>
              
              <div className={styles.field}>
                <span className={styles.label}>Correo electrónico</span>
                <div className={styles.valueBox}>{userData.email}</div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Fecha de nacimiento</span>
                <div className={styles.valueBox}>{userData.birthdate}</div>
              </div>
              
              <div className={styles.field}>
                <span className={styles.label}>Estado de la cuenta</span>
                {/* cambia el estilo visual dependiendo de si la cuenta esta activa o no */}
                <div className={userData.status === "Activado" ? styles.valueBoxActive : styles.valueBoxInactive}>
                  <span className={styles.statusDot}></span>
                  {userData.status}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Fecha de registro</span>
                <div className={styles.valueBox}>{userData.registeredAt}</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
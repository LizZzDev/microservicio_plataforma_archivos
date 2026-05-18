import { useState, useEffect } from "react";
import styles from "../../styles/Dashboard.module.css";
import { FileText, Download, User, Clock, FolderOpen, Activity } from "lucide-react";

const Dashboard = () => {
  // estados para guardar los valores numericos y la lista de archivos del backend
  const [stats, setStats] = useState({
    totalDirectories: 0,
    totalFiles: 0,
    totalUsers: 0
  });
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // funcion encargada de solicitar los datos estadisticos al servidor
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("http://localhost:5217/api/Dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          
          // asigna los conteos generales obtenidos a su estado correspondiente
          setStats({
            totalDirectories: data.totalDirectories,
            totalFiles: data.totalFiles,
            totalUsers: data.totalUsers
          });

          // guarda unicamente los ultimos cinco archivos en la lista de actividad reciente
          setSharedFiles(data.recentFiles);
        }
      } catch (error) {
        console.error("Error al conectar con la API del Dashboard:", error);
      } finally {
        setLoading(false); // termina la visualizacion del estado de carga en pantalla
      }
    };

    fetchDashboardData();
  }, []);

  // funcion encargada de iniciar la descarga de un archivo especifico
  const handleDownload = (fileId, fileName) => {
    const downloadUrl = `http://localhost:5217/api/Files/${fileId}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName; // asigna el nombre original del archivo para guardarlo de forma correcta
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // limpia el documento eliminando el enlace creado
  };

  return (
    <div className={styles.container}>
      
      {/* cabecera principal del panel de control */}
      <div className={styles.header}>
        <h2>Inicio</h2>
        <p>Bienvenido</p>
      </div>

      {/* tarjetas que muestran las estadisticas de la base de datos */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><FolderOpen size={24} /></div>
          <div className={styles.statInfo}>
            <h3>{stats.totalDirectories}</h3>
            <span>Carpetas totales</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}><FileText size={24} /></div>
          <div className={styles.statInfo}>
            <h3>{stats.totalFiles}</h3>
            <span>Archivos compartidos</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}><User size={24} /></div>
          <div className={styles.statInfo}>
            <h3>{stats.totalUsers}</h3>
            <span>Usuarios totales</span>
          </div>
        </div>
      </div>

      {/* seccion inferior para visualizar la actividad reciente de la plataforma */}
      <div className={styles.recentSection}>
        <h3><Activity size={20} /> Agregado recientemente</h3>
        
        {loading ? (
          <p>Cargando actividad...</p>
        ) : (
          <div className={styles.recentList}>
            {sharedFiles.length === 0 ? (
              <p style={{ opacity: 0.6, padding: "10px" }}>No se encontraron archivos recientes.</p>
            ) : (
              sharedFiles.map((file) => (
                <div key={file.id} className={styles.recentItem}>
                  
                  <div className={styles.fileMain}>
                    <FileText size={18} opacity={0.7} />
                    <span>{file.name}</span>
                  </div>

                  <div className={styles.fileMeta}>
                    <span className={styles.metaItem}><User size={14}/> {file.owner}</span>
                    <span className={styles.metaItem}><Clock size={14}/> {file.date}</span>
                    {/* realiza la operacion matematica para convertir el tamaño de bytes a megabytes */}
                    <span className={styles.metaItem}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  <button 
                    className={styles.downloadBtn} 
                    title="Descargar"
                    onClick={() => handleDownload(file.id, file.name)}
                  >
                    <Download size={16} />
                  </button>
                  
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
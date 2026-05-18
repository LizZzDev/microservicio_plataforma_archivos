import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Plus, Upload, ArrowLeft } from "lucide-react";
import styles from "../../styles/Files.module.css";
import FileTable from "../../components/files/FileTable";
import { useAuth } from "../../context/AuthContext";

const Repository = () => {
  const { id } = useParams(); // obtiene el identificador de la carpeta desde la barra de direcciones
  const navigate = useNavigate(); // herramienta para cambiar de pagina o navegar en el historial
  const { user } = useAuth(); // obtiene la informacion del usuario que inicio sesion
  const fileInputRef = useRef(null); // referencia para activar el selector de archivos oculto

  // estados para almacenar los elementos del repositorio
  const [displayData, setDisplayData] = useState([]); // guarda la lista de archivos y carpetas recibida
  const [totalPages, setTotalPages] = useState(1);     // guarda la cantidad de paginas disponibles

  // estados para controlar los valores de busqueda y filtrado
  const [search, setSearch] = useState(""); // filtro por nombre del elemento
  const [type, setType] = useState("");     // filtro por tipo de elemento
  const [owner, setOwner] = useState("");   // filtro por creador del elemento
  const [date, setDate] = useState("");     // filtro por fecha de creacion

  // estados para el manejo de la pagonacion
  const [page, setPage] = useState(1);            // numero de la pagina actual
  const [itemsPerPage, setItemsPerPage] = useState(5); // cantidad de elementos por pagina

  // funcion encargada de pedir los elementos filtrados al backend
  const loadRepositoryData = async () => {
    try {
      // define el parametro de la carpeta si existe una carpeta seleccionada
      const folderParam = id ? `folderId=${id}` : "";
      
      // realiza la consulta incluyendo la paginacion y todos los filtros activos
      const response = await fetch(
        `http://localhost:5217/api/Repository?${folderParam}&page=${page}&pageSize=${itemsPerPage}&search=${search}&type=${type}&owner=${owner}&date=${date}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setDisplayData(result.data);       // asigna los elementos obtenidos a la tabla
        setTotalPages(result.totalPages);  // actualiza el numero total de paginas
      }
    } catch (error) {
      console.error("Error al conectar con el repositorio:", error);
    }
  };

  // ejecuta la peticion al backend cada vez que cambia la carpeta, la pagina o un filtro
  useEffect(() => {
    loadRepositoryData();
  }, [id, page, itemsPerPage, search, type, owner, date]);

  // restablece la navegacion a la pagina 1 si se cambia de carpeta o de filtros
  useEffect(() => {
    setPage(1);
  }, [id, search, type, owner, date]);

  // redirige a la ruta correspondiente si el elemento seleccionado es una carpeta
  const handleOpenFolder = (item) => {
    if (item.type === "folder") {
      navigate(`/directories/${item.id}`);
    }
  };

  // verifica si el usuario conectado tiene el rol de administrador
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // funcion encargada de enviar la solicitud para crear una nueva carpeta
  const handleCreateFolder = async () => {
    const folderName = prompt("Introduce el nombre de la nueva carpeta:");
    if (!folderName || !folderName.trim()) return; // detiene el proceso si no se ingreso un nombre valido

    try {
      const response = await fetch("http://localhost:5217/api/Directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: id ? Number(id) : null, // asigna la carpeta contenedora si no esta en la raiz
          userId: user?.id || 1            // asigna el identificador del creador
        })
      });

      if (response.ok) {
        alert("¡Carpeta creada con éxito!");
        loadRepositoryData(); // actualiza la tabla para mostrar el cambio de inmediato
      } else {
        const errorText = await response.text();
        alert("Error: " + errorText);
      }
    } catch (error) {
      console.error("Error al crear carpeta:", error);
    }
  };

  // funcion encargada de enviar un archivo al servidor
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]; // extrae el archivo seleccionado por el usuario
    if (!file) return;

    // prepara el formato de datos necesario para enviar archivos binarios
    const formData = new FormData();
    formData.append("file", file);
    formData.append("directoryId", id);
    formData.append("userId", user?.id || 1);

    try {
      const response = await fetch("http://localhost:5217/api/Files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("¡Archivo subido con éxito!");
        loadRepositoryData(); // actualiza la tabla para incluir el nuevo archivo
      } else {
        const errorText = await response.text();
        alert("Error: " + errorText);
      }
    } catch (error) {
      console.error("Error al subir archivo:", error);
    } finally {
      event.target.value = null; // limpia el selector de archivos para permitir subidas consecutivas
    }
  };

  // valida las reglas antes de abrir el explorador de archivos del sistema
  const onUploadClick = () => {
    if (!id) {
      alert("REGLA: No puedes subir archivos en la raíz. Por favor, entra a una carpeta primero.");
      return;
    }
    fileInputRef.current.click(); // activa el clic en el input de tipo archivo oculto
  };

  // funcion encargada de enviar la solicitud para renombrar un archivo o carpeta
  const handleEdit = async (item) => {
    const newName = prompt(`Introduce el nuevo nombre para ${item.name}:`, item.name);
    if (!newName || newName.trim() === "" || newName === item.name) return;

    // selecciona la direccion url adecuada segun el tipo de elemento
    const endpoint = item.type === "folder" 
      ? `http://localhost:5217/api/Directories/${item.id}/rename?userId=${user?.id || 1}&role=${user?.role || "user"}`
      : `http://localhost:5217/api/Files/${item.id}/rename?userId=${user?.id || 1}&role=${user?.role || "user"}`;

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: newName.trim() })
      });

      if (response.ok) {
        loadRepositoryData(); // actualiza los datos en pantalla
      } else {
        const errorText = await response.text();
        alert("Error al renombrar: " + errorText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // funcion encargada de solicitar la eliminacion de un elemento
  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar ${item.type === "folder" ? "la carpeta" : "el archivo"} "${item.name}"?`);
    if (!confirmDelete) return;

    // determina la url de eliminacion segun corresponda a una carpeta o un archivo
    const endpoint = item.type === "folder" 
      ? `http://localhost:5217/api/Directories/${item.id}?userId=${user?.id || 1}&role=${user?.role || "user"}`
      : `http://localhost:5217/api/Files/${item.id}?userId=${user?.id || 1}&role=${user?.role || "user"}`;

    try {
      const response = await fetch(endpoint, {
        method: "DELETE"
      });

      if (response.ok) {
        loadRepositoryData(); // actualiza la informacion visible
      } else {
        const errorText = await response.text();
        alert("No se pudo eliminar: " + errorText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // funcion encargada de gestionar la descarga de archivos individuales
  const handleDownload = (item) => {
    if (item.type === "folder") {
      alert("No se pueden descargar carpetas directamente.");
      return;
    }
    // genera un enlace temporal oculto que inicia la descarga directa desde el servidor
    const downloadUrl = `http://localhost:5217/api/Files/${item.id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = item.name; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // remueve el enlace temporal del documento html
  };

  return (
    <div className={styles.container}>
      {/* panel superior que incluye el titulo del directorio y las acciones principales */}
      <div className={styles.headerActions}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* muestra el boton de regreso unicamente si se esta dentro de un subdirectorio */}
          {id && (
            <button className={styles.iconBtn} onClick={() => navigate(-1)} title="Regresar">
              <ArrowLeft size={20} />
            </button>
          )}
          <h2>{id ? `Directorio N° ${id}` : "Repositorio raíz"}</h2>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={styles.btn} onClick={handleCreateFolder}>
            <Plus size={18} /> Nueva carpeta
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            onChange={handleFileUpload} 
          />
          <button 
            className={styles.btn} 
            style={{ backgroundColor: "#3E5C76" }} 
            onClick={onUploadClick}
          >
            <Upload size={18} /> Subir archivo
          </button>
        </div>
      </div>

      {/* barra de herramientas que agrupa todos los filtros disponibles */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <input type="text" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="folder">Carpetas</option>
            <option value="file">Archivos</option>
          </select>
          <input type="text" placeholder="Buscar por dueño..." value={owner} onChange={(e) => setOwner(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* control para seleccionar el limite de elementos mostrados */}
        <div className={styles.pageSize}>
          <span>Mostrar:</span>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* componente que renderiza la estructura de la tabla con los datos obtenidos */}
      <FileTable 
        data={displayData} 
        isAdmin={isAdmin} 
        onOpen={handleOpenFolder} 
        onEdit={handleEdit}        
        onDelete={handleDelete}      
        onDownload={handleDownload}
        mode="repository" 
      />

      {/* controles inferiores para alternar entre las paginas de datos */}
      <div className={styles.pagination}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page} de {totalPages || 1}</span>
        <button disabled={page >= totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>
    </div>
  );
};

export default Repository;
import { Folder, File, Download, Trash, Edit } from "lucide-react";
import styles from "../../styles/Files.module.css";
import { useAuth } from "../../context/AuthContext";

const FileTable = ({ data, isAdmin, onOpen, onEdit, onDelete, onDownload, mode }) => {
  const { user } = useAuth(); // extrae la informacion de la cuenta conectada

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Dueño</th>
          <th>Fecha</th>
          <th>Tamaño</th>
          <th className={styles.actionsHeader}>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => {
          // comprueba si el usuario conectado coincide de forma exacta con el dueño del elemento
          const isOwner = user?.name === item.owner;

          // determina si la cuenta posee los permisos necesarios para renombrar o editar el elemento
          const canEdit = isOwner || isAdmin;
          
          // determina si la cuenta posee los privilegios requeridos para remover el elemento del sistema
          const canDelete = isOwner || isAdmin;

          return (
            <tr key={item.id}>
              <td
                className={styles.name}
                onClick={() => item.type === "folder" && onOpen(item)}
                style={{ cursor: item.type === "folder" ? "pointer" : "default" }}
              >
                {item.type === "folder" ? <Folder size={18} /> : <File size={18} />}
                {item.name}
              </td>
              <td>{item.type === "folder" ? "carpeta" : "archivo"}</td>
              <td>{item.owner}</td>
              <td>{item.date}</td>
              {/* realiza el formateo de los bytes para mostrarlos de forma mas entendible en pantalla */}
              <td>{item.size === 0 || item.size === "-" ? "-" : `${(item.size / 1024 / 1024).toFixed(2)} MB`}</td>
              <td className={styles.actionsCol}>
                
                {/* muestra el boton de descarga únicamente si el elemento corresponde a un archivo */}
                {item.type === "file" && (
                  <button 
                    className={styles.iconBtn} 
                    title="Descargar"
                    onClick={() => onDownload(item)}
                  >
                    <Download size={16} />
                  </button>
                )}

                <button
                  className={styles.iconBtn}
                  disabled={!canEdit}
                  title={canEdit ? "Renombrar" : "Sin permisos"}
                  onClick={() => onEdit(item)}
                >
                  <Edit size={16} />
                </button>

                <button
                  className={`${styles.iconBtn} ${styles.delete}`}
                  disabled={!canDelete}
                  title={canDelete ? "Eliminar" : "Sin permisos"}
                  onClick={() => onDelete(item)}
                >
                  <Trash size={16} />
                </button>

              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default FileTable;
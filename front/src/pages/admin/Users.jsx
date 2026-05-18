import { useState, useEffect } from "react";
import { Shield, ShieldOff, User as UserIcon, UserCheck, UserX, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import styles from "../../styles/Users.module.css";
import { useAuth } from "../../context/AuthContext";

const Users = () => {
  // obtiene los datos del usuario logueado desde el contexto global
  const { user } = useAuth();
  
  // guarda el id del administrador actual para evitar que se autoedite o se suspenda a si mismo
  const currentAdminId = user?.id || 0; 
  
  // estado para almacenar la lista completa de usuarios traida desde el servidor
  const [users, setUsers] = useState([]);
  
  // estado booleano para controlar la visibilidad del modal de edicion en pantalla
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // almacena el id unico del usuario que se ha seleccionado para modificar
  const [editingUserId, setEditingUserId] = useState(null);
  
  // estado estructurado para controlar los campos del formulario dentro del modal
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    birthdate: "",
    role: "",
    password: "",
    confirmPassword: ""
  });

  // funcion auxiliar para recuperar el token de sesion y armar la cabecera de autorizacion jwt
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  // funcion asincrona para conectar con el servidor y descargar el listado de usuarios
  const fetchUsers = async () => {
    try {
      // realiza la peticion http con las cabeceras de seguridad requeridas
      const response = await fetch("http://localhost:5217/api/User", {
        headers: { ...getAuthHeader() }
      });
      
      // verifica si el servidor proceso la solicitud de forma correcta
      if (response.ok) {
        const data = await response.json();
        
        // recorre el arreglo original y adapta las propiedades del backend al formato del frontend
        const mappedUsers = data.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          // divide la cadena de fecha para conservar unicamente el formato año mes dia
          birthdate: u.birth ? u.birth.split("T")[0] : "", 
          role: u.role,
          // convierte el valor booleano de activacion en un texto legible
          status: u.isActive ? "Activo" : "Suspendido"
        }));
        
        // guarda el nuevo arreglo transformado dentro del estado local de usuarios
        setUsers(mappedUsers);
      }
    } catch (error) {
      // registra en la consola del navegador si ocurrio un fallo durante la descarga
      console.error("Error al cargar usuarios:", error);
    }
  };

  // efecto secundario que ejecuta la carga de usuarios automaticamente al abrir la pantalla
  useEffect(() => {
    fetchUsers();
  }, []);

  // estado encargado de almacenar los valores de busqueda y los filtros de la tabla
  const [f, setF] = useState({ search: "", role: "", status: "", birthdate: "" });
  
  // estado para llevar el control del numero de pagina actual de la tabla
  const [page, setPage] = useState(1);
  
  // estado para definir cuantos registros se deben mostrar al mismo tiempo por pantalla
  const [limit, setLimit] = useState(5);

  // filtra el arreglo completo de usuarios basándose en las condiciones de la barra superior
  const filtered = users.filter(u => 
    // compara el texto de busqueda con el nombre o el correo del usuario sin importar mayusculas
    (u.name.toLowerCase().includes(f.search.toLowerCase()) || u.email.toLowerCase().includes(f.search.toLowerCase())) &&
    // valida si el filtro de rol esta vacio o si coincide con el rol del usuario
    (!f.role || u.role.toLowerCase() === f.role.toLowerCase()) && 
    // valida si el filtro de estado esta vacio o si coincide con el estado del usuario
    (!f.status || u.status === f.status) && 
    // valida si el filtro de fecha esta vacio o si coincide con el cumpleaños del usuario
    (!f.birthdate || u.birthdate.includes(f.birthdate))
  );

  // calcula la cantidad total de paginas necesarias dividiendo los elementos filtrados entre el limite
  const total = Math.ceil(filtered.length / limit);
  
  // segmenta el arreglo filtrado para extraer unicamente los elementos correspondientes a la pagina actual
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  // funcion para alterar de forma rapida el rol o el estado de un usuario mediante botones directos
  const toggle = async (id, field, v1, v2) => {
    // restringe la ejecucion si el administrador intenta modificarse a si mismo por accidente
    if (id === currentAdminId) return;

    // busca el objeto completo del usuario dentro del estado local usando su id unico
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    // recupera el valor actual de la propiedad y determina cual sera el nuevo valor inverso
    const currentValue = targetUser[field];
    const newValue = currentValue === v1 ? v2 : v1;

    try {
      let response;
      
      // evalua si la propiedad que se desea alterar corresponde al estado de cuenta
      if (field === "status") {
        // convierte el texto de estado activo en un valor booleano para el servidor
        const isActiveBool = newValue === "Activo";
        // realiza la peticion de actualizacion al endpoint de estado del servidor
        response = await fetch(`http://localhost:5217/api/User/${id}/status`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          body: JSON.stringify(isActiveBool)
        });
      } else if (field === "role") {
        // realiza la peticion de actualizacion al endpoint de roles del servidor
        response = await fetch(`http://localhost:5217/api/User/${id}/role`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          body: JSON.stringify(newValue.toLowerCase())
        });
      }
      
      // evalua si el servidor proceso y confirmo el cambio de forma exitosa
      if (response && response.ok) {
        // recorre la lista local y reemplaza los datos antiguos con el nuevo valor modificado
        setUsers(users.map(u => u.id === id ? { ...u, [field]: newValue } : u));
      } else {
        // muestra una alerta si el servidor rechazo la operacion o devolvió un error
        alert("No se pudo actualizar en el servidor");
      }
    } catch (error) {
      // captura y despliega errores en caso de fallos de red o caidas del servidor
      console.error("Error al actualizar usuario:", error);
      alert("Error de conexión con el servidor");
    }
  };

  // funcion para transferir la informacion del usuario seleccionado hacia el formulario del modal
  const openEditModal = (selectedUser) => {
    // registra el id del usuario que se va a editar de forma global en el componente
    setEditingUserId(selectedUser.id);
    // rellena los campos del estado del formulario con los valores actuales del usuario
    setEditForm({
      name: selectedUser.name,
      email: selectedUser.email,
      birthdate: selectedUser.birthdate,
      role: selectedUser.role.toLowerCase(),
      password: "", // inicializa la contraseña vacia por motivos de seguridad
      confirmPassword: ""
    });
    // cambia el estado booleano para hacer visible la ventana del modal en la interfaz
    setIsModalOpen(true);
  };

  // funcion encargada de procesar el envio del formulario completo de edicion
  const handleEditSubmit = async (e) => {
    // detiene el comportamiento por defecto del navegador para evitar que la pagina se recargue
    e.preventDefault();

    // verifica que las contraseñas escritas coincidan exactamente en caso de haber llenado el campo
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      // envia la estructura completa de datos modificados hacia la ruta especifica del usuario
      const response = await fetch(`http://localhost:5217/api/User/${editingUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          birth: editForm.birthdate,
          role: editForm.role,
          // envia los campos de clave o un valor nulo si el administrador decidio no cambiarlos
          password: editForm.password || null,
          confirmPassword: editForm.confirmPassword || null
        })
      });

      // evalua si la modificacion general fue guardada exitosamente en la base de datos
      if (response.ok) {
        alert("Usuario actualizado con éxito");
        // cierra la ventana del modal de edicion limpiando la pantalla
        setIsModalOpen(false);
        // solicita nuevamente la lista de usuarios al servidor para refrescar la tabla principal
        fetchUsers(); 
      } else {
        // extrae el mensaje de error del servidor en texto plano si la operacion fue rechazada
        const errorText = await response.text();
        alert(errorText || "Error al actualizar el usuario");
      }
    } catch (error) {
      // captura fallos graves durante el proceso de envio del formulario
      console.error("Error al actualizar usuario:", error);
      alert("Error de conexión");
    }
  };

  // componente funcional pequeño creado para estandarizar los botones de accion de la tabla
  const ActionBtn = ({ icon: Icon, text, cls, action, disabled }) => (
    <button className={`${styles.btnAction} ${styles[cls]}`} onClick={action} disabled={disabled}>
      <Icon size={16} /> {text}
    </button>
  );

  return (
    <div className={styles.container}>
      {/* cabecera principal con informacion sobre la seccion de administracion */}
      <div className={styles.header}>
        <h2>Gestión de Usuarios</h2>
        <p>Administra roles, edita información y controla el acceso al sistema.</p>
      </div>

      {/* barra de herramientas donde se agrupan los inputs de busqueda y filtrado */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {/* input para filtrar dinamicamente por caracteres escritos en tiempo real */}
          <input type="text" placeholder="Buscar..." value={f.search} onChange={e => setF({...f, search: e.target.value})} />
          {/* selector de fecha para aislar usuarios nacidos en un dia o año particular */}
          <input type="date" title="Filtrar por fecha de nacimiento" value={f.birthdate} onChange={e => setF({...f, birthdate: e.target.value})} />
          {/* menu desplegable para segmentar usuarios de acuerdo a su rol asignado */}
          <select value={f.role} onChange={e => setF({...f, role: e.target.value})}>
            <option value="">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuario</option>
          </select>
          {/* menu desplegable para aislar cuentas por su estado actual de conexion */}
          <select value={f.status} onChange={e => setF({...f, status: e.target.value})}>
            <option value="">Todos los Estados</option>
            <option value="Activo">Activo</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </div>
        {/* contenedor para configurar las dimensiones de la paginacion de la tabla */}
        <div className={styles.pageSize}>
          <span>Mostrar:</span>
          {/* altera el limite de filas visibles convirtiendo el valor elegido en un numero valido */}
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>

      {/* contenedor estructural de la tabla de datos principal */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr><th>Usuario</th><th>Fecha de Nacimiento</th><th>Rol</th><th>Estado</th><th className={styles.actionsHeader}>Acciones</th></tr>
          </thead>
          <tbody>
            {/* evalua si el arreglo paginado contiene elementos listos para ser mostrados */}
            {paginated.length > 0 ? paginated.map(u => {
              // comprueba si el id de la fila pertenece al administrador que esta mirando la pantalla
              const isMe = u.id === currentAdminId;
              // normaliza el nombre del rol para estandarizar la etiqueta visual en español
              const displayRole = u.role === "admin" || u.role === "Admin" ? "Administrador" : "Usuario";
              return (
                // aplica un estilo visual opaco si la fila corresponde a un usuario suspendido
                <tr key={u.id} className={u.status === "Suspendido" ? styles.rowDisabled : ""}>
                  <td>
                    <div className={styles.userInfo}>
                      {/* genera un avatar esferico usando unicamente la primera letra del nombre */}
                      <div className={styles.avatar}>{u.name.charAt(0).toUpperCase()}</div>
                      <div>
                        {/* despliega el nombre del usuario y concatena una marca identificativa si es el propio admin */}
                        <div className={styles.name}>{u.name} {isMe && "(Tú)"}</div>
                        <div className={styles.email}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.birthdate}</td>
                  <td>
                    {/* asigna clases css diferentes al contenedor de la etiqueta según el nivel de rol */}
                    <span className={displayRole === "Administrador" ? styles.badgeAdmin : styles.badgeUser}>
                      {/* evalua que icono de lucide renderizar de acuerdo al nivel de permisos */}
                      {displayRole === "Administrador" ? <Shield size={14}/> : <UserIcon size={14}/>} {displayRole}
                    </span>
                  </td>
                  <td>
                    {/* aplica un estilo de color diferente al texto de estado segun las condiciones de la cuenta */}
                    <span className={u.status === "Activo" ? styles.statusActive : styles.statusInactive}>
                      <span className={styles.statusDot}></span> {u.status}
                    </span>
                  </td>
                  <td className={styles.actionsCol}>
                    <div className={styles.actionGroup}>
                      {/* boton encargado de transferir los datos de la fila actual e invocar el modal */}
                      <ActionBtn icon={Edit} text="Editar" cls="btnEdit" action={() => openEditModal(u)} />
                      
                      {/* renderiza un boton de revocacion si el usuario evaluado es un administrador */}
                      {displayRole === "Administrador" 
                        ? <ActionBtn icon={ShieldOff} text="Quitar Admin" cls="btnRevoke" action={() => toggle(u.id, 'role', 'admin', 'user')} disabled={isMe} />
                        : <ActionBtn icon={Shield} text="Hacer Admin" cls="btnMakeAdmin" action={() => toggle(u.id, 'role', 'user', 'admin')} />}
                      
                      {/* renderiza un boton de suspension si la cuenta evaluada se encuentra activa actualmente */}
                      {u.status === "Activo" 
                        ? <ActionBtn icon={UserX} text="Suspender" cls="btnDeactivate" action={() => toggle(u.id, 'status', 'Activo', 'Suspendido')} disabled={isMe} />
                        : <ActionBtn icon={UserCheck} text="Activar" cls="btnActivate" action={() => toggle(u.id, 'status', 'Suspendido', 'Activo')} />}
                    </div>
                  </td>
                </tr>
              )
              // muestra una fila con un mensaje de aviso si los filtros aplicados vaciaron la lista por completo
            }) : <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No se encontraron usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* panel inferior para el control y la gestion de la paginacion activa */}
      <div className={styles.pagination}>
        {/* boton de retroceso inhabilitado de manera automatica si la navegacion esta en la primera pagina */}
        <button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /> Anterior</button>
        <span>Página {page} de {total || 1}</span>
        {/* boton de avance inhabilitado de manera automatica si se alcanza la ultima pagina disponible */}
        <button disabled={page >= total || total === 0} onClick={() => setPage(page + 1)}>Siguiente <ChevronRight size={18} /></button>
      </div>

      {/* renderiza la interfaz completa del modal de edicion unicamente si su estado booleano es verdadero */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Editar Información de Usuario</h3>
            {/* vincula la ejecucion de la logica asincrona al evento submit del formulario */}
            <form onSubmit={handleEditSubmit}>
              <div className={styles.fieldGroup}>
                <label>Nombre:</label>
                <input type="text" value={editForm.name} required onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Correo Electrónico:</label>
                <input type="email" value={editForm.email} required onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Fecha de Nacimiento:</label>
                <input type="date" value={editForm.birthdate} required onChange={e => setEditForm({...editForm, birthdate: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rol:</label>
                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Nueva Contraseña (Opcional):</label>
                <input type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Confirmar Nueva Contraseña:</label>
                <input type="password" value={editForm.confirmPassword} onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})} />
              </div>
              <div className={styles.modalActions}>
                {/* boton simple que desactiva el estado booleano para cerrar el modal sin guardar cambios */}
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnSave}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
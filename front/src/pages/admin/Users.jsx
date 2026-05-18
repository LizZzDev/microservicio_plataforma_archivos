import { useState, useEffect } from "react";
import { Shield, ShieldOff, User as UserIcon, UserCheck, UserX, ChevronLeft, ChevronRight, Edit, UserPlus } from "lucide-react";
import styles from "../../styles/Users.module.css";
import { useAuth } from "../../context/AuthContext";

const Users = () => {
  // obtiene los datos del usuario logueado desde el contexto global
  const { user } = useAuth();
  
  const currentAdminId = Number(user?.id) || 0; 
  
  // estado para almacenar la lista completa de usuarios traida desde el servidor
  const [users, setUsers] = useState([]);
  
  // estados booleanos para controlar la visibilidad de los modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false); // 🆕 Controla el modal de registro
  
  // almacena el id unico del usuario que se ha seleccionado para modificar
  const [editingUserId, setEditingUserId] = useState(null);
  
  // estado estructurado para controlar los campos del formulario dentro del modal de edición
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    birthdate: "",
    role: "",
    password: "",
    confirmPassword: ""
  });

  // estado estructurado para controlar los campos del formulario dentro del modal de registro
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    birthdate: "",
    role: "user",
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
      const response = await fetch("http://localhost:5217/api/User", {
        headers: { ...getAuthHeader() }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const mappedUsers = data.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          birthdate: u.birth ? u.birth.split("T")[0] : "", 
          role: u.role,
          status: u.isActive ? "Activo" : "Suspendido"
        }));
        
        setUsers(mappedUsers);
      }
    } catch (error) {
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
const filtered = users.filter(u => {
  const searchMatch = !f.search || 
    (u.name?.toLowerCase().includes(f.search.toLowerCase()) || 
     u.email?.toLowerCase().includes(f.search.toLowerCase()));

  const roleMatch = !f.role || u.role?.toLowerCase() === f.role.toLowerCase();
  
  const statusMatch = !f.status || u.status === f.status;
  
  const birthdateMatch = !f.birthdate || u.birthdate?.includes(f.birthdate);

  return searchMatch && roleMatch && statusMatch && birthdateMatch;
});

  const total = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  useEffect(() => {
  setPage(1);
}, [f, limit]);

  const toggle = async (id, field, v1, v2) => {
    if (Number(id) === currentAdminId) {
      alert("No puedes modificar tu propio rol o estado de administrador.");
      return;
    }

    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    const currentValue = targetUser[field];
    const newValue = currentValue === v1 ? v2 : v1;

    try {
      let response;
      
      if (field === "status") {
        const isActiveBool = newValue === "Activo";
        response = await fetch(`http://localhost:5217/api/User/${id}/status`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          body: JSON.stringify({ isActive: isActiveBool })
        });
      } else if (field === "role") {
        response = await fetch(`http://localhost:5217/api/User/${id}/role`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeader()
          },
          body: JSON.stringify({ role: newValue.toLowerCase() })
        });
      }
      
      if (response && response.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, [field]: newValue } : u));
      } else {
        alert("No se pudo actualizar en el servidor");
      }
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      alert("Error de conexión con el servidor");
    }
  };

  const openEditModal = (selectedUser) => {
    setEditingUserId(selectedUser.id);
    setEditForm({
      name: selectedUser.name,
      email: selectedUser.email,
      birthdate: selectedUser.birthdate,
      role: selectedUser.role.toLowerCase(),
      password: "", 
      confirmPassword: ""
    });
    setIsModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
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
          password: editForm.password || null,
          confirmPassword: editForm.confirmPassword || null
        })
      });

      if (response.ok) {
        alert("Usuario actualizado con éxito");
        setIsModalOpen(false);
        fetchUsers(); 
      } else {
        const errorText = await response.text();
        alert(errorText || "Error al actualizar el usuario");
      }
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      alert("Error de conexión");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      const response = await fetch("http://localhost:5217/api/User", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          birth: registerForm.birthdate,
          role: registerForm.role,
          password: registerForm.password,
          confirmPassword: registerForm.confirmPassword
        })
      });

      if (response.ok) {
        alert("Usuario registrado con éxito");
        setIsRegisterModalOpen(false);
        setRegisterForm({ name: "", email: "", birthdate: "", role: "user", password: "", confirmPassword: "" });
        fetchUsers();
      } else {
        const errorText = await response.text();
        alert(errorText || "Error al registrar el usuario");
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      alert("Error de conexión");
    }
  };

  const ActionBtn = ({ icon: Icon, text, cls, action, disabled }) => (
    <button className={`${styles.btnAction} ${styles[cls]}`} onClick={action} disabled={disabled}>
      <Icon size={16} /> {text}
    </button>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Gestión de Usuarios</h2>
        <p>Administra roles, edita información y controla el acceso al sistema.</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <input type="text" placeholder="Buscar..." value={f.search} onChange={e => setF({...f, search: e.target.value})} />
          <input type="date" title="Filtrar por fecha de nacimiento" value={f.birthdate} onChange={e => setF({...f, birthdate: e.target.value})} />
          <select value={f.role} onChange={e => setF({...f, role: e.target.value})}>
            <option value="">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuario</option>
          </select>
          <select value={f.status} onChange={e => setF({...f, status: e.target.value})}>
            <option value="">Todos los Estados</option>
            <option value="Activo">Activo</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </div>

        {/* 🆕 BOTÓN: Abre el modal de registro */}
        <div className={styles.actionsHeaderTop}>
          <button className={styles.btnRegisterUser} onClick={() => setIsRegisterModalOpen(true)}>
                <UserPlus size={16} /> Registrar Usuario
          </button>
        </div>

        <div className={styles.pageSize}>
          <span>Mostrar:</span>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr><th>Usuario</th><th>Fecha de Nacimiento</th><th>Rol</th><th>Estado</th><th className={styles.actionsHeader}>Acciones</th></tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map(u => {
              // 🛡️ CORRECCIÓN CRÍTICA: Ambos lados de la igualdad procesados como Number
              const isMe = Number(u.id) === currentAdminId;
              const displayRole = u.role === "admin" || u.role === "Admin" ? "Administrador" : "Usuario";
              return (
                <tr key={u.id} className={u.status === "Suspendido" ? styles.rowDisabled : ""}>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>{u.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className={styles.name}>{u.name} {isMe && "(Tú)"}</div>
                        <div className={styles.email}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.birthdate}</td>
                  <td>
                    <span className={displayRole === "Administrador" ? styles.badgeAdmin : styles.badgeUser}>
                      {displayRole === "Administrador" ? <Shield size={14}/> : <UserIcon size={14}/>} {displayRole}
                    </span>
                  </td>
                  <td>
                    <span className={u.status === "Activo" ? styles.statusActive : styles.statusInactive}>
                      <span className={styles.statusDot}></span> {u.status}
                    </span>
                  </td>
                  <td className={styles.actionsCol}>
                    <div className={styles.actionGroup}>
                      <ActionBtn icon={Edit} text="Editar" cls="btnEdit" action={() => openEditModal(u)} />
                      
                      {displayRole === "Administrador" 
                        ? <ActionBtn icon={ShieldOff} text="Quitar Admin" cls="btnRevoke" action={() => toggle(u.id, 'role', 'admin', 'user')} disabled={isMe} />
                        : <ActionBtn icon={Shield} text="Hacer Admin" cls="btnMakeAdmin" action={() => toggle(u.id, 'role', 'user', 'admin')} />}
                      
                      {u.status === "Activo" 
                        ? <ActionBtn icon={UserX} text="Suspender" cls="btnDeactivate" action={() => toggle(u.id, 'status', 'Activo', 'Suspendido')} disabled={isMe} />
                        : <ActionBtn icon={UserCheck} text="Activar" cls="btnActivate" action={() => toggle(u.id, 'status', 'Suspendido', 'Activo')} />}
                    </div>
                  </td>
                </tr>
              )
            }) : <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No se encontraron usuarios.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /> Anterior</button>
        <span>Página {page} de {total || 1}</span>
        <button disabled={page >= total || total === 0} onClick={() => setPage(page + 1)}>Siguiente <ChevronRight size={18} /></button>
      </div>

      {/* MODAL DE EDICIÓN */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Editar Información de Usuario</h3>
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
                <select value={editForm.role} disabled={Number(editingUserId) === currentAdminId} onChange={e => setEditForm({...editForm, role: e.target.value})}>
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
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnSave}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🆕 MODAL DE REGISTRO */}
      {isRegisterModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Registrar Nuevo Usuario</h3>
            <form onSubmit={handleRegisterSubmit}>
              <div className={styles.fieldGroup}>
                <label>Nombre Completo:</label>
                <input type="text" value={registerForm.name} required onChange={e => setRegisterForm({...registerForm, name: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Correo Electrónico:</label>
                <input type="email" value={registerForm.email} required onChange={e => setRegisterForm({...registerForm, email: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Fecha de Nacimiento:</label>
                <input type="date" value={registerForm.birthdate} required onChange={e => setRegisterForm({...registerForm, birthdate: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rol Asignado:</label>
                <select value={registerForm.role} onChange={e => setRegisterForm({...registerForm, role: e.target.value})}>
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label>Contraseña:</label>
                <input type="password" value={registerForm.password} required onChange={e => setRegisterForm({...registerForm, password: e.target.value})} />
              </div>
              <div className={styles.fieldGroup}>
                <label>Confirmar Contraseña:</label>
                <input type="password" value={registerForm.confirmPassword} required onChange={e => setRegisterForm({...registerForm, confirmPassword: e.target.value})} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsRegisterModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnSave}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
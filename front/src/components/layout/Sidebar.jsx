import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Folder, User as UserIcon, PanelLeft, LogOut, Users } from "lucide-react";
import styles from "../../styles/Sidebar.module.css";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "admin";
  
  // define el listado de opciones principales de navegacion de la plataforma
  const menu = [
    { name: "Inicio", path: "/dashboard", icon: <Home size={20} /> },
    { name: "Directorios", path: "/directories", icon: <Folder size={20} /> }
  ];
  
  // introduce la pestaña de administracion de usuarios si el perfil cuenta con los permisos requeridos
  if (isAdmin) {
    menu.push({ name: "Usuarios", path: "/admin/users", icon: <Users size={20} /> });
  }
  menu.push({ name: "Mi Perfil", path: "/profile", icon: <UserIcon size={20} /> });

  // cierra la sesion activa y desvia al usuario a la pantalla de bienvenida o autenticacion
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.top}>
        <button className={styles.toggle} onClick={() => setCollapsed(!collapsed)}>
          <PanelLeft size={20} />
        </button>

        <nav>
          {menu.map((item, i) => (
            <Link key={i} to={item.path} className={`${styles.link} ${location.pathname.startsWith(item.path) ? styles.active : ""}`}>
              <span className={styles.icon}>{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <button className={styles.link} style={{ background: "transparent", border: "none", cursor: "pointer", width: "100%" }} onClick={handleLogout}>
          <span className={styles.icon}><LogOut size={20} /></span>
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
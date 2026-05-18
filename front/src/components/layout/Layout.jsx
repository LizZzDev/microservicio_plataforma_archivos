import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import styles from "../../styles/Layout.module.css";

const Layout = () => {
  // controla si la barra lateral de navegacion se muestra expandida o colapsada
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.container}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      {/* seccion dinamica encargada de renderizar la vista de la ruta interna seleccionada */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import styles from "../../styles/AuthPage.module.css";

const AuthPage = () => {
  // estado para alternar de forma visual entre la pantalla de acceso y la de registro
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className={styles.container}>
      {/* añade la clase css correspondiente para realizar el efecto de animacion */}
      <div className={`${styles.card} ${isRegister ? styles.active : ""}`}>
        
        {/* muestra el componente interno seleccionado por el estado */}
        <div className={styles.formContainer}>
          {isRegister ? <Register /> : <Login />}
        </div>

        {/* seccion de diseño encargada de mostrar el panel lateral con informacion adicional */}
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            {isRegister ? (
              <>
                <h2>¡Hola, amigo!</h2>
                <p>¿Ya tienes una cuenta registrada?</p>
                <button onClick={() => setIsRegister(false)}>
                  Iniciar Sesión
                </button>
              </>
            ) : (
              <>
                <h2>¡Bienvenido!</h2>
                <p>Crea tu cuenta personal aquí</p>
                <button onClick={() => setIsRegister(true)}>
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
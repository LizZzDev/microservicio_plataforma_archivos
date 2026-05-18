import { createContext, useState, useEffect, useContext } from "react";

// crea el objeto de contexto para almacenar y compartir globalmente el estado de autenticacion
const AuthContext = createContext(null);

// funcion auxiliar para extraer y traducir las propiedades internas que vienen dentro del token jwt
const decodeTokenData = (jwtToken) => {
  try {
    // corta la cadena del token por los puntos y extrae unicamente el fragmento central del payload
    const base64Url = jwtToken.split('.')[1];
    
    // reemplaza caracteres especiales propios del formato jwt para que sea compatible con base64 estandar
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // decodifica la cadena de texto plano y la convierte en un objeto manipulable de javascript
    const payload = JSON.parse(window.atob(base64));
    
    // extrae los valores buscando tanto las claves tradicionales de microsoft identity como nombres simples
    return {
      // busca y recupera el id del usuario de los esquemas del token o de propiedades estandar
      id: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || payload.nameid || payload.sub,
      // busca y recupera el nombre de pila o apodo registrado por el usuario en el sistema
      name: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || payload.unique_name || payload.name,
      // busca y recupera la direccion de correo electronico vinculada a la cuenta
      email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || payload.email,
      // busca y recupera el rol o nivel de autorizacion para el control de accesos en las vistas
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role
    };
  } catch (error) {
    // devuelve un valor nulo de forma controlada si el token esta corrupto o es invalido
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // estado para guardar el objeto con la informacion del usuario activo que inicio sesion
  const [user, setUser] = useState(null);
  
  // estado encargado de rastrear el token jwt actual recuperandolo del almacenamiento local
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  
  // estado booleano para bloquear el renderizado visual mientras se valida la sesion del navegador
  const [loading, setLoading] = useState(true); 

  // efecto secundario que se ejecuta de forma automatica cada vez que el valor del token cambia
  useEffect(() => {
    // evalua si el estado local posee una cadena de token valida para procesar
    if (token) {
      // ejecuta la funcion auxiliar para intentar decodificar las propiedades internas del token
      const userData = decodeTokenData(token);
      
      // comprueba si los datos del usuario fueron extraidos de manera exitosa
      if (userData) {
        // inyecta el objeto del usuario procesado en el estado general del contexto
        setUser(userData);
      } else {
        // destruye la sesion de inmediato si el token no se pudo decodificar correctamente
        logout();
      }
    } else {
      // limpia el estado del usuario si el navegador no cuenta con ningun token guardado
      setUser(null);
    }
    // apaga el estado de carga para permitir que la aplicacion muestre las pantallas correspondientes
    setLoading(false);
  }, [token]);

  // funcion encargada de procesar el inicio de sesion exitoso mandado por el formulario
  const login = (jwtToken) => {
    // persiste de forma permanente la cadena del token dentro del almacenamiento local del navegador
    localStorage.setItem("token", jwtToken);
    
    // decodifica el token en ese mismo instante para obtener los datos reales del perfil
    const userData = decodeTokenData(jwtToken);
    
    // asigna el usuario directamente para romper la carrera de tiempos con el efecto secundario
    setUser(userData);
    
    // actualiza el estado local del token para propagar los cambios a toda la aplicacion
    setToken(jwtToken);
  };

  // funcion encargada de borrar y restablecer todos los datos de la sesion actual
  const logout = () => {
    // remueve por completo el registro del token del almacenamiento local del navegador
    localStorage.removeItem("token");
    
    // limpia el estado del token devolviendolo a su valor nulo por defecto
    setToken(null);
    
    // limpia el estado del usuario para asegurar que no quede informacion residual en pantalla
    setUser(null);
  };

  return (
    // provee los estados y funciones de control a todos los componentes hijos de la aplicacion
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {/* renderiza los componentes internos unicamente cuando la verificacion inicial haya terminado */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// hook personalizado para consumir de manera directa los datos del contexto de autenticacion
export const useAuth = () => useContext(AuthContext);
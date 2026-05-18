import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import styles from "../../styles/Auth.module.css";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth(); // obtiene la funcion global para guardar el estado de la sesion

  // actualiza el estado del formulario al escribir y borra el mensaje de error anterior
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // gestiona el intento de inicio de sesion al enviar los datos
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError("Todos los campos son obligatorios");
    if (!form.email.includes("@")) return setError("Correo electrónico no válido");

    try {
      // envia las credenciales del usuario al backend para su validacion
      const response = await fetch("http://localhost:5217/api/User/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password })
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || "Credenciales incorrectas");
      }

      const data = await response.json(); 
      
      if (data.token) {
        // registra el token de acceso de manera global en el contexto de la aplicacion
        login(data.token); 

        // analiza el bloque central del token jwt para leer los datos de autorizacion internos
        const base64Url = data.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        // extrae la propiedad correspondiente al rol asignado del usuario
        const userRole = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;

        // desvía la navegacion hacia una ruta o pantalla especifica segun el nivel de permisos del rol
        if (userRole?.toLowerCase() === "admin") {
          navigate("/admin/users");
        } else {
          navigate("/dashboard"); 
        }
      } else {
        throw new Error("No se recibió el token desde el servidor.");
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>Iniciar Sesión</h2>
      <Input label="Correo electrónico" name="email" value={form.email} onChange={handleChange} />
      <Input label="Contraseña" type="password" name="password" value={form.password} onChange={handleChange} />
      {error && (
        <p style={{ color: "red", fontSize: "0.8rem", textAlign: "center" }}>{error}</p>
      )}
      <Button text="Ingresar" type="submit" />
    </form>
  );
};

export default Login;
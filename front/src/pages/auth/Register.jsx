import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import styles from "../../styles/Auth.module.css";

const Register = () => {
  // estado encargado de almacenar los valores escritos en el formulario
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthdate: ""
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  // actualiza los datos del estado conforme el usuario escribe y limpia los errores activos
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
    setError("");
  };

  // procesa y valida los datos antes de realizar el registro
  const handleSubmit = async (e) => {
    e.preventDefault();

    // valida que ninguno de los campos del formulario se encuentre vacio
    if (
      !form.username ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.birthdate
    ) {
      setError("Todos los campos son obligatorios");
      return;
    }

    // realiza una verificacion basica de la estructura del correo electronico
    if (!form.email.includes("@")) {
      setError("Correo electrónico no válido");
      return;
    }

    // comprueba que la contraseña y su confirmacion coincidan de forma exacta
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      // envia la informacion del nuevo usuario para su creacion en el servidor
      const response = await fetch("http://localhost:5217/api/User", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.username,
          email: form.email,
          password: form.password,
          passwordConfirm: form.confirmPassword,
          birth: form.birthdate
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      // redirige a la vista del panel principal una vez completado el registro con exito
      navigate("/dashboard");

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>Registrarse</h2>

      <Input label="Nombre de Usuario" name="username" value={form.username} onChange={handleChange} />
      <Input label="Correo Electrónico" name="email" value={form.email} onChange={handleChange} />
      <Input label="Contraseña" type="password" name="password" value={form.password} onChange={handleChange} />
      <Input label="Confirmar Contraseña" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
      <Input label="Fecha de Nacimiento" type="date" name="birthdate" value={form.birthdate} onChange={handleChange} />

      {error && (
        <p style={{ color: "red", fontSize: "0.8rem", textAlign: "center" }}>
          {error}
        </p>
      )}

      <Button text="Registrarse" type="submit" />
    </form>
  );
};

export default Register;
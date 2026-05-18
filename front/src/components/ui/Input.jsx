import styles from "../../styles/Input.module.css";

const Input = ({ label, type = "text", value, onChange, name }) => {
  return (
    <div className={styles.container}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        name={name}
      />
    </div>
  );
};

export default Input;
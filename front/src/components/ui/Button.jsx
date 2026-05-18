import styles from "../../styles/Button.module.css";

const Button = ({ text, onClick, type = "button" }) => {
  return (
    <button type={type} onClick={onClick} className={styles.button}>
      {text}
    </button>
  );
};

export default Button;
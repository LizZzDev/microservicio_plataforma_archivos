using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Cryptography;
using System.Text;
using System.Linq; 

namespace Drive.Models;

[Table("users")] // vincula esta clase directamente con la tabla física llamada 'users' en postgresql
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("birth_date")]
    public DateTime? Birth { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = null!;

    [Required]
    [Column("email")]
    public string Email { get; set; } = null!;

    [Required]
    [Column("password")]
    public string Password { get; set; } = null!;

    [Column("role")]
    public string Role { get; set; } = "user"; // por defecto, el rol inicial siempre será 'user'

    [Column("is_active")]
    public bool IsActive { get; set; } // indica si la cuenta está habilitada o suspendida por el administrador

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // --- MÉTODOS DE SEGURIDAD ---
    public static string GetHash(string input)
    {
        byte[] inputBytes = Encoding.UTF8.GetBytes(input); // convierte el texto plano del password en bytes
        byte[] hashedBytes = MD5.HashData(inputBytes); // procesa los bytes usando el algoritmo de cifrado md5
        return BitConverter.ToString(hashedBytes); // convierte el resultado cifrado en una cadena de texto hexadecimal
    }

    public static bool ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password)) return false; // rechaza contraseñas vacías o llenas de puros espacios

        // reglas estrictas de validación que debe cumplir una contraseña nueva
        bool hasMinimum8Chars = password.Length >= 8; // mínimo 8 letras/números
        bool hasUpperChar = password.Any(char.IsUpper); // al menos una mayúscula
        bool hasLowerChar = password.Any(char.IsLower); // al menos una minúscula
        bool hasNumber = password.Any(char.IsDigit); // al menos un número
        bool hasSymbols = password.Any(ch => !char.IsLetterOrDigit(ch)); // al menos un caracter especial (*, ., -, etc)

        return hasMinimum8Chars && hasUpperChar && hasLowerChar && hasNumber && hasSymbols; // aprueba si cumple todas
    }
}

// modelo simplificado que sirve exclusivamente para mapear los datos del formulario de login
public class UserCredentials
{
    [Required]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}

// modelo robusto encargado de recibir y validar estrictamente los datos en el formulario de registro
public class CreateUser
{
    [Required]
    public string? Name { get; set; }

    [EmailAddress(ErrorMessage = "La dirección no pertenece a un dirección de correo válida")]
    [Required(ErrorMessage = "El campo es obligatorio")]
    public string? Email { get; set; }

    [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
    [Required]
    public DateTime Birth { get; set; }

    [DataType(DataType.Password)]
    [Required]
    // expresión regular que fuerza a la contraseña a tener: minúsculas, mayúsculas, números, caracteres especiales y mínimo 8 de longitud
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", 
        ErrorMessage = "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.")]
    public string? Password { get; set; }

    [DataType(DataType.Password)]
    [Required]
    [Compare("Password", ErrorMessage = "Las contraseñas no coinciden")] // valida en tiempo real que sea idéntica a la propiedad anterior
    [DisplayName("Password Confirm")]
    public string? PasswordConfirm { get; set; }
}
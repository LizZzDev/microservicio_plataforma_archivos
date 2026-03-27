using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;

namespace Drive.Models;

public class User
{
    [Key]
    [Required]
    public int Id { get; set; }

    [Required]
    public DateTime Birth { get; set; }

    [Required]
    public string Name { get; set; } = null!;

    [Required]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;


    public static string GetHash(string input)
    {
        byte[] inputBytes = Encoding.UTF8.GetBytes(input);
        byte[] hashedBytes = MD5.HashData(inputBytes);
        return BitConverter.ToString(hashedBytes);
    }
}

public class UserCredentials
{
    [Required]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}

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
    public string? Password { get; set; }

    [DataType(DataType.Password)]
    [Required]
    [Compare("Password", ErrorMessage = "Las contraseñas no coinciden")]
    [DisplayName("Password Confirm")]
    public string? PasswordConfirm { get; set; }
}
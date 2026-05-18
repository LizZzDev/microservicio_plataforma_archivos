using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Drive.Models;

[Table("files")] // asocia este objeto con la tabla física que guarda los registros de los archivos
public class FileItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; } // almacena el id del usuario que subió el archivo

    [Column("directory_id")]
    public int DirectoryId { get; set; } // almacena el id de la carpeta en donde está guardado el archivo

    [Column("name")]
    public string Name { get; set; } = null!; // nombre virtual que el usuario ve en la plataforma

    [Column("path")]
    public string Path { get; set; } = null!; // ruta o dirección física real del archivo dentro del servidor

    [Column("type")]
    public string? Type { get; set; } // formato o extensión del archivo (.pdf, .jpg, .mp4, etc)

    [Column("size")]
    public int Size { get; set; } // tamaño exacto expresado en bytes

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // --- PROPIEDADES DE NAVEGACIÓN (RELACIONES AUTOMÁTICAS DE EF CORE) ---
    [ForeignKey("UserId")]
    public virtual User? User { get; set; } // permite acceder directamente a los datos del dueño del archivo

    [ForeignKey("DirectoryId")]
    public virtual DirectoryItem? Directory { get; set; } // permite conocer los datos de la carpeta que lo contiene
}
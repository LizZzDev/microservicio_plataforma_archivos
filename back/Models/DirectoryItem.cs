using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Drive.Models;

[Table("directories")] // vincula la clase con la tabla física que maneja la estructura de carpetas
public class DirectoryItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; } // guarda el id del usuario creador y dueño de esta carpeta

    [Column("parent_id")]
    public int? ParentId { get; set; } // guarda el id de la carpeta superior (es null si la carpeta está en la raíz)

    [Column("name")]
    public string Name { get; set; } = null!;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // --- PROPIEDADES DE NAVEGACIÓN (RELACIONES AUTOMÁTICAS DE EF CORE) ---
    [ForeignKey("UserId")]
    public virtual User? User { get; set; } // permite consultar la información del dueño de la carpeta

    [ForeignKey("ParentId")]
    public virtual DirectoryItem? ParentDirectory { get; set; } // permite navegar o regresar hacia la carpeta de nivel superior
}
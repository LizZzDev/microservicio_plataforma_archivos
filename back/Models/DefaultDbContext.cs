using Microsoft.EntityFrameworkCore;

namespace Drive.Models;

// define la clase principal que gestiona todas las conexiones y consultas hacia postgresql
public class DefaultDbContext(DbContextOptions<DefaultDbContext> options) : DbContext(options)
{
    // conjuntos de datos mapeados que exponen las tablas como colecciones manipulables en c#
    public DbSet<User> Users { get; set; }
    public DbSet<DirectoryItem> Directories { get; set; }
    public DbSet<FileItem> Files { get; set; }

    // método para definir reglas específicas del modelo mediante fluent api durante la inicialización
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Role).HasDefaultValue("user"); // si se registra alguien sin rol, le pone 'user' automáticamente
            entity.Property(e => e.IsActive).HasDefaultValue(false); // obliga a que las cuentas nuevas inicien desactivadas por seguridad
            
            // configura a postgresql para que asigne la hora actual automáticamente al insertar una fila nueva
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .ValueGeneratedOnAdd();
                
            // configura a postgresql para que asigne la hora actual automáticamente al hacer modificaciones
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .ValueGeneratedOnAdd();
        });
    }
}
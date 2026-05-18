using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Drive.Models;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DirectoriesController : ControllerBase
{
    private readonly DefaultDbContext _context; // guarda la instancia de la base de datos

    public DirectoriesController(DefaultDbContext context)
    {
        _context = context; // inyecta el contexto al inicializar el controlador
    }

    // 1. OBTENER CARPETAS (Paginadas y por nivel)
    [HttpGet]
    public async Task<IActionResult> GetDirectories([FromQuery] int? parentId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Directories.Where(d => d.ParentId == parentId); // filtra carpetas según el nivel actual (padre)

        var directories = await query
            .OrderBy(d => d.Name) // acomoda los resultados alfabéticamente por nombre
            .Skip((page - 1) * pageSize) // salta los registros de las páginas anteriores
            .Take(pageSize) // toma sólo la cantidad de registros permitidos por página
            .Select(d => new {
                id = d.Id, // pasa el id único de la carpeta
                name = d.Name, // pasa el nombre de la carpeta
                owner = d.User!.Name, // extrae el nombre del dueño usando la relación virtual
                date = d.CreatedAt.ToString("yyyy-MM-dd"), // formatea la fecha limpia para el front
                type = "folder", // define el tipo estático para que react sepa qué icono renderizar
                size = "-", // las carpetas no manejan un tamaño directo en base de datos
                isOwner = true 
            })
            .ToListAsync(); // ejecuta la consulta en la base de datos y la hace lista

        return Ok(directories); // retorna la lista con estado 200 ok
    }

    // 2. CREAR CARPETA
    [HttpPost]
    public async Task<IActionResult> CreateDirectory([FromBody] CreateDirectoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) // valida que el nombre no llegue vacío o con espacios
            return BadRequest("El nombre del directorio es obligatorio.");

        var exists = await _context.Directories.AnyAsync(d => 
            d.ParentId == request.ParentId && 
            d.Name == request.Name &&
            d.UserId == request.UserId); // busca si el mismo usuario ya tiene esa carpeta en ese nivel

        if (exists) // si el resultado es verdadero, frena el flujo para evitar duplicados
            return BadRequest("Ya existe una carpeta con ese nombre en esta ubicación.");

        var newDirectory = new DirectoryItem
        {
            Name = request.Name, // asigna el nombre recibido
            ParentId = request.ParentId, // define si va en la raíz o dentro de otra carpeta
            UserId = request.UserId, // vincula el id del creador
            CreatedAt = DateTime.UtcNow, // estandariza la fecha de creación en formato utc
            UpdatedAt = DateTime.UtcNow // inicializa la fecha de actualización igual
        };

        _context.Directories.Add(newDirectory); // prepara el objeto en el contexto de entity framework
        await _context.SaveChangesAsync(); // guarda físicamente el nuevo registro en postgresql

        return Ok(newDirectory); // devuelve el objeto creado con sus ids asignados
    }

    // --- 3. RENOMBRAR CARPETA ---
    [HttpPut("{id}/rename")]
    public async Task<IActionResult> RenameDirectory(int id, [FromBody] RenameRequest request, [FromQuery] int userId, [FromQuery] string role)
    {
        var dir = await _context.Directories.FindAsync(id); // busca la carpeta directamente por su id primario
        if (dir == null) 
            return NotFound("Directorio no encontrado en la base de datos.");

        bool isAdmin = role?.ToLower() == "admin"; // evalúa si el rol recibido corresponde a un administrador
        
        // REGLA: Solo dueño o admin
        if (dir.UserId != userId && !isAdmin) // si no te pertenece y tampoco eres admin, bloquea el acceso
            return StatusCode(403, $"No tienes permiso. Esta carpeta le pertenece al usuario con ID {dir.UserId}, pero tú enviaste el ID {userId}.");

        if (string.IsNullOrWhiteSpace(request.NewName)) // valida que el nuevo nombre sea caracteres válidos
            return BadRequest("El nombre de la carpeta no puede estar vacío.");

        // REGLA: No puede haber dos directorios en el mismo nivel con el mismo nombre
        bool nameExists = await _context.Directories.AnyAsync(d => d.ParentId == dir.ParentId && d.Name.ToLower() == request.NewName.ToLower() && d.Id != id);
        if (nameExists) // valida colisiones ignorando la carpeta que estás editando actualmente
            return BadRequest("Ya existe un directorio con ese mismo nombre en este nivel.");

        dir.Name = request.NewName; // sobrescribe el nombre original con el nuevo
        dir.UpdatedAt = DateTime.UtcNow; // pisa la fecha de modificación con el momento exacto del cambio
        await _context.SaveChangesAsync(); // persiste la edición en la base de datos

        return Ok(dir); // retorna el directorio modificado
    }

    // --- 4. ELIMINAR CARPETA ---
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDirectory(int id, [FromQuery] int userId, [FromQuery] string role)
    {
        var dir = await _context.Directories.FindAsync(id); // busca el registro de la carpeta a eliminar
        if (dir == null) return NotFound("Directorio no encontrado.");

        bool isAdmin = role?.ToLower() == "admin"; // almacena el estado de permisos de administrador

        // REGLA: Solo dueño o admin
        if (dir.UserId != userId && !isAdmin) // valida identidad antes de alterar registros
            return StatusCode(403, "No tienes permiso para eliminar esta carpeta.");

        // Revisamos si tiene cosas adentro
        bool hasSubDirs = await _context.Directories.AnyAsync(d => d.ParentId == id); // busca si tiene carpetas hijas
        bool hasFiles = await _context.Files.AnyAsync(f => f.DirectoryId == id); // busca si tiene archivos asociados
        bool isEmpty = !hasSubDirs && !hasFiles; // define si está completamente limpia

        // REGLA: Usuario común solo si está vacía.
        if (!isEmpty && !isAdmin) // si tiene contenido y eres usuario normal, se cancela la operación
            return BadRequest("El directorio no está vacío. Solo los administradores pueden eliminar directorios con contenido.");

        _context.Directories.Remove(dir); // marca el registro para ser borrado de la tabla
        await _context.SaveChangesAsync(); // ejecuta el comando delete en la base de datos

        return Ok(new { message = "Directorio eliminado correctamente." }); // responde con confirmación en json
    }
}

public class CreateDirectoryRequest
{
    public string Name { get; set; } = null!;
    public int? ParentId { get; set; }
    public int UserId { get; set; }
}

public class RenameRequest
{
    public string NewName { get; set; } = null!;
}
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Drive.Models;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class FilesController : ControllerBase
{
    private readonly DefaultDbContext _context; // almacena el acceso a los datos
    private readonly string _uploadsFolder; // guarda la ruta de disco donde se alojarán los archivos físicos

    public FilesController(DefaultDbContext context)
    {
        _context = context; // inyecta el contexto de datos
        _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads"); // construye la ruta hacia la carpeta 'Uploads'
        
        if (!System.IO.Directory.Exists(_uploadsFolder)) // si la carpeta no existe físicamente en el servidor
        {
            System.IO.Directory.CreateDirectory(_uploadsFolder); // la crea en este instante para evitar errores de escritura
        }
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit] // apaga los límites estándar de iis/kestrel para soportar archivos de varios megas
    public async Task<IActionResult> UploadFile([FromForm] IFormFile file, [FromForm] int directoryId, [FromForm] int userId)
    {
        if (file == null || file.Length == 0) // valida que la petición contenga un archivo binario real
            return BadRequest("No se ha proporcionado ningún archivo válido.");

        const long maxFileSize = 10 * 1024 * 1024; // calcula el equivalente matemático a 10 megabytes
        if (file.Length > maxFileSize) // frena el proceso si el tamaño del archivo supera este límite
            return BadRequest("El archivo excede el límite máximo permitido de 10 MB.");

        var targetDirectory = await _context.Directories.AnyAsync(d => d.Id == directoryId); // verifica que la carpeta destino exista
        if (!targetDirectory) // si la carpeta no existe en la bd, no se puede meter el archivo
            return BadRequest("Destino inválido. Los archivos únicamente pueden subirse dentro de un directorio.");

        try
        {
            var uniqueFileName = $"{Guid.NewGuid()}_{file.FileName}"; // combina un id único con el nombre original para evitar duplicados
            var filePath = Path.Combine(_uploadsFolder, uniqueFileName); // arma la dirección exacta del destino final en disco

            using (var stream = new FileStream(filePath, FileMode.Create)) // inicializa el flujo de creación de archivos físicos
            {
                await file.CopyToAsync(stream); // transfiere los bytes del formulario directo al disco duro del servidor
            }

            var newFile = new FileItem
            {
                Name = file.FileName, // almacena el nombre original para mostrarlo bonito en el front
                Path = uniqueFileName, // guarda el nombre real codificado que está en el disco
                Type = Path.GetExtension(file.FileName).ToLower(), // extrae de forma automática la extensión del archivo
                Size = (int)file.Length, // guarda el tamaño exacto en bytes
                DirectoryId = directoryId, // asocia el archivo a su carpeta contenedora
                UserId = userId, // asocia el archivo con su creador
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Files.Add(newFile); // agrega la referencia a entity framework
            await _context.SaveChangesAsync(); // impacta la base de datos registrando el archivo

            return Ok(newFile); // retorna el registro guardado
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error al guardar: {ex.Message}"); // atrapa errores de permisos o fallos de hardware
        }
    }

    // --- DESCARGAR ARCHIVO ---
    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        var fileItem = await _context.Files.FindAsync(id); // busca los metadatos del archivo en la bd
        if (fileItem == null) return NotFound("Archivo no encontrado.");

        var filePath = Path.Combine(_uploadsFolder, fileItem.Path); // localiza la ruta física usando el nombre enmascarado
        if (!System.IO.File.Exists(filePath)) return NotFound("El archivo físico no existe en el servidor."); // valida que el archivo siga ahí

        // retorna el archivo forzando la descarga directa e inyectando su nombre original bonito
        return PhysicalFile(filePath, "application/octet-stream", fileItem.Name);
    }

    // --- ELIMINAR ARCHIVO ---
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFile(int id, [FromQuery] int userId, [FromQuery] string role)
    {
        var fileItem = await _context.Files.FindAsync(id); // busca la entidad del archivo por su clave primaria
        if (fileItem == null) return NotFound("Archivo no encontrado.");

        bool isAdmin = role?.ToLower() == "admin"; // analiza si los privilegios actuales son de administrador
        
        // REGLA: Solo el dueño o el admin pueden borrar
        if (fileItem.UserId != userId && !isAdmin) // deniega si un usuario común intenta borrar contenido ajeno
            return StatusCode(403, "No tienes permiso para eliminar este archivo.");

        var filePath = Path.Combine(_uploadsFolder, fileItem.Path); // apunta a la ubicación real en el disco duro
        if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath); // borra físicamente el binario si existe en la carpeta

        _context.Files.Remove(fileItem); // elimina la fila correspondiente de la base de datos lógica
        await _context.SaveChangesAsync(); // guarda la eliminación en postgresql

        return Ok(new { message = "Archivo eliminado correctamente." }); // responde éxito
    }

    // --- RENOMBRAR ARCHIVO ---
    [HttpPut("{id}/rename")]
    public async Task<IActionResult> RenameFile(int id, [FromBody] RenameRequest request, [FromQuery] int userId, [FromQuery] string role)
    {
        var fileItem = await _context.Files.FindAsync(id); // localiza el archivo que se va a editar
        if (fileItem == null) return NotFound("Archivo no encontrado.");

        bool isAdmin = role?.ToLower() == "admin"; // valida el rol de la petición
        if (fileItem.UserId != userId && !isAdmin) return StatusCode(403, "No tienes permiso."); // aplica la regla de seguridad de propiedad

        fileItem.Name = request.NewName; // cambia el nombre lógico sin alterar el archivo en disco
        fileItem.UpdatedAt = DateTime.UtcNow; // modifica la estampa de tiempo
        await _context.SaveChangesAsync(); // aplica el update en la base de datos

        return Ok(fileItem); // devuelve el objeto actualizado
    }
}
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Drive.Models;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly DefaultDbContext _context;

    public DashboardController(DefaultDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        // CONTEOS GENERALES PARA LAS TARJETAS DEL DASHBOARD
        var totalDirectories = await _context.Directories.CountAsync(); // cuenta la cantidad de carpetas creadas en total
        var totalFiles = await _context.Files.CountAsync(); // cuenta la cantidad de archivos subidos en total
        var totalUsers = await _context.Users.CountAsync(); // cuenta el número total de cuentas registradas en el sistema
        
        // cuenta específicamente cuántos usuarios tienen el rol de administrador en la base de datos
        var totalAdmins = await _context.Users.CountAsync(u => u.Role.ToLower() == "admin");

        // CONSULTA DE ARCHIVOS RECIENTES (TOP 5 MÁS NUEVOS)
        var recentFiles = await _context.Files
            .Include(f => f.User) // hace un 'join' interno para incluir los datos del usuario dueño del archivo
            .OrderByDescending(f => f.CreatedAt) // ordena la lista del archivo más nuevo al más antiguo
            .Take(5) // restringe el resultado de la base de datos para traer únicamente las últimas 5 filas

            // mapea y simplifica el resultado final en un objeto json limpio estructurado para el frontend
            .Select(f => new {
                id = f.Id,
                name = f.Name,
                owner = f.User != null ? f.User.Name : "Sistema", // si la relación existe toma el nombre, si no, escribe 'Sistema'
                date = f.CreatedAt.ToString("yyyy-MM-dd"), // convierte la fecha a texto plano descartando la hora
                size = f.Size // pasa el número entero en bytes para que el cliente lo formatee visualmente (ej. kb o mb)
            })
            .ToListAsync(); // ejecuta de manera definitiva la consulta estructurada en sql y la convierte en una lista

        // empaqueta todas las variables calculadas y las despacha juntas dentro de una respuesta exitosa
        return Ok(new {
            totalDirectories,
            totalFiles,
            totalUsers,
            totalAdmins,
            recentFiles
        });
    }
}
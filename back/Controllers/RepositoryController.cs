using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Drive.Models;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class RepositoryController : ControllerBase
{
    private readonly DefaultDbContext _context;

    public RepositoryController(DefaultDbContext context)
    {
        _context = context; // inyecta la conexión a la base de datos
    }

    [HttpGet]
    public async Task<IActionResult> GetRepository(
        [FromQuery] int? folderId, 
        [FromQuery] string? search, 
        [FromQuery] string? type, 
        [FromQuery] string? owner, 
        [FromQuery] string? date, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 5)
    {
        // 1. Preparar consulta de CARPETAS
        var dirsQuery = _context.Directories
            .Include(d => d.User) // incluye el usuario dueño de la carpeta
            .Where(d => d.ParentId == folderId) // filtra según la posición en el árbol de directorios
            .AsQueryable(); // mantiene la consulta abierta para añadir filtros dinámicos

        // 2. Preparar consulta de ARCHIVOS
        var filesQuery = _context.Files
            .Include(f => f.User) // incluye el usuario dueño del archivo
            .Where(f => f.DirectoryId == folderId) // busca los archivos contenidos en esta carpeta
            .AsQueryable(); // mantiene la consulta abierta para añadir filtros dinámicos

        // REGLA DEL PDF: "Los archivos no pueden subirse en la raíz"
        if (folderId == null) // evalúa si el cliente se encuentra en la raíz del repositorio
        {
            filesQuery = filesQuery.Where(f => false); // aplica un filtro imposible para retornar lista vacía
        }

        // 3. APLICAR FILTROS (Búsqueda por sub-cadenas como pide el PDF)
        if (!string.IsNullOrEmpty(search)) // verifica si se envió texto en el buscador general
        {
            dirsQuery = dirsQuery.Where(d => d.Name.ToLower().Contains(search.ToLower())); // busca coincidencia parcial en carpetas
            filesQuery = filesQuery.Where(f => f.Name.ToLower().Contains(search.ToLower())); // busca coincidencia parcial en archivos
        }

        if (!string.IsNullOrEmpty(owner)) // verifica si se solicita filtrar por nombre de dueño
        {
            dirsQuery = dirsQuery.Where(d => d.User!.Name.ToLower().Contains(owner.ToLower())); // filtra creadores de carpetas
            filesQuery = filesQuery.Where(f => f.User!.Name.ToLower().Contains(owner.ToLower())); // filtra creadores de archivos
        }

        if (!string.IsNullOrEmpty(date)) // verifica si viene un filtro de fecha de creación
        {
            if (DateTime.TryParse(date, out DateTime parsedDate)) // intenta parsear la cadena recibida
            {
                dirsQuery = dirsQuery.Where(d => d.CreatedAt.Date == parsedDate.Date); // compara componentes de fecha ignorando la hora
                filesQuery = filesQuery.Where(f => f.CreatedAt.Date == parsedDate.Date); // compara componentes de fecha ignorando la hora
            }
        }

        // 4. EXTRAER Y DAR FORMATO (Igualito a tu mockData de React)
        var dirsList = await dirsQuery.Select(d => new {
            id = d.Id,
            name = d.Name,
            type = "folder",
            owner = d.User!.Name,
            date = d.CreatedAt.ToString("yyyy-MM-dd"), // formatea la fecha para simplificar la lectura en react
            size = "-", // las carpetas no muestran tamaño directamente
            parentId = d.ParentId
        }).ToListAsync(); // procesa y trae la lista de carpetas mapeada

        var filesList = await filesQuery.Select(f => new {
            id = f.Id,
            name = f.Name,
            type = "file",
            owner = f.User!.Name,
            date = f.CreatedAt.ToString("yyyy-MM-dd"), // unifica el formato de fecha con el de carpetas
            size = f.Size, 
            parentId = f.DirectoryId
        }).ToListAsync(); // procesa y trae la lista de archivos mapeada

        // 5. UNIR LISTAS Y FILTRAR POR TIPO (Si aplica)
        var combined = new List<dynamic>(); // crea una lista genérica combinada
        if (string.IsNullOrEmpty(type) || type == "folder") combined.AddRange(dirsList); // inyecta carpetas si el filtro lo permite
        if (string.IsNullOrEmpty(type) || type == "file") combined.AddRange(filesList); // inyecta archivos si el filtro lo permite

        // 6. ORDENAR Y PAGINAR
        var totalItems = combined.Count; // obtiene la cantidad total de elementos mezclados
        var paginatedData = combined
            .OrderBy(x => x.type == "folder" ? 0 : 1) // prioridad posicional: carpetas van primero que archivos
            .ThenBy(x => x.name) // orden secundario: orden alfabético ascendente
            .Skip((page - 1) * pageSize) // descarta los elementos de bloques de páginas previas
            .Take(pageSize) // limita el resultado al tamaño de página requerido
            .ToList(); // materializa la sublista final

        // Retornamos los datos junto con la info de paginación para tu React
        return Ok(new {
            totalPages = (int)Math.Ceiling(totalItems / (double)pageSize), // calcula el total de páginas necesarias
            currentPage = page, // indica la página actual entregada
            data = paginatedData // adjunta la lista paginada final
        });
    }
}
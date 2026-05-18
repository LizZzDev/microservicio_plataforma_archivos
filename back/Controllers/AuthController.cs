using Microsoft.AspNetCore.Mvc;
using Drive.Models;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly DefaultDbContext _context;

    // inyecta el contexto de base de datos para poder realizar búsquedas en la tabla de usuarios
    public AuthController(DefaultDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Login(UserCredentials userCredentials)
    {
        // verifica que los campos del login cumplan con los requerimientos (ej. que no vengan vacíos)
        if(ModelState.IsValid)
        {
            // busca en la base de datos el primer usuario que coincida exactamente con el email recibido
            var user = _context.Users.FirstOrDefault(u => u.Email == userCredentials.Email);

            // si el usuario existe, encripta la clave recibida en md5 y la compara con la guardada en la base de datos
            if(user != null && Models.User.GetHash(userCredentials.Password) == user.Password)
                return Ok(); // las credenciales son correctas, responde exitosamente (código 200)
        }

        return Unauthorized(); // las credenciales fallaron o el modelo es inválido, responde denegado (código 401)
    }
}
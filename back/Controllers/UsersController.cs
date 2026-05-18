using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Drive.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController] 
public class UserController : ControllerBase
{
    private readonly DefaultDbContext _context;
    
    public UserController(DefaultDbContext context)
    {
        _context = context; // inicializa la instancia de conexión
    }

    // ==========================================
    // OBTENER TODOS LOS USUARIOS (Solo Admin)
    // ==========================================
    [Authorize(Roles = "admin")] // restringe la ruta bloqueando peticiones sin rol administrativo en el jwt
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {        
        return Ok(await _context.Users.ToListAsync()); // retorna la lista completa de usuarios directo de la tabla
    }

    // ==========================================
    // OBTENER USUARIO POR ID
    // ==========================================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {        
        var user = await _context.Users.FindAsync(id); // busca el usuario basándose en su clave primaria
        return user == null ? NotFound() : Ok(user); // responde 404 si es nulo, o 200 con el modelo si existe
    }

    // ==========================================
    // REGISTRAR NUEVO USUARIO
    // ==========================================
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUser userData)
    {
        if (await _context.Users.AnyAsync(u => u.Email == userData.Email)) // comprueba que el email no esté tomado
            return BadRequest("El correo electronico ya está en uso");
        
        var user = new User
        {
            Name = userData.Name!,
            Email = userData.Email!,
            Birth = userData.Birth.ToUniversalTime(), // convierte la fecha recibida a formato universal utc
            Password = Drive.Models.User.GetHash(userData.Password!), // genera la firma md5 para no guardar texto plano
            CreatedAt = DateTime.UtcNow, // estampa de tiempo para la creación de cuenta
            UpdatedAt = DateTime.UtcNow, // inicializa la fecha de actualización
            Role = "user", // asigna el rol base predeterminado
            IsActive = false // fuerza el estado inactivo hasta que un administrador lo apruebe
        };
        
        _context.Users.Add(user); // añade la entidad al contexto
        await _context.SaveChangesAsync(); // impacta los cambios y genera el id autoincremental
        
        return Ok(user); 
    }

    // ==========================================
    // INICIAR SESION (LOGIN)
    // ==========================================
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserCredentials credentials)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == credentials.Email); // busca concordancia de email
        
        if (user == null || user.Password != Drive.Models.User.GetHash(credentials.Password)) // valida existencia y hash del password
            return Unauthorized(new { message = "Correo electrónico o contraseña incorrectos." });

        if (!user.IsActive) // bloquea el acceso si la cuenta se encuentra deshabilitada
            return StatusCode(403, new { message = "Cuenta inactiva. Contacte a un administrador." });

        return Ok(new { token = GenerateJwtToken(user) }); // genera y despacha el token de acceso si todo es correcto
    }

    // ==========================================
    // EDITAR USUARIO COMPLETO (Solo Admin)
    // ==========================================
    [Authorize(Roles = "admin")] // protección de ruta exclusiva para administradores
    [HttpPut("{id}")]
    public async Task<IActionResult> EditUser(int id, [FromBody] EditUserDto dto)
    {
        var userToEdit = await _context.Users.FindAsync(id); // localiza el usuario objetivo a modificar
        if (userToEdit == null) return NotFound("User not found.");

        var myIdString = User.FindFirstValue(ClaimTypes.NameIdentifier); // extrae el id del administrador desde su token actual
        if (myIdString == id.ToString() && userToEdit.Role == "admin" && dto.Role.ToLower() != "admin")
        {
            return BadRequest("Acción denegada: No puedes eliminar tu propio rol de administrador.a"); // candado de seguridad para no perder el único admin
        }

        if (userToEdit.Email != dto.Email && await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest("El correo electrónico ya está en uso por otro usuario."); // evita colisiones si se intenta cambiar a un email ocupado
        }

        if (!string.IsNullOrWhiteSpace(dto.Password)) // evalúa si el administrador ingresó una nueva contraseña para cambiarla
        {
            if (dto.Password != dto.ConfirmPassword)
                return BadRequest("Las contraseñas no coinciden.");
            
            if (!Drive.Models.User.ValidatePassword(dto.Password)) // pasa la contraseña por el validador estricto de caracteres
                return BadRequest("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.");

            userToEdit.Password = Drive.Models.User.GetHash(dto.Password); // actualiza el campo guardando el nuevo hash md5
        }

        userToEdit.Name = dto.Name; // asigna el nuevo nombre recibido
        userToEdit.Email = dto.Email; // asigna el nuevo email
        userToEdit.Birth = dto.Birth.ToUniversalTime(); // actualiza la fecha normalizada a utc
        
        var newRole = dto.Role.ToLower(); // estandariza el rol recibido a minúsculas
        if (newRole == "admin" || newRole == "user")
        {
            userToEdit.Role = newRole; // aplica el cambio de rol si coincide con las opciones permitidas
        }

        userToEdit.UpdatedAt = DateTime.UtcNow; // setea el momento de modificación

        await _context.SaveChangesAsync(); // guarda la edición final en la tabla
        
        return Ok(new { message = "Usuario actualizado correctamente." });
    }

    // ==========================================
    // ACTUALIZAR ESTADO ACTIVO/SUSPENDIDO (Solo Admin)
    // ==========================================
    [Authorize(Roles = "admin")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var user = await _context.Users.FindAsync(id); // localiza al usuario por su id
        if (user == null) return NotFound("Usuario no encontrado.");

        user.IsActive = dto.IsActive; // modifica directamente la bandera booleana de estado activa/inactiva
        await _context.SaveChangesAsync(); // guarda el cambio de estado en la base de datos
        
        return Ok(new { message = "Estado actualizado correctamente." });
    }

    // ==========================================
    // ACTUALIZAR ROL DIRECTO (Solo Admin)
    // ==========================================
    [Authorize(Roles = "admin")]
    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
    {
        var user = await _context.Users.FindAsync(id); // busca al usuario en la tabla
        if (user == null) return NotFound("Usuario no encontrado.");

        user.Role = dto.Role.ToLower(); // asigna el rol normalizado en minúsculas sin alterar el resto de columnas
        await _context.SaveChangesAsync(); // persiste la mutación del rol
        
        return Ok(new { message = "Rol actualizado correctamente." });
    }

    // ==========================================
    // METODO AUXILIAR: GENERACION DE JWT
    // ==========================================
    private string GenerateJwtToken(User user)
    {
        var key = Encoding.ASCII.GetBytes("EstaEsMiClaveSuperSecretaYUltraSegura12345!"); // llave simétrica de cifrado
        var claims = new[] // define el conjunto de datos de identidad (payload) que viajarán encriptados en el token
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role) // clave para mapear el control de accesos en rutas del backend y react
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims), // inyecta las credenciales preparadas arriba
            Expires = DateTime.UtcNow.AddDays(7), // tiempo límite de vida útil del token establecido en una semana
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature) // firma digital
        };

        var tokenHandler = new JwtSecurityTokenHandler(); // inicializa el despachador de componentes jwt
        return tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor)); // construye y retorna la cadena compacta del token
    }
}

// ==========================================
// DTOs RESTAURADOS Y COMPLETOS
// ==========================================

public class CreateUser
{
    public string? Name { get; set; } // recibe el nombre del nuevo usuario desde el formulario de registro
    public string? Email { get; set; } // recibe el correo electrónico que el usuario desea registrar
    public DateTime Birth { get; set; } // recibe la fecha de nacimiento seleccionada en el selector de React
    public string? Password { get; set; } // recibe la contraseña en texto plano para validar y hashear en el servidor
}

public class UserCredentials
{
    public string Email { get; set; } = string.Empty; // recibe el correo del formulario de inicio de sesión
    public string Password { get; set; } = string.Empty; // recibe la contraseña ingresada para el login
}

public class EditUserDto
{
    public string Name { get; set; } = string.Empty; // recibe el nombre actualizado o el actual si no cambió
    public string Email { get; set; } = string.Empty; // recibe el correo para actualizar o mantener
    
    [JsonPropertyName("birth")] // fuerza el mapeo si desde React la propiedad llega escrita en minúsculas
    public DateTime Birth { get; set; } // recibe la fecha de nacimiento actualizada por el administrador
    
    public string Role { get; set; } = string.Empty; // recibe el nuevo rol ("admin" o "user") asignado
    public string? Password { get; set; } // opcional: recibe la nueva contraseña si el administrador decidió cambiarla
    public string? ConfirmPassword { get; set; } // opcional: recibe la confirmación para validar que sean idénticas
}

public class UpdateStatusDto
{
    public bool IsActive { get; set; } // recibe true si se activa la cuenta, o false si se decide suspender
}

public class UpdateRoleDto
{
    public string Role { get; set; } = string.Empty; // recibe la cadena del nuevo rol de forma directa desde la tabla de usuarios
}
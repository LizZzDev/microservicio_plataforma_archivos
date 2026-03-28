using Microsoft.AspNetCore.Mvc;
using Drive.Models;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly DefaultDbContext _context;

    public UserController(DefaultDbContext context)
    {
        _context = context;
    }
    
    [EndpointSummary("Regresa la lista de usuarios")]
    [HttpGet]
    public async Task<IActionResult> GetUsers(int page = 1, int pageSize = 10)
    {        
        List<User> users = await _context.Users
            .Skip(page)
            .Take(pageSize)
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}", Name = "GetUserById")]
     [EndpointSummary("Regresa un usuario por su ID")]
     [EndpointDescription("Busca un usuario en la base de datos utilizando su ID.")]
    public async Task<IActionResult> GetUserById(int id)
    {        
        User? user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);

        if(user == null)
            return NotFound();

        return Ok(user);
    }

    [HttpPost]
    [EndpointSummary("Crear un nuevo usuario")]
    [EndpointDescription("Registra un usuario en la base de datos")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUser userData)
    {
    if (!ModelState.IsValid)
    {
        return BadRequest(ModelState);
    }

    User user = new User
    {
        Name = userData.Name!,
        Email = userData.Email!,
        Password = Drive.Models.User.GetHash(userData.Password!),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        IsActive = false
    };

    _context.Users.Add(user);
     await _context.SaveChangesAsync(); 
    
    return CreatedAtAction("GetUserById", new { id = user.Id }, user);
}
}
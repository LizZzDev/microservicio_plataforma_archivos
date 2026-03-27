using Microsoft.AspNetCore.Mvc;
using Drive.Models;
using Microsoft.EntityFrameworkCore;

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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {        
        User? user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);

        if(user == null)
            return NotFound();

        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUser userData)
    {        
        return Ok();
    }
}
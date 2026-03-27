using Microsoft.AspNetCore.Mvc;
using Drive.Models;

namespace Drive.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly DefaultDbContext _context;

    public AuthController(DefaultDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Login(UserCredentials userCredentials)
    {
        if(ModelState.IsValid)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == userCredentials.Email);

            if(user != null && Models.User.GetHash(userCredentials.Password) != user.Password)
                return Ok();
        }

        return Unauthorized();
    }
}
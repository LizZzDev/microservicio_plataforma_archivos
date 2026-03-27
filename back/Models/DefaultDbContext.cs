using Microsoft.EntityFrameworkCore;

namespace Drive.Models;

public class DefaultDbContext(DbContextOptions<DefaultDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
}
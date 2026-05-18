using Drive.Models;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// habilita el comportamiento de fechas clásico para evitar errores de zona horaria con postgresql
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<DefaultDbContext>(options =>
    options.UseNpgsql(connectionString));

// --- CONFIGURACIÓN DE CORS (PERMISOS DE ACCESO) ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // permite que el frontend (o cualquier origen) haga peticiones, use cualquier método y mande cabeceras
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// --- CONFIGURACIÓN DE SEGURIDAD (JWT) ---
// define la frase clave para firmar y verificar que los tokens sean auténticos
var key = Encoding.ASCII.GetBytes("EstaEsMiClaveSuperSecretaYUltraSegura12345!"); 

builder.Services.AddAuthentication(config =>
{
    // establece que la estrategia de autenticación por defecto en todo el sistema será mediante tokens jwt
    config.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    config.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // se pone en false sólo porque estamos desarrollando en local sin https
    options.SaveToken = true; // guarda el token internamente en la petición para poder consultarlo más adelante
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true, // obliga al sistema a comprobar que la firma del token coincida con nuestra clave
        IssuerSigningKey = new SymmetricSecurityKey(key), // pasa la clave secreta empaquetada para la inspección
        ValidateIssuer = false, // desactiva la validación del dominio emisor por estar en entorno de pruebas
        ValidateAudience = false // desactiva la validación del dominio receptor por estar en entorno de pruebas
    };
});

// --- REGISTRO DE SERVICIOS DEL SISTEMA ---
builder.Services.AddOpenApi(); // agrega las herramientas para documentar la estructura de la api
builder.Services.AddControllers(); // detecta los controladores creados en la carpeta controllers

var app = builder.Build();

// --- CONFIGURACIÓN DEL ENTORNO DE DESARROLLO ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // genera el mapa de rutas disponibles
    app.MapScalarApiReference(); // levanta la interfaz visual interactiva para probar las rutas en el navegador
}

app.UseCors("AllowAll"); // aplica la política permisiva de acceso cruzado que definimos arriba

// --- MIDDLEWARES DE SEGURIDAD (EL ORDEN IMPORTA) ---
app.UseAuthentication(); // 1. lee la petición y comprueba si el usuario trae un token jwt válido
app.UseAuthorization();  // 2. evalúa si el usuario tiene el rol necesario para entrar a la ruta solicitada

app.MapControllers(); // enlaza de manera definitiva las urls con sus respectivos controladores

app.Run(); // arranca el servidor y lo deja escuchando peticiones
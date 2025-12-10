# ContPAQi AI Bridge

*Leer en otros idiomas: [English](README.md)*

Sistema de procesamiento de facturas impulsado por inteligencia artificial que extrae automáticamente datos de facturas PDF y crea pólizas contables en el software ContPAQi.

## Descripción General

ContPAQi AI Bridge elimina la captura manual de datos para contadores y auxiliares contables mexicanos combinando:

- **IA/ML avanzada** para OCR de facturas y detección de tablas (TATR + LayoutLMv3)
- **Integración con Windows** mediante el SDK COM de ContPAQi
- **Aplicación de escritorio amigable** para revisión y validación
- **Licenciamiento por hardware** para protección del software
- **Instalador profesional de Windows** con soporte para instalación silenciosa

### Flujo de Trabajo

```
Factura PDF → Extracción IA → Revisión Humana → Póliza ContPAQi
```

1. Subir facturas PDF a través de la aplicación de escritorio
2. Los modelos de IA extraen los datos de la factura (RFC, montos, partidas)
3. Revisar y validar los datos extraídos con resaltado de confianza
4. Publicar automáticamente las pólizas validadas en ContPAQi

---

## Características

### Procesamiento de Facturas con IA
- **Motor OCR**: Tesseract con soporte para español
- **Detección de Tablas**: Modelo TATR (Table Transformer) para extracción de partidas
- **Extracción de Campos**: LayoutLMv3 para comprensión semántica de campos de factura
- **Puntuación de Confianza**: Indicadores visuales para niveles de confianza en la extracción

### Soporte para Facturas Mexicanas
- **Validación de RFC**: Validación completa del formato de RFC mexicano (13 caracteres para personas físicas, 12 para morales)
- **Cumplimiento CFDI**: Soporte para estándares de facturación electrónica mexicana
- **Cálculo de IVA**: Cálculo y validación automática del 16% de IVA
- **Verificación Matemática**: Validación en tiempo real de subtotal + IVA = total

### Interfaz Humano-en-el-Ciclo
- **Diseño de Pantalla Dividida**: Visor de PDF junto al formulario de datos
- **Resaltado por Confianza**:
  - Verde (≥90%): Alta confianza, aceptación automática
  - Naranja (70-89%): Necesita revisión
  - Rojo (<70%): Requiere atención
- **Resaltado de Errores Matemáticos**: Indicadores rojos para discrepancias en cálculos
- **Atajos de Teclado**: Navegación y edición eficiente
- **Procesamiento por Lotes**: Procesar múltiples facturas en cola

### Aplicación de Escritorio
- **Electron + React**: Interfaz moderna y responsiva con Tailwind CSS
- **Gestión de Docker**: Gestión automática del ciclo de vida del contenedor
- **Monitoreo de Salud**: Indicadores de estado en tiempo real
- **Asistente de Inicio**: Experiencia de configuración en primer uso

### Seguridad y Licenciamiento
- **Licenciamiento por Hardware**: Activación basada en huella digital de la máquina
- **Ofuscación de Código**: Protección con .NET Reactor para Windows Bridge
- **API Solo Local**: Windows Bridge restringido a conexiones localhost
- **Contenedores Sin Root**: Contenedores Docker ejecutados sin privilegios elevados

### Instalador de Windows
- **Inno Setup 6.x**: Instalador profesional para Windows
- **Verificación de Prerrequisitos**: Validación de Docker Desktop y runtime de .NET
- **Instalación de Servicio**: Servicio de Windows con inicio automático
- **Instalación Silenciosa**: Soporte para despliegues automatizados
- **Firma de Código**: Instalador y ejecutables firmados digitalmente

### Soporte Multi-Idioma (Planificado)
- **Inglés**: Idioma predeterminado
- **Español**: Traducción completa para usuarios mexicanos
- **Selección de Idioma**: Elegir durante la instalación o en la aplicación

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      Escritorio Windows                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐         ┌────────────────────────────┐  │
│  │   Aplicación       │         │     Contenedor Docker      │  │
│  │   Electron         │◄───────►│      (Python + IA)         │  │
│  │   (React + TS)     │  HTTP   │      Puerto 8000           │  │
│  └─────────┬──────────┘         └────────────────────────────┘  │
│            │                                                     │
│            │ localhost:5000                                      │
│            ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Windows Bridge C# (ASP.NET Core)               │   │
│  │           Integración SDK ContPAQi (COM)                 │   │
│  │           Licenciamiento por Hardware                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Software Contable ContPAQi                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Contenedor IA** | Python 3.9, FastAPI, PyTorch, Transformers, Tesseract OCR |
| **Windows Bridge** | C# .NET 6.0, ASP.NET Core, SDK ContPAQi (COM) |
| **App de Escritorio** | Electron 27, React 18, TypeScript, Tailwind CSS |
| **Generación de Datos** | Python, Faker, WeasyPrint, Jinja2 |
| **Modelos ML** | TATR (detección de tablas), LayoutLMv3 (clasificación de tokens) |
| **Instalador** | Inno Setup 6.x, PowerShell |
| **Pruebas** | pytest, xUnit, Jest |
| **Seguridad** | .NET Reactor, Firma de Código, Huella de Hardware |

---

## Requisitos del Sistema

### Requisitos Mínimos
- **SO**: Windows 10 (Build 19041+) o Windows 11
- **CPU**: Intel Core i5 o AMD Ryzen 5 (4 núcleos)
- **RAM**: 8 GB
- **Almacenamiento**: 10 GB de espacio libre (SSD recomendado)
- **Pantalla**: Resolución 1280x720

### Requisitos Recomendados
- **SO**: Windows 11 22H2
- **CPU**: Intel Core i7 o AMD Ryzen 7 (8 núcleos)
- **RAM**: 16 GB
- **Almacenamiento**: 20 GB SSD
- **Pantalla**: Resolución 1920x1080
- **GPU**: GPU NVIDIA con 4GB+ VRAM (para inferencia IA más rápida)

### Prerrequisitos de Software
- **Docker Desktop** 4.0+ (con backend WSL 2)
- **Runtime .NET 6.0** (se instala automáticamente)
- **ContPAQi Contabilidad** (para publicar pólizas)

---

## Instalación

### Opción 1: Instalador de Windows (Recomendado)

1. **Descargar el instalador**
   - Descargue `ContPAQi-AI-Bridge-Setup.exe` desde la página de releases

2. **Ejecutar el instalador**
   - Haga doble clic en el instalador
   - Seleccione su idioma preferido (Inglés/Español)
   - Siga el asistente de instalación

3. **Verificación de prerrequisitos**
   - El instalador verificará que Docker Desktop esté instalado
   - Si no se encuentra, se le pedirá que lo instale

4. **Completar la instalación**
   - Elija el directorio de instalación (predeterminado: `C:\Program Files\ContPAQi AI Bridge`)
   - Seleccione opciones adicionales:
     - Crear acceso directo en el escritorio
     - Crear accesos directos en el Menú Inicio
     - Instalar como servicio de Windows
   - Haga clic en Instalar

5. **Asistente de primer inicio**
   - Después de la instalación, el asistente de primer inicio:
     - Verificará los requisitos del sistema
     - Cargará la imagen Docker
     - Iniciará el servicio
     - Abrirá la aplicación

### Opción 2: Instalación Silenciosa

Para despliegues automatizados:

```powershell
# Instalación silenciosa con opciones predeterminadas
ContPAQi-AI-Bridge-Setup.exe /VERYSILENT /SUPPRESSMSGBOXES

# Instalación silenciosa con ruta personalizada
ContPAQi-AI-Bridge-Setup.exe /VERYSILENT /DIR="D:\ContPAQi AI Bridge"

# Instalación silenciosa sin servicio
ContPAQi-AI-Bridge-Setup.exe /VERYSILENT /TASKS="!installservice"
```

### Opción 3: Configuración de Desarrollo

Para desarrolladores que desean ejecutar desde el código fuente:

#### 1. Clonar el repositorio

```bash
git clone https://github.com/danribes/contpaqi.git
cd contpaqi
```

#### 2. Configurar el contenedor de IA

```bash
cd mcp-container
docker-compose up -d
```

#### 3. Configurar la aplicación de escritorio

```bash
cd desktop-app
npm install
npm run dev
```

#### 4. Configurar el Windows Bridge (solo Windows)

```bash
cd windows-bridge
dotnet restore
dotnet build
dotnet run
```

---

## Guía de Operación

### Iniciar la Aplicación

#### Método 1: Acceso Directo del Escritorio
- Haga doble clic en "ContPAQi AI Bridge" en su escritorio

#### Método 2: Menú Inicio
- Abra Menú Inicio → ContPAQi AI Bridge → ContPAQi AI Bridge

#### Método 3: Servicio de Windows
La aplicación se ejecuta como un servicio de Windows que inicia automáticamente:

```powershell
# Verificar estado del servicio
Get-Service ContPAQiBridge

# Iniciar servicio manualmente
Start-Service ContPAQiBridge

# Detener servicio
Stop-Service ContPAQiBridge
```

### Procesamiento de Facturas

1. **Abrir la aplicación**
   - Espere a que el indicador de estado muestre "Listo" (verde)

2. **Subir facturas PDF**
   - Haga clic en "Subir" o arrastre y suelte archivos PDF
   - Se pueden procesar múltiples archivos en lote

3. **Revisar datos extraídos**
   - La pantalla dividida muestra el PDF a la izquierda, el formulario a la derecha
   - Los campos están resaltados por nivel de confianza:
     - **Verde**: Alta confianza (≥90%) - generalmente correcto
     - **Naranja**: Confianza media (70-89%) - verificar
     - **Rojo**: Baja confianza (<70%) - probablemente necesita corrección

4. **Corregir errores**
   - Haga clic en un campo para editar
   - Los errores matemáticos (resaltados en rojo) deben corregirse
   - Los errores de validación de RFC bloquean el envío

5. **Enviar a ContPAQi**
   - Haga clic en "Enviar" cuando todas las validaciones pasen
   - La póliza se crea en ContPAQi Contabilidad

### Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + O` | Abrir archivo |
| `Ctrl + S` | Enviar factura actual |
| `Ctrl + →` | Siguiente factura (modo lote) |
| `Ctrl + ←` | Factura anterior (modo lote) |
| `Tab` | Siguiente campo |
| `Shift + Tab` | Campo anterior |
| `Ctrl + +` | Acercar PDF |
| `Ctrl + -` | Alejar PDF |
| `Ctrl + 0` | Restablecer zoom |
| `F5` | Actualizar/reintentar extracción |

### Indicadores de Estado

| Estado | Color | Descripción |
|--------|-------|-------------|
| Iniciando | Amarillo (pulsante) | La aplicación se está inicializando |
| Listo | Verde | Listo para procesar facturas |
| Procesando | Azul | Procesando una factura actualmente |
| Error | Rojo | Ocurrió un error |
| Sin conexión | Gris | Docker o servicio no está ejecutándose |

---

## Configuración

### Ajustes de la Aplicación

Ubicación del archivo de configuración: `C:\Program Files\ContPAQi AI Bridge\config\appsettings.json`

```json
{
  "Application": {
    "Language": "es",
    "Theme": "light",
    "AutoStart": true
  },
  "Processing": {
    "ConfidenceThreshold": 0.70,
    "AutoAcceptThreshold": 0.95,
    "MaxBatchSize": 50
  },
  "ContPAQi": {
    "CompanyDatabase": "",
    "AutoPost": false
  },
  "Docker": {
    "ImageName": "contpaqi-mcp",
    "Port": 8000,
    "HealthCheckInterval": 5000
  }
}
```

### Variables de Entorno

| Variable | Descripción | Predeterminado |
|----------|-------------|----------------|
| `CONTPAQI_BRIDGE_PORT` | Puerto de API del Windows Bridge | 5000 |
| `CONTPAQI_DOCKER_PORT` | Puerto del contenedor Docker | 8000 |
| `CONTPAQI_LOG_LEVEL` | Nivel de registro (Debug/Info/Warning/Error) | Info |

---

## Licenciamiento

### Activación

1. **Primer Inicio**
   - En el primer inicio, se le pedirá que ingrese su clave de licencia
   - Ingrese la clave proporcionada con su compra

2. **Bloqueo por Hardware**
   - La licencia está bloqueada al hardware de su máquina
   - Componentes usados para la huella: ID de CPU, Serial de Tarjeta Madre, ID de Disco

3. **Transferencia de Licencia**
   - Contacte a soporte para transferir la licencia a una nueva máquina
   - Se requiere desactivación en la máquina anterior

### Verificación de Licencia

```powershell
# Verificar estado de licencia
& "C:\Program Files\ContPAQi AI Bridge\scripts\check-license.ps1"
```

---

## Solución de Problemas

### Problemas con Docker

**Docker no inicia:**
```powershell
# Verificar estado de Docker Desktop
docker info

# Reiniciar servicio Docker
Restart-Service *docker*
```

**Contenedor no está ejecutándose:**
```powershell
# Verificar estado del contenedor
docker ps -a

# Reiniciar contenedor
docker restart contpaqi-mcp
```

### Problemas con el Servicio

**El servicio no inicia:**
```powershell
# Verificar estado del servicio
Get-Service ContPAQiBridge | Format-List *

# Ver registros del servicio
Get-EventLog -LogName Application -Source ContPAQiBridge -Newest 10
```

### Problemas con la Aplicación

**La aplicación muestra estado "Sin conexión":**
1. Asegúrese de que Docker Desktop esté ejecutándose
2. Verifique que el contenedor esté saludable
3. Verifique que el servicio de Windows esté ejecutándose

**La calidad de extracción es pobre:**
- Asegúrese de que el PDF no esté escaneado a baja resolución
- Verifique que el PDF no esté protegido con contraseña
- Intente con una copia más limpia de la factura

### Registros

Los archivos de registro se encuentran en:
- Registros de aplicación: `C:\Program Files\ContPAQi AI Bridge\logs\`
- Registros de Docker: `docker logs contpaqi-mcp`
- Registros del servicio de Windows: Visor de eventos → Aplicaciones

---

## Desinstalación

### Usando Panel de Control
1. Abra Panel de Control → Programas → Desinstalar un programa
2. Encuentre "ContPAQi AI Bridge"
3. Haga clic en Desinstalar

### Usando Línea de Comandos
```powershell
# Desinstalación silenciosa
& "C:\Program Files\ContPAQi AI Bridge\unins000.exe" /VERYSILENT

# Desinstalar conservando datos
& "C:\Program Files\ContPAQi AI Bridge\scripts\uninstall.ps1" -KeepData
```

### Limpieza Manual
Si es necesario, elimine:
- Carpeta de instalación: `C:\Program Files\ContPAQi AI Bridge`
- Datos de usuario: `%APPDATA%\ContPAQi AI Bridge`
- Imagen Docker: `docker rmi contpaqi-mcp`

---

## Estructura del Proyecto

```
contpaqi/
├── mcp-container/              # Contenedor Python IA (FastAPI + modelos ML)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── src/
│       ├── ocr/                # Integración Tesseract OCR
│       ├── models/             # Modelos TATR + LayoutLM
│       ├── inference/          # Pipeline de procesamiento
│       └── api/                # Endpoints FastAPI
├── windows-bridge/             # Bridge C# hacia SDK ContPAQi
│   └── src/ContpaqiBridge/
│       ├── Controllers/        # Endpoints API
│       ├── Services/           # Lógica de negocio
│       ├── Licensing/          # Licenciamiento por hardware
│       └── Security/           # Autenticación API
├── desktop-app/                # Aplicación de escritorio Electron + React
│   ├── src/
│   │   ├── components/         # Componentes UI React
│   │   └── i18n/               # Internacionalización
│   └── electron/
│       ├── main.ts             # Proceso principal Electron
│       └── docker-manager.ts   # Gestión de Docker
├── installer/                  # Archivos del instalador Inno Setup
│   ├── contpaqi-bridge.iss     # Script principal del instalador
│   ├── scripts/                # Scripts auxiliares PowerShell
│   │   ├── check-docker.ps1
│   │   ├── install-service.ps1
│   │   ├── first-run-wizard.ps1
│   │   └── code-sign.ps1
│   └── assets/
│       ├── license.txt
│       └── readme.txt
├── scripts/                    # Generación y preparación de datos
│   ├── generate_invoices.py
│   ├── prepare_datasets.py
│   └── templates/              # 20 plantillas HTML de facturas
├── data/                       # Conjuntos de datos de entrenamiento
│   ├── synthetic/              # PDFs de facturas generadas + etiquetas
│   ├── train/
│   ├── validation/
│   └── test/
├── tests/                      # Suites de pruebas
│   ├── test_*.py               # Pruebas Python
│   └── *.test.ts               # Pruebas TypeScript
└── specs/                      # Especificaciones del proyecto
```

---

## Estado de Desarrollo

Todas las características principales han sido implementadas:

| Fase | Tareas | Estado |
|------|--------|--------|
| **Fase 1**: Configuración y Datos | Tareas 1-3 | ✅ Completo |
| **Fase 2**: Contenedor MCP | Tareas 4-9 | ✅ Completo |
| **Fase 3**: Windows Bridge | Tareas 10-12 | ✅ Completo |
| **Fase 4**: Licenciamiento y Protección | Tareas 15-16 | ✅ Completo |
| **Fase 5**: Aplicación de Escritorio | Tareas 13-14 | ✅ Completo |
| **Fase 6**: Despliegue | Tarea 17 | ✅ Completo |
| **Fase 7**: Localización | Tarea 18 | 🔄 Planificado |

**Progreso Total**: 117/127 subtareas completadas (92%)

---

## Pruebas

### Ejecutar Todas las Pruebas

```bash
# Pruebas Python (contenedor IA)
cd mcp-container
pytest tests/ -v

# Pruebas .NET (Windows Bridge)
cd windows-bridge
dotnet test

# Pruebas de la aplicación de escritorio
cd desktop-app
npm test

# Pruebas de scripts del instalador
pytest tests/test_task017*.py -v
```

### Probar Instalación

Ejecute el script de validación de instalación en una máquina Windows limpia:

```powershell
& "C:\Program Files\ContPAQi AI Bridge\scripts\test-installation.ps1" -Verbose
```

---

## Soporte

### Documentación
- Documentación completa: carpeta `/docs`
- Referencia de API: `/specs/api-reference.md`
- Guía de solución de problemas: Ver sección de Solución de Problemas arriba

### Contacto
- Soporte técnico: soporte@contpaqi-ai-bridge.com
- Reportar errores: GitHub Issues

---

## Licencia

Propietario - Todos los derechos reservados.

Este software está licenciado, no vendido. Vea `LICENSE.txt` para los términos completos.

---

## Reconocimientos

- [TATR](https://github.com/microsoft/table-transformer) - Modelo de detección de tablas
- [LayoutLMv3](https://github.com/microsoft/unilm/tree/master/layoutlmv3) - Modelo de comprensión de documentos
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - Motor OCR de código abierto
- [Electron](https://www.electronjs.org/) - Framework para aplicaciones de escritorio
- [Inno Setup](https://jrsoftware.org/isinfo.php) - Creador de instaladores para Windows

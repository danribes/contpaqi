ContPAQi AI Bridge - Installation Guide
========================================

Welcome to the ContPAQi AI Bridge installer!

This application provides AI-powered invoice processing capabilities
for ContPAQi accounting software.


System Requirements
-------------------

- Windows 10 (64-bit) or Windows 11
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free disk space
- Docker Desktop installed and running
- .NET 6.0 Runtime or later
- Internet connection for initial setup


What Gets Installed
-------------------

1. Windows Bridge Service
   - ASP.NET Core web service
   - Communicates with ContPAQi SDK
   - Location: Program Files\ContPAQi AI Bridge\bin

2. Docker Container Image
   - AI/ML processing engine
   - OCR and document analysis
   - Location: Loaded into Docker

3. Configuration Files
   - Application settings
   - Location: Program Files\ContPAQi AI Bridge\config


Prerequisites
-------------

Before installing, please ensure:

1. Docker Desktop is installed and running
   Download: https://www.docker.com/products/docker-desktop

2. .NET 6.0 Runtime is installed
   Download: https://dotnet.microsoft.com/download/dotnet/6.0

3. You have administrator privileges


Installation Steps
------------------

1. Run the installer as Administrator
2. Accept the license agreement
3. Choose installation directory (default recommended)
4. Wait for Docker image to load (may take several minutes)
5. Complete the installation


Post-Installation
-----------------

After installation:

1. The Windows Service will start automatically
2. Access the API at: http://localhost:5000
3. API documentation: http://localhost:5000/swagger

To verify installation:
- Open Services (services.msc)
- Find "ContPAQi AI Bridge"
- Status should be "Running"


Troubleshooting
---------------

Service won't start:
- Ensure Docker Desktop is running
- Check logs at: Program Files\ContPAQi AI Bridge\logs

Docker image not loading:
- Ensure Docker Desktop is running
- Run manually: docker load -i docker\contpaqi-mcp.tar

API not responding:
- Check if service is running
- Verify port 5000 is not in use


Support
-------

For issues and feature requests:
https://github.com/contpaqi/ai-bridge/issues

Documentation:
https://github.com/contpaqi/ai-bridge/wiki


Version History
---------------

1.0.0 - Initial Release
- Invoice processing with AI
- ContPAQi SDK integration
- Docker-based ML engine

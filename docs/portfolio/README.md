# LendLoop portfolio material

This folder documents a technical exercise, not a commercial product with real community usage.

- 01_CASO_DE_ESTUDIO.md: project story, scope and design.
- 02_ARQUITECTURA.md: identity, permissions, data and automation decisions.
- 03_GUIA_DE_EJECUCION.md: local setup and demonstration.
- capturas/: actual screenshots of the interactive demo, with its sample-data banner visible.

The images use category illustrations rather than photographs of listed equipment. The app has no payment or shipping flow: its commerce-style catalog supports borrowing requests.

To regenerate screenshots, start the app on localhost:3100 and run node scripts/capture-portfolio.mjs. Screenshots are generated from sample data; no Clerk sessions or real user information should be captured.

The authoritative verification record is ../STATUS.md. These assets are prepared for a later portfolio update. They do not imply publication.

- 04_CIBERSEGURIDAD.md: controles, permisos, carga de imágenes y límites pendientes.

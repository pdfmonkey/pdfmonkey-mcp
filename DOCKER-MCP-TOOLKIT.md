# Guide Docker MCP Toolkit pour PDFMonkey

Ce guide explique comment utiliser le serveur MCP PDFMonkey avec le **Docker MCP Toolkit** officiel.

## Table des Matières

- [Qu'est-ce que le Docker MCP Toolkit ?](#quest-ce-que-le-docker-mcp-toolkit-)
- [Prérequis](#prérequis)
- [Installation et Configuration](#installation-et-configuration)
- [Utilisation avec Claude Desktop](#utilisation-avec-claude-desktop)
- [Utilisation avec le Docker MCP Gateway](#utilisation-avec-le-docker-mcp-gateway)
- [Publication dans le Docker MCP Catalog](#publication-dans-le-docker-mcp-catalog)
- [Dépannage](#dépannage)

---

## Qu'est-ce que le Docker MCP Toolkit ?

Le **Docker MCP Toolkit** est une interface de gestion intégrée dans Docker Desktop qui permet de :
- ✅ Configurer, gérer et exécuter des serveurs MCP conteneurisés
- ✅ Connecter des serveurs MCP à des agents IA (Claude, Cursor, etc.)
- ✅ Gérer les secrets et variables d'environnement de façon sécurisée
- ✅ Découvrir des serveurs dans le Docker MCP Catalog
- ✅ Zéro configuration manuelle, gestion des dépendances automatique

---

## Prérequis

### 1. Docker Desktop avec MCP Toolkit activé

**Installer Docker Desktop** :
- Télécharger depuis [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- Version minimum : Docker Desktop 4.36+ (Beta)

**Activer le MCP Toolkit** :
1. Ouvrir Docker Desktop
2. Aller dans **Settings → Beta features**
3. Cocher **Enable Docker MCP Toolkit**
4. Redémarrer Docker Desktop

### 2. Vérifier l'installation

```bash
# Vérifier Docker Desktop
docker --version

# Vérifier le plugin MCP (si disponible)
docker mcp --help
```

---

## Installation et Configuration

### Méthode 1 : Build Local (Recommandé pour développement)

#### 1. Builder l'image Docker

```bash
# Dans le répertoire du projet
npm run build
docker build -t pdfmonkey-mcp-server:latest .
```

#### 2. Configurer les secrets

Le Docker MCP Toolkit gère les secrets de façon sécurisée :

```bash
# Créer un secret pour la clé API
echo "your-pdfmonkey-api-key" | docker secret create pdfmonkey_api_key -
```

Ou utiliser la variable d'environnement :

```bash
export PDFMONKEY_API_KEY="your-api-key"
```

### Méthode 2 : Pull depuis Docker Hub (Quand publié)

```bash
docker pull yourusername/pdfmonkey-mcp-server:latest
```

---

## Utilisation avec Claude Desktop

### Configuration avec Docker MCP Toolkit

Modifiez votre fichier de configuration Claude Desktop :

**macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "type": "docker",
      "image": "pdfmonkey-mcp-server:latest",
      "transport": "stdio",
      "env": {
        "PDFMONKEY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Configuration Avancée

Pour plus de contrôle :

```json
{
  "mcpServers": {
    "pdfmonkey": {
      "type": "docker",
      "image": "pdfmonkey-mcp-server:latest",
      "transport": "stdio",
      "env": {
        "PDFMONKEY_API_KEY": "${PDFMONKEY_API_KEY}"
      },
      "resources": {
        "limits": {
          "cpus": "0.5",
          "memory": "512M"
        }
      },
      "autoRemove": true,
      "readOnly": true
    }
  }
}
```

**Options disponibles** :
- `type`: `"docker"` pour utiliser un conteneur
- `image`: Nom de l'image Docker
- `transport`: `"stdio"` (standard) ou `"sse"` (réseau)
- `env`: Variables d'environnement
- `resources`: Limites CPU/mémoire
- `autoRemove`: Supprimer le conteneur après usage
- `readOnly`: Système de fichiers en lecture seule

---

## Utilisation avec le Docker MCP Gateway

Le **Docker MCP Gateway** est un CLI pour gérer les serveurs MCP.

### Installation du Gateway

```bash
# Installer le plugin Docker MCP
docker plugin install docker/mcp-gateway
```

### Commandes Gateway

#### Lister les serveurs disponibles

```bash
docker mcp list
```

#### Ajouter le serveur PDFMonkey

```bash
docker mcp add pdfmonkey \
  --image pdfmonkey-mcp-server:latest \
  --env PDFMONKEY_API_KEY=your-api-key
```

#### Tester le serveur

```bash
# Lister les outils disponibles
docker mcp call pdfmonkey --list-tools

# Appeler un outil
docker mcp call pdfmonkey list_templates
```

#### Démarrer le serveur

```bash
docker mcp start pdfmonkey
```

#### Arrêter le serveur

```bash
docker mcp stop pdfmonkey
```

#### Supprimer le serveur

```bash
docker mcp remove pdfmonkey
```

### Configurer les secrets avec Gateway

```bash
# Ajouter un secret
docker mcp secret add pdfmonkey PDFMONKEY_API_KEY your-api-key

# Lister les secrets
docker mcp secret list pdfmonkey

# Supprimer un secret
docker mcp secret remove pdfmonkey PDFMONKEY_API_KEY
```

---

## Publication dans le Docker MCP Catalog

Le **Docker MCP Catalog** est une collection vérifiée de serveurs MCP disponible sur Docker Hub.

### Prérequis pour Publication

1. ✅ Image Docker fonctionnelle et testée
2. ✅ Documentation complète (README, exemples)
3. ✅ Tests validés
4. ✅ Métadonnées correctes
5. ✅ Licence open source (MIT recommandée)

### Étapes de Publication

#### 1. Préparer les métadonnées

Créer un fichier `mcp-manifest.json` :

```json
{
  "name": "pdfmonkey-mcp-server",
  "version": "1.0.0",
  "description": "Generate PDFs from templates using PDFMonkey API",
  "author": "Your Name",
  "homepage": "https://github.com/your-org/pdfmonkey-mcp-server",
  "license": "MIT",
  "capabilities": ["tools"],
  "tools": [
    {
      "name": "list_workspaces",
      "description": "List all PDFMonkey workspaces"
    },
    {
      "name": "list_templates",
      "description": "List all PDF templates"
    },
    {
      "name": "generate_document",
      "description": "Generate a PDF document from a template"
    }
  ],
  "env": {
    "PDFMONKEY_API_KEY": {
      "description": "Your PDFMonkey API key",
      "required": true,
      "secret": true
    }
  },
  "tags": ["pdf", "generation", "documents", "templates", "api"]
}
```

#### 2. Tag l'image pour Docker Hub

```bash
# Format: username/repo:tag
docker tag pdfmonkey-mcp-server:latest yourusername/pdfmonkey-mcp-server:1.0.0
docker tag pdfmonkey-mcp-server:latest yourusername/pdfmonkey-mcp-server:latest
```

#### 3. Push vers Docker Hub

```bash
# Login
docker login

# Push les images
docker push yourusername/pdfmonkey-mcp-server:1.0.0
docker push yourusername/pdfmonkey-mcp-server:latest
```

#### 4. Soumettre au Catalog

Le processus officiel :

1. **Créer une PR** sur le repository [docker/mcp-catalog](https://github.com/docker/mcp-catalog)
2. **Ajouter les métadonnées** dans le dossier approprié
3. **Fournir la documentation** et exemples
4. **Passer la review** de l'équipe Docker
5. **Attendre validation** et publication

### Structure du Catalog (exemple)

```
docker/mcp-catalog/
└── servers/
    └── pdfmonkey/
        ├── README.md
        ├── mcp-manifest.json
        ├── examples/
        │   └── generate-invoice.md
        └── tests/
            └── basic-test.sh
```

---

## Build Multi-Architecture

Pour supporter Mac M1/M2 (ARM64) et serveurs Intel (AMD64) :

```bash
# Créer un builder
docker buildx create --use --name mcp-builder

# Build multi-arch
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/pdfmonkey-mcp-server:latest \
  --push \
  .
```

---

## Automatisation avec GitHub Actions

### Workflow CI/CD

Créer `.github/workflows/docker-mcp-publish.yml` :

```yaml
name: Build and Publish Docker MCP Server

on:
  release:
    types: [created]
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: yourusername/pdfmonkey-mcp-server
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Update Docker Hub description
        uses: peter-evans/dockerhub-description@v4
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}
          repository: yourusername/pdfmonkey-mcp-server
          readme-filepath: ./README.md
```

---

## Dépannage

### Le serveur n'apparaît pas dans Docker Desktop

**Vérifications** :
```bash
# 1. MCP Toolkit est activé ?
# Aller dans Settings → Beta features

# 2. L'image existe ?
docker images | grep pdfmonkey-mcp-server

# 3. Config valide ?
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Erreur "PDFMONKEY_API_KEY environment variable is required"

**Solution** : Vérifier la configuration :

```bash
# Tester manuellement
docker run -it --rm \
  -e PDFMONKEY_API_KEY="your-key" \
  pdfmonkey-mcp-server:latest

# Voir les logs
docker logs <container-id>
```

### Gateway n'est pas disponible

```bash
# Installer le plugin
docker plugin install docker/mcp-gateway

# Ou vérifier les updates Docker Desktop
docker version
```

### Permission denied

```bash
# Donner les permissions Docker
sudo usermod -aG docker $USER
newgrp docker

# Redémarrer Docker Desktop
```

### Le conteneur se ferme immédiatement

**Cause** : MCP utilise stdio et a besoin d'être interactif.

**Solution** : Vérifier la config :
```json
{
  "transport": "stdio",  // Obligatoire pour MCP
  "interactive": true
}
```

---

## Monitoring et Logs

### Voir les logs en temps réel

```bash
# Via Docker Desktop
# → Containers → pdfmonkey-mcp-server → Logs

# Via CLI
docker logs -f <container-name>

# Via Gateway
docker mcp logs pdfmonkey
```

### Métriques de performance

```bash
# Stats en temps réel
docker stats <container-name>

# Inspection
docker inspect <container-name>
```

---

## Sécurité et Bonnes Pratiques

### 1. Gestion des Secrets

❌ **Ne jamais** hardcoder les clés API :
```json
{
  "env": {
    "PDFMONKEY_API_KEY": "pk_live_123456"  // ❌ NON !
  }
}
```

✅ **Utiliser** des variables d'environnement :
```json
{
  "env": {
    "PDFMONKEY_API_KEY": "${PDFMONKEY_API_KEY}"  // ✅ OUI !
  }
}
```

### 2. Limites de Ressources

```json
{
  "resources": {
    "limits": {
      "cpus": "0.5",      // Max 0.5 CPU
      "memory": "512M"    // Max 512 MB RAM
    }
  }
}
```

### 3. Réseau Isolé

```json
{
  "network": "none",  // Pas d'accès réseau externe (sauf API)
  "readOnly": true    // Système de fichiers en lecture seule
}
```

### 4. Scanner l'image

```bash
# Scanner les vulnérabilités
docker scout cves pdfmonkey-mcp-server:latest

# Analyser l'image
docker scout recommendations pdfmonkey-mcp-server:latest
```

---

## Ressources

- [Docker MCP Toolkit Documentation](https://docs.docker.com/ai/mcp-catalog-and-toolkit/)
- [Docker MCP Gateway](https://github.com/docker/mcp-gateway)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [PDFMonkey API Documentation](https://docs.pdfmonkey.io/)

---

## Support

Pour des questions sur :
- **Le serveur MCP PDFMonkey** : Ouvrir une issue sur GitHub
- **Docker MCP Toolkit** : [Docker Community Forums](https://forums.docker.com/)
- **PDFMonkey API** : [PDFMonkey Support](https://pdfmonkey.io/support)

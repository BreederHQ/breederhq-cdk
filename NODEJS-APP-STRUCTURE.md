# Example Node.js Application Structure for Elastic Beanstalk

Your Node.js application should be structured like this:

```
my-nodejs-app/
├── .ebextensions/              # EB configuration (optional)
│   ├── 01-node-settings.config
│   └── 02-environment.config
├── .platform/                  # Platform hooks (optional)
│   └── hooks/
│       └── postdeploy/
│           └── 01-run-migrations.sh
├── src/                        # Your application code
│   ├── app.js
│   ├── routes/
│   └── controllers/
├── public/                     # Static files
├── package.json
├── package-lock.json
└── .npmrc                      # NPM configuration (optional)
```

## Required Files

### package.json

Your `package.json` must include:

```json
{
  "name": "my-nodejs-app",
  "version": "1.0.0",
  "description": "My Node.js Application",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

**Important**: 
- Include `"start"` script - EB will run `npm start`
- Specify Node version in `"engines"`
- Don't include `node_modules` in deployment

### Example app.js (Express)

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from Elastic Beanstalk!',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
```

**Important**: 
- Listen on `process.env.PORT` (default 8080)
- Include a health check endpoint

### .npmrc (Optional but Recommended)

```
# Ensure production dependencies only
production=true
engine-strict=true

# Performance optimizations
prefer-offline=true
```

## Elastic Beanstalk Requirements

### 1. Port Configuration
- Your app MUST listen on port **8080** or use `process.env.PORT`
- Nginx proxy forwards from port 80 to your app

### 2. Health Check
- Elastic Beanstalk will check `/` by default
- You can configure a custom health check path in `.ebextensions`

### 3. Environment Variables
- Access via `process.env.VARIABLE_NAME`
- Set in CDK configuration or `.ebextensions`

### 4. Logging
- Console output goes to `/var/log/nodejs/nodejs.log`
- Access via EB Console or `eb logs` command

## Example .ebextensions/01-node-settings.config

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    ProxyServer: nginx
    GzipCompression: true
    
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    NPM_CONFIG_PRODUCTION: true
```

## Example .platform/hooks/postdeploy/01-migrations.sh

```bash
#!/bin/bash
# Run database migrations after deployment

cd /var/app/current
npm run migrate
```

Make it executable: `chmod +x .platform/hooks/postdeploy/01-migrations.sh`

## Deployment Checklist

Before deploying, ensure:

- ✅ `package.json` has `start` script
- ✅ App listens on `process.env.PORT`
- ✅ Node version specified in `engines`
- ✅ `.gitignore` excludes `node_modules`
- ✅ Health check endpoint exists
- ✅ Environment variables configured
- ✅ Dependencies in `package.json` (not devDependencies)

## Common Issues

### Issue: App crashes on startup
**Solution**: Check logs and ensure:
- Correct start script in package.json
- All required env variables are set
- Dependencies are properly listed

### Issue: Nginx 502 Bad Gateway
**Solution**: 
- Verify app is listening on port 8080
- Check app logs for startup errors
- Ensure health check endpoint is responding

### Issue: Dependencies not installed
**Solution**:
- Don't include `node_modules` in deployment
- Ensure `package-lock.json` is included
- Check npm version compatibility

## Best Practices

1. **Use .npmrc**: Configure npm behavior consistently
2. **Lock Dependencies**: Always commit `package-lock.json`
3. **Environment Variables**: Never hardcode secrets
4. **Graceful Shutdown**: Handle SIGTERM for rolling deployments
5. **Health Checks**: Implement meaningful health endpoints
6. **Logging**: Use structured logging (Winston, Pino)
7. **Process Manager**: Consider PM2 for production

## Graceful Shutdown Example

```javascript
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
```

## Testing Locally

Before deploying, test your app locally:

```bash
# Install dependencies
npm install

# Set environment variables
export NODE_ENV=development
export PORT=8080

# Run the app
npm start

# Test health endpoint
curl http://localhost:8080/health
```

## Additional Resources

- [EB Node.js Platform](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-nodejs.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

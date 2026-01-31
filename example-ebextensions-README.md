# .ebextensions Configuration for Node.js Application

This directory contains configuration files for Elastic Beanstalk environment customization.
Place this `.ebextensions` folder in the root of your Node.js application.

## Example Configuration Files

### 01-node-settings.config
Configure Node.js specific settings:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    NodeVersion: 20.x
    ProxyServer: nginx
    GzipCompression: true
```

### 02-environment.config
Set up additional environment variables:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NPM_CONFIG_PRODUCTION: true
    NPM_USE_PRODUCTION: true
```

### 03-logs.config
Configure log rotation and collection:

```yaml
files:
  "/etc/awslogs/config/app_logs.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      [/var/log/nodejs/nodejs.log]
      log_group_name = /aws/elasticbeanstalk/my-app
      log_stream_name = {instance_id}
      file = /var/log/nodejs/nodejs.log
```

### 04-nginx.config
Customize nginx configuration:

```yaml
files:
  "/etc/nginx/conf.d/proxy.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      client_max_body_size 50M;
      proxy_connect_timeout 600;
      proxy_send_timeout 600;
      proxy_read_timeout 600;
      send_timeout 600;
```

### 05-ssl-redirect.config
Force HTTPS redirect (if using SSL):

```yaml
files:
  "/etc/nginx/conf.d/https_redirect.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      server {
        listen 8080;
        
        if ($http_x_forwarded_proto = 'http') {
          return 301 https://$host$request_uri;
        }
      }
```

## Usage

1. Create `.ebextensions` directory in your application root:
   ```
   your-app/
   ├── .ebextensions/
   │   ├── 01-node-settings.config
   │   ├── 02-environment.config
   │   └── ...
   ├── package.json
   ├── server.js
   └── ...
   ```

2. Include this directory when deploying your application

3. Elastic Beanstalk will automatically apply these configurations during deployment

## Configuration Order

Files are processed in alphabetical order, so prefix with numbers (01-, 02-, etc.) 
to control the execution order.

## Best Practices

- Keep configurations modular (one concern per file)
- Use meaningful file names
- Document any complex configurations
- Test in dev environment before production
- Version control your .ebextensions directory

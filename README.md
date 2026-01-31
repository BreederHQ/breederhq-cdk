# Elastic Beanstalk Infrastructure with AWS CDK

This project provides Infrastructure as Code (IaC) for deploying a Node.js application to AWS Elastic Beanstalk with support for multiple environments.

## 🏗️ Architecture

- **Dev/Staging/Sandbox**: Single instance environments for cost efficiency
- **Production**: High availability with auto-scaling and load balancer

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```
3. **Node.js** (v18 or later) and npm installed
4. **AWS CDK** installed globally
   ```bash
   npm install -g aws-cdk
   ```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First time only)

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

### 3. Build the Project

```bash
npm run build
```

### 4. Review Changes

```bash
npm run synth
```

## 📦 Deployment

### Deploy Individual Environments

```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Sandbox
npm run deploy:sandbox

# Production
npm run deploy:production
```

### Deploy All Environments

```bash
npm run deploy:all
```

### Preview Changes Before Deployment

```bash
cdk diff MyApp-Dev
cdk diff MyApp-Production
```

## 🔧 Configuration

### Customizing Environments

Edit `bin/app.ts` to customize each environment:

```typescript
new ElasticBeanstalkStack(app, 'MyApp-Dev', {
  environmentName: 'dev',
  applicationName: 'my-nodejs-app',  // Change this
  highAvailability: false,
  instanceType: 't3.micro',           // Adjust instance size
  nodeVersion: '20',                  // Node.js version
  environmentVariables: {
    NODE_ENV: 'development',
    DATABASE_URL: 'your-db-url',      // Add your env vars
  },
});
```

### Environment Variables

Add environment-specific variables in the `environmentVariables` section:

```typescript
environmentVariables: {
  NODE_ENV: 'production',
  API_KEY: 'your-api-key',
  DATABASE_URL: 'your-database-url',
  REDIS_URL: 'your-redis-url',
}
```

### High Availability Settings

For production, you can adjust:

```typescript
new ElasticBeanstalkStack(app, 'MyApp-Production', {
  // ... other config
  highAvailability: true,
  minInstances: 2,        // Minimum instances
  maxInstances: 10,       // Maximum instances
  instanceType: 't3.medium',
});
```

### HTTPS/SSL

To enable HTTPS, add your ACM certificate ARN:

```typescript
new ElasticBeanstalkStack(app, 'MyApp-Production', {
  // ... other config
  certificateArn: 'arn:aws:acm:region:account:certificate/certificate-id',
});
```

## 📤 Deploying Your Application

After the infrastructure is deployed, you have several options to deploy your application code:

### Option 1: Using EB CLI (Recommended)

1. Install EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize in your application directory:
   ```bash
   cd /path/to/your/nodejs/app
   eb init
   ```

3. Deploy to specific environment:
   ```bash
   eb deploy my-nodejs-app-dev
   ```

### Option 2: Using AWS Console

1. Go to Elastic Beanstalk console
2. Select your application
3. Click "Upload and Deploy"
4. Upload a ZIP file of your Node.js application

### Option 3: CI/CD Pipeline

Create a deployment pipeline using:
- **GitHub Actions**
- **AWS CodePipeline**
- **GitLab CI/CD**
- **CircleCI**

Example GitHub Actions workflow:

```yaml
name: Deploy to Elastic Beanstalk

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate deployment package
        run: zip -r deploy.zip . -x '*.git*'
      
      - name: Deploy to EB
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: my-nodejs-app-production
          environment_name: my-nodejs-app-production
          version_label: ${{ github.sha }}
          region: us-east-1
          deployment_package: deploy.zip
```

## 🔍 Monitoring

After deployment, you can monitor your environments:

```bash
# View environment health
aws elasticbeanstalk describe-environment-health \
  --environment-name my-nodejs-app-production \
  --attribute-names All

# View logs
eb logs my-nodejs-app-production
```

## 🗑️ Cleanup

To destroy all resources:

```bash
cdk destroy MyApp-Dev
cdk destroy MyApp-Staging
cdk destroy MyApp-Sandbox
cdk destroy MyApp-Production

# Or destroy all at once
cdk destroy --all
```

## 📁 Project Structure

```
.
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   └── elastic-beanstalk-stack.ts  # Main stack definition
├── package.json
├── tsconfig.json
├── cdk.json
└── README.md
```

## 🎯 Features

- ✅ Multi-environment support (dev, staging, sandbox, production)
- ✅ Single instance for non-production environments
- ✅ High availability with auto-scaling for production
- ✅ Load balancer for production
- ✅ Enhanced health monitoring
- ✅ Rolling deployments for zero-downtime updates
- ✅ Custom environment variables per environment
- ✅ HTTPS support (optional)
- ✅ Configurable instance types
- ✅ Auto-scaling based on CPU utilization

## 🛠️ Troubleshooting

### Issue: Platform ARN not found

If you get an error about platform ARN, update the Node.js version in `lib/elastic-beanstalk-stack.ts`:

```typescript
const platformArn = `arn:aws:elasticbeanstalk:${this.region}::platform/Node.js 18 running on 64bit Amazon Linux 2023`;
```

### Issue: Permissions error

Ensure your AWS credentials have the necessary permissions:
- ElasticBeanstalk full access
- IAM role creation
- S3 bucket creation
- EC2 instance management

### Issue: Deployment fails

Check the Elastic Beanstalk logs:
```bash
eb logs my-nodejs-app-dev --all
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Node.js on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-nodejs.html)

## 🤝 Contributing

Feel free to modify this infrastructure to suit your needs!

## 📝 License

MIT

# 🚀 Quick Start Guide - Elastic Beanstalk with CDK

This guide will get your Node.js application running on Elastic Beanstalk in minutes.

## Step 1: Prerequisites ✅

Install required tools:

```bash
# Install Node.js (if not installed)
# Download from https://nodejs.org/

# Install AWS CLI
# macOS: brew install awscli
# Windows: Download from https://aws.amazon.com/cli/
# Linux: sudo apt-get install awscli

# Configure AWS credentials
aws configure

# Install CDK globally
npm install -g aws-cdk

# Verify installations
node --version    # Should be v18+
aws --version
cdk --version
```

## Step 2: Set Up Infrastructure 🏗️

```bash
# Clone or navigate to the infrastructure directory
cd elastic-beanstalk-cdk

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Build TypeScript
npm run build

# Preview what will be created
npm run synth

# Deploy development environment
npm run deploy:dev
```

**Expected output:**
```
✅  MyApp-Dev

Outputs:
MyApp-Dev.ApplicationName = my-nodejs-app-dev
MyApp-Dev.EnvironmentName = my-nodejs-app-dev
MyApp-Dev.EnvironmentURL = http://my-nodejs-app-dev.us-east-1.elasticbeanstalk.com
MyApp-Dev.AppVersionsBucket = my-nodejs-app-dev-versions-123456789012
```

## Step 3: Prepare Your Application 📦

Ensure your Node.js app has:

1. **package.json** with start script:
```json
{
  "name": "my-app",
  "scripts": {
    "start": "node app.js"
  },
  "engines": {
    "node": "20.x"
  }
}
```

2. **Server listening on PORT 8080**:
```javascript
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

3. **Health check endpoint** (optional but recommended):
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

## Step 4: Deploy Your Application 🚢

### Option A: Using the deployment script

```bash
# Make script executable (first time)
chmod +x scripts/deploy-app.sh

# Deploy to dev
./scripts/deploy-app.sh dev /path/to/your/nodejs/app

# Deploy to production
./scripts/deploy-app.sh production /path/to/your/nodejs/app
```

### Option B: Manual deployment

```bash
# Navigate to your app directory
cd /path/to/your/nodejs/app

# Create deployment package (exclude node_modules!)
zip -r deploy.zip . -x "*.git*" "*node_modules*" "*.env*"

# Upload to S3
aws s3 cp deploy.zip s3://YOUR-BUCKET-NAME/deploy.zip

# Create application version
aws elasticbeanstalk create-application-version \
  --application-name my-nodejs-app-dev \
  --version-label v1 \
  --source-bundle S3Bucket=YOUR-BUCKET-NAME,S3Key=deploy.zip

# Deploy
aws elasticbeanstalk update-environment \
  --application-name my-nodejs-app-dev \
  --environment-name my-nodejs-app-dev \
  --version-label v1
```

### Option C: Using EB CLI

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB in your app directory
cd /path/to/your/nodejs/app
eb init

# Deploy
eb deploy my-nodejs-app-dev
```

## Step 5: Verify Deployment ✨

```bash
# Get environment URL from CDK output
# Or check the Elastic Beanstalk console

# Test your application
curl http://your-environment-url.elasticbeanstalk.com

# Check health
curl http://your-environment-url.elasticbeanstalk.com/health
```

## Step 6: Deploy to Production 🎯

```bash
# Deploy production infrastructure
npm run deploy:production

# Deploy your application to production
./scripts/deploy-app.sh production /path/to/your/nodejs/app

# Or use EB CLI
eb deploy my-nodejs-app-production
```

## Common Commands 📝

### Infrastructure Management

```bash
# View all stacks
cdk list

# Preview changes
cdk diff MyApp-Dev

# Deploy specific environment
npm run deploy:dev
npm run deploy:staging
npm run deploy:production

# Deploy all environments
npm run deploy:all

# Destroy environment
cdk destroy MyApp-Dev
```

### Application Management

```bash
# View environment status
aws elasticbeanstalk describe-environments \
  --application-name my-nodejs-app-dev

# View logs
eb logs my-nodejs-app-dev

# SSH to instance (if configured)
eb ssh my-nodejs-app-dev

# Check environment health
aws elasticbeanstalk describe-environment-health \
  --environment-name my-nodejs-app-dev \
  --attribute-names All
```

## Customization 🔧

### Change Instance Type

Edit `bin/app.ts`:
```typescript
new ElasticBeanstalkStack(app, 'MyApp-Dev', {
  instanceType: 't3.small', // Change from t3.micro
});
```

### Add Environment Variables

Edit `bin/app.ts`:
```typescript
environmentVariables: {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://...',
  API_KEY: 'your-api-key',
}
```

### Adjust Auto-Scaling (Production)

Edit `bin/app.ts`:
```typescript
minInstances: 3,  // Minimum 3 instances
maxInstances: 20, // Maximum 20 instances
```

### Enable HTTPS

1. Create ACM certificate in AWS Console
2. Add to production stack:
```typescript
certificateArn: 'arn:aws:acm:region:account:certificate/cert-id',
```

## Troubleshooting 🔍

### Deployment fails

```bash
# Check EB logs
eb logs my-nodejs-app-dev --all

# Or via AWS CLI
aws elasticbeanstalk describe-events \
  --application-name my-nodejs-app-dev \
  --environment-name my-nodejs-app-dev \
  --max-records 50
```

### App returns 502 Bad Gateway

- Verify app is listening on port 8080
- Check that `npm start` works locally
- Ensure all dependencies are in `package.json`

### Environment won't update

- Wait for previous update to complete
- Check CloudFormation events in console
- Verify IAM permissions

## Next Steps 🎓

1. **Set up CI/CD**: Create GitHub Actions workflow
2. **Add monitoring**: CloudWatch alarms and dashboards
3. **Configure RDS**: Add database to your stack
4. **Add Redis**: ElastiCache for caching
5. **Custom domain**: Route53 and ACM certificate
6. **WAF**: Add web application firewall

## Costs 💰

**Development** (~$10-15/month):
- t3.micro instance: ~$7.50/month
- Data transfer: ~$1-2/month
- S3 storage: <$1/month

**Production** (~$50-100/month minimum):
- 2x t3.medium instances: ~$60/month
- Load balancer: ~$20/month
- Data transfer: ~$10-20/month
- Auto-scaling instances: Variable

## Resources 📚

- [CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Node.js on EB Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-nodejs.html)
- [AWS Support](https://console.aws.amazon.com/support/)

## Need Help? 💬

- Check the main README.md
- Review NODEJS-APP-STRUCTURE.md for app requirements
- AWS Documentation and forums
- Stack Overflow with tag `aws-elastic-beanstalk`

---

**Happy Deploying! 🚀**

#!/bin/bash

# Deployment script for Node.js application to Elastic Beanstalk
# Usage: ./deploy-app.sh <environment> <app-directory>

set -e

ENVIRONMENT=$1
APP_DIR=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$APP_DIR" ]; then
    echo "Usage: ./deploy-app.sh <environment> <app-directory>"
    echo "Example: ./deploy-app.sh dev ../my-nodejs-app"
    echo ""
    echo "Available environments: dev, staging, sandbox, production"
    exit 1
fi

# Configuration
APP_NAME="my-nodejs-app"
REGION="us-east-1"
VERSION_LABEL="${APP_NAME}-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Deploying application to Elastic Beanstalk"
echo "Environment: ${ENVIRONMENT}"
echo "Application: ${APP_NAME}"
echo "Version: ${VERSION_LABEL}"
echo ""

# Navigate to app directory
cd "$APP_DIR"

# Create deployment package
echo "📦 Creating deployment package..."
zip -r /tmp/${VERSION_LABEL}.zip . \
    -x "*.git*" \
    -x "*node_modules*" \
    -x "*.env*" \
    -x "*.log" \
    -x "*test*" \
    -x "*.md" \
    -x "*.DS_Store"

# Get S3 bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "MyApp-${ENVIRONMENT^}" \
    --query "Stacks[0].Outputs[?OutputKey=='AppVersionsBucket'].OutputValue" \
    --output text \
    --region $REGION)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Could not find S3 bucket. Make sure infrastructure is deployed."
    exit 1
fi

echo "📤 Uploading to S3: ${BUCKET_NAME}"
aws s3 cp /tmp/${VERSION_LABEL}.zip s3://${BUCKET_NAME}/${VERSION_LABEL}.zip

# Create application version
echo "🏗️  Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name "${APP_NAME}-${ENVIRONMENT}" \
    --version-label "${VERSION_LABEL}" \
    --source-bundle S3Bucket="${BUCKET_NAME}",S3Key="${VERSION_LABEL}.zip" \
    --region $REGION

# Deploy to environment
echo "🚢 Deploying to environment..."
aws elasticbeanstalk update-environment \
    --application-name "${APP_NAME}-${ENVIRONMENT}" \
    --environment-name "${APP_NAME}-${ENVIRONMENT}" \
    --version-label "${VERSION_LABEL}" \
    --region $REGION

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
aws elasticbeanstalk wait environment-updated \
    --application-name "${APP_NAME}-${ENVIRONMENT}" \
    --environment-name "${APP_NAME}-${ENVIRONMENT}" \
    --region $REGION

# Get environment URL
ENV_URL=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}-${ENVIRONMENT}" \
    --environment-names "${APP_NAME}-${ENVIRONMENT}" \
    --query "Environments[0].CNAME" \
    --output text \
    --region $REGION)

# Cleanup
rm /tmp/${VERSION_LABEL}.zip

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Application URL: http://${ENV_URL}"
echo ""
echo "To view logs:"
echo "  aws elasticbeanstalk describe-events --application-name ${APP_NAME}-${ENVIRONMENT} --environment-name ${APP_NAME}-${ENVIRONMENT}"

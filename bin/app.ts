#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { devEnvConfig, alphaEnvConfig, bravoEnvConfig, prodEnvConfig, AWS_REGION } from './env';
import { ElasticBeanstalkStack, ElasticBeanstalkStackProps } from '../lib/elastic-beanstalk-stack';
import { SharedAppStack } from '../lib/shared-app-stack';

const NODE_VERSION = '24';
const APPLICATION_NAME = 'breederhq-api';
const SECRETS_MANAGER_PREFIX = 'breederhq';
const SMALL_INSTANCE_TYPE = 't4g.small';
const MEDIUM_INSTANCE_TYPE = 't4g.medium';

// AWS Account IDs - update these with your actual account IDs
const ACCOUNTS = {
  nonProd: '335274136775', // dev, alpha, bravo
  prod:    '427814061976', // production blue/green
};

const app = new cdk.App();

// Shared EB application — one per AWS account
const nonProdApp = new SharedAppStack(app, 'bhq-app', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  applicationName: APPLICATION_NAME,
});

const prodApp = new SharedAppStack(app, 'bhq-app-prod', {
  env: {
    account: ACCOUNTS.prod,
    region: AWS_REGION,
  },
  applicationName: APPLICATION_NAME,
});

// Development environment - single instance
const devStack = new ElasticBeanstalkStack(app, 'bhq-dev', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  environmentName: 'dev',
  applicationName: APPLICATION_NAME,
  secretsManagerPrefix: SECRETS_MANAGER_PREFIX,
  highAvailability: false,
  instanceType: MEDIUM_INSTANCE_TYPE,
  nodeVersion: NODE_VERSION,
  environmentVariables: devEnvConfig,
  cloudFrontEnabled: true,
  cloudFrontCertificateArn: 'arn:aws:acm:us-east-1:335274136775:certificate/e74d5168-2c59-4a9c-8bec-1dc54b3cf035',
  additionalFrontends: ['portal', 'marketplace'],
});
devStack.addDependency(nonProdApp);

// Staging environment - single instance
const alphaStack = new ElasticBeanstalkStack(app, 'bhq-alpha', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  environmentName: 'alpha',
  applicationName: APPLICATION_NAME,
  secretsManagerPrefix: SECRETS_MANAGER_PREFIX,
  highAvailability: false,
  instanceType: MEDIUM_INSTANCE_TYPE,
  nodeVersion: NODE_VERSION,
  environmentVariables: alphaEnvConfig,
  cloudFrontEnabled: true,
  cloudFrontCertificateArn: 'arn:aws:acm:us-east-1:335274136775:certificate/e74d5168-2c59-4a9c-8bec-1dc54b3cf035',
  additionalFrontends: ['portal', 'marketplace'],
});
alphaStack.addDependency(nonProdApp);

// Sandbox environment - single instance
const bravoStack = new ElasticBeanstalkStack(app, 'bhq-bravo', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  environmentName: 'bravo',
  applicationName: APPLICATION_NAME,
  secretsManagerPrefix: SECRETS_MANAGER_PREFIX,
  highAvailability: false,
  instanceType: MEDIUM_INSTANCE_TYPE,
  nodeVersion: NODE_VERSION,
  environmentVariables: bravoEnvConfig,
  cloudFrontEnabled: true,
  cloudFrontCertificateArn: 'arn:aws:acm:us-east-1:335274136775:certificate/e74d5168-2c59-4a9c-8bec-1dc54b3cf035',
  additionalFrontends: ['portal', 'marketplace'],
});
bravoStack.addDependency(nonProdApp);

// Production environment - blue/green deployment with CNAME swap
const productionConfig: Omit<ElasticBeanstalkStackProps, 'env' | 'environmentName'> = {
  applicationName: APPLICATION_NAME,
  highAvailability: true,
  instanceType: MEDIUM_INSTANCE_TYPE,
  minInstances: 1,
  maxInstances: 10,
  nodeVersion: NODE_VERSION,
  environmentVariables: prodEnvConfig,
};

const prodBlueStack = new ElasticBeanstalkStack(app, 'bhq-prod-blue', {
  env: {
    account: ACCOUNTS.prod,
    region: AWS_REGION,
  },
  environmentName: 'production-blue',
  ...productionConfig,
});
prodBlueStack.addDependency(prodApp);

const prodGreenStack = new ElasticBeanstalkStack(app, 'bhq-prod-green', {
  env: {
    account: ACCOUNTS.prod,
    region: AWS_REGION,
  },
  environmentName: 'production-green',
  ...productionConfig,
});
prodGreenStack.addDependency(prodApp);

app.synth();

#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { devEnvConfig, alphaEnvConfig, betaEnvConfig, prodEnvConfig, AWS_REGION } from './env';
import { ElasticBeanstalkStack, ElasticBeanstalkStackProps } from '../lib/elastic-beanstalk-stack';

const NODE_VERSION = '24';
const APPLICATION_NAME = 'breederhq-api';
const SMALL_INSTANCE_TYPE = 't4g.small';
const MEDIUM_INSTANCE_TYPE = 't4g.medium';

// AWS Account IDs - update these with your actual account IDs
const ACCOUNTS = {
  nonProd: '335274136775', // dev, alpha, beta
  prod:    '427814061976', // production blue/green
};

const app = new cdk.App();

// Development environment - single instance
new ElasticBeanstalkStack(app, 'bhq-dev', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  environmentName: 'dev',
  applicationName: APPLICATION_NAME,
  highAvailability: false,
  instanceType: SMALL_INSTANCE_TYPE,
  nodeVersion: NODE_VERSION,
  environmentVariables: devEnvConfig,
});

// Staging environment - single instance
new ElasticBeanstalkStack(app, 'bhq-alpha', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  environmentName: 'alpha',
  applicationName: APPLICATION_NAME,
  highAvailability: false,
  instanceType: SMALL_INSTANCE_TYPE,
  nodeVersion: NODE_VERSION,
  environmentVariables: alphaEnvConfig,
});

// Sandbox environment - single instance
new ElasticBeanstalkStack(app, 'bhq-beta', {
  env: {
    account: ACCOUNTS.nonProd,
    region: AWS_REGION,
  },
  environmentName: 'beta',
  applicationName: APPLICATION_NAME,
  highAvailability: false,
  instanceType: SMALL_INSTANCE_TYPE,
  nodeVersion: NODE_VERSION,
  environmentVariables: betaEnvConfig,
});

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

new ElasticBeanstalkStack(app, 'bhq-prod-blue', {
  env: {
    account: ACCOUNTS.prod,
    region: AWS_REGION,
  },
  environmentName: 'production-blue',
  ...productionConfig,
});

new ElasticBeanstalkStack(app, 'bhq-prod-green', {
  env: {
    account: ACCOUNTS.prod,
    region: AWS_REGION,
  },
  environmentName: 'production-green',
  ...productionConfig,
});

app.synth();

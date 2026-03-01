import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface ElasticBeanstalkStackProps extends cdk.StackProps {
  environmentName: string;
  applicationName: string;
  secretsManagerPrefix?: string;
  highAvailability: boolean;
  instanceType: string;
  nodeVersion: string;
  minInstances?: number;
  maxInstances?: number;
  environmentVariables?: { [key: string]: string };
  vpcId?: string;
  certificateArn?: string; // For HTTPS
  cloudFrontEnabled?: boolean;
  frontendBucketName?: string;
  cloudFrontCertificateArn?: string; // ACM cert in us-east-1
  cloudFrontAliases?: string[];
}

export class ElasticBeanstalkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ElasticBeanstalkStackProps) {
    super(scope, id, props);

    const {
      environmentName,
      applicationName,
      secretsManagerPrefix,
      highAvailability,
      instanceType,
      nodeVersion,
      minInstances = 2,
      maxInstances = 4,
      environmentVariables = {},
      certificateArn,
      cloudFrontEnabled = false,
      frontendBucketName = `breederhq-fe-${environmentName}`,
      cloudFrontCertificateArn,
      cloudFrontAliases,
    } = props;

    // Create S3 bucket for application versions
    const appBucket = new s3.Bucket(this, 'AppBucket', {
      bucketName: `${applicationName}-${environmentName}-versions-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
    });

    // Create Elastic Beanstalk application
    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: `${applicationName}-${environmentName}`,
      description: `${applicationName} - ${environmentName} environment`,
    });

    // Create IAM role for EC2 instances
    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'),
      ],
    });

    // Add additional permissions if needed (e.g., for S3, DynamoDB, etc.)
    instanceRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [`${appBucket.bucketArn}/*`],
    }));

    // Assets bucket access
    const assetsBucketArn = `arn:aws:s3:::breederhq-assets-${environmentName}`;
    instanceRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: [assetsBucketArn, `${assetsBucketArn}/*`],
    }));

    // Secrets Manager access
    instanceRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${secretsManagerPrefix}/${environmentName}*`],
    }));

    const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [instanceRole.roleName],
      instanceProfileName: `${applicationName}-${environmentName}-instance-profile`,
    });

    // Create service role for Elastic Beanstalk
    const serviceRole = new iam.Role(this, 'ServiceRole', {
      assumedBy: new iam.ServicePrincipal('elasticbeanstalk.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSElasticBeanstalkEnhancedHealth'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSElasticBeanstalkService'),
      ],
    });

    // Get the latest Node.js platform ARN
    // For Node.js 20 on Amazon Linux 2023
    const platformArn = `arn:aws:elasticbeanstalk:${this.region}::platform/Node.js ${nodeVersion} running on 64bit Amazon Linux 2023`;

    // Build option settings based on environment type
    const optionSettings: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
      // Instance settings
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'InstanceType',
        value: instanceType,
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: instanceProfile.ref,
      },
      
      // Service role
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'ServiceRole',
        value: serviceRole.roleName,
      },

      // Environment type
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'EnvironmentType',
        value: highAvailability ? 'LoadBalanced' : 'SingleInstance',
      },

      // Health reporting
      {
        namespace: 'aws:elasticbeanstalk:healthreporting:system',
        optionName: 'SystemType',
        value: 'enhanced',
      },

      // CloudWatch Logs
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'StreamLogs',
        value: 'true',
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'RetentionInDays',
        value: '30',
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'DeleteOnTerminate',
        value: 'false',
      },

      // Deployment policy
      {
        namespace: 'aws:elasticbeanstalk:command',
        optionName: 'DeploymentPolicy',
        value: highAvailability ? 'Rolling' : 'AllAtOnce',
      },
    ];

    // Add high availability specific settings
    if (highAvailability) {
      optionSettings.push(
        {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MinSize',
          value: minInstances.toString(),
        },
        {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MaxSize',
          value: maxInstances.toString(),
        },
        {
          namespace: 'aws:elasticbeanstalk:command',
          optionName: 'BatchSizeType',
          value: 'Percentage',
        },
        {
          namespace: 'aws:elasticbeanstalk:command',
          optionName: 'BatchSize',
          value: '30',
        },
        {
          namespace: 'aws:elb:loadbalancer',
          optionName: 'CrossZone',
          value: 'true',
        },
        {
          namespace: 'aws:autoscaling:trigger',
          optionName: 'MeasureName',
          value: 'CPUUtilization',
        },
        {
          namespace: 'aws:autoscaling:trigger',
          optionName: 'Statistic',
          value: 'Average',
        },
        {
          namespace: 'aws:autoscaling:trigger',
          optionName: 'Unit',
          value: 'Percent',
        },
        {
          namespace: 'aws:autoscaling:trigger',
          optionName: 'UpperThreshold',
          value: '75',
        },
        {
          namespace: 'aws:autoscaling:trigger',
          optionName: 'LowerThreshold',
          value: '25',
        },
      );

      // Add HTTPS listener if certificate is provided
      if (certificateArn) {
        optionSettings.push(
          {
            namespace: 'aws:elb:listener:443',
            optionName: 'ListenerProtocol',
            value: 'HTTPS',
          },
          {
            namespace: 'aws:elb:listener:443',
            optionName: 'InstancePort',
            value: '80',
          },
          {
            namespace: 'aws:elb:listener:443',
            optionName: 'SSLCertificateId',
            value: certificateArn,
          },
        );
      }
    }

    // Derive APP_URL and ALLOWED_ORIGINS from CDN_DOMAIN if not explicitly provided
    const resolvedEnvVars = { ...environmentVariables };
    if (resolvedEnvVars.CDN_DOMAIN && !resolvedEnvVars.APP_URL) {
      resolvedEnvVars.APP_URL = `https://${resolvedEnvVars.CDN_DOMAIN}`;
    }
    if (resolvedEnvVars.CDN_DOMAIN && !resolvedEnvVars.ALLOWED_ORIGINS) {
      resolvedEnvVars.ALLOWED_ORIGINS = `https://${resolvedEnvVars.CDN_DOMAIN}`;
    }

    // Add environment variables
    Object.entries(resolvedEnvVars).forEach(([key, value]) => {
      optionSettings.push({
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: key,
        value: value,
      });
    });

    // Create Elastic Beanstalk environment
    const environment = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
      environmentName: `${applicationName}-${environmentName}`,
      applicationName: app.ref,
      platformArn: platformArn,
      optionSettings: optionSettings,
      description: `${environmentName} environment for ${applicationName}`,
    });

    environment.addDependency(app);

    // Outputs
    new cdk.CfnOutput(this, 'ApplicationName', {
      value: app.ref,
      description: 'Elastic Beanstalk Application Name',
    });

    new cdk.CfnOutput(this, 'EnvironmentName', {
      value: environment.ref,
      description: 'Elastic Beanstalk Environment Name',
    });

    new cdk.CfnOutput(this, 'EnvironmentURL', {
      value: `http://${environment.attrEndpointUrl}`,
      description: 'Environment URL',
    });

    new cdk.CfnOutput(this, 'AppVersionsBucket', {
      value: appBucket.bucketName,
      description: 'S3 Bucket for application versions',
    });

    // CloudFront distribution for unified frontend + API origin
    if (cloudFrontEnabled) {
      const frontendBucket = s3.Bucket.fromBucketName(this, 'FrontendBucket', frontendBucketName);

      const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
        originAccessControlConfig: {
          name: `${applicationName}-${environmentName}-oac`,
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
        },
      });

      const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(frontendBucket);

      // Assets bucket — user-uploaded media (animal photos, documents, etc.)
      // Storage keys are rooted under tenants/ or providers/, so those paths
      // are handled here rather than a separate CloudFront distribution.
      // This eliminates cross-origin issues when the image editor fetches
      // existing images for canvas-based cropping. Set CDN_DOMAIN to this
      // distribution's domain name in Secrets Manager.
      const assetsBucketName = `breederhq-assets-${environmentName}`;
      const assetsBucket = s3.Bucket.fromBucketName(this, 'AssetsBucket', assetsBucketName);
      const assetsOrigin = origins.S3BucketOrigin.withOriginAccessControl(assetsBucket);

      const ebCnameResource = new cr.AwsCustomResource(this, 'EBCname', {
        onUpdate: {
          service: 'ElasticBeanstalk',
          action: 'describeEnvironments',
          parameters: { EnvironmentNames: [environment.ref] },
          physicalResourceId: cr.PhysicalResourceId.of(environment.ref),
          outputPaths: ['Environments.0.CNAME'],
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

      const ebOrigin = new origins.HttpOrigin(ebCnameResource.getResponseField('Environments.0.CNAME'), {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      });

      const distribution = new cloudfront.Distribution(this, 'Distribution', {
        comment: `${applicationName} ${environmentName} frontend + API + assets distribution`,
        defaultBehavior: {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        additionalBehaviors: {
          '/api/*': {
            origin: ebOrigin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          },
          // Media assets — storage keys are rooted under tenants/ or providers/
          '/tenants/*': {
            origin: assetsOrigin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
          '/providers/*': {
            origin: assetsOrigin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          },
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
        ...(cloudFrontCertificateArn && cloudFrontAliases ? {
          certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
            this, 'CloudFrontCert', cloudFrontCertificateArn,
          ),
          domainNames: cloudFrontAliases,
        } : {}),
      });

      // Allow CloudFront (via OAC) to read from the assets bucket.
      // fromBucketName() returns an imported bucket — CDK cannot auto-add
      // resource policies to imported buckets, so we do it explicitly here.
      new s3.CfnBucketPolicy(this, 'AssetsBucketPolicy', {
        bucket: assetsBucketName,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Sid: 'AllowCloudFrontOAC',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${assetsBucketName}/*`,
            Condition: {
              StringEquals: {
                'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
              },
            },
          }],
        },
      });

      new cdk.CfnOutput(this, 'CloudFrontDomainName', {
        value: distribution.distributionDomainName,
        description: 'CloudFront Distribution Domain Name — set as CDN_DOMAIN in Secrets Manager',
      });

      new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
        value: distribution.distributionId,
        description: 'CloudFront Distribution ID',
      });
    }
  }
}

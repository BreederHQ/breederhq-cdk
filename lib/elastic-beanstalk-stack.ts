import * as cdk from 'aws-cdk-lib';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface ElasticBeanstalkStackProps extends cdk.StackProps {
  environmentName: string;
  applicationName: string;
  highAvailability: boolean;
  instanceType: string;
  nodeVersion: string;
  minInstances?: number;
  maxInstances?: number;
  environmentVariables?: { [key: string]: string };
  vpcId?: string;
  certificateArn?: string; // For HTTPS
}

export class ElasticBeanstalkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ElasticBeanstalkStackProps) {
    super(scope, id, props);

    const {
      environmentName,
      applicationName,
      highAvailability,
      instanceType,
      nodeVersion,
      minInstances = 2,
      maxInstances = 4,
      environmentVariables = {},
      certificateArn,
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
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${applicationName}/${environmentName}*`],
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

    // Add environment variables
    Object.entries(environmentVariables).forEach(([key, value]) => {
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
  }
}

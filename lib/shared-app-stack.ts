import * as cdk from 'aws-cdk-lib';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import { Construct } from 'constructs';

export interface SharedAppStackProps extends cdk.StackProps {
  applicationName: string;
}

export class SharedAppStack extends cdk.Stack {
  public readonly applicationName: string;

  constructor(scope: Construct, id: string, props: SharedAppStackProps) {
    super(scope, id, props);

    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: props.applicationName,
      description: `${props.applicationName} — shared Elastic Beanstalk application`,
    });

    this.applicationName = app.ref;

    new cdk.CfnOutput(this, 'ApplicationName', {
      value: app.ref,
      description: 'Elastic Beanstalk Application Name',
    });
  }
}

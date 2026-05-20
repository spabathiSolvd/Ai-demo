import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { CloudWatchLogGroupConfig } from './constructs/log-group-config';
import { MonitoredEC2Instance } from './constructs/monitored-ec2';
import { MetricsDashboard } from './constructs/metrics-dashboard';

/**
 * Properties for EC2MonitoringStack
 */
export interface EC2MonitoringStackProps extends cdk.StackProps {
  /**
   * Optional VPC to use for the EC2 instance.
   * If not provided, the default VPC will be used.
   */
  vpc?: ec2.IVpc;
}

/**
 * EC2MonitoringStack provisions an EC2 instance with comprehensive CloudWatch
 * monitoring capabilities including log groups and metrics dashboards.
 * 
 * This stack satisfies requirements:
 * - 1.2: Deploys EC2 instance within dev stack environment
 * - 1.6: Stack synthesizes without errors
 * - 1.9: Exports instance ID as CloudFormation output
 * - 2.1: Creates CloudWatch log group
 * - 2.3: Configures log retention period
 * - 3.1: Creates CloudWatch metrics dashboard
 * - 4.7: Dashboard accessible via AWS Console
 * - 8.1: Targets AWS account 575458732775
 * - 8.2: Configures AWS account ID in CDK context
 * - 8.4: Deploys to us-east-1 region
 */
export class EC2MonitoringStack extends cdk.Stack {
  /**
   * The EC2 instance created by this stack
   */
  public readonly instance: ec2.Instance;

  /**
   * The CloudWatch log group for instance logs
   */
  public readonly logGroup: logs.LogGroup;

  /**
   * The CloudWatch dashboard for metrics visualization
   */
  public readonly dashboard: cdk.aws_cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props?: EC2MonitoringStackProps) {
    // Configure stack with specific account and region
    // Requirements 8.1, 8.2, 8.4: Target account 575458732775 in us-east-1
    super(scope, id, {
      ...props,
      stackName: 'EC2MonitoringStack',
      env: {
        account: '575458732775',
        region: 'us-east-1',
      },
    });

    // Get VPC - use provided VPC or default VPC
    // Requirement 1.7: Instance assigned to VPC subnet
    const vpc = props?.vpc ?? ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // Create CloudWatch log group with placeholder instance ID
    // This will be updated with actual instance ID after EC2 creation
    // Requirements 2.1, 2.3: Log group with 30-day retention
    const logGroupConfig = new CloudWatchLogGroupConfig(this, 'LogGroupConfig', {
      logGroupName: '/aws/ec2/ec2-monitoring-stack',
      retentionDays: logs.RetentionDays.ONE_MONTH,
      instanceId: 'placeholder', // Will be updated after instance creation
    });
    this.logGroup = logGroupConfig.logGroup;

    // Create monitored EC2 instance
    // Requirements 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 2.2, 2.7, 4.2
    const monitoredInstance = new MonitoredEC2Instance(this, 'MonitoredInstance', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      logGroup: this.logGroup,
    });
    this.instance = monitoredInstance.instance;

    // Update log group tags with actual instance ID
    // Requirements 2.5, 2.6: Tag log group with instance metadata
    cdk.Tags.of(this.logGroup).add('InstanceId', this.instance.instanceId);

    // Create CloudWatch metrics dashboard
    // Requirements 3.1, 4.7: Dashboard for CPU and memory metrics
    const metricsDashboard = new MetricsDashboard(this, 'MetricsDashboard', {
      dashboardName: 'EC2-Monitoring-Dashboard',
      instance: this.instance,
    });
    this.dashboard = metricsDashboard.dashboard;

    // CloudFormation Outputs
    // Requirement 1.9: Export instance ID and other resource identifiers

    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'EC2 Instance ID',
      exportName: 'EC2MonitoringStack-InstanceId',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'CloudWatch Log Group Name',
      exportName: 'EC2MonitoringStack-LogGroupName',
    });

    new cdk.CfnOutput(this, 'DashboardName', {
      value: this.dashboard.dashboardName,
      description: 'CloudWatch Dashboard Name',
      exportName: 'EC2MonitoringStack-DashboardName',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
      exportName: 'EC2MonitoringStack-DashboardUrl',
    });

    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: monitoredInstance.securityGroup.securityGroupId,
      description: 'Security Group ID',
      exportName: 'EC2MonitoringStack-SecurityGroupId',
    });

    new cdk.CfnOutput(this, 'InstanceRoleArn', {
      value: monitoredInstance.role.roleArn,
      description: 'IAM Role ARN for EC2 Instance',
      exportName: 'EC2MonitoringStack-InstanceRoleArn',
    });
  }
}

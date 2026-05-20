import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Properties for CloudWatchLogGroupConfig construct
 */
export interface CloudWatchLogGroupConfigProps {
  /**
   * The name of the CloudWatch log group
   */
  logGroupName: string;

  /**
   * The retention period for logs in days
   */
  retentionDays: logs.RetentionDays;

  /**
   * The EC2 instance ID for tagging
   */
  instanceId: string;
}

/**
 * CloudWatchLogGroupConfig construct creates a CloudWatch log group
 * with configurable name, retention period, and metadata tags.
 * 
 * This construct satisfies requirements:
 * - 2.1: Creates CloudWatch log group with specified name
 * - 2.3: Configures retention period
 * - 2.5: Tags log group with InstanceId metadata
 * - 2.6: Tags log group with StackName metadata
 */
export class CloudWatchLogGroupConfig extends Construct {
  /**
   * The CloudWatch log group created by this construct
   */
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: CloudWatchLogGroupConfigProps) {
    super(scope, id);

    // Create the CloudWatch log group with specified configuration
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: props.logGroupName,
      retention: props.retentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/test environments
    });

    // Add metadata tags for resource tracking
    // Requirement 2.5: Tag with InstanceId
    cdk.Tags.of(this.logGroup).add('InstanceId', props.instanceId);
    
    // Requirement 2.6: Tag with StackName
    cdk.Tags.of(this.logGroup).add('StackName', 'EC2MonitoringStack');
  }
}

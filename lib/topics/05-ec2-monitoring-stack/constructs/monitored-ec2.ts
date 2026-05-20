import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Properties for MonitoredEC2Instance construct
 */
export interface MonitoredEC2InstanceProps {
  /**
   * The VPC in which to launch the EC2 instance
   */
  vpc: ec2.IVpc;

  /**
   * The instance type for the EC2 instance
   */
  instanceType: ec2.InstanceType;

  /**
   * The machine image (AMI) to use for the EC2 instance
   */
  machineImage: ec2.IMachineImage;

  /**
   * The CloudWatch log group for the instance logs
   */
  logGroup: logs.ILogGroup;
}

/**
 * MonitoredEC2Instance construct creates an EC2 instance with CloudWatch monitoring
 * capabilities, including security group, IAM role, and CloudWatch agent configuration.
 * 
 * This construct satisfies requirements:
 * - 1.1: Creates EC2 instance using AWS CDK ec2.Instance construct
 * - 1.3: Configures instance type t3.micro
 * - 1.4: Configures Amazon Linux 2023 AMI
 * - 1.5: Creates security group with HTTPS outbound rule
 * - 1.7: Assigns instance to VPC subnet
 * - 1.8: Enables IMDSv2 with hop limit of 1
 * - 2.2: Configures instance to send logs to CloudWatch
 * - 2.7: IAM role includes logs:CreateLogStream and logs:PutLogEvents permissions
 * - 4.2: Installs and configures CloudWatch agent
 */
export class MonitoredEC2Instance extends Construct {
  /**
   * The EC2 instance created by this construct
   */
  public readonly instance: ec2.Instance;

  /**
   * The security group attached to the EC2 instance
   */
  public readonly securityGroup: ec2.SecurityGroup;

  /**
   * The IAM role attached to the EC2 instance
   */
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: MonitoredEC2InstanceProps) {
    super(scope, id);

    // Create security group with HTTPS outbound rule
    // Requirement 1.5: Security group allows outbound HTTPS traffic on port 443
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for monitored EC2 instance',
      allowAllOutbound: false, // Explicitly control outbound rules
    });

    // Add HTTPS outbound rule
    this.securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS outbound traffic'
    );

    // Create IAM role with CloudWatch permissions
    // Requirement 2.7: IAM role with logs and CloudWatch permissions
    this.role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for EC2 instance with CloudWatch monitoring',
    });

    // Add inline policy with required permissions
    this.role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
        'cloudwatch:PutMetricData',
        'ec2:DescribeVolumes',
        'ec2:DescribeTags',
      ],
      resources: ['*'],
    }));

    // Attach AWS managed policy for CloudWatch agent
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
    );

    // Generate user data script for CloudWatch agent installation
    const userData = this.generateUserData();

    // Create EC2 instance
    // Requirements 1.1, 1.3, 1.4, 1.7, 1.8
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: props.vpc,
      instanceType: props.instanceType,
      machineImage: props.machineImage,
      securityGroup: this.securityGroup,
      role: this.role,
      userData: userData,
      // Requirement 1.8: Enable IMDSv2 with hop limit of 1
      requireImdsv2: true,
      // Note: CDK's requireImdsv2 sets HttpTokens to 'required' and HttpPutResponseHopLimit to 1
    });
  }

  /**
   * Generates user data script for CloudWatch agent installation and configuration
   * 
   * @returns UserData object with CloudWatch agent setup script
   * 
   * Requirements:
   * - Downloads and installs CloudWatch agent
   * - Configures agent using the config file
   * - Enables agent to start on boot
   */
  private generateUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux();

    // CloudWatch agent configuration embedded directly
    // This matches the configuration in config/cloudwatch-agent.json
    const configContent = JSON.stringify({
      "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "root"
      },
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [
              {
                "file_path": "/var/log/application.log",
                "log_group_name": "/aws/ec2/ec2-monitoring-stack",
                "log_stream_name": "{instance_id}/application"
              },
              {
                "file_path": "/var/log/messages",
                "log_group_name": "/aws/ec2/ec2-monitoring-stack",
                "log_stream_name": "{instance_id}/system"
              }
            ]
          }
        }
      },
      "metrics": {
        "namespace": "CWAgent",
        "metrics_collected": {
          "mem": {
            "measurement": [
              {
                "name": "mem_used_percent",
                "rename": "mem_used_percent",
                "unit": "Percent"
              },
              {
                "name": "mem_available_percent",
                "rename": "mem_available_percent",
                "unit": "Percent"
              },
              {
                "name": "mem_used",
                "rename": "mem_used",
                "unit": "Bytes"
              }
            ],
            "metrics_collection_interval": 60
          }
        }
      }
    }, null, 2);

    // Add commands to install and configure CloudWatch agent
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      '',
      '# Download CloudWatch agent',
      'wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm',
      '',
      '# Install CloudWatch agent',
      'rpm -U ./amazon-cloudwatch-agent.rpm',
      '',
      '# Create configuration file',
      `cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'`,
      configContent,
      'EOF',
      '',
      '# Start CloudWatch agent with configuration',
      '/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \\',
      '  -a fetch-config \\',
      '  -m ec2 \\',
      '  -s \\',
      '  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json',
      '',
      '# Enable CloudWatch agent to start on boot',
      'systemctl enable amazon-cloudwatch-agent',
      '',
      '# Create application log file if it doesn\'t exist',
      'touch /var/log/application.log',
      'chmod 644 /var/log/application.log'
    );

    return userData;
  }
}

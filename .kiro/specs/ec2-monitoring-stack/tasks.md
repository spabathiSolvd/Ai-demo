# Implementation Plan: EC2 Monitoring Stack

## Overview

This implementation plan breaks down the EC2 Monitoring Stack feature into discrete, actionable tasks. The stack provisions an EC2 instance with comprehensive CloudWatch monitoring (logs and metrics dashboards) and automated CI/CD pipelines using AWS CDK and TypeScript.

The implementation follows a bottom-up approach: first establishing the directory structure and core interfaces, then building individual components (EC2 instance, log groups, dashboards), and finally wiring everything together with CI/CD workflows.

## Tasks

- [x] 1. Set up topic directory structure and core configuration
  - Create directory `lib/topics/05-ec2-monitoring-stack/` with subdirectories `constructs/` and `config/`
  - Create CloudWatch agent configuration file at `lib/topics/05-ec2-monitoring-stack/config/cloudwatch-agent.json` with metrics collection interval of 60 seconds, log collection for `/var/log/application.log` and `/var/log/messages`, and memory metrics (mem_used_percent, mem_available_percent, mem_used)
  - Create main stack file `lib/topics/05-ec2-monitoring-stack/index.ts` with EC2MonitoringStack class extending cdk.Stack
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 2. Implement CloudWatch log group configuration construct
  - [x] 2.1 Create CloudWatchLogGroupConfig construct
    - Create file `lib/topics/05-ec2-monitoring-stack/constructs/log-group-config.ts`
    - Implement CloudWatchLogGroupConfig class that creates a logs.LogGroup with configurable name, retention period, and tags
    - Add tags for InstanceId and StackName metadata
    - Export interface CloudWatchLogGroupConfigProps with properties: logGroupName (string), retentionDays (logs.RetentionDays), instanceId (string)
    - _Requirements: 2.1, 2.3, 2.5, 2.6_
  
  - [ ]* 2.2 Write CDK assertion test for log group configuration
    - Test verifies log group name is `/aws/ec2/ec2-monitoring-stack`
    - Test verifies retention period is 30 days
    - Test verifies tags include StackName: EC2MonitoringStack
    - _Requirements: 2.1, 2.3, 2.5, 2.6_

- [x] 3. Implement CloudWatch metrics dashboard construct
  - [x] 3.1 Create MetricsDashboard construct
    - Create file `lib/topics/05-ec2-monitoring-stack/constructs/metrics-dashboard.ts`
    - Implement MetricsDashboard class that creates a cloudwatch.Dashboard with name "EC2-Monitoring-Dashboard"
    - Implement private method createCpuWidget() that returns cloudwatch.GraphWidget for AWS/EC2 CPUUtilization metric with Average statistic over 5-minute periods, Y-axis 0-100%
    - Implement private method createMemoryWidget() that returns cloudwatch.GraphWidget for CWAgent namespace metrics (mem_used_percent, mem_available_percent, mem_used) with Average statistic over 5-minute periods
    - Configure dashboard with default time range of 3 hours and vertical widget layout (CPU above memory)
    - Export interface MetricsDashboardProps with properties: dashboardName (string), instance (ec2.IInstance)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 3.2 Write CDK assertion test for dashboard configuration
    - Test verifies dashboard resource exists with name "EC2-Monitoring-Dashboard"
    - Test verifies dashboard body contains CPU and memory metric widgets
    - _Requirements: 3.1, 4.7_

- [x] 4. Implement monitored EC2 instance construct
  - [x] 4.1 Create MonitoredEC2Instance construct
    - Create file `lib/topics/05-ec2-monitoring-stack/constructs/monitored-ec2.ts`
    - Implement MonitoredEC2Instance class that creates an ec2.Instance with instance type t3.micro and Amazon Linux 2023 AMI
    - Configure IMDSv2 settings: HttpTokens required, HttpPutResponseHopLimit 1
    - Create security group with egress rule allowing HTTPS (port 443) to 0.0.0.0/0
    - Create IAM role with permissions: logs:CreateLogStream, logs:PutLogEvents, logs:DescribeLogStreams, cloudwatch:PutMetricData, ec2:DescribeVolumes, ec2:DescribeTags
    - Attach AWS managed policy CloudWatchAgentServerPolicy to IAM role
    - Generate user data script that downloads and installs CloudWatch agent, configures it using the config file, and enables it to start on boot
    - Export interface MonitoredEC2InstanceProps with properties: vpc (ec2.IVpc), instanceType (ec2.InstanceType), machineImage (ec2.IMachineImage), logGroup (logs.ILogGroup)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.7, 1.8, 2.2, 2.7, 4.2_
  
  - [ ]* 4.2 Write CDK assertion tests for EC2 instance configuration
    - Test verifies instance type is t3.micro
    - Test verifies IMDSv2 settings: HttpTokens required, HttpPutResponseHopLimit 1
    - Test verifies security group egress rule for HTTPS (port 443)
    - Test verifies IAM role has required CloudWatch permissions
    - _Requirements: 1.3, 1.4, 1.5, 1.8, 2.7_

- [ ] 5. Checkpoint - Ensure all constructs compile without errors
  - Run `npm run build` to verify TypeScript compilation succeeds
  - Ensure all tests pass, ask the user if questions arise

- [ ] 6. Wire components together in main stack
  - [x] 6.1 Implement EC2MonitoringStack class
    - In `lib/topics/05-ec2-monitoring-stack/index.ts`, implement constructor that accepts scope, id, and optional props
    - Set stack name to "EC2MonitoringStack" and configure environment with account "575458732775" and region "us-east-1"
    - Instantiate CloudWatchLogGroupConfig with log group name `/aws/ec2/ec2-monitoring-stack`, retention 30 days, and placeholder instance ID
    - Instantiate MonitoredEC2Instance with VPC (use default VPC or accept via props), instance type t3.micro, Amazon Linux 2023 AMI, and log group reference
    - Update log group tags with actual instance ID after EC2 instance creation
    - Instantiate MetricsDashboard with dashboard name "EC2-Monitoring-Dashboard" and instance reference
    - Add CloudFormation outputs: InstanceId, LogGroupName, DashboardName, DashboardUrl (format: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EC2-Monitoring-Dashboard), SecurityGroupId, InstanceRoleArn
    - _Requirements: 1.2, 1.6, 1.9, 2.1, 2.3, 3.1, 4.7, 8.1, 8.2, 8.4_
  
  - [ ]* 6.2 Write CDK snapshot test for complete stack
    - Test generates CloudFormation template and compares against stored snapshot
    - Detects unintended changes to template structure
    - _Requirements: 1.6, 5.8_
  
  - [ ]* 6.3 Write CDK assertion test for stack outputs
    - Test verifies stack exports InstanceId, LogGroupName, DashboardName, DashboardUrl, SecurityGroupId, InstanceRoleArn
    - _Requirements: 1.9_

- [x] 7. Register stack in CDK app entry point
  - [x] 7.1 Add stack instantiation to bin/app.ts
    - Import EC2MonitoringStack from `../lib/topics/05-ec2-monitoring-stack`
    - Instantiate EC2MonitoringStack with app scope and stack ID "EC2MonitoringStack"
    - Configure stack with environment account "575458732775" and region "us-east-1"
    - _Requirements: 5.6, 8.1, 8.4_

- [x] 8. Checkpoint - Verify CDK synthesis succeeds
  - Run `npx cdk synth EC2MonitoringStack` to validate stack configuration
  - Ensure synthesis completes without errors
  - Ensure all tests pass, ask the user if questions arise

- [x] 9. Create CI workflow for automated testing
  - [x] 9.1 Create GitHub Actions CI workflow file
    - Create file `.github/workflows/ci-ec2-monitoring.yml`
    - Configure workflow name as "ci-ec2-monitoring.yml"
    - Set trigger on push events with path filter `lib/topics/*-ec2-monitoring-stack/**`
    - Define build job running on ubuntu-latest with timeout of 10 minutes
    - Add steps: actions/checkout@v3, actions/setup-node@v3 (Node.js 18), npm install, npm run build, npm test
    - Configure job to exit with code 1 on any step failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 9.2 Write workflow validation test
    - Parse YAML file and verify workflow structure
    - Verify trigger path filter matches `lib/topics/*-ec2-monitoring-stack/**`
    - Verify build steps include checkout, setup-node, install, build, test
    - _Requirements: 6.1, 6.2, 9.1, 9.2, 9.3, 9.4_

- [x] 10. Create CD workflow for automated deployment
  - [ ] 10.1 Create GitHub Actions CD workflow file
    - Create file `.github/workflows/cd-ec2-monitoring.yml`
    - Configure workflow name as "cd-ec2-monitoring.yml"
    - Set trigger on push events to main branch with path filter `lib/topics/*-ec2-monitoring-stack/**`
    - Add workflow dependency on CI workflow completion (needs: [ci-build])
    - Configure concurrency group "ec2-monitoring-deploy" with cancel-in-progress: false
    - Define deploy job running on ubuntu-latest
    - Add steps: actions/checkout@v3, actions/setup-node@v3 (Node.js 18), aws-actions/configure-aws-credentials@v2 (with role-to-assume from secrets.AWS_ROLE_ARN, region us-east-1), npm install, npx cdk deploy EC2MonitoringStack --require-approval never (with timeout 10 minutes)
    - Configure job to exit with code 1 and log error message on deployment failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.3, 8.4, 8.5, 8.6, 8.7, 9.6, 9.7, 9.8, 9.9_
  
  - [ ]* 10.2 Write workflow validation test
    - Parse YAML file and verify workflow structure
    - Verify trigger on main branch with path filter `lib/topics/*-ec2-monitoring-stack/**`
    - Verify deploy step includes `cdk deploy EC2MonitoringStack`
    - Verify AWS authentication step with correct region
    - _Requirements: 7.1, 7.2, 9.6, 9.7, 9.8, 9.9_

- [x] 11. Final checkpoint - Verify complete implementation
  - Run `npm run build` to ensure all TypeScript compiles
  - Run `npm test` to ensure all tests pass
  - Run `npx cdk synth EC2MonitoringStack` to verify stack synthesis
  - Review CloudFormation template for correctness
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- CDK assertion tests validate CloudFormation template structure and resource configurations
- Integration tests (not included in this plan) would verify deployed infrastructure behavior in AWS
- The implementation uses TypeScript and AWS CDK following the project's established patterns
- All infrastructure is deployed to AWS account 575458732775 in us-east-1 region
- CI/CD workflows follow the existing pattern used by other topics in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 5, "tasks": ["9.1", "10.1"] },
    { "id": 6, "tasks": ["9.2", "10.2"] }
  ]
}
```

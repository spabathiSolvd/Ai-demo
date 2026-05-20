# Requirements Document

## Introduction

The EC2 Monitoring Stack feature provides a complete infrastructure solution for deploying an EC2 instance with comprehensive CloudWatch monitoring and automated CI/CD pipelines. This feature enables developers to provision monitored EC2 instances within the dev stack, track CPU and memory utilization through CloudWatch dashboards, and deploy changes automatically through GitHub Actions workflows.

## Glossary

- **EC2_Monitoring_Stack**: The CDK stack that provisions and configures the EC2 instance with monitoring capabilities
- **EC2_Instance**: The Amazon Elastic Compute Cloud virtual server instance
- **CloudWatch_Log_Group**: AWS CloudWatch service component that collects and stores log data from the EC2 instance
- **CloudWatch_Metrics_Dashboard**: AWS CloudWatch dashboard that visualizes CPU and memory utilization metrics
- **CI_Workflow**: GitHub Actions workflow that runs continuous integration checks (build, test, lint)
- **CD_Workflow**: GitHub Actions workflow that deploys infrastructure changes to AWS account 575458732775
- **Dev_Stack**: The development environment CDK stack where the EC2 instance is deployed
- **Topic_Directory**: A numbered directory under lib/topics/ containing topic-specific infrastructure code
- **Foundation_Component**: Reusable CDK construct located in lib/foundation/ that can be shared across topics

## Requirements

### Requirement 1: EC2 Instance Provisioning

**User Story:** As a developer, I want to provision an EC2 instance using CDK constructs within the dev stack, so that I have a compute resource for my application workload.

#### Acceptance Criteria

1. THE EC2_Monitoring_Stack SHALL create an EC2_Instance using AWS CDK ec2.Instance construct
2. THE EC2_Instance SHALL be deployed within the Dev_Stack environment
3. THE EC2_Monitoring_Stack SHALL configure the EC2_Instance with instance type t3.micro
4. THE EC2_Monitoring_Stack SHALL configure the EC2_Instance with Amazon Linux 2023 AMI
5. THE EC2_Monitoring_Stack SHALL configure the EC2_Instance with a security group that allows outbound HTTPS traffic on port 443
6. WHEN the CDK stack is synthesized, THE EC2_Monitoring_Stack SHALL complete without synthesis errors
7. THE EC2_Instance SHALL be assigned to a subnet within a VPC
8. THE EC2_Instance SHALL have IMDSv2 enabled with hop limit of 1
9. THE EC2_Monitoring_Stack SHALL output the EC2_Instance ID as a CloudFormation stack output

### Requirement 2: CloudWatch Log Group Integration

**User Story:** As a developer, I want CloudWatch log groups enabled for my EC2 instance, so that I can collect and analyze application and system logs.

#### Acceptance Criteria

1. THE EC2_Monitoring_Stack SHALL create a CloudWatch_Log_Group for the EC2_Instance with name /aws/ec2/ec2-monitoring-stack
2. THE EC2_Instance SHALL be configured to send application logs from /var/log/application.log and system logs from /var/log/messages to the CloudWatch_Log_Group
3. THE CloudWatch_Log_Group SHALL have a retention period of 30 days
4. WHEN the EC2_Instance generates log entries, THE CloudWatch_Log_Group SHALL capture and store those entries within 5 seconds
5. THE CloudWatch_Log_Group SHALL be tagged with metadata tag "InstanceId" containing the EC2_Instance identifier
6. THE CloudWatch_Log_Group SHALL be tagged with metadata tag "StackName" containing value "EC2MonitoringStack"
7. THE EC2_Instance IAM role SHALL include permissions logs:CreateLogStream and logs:PutLogEvents for the CloudWatch_Log_Group
8. IF the EC2_Instance lacks required IAM permissions, THEN log delivery SHALL fail and the CloudWatch agent SHALL log an error message containing "AccessDenied"

### Requirement 3: CloudWatch Metrics Dashboard for CPU Utilization

**User Story:** As a developer, I want a CloudWatch dashboard displaying CPU utilization metrics, so that I can monitor the compute performance of my EC2 instance.

#### Acceptance Criteria

1. THE EC2_Monitoring_Stack SHALL create a CloudWatch_Metrics_Dashboard named "EC2-Monitoring-Dashboard" for the EC2_Instance
2. THE CloudWatch_Metrics_Dashboard SHALL display CPU utilization metrics using the AWS/EC2 CPUUtilization metric for the EC2_Instance
3. THE CloudWatch_Metrics_Dashboard SHALL aggregate CPU utilization data using Average statistic over 5-minute periods
4. THE CloudWatch_Metrics_Dashboard SHALL visualize CPU utilization as a percentage from 0 to 100 on the Y-axis
5. THE CloudWatch_Metrics_Dashboard SHALL include time range selection controls with options: 1 hour, 3 hours, 12 hours, 1 day, 1 week, and custom range
6. THE CloudWatch_Metrics_Dashboard SHALL display a default time range of 3 hours when first loaded
7. IF the CloudWatch_Metrics_Dashboard creation fails, THEN THE EC2_Monitoring_Stack deployment SHALL fail with an error message indicating the dashboard creation failure

### Requirement 4: CloudWatch Metrics Dashboard for Memory Utilization

**User Story:** As a developer, I want a CloudWatch dashboard displaying memory utilization metrics, so that I can monitor the memory consumption of my EC2 instance.

#### Acceptance Criteria

1. THE CloudWatch_Metrics_Dashboard SHALL display memory utilization metrics for the EC2_Instance using CWAgent namespace metrics mem_used_percent, mem_available_percent, and mem_used
2. THE EC2_Instance SHALL be configured with CloudWatch agent version 1.300032.2 or later to collect memory utilization data at 1-minute intervals
3. THE CloudWatch_Metrics_Dashboard SHALL aggregate memory utilization data using Average statistic over 5-minute periods
4. THE CloudWatch_Metrics_Dashboard SHALL visualize memory utilization as a percentage from 0 to 100 on the Y-axis using a time-series line graph
5. THE CloudWatch_Metrics_Dashboard SHALL display both CPU and memory metrics on the same dashboard in separate widgets positioned vertically
6. THE CloudWatch_Metrics_Dashboard SHALL include time range selection controls with options: 1 hour, 3 hours, and 24 hours
7. THE CloudWatch_Metrics_Dashboard SHALL be accessible via AWS Console at URL https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EC2-Monitoring-Dashboard
8. IF the CloudWatch agent fails to start or collect metrics, THEN THE EC2_Instance SHALL log an error message to /var/log/amazon-cloudwatch-agent/amazon-cloudwatch-agent.log

### Requirement 5: Topic Directory Structure

**User Story:** As a developer, I want the EC2 monitoring infrastructure organized in a numbered topic directory, so that it follows the project's modular architecture pattern.

#### Acceptance Criteria

1. THE EC2_Monitoring_Stack SHALL be implemented within a Topic_Directory named "05-ec2-monitoring-stack" under lib/topics/
2. THE Topic_Directory SHALL contain TypeScript files that define CDK Stack classes extending cdk.Stack for EC2 monitoring
3. THE Topic_Directory SHALL contain all CDK constructs specific to EC2 instance provisioning, CloudWatch log groups, and CloudWatch dashboards
4. THE EC2_Monitoring_Stack SHALL be deployable using "cdk deploy EC2MonitoringStack" without modifying code in other topic directories under lib/topics/
5. WHERE the EC2 monitoring implementation uses reusable components, THE EC2_Monitoring_Stack SHALL import them from Foundation_Component modules using relative import paths starting with "../../foundation/"
6. THE EC2_Monitoring_Stack SHALL be registered in bin/app.ts by instantiating the stack class
7. THE Topic_Directory SHALL have a corresponding GitHub Actions workflow file in .github/workflows/ for CI/CD
8. WHEN the TypeScript code in the Topic_Directory is compiled, THE build SHALL complete without TypeScript compilation errors

### Requirement 6: Continuous Integration Workflow

**User Story:** As a developer, I want a CI workflow that validates my EC2 monitoring stack changes, so that I can catch errors before deployment.

#### Acceptance Criteria

1. THE CI_Workflow SHALL be defined as a GitHub Actions workflow file named ci-ec2-monitoring.yml in .github/workflows/
2. WHEN code changes are pushed to paths matching lib/topics/05-ec2-monitoring-stack/**, THE CI_Workflow SHALL trigger within 30 seconds
3. THE CI_Workflow SHALL install dependencies using command "npm install" with Node.js version 18
4. THE CI_Workflow SHALL run command "npm run build" to compile TypeScript code
5. IF the npm install step fails, THEN THE CI_Workflow SHALL exit with code 1 and display the npm error message
6. IF the npm run build step fails, THEN THE CI_Workflow SHALL exit with code 1 and display the TypeScript compilation errors
7. THE CI_Workflow SHALL execute command "npm test" to run the test suite
8. IF any test fails, THEN THE CI_Workflow SHALL exit with code 1 and display the test failure details
9. THE CI_Workflow SHALL run on ubuntu-latest runner environment
10. THE CI_Workflow SHALL complete all steps (install, build, test) within 10 minutes or timeout with failure status

### Requirement 7: Continuous Deployment Workflow

**User Story:** As a developer, I want a CD workflow that deploys my EC2 monitoring stack to AWS, so that infrastructure changes are automatically applied to the target environment.

#### Acceptance Criteria

1. THE CD_Workflow SHALL be defined as a GitHub Actions workflow file named cd-ec2-monitoring.yml in .github/workflows/
2. WHEN code changes are pushed to paths matching lib/topics/*-ec2-monitoring-stack/**, THE CD_Workflow SHALL execute automatically only after CI_Workflow completes with success status
3. THE CD_Workflow SHALL authenticate to AWS account 575458732775 using GitHub OIDC credentials configured as repository secrets
4. THE CD_Workflow SHALL execute CDK deploy command with stack name EC2MonitoringStack and timeout of 600 seconds
5. THE CD_Workflow SHALL use Node.js version 18 for deployment operations
6. IF the CDK deployment fails, THEN THE CD_Workflow SHALL fail with exit code 1 and output the CDK error message to workflow logs
7. THE CD_Workflow SHALL run on ubuntu-latest runner environment
8. IF a CD_Workflow execution is in progress for the same stack, THEN THE CD_Workflow SHALL queue subsequent executions to run sequentially

### Requirement 8: AWS Account Configuration

**User Story:** As a developer, I want the deployment workflows configured for the correct AWS account, so that resources are provisioned in the intended environment.

#### Acceptance Criteria

1. THE CD_Workflow SHALL target AWS account ID 575458732775 for all deployments
2. WHEN the CD_Workflow executes CDK commands, THE AWS account ID in the CDK context SHALL equal 575458732775
3. THE CD_Workflow SHALL configure AWS credentials with IAM permissions cloudformation:*, ec2:*, logs:*, cloudwatch:*, and iam:PassRole
4. THE CD_Workflow SHALL specify AWS region us-east-1 for resource deployment
5. WHEN the CD_Workflow authenticates to AWS, THE workflow SHALL use GitHub Actions secrets AWS_ROLE_ARN and AWS_REGION for credential management
6. IF AWS authentication fails, THEN THE CD_Workflow SHALL fail with exit code 1
7. IF AWS authentication fails, THEN THE CD_Workflow SHALL output an error message containing the text "Unable to authenticate to AWS account 575458732775"

### Requirement 9: Integration with Existing CI/CD Pattern

**User Story:** As a developer, I want the EC2 monitoring workflows to follow the existing CI/CD patterns, so that the project maintains consistency across all topics.

#### Acceptance Criteria

1. THE CI_Workflow SHALL be named "ci-ec2-monitoring.yml"
2. THE CI_Workflow SHALL include a build job that runs on ubuntu-latest with the following steps: actions/checkout@v3, actions/setup-node@v3, npm install, and npm test
3. THE CI_Workflow SHALL use Node.js version 18 in the setup-node step
4. THE CI_Workflow SHALL trigger on push events with path filter "lib/topics/*-ec2-monitoring-stack/**"
5. IF the EC2 monitoring stack directory contains import statements from "lib/foundation/**", THEN changes to lib/foundation/** SHALL trigger ci-shared.yml
6. THE CD_Workflow SHALL be named "cd-ec2-monitoring.yml"
7. THE CD_Workflow SHALL include a deploy job that runs on ubuntu-latest with the following steps: actions/checkout@v3, actions/setup-node@v3, npm install, and cdk deploy
8. THE CD_Workflow SHALL use Node.js version 18 in the setup-node step
9. THE CD_Workflow SHALL trigger on push events to the main branch with path filter "lib/topics/*-ec2-monitoring-stack/**"

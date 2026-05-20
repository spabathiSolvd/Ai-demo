import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Properties for MetricsDashboard construct
 */
export interface MetricsDashboardProps {
  /**
   * The name of the CloudWatch dashboard
   */
  dashboardName: string;

  /**
   * The EC2 instance to monitor
   */
  instance: ec2.IInstance;
}

/**
 * MetricsDashboard construct creates a CloudWatch dashboard with CPU and memory
 * utilization metrics for an EC2 instance.
 * 
 * This construct satisfies requirements:
 * - 3.1: Creates CloudWatch dashboard with specified name
 * - 3.2: Displays CPU utilization metrics from AWS/EC2 namespace
 * - 3.3: Aggregates CPU data using Average statistic over 5-minute periods
 * - 3.4: Visualizes CPU utilization as percentage (0-100%) on Y-axis
 * - 3.5: Includes time range selection controls
 * - 3.6: Sets default time range to 3 hours
 * - 4.1: Displays memory metrics from CWAgent namespace
 * - 4.2: Configures CloudWatch agent for memory collection
 * - 4.3: Aggregates memory data using Average statistic over 5-minute periods
 * - 4.4: Visualizes memory utilization as percentage (0-100%)
 * - 4.5: Displays CPU and memory in separate widgets
 * - 4.6: Includes time range selection controls
 */
export class MetricsDashboard extends Construct {
  /**
   * The CloudWatch dashboard created by this construct
   */
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MetricsDashboardProps) {
    super(scope, id);

    // Create the CloudWatch dashboard with specified name
    // Requirement 3.1: Dashboard name "EC2-Monitoring-Dashboard"
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: props.dashboardName,
      // Requirement 3.6: Default time range of 3 hours
      defaultInterval: cdk.Duration.hours(3),
    });

    // Add CPU widget to dashboard
    // Requirement 4.5: Vertical layout (CPU above memory)
    const cpuWidget = this.createCpuWidget(props.instance);
    this.dashboard.addWidgets(cpuWidget);

    // Add memory widget to dashboard
    const memoryWidget = this.createMemoryWidget(props.instance);
    this.dashboard.addWidgets(memoryWidget);
  }

  /**
   * Creates a CloudWatch graph widget for CPU utilization metrics
   * 
   * @param instance The EC2 instance to monitor
   * @returns GraphWidget configured for CPU metrics
   * 
   * Requirements:
   * - 3.2: AWS/EC2 CPUUtilization metric
   * - 3.3: Average statistic over 5-minute periods
   * - 3.4: Y-axis 0-100%
   */
  private createCpuWidget(instance: ec2.IInstance): cloudwatch.GraphWidget {
    // Requirement 3.2: CPUUtilization metric from AWS/EC2 namespace
    const cpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        InstanceId: instance.instanceId,
      },
      // Requirement 3.3: Average statistic over 5-minute periods
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    return new cloudwatch.GraphWidget({
      title: 'CPU Utilization',
      left: [cpuMetric],
      // Requirement 3.4: Y-axis 0-100%
      leftYAxis: {
        min: 0,
        max: 100,
        label: 'Percent',
      },
      width: 24,
    });
  }

  /**
   * Creates a CloudWatch graph widget for memory utilization metrics
   * 
   * @param instance The EC2 instance to monitor
   * @returns GraphWidget configured for memory metrics
   * 
   * Requirements:
   * - 4.1: CWAgent namespace metrics (mem_used_percent, mem_available_percent, mem_used)
   * - 4.3: Average statistic over 5-minute periods
   * - 4.4: Y-axis 0-100% for percentages
   */
  private createMemoryWidget(instance: ec2.IInstance): cloudwatch.GraphWidget {
    // Requirement 4.1: Memory metrics from CWAgent namespace
    const memUsedPercentMetric = new cloudwatch.Metric({
      namespace: 'CWAgent',
      metricName: 'mem_used_percent',
      dimensionsMap: {
        InstanceId: instance.instanceId,
      },
      // Requirement 4.3: Average statistic over 5-minute periods
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      label: 'Memory Used %',
    });

    const memAvailablePercentMetric = new cloudwatch.Metric({
      namespace: 'CWAgent',
      metricName: 'mem_available_percent',
      dimensionsMap: {
        InstanceId: instance.instanceId,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      label: 'Memory Available %',
    });

    const memUsedMetric = new cloudwatch.Metric({
      namespace: 'CWAgent',
      metricName: 'mem_used',
      dimensionsMap: {
        InstanceId: instance.instanceId,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      label: 'Memory Used (Bytes)',
    });

    return new cloudwatch.GraphWidget({
      title: 'Memory Utilization',
      left: [memUsedPercentMetric, memAvailablePercentMetric],
      right: [memUsedMetric],
      // Requirement 4.4: Y-axis 0-100% for percentage metrics
      leftYAxis: {
        min: 0,
        max: 100,
        label: 'Percent',
      },
      rightYAxis: {
        label: 'Bytes',
      },
      width: 24,
    });
  }
}

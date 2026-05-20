#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EC2MonitoringStack } from '../lib/topics/05-ec2-monitoring-stack';

// CDK entry point — imports all stacks

const app = new cdk.App();

// Add stack imports here

// EC2 Monitoring Stack - Requirements 5.6, 8.1, 8.4
new EC2MonitoringStack(app, 'EC2MonitoringStack');

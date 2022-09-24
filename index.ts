import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { local } from "@pulumi/command";
import * as fs from 'fs';

const config = new pulumi.Config();
//const buketName = config.require("bucketName");

//const clusterName = "myfirstcluster.k8s.local";
const clusterName = config.require("clusterName");
//const kopsStatePrefix = "gr34weergds-kops-state";
const kopsStatePrefix = config.require("kopsStatePrefix");
const kopsStateStore = `s3://${kopsStatePrefix}`;
//const awsRegionAzs = "us-east-1a";
const awsRegionAzs = config.require("awsRegionAzs");
//const kubernetesVersion = "v1.21.1";
const kubernetesVersion = config.require("kubernetesVersion");
//const masterSize = "t3.medium";
const masterSize = config.require("masterSize");
//const masterCount = 1;
const masterCount = config.require("masterCount");
//const nodeSize = "t3.medium";
const nodeSize = config.require("nodeSize");
//const nodeCount = 2;
const nodeCount = config.require("nodeCount");
//export AWS_REGION=us-east-1
const awsRegion = config.require("awsRegion");

// set KOPS_STATE_STORE = kopsStateStore
const newEnvironment = {
    KOPS_STATE_STORE: kopsStateStore,
};


// Create an AWS resource (S3 Bucket) named kopsStatePrefix
const bucket = new aws.s3.Bucket("kops-state-store", {
    bucket: kopsStatePrefix,
    acl: "private",
    versioning: {
        enabled: true,
    },
    forceDestroy: true,
});


//Create cluster
const createCommand = `kops create cluster --name ${clusterName} --state ${kopsStateStore} --cloud aws --master-size ${masterSize} --master-count ${masterCount} --master-zones ${awsRegionAzs} --zones ${awsRegionAzs} --node-size ${nodeSize} --node-count ${nodeCount} --dns private --kubernetes-version ${kubernetesVersion}`;

const deleteCommand = `kops delete cluster --name ${clusterName} --state ${kopsStateStore} --yes`;
let kopsCreateCluster = new local.Command(`kops create cluster`, {
    create: createCommand,
    delete: deleteCommand,
    environment: newEnvironment
}, { dependsOn: [bucket] });

//Kops update cluster
const updateCommand = `kops update cluster ${clusterName} --yes`;
let kopsUpdateCluster = new local.Command(`kops update cluster`, {
    create: updateCommand,
    environment: newEnvironment
}, { dependsOn: [kopsCreateCluster] });

//Kops export kubecfg
const exportCommand = `kops export kubecfg --admin`;
let kopsExportKubecfg = new local.Command(`kops export kubecfg`, {
    create: exportCommand,
    environment: newEnvironment
}, { dependsOn: [kopsUpdateCluster] });

//Kops validate cluster
const validateCommand = `kops validate cluster --wait 10m`;
let kopsValidateCluster = new local.Command(`kops validate cluster`, {
    create: validateCommand,
    environment: newEnvironment
}, { dependsOn: [kopsExportKubecfg] });

//get all security groups in the region
const getSecurityGroupsCommand = `aws ec2 describe-security-groups --region ${awsRegion} --query 'SecurityGroups[*].{Name:GroupName,ID:GroupId}' --output json > security_groups.json`;
let securityGroups = new local.Command(`get security groups`, {
    create: getSecurityGroupsCommand,
    environment: newEnvironment
}, { dependsOn: [kopsValidateCluster] });


function getSecurityGroupsId(securityGroups: any) {
    let securityGroupsJson = JSON.parse(fs.readFileSync('./securityGroups.json', 'utf8'));
    let securityGroup = securityGroupsJson.find((securityGroup: any) => securityGroup.Name === `nodes.${clusterName}`);
    return securityGroup.ID;
}

// open port 80 for securityGroupId
const openPort80 = new aws.ec2.SecurityGroupRule("open-port-80", {
    type: "ingress",
    fromPort: 80,
    toPort: 80,
    protocol: "tcp",
    cidrBlocks: ["0.0.0.0/0"],
    securityGroupId: getSecurityGroupsId(securityGroups),
}, { dependsOn: [securityGroups] });


// open port 443 for securityGroupId
const openPort443 = new aws.ec2.SecurityGroupRule("open-port-443", {
    type: "ingress",
    fromPort: 443,
    toPort: 443,
    protocol: "tcp",
    cidrBlocks: ["0.0.0.0/0"],
    securityGroupId: getSecurityGroupsId(securityGroups),
}, { dependsOn: [openPort80] });


//export const accessKey




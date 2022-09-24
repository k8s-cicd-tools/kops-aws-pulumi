## Kops Aws Pulumi

This repository shows an example of how to implement in pulumi all the necessary steps to raise a kubernetes cluster in aws, in addition to allowing additional ports to be opened in the aws firewall.

## How to get started

1. Clone this repo.
2. Run `$ npm install`
3. Run `$ pulumi up` to create the kubernetes resources.
4. Run `$ kubectl get pods` or `$ kubectl get all` to see the status of the pods.
5. Check the aws firewall to see that the ports have been opened.
6. Run `$ pulumi destroy` to delete the kubernetes resources.



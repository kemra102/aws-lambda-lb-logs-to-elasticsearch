# aws-lambda-lb-logs-to-elasticsearch

This project provide a Lambda to run in AWS that will take Load Balancer logs written to S3, unpack them (where required), format them nicely and push them into Elasticsearch.

## Building this Project

```sh
npm install
# change zip name as desired
zip -r lambda.zip .
```

## Current Restrictions

- Only works with ALBs.
  - NLB & ELB (Classic) support will be added later.
- Uses the ElasticSearch 6 Client library so MAY not work if you have another version of ElasticSearch.
  - Currently unsure how to ensure this Lambda can support other versions of ElasticSearch easily.

# BreederHQ Infrastructure (CDK)

Infrastructure as Code for deploying BreederHQ to AWS using CDK.

## Architecture

Each environment deploys:

- **Elastic Beanstalk** application and environment (Node.js API)
- **CloudFront distributions** for frontend sites (app, portal, marketplace)
- **IAM roles** for EB instances (S3, Secrets Manager access)
- **S3 bucket policies** granting CloudFront OAC read access to frontend buckets

### What CDK manages

| Resource | Managed by CDK |
|---|---|
| EB application + environment | Yes |
| IAM roles + instance profiles | Yes |
| CloudFront distributions | Yes |
| S3 bucket policies (OAC) | Yes |
| App versions S3 bucket | Yes |
| Frontend S3 buckets | **No** — create manually |
| Assets S3 bucket | **No** — create manually |
| Secrets Manager secrets | **No** — create manually |
| ACM certificates | **No** — create manually |
| DNS records (CNAMEs) | **No** — create manually |

## Prerequisites for a new environment

Before running `cdk deploy` for a new environment (e.g. `alpha`), create these resources manually:

### 1. S3 buckets

Create the following buckets in the target region (`us-east-2`):

- `breederhq-fe-{env}` — main frontend app
- `breederhq-fe-portal-{env}` — portal frontend
- `breederhq-fe-marketplace-{env}` — marketplace frontend
- `breederhq-assets-{env}` — user-uploaded media (animal photos, documents)

### 2. Secrets Manager

Create a secret named `breederhq/{env}` (or as configured in `AWS_SECRET_NAME` in `env.ts`) containing sensitive values like database credentials, API keys, etc.

### 3. ACM certificate

A wildcard certificate for `*.breederhq.com` must exist in **us-east-1** (required by CloudFront). The current certificate ARN is configured in `bin/app.ts`.

This SHOULD be covered by the single certificate that already exists as of 7-Mar-2026.

### 4. DNS (after CDK deploy)

After deploying, the CDK outputs will show the CloudFront domain names. Create CNAME records pointing:

- `{env}.breederhq.com` -> main distribution domain
- `portal-{env}.breederhq.com` -> portal distribution domain
- `marketplace-{env}.breederhq.com` -> marketplace distribution domain

## Configuration

### Environment variables (`bin/env.ts`)

Non-sensitive environment variables are defined per environment in `bin/env.ts`. `CDN_DOMAIN` is the single source of truth — `APP_URL` and `ALLOWED_ORIGINS` are automatically derived from it in the stack (see comments in `env.ts`).

### Stack configuration (`bin/app.ts`)

Each environment is defined as an `ElasticBeanstalkStack` with properties like instance type, CloudFront settings, and additional frontends. See the `bhq-dev` stack for a complete example.

### Additional frontends

The `additionalFrontends` prop accepts an array of names (e.g. `['portal', 'marketplace']`). For each entry, CDK creates:

- A CloudFront distribution using bucket `breederhq-fe-{name}-{env}`
- Custom domain alias `{name}-{env}.breederhq.com`
- A bucket policy allowing CloudFront OAC read access
- `/api/*` path routed to the EB environment

## Deployment
This step is to deploy the CloudFormation stack, and to build the infrastructure for a given environment (with the exception of the manually built items listed above). It builds:

* Elastic Beanstalk
* Cloud Front distributions connected to the appropriate domain name

```bash
# Install dependencies
npm install

# Deploy a specific environment
npm run deploy:dev
npm run deploy:bravo

# Preview changes
cdk diff bhq-dev

# Deploy all environments
cdk deploy --all
```

### Deploying application front-end code to S3
You need to update the variables in breederhq/deploy-1.yml with the appropriate AWS Account ID, and the various CloudFront Distribution IDs after deploying the CDK. 

### Deploying application code to EB

Application code is deployed separately via the EB CLI or GitHub Actions:

```bash
# From the breederhq-api directory
npm run deploy:dev
```

This builds the TypeScript project locally and deploys the pre-built package to EB. The `.ebignore` file controls what gets included in the deployment package.

## Accounts

| Environment | AWS Account | Region |
|---|---|---|
| dev, alpha, bravo | 335274136775 | us-east-2 |
| production | 427814061976 | us-east-2 |

##IAM

Note that you may need to adjust the "Trust Relationships" on the "BreederHQ-GitHub-Actions" role in IAM. This is referenced in the "Configure AWS credentials" in the deploy scripts in GitHub Actions.

## Cleanup

```bash
# Destroy a specific stack
cdk destroy bhq-dev

# Destroy all stacks
cdk destroy --all
```

Note: S3 buckets, Secrets Manager secrets, and ACM certificates created manually will need to be deleted separately.

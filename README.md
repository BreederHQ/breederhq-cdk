# BreederHQ Infrastructure (CDK)

Infrastructure as Code for deploying BreederHQ to AWS using CDK.

## Architecture

The infrastructure uses a **shared EB application** model:

- One `breederhq-api` Elastic Beanstalk application per AWS account (created by the `bhq-app` / `bhq-app-prod` stack)
- Multiple environments under that application (`breederhq-api-dev`, `breederhq-api-bravo`, etc.)
- Each environment gets its own CloudFront distributions, IAM roles, and S3 bucket policies

### Stacks

| Stack | What it creates |
|---|---|
| `bhq-app` | Shared EB application (non-prod account) |
| `bhq-app-prod` | Shared EB application (prod account) |
| `bhq-dev` | Dev environment + CloudFront distributions |
| `bhq-alpha` | Alpha environment + CloudFront distributions |
| `bhq-bravo` | Bravo environment + CloudFront distributions |
| `bhq-prod-blue` | Production blue environment (HA, load-balanced) |
| `bhq-prod-green` | Production green environment (HA, load-balanced) |

Environment stacks depend on the shared app stack — CDK deploys them in the right order automatically.

### What CDK manages

| Resource | Managed by CDK |
|---|---|
| EB application (shared) | Yes |
| EB environments | Yes |
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

Generally, the permissions on the bucket should look like this. This permission block allows access from all CloudFront distributions, but you can also limit it to the specific distribution Arn if you choose.

```{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::breederhq-fe-dev/*",
            "Condition": {
                "ArnLike": {
                    "AWS:SourceArn": "arn:aws:cloudfront::335274136775:distribution/*"
                }
            }
        }
    ]
}
```


### 2. Secrets Manager

Create a secret named `breederhq/{env}` (or as configured in `AWS_SECRET_NAME` in `env.ts`) containing sensitive values like database credentials, API keys, etc.

### 3. ACM certificate

A wildcard certificate for `*.breederhq.com` must exist in **us-east-1** (required by CloudFront). The current certificate ARN is configured in `bin/app.ts`.

### 4. DNS (after CDK deploy)

After deploying, the CDK outputs will show the CloudFront domain names. Create CNAME records pointing:

- `app-{env}.breederhq.com` -> main distribution domain
- `portal-{env}.breederhq.com` -> portal distribution domain
- `marketplace-{env}.breederhq.com` -> marketplace distribution domain

## Configuration

### Environment variables (`bin/env.ts`)

Non-sensitive environment variables are defined per environment in `bin/env.ts`. `CDN_DOMAIN` is the single source of truth — `APP_URL` and `ALLOWED_ORIGINS` are automatically derived from it in the stack.

### Stack configuration (`bin/app.ts`)

Each environment is defined as an `ElasticBeanstalkStack` with properties like instance type, CloudFront settings, and additional frontends. See the `bhq-dev` stack for a complete example.

### Additional frontends

The `additionalFrontends` prop accepts an array of names (e.g. `['portal', 'marketplace']`). For each entry, CDK creates:

- A CloudFront distribution using bucket `breederhq-fe-{name}-{env}`
- Custom domain alias `{name}-{env}.breederhq.com`
- A bucket policy allowing CloudFront OAC read access
- `/api/*` path routed to the EB environment

## Deployment

### First-time setup (shared application)

The shared EB application must be deployed before any environments:

```bash
# Non-prod account
npm run deploy:app

# Prod account (requires prod profile)
cdk deploy bhq-app-prod --profile bhq-prod
```

This only needs to be done once per account.

### Deploying a new environment

Follow these steps in order (using `bravo` as an example):

#### 1. Create prerequisite resources manually

- S3 buckets: `breederhq-fe-bravo`, `breederhq-fe-portal-bravo`, `breederhq-fe-marketplace-bravo`, `breederhq-assets-bravo`
- Secrets Manager secret: `breederhq/bravo`
- ACM certificate (the existing `*.breederhq.com` cert covers all environments)

#### 2. Deploy infrastructure with CDK

```bash
npm run deploy:bravo
```

This creates the EB environment, CloudFront distributions, IAM roles, and bucket policies under the shared `breederhq-api` application.

#### 3. Deploy API code to Elastic Beanstalk

From the `breederhq-api` directory:

```bash
eb deploy breederhq-api-bravo
```

Or via GitHub Actions by pushing to the `bravo` branch.

#### 4. Deploy frontend code to S3

Push to the `bravo` branch to trigger the GitHub Actions workflows, which build and upload to the S3 buckets. Update the CloudFront distribution IDs in `breederhq/.github/workflows/deploy-1.yml` after initial CDK deploy.

#### 5. Set up DNS

Using the CloudFront domain names from the CDK outputs, create CNAME records:

- `app-bravo.breederhq.com` -> main distribution domain
- `portal-bravo.breederhq.com` -> portal distribution domain
- `marketplace-bravo.breederhq.com` -> marketplace distribution domain

## CDK commands

```bash
# Install dependencies
npm install

# Deploy shared app (first time only)
npm run deploy:app

# Deploy a specific environment
npm run deploy:dev
npm run deploy:bravo

# Preview changes
cdk diff bhq-dev --profile bhq-nonprod

# Deploy all non-prod (respects dependency ordering)
cdk deploy bhq-app bhq-dev bhq-alpha bhq-bravo --profile bhq-nonprod
```

## Accounts

| Environment | AWS Account | AWS Profile | Region |
|---|---|---|---|
| dev, alpha, bravo | 335274136775 | `bhq-nonprod` | us-east-2 |
| production | 427814061976 | `bhq-prod` | us-east-2 |

## IAM

Note that you may need to adjust the "Trust Relationships" on the `BreederHQ-GitHub-Actions` role in IAM. This is referenced in the "Configure AWS credentials" step in the GitHub Actions deploy workflows.

## Cleanup

```bash
# Destroy a specific environment stack
cdk destroy bhq-dev --profile bhq-nonprod

# Destroy the shared app (after all environments are destroyed)
cdk destroy bhq-app --profile bhq-nonprod
```

**Important**: When destroying and recreating environments, you must remove DNS CNAME records pointing to old CloudFront distributions before deploying new ones, otherwise CloudFront will reject the alias.

Note: S3 buckets, Secrets Manager secrets, and ACM certificates created manually will need to be deleted separately.

export const AWS_REGION = 'us-east-2';

// AWS_SECRET_NAME is an OPTIONAL variable that specifies the name of the AWS Secrets Manager secret to use for storing
// sensitive environment variables.
// If not provided, the application will try to load secrets based on the environment name (e.g., breederhq/dev for the dev environment).

// CDN_DOMAIN is the single source of truth for the deployment domain.
// The following variables are automatically derived from it in elastic-beanstalk-stack.ts and do not need to be set here:
//   APP_URL         → https://${CDN_DOMAIN}
//   ALLOWED_ORIGINS → https://${CDN_DOMAIN}
// To override any of these, add them explicitly to the env config below.

export const devEnvConfig = {
	PORT: '8080',
	NODE_ENV: 'dev',
	AWS_SECRET_NAME: 'breederhq/dev-prototype',
	LOG_LEVEL: 'debug',
	AWS_REGION: AWS_REGION,
	RESEND_FROM_EMAIL: 'noreply@mail.breederhq.com',
	RESEND_FROM_NAME: 'BreederHQ (Dev)',
	EMAIL_DEV_REDIRECT: 'dev@breederhq.com',
	RESEND_INBOUND_DOMAIN: 'mail.breederhq.com',
	MARKETPLACE_PUBLIC_ENABLED: 'true',
	USE_SECRETS_MANAGER: 'true',
	CDN_DOMAIN: 'app-dev.breederhq.com',
};

export const alphaEnvConfig = {
	PORT: '8080',
	NODE_ENV: 'alpha',
	AWS_SECRET_NAME: 'breederhq/alpha',
	LOG_LEVEL: 'info',
	AWS_REGION: AWS_REGION,
	RESEND_FROM_EMAIL: 'noreply@mail.breederhq.com',
	RESEND_FROM_NAME: 'BreederHQ (Alpha)',
	EMAIL_DEV_REDIRECT: 'alpha@breederhq.com',
	RESEND_INBOUND_DOMAIN: 'mail.breederhq.com',
	MARKETPLACE_PUBLIC_ENABLED: 'true',
	USE_SECRETS_MANAGER: 'true',
	CDN_DOMAIN: 'app-alpha.breederhq.com',
};

export const bravoEnvConfig = {
	PORT: '8080',
	NODE_ENV: 'bravo',
	AWS_SECRET_NAME: 'breederhq/bravo',
	LOG_LEVEL: 'info',
	AWS_REGION: AWS_REGION,
	RESEND_FROM_EMAIL: 'noreply@mail.breederhq.com',
	RESEND_FROM_NAME: 'BreederHQ (Bravo)',
	EMAIL_DEV_REDIRECT: 'bravo@breederhq.com',
	RESEND_INBOUND_DOMAIN: 'mail.breederhq.com',
	MARKETPLACE_PUBLIC_ENABLED: 'true',
	USE_SECRETS_MANAGER: 'true',
	CDN_DOMAIN: 'app-bravo.breederhq.com',
};

export const prodEnvConfig = {
	PORT: '8080',
	NODE_ENV: 'production',
	LOG_LEVEL: 'warn',
	AWS_REGION: AWS_REGION,
	AWS_SECRET_NAME: 'breederhq/prod-prototype',
	USE_SECRETS_MANAGER: 'true',
	CDN_DOMAIN: 'breederhq.com',
	// APP_URL and ALLOWED_ORIGINS are normally derived from CDN_DOMAIN, but prod
	// has three separate frontend origins so we set ALLOWED_ORIGINS explicitly.
	APP_URL: 'https://breederhq.com',
	ALLOWED_ORIGINS: 'https://breederhq.com,https://www.breederhq.com,https://portal.breederhq.com,https://marketplace.breederhq.com',
	RESEND_FROM_EMAIL: 'noreply@mail.breederhq.com',
	RESEND_FROM_NAME: 'BreederHQ',
	RESEND_INBOUND_DOMAIN: 'mail.breederhq.com',
	MARKETPLACE_PUBLIC_ENABLED: 'true',
};

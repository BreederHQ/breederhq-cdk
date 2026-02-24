export const AWS_REGION = 'us-east-2';

const getBucketName = (pEnv: string) => {
	return `breederhq-assets-${ pEnv }`
}


// AWS_SECRET_NAME is an OPTIONAL variable that specifies the name of the AWS Secrets Manager secret to use for storing 
// sensitive environment variables. 
// If not provided, the application will try to load secrets based on the environment name (e.g., breederhq/dev for the dev environment).

export const devEnvConfig = {
	NODE_ENV: 'dev',
	AWS_SECRET_NAME: 'breederhq/dev-prototype',
	LOG_LEVEL: 'debug',
	AWS_REGION: AWS_REGION,
	S3_BUCKET: getBucketName('dev'),
	RESEND_FROM_EMAIL: 'noreply@mail.breederhq.com',
	RESEND_FROM_NAME: 'BreederHQ (Dev)',
	EMAIL_DEV_REDIRECT: 'dev@breederhq.com',
	RESEND_INBOUND_DOMAIN: 'mail.breederhq.com',
	MARKETPLACE_PUBLIC_ENABLED: 'true',
	USE_SECRETS_MANAGER: 'true',
	APP_URL: 'https://dev.breederhq.com',
	ALLOWED_ORIGINS: 'https://dev.breederhq.com',
};

export const alphaEnvConfig = {
	NODE_ENV: 'alpha',
	LOG_LEVEL: 'info',
	AWS_REGION: AWS_REGION,
	S3_BUCKET: getBucketName('alpha'),
	RESEND_FROM_EMAIL: 'noreply@mail.breederhq.com',
	RESEND_FROM_NAME: 'BreederHQ (Alpha)',
	EMAIL_DEV_REDIRECT: 'alpha@breederhq.com',
	RESEND_INBOUND_DOMAIN: 'mail.breederhq.com',
	APP_URL: 'https://alpha.breederhq.com',
	MARKETPLACE_PUBLIC_ENABLED: 'true',
};

export const betaEnvConfig = {
	NODE_ENV: 'beta',
	LOG_LEVEL: 'info',
	AWS_REGION: AWS_REGION,
	S3_BUCKET: getBucketName('beta'),
};

export const prodEnvConfig = {
	NODE_ENV: 'production',
	LOG_LEVEL: 'warn',
	AWS_REGION: AWS_REGION,
	S3_BUCKET: getBucketName('prod'),
};

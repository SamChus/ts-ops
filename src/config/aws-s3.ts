import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET } =
  process.env;

if (
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !AWS_REGION ||
  !AWS_BUCKET
) {
  throw new Error("Missing required AWS environment variables");
}

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

export const s3 = new AWS.S3();
export const bucketName = AWS_BUCKET; // guaranteed string

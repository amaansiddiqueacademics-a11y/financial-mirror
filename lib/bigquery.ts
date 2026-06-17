import { BigQuery } from '@google-cloud/bigquery';
import path from 'node:path';

let client: BigQuery | undefined;

export function getBigQueryClient(): BigQuery {
  if (!client) {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const keyFilename = credentialsPath
      ? path.resolve(process.cwd(), credentialsPath.replace(/^\.\//, ''))
      : undefined;

    client = new BigQuery({
      projectId: process.env.GCP_PROJECT_ID,
      ...(keyFilename ? { keyFilename } : {}),
    });
  }

  return client;
}

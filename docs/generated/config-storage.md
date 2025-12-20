| Key | Type | Notes |
| --- | ---- | ----- |
| `STORAGE_DRIVER` | `string` | The storage driver to use  (default: `local`) |
| `LOCAL_STORAGE_DIR` | `string` | The directory to store files in when using local storage [when STORAGE_DRIVER is {"override":true} \| "local" → then default=undefined] |
| `S3_REGION` | `string` | The AWS region for the S3 bucket [when STORAGE_DRIVER is {"override":true} \| "s3" → then required] |
| `S3_BUCKET` | `string` | The name of the S3 bucket [when STORAGE_DRIVER is {"override":true} \| "s3" → then required] |
| `S3_ACCESS_KEY_ID` | `string` | The access key ID for the S3 bucket [when STORAGE_DRIVER is {"override":true} \| "s3" → then required] |
| `S3_SECRET_ACCESS_KEY` | `string` | The secret access key for the S3 bucket [when STORAGE_DRIVER is {"override":true} \| "s3" → then required] |
| `S3_ENDPOINT` | `string` | The endpoint URL for the S3 service (for S3-compatible services) [when STORAGE_DRIVER is {"override":true} \| "s3"] |
| `S3_FORCE_PATH_STYLE` | `boolean` | Whether to force path-style URLs for S3 [when STORAGE_DRIVER is {"override":true} \| "s3" → then default=false] |
| `S3_PUBLIC_BASE_URL` | `string` | The public base URL for the S3 bucket [when STORAGE_DRIVER is {"override":true} \| "s3" → then required] |

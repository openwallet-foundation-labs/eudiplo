# File Storage

This service supports flexible file storage options, allowing you to choose between local disk storage and Amazon S3-compatible object storage. The storage backend is fully configurable via environment variables.

> 💡 Storage configuration is dynamic and can be switched between local and S3 by setting the appropriate environment variables.

## Configuration

--8<-- "docs/generated/config-storage.md"

---

## Local Storage (Default)

When `STORAGE_DRIVER=local`, files are stored on the local filesystem in the directory specified by `LOCAL_STORAGE_DIR`. This is ideal for:

- Development
- Testing
- Simple deployments

No external storage service is required.

---

## Amazon S3 / S3-Compatible Storage

To use S3 or a compatible service (e.g., MinIO), set the following environment variables:

```env
STORAGE_DRIVER=s3
S3_REGION=your-region
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_BASE_URL=https://your-bucket.s3.amazonaws.com/
# Optional for custom endpoints:
S3_ENDPOINT=https://minio.example.com
S3_FORCE_PATH_STYLE=true
```

This mode is suitable for:

- Production deployments
- Scalable storage needs
- Cloud-native architectures

Ensure your S3 bucket is accessible and properly configured.

---

## Extensibility

The storage system is designed to be extensible. You can add support for other storage backends by implementing the `FileStorage` interface and registering your adapter.

To add a new backend:

- Implement a new adapter class (see `LocalFileStorage` and `S3FileStorage` for examples)
- Register your adapter in the storage module
- Add configuration options as needed

Contact us if you need help integrating additional storage providers.

---

## Accessibility

Files can be uploaded via the `/storage` endpoint, an access token is required to protect this endpoint and to associate files with the correct tenant. You can also use the Web Client to upload the images or logos for the issuer metadata or for the credential configuration.

When using the `local` storage driver, files are served via `/storage/<file-id>`. In case of S3, files are served via the S3 public base URL without an expiration date.

> TODO: we may add an expiration date for S3 URLs in the future since the issuer metadata are not long lived and just session based.

---

## Multi-Tenant Storage

EUDIPLO supports multi-tenancy for file storage. Files are associated with a `tenantId` to ensure data isolation between tenants.

### Tenant Isolation in Storage

Files are stored with metadata indicating the owning tenant. All file operations are scoped by `tenantId`:

#### File Entity Example

```typescript
@Entity()
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  tenantId: string; // Tenant ID for multi-tenancy support

  // ... other fields
}
```

### Storage Operations

All file service operations filter by `tenantId`:

```typescript
// Example: List files for a tenant
return this.fileRepository.findBy({ tenantId });

// Example: Save file for a tenant
file.tenantId = tenantId;
return this.fileRepository.save(file);
```

---

## Summary

- Choose between local and S3 storage via environment variables
- Easily extend to other storage backends
- Multi-tenant support ensures data isolation
- Configuration is dynamic and environment-driven

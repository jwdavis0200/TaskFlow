# Firebase Storage CORS Configuration

This folder contains CORS configuration files for different environments and instructions for applying them to Firebase Storage buckets.

## What is CORS?

CORS (Cross-Origin Resource Sharing) allows web applications hosted on different domains to access Firebase Storage buckets. Without proper CORS configuration, file uploads/downloads from your frontend will be blocked by the browser.

## Configuration Files

- `production.json` - CORS for production deployment
- `development.json` - CORS for local development and staging
- `emulator.json` - CORS for Firebase emulator (if needed)

## How to Apply CORS

### Prerequisites
1. Install Google Cloud SDK: `brew install google-cloud-sdk`
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project <PROJECT_ID>`

### Apply CORS Configuration

```bash
# For production bucket
gsutil cors set cors/production.json gs://taskflow-production.firebasestorage.app

# For development bucket (if you have one)
gsutil cors set cors/development.json gs://your-dev-bucket.firebasestorage.app
```

### Verify CORS is Applied

```bash
# Check current CORS configuration
gsutil cors get gs://taskflow-production.firebasestorage.app
```

### Common Commands

```bash
# Remove CORS (reset to default)
gsutil cors set /dev/null gs://bucket-name

# View current CORS
gsutil cors get gs://bucket-name

# Apply new CORS
gsutil cors set cors-file.json gs://bucket-name
```

## Environment-Specific Instructions

### Production
- **Bucket**: `taskflow-production.firebasestorage.app`
- **File**: `production.json`
- **Domains**: Only production Vercel domain
- **Security**: Restrictive, HTTPS only

### Development
- **Bucket**: Your development bucket
- **File**: `development.json` 
- **Domains**: Localhost + staging domains
- **Security**: More permissive for testing

## Troubleshooting

### CORS Error Still Occurring?
1. Wait 5-10 minutes for changes to propagate
2. Clear browser cache
3. Verify CORS was applied: `gsutil cors get gs://bucket-name`
4. Check exact domain spelling in CORS vs your app

### Permission Denied?
```bash
# Re-authenticate
gcloud auth login

# Check current project
gcloud config get-value project

# Set correct project
gcloud config set project taskflow-production
```

### File Not Found Error?
Make sure you're running the command from the `backend-firebase` directory:
```bash
cd /path/to/TaskFlow/backend-firebase
gsutil cors set cors/production.json gs://bucket-name
```

## Security Notes

- ⚠️ Never use wildcards (`*`) in production origins
- ✅ Always use HTTPS origins for production
- ✅ Only include origins you actually need
- ✅ Regularly review and update CORS policies
- ✅ Use specific domains instead of broad wildcards

## When to Update CORS

- Adding new frontend domains
- Changing deployment URLs
- Adding development/staging environments
- Security audits requiring origin restrictions

## Related Documentation

- [Google Cloud Storage CORS](https://cloud.google.com/storage/docs/configuring-cors)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
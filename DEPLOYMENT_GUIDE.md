# Production Deployment Guide - File Storage

## Current Production Setup

Files are stored on **ImageKit** cloud storage:

### How It Works

1. **Upload**: When a teacher creates an assignment or student submits work, Multer memory storage holds the file in memory
2. **Cloud Upload**: The file buffer is uploaded directly to ImageKit via `uploadToImageKit()` helper
3. **Storage**: Files stored in ImageKit cloud with unique filenames in `/virtual-classroom/assignments/` or `/virtual-classroom/submissions/`
4. **Access**: Frontend accesses via ImageKit CDN URLs (e.g., `https://ik.imagekit.io/your-team/virtual-classroom/assignments/file.pdf`)

### ImageKit Configuration

**Backend config** (`Backend/config/imagekit.js`):
```javascript
const ImageKit = require('@imagekit/nodejs');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
```

**Environment variables** (`Backend/.env`):
```
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-team
```

### Upload Flow

**Assignments** (`Backend/controllers/assignmentController.js`):
```javascript
const uploadResult = await uploadToImageKit(file, 'assignments');
assignment.fileUrl = uploadResult.url;
assignment.fileURL = uploadResult.url;
assignment.imagekitFileId = uploadResult.fileId;
```

**Submissions** (`Backend/controllers/submissionController.js`):
```javascript
const uploadResult = await uploadToImageKit(file, 'submissions');
submission.fileUrl = uploadResult.url;
submission.solutionFileURL = uploadResult.url;
submission.imagekitFileId = uploadResult.fileId;
```

### File Access

Files are accessed directly from ImageKit URLs - no local file serving needed. The `getDirectFileUrl()` helper in `frontend/src/utils/fileUrl.js` validates URLs are proper HTTP URLs.

---

## Environment Setup

### Required Environment Variables

```bash
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-team-id
```

### Getting ImageKit Credentials

1. Sign up at [imagekit.io](https://imagekit.io/)
2. Go to Settings → API & Keys
3. Copy Public Key, Private Key, and URL Endpoint
4. Add to your `.env` file and deployment environment

---

## Deployment Checklist

### Pre-Deployment

- [ ] ImageKit account created and configured
- [ ] Environment variables set in deployment platform
- [ ] Test file upload locally with ImageKit
- [ ] Verify file URLs are accessible

### Testing

```bash
# Test assignment upload
curl -X POST http://localhost:4000/assignment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Assignment" \
  -F "classroomId=YOUR_CLASSROOM_ID" \
  -F "file=@/path/to/test.pdf"

# Verify response contains ImageKit URL
# Expected: "fileUrl": "https://ik.imagekit.io/..."
```

### Post-Deployment

- [ ] Assignment upload works
- [ ] Student submission works
- [ ] File URLs are accessible in browser
- [ ] AI grading can fetch files from ImageKit URLs

---

## Troubleshooting

### "ImageKit not configured" Error

Ensure all three environment variables are set:
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`

### File Upload Fails

Check:
1. File size is within ImageKit limits (default 5MB for free tier)
2. File format is allowed (PDF, images, etc.)
3. Network connectivity to ImageKit API

### File URL Returns 404

Verify:
1. The URL in database matches ImageKit URL format
2. File wasn't accidentally deleted from ImageKit dashboard
3. URL endpoint is correct in environment

---

## Summary

| Question | Answer |
|----------|--------|
| **Where are files stored?** | ImageKit cloud storage |
| **Do files persist?** | Yes, indefinitely |
| **CDN included?** | Yes, ImageKit provides global CDN |
| **Cost?** | Free tier: 20GB storage, 20GB bandwidth/month |
| **Migration needed?** | No - ImageKit is already configured |

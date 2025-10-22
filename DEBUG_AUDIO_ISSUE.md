# Debug Guide: Audio Playback & Download Issues

## Summary of Changes Made

### Backend Enhancements (`server.py`)
1. ✅ Added logging when creating tracks with blob names
2. ✅ Added detailed logging in `/tracks/{id}/stream` endpoint
3. ✅ Added detailed logging in `/tracks/{id}/download/{type}` endpoint

## Step-by-Step Debugging Process

### Step 1: Deploy Backend Changes

```bash
cd /home/palli/Moon-Music-Library
git add backend/server.py
git commit -m "Add comprehensive logging for audio streaming and downloads"
git push

# Restart backend
# (Use your actual restart command - docker, systemctl, or manual)
```

### Step 2: Test Upload a New Track

1. **Login to the application**
2. **Click "Add Track"**
3. **Fill in all required fields**
4. **Upload files:**
   - MP3 audio file (required)
   - Lyrics file (optional - txt, pdf, doc)
   - Session file (optional - zip, rar)
   - Singer agreement (optional - any file type)
   - Music Director agreement (optional - any file type)
5. **Click Submit**

### Step 3: Check Backend Logs

Look for these log entries:

```
INFO: Creating track 'YourTrackName' for user xxx
INFO: Received blob names: mp3=audio/uuid_file.mp3, lyrics=lyrics/uuid_file.txt, session=...
INFO: Received files: mp3=False, lyrics=False, session=False
INFO: Track created with blob names: mp3=audio/uuid_file.mp3, lyrics=lyrics/uuid_file.txt
INFO: Track saved to database with ID: xxx
```

**✅ GOOD:** If you see blob names filled in
**❌ BAD:** If you see `mp3=None` - blob names not being sent from frontend

### Step 4: Click on the Track

Watch the backend logs for:

```
INFO: Stream request for track xxx from user xxx
INFO: Track xxx mp3_blob_name: audio/uuid_file.mp3
INFO: Generating signed URL for blob: audio/uuid_file.mp3
INFO: Generated signed URL successfully for audio/uuid_file.mp3
```

**✅ GOOD:** If you see "Generated signed URL successfully"
**❌ BAD:** If you see error messages

### Step 5: Check Browser Console

Open DevTools (F12) → Console tab

**Look for:**
- Network requests to `/tracks/{id}/stream`
- Status codes (should be 200 or 307 redirect)
- Any CORS errors
- Audio element errors

### Step 6: Check Network Tab

1. **Click on the track**
2. **Open DevTools → Network tab**
3. **Look for request to `/tracks/{id}/stream`**

**Expected flow:**
```
1. GET /api/tracks/{id}/stream
   Status: 307 (Redirect)
   Location: https://storage.googleapis.com/...signed URL...

2. GET https://storage.googleapis.com/...
   Status: 200
   Content-Type: audio/mpeg
```

**✅ GOOD:** If both requests succeed
**❌ BAD:** If 404, 403, or 500 errors

### Step 7: Test Download

1. **Click any Download button**
2. **Check Network tab**
3. **Should see:**
   ```
   GET /api/tracks/{id}/download/mp3
   Status: 307 (Redirect)
   ```

Backend logs should show:
```
INFO: Download request for track xxx, file_type=mp3 from user xxx
INFO: Downloading blob: audio/uuid_file.mp3
INFO: Generating signed download URL for audio/uuid_file.mp3 as filename.mp3
INFO: Generated signed download URL successfully
```

## Common Issues & Solutions

### Issue 1: "Audio file not found for this track"

**Cause:** `mp3_blob_name` is NULL in database

**Solution:**
```bash
# Check what's in the database
# Look at backend logs when uploading - are blob names being received?

# If blob names are NULL:
# 1. Frontend is not sending them → Check browser console for upload errors
# 2. Backend is not accepting them → Check backend logs for "Received blob names"
```

### Issue 2: "Could not generate audio stream link"

**Cause:** Service account doesn't have permission to sign URLs

**Backend logs will show:**
```
ERROR: Failed to generate stream URL for blob: audio/xxx
AttributeError: 'NoneType' object has no attribute 'sign_blob'
```

**Solution:**
```bash
# Check environment variables
echo $SIGNING_SERVICE_ACCOUNT_EMAIL
echo $GCS_BUCKET_NAME

# Verify service account has Storage Object Admin role
# Check GCS permissions in Google Cloud Console
```

### Issue 3: 403 Forbidden from GCS

**Cause:** Bucket is not publicly readable, signed URL has wrong permissions

**Solution:**
- Signed URLs should work even with private buckets
- Check service account has `storage.objects.get` permission
- Verify blob exists: `gsutil ls gs://your-bucket/audio/`

### Issue 4: ZIP files not uploading

**Check:**
1. **Content type mapping in frontend** (`UploadTrack.js`)
   ```javascript
   'zip': 'application/zip',
   'rar': 'application/x-rar-compressed',
   ```

2. **Backend allowed content types** (`server.py`)
   ```python
   'sessions': ['application/zip', 'application/x-rar-compressed', ...]
   ```

3. **Browser console** - Look for content type errors

4. **Backend logs** - Check signed URL generation for session files

## Verification Checklist

After deploying changes, test each item:

- [ ] Upload new track with MP3 file
- [ ] Track appears in dashboard
- [ ] Click track to open TrackDetails
- [ ] Audio player appears (not "Not Available")
- [ ] Audio player shows loading state
- [ ] Audio plays when clicking play button
- [ ] Audio waveform visualizer appears
- [ ] Download MP3 button works
- [ ] Upload track with lyrics file
- [ ] Download lyrics button appears and works
- [ ] Upload track with ZIP session file
- [ ] Download session button works
- [ ] Upload track with agreements (image/pdf)
- [ ] Download agreement buttons work

## Quick Test Commands

```bash
# Watch backend logs in real-time
tail -f /path/to/backend.log

# Or if using docker
docker logs -f your-backend-container

# Test signed URL generation directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/tracks/TRACK_ID/stream

# Should return 307 redirect
```

## What to Report

If issues persist, provide:

1. **Backend logs** (the INFO lines from upload, stream, download)
2. **Browser console errors** (screenshots or copy-paste)
3. **Network tab** (the failing request details)
4. **Specific error message** you're seeing

## Expected Working State

### Upload Process:
```
Frontend → Uploads file to GCS using signed URL
Frontend → Gets blob name (audio/uuid_filename.mp3)
Frontend → Sends FormData with blob names to /tracks
Backend → Receives blob names in Form parameters
Backend → Saves track with mp3_blob_name populated
Backend → Returns track object to frontend
```

### Playback Process:
```
User clicks track → TrackDetails loads
TrackDetails checks: track.mp3_blob_name exists?
If yes → Shows audio player
Audio element src="/api/tracks/{id}/stream"
Backend → Receives stream request
Backend → Finds track, gets mp3_blob_name
Backend → Generates GCS signed URL (2 hours)
Backend → Redirects (307) to signed URL
Browser → Fetches from GCS directly
Audio plays! 🎵
```

### Download Process:
```
User clicks Download button
Browser → GET /api/tracks/{id}/download/mp3
Backend → Finds track, gets mp3_blob_name
Backend → Generates signed URL with response-disposition=attachment
Backend → Redirects (307) to signed URL
Browser → Downloads file with correct filename
```

---

**Deploy the backend changes and follow this guide to identify the exact point of failure!**

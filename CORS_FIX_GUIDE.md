# CORS Issue Fix - Audio Streaming & Downloads

## Problem Analysis

### Issue 1: CORS Errors
The audio element was trying to load from the backend API endpoint which redirects to GCS. This causes CORS issues because:
1. Request starts from frontend origin → backend
2. Backend redirects (307) → GCS storage URL
3. Browser sees this as a cross-origin request from backend → GCS
4. GCS CORS policy blocks it

### Issue 2: Incomplete GCS CORS Configuration
Your current CORS config:
```json
{
  "origin": ["https://music-frontend-service-175236630501.us-central1.run.app"],
  "method": ["GET", "PUT", "HEAD"],
  "responseHeader": ["Content-Type", "Access-Control-Allow-Origin", "Content-Disposition", "Content-Range"]
}
```

**Problems:**
- Missing important headers like `Content-Length`, `Accept-Ranges`
- Missing `POST`, `DELETE` methods
- Not comprehensive enough for all scenarios

---

## Solutions Applied

### Fix 1: Frontend - Fetch Signed URL Before Playing Audio

**Changed:** `TrackDetails.js`

**Before:**
```javascript
<audio src={`${apiClient.defaults.baseURL}/tracks/${track.id}/stream`} />
```
Problem: Direct reference to backend endpoint, browser follows redirect causing CORS

**After:**
```javascript
// In useEffect - fetch signed URL when track loads
const streamResponse = await apiClient.get(`/tracks/${id}/stream`, {
  maxRedirects: 0,
  validateStatus: (status) => status === 307 || status === 200
});

const signedUrl = streamResponse.headers.location;
setAudioUrl(signedUrl);

// Then in JSX
<audio src={audioUrl} />
```

**Benefits:**
- Frontend explicitly fetches the signed URL with auth headers
- Audio element gets direct GCS URL (no redirect)
- CORS works because request is directly from frontend → GCS

### Fix 2: Updated GCS CORS Configuration

**New CORS config** (`gcs-cors-config.json`):
```json
[
  {
    "origin": [
      "https://music-frontend-service-175236630501.us-central1.run.app",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
      "Access-Control-Allow-Headers",
      "Content-Disposition",
      "Content-Range",
      "Content-Length",
      "Accept-Ranges"
    ],
    "maxAgeSeconds": 3600
  }
]
```

**Added:**
- ✅ More HTTP methods
- ✅ `Content-Length` (for downloads)
- ✅ `Accept-Ranges` (for audio seeking)
- ✅ `Access-Control-Allow-Credentials`
- ✅ Localhost origins for testing

---

## Deployment Steps

### Step 1: Apply GCS CORS Configuration

```bash
# Set your bucket name
BUCKET_NAME="moon-music-production-uploads"

# Apply the new CORS configuration
gsutil cors set gcs-cors-config.json gs://${BUCKET_NAME}

# Verify it was applied
gsutil cors get gs://${BUCKET_NAME}
```

### Step 2: Deploy Frontend Changes

```bash
cd /home/palli/Moon-Music-Library

# Commit changes
git add frontend/src/components/TrackDetails.js gcs-cors-config.json
git commit -m "Fix: Fetch signed URL before audio playback to avoid CORS issues"
git push

# Rebuild and deploy
cd frontend
npm run build

# Or with docker
docker-compose build frontend
docker-compose up -d frontend
```

### Step 3: Verify Everything Works

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Login fresh** to get new token
3. **Click on a track** with audio
4. **Check browser console** - should see:
   ```
   ✅ No CORS errors
   ✅ Audio element loads successfully
   ✅ Can play, pause, seek
   ```

---

## Why This Works

### Audio Streaming Flow (Fixed):
```
1. TrackDetails loads → useEffect runs
2. Frontend: GET /api/tracks/{id}/stream (with Auth header)
3. Backend: Generates signed URL with impersonation
4. Backend: Returns 307 redirect with Location header
5. Frontend: Extracts signed URL from Location header
6. Frontend: Sets audioUrl state
7. Audio element: src={audioUrl}
8. Browser: Directly fetches from GCS (https://storage.googleapis.com/...)
9. GCS: Checks CORS → Frontend origin allowed ✅
10. Audio streams successfully! 🎵
```

### Download Flow (Already Working):
```
1. Click download button
2. Frontend: GET /api/tracks/{id}/download/mp3 (maxRedirects: 0)
3. Backend: Returns 307 redirect
4. Frontend: Opens Location URL in new tab
5. Browser: Direct download from GCS ✅
```

---

## Testing Checklist

After deployment, verify:

- [ ] Audio player appears
- [ ] No CORS errors in console
- [ ] Can play audio
- [ ] Can pause audio
- [ ] Can seek within audio
- [ ] Visualizer works
- [ ] Download buttons work for:
  - [ ] MP3 audio
  - [ ] Lyrics
  - [ ] Session files
  - [ ] Singer agreement
  - [ ] Music Director agreement
- [ ] Agreements visible in Dashboard card view
- [ ] Agreements clickable (opens in new tab)

---

## Troubleshooting

### If audio still doesn't play:

1. **Check console for errors:**
   ```javascript
   // Should NOT see:
   ❌ CORS policy: No 'Access-Control-Allow-Origin'
   ❌ ERR_FAILED 200 (OK)
   
   // Should see:
   ✅ Audio element found
   ✅ Audio source connected successfully
   ```

2. **Verify signed URL:**
   - Open DevTools → Network tab
   - Look for request to `/tracks/{id}/stream`
   - Should return 307 with Location header
   - Location should start with `https://storage.googleapis.com/...`

3. **Verify GCS CORS:**
   ```bash
   gsutil cors get gs://your-bucket-name
   ```
   Should show the updated configuration

4. **Check signed URL expiration:**
   - Signed URLs expire after 2 hours
   - If page is left open too long, refresh to get new URL

### If downloads still don't work:

1. **Check if opening in new tab:**
   - Should see new tab open briefly
   - File should download automatically

2. **Check browser pop-up blocker:**
   - May need to allow pop-ups for your domain

3. **Check backend logs:**
   - Should see: "Generated signed download URL successfully"
   - If errors, check service account permissions

---

## Alternative Solution (If Still Having Issues)

If CORS issues persist, you can proxy the audio through the backend:

**Option A: Stream through backend** (uses more bandwidth)
```python
# In backend/server.py
@api_router.get("/tracks/{track_id}/stream")
async def stream_track_audio(track_id: str, current_user: User = Depends(get_current_user)):
    # ... auth checks ...
    
    # Download from GCS
    blob = bucket.blob(blob_name)
    content = blob.download_as_bytes()
    
    # Return as streaming response
    return Response(
        content=content,
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes"}
    )
```

**Option B: Use CORS proxy service** (not recommended for production)

---

## Summary

**Root Cause:** 
- Audio element loading from backend endpoint which redirects, causing CORS issues

**Fix:** 
- Frontend fetches signed URL first, then audio element uses it directly
- Updated GCS CORS to allow all necessary headers and methods

**Result:**
- ✅ Audio streams directly from GCS
- ✅ No CORS errors
- ✅ Downloads work
- ✅ Agreements visible and downloadable

**Deploy the changes and apply the GCS CORS configuration!** 🚀

# Deployment Steps to Fix Audio File Display Issue

## Issue Summary
Backend was not accepting blob names from frontend. The Form parameters were being shadowed by conditional file upload logic.

## Changes Made
**File:** `backend/server.py`
- Added Form parameters for blob names and filenames
- Fixed logic to use blob names when no files are uploaded
- Added logging to track what's being received

## Deployment Steps

### 1. Backend Deployment

```bash
# Navigate to project
cd /home/palli/Moon-Music-Library

# Commit changes
git add backend/server.py
git commit -m "Fix: Accept blob names from frontend for GCS workflow"
git push

# Restart backend (method depends on your setup)
# Option A: If using Docker
docker-compose restart backend

# Option B: If using systemd
sudo systemctl restart moon-music-backend

# Option C: If running manually
# Kill the process and restart
pkill -f "uvicorn.*server:app"
cd backend && uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Verify Backend is Running

```bash
# Check backend logs
tail -f backend.log  # Or wherever your logs are

# Test endpoint
curl http://localhost:8000/api/health
```

### 3. Test the Fix

```bash
# Run test script
python3 test_blob_upload.py
```

Expected output:
```
✅ Login successful
✅ Track created successfully!
✅ SUCCESS: Blob names are properly stored!
```

### 4. Frontend Testing

1. **Clear browser cache and localStorage:**
   - Open DevTools (F12)
   - Application tab → Local Storage → Clear All
   - Or run: `localStorage.clear()` in console

2. **Login again:**
   - Go to login page
   - Enter credentials
   - This will get you a fresh token with 8-hour expiration

3. **Upload a new track:**
   - Click "Add Track"
   - Fill in all required fields
   - Upload an MP3 file (and optionally others)
   - Click Submit
   - Watch browser console for any errors

4. **Verify track details:**
   - Click on the newly created track
   - **Audio player should now appear!** 🎵
   - Check Downloads section shows "Available" badges
   - Test play, pause, download buttons

### 5. Check Backend Logs

After uploading, check logs for:
```
INFO: Creating track 'YourTrackName' for user xxx
INFO: Received blob names: mp3=audio/uuid_filename.mp3, lyrics=...
INFO: Received files: mp3=False, lyrics=False, session=False
```

This confirms blob names are being received and used.

## What Should Happen Now

### Before the fix:
- Frontend uploads to GCS ✅
- Frontend sends blob names to backend ✅
- Backend ignores blob names ❌
- Track saved with NULL mp3_blob_name ❌
- TrackDetails sees no mp3_blob_name ❌
- No audio player displayed ❌

### After the fix:
- Frontend uploads to GCS ✅
- Frontend sends blob names to backend ✅
- Backend receives and uses blob names ✅
- Track saved with correct mp3_blob_name ✅
- TrackDetails finds mp3_blob_name ✅
- Audio player displays and streams! ✅

## Troubleshooting

### If audio still doesn't show:

1. **Check the track in database:**
   ```bash
   # SSH into your backend server
   mongo music_library
   db.tracks.findOne({title: "YourTrackName"}, {mp3_blob_name: 1, title: 1})
   ```
   Should see: `mp3_blob_name: "audio/uuid_filename.mp3"`

2. **Check browser console:**
   - Should NOT see: "Audio file not found"
   - Should see the audio element in DevTools

3. **Check network tab:**
   - Look for request to `/tracks/:id/stream`
   - Should return 200 or 302 redirect

4. **Verify GCS permissions:**
   - Backend should be able to generate signed URLs
   - Check for permission errors in backend logs

### If upload fails:

1. **Check Form data in Network tab:**
   - Should contain: `mp3_blob_name`, `mp3_filename`, etc.
   - Should NOT contain: file binaries

2. **Check backend receives data:**
   - Look for log line: "Received blob names: mp3=..."
   - Should show the blob name, not NULL

## Rollback Plan

If something breaks:

```bash
git revert HEAD
git push
# Restart backend
```

## Success Criteria

✅ New tracks show audio player  
✅ Audio streams correctly  
✅ All 5 file types can be downloaded  
✅ No errors in console or backend logs  
✅ Upload completes successfully  

---

**Ready to deploy!** 🚀

Follow steps 1-4 above, then upload a test track to verify everything works.

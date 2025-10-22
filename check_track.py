import requests
import sys

API_BASE = "https://music-tracker-6.preview.emergentagent.com/api"
USERNAME = "admin@example.com"
PASSWORD = "admin123"

# Login
print("Logging in...")
login_resp = requests.post(f"{API_BASE}/auth/login", data={"username": USERNAME, "password": PASSWORD})
if login_resp.status_code != 200:
    print(f"Login failed: {login_resp.text}")
    sys.exit(1)

token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Get all tracks
print("\nFetching tracks...")
tracks_resp = requests.get(f"{API_BASE}/tracks", headers=headers)
if tracks_resp.status_code != 200:
    print(f"Failed to get tracks: {tracks_resp.text}")
    sys.exit(1)

tracks = tracks_resp.json()
print(f"Found {len(tracks)} tracks\n")

# Find the most recent track
if tracks:
    track = tracks[0]
    print(f"Track: {track['title']}")
    print(f"ID: {track['id']}")
    print(f"mp3_blob_name: {track.get('mp3_blob_name')}")
    print(f"lyrics_blob_name: {track.get('lyrics_blob_name')}")
    print(f"session_blob_name: {track.get('session_blob_name')}")
    print(f"singer_agreement_blob_name: {track.get('singer_agreement_blob_name')}")
    print(f"music_director_agreement_blob_name: {track.get('music_director_agreement_blob_name')}")
    
    # Test streaming
    print(f"\nTesting stream endpoint...")
    stream_resp = requests.get(f"{API_BASE}/tracks/{track['id']}/stream", headers=headers, allow_redirects=False)
    print(f"Stream status: {stream_resp.status_code}")
    if stream_resp.status_code == 307:
        print(f"Redirects to: {stream_resp.headers.get('Location')[:100]}...")
    else:
        print(f"Response: {stream_resp.text}")
    
    # Test download
    if track.get('mp3_blob_name'):
        print(f"\nTesting download endpoint...")
        download_resp = requests.get(f"{API_BASE}/tracks/{track['id']}/download/mp3", headers=headers, allow_redirects=False)
        print(f"Download status: {download_resp.status_code}")
        if download_resp.status_code == 307:
            print(f"Redirects to: {download_resp.headers.get('Location')[:100]}...")
        else:
            print(f"Response: {download_resp.text}")
else:
    print("No tracks found")

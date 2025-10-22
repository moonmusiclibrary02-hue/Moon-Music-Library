#!/usr/bin/env python3
"""
Test script to verify blob names are properly received by the backend.
This simulates what the frontend sends.
"""

import requests
import sys

# Configuration
API_BASE = "http://localhost:8000/api"  # Adjust if different
USERNAME = "admin@example.com"  # Adjust
PASSWORD = "admin123"  # Adjust

def test_blob_upload():
    """Test creating a track with blob names instead of files"""
    
    # Step 1: Login
    print("1. Logging in...")
    login_response = requests.post(f"{API_BASE}/auth/login", data={
        "username": USERNAME,
        "password": PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        return False
    
    token = login_response.json()["access_token"]
    print(f"✅ Login successful, token: {token[:20]}...")
    
    # Step 2: Create track with blob names (simulating frontend)
    print("\n2. Creating track with blob names...")
    track_data = {
        "rights_type": "multi_rights",
        "title": "Test Blob Upload",
        "music_composer": "Test Composer",
        "lyricist": "Test Lyricist",
        "singer_name": "Test Singer",
        "audio_language": "Telugu",
        "tempo": "120",
        # Blob names (simulating what frontend sends after GCS upload)
        "mp3_blob_name": "audio/test-uuid_test-audio.mp3",
        "mp3_filename": "test-audio.mp3",
        "lyrics_blob_name": "lyrics/test-uuid_test-lyrics.txt",
        "lyrics_filename": "test-lyrics.txt",
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    create_response = requests.post(
        f"{API_BASE}/tracks",
        data=track_data,
        headers=headers
    )
    
    if create_response.status_code == 200:
        track = create_response.json()
        print(f"✅ Track created successfully!")
        print(f"   ID: {track['id']}")
        print(f"   Title: {track['title']}")
        print(f"   mp3_blob_name: {track.get('mp3_blob_name')}")
        print(f"   lyrics_blob_name: {track.get('lyrics_blob_name')}")
        
        if track.get('mp3_blob_name') == "audio/test-uuid_test-audio.mp3":
            print("\n✅ SUCCESS: Blob names are properly stored!")
            return True
        else:
            print(f"\n❌ FAILED: mp3_blob_name not stored correctly")
            print(f"   Expected: audio/test-uuid_test-audio.mp3")
            print(f"   Got: {track.get('mp3_blob_name')}")
            return False
    else:
        print(f"❌ Track creation failed: {create_response.status_code}")
        print(f"   Response: {create_response.text}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Blob Name Upload to Backend")
    print("=" * 60)
    
    try:
        success = test_blob_upload()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

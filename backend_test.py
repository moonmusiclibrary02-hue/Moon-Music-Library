#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for MusicVault
Tests all authentication, CRUD operations, file uploads, and search functionality
"""

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path
import tempfile
import os

class MusicVaultAPITester:
    def __init__(self, base_url="https://music-tracker-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_timestamp = datetime.now().strftime('%H%M%S')
        self.test_user = {
            'username': f'testuser_{self.test_timestamp}',
            'email': f'test_{self.test_timestamp}@example.com',
            'password': 'TestPass123!'
        }
        
        self.test_track = {
            'title': f'Test Track {self.test_timestamp}',
            'music_composer': 'Test Composer',
            'lyricist': 'Test Lyricist',
            'singer_name': 'Test Singer',
            'tempo': '120 BPM',
            'scale': 'C Major',
            'audio_language': 'English',
            'release_date': '2024-01-15',
            'album_name': 'Test Album',
            'other_info': 'This is a test track for API testing'
        }

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name}: FAILED")
            if error:
                print(f"   Error: {error}")
        
        self.test_results.append({
            'test': name,
            'success': success,
            'details': details,
            'error': error
        })

    def make_request(self, method, endpoint, data=None, files=None, params=None):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(data) if isinstance(data, dict) else data

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, data=data, files=files, timeout=30)
                else:
                    response = requests.post(url, headers=headers, data=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, data=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.Timeout:
            print(f"Request timed out for {method} {url}")
            return None
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_user_registration(self):
        """Test user registration"""
        response = self.make_request('POST', 'auth/register', self.test_user)
        
        if response and response.status_code == 200:
            user_data = response.json()
            self.user_id = user_data.get('id')
            self.log_test("User Registration", True, f"User ID: {self.user_id}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("User Registration", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            'email': self.test_user['email'],
            'password': self.test_user['password']
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            user = data.get('user', {})
            self.log_test("User Login", True, f"Token received, User: {user.get('username')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("User Login", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        response = self.make_request('GET', 'auth/me')
        
        if response and response.status_code == 200:
            user_data = response.json()
            self.log_test("Get Current User", True, f"Username: {user_data.get('username')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("Get Current User", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def create_test_files(self):
        """Create temporary test files for upload"""
        # Create a small test MP3 file (just a text file with .mp3 extension for testing)
        mp3_content = b"This is a test MP3 file content for testing purposes"
        mp3_file = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
        mp3_file.write(mp3_content)
        mp3_file.close()
        
        # Create a test lyrics file
        lyrics_content = b"Test lyrics content\nLine 1\nLine 2\nChorus"
        lyrics_file = tempfile.NamedTemporaryFile(suffix='.txt', delete=False)
        lyrics_file.write(lyrics_content)
        lyrics_file.close()
        
        return mp3_file.name, lyrics_file.name

    def test_create_track_with_files(self):
        """Test creating a track with file uploads"""
        mp3_path, lyrics_path = self.create_test_files()
        
        try:
            files = {
                'mp3_file': ('test_audio.mp3', open(mp3_path, 'rb'), 'audio/mpeg'),
                'lyrics_file': ('test_lyrics.txt', open(lyrics_path, 'rb'), 'text/plain')
            }
            
            response = self.make_request('POST', 'tracks', data=self.test_track, files=files)
            
            # Close files
            files['mp3_file'][1].close()
            files['lyrics_file'][1].close()
            
            if response and response.status_code == 200:
                track_data = response.json()
                self.created_track_id = track_data.get('id')
                self.log_test("Create Track with Files", True, f"Track ID: {self.created_track_id}")
                return True
            else:
                error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
                self.log_test("Create Track with Files", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
                return False
        
        finally:
            # Clean up temp files
            try:
                os.unlink(mp3_path)
                os.unlink(lyrics_path)
            except:
                pass

    def test_create_track_without_files(self):
        """Test creating a track without files"""
        track_data = {
            'title': f'No Files Track {self.test_timestamp}',
            'music_composer': 'Test Composer 2',
            'lyricist': 'Test Lyricist 2',
            'singer_name': 'Test Singer 2',
            'audio_language': 'Spanish'
        }
        
        response = self.make_request('POST', 'tracks', data=track_data)
        
        if response and response.status_code == 200:
            track_data = response.json()
            self.created_track_id_2 = track_data.get('id')
            self.log_test("Create Track without Files", True, f"Track ID: {self.created_track_id_2}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("Create Track without Files", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_get_all_tracks(self):
        """Test getting all tracks"""
        response = self.make_request('GET', 'tracks')
        
        if response and response.status_code == 200:
            tracks = response.json()
            self.log_test("Get All Tracks", True, f"Found {len(tracks)} tracks")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("Get All Tracks", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_search_tracks(self):
        """Test search functionality"""
        # Search by title
        response = self.make_request('GET', 'tracks', params={'search': 'Test Track'})
        
        if response and response.status_code == 200:
            tracks = response.json()
            self.log_test("Search Tracks by Title", True, f"Found {len(tracks)} tracks")
        else:
            self.log_test("Search Tracks by Title", False, error=f"Status: {response.status_code if response else 'None'}")
            return False

        # Search by composer
        response = self.make_request('GET', 'tracks', params={'composer': 'Test Composer'})
        
        if response and response.status_code == 200:
            tracks = response.json()
            self.log_test("Filter by Composer", True, f"Found {len(tracks)} tracks")
        else:
            self.log_test("Filter by Composer", False, error=f"Status: {response.status_code if response else 'None'}")
            return False

        # Search by singer
        response = self.make_request('GET', 'tracks', params={'singer': 'Test Singer'})
        
        if response and response.status_code == 200:
            tracks = response.json()
            self.log_test("Filter by Singer", True, f"Found {len(tracks)} tracks")
        else:
            self.log_test("Filter by Singer", False, error=f"Status: {response.status_code if response else 'None'}")
            return False

        return True

    def test_get_track_details(self):
        """Test getting specific track details"""
        if not hasattr(self, 'created_track_id'):
            self.log_test("Get Track Details", False, error="No track ID available")
            return False
            
        response = self.make_request('GET', f'tracks/{self.created_track_id}')
        
        if response and response.status_code == 200:
            track = response.json()
            self.log_test("Get Track Details", True, f"Track: {track.get('title')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("Get Track Details", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_update_track(self):
        """Test updating track information"""
        if not hasattr(self, 'created_track_id'):
            self.log_test("Update Track", False, error="No track ID available")
            return False
            
        update_data = {
            'title': f'Updated Track {self.test_timestamp}',
            'tempo': '140 BPM',
            'other_info': 'Updated information'
        }
        
        response = self.make_request('PUT', f'tracks/{self.created_track_id}', update_data)
        
        if response and response.status_code == 200:
            track = response.json()
            self.log_test("Update Track", True, f"Updated title: {track.get('title')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("Update Track", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_file_download(self):
        """Test file download functionality"""
        if not hasattr(self, 'created_track_id'):
            self.log_test("Download MP3 File", False, error="No track ID available")
            self.log_test("Download Lyrics File", False, error="No track ID available")
            return False
        
        # Test MP3 download
        response = self.make_request('GET', f'tracks/{self.created_track_id}/download/mp3')
        
        if response and response.status_code == 200:
            self.log_test("Download MP3 File", True, f"File size: {len(response.content)} bytes")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response and response.headers.get('content-type', '').startswith('application/json') else 'File not found'
            self.log_test("Download MP3 File", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test lyrics download
        response = self.make_request('GET', f'tracks/{self.created_track_id}/download/lyrics')
        
        if response and response.status_code == 200:
            self.log_test("Download Lyrics File", True, f"File size: {len(response.content)} bytes")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response and response.headers.get('content-type', '').startswith('application/json') else 'File not found'
            self.log_test("Download Lyrics File", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_delete_track(self):
        """Test deleting a track"""
        if not hasattr(self, 'created_track_id_2'):
            self.log_test("Delete Track", False, error="No track ID available")
            return False
            
        response = self.make_request('DELETE', f'tracks/{self.created_track_id_2}')
        
        if response and response.status_code == 200:
            self.log_test("Delete Track", True, "Track deleted successfully")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_test("Delete Track", False, error=f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_invalid_requests(self):
        """Test error handling with invalid requests"""
        # Test invalid login
        response = self.make_request('POST', 'auth/login', {'email': 'invalid@test.com', 'password': 'wrong'})
        
        if response and response.status_code == 401:
            self.log_test("Invalid Login Handling", True, "Correctly rejected invalid credentials")
        else:
            self.log_test("Invalid Login Handling", False, error=f"Expected 401, got {response.status_code if response else 'None'}")

        # Test accessing protected endpoint without token
        old_token = self.token
        self.token = None
        response = self.make_request('GET', 'tracks')
        self.token = old_token
        
        if response and response.status_code == 401:
            self.log_test("Unauthorized Access Handling", True, "Correctly rejected request without token")
        else:
            self.log_test("Unauthorized Access Handling", False, error=f"Expected 401, got {response.status_code if response else 'None'}")

        # Test non-existent track
        response = self.make_request('GET', 'tracks/non-existent-id')
        
        if response and response.status_code == 404:
            self.log_test("Non-existent Track Handling", True, "Correctly returned 404 for non-existent track")
            return True
        else:
            self.log_test("Non-existent Track Handling", False, error=f"Expected 404, got {response.status_code if response else 'None'}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"\n🎵 Starting MusicVault Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print(f"⏰ Test timestamp: {self.test_timestamp}")
        print("=" * 60)

        # Authentication tests
        print("\n🔐 Authentication Tests")
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return False
            
        if not self.test_user_login():
            print("❌ Login failed - stopping tests")
            return False
            
        self.test_get_current_user()

        # Track management tests
        print("\n🎵 Track Management Tests")
        self.test_create_track_with_files()
        self.test_create_track_without_files()
        self.test_get_all_tracks()
        self.test_search_tracks()
        self.test_get_track_details()
        self.test_update_track()
        self.test_file_download()
        self.test_delete_track()

        # Error handling tests
        print("\n⚠️  Error Handling Tests")
        self.test_invalid_requests()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = MusicVaultAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        'timestamp': datetime.now().isoformat(),
        'total_tests': tester.tests_run,
        'passed_tests': tester.tests_passed,
        'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%",
        'test_details': tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
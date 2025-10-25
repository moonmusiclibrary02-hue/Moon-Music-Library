import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, FileAudio, FileText, ArrowLeft, Music, Mic } from 'lucide-react';

// Constants and helper functions moved outside component
// Map of file types to their corresponding form field names
const blobFieldMap = {
  mp3_file: ['mp3_blob_name', 'mp3_filename'],
  lyrics_file: ['lyrics_blob_name', 'lyrics_filename'],
  session_file: ['session_blob_name', 'session_filename'],
  singer_agreement_file: ['singer_agreement_blob_name', 'singer_agreement_filename'],
  music_director_agreement_file: ['music_director_agreement_blob_name', 'music_director_agreement_filename']
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Save pending cleanup blobs to localStorage for retry
const savePendingCleanup = (blobs) => {
  try {
    // Get existing pending blobs
    const existingJSON = localStorage.getItem('pendingBlobCleanup') || '[]';
    const existing = JSON.parse(existingJSON);
    
    // Add new blobs, avoid duplicates
    const combined = [...new Set([...existing, ...blobs])];
    localStorage.setItem('pendingBlobCleanup', JSON.stringify(combined));
    
    return combined;
  } catch (e) {
    console.error('Error saving pending cleanup:', e);
    return [];
  }
};

// Remove successfully cleaned blobs from the pending list
const removePendingCleanup = (blobName) => {
  try {
    const existingJSON = localStorage.getItem('pendingBlobCleanup') || '[]';
    const existing = JSON.parse(existingJSON);
    const updated = existing.filter(blob => blob !== blobName);
    localStorage.setItem('pendingBlobCleanup', JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating pending cleanup:', e);
  }
};

const UploadTrack = ({ apiClient }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [formData, setFormData] = useState({
    rights_type: '',
    track_category: '',
    title: '',
    music_composer: '',
    lyricist: '',
    singer_name: '',
    tempo: '',
    scale: '',
    audio_language: '',
    release_date: '',
    album_name: '',
    other_info: ''
  });
  const [files, setFiles] = useState({
    mp3_file: null,
    lyrics_file: null,
    session_file: null,
    singer_agreement_file: null,
    music_director_agreement_file: null
  });

  // Track uploaded blobs for retry handling
  const [uploadedBlobs, setUploadedBlobs] = useState({
    mp3_file: null,
    lyrics_file: null,
    session_file: null,
    singer_agreement_file: null,
    music_director_agreement_file: null
  });

  // Ref to track uploaded blobs synchronously (avoids stale state issues)
  const uploadedBlobsRef = useRef({
    mp3_file: null,
    lyrics_file: null,
    session_file: null,
    singer_agreement_file: null,
    music_director_agreement_file: null
  });

  // Track upload progress for each file
  const [uploadProgress, setUploadProgress] = useState({
    mp3_file: 0,
    lyrics_file: 0,
    session_file: 0,
    singer_agreement_file: 0,
    music_director_agreement_file: 0
  });
  
  // Define cleanupBlobs before useEffect that uses it
  const cleanupBlobs = useCallback(async (blobsToClean) => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Save for later retry and notify user
      savePendingCleanup(blobsToClean);
      toast({
        title: "Cleanup warning",
        description: "Upload files will be cleaned up when you sign in again.",
        variant: "warning"
      });
      return;
    }

    // Process each blob with individual try/catch to handle partial failures
    await Promise.all(blobsToClean.map(async (blobName) => {
      try {
        await apiClient.delete(`/tracks/cleanup-upload/${encodeURIComponent(blobName)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Remove from pending cleanup if successful
        removePendingCleanup(blobName);
      } catch (cleanupError) {
        console.error(`Failed to clean up blob ${blobName}:`, cleanupError);
        // Save failed cleanups for later retry
        savePendingCleanup([blobName]);
      }
    }));
  }, [apiClient, toast]);
  
  // Check for pending cleanups on component mount
  useEffect(() => {
    const retryPendingCleanups = async () => {
      try {
        const pendingJSON = localStorage.getItem('pendingBlobCleanup');
        if (!pendingJSON) return;
        
        const pending = JSON.parse(pendingJSON);
        if (pending.length > 0) {
          console.log(`Retrying cleanup for ${pending.length} blobs`);
          await cleanupBlobs(pending);
        }
      } catch (e) {
        console.error('Error retrying pending cleanups:', e);
      }
    };
    
    // Wait a moment for auth to be ready
    const timer = setTimeout(() => retryPendingCleanups(), 2000);
    return () => clearTimeout(timer);
  }, [cleanupBlobs]);

  // Fetch current user and set available languages
  useEffect(() => {
    const fetchUserAndLanguages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }

        // Fetch current user profile (includes manager_details)
        const profileResponse = await apiClient.get('/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const profile = profileResponse.data;
        console.log('Profile data:', profile);
        console.log('User type:', profile.user_type);
        console.log('Manager details:', profile.manager_details);
        setCurrentUser(profile);

        // Define all available languages
        const allLanguages = [
          'English', 'Telugu', 'Kannada', 'Tamil', 'Hindi', 
          'Malayalam', 'Bengali', 'Sanskrit', 'Punjabi', 'Bhojpuri', 'Urdu'
        ];

        // If user is a manager, only show their assigned languages
        if (profile.user_type === 'manager' && profile.manager_details?.assigned_language) {
          const assignedLanguages = profile.manager_details.assigned_language;
          console.log('Assigned languages:', assignedLanguages);
          setAvailableLanguages(assignedLanguages);
        } else {
          // Admin users can see all languages
          console.log('Using all languages (admin or no manager_details)');
          setAvailableLanguages(allLanguages);
        }
      } catch (error) {
        console.error('Error fetching user or languages:', error);
        // On error, show all languages as fallback
        setAvailableLanguages([
          'English', 'Telugu', 'Kannada', 'Tamil', 'Hindi', 
          'Malayalam', 'Bengali', 'Sanskrit', 'Punjabi', 'Bhojpuri', 'Urdu'
        ]);
      }
    };

    fetchUserAndLanguages();
  }, [apiClient]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fileType) => {
    console.log('handleFileChange called:', fileType, e.target.files);
    const file = e.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      
      // Check file size (500MB limit)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        console.log('File too large:', file.size);
        toast({
          title: "File too large",
          description: "Maximum size is 500MB.",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file type
      if (fileType === 'mp3_file') {
        if (!file.type.startsWith('audio/')) {
          console.log('Invalid audio file type:', file.type);
          toast({
            title: "Invalid file type",
            description: "Please select a valid audio file.",
            variant: "destructive"
          });
          return;
        }
      }
      
      // For session files, check if it's ZIP or RAR
      if (fileType === 'session_file') {
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = ['zip', 'rar'];
        const allowedTypes = ['application/zip', 'application/x-rar-compressed', 'application/x-zip-compressed', 'application/rar'];
        
        console.log('Session file validation:', file.type, fileExtension);
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
          console.log('Invalid session file type:', file.type, fileExtension);
          toast({
            title: "Invalid file type",
            description: "Please select a valid session file (ZIP or RAR only).",
            variant: "destructive"
          });
          return;
        }
      }
      
      // For agreement files, check if it's a valid file type
      if (fileType === 'singer_agreement_file' || fileType === 'music_director_agreement_file') {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'image/gif'
        ];
        
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp', 'gif'];
        
        console.log('Agreement file validation:', file.type, fileExtension);
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
          console.log('Invalid agreement file type:', file.type, fileExtension);
          toast({
            title: "Invalid file type",
            description: "Please select a valid document or image file (PDF, DOC, DOCX, TXT, JPG, PNG, WEBP, GIF).",
            variant: "destructive"
          });
          return;
        }
      }
      
      console.log('File accepted, updating state');
      setFiles(prev => ({ ...prev, [fileType]: file }));
      // Reset progress when new file is selected
      setUploadProgress(prev => ({
        ...prev,
        [fileType]: 0
      }));
      const fileTypeLabel = fileType === 'mp3_file' ? 'Audio' : 
                            fileType === 'session_file' ? 'Session' : 
                            fileType === 'lyrics_file' ? 'Lyrics' :
                            fileType === 'singer_agreement_file' ? 'Singer Agreement' :
                            fileType === 'music_director_agreement_file' ? 'Music Director Agreement' : 'File';
      toast({
        title: "File selected",
        description: `${fileTypeLabel} file: ${file.name}`,
      });
    } else {
      console.log('No file selected');
    }
  };

  const uploadFileToGCS = async (file, folder, fileType, signal) => {
    try {
      if (signal?.aborted) {
        throw new Error('Upload aborted');
      }

      // Step 1: Get signed URL from our backend
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Ensure content type is set, use fallback if browser doesn't detect it
      let contentType = file.type;
      if (!contentType || contentType === '') {
        // Fallback based on file extension
        const ext = file.name.toLowerCase().split('.').pop();
        const typeMap = {
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'm4a': 'audio/mp4',
          'txt': 'text/plain',
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'zip': 'application/zip',
          'rar': 'application/x-rar-compressed',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
          'gif': 'image/gif'
        };
        contentType = typeMap[ext] || 'application/octet-stream';
      }

      console.log(`Uploading ${file.name} (${contentType}) to ${folder}`);

      const formData = new FormData();
      formData.append('filename', file.name);
      formData.append('content_type', contentType);
      formData.append('folder', folder);

      let urlResponse;
      try {
        urlResponse = await apiClient.post('/tracks/generate-upload-url', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          signal // Pass signal to apiClient for URL generation
        });
      } catch (urlError) {
        // --- START OF MODIFICATION ---
        // Better error message for signed URL generation failure
        const errorMsg = urlError.response?.data?.detail || urlError.message || 'Failed to generate upload URL';
        console.error('Failed to get signed URL:', errorMsg, 'for file:', file.name, 'type:', contentType);
        
        // Re-throw the original 'urlError' from apiClient.
        // This preserves the full error object, including the '.response' property,
        // which the handleSubmit function's catch block can then properly read.
        throw urlError;
        // --- END OF MODIFICATION ---
      }

      const { signed_url, blob_name } = urlResponse.data;

      // Check for abort before starting GCS upload
      if (signal?.aborted) {
        throw new Error('Upload aborted');
      }

      // Step 2: Upload directly to GCS with progress tracking
      const uploadWithProgress = (url, file, fileType, signal) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Handle abort signal
          if (signal) {
            if (signal.aborted) {
              reject(new Error('Upload aborted'));
              return;
            }
            signal.addEventListener('abort', () => xhr.abort());
          }

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(prev => ({
                ...prev,
                [fileType]: percentComplete
              }));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                status: xhr.status,
                ok: true
              });
            } else {
              let errorDetails = `${xhr.status} ${xhr.statusText}`;
              if (xhr.responseText) {
                const bodySnippet = xhr.responseText.slice(0, 200);
                errorDetails += bodySnippet.length > 200 ? 
                  ` - ${bodySnippet}... (truncated)` : 
                  ` - ${bodySnippet}`;
              }
              reject(new Error(`Failed to upload to GCS: ${errorDetails}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred during upload'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
          });

          xhr.open('PUT', url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });
      };

      const uploadResponse = await uploadWithProgress(signed_url, file, fileType, signal);

      return {
        blob_name,
        filename: file.name
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };



const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    setUploadProgress({
      mp3_file: 0, lyrics_file: 0, session_file: 0,
      singer_agreement_file: 0, music_director_agreement_file: 0
    });

    const currentUploadBlobs = [];
    const controller = new AbortController(); // Single controller for coordinated abort

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ 
          title: "Authentication required",
          description: "Please log in to upload tracks.",
          variant: "destructive" 
        });
        navigate('/auth');
        return;
      }
      
      const fileUploadPromises = [];
      const fileResults = {};

      const createUploadPromise = (file, folder, fileType) => {
        return uploadFileToGCS(file, folder, fileType, controller.signal)
          .then(result => {
            if (result && result.blob_name) {
              // Track blob for cleanup if needed
              currentUploadBlobs.push(result.blob_name);
              // Store the successful upload result
              fileResults[fileType] = {
                blob_name: result.blob_name,
                filename: result.filename
              };
            }
          })
          .catch(err => {
            // Abort other uploads if one fails
            controller.abort();
            throw err;
          });
      };
      
      // Create all upload promises
      for (const [fileType, file] of Object.entries(files)) {
        if (file) {
          const folderMap = {
            mp3_file: 'audio', 
            lyrics_file: 'lyrics', 
            session_file: 'sessions',
            singer_agreement_file: 'agreements', 
            music_director_agreement_file: 'agreements'
          };
          fileUploadPromises.push(createUploadPromise(file, folderMap[fileType], fileType));
        }
      }

      // Wait for all file uploads to complete
      await Promise.all(fileUploadPromises);

      // Now, create the FormData to send to the backend
      const trackMetadata = new FormData();
      
      // 1. Append all the text-based form data
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          trackMetadata.append(key, value);
        }
      });

      // 2. Append the blob names and filenames from the successful uploads
      Object.entries(fileResults).forEach(([fileType, data]) => {
        // Use the blobFieldMap to get correct backend field names
        const [blobField, filenameField] = blobFieldMap[fileType];
        
        trackMetadata.append(blobField, data.blob_name);
        trackMetadata.append(filenameField, data.filename);
      });

      // 3. Send the complete metadata to the backend
      await apiClient.post('/tracks', trackMetadata, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast({
        title: "Success",
        description: "Track created successfully!",
      });
      navigate('/');

    } catch (error) {
      console.error('Submission failed:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to upload track';
      
      // Clean up successfully uploaded blobs if metadata submission fails
      if (currentUploadBlobs.length > 0) {
        console.log('Cleaning up blobs after error:', currentUploadBlobs);
        await cleanupBlobs(currentUploadBlobs).catch(cleanupError => {
          console.error('Cleanup failed:', cleanupError);
        });
      }
      
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this component to display upload progress
  const ProgressBar = ({ progress, fileName }) => {
    // Only show progress bar if a file is selected and upload has started
    if (progress === 0 || !fileName) return null;
    
    return (
      <div className="w-full mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {progress < 100 ? 'Uploading...' : 'Upload Complete'}
          </span>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between fade-in">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Add New Track</h1>
          <p className="text-gray-400 mt-2">Upload and organize your music production assets</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
          data-testid="back-to-dashboard-btn"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card className="glass border-gray-700 slide-in">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Essential details about your track
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">Track Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter track title"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="title-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="album_name" className="text-gray-300">Album Name</Label>
                <Input
                  id="album_name"
                  name="album_name"
                  value={formData.album_name}
                  onChange={handleInputChange}
                  placeholder="Enter album name"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="album-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="music_composer" className="text-gray-300">Music Composer *</Label>
                <Input
                  id="music_composer"
                  name="music_composer"
                  value={formData.music_composer}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter composer name"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="composer-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lyricist" className="text-gray-300">Lyricist *</Label>
                <Input
                  id="lyricist"
                  name="lyricist"
                  value={formData.lyricist}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter lyricist name"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="lyricist-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="singer_name" className="text-gray-300">Singer Name *</Label>
                <Input
                  id="singer_name"
                  name="singer_name"
                  value={formData.singer_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter singer name"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="singer-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="audio_language" className="text-gray-300">Audio Language *</Label>
                <Select 
                  value={formData.audio_language} 
                  onValueChange={(value) => setFormData({ ...formData, audio_language: value })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white" data-testid="audio-language-select">
                    <SelectValue placeholder="Select audio language" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {availableLanguages.map((language) => {
                      // Define language icons and colors
                      const languageConfig = {
                        'English': { icon: '🌍', color: 'text-blue-400' },
                        'Telugu': { icon: '🎭', color: 'text-yellow-400' },
                        'Kannada': { icon: '🎨', color: 'text-purple-400' },
                        'Tamil': { icon: '🎪', color: 'text-red-400' },
                        'Hindi': { icon: '🇮🇳', color: 'text-orange-400' },
                        'Malayalam': { icon: '🌴', color: 'text-emerald-400' },
                        'Bengali': { icon: '🎵', color: 'text-pink-400' },
                        'Sanskrit': { icon: '📿', color: 'text-yellow-300' },
                        'Punjabi': { icon: '🎺', color: 'text-amber-400' },
                        'Bhojpuri': { icon: '🎶', color: 'text-green-300' },
                        'Urdu': { icon: '📖', color: 'text-green-400' }
                      };
                      
                      const config = languageConfig[language] || { icon: '🌐', color: 'text-gray-400' };
                      
                      return (
                        <SelectItem key={language} value={language} className="text-white hover:bg-gray-700">
                          <div className="flex items-center space-x-2">
                            <span className={config.color}>{config.icon}</span>
                            <span>{language}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                    {availableLanguages.length === 0 && (
                      <SelectItem value="loading" disabled className="text-gray-500">
                        Loading languages...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {currentUser?.user_type === 'manager' && availableLanguages.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    You can upload tracks in: {availableLanguages.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Rights Type and Track Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rights_type" className="text-gray-300">Rights Type *</Label>
                <Select 
                  value={formData.rights_type} 
                  onValueChange={(value) => setFormData({ ...formData, rights_type: value, track_category: '' })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white" data-testid="rights-type-select">
                    <SelectValue placeholder="Select rights type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="original" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-green-400">OC</span>
                        <span>Original Track</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="multi_rights" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-blue-400">MR</span>
                        <span>Multi Rights Track</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Track Category - only show for original tracks */}
              {formData.rights_type === 'original' && (
                <div className="space-y-2">
                  <Label htmlFor="track_category" className="text-gray-300">Track Category *</Label>
                  <Select 
                    value={formData.track_category} 
                    onValueChange={(value) => setFormData({ ...formData, track_category: value })}
                  >
                    <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white" data-testid="track-category-select">
                      <SelectValue placeholder="Select track category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="original_composition" className="text-white hover:bg-gray-700">
                        <div className="flex items-center space-x-2">
                          <Music className="h-4 w-4 text-purple-400" />
                          <span>Original Composition</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cover_song" className="text-white hover:bg-gray-700">
                        <div className="flex items-center space-x-2">
                          <Mic className="h-4 w-4 text-orange-400" />
                          <span>Cover Song</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="glass border-gray-700 slide-in">
          <CardHeader>
            <CardTitle className="text-white">Technical Details</CardTitle>
            <CardDescription className="text-gray-400">
              Musical and technical specifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tempo" className="text-gray-300">Tempo (BPM) *</Label>
                <Input
                  id="tempo"
                  name="tempo"
                  value={formData.tempo}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 120 BPM"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="tempo-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scale" className="text-gray-300">Scale/Key</Label>
                <Input
                  id="scale"
                  name="scale"
                  value={formData.scale}
                  onChange={handleInputChange}
                  placeholder="e.g., C Major, Am"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 form-input"
                  data-testid="scale-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="release_date" className="text-gray-300">Release Date</Label>
                <Input
                  id="release_date"
                  name="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={handleInputChange}
                  className="bg-gray-800/50 border-gray-600 text-white form-input"
                  data-testid="release-date-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="other_info" className="text-gray-300">Additional Information</Label>
              <Textarea
                id="other_info"
                name="other_info"
                value={formData.other_info}
                onChange={handleInputChange}
                placeholder="Any additional notes about this track..."
                rows={3}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 resize-none form-input"
                data-testid="other-info-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* File Uploads */}
        <Card className="glass border-gray-700 slide-in">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>File Uploads</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Upload your audio file (required), lyrics, and session files (Max 500MB each)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MP3 Upload */}
            <div className="space-y-3">
              <Label className="text-gray-300 flex items-center space-x-2">
                <FileAudio className="h-4 w-4" />
                <span>Audio File (MP3/WAV/M4A) *</span>
              </Label>
              <div className="file-input">
                <input
                  type="file"
                  id="mp3_file"
                  accept="audio/*"
                  onChange={(e) => handleFileChange(e, 'mp3_file')}
                  className="hidden"
                  data-testid="mp3-file-input"
                />
                <Label 
                  htmlFor="mp3_file" 
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-gray-800/30 hover:bg-gray-800/50"
                >
                  <div className="text-center">
                    {files.mp3_file ? (
                      <div className="space-y-1">
                        <FileAudio className="h-6 w-6 text-orange-500 mx-auto" />
                        <p className="text-sm text-white font-medium">{files.mp3_file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(files.mp3_file.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-400">Click to upload</p>
                      </div>
                    )}
                  </div>
                </Label>
                <ProgressBar 
                  progress={uploadProgress.mp3_file} 
                  fileName={files.mp3_file?.name}
                />
              </div>
            </div>

            {/* Lyrics Upload */}
            <div className="space-y-3">
              <Label className="text-gray-300 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Lyrics File (TXT/PDF/DOC)</span>
              </Label>
              <div className="file-input">
                <input
                  type="file"
                  id="lyrics_file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={(e) => handleFileChange(e, 'lyrics_file')}
                  className="hidden"
                  data-testid="lyrics-file-input"
                />
                <Label 
                  htmlFor="lyrics_file" 
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-gray-800/30 hover:bg-gray-800/50"
                >
                  <div className="text-center">
                    {files.lyrics_file ? (
                      <div className="space-y-1">
                        <FileText className="h-6 w-6 text-orange-500 mx-auto" />
                        <p className="text-sm text-white font-medium">{files.lyrics_file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(files.lyrics_file.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-400">Click to upload</p>
                      </div>
                    )}
                  </div>
                </Label>
                <ProgressBar 
                  progress={uploadProgress.lyrics_file} 
                  fileName={files.lyrics_file?.name}
                />
              </div>
            </div>

            {/* Session File Upload */}
            <div className="space-y-3">
              <Label className="text-gray-300 flex items-center space-x-2">
                <Music className="h-4 w-4" />
                <span>Session File (ZIP/RAR Archive)</span>
              </Label>
              <div className="file-input">
                <input
                  type="file"
                  id="session_file"
                  accept=".zip,.rar"
                  onChange={(e) => handleFileChange(e, 'session_file')}
                  className="hidden"
                  data-testid="session-file-input"
                />
                <Label 
                  htmlFor="session_file" 
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-gray-800/30 hover:bg-gray-800/50"
                >
                  <div className="text-center">
                    {files.session_file ? (
                      <div className="space-y-1">
                        <Music className="h-6 w-6 text-orange-500 mx-auto" />
                        <p className="text-sm text-white font-medium">{files.session_file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(files.session_file.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-400">Click to upload</p>
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>



        {/* Agreement Files */}
        <Card className="glass border-gray-700 slide-in">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <span>Legal Agreements (Optional)</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Upload signed agreements and contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Singer Agreement */}
              <div className="space-y-2">
                <Label htmlFor="singer_agreement_file" className="text-gray-300 flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Singer Agreement <span className="text-gray-400 text-sm">(PDF, DOC, JPG, etc.)</span></span>
                </Label>
                <input
                  type="file"
                  id="singer_agreement_file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => handleFileChange(e, 'singer_agreement_file')}
                  className="hidden"
                  data-testid="singer-agreement-input"
                />
                <Label 
                  htmlFor="singer_agreement_file" 
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-800/30 hover:bg-gray-800/50"
                  onClick={() => {
                    console.log('Singer agreement label clicked');
                    document.getElementById('singer_agreement_file')?.click();
                  }}
                >
                  <div className="text-center">
                    {files.singer_agreement_file ? (
                      <div className="space-y-1">
                        {files.singer_agreement_file.type?.startsWith('image/') ? (
                          <div className="flex flex-col items-center space-y-2">
                            <img
                              src={URL.createObjectURL(files.singer_agreement_file)}
                              alt="Singer Agreement Preview"
                              className="h-16 w-auto max-w-full object-contain rounded border border-gray-500"
                              onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                            />
                            <p className="text-sm text-white font-medium">{files.singer_agreement_file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(files.singer_agreement_file.size)}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <FileText className="h-6 w-6 text-blue-500 mx-auto" />
                            <p className="text-sm text-white font-medium">{files.singer_agreement_file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(files.singer_agreement_file.size)}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <Upload className="h-5 w-5 text-gray-400" />
                          <FileText className="h-5 w-5 text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">Click to upload</p>
                      </div>
                    )}
                  </div>
                </Label>
                <ProgressBar 
                  progress={uploadProgress.singer_agreement_file} 
                  fileName={files.singer_agreement_file?.name}
                />
              </div>

              {/* Music Director Agreement */}
              <div className="space-y-2">
                <Label htmlFor="music_director_agreement_file" className="text-gray-300 flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Music Director Agreement <span className="text-gray-400 text-sm">(PDF, DOC, JPG, etc.)</span></span>
                </Label>
                <input
                  type="file"
                  id="music_director_agreement_file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => handleFileChange(e, 'music_director_agreement_file')}
                  className="hidden"
                  data-testid="music-director-agreement-input"
                />
                <Label 
                  htmlFor="music_director_agreement_file" 
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-800/30 hover:bg-gray-800/50"
                  onClick={() => {
                    console.log('Music director agreement label clicked');
                    document.getElementById('music_director_agreement_file')?.click();
                  }}
                >
                  <div className="text-center">
                    {files.music_director_agreement_file ? (
                      <div className="space-y-1">
                        {files.music_director_agreement_file.type?.startsWith('image/') ? (
                          <div className="flex flex-col items-center space-y-2">
                            <img
                              src={URL.createObjectURL(files.music_director_agreement_file)}
                              alt="Music Director Agreement Preview"
                              className="h-16 w-auto max-w-full object-contain rounded border border-gray-500"
                              onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                            />
                            <p className="text-sm text-white font-medium">{files.music_director_agreement_file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(files.music_director_agreement_file.size)}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <FileText className="h-6 w-6 text-blue-500 mx-auto" />
                            <p className="text-sm text-white font-medium">{files.music_director_agreement_file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(files.music_director_agreement_file.size)}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <Upload className="h-5 w-5 text-gray-400" />
                          <FileText className="h-5 w-5 text-pink-400" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">Click to upload</p>
                      </div>
                    )}
                  </div>
                </Label>
                <ProgressBar 
                  progress={uploadProgress.music_director_agreement_file} 
                  fileName={files.music_director_agreement_file?.name}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="group relative border-2 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 bg-transparent hover:bg-gray-800/50 px-8 py-3 rounded-xl font-medium transition-all duration-200 ease-in-out transform hover:scale-105"
            data-testid="cancel-btn"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
              <span>Cancel</span>
            </span>
            
            {/* Subtle hover effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-700/0 via-gray-600/20 to-gray-700/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.rights_type || (formData.rights_type === 'original' && !formData.track_category) || !formData.title || !formData.music_composer || !formData.lyricist || !formData.singer_name || !formData.audio_language || !formData.tempo || !files.mp3_file}
            className="group relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none overflow-hidden"
            data-testid="upload-track-btn"
          >
            {/* Animated background overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            
            {loading ? (
              <div className="flex items-center space-x-3 relative z-10">
                <div className="relative">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-5 h-5 border-3 border-white/30 rounded-full"></div>
                </div>
                <span className="text-base tracking-wide">Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3 relative z-10">
                <div className="relative">
                  <Upload className="h-5 w-5 transform group-hover:-translate-y-1 transition-transform duration-200" />
                  <div className="absolute inset-0 h-5 w-5 bg-white rounded-full opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-200"></div>
                </div>
                <span className="text-base font-semibold tracking-wide">Create Track</span>
              </div>
            )}
            
            {/* Pulse effect when not disabled */}
            {!loading && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-30 group-hover:animate-pulse"></div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UploadTrack;
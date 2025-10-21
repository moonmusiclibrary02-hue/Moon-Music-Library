import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, FileAudio, FileText, ArrowLeft, Music, Mic } from 'lucide-react';

const UploadTrack = ({ apiClient }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  // Track upload progress for each file
  const [uploadProgress, setUploadProgress] = useState({
    mp3_file: 0,
    lyrics_file: 0,
    session_file: 0,
    singer_agreement_file: 0,
    music_director_agreement_file: 0
  });
  
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
  }, []);

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
        toast.error('File too large. Maximum size is 500MB.');
        return;
      }
      
      // Validate file type
      if (fileType === 'mp3_file') {
        if (!file.type.startsWith('audio/')) {
          console.log('Invalid audio file type:', file.type);
          toast.error('Please select a valid audio file.');
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
          toast.error('Please select a valid session file (ZIP or RAR only).');
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
          toast.error('Please select a valid document or image file (PDF, DOC, DOCX, TXT, JPG, PNG, WEBP, GIF).');
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
      toast.success(`${fileTypeLabel} file selected: ${file.name}`);
    } else {
      console.log('No file selected');
    }
  };

  const uploadFileToGCS = async (file, folder, signal) => {
    try {
      if (signal?.aborted) {
        throw new Error('Upload aborted');
      }

      // Step 1: Get signed URL from our backend
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const formData = new FormData();
      formData.append('filename', file.name);
      formData.append('content_type', file.type);
      formData.append('folder', folder);

      const urlResponse = await apiClient.post('/tracks/generate-upload-url', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        signal // Pass signal to apiClient for URL generation
      });

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

      const uploadResponse = await uploadWithProgress(signed_url, file, folder, signal);

      return {
        blob_name,
        filename: file.name
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Helper function to clean up blobs
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

  // Attempt unauthed cleanup via backend service account
  const tryServiceCleanup = async (blobs) => {
    try {
      await apiClient.post('/tracks/cleanup-unauthed', { blobs });
      return true;
    } catch (e) {
      console.error('Service cleanup failed:', e);
      return false;
    }
  };

  const cleanupBlobs = async (blobsToClean) => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Save for later retry and notify user
      savePendingCleanup(blobsToClean);
      toast({
        title: "Cleanup warning",
        description: "Upload files will be cleaned up when you sign in again.",
        variant: "warning"
      });
      
      // Try server-side cleanup as fallback
      await tryServiceCleanup(blobsToClean);
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
  };

  // Map of file types to their corresponding form field names
  const blobFieldMap = {
    mp3_file: ['mp3_blob_name', 'mp3_filename'],
    lyrics_file: ['lyrics_blob_name', 'lyrics_filename'],
    session_file: ['session_blob_name', 'session_filename'],
    singer_agreement_file: ['singer_agreement_blob_name', 'singer_agreement_filename'],
    music_director_agreement_file: ['music_director_agreement_blob_name', 'music_director_agreement_filename']
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    // Reset upload progress at the start
    setUploadProgress({
      mp3_file: 0,
      lyrics_file: 0,
      session_file: 0,
      singer_agreement_file: 0,
      music_director_agreement_file: 0
    });

    try {
      // Clean up any previous incomplete uploads before starting
      const existingBlobs = Object.values(uploadedBlobs).filter(Boolean);
      if (existingBlobs.length > 0) {
        toast.info('Cleaning up previous upload attempt...');
        await cleanupBlobs(existingBlobs);
        // Reset upload tracking state
        setUploadedBlobs({
          mp3_file: null,
          lyrics_file: null,
          session_file: null,
          singer_agreement_file: null,
          music_director_agreement_file: null
        });
      }

      // Upload all files in parallel with coordinated abort
      const uploadPromises = [];
      const fileData = {};
      const currentUploadBlobs = []; // Track blobs for this upload attempt
      const controller = new AbortController(); // Single controller for all uploads

      // Helper to create an upload promise that handles both success and failure
      const createUploadPromise = (file, folder, fileType) => {
        // Check if we already have an uploaded blob for this file
        if (uploadedBlobs[fileType]) {
          console.log(`Using existing upload for ${fileType}`);
          return Promise.resolve({
            fileType,
            blob_name: uploadedBlobs[fileType],
            filename: file.name
          });
        }

        return uploadFileToGCS(file, folder, controller.signal)
          .then(result => {
            // Track the blob both for cleanup and future retries
            if (result && result.blob_name) {
              currentUploadBlobs.push(result.blob_name);
              setUploadedBlobs(prev => ({
                ...prev,
                [fileType]: result.blob_name
              }));
            }
            return { ...result, fileType };
          })
          .catch(err => {
            // Wrap error with fileType
            throw { reason: err, fileType };
          });
      };

      if (files.mp3_file) {
        uploadPromises.push(
          createUploadPromise(files.mp3_file, 'audio', 'mp3_file')
        );
      }

      if (files.lyrics_file) {
        uploadPromises.push(
          createUploadPromise(files.lyrics_file, 'lyrics', 'lyrics_file')
        );
      }

      if (files.session_file) {
        uploadPromises.push(
          createUploadPromise(files.session_file, 'sessions', 'session_file')
        );
      }

      if (files.singer_agreement_file) {
        uploadPromises.push(
          createUploadPromise(files.singer_agreement_file, 'agreements', 'singer_agreement_file')
        );
      }

      if (files.music_director_agreement_file) {
        uploadPromises.push(
          createUploadPromise(files.music_director_agreement_file, 'agreements', 'music_director_agreement_file')
        );
      }

      // Wait for all uploads to complete and process results
      const results = await Promise.allSettled(uploadPromises);
      
      // Process results
      const failures = [];
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { fileType, blob_name, filename } = result.value;
          fileData[fileType] = { blob_name, filename };
        } else {
          failures.push(result.reason);
        }
      });

      // If there were any failures, clean up blobs from this attempt and throw error
      if (failures.length > 0) {
        if (currentUploadBlobs.length > 0) {
          await cleanupBlobs(currentUploadBlobs);
          // Reset upload tracking state and progress for failed files
          setUploadedBlobs(prev => {
            const newState = { ...prev };
            failures.forEach(failure => {
              if (failure.value?.fileType || failure.reason?.fileType) {
                newState[failure.value?.fileType || failure.reason?.fileType] = null;
              }
            });
            return newState;
          });
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            failures.forEach(failure => {
              if (failure.value?.fileType || failure.reason?.fileType) {
                newProgress[failure.value?.fileType || failure.reason?.fileType] = 0;
              }
            });
            return newProgress;
          });
        }
        // Get the original error from the wrapped structure
        const firstFailure = failures[0];
        const error = firstFailure.reason?.reason || firstFailure.value?.reason || firstFailure.reason;
        throw error;
      }

      // Create form data with metadata and blob references
      const uploadData = new FormData();
      
      // Add metadata from component state
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          uploadData.append(key, value);
        }
      });

      // Map of file types to their corresponding form field names


      // Add blob names and filenames
      Object.entries(fileData).forEach(([fileType, data]) => {
        const [blobField, filenameField] = blobFieldMap[fileType];
        if (data?.blob_name) {
          uploadData.append(blobField, data.blob_name);
          uploadData.append(filenameField, data.filename);
        }
      });
      // Submit track metadata to backend
      const response = await apiClient.post('/tracks', uploadData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Track uploaded successfully!');
      navigate('/');
    } catch (error) {
      console.error('Submission error:', error);
      const message = error.response?.data?.detail || 'Failed to upload track';

      // Clean up any successfully uploaded blobs
      if (uploadedBlobs && Object.keys(uploadedBlobs).length > 0) {
        const blobsToClean = Object.values(uploadedBlobs).filter(Boolean);
        
        // Save all blobs for potential later cleanup
        try {
          // Get existing pending blobs
          const existingJSON = localStorage.getItem('pendingBlobCleanup') || '[]';
          const existing = JSON.parse(existingJSON);
          
          // Add new blobs, avoid duplicates
          const combined = [...new Set([...existing, ...blobsToClean])];
          localStorage.setItem('pendingBlobCleanup', JSON.stringify(combined));
        } catch (e) {
          console.error('Error saving pending cleanup:', e);
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Authentication token not found during cleanup');
          toast.warning('Upload files will be cleaned up when you sign in again.');
          
          // Try server-side cleanup as fallback
          try {
            await tryServiceCleanup(blobsToClean);
          } catch (serviceError) {
            console.error('Service cleanup failed:', serviceError);
          }
        } else {
          // Call backend to delete the uploaded blobs
          await Promise.all(blobsToClean.map(async (blob) => {
            try {
              await apiClient.delete(`/tracks/cleanup-upload/${encodeURIComponent(blob)}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              // Remove from pending cleanup if successful
              try {
                const existingJSON = localStorage.getItem('pendingBlobCleanup') || '[]';
                const existing = JSON.parse(existingJSON);
                const updated = existing.filter(item => item !== blob);
                localStorage.setItem('pendingBlobCleanup', JSON.stringify(updated));
              } catch (e) {
                console.error('Error updating pending cleanup:', e);
              }
            } catch (cleanupError) {
              // Log cleanup errors but don't block error handling
              console.error(`Failed to clean up blob ${blob}:`, cleanupError);
              // Blob will remain in pendingBlobCleanup for future retry
            }
          }));
        }
      }

      toast.error(message);
      throw error; // Re-throw the original error after cleanup
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                    <SelectItem value="English" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400">🌍</span>
                        <span>English</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Telugu" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">🎭</span>
                        <span>Telugu</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Kannada" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-400">🎨</span>
                        <span>Kannada</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Tamil" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-400">🎪</span>
                        <span>Tamil</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Hindi" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-400">🇮🇳</span>
                        <span>Hindi</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Malayalam" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-400">🌴</span>
                        <span>Malayalam</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Bengali" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-pink-400">🎵</span>
                        <span>Bengali</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Sanskrit" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-300">📿</span>
                        <span>Sanskrit</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Punjabi" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-400">🎺</span>
                        <span>Punjabi</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Bhojpuri" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-300">🎶</span>
                        <span>Bhojpuri</span>
                      </div>
                    </SelectItem>
                    
                    <SelectItem value="Urdu" className="text-white hover:bg-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">📖</span>
                        <span>Urdu</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                  <span>Singer Agreement</span>
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
                  <span>Music Director Agreement</span>
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
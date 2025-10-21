import React, { useState } from 'react';
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

  const uploadFileToGCS = async (file, folder) => {
    try {
      // Step 1: Get signed URL from our backend
      const formData = new FormData();
      formData.append('filename', file.name);
      formData.append('content_type', file.type);
      formData.append('folder', folder);

      const urlResponse = await apiClient.post('/tracks/generate-upload-url', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { signed_url, blob_name } = urlResponse.data;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Retry configuration
      const maxRetries = 3;
      const baseDelay = 1000; // Start with 1 second delay

      // Helper to add jitter to retry delay
      const getRetryDelay = (attempt) => {
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Random delay 0-1000ms
        return exponentialDelay + jitter;
      };

      try {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Step 2: Upload directly to GCS
            const uploadResponse = await fetch(signed_url, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type
              },
              signal: controller.signal
            });

            // Check if upload was successful
            if (uploadResponse.ok) {
              clearTimeout(timeoutId);
              return {
                blob_name,
                filename: file.name
              };
            }

            // Handle server errors (5xx) with retry
            if (uploadResponse.status >= 500) {
              lastError = new Error(`Server error ${uploadResponse.status}`);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
                continue;
              }
            }

            // Non-5xx errors are thrown immediately
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
          } catch (err) {
            lastError = err;
            if (err.name === 'AbortError') {
              throw new Error('Upload timed out after 5 minutes');
            }
            // Retry on network errors unless aborted
            if (attempt < maxRetries && !controller.signal.aborted && 
                (err instanceof TypeError || err.message.includes('network'))) {
              await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
              continue;
            }
            throw err;
          }
        }
        throw lastError;
      } finally {
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload all files in parallel
      const uploadPromises = [];
      const fileData = {};
      const uploadedBlobs = []; // Track successfully uploaded blobs for cleanup on failure

      // Helper to create an upload promise that handles both success and failure
      const createUploadPromise = (file, folder, fileType) => {
        return uploadFileToGCS(file, folder)
          .then(result => {
            // Track the blob for potential cleanup regardless of overall success
            if (result && result.blob_name) {
              uploadedBlobs.push(result.blob_name);
            }
            return { status: 'fulfilled', fileType, value: result };
          })
          .catch(error => {
            return { status: 'rejected', fileType, reason: error };
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
      
      // Check for any failures and process successful uploads
      const failures = results.filter(result => 
        result.value?.status === 'rejected' || result.status === 'rejected'
      );

      // Process successful uploads into fileData
      results.forEach(result => {
        if (result.value?.status === 'fulfilled') {
          const { fileType, value } = result.value;
          fileData[fileType] = value;
        }
      });

      // If there were any failures, clean up all blobs and throw error
      if (failures.length > 0) {
        const error = failures[0].value?.reason || failures[0].reason;
        throw error; // This will trigger the catch block which handles cleanup
      }

      // Create form data with metadata and blob references
      const uploadData = new FormData();
      
      // Add metadata from component state
      Object.entries(formData).forEach(([key, value]) => {
        uploadData.append(key, value);
      });

      // Add blob names and filenames
      if (fileData.mp3_file) {
        uploadData.append('mp3_blob_name', fileData.mp3_file.blob_name);
        uploadData.append('mp3_filename', fileData.mp3_file.filename);
      }

      if (fileData.lyrics_file) {
        uploadData.append('lyrics_blob_name', fileData.lyrics_file.blob_name);
        uploadData.append('lyrics_filename', fileData.lyrics_file.filename);
      }

      if (fileData.session_file) {
        uploadData.append('session_blob_name', fileData.session_file.blob_name);
        uploadData.append('session_filename', fileData.session_file.filename);
      }

      if (fileData.singer_agreement_file) {
        uploadData.append('singer_agreement_blob_name', fileData.singer_agreement_file.blob_name);
        uploadData.append('singer_agreement_filename', fileData.singer_agreement_file.filename);
      }

      if (fileData.music_director_agreement_file) {
        uploadData.append('music_director_agreement_blob_name', fileData.music_director_agreement_file.blob_name);
        uploadData.append('music_director_agreement_filename', fileData.music_director_agreement_file.filename);
      }

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
      if (uploadedBlobs.length > 0) {
        try {
          // Call backend to delete the uploaded blobs
          await Promise.all(uploadedBlobs.map(async (blobName) => {
            try {
              await apiClient.delete(`/tracks/cleanup-upload/${encodeURIComponent(blobName)}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
            } catch (cleanupError) {
              // Log cleanup errors but don't block error handling
              console.error(`Failed to clean up blob ${blobName}:`, cleanupError);
            }
          }));
        } catch (cleanupError) {
          // Log any cleanup errors but don't mask the original error
          console.error('Error during cleanup:', cleanupError);
        }
      }

      toast.error(message);
      throw error; // Re-throw the original error after cleanup
    } finally {
      setLoading(false);
    }
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
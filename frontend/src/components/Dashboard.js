import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { Search, Music, Plus, Play, Pause, Download, Eye, Clock, User, Mic, Album, Grid, List, Filter, FileText, X, Users, Mail, Phone, Globe, Edit, Key } from 'lucide-react';

const Dashboard = ({ apiClient }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [audioPlayer, setAudioPlayer] = useState({
    currentTrack: null,
    isPlaying: false,
    audio: null
  });
  const [agreementModal, setAgreementModal] = useState({
    isOpen: false,
    track: null,
    agreementType: null, // 'singer_agreement' or 'music_director_agreement'
    fileUrl: null,
    fileName: null
  });
  const [filters, setFilters] = useState({
    composer: '',
    singer: '',
    album: '',
    language: ''
  });
  const [activeTab, setActiveTab] = useState('cards');
  const [mainTab, setMainTab] = useState('tracks');
  const [lyricsModal, setLyricsModal] = useState({
    isOpen: false,
    content: '',
    title: '',
    filename: '',
    loading: false
  });
  const [managers, setManagers] = useState([]);
  const [managerModal, setManagerModal] = useState({
    isOpen: false,
    editing: false,
    manager: null
  });
  const [managerForm, setManagerForm] = useState({
    name: '',
    email: '',
    assigned_language: '',
    phone: '',
    custom_password: ''
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchTracks();
  }, []);

  useEffect(() => {
    if (mainTab === 'managers') {
      fetchManagers();
    }
  }, [mainTab]);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchTracks = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        // ... your params logic is correct ...

        const response = await apiClient.get(`/tracks?${params.toString()}`);

        // --- THE FIX IS HERE ---
        // Check if the response data is an object and has a key containing the array
        // Common keys are 'items', 'tracks', or 'data'. Adjust if needed.
        if (response.data && Array.isArray(response.data.items)) {
          setTracks(response.data.items);
        } else if (Array.isArray(response.data)) {
          // Fallback in case the API sometimes returns a direct array
          setTracks(response.data);
        } else {
          // If the structure is unexpected, default to an empty array to prevent crashes
          console.warn("Unexpected data structure from /tracks endpoint:", response.data);
          setTracks([]);
        }

      } catch (error) {
        console.error('Error fetching tracks:', error);
        toast.error('Failed to load tracks');
        setTracks([]); // Also ensure tracks is an array on error
      } finally {
        setLoading(false);
      }
    };

  const handleSearch = () => {
    fetchTracks();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ composer: '', singer: '', album: '', language: '' });
    setTimeout(() => fetchTracks(), 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUniqueLanguages = () => {
  // Add a check to ensure tracks is an array
  if (!Array.isArray(tracks)) return []; 
  const languages = [...new Set(tracks.map(track => track.audio_language).filter(Boolean))];
  return languages.sort();
  };

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping manager fetch');
        return;
      }
      
      // Only fetch managers if user is admin
      if (user && user.user_type !== 'admin') {
        console.log('User is not admin, skipping manager fetch');
        return;
      }
      
      const response = await apiClient.get('/managers');
      setManagers(response.data);
    } catch (error) {
      console.error('Error fetching managers:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
      } else {
        toast.error('Failed to load managers');
      }
    }
  };

  const openManagerModal = (manager = null) => {
    if (manager) {
      setManagerForm({
        name: manager.name,
        email: manager.email,
        assigned_language: manager.assigned_language,
        phone: manager.phone || '',
        custom_password: ''  // Don't prefill password for editing
      });
      setManagerModal({ isOpen: true, editing: true, manager });
    } else {
      setManagerForm({ name: '', email: '', assigned_language: '', phone: '', custom_password: '' });
      setManagerModal({ isOpen: true, editing: false, manager: null });
    }
  };

  const closeManagerModal = () => {
    setManagerModal({ isOpen: false, editing: false, manager: null });
    setManagerForm({ name: '', email: '', assigned_language: '', phone: '', custom_password: '' });
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure token is set before making request
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in again to continue');
        return;
      }
      
      if (managerModal.editing) {
        await apiClient.put(`/managers/${managerModal.manager.id}`, managerForm);
        toast.success('Manager updated successfully!');
      } else {
        const response = await apiClient.post('/managers', managerForm);
        const newManager = response.data;
        
        // Show credentials after successful creation
        const credentialsMessage = await getManagerCredentials(newManager.id);
        if (credentialsMessage) {
          toast.success('Manager created successfully! Credentials logged - check console for details.');
          // Show credentials in an alert for admin
          setTimeout(() => {
            alert(`🎵 Manager Account Created!\n\n👤 Name: ${newManager.name}\n📧 Email: ${newManager.email}\n🔑 Login URL: ${window.location.origin}\n\n⚠️ Credentials have been logged in the system. In production, these would be emailed to the manager.`);
          }, 500);
        } else {
          toast.success('Manager created successfully!');
        }
      }
      closeManagerModal();
      fetchManagers();
    } catch (error) {
      console.error('Error saving manager:', error);
      const message = error.response?.data?.detail || 'Failed to save manager';
      toast.error(message);
    }
  };

  const getManagerCredentials = async (managerId) => {
    try {
      const response = await apiClient.get(`/admin/manager-credentials/${managerId}`);
      const credentials = response.data;
      
      // Log credentials to console for admin reference
      console.log('🎵 MANAGER LOGIN CREDENTIALS');
      console.log('═══════════════════════════════════════');
      console.log(`👤 Manager: ${credentials.manager_name}`);
      console.log(`📧 Email: ${credentials.email}`);
      console.log(`🔑 Password: ${credentials.password}`);
      console.log(`🌐 Login URL: ${credentials.login_url}`);
      console.log(`📅 Created: ${new Date(credentials.sent_at).toLocaleString()}`);
      console.log('═══════════════════════════════════════');
      console.log('⚠️  Share these credentials with the manager');
      
      return credentials;
    } catch (error) {
      console.error('Error fetching manager credentials:', error);
      return null;
    }
  };

  const viewManagerCredentials = async (manager) => {
    try {
      const credentials = await getManagerCredentials(manager.id);
      if (credentials) {
        const credentialsText = `🎵 Moon Music - Manager Login Credentials\n\n👤 Manager: ${credentials.manager_name}\n📧 Email: ${credentials.email}\n🔑 Password: ${credentials.password}\n🌐 Login URL: ${credentials.login_url}\n📅 Created: ${new Date(credentials.sent_at).toLocaleString()}\n\n⚠️ Share these credentials securely with the manager.\n💡 Credentials are also logged in the browser console.`;
        
        // Copy to clipboard
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}\nLogin URL: ${credentials.login_url}`);
            toast.success('Credentials copied to clipboard!');
          } catch (err) {
            console.error('Failed to copy to clipboard:', err);
          }
        }
        
        // Show in alert
        alert(credentialsText);
      } else {
        toast.error('Could not retrieve manager credentials');
      }
    } catch (error) {
      toast.error('Failed to fetch manager credentials');
    }
  };

  const playTrack = async (track) => {
    try {
      if (!track.mp3_file_path) {
        toast.error('No audio file available for this track');
        return;
      }

      // If same track is playing, toggle pause/play
      if (audioPlayer.currentTrack?.id === track.id && audioPlayer.audio) {
        if (audioPlayer.isPlaying) {
          audioPlayer.audio.pause();
          setAudioPlayer(prev => ({ ...prev, isPlaying: false }));
        } else {
          audioPlayer.audio.play();
          setAudioPlayer(prev => ({ ...prev, isPlaying: true }));
        }
        return;
      }

      // Stop current track if different track is selected
      if (audioPlayer.audio) {
        audioPlayer.audio.pause();
        audioPlayer.audio = null;
      }

      // Create new audio element
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const audioUrl = `${backendUrl}/api/files/${track.mp3_filename}`;
      console.log('Attempting to play audio from:', audioUrl);
      
      const audio = new Audio();
      audio.crossOrigin = "anonymous"; // Handle CORS
      audio.preload = "metadata";
      
      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started for:', track.title);
        toast.info(`Loading: ${track.title}`);
      });
      
      audio.addEventListener('canplay', () => {
        console.log('Audio can play:', track.title);
      });
      
      audio.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully');
      });
      
      audio.addEventListener('ended', () => {
        setAudioPlayer(prev => ({ 
          ...prev, 
          isPlaying: false,
          currentTrack: null,
          audio: null
        }));
        toast.success(`Finished playing: ${track.title}`);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e, 'for URL:', audioUrl);
        const errorMsg = audio.error ? 
          `Audio error (${audio.error.code}): ${audio.error.message || 'Unknown error'}` : 
          'Failed to load audio file';
        toast.error(errorMsg);
        setAudioPlayer(prev => ({ 
          ...prev, 
          isPlaying: false,
          currentTrack: null,
          audio: null
        }));
      });
      
      // Set the audio source
      audio.src = audioUrl;

      // Start playing
      await audio.play();
      setAudioPlayer({
        currentTrack: track,
        isPlaying: true,
        audio: audio
      });
      
      toast.success(`Now playing: ${track.title}`);
      
    } catch (error) {
      console.error('Error playing track:', error);
      toast.error('Failed to play track');
    }
  };

  const stopAudio = () => {
    if (audioPlayer.audio) {
      audioPlayer.audio.pause();
      audioPlayer.audio = null;
    }
    setAudioPlayer({
      currentTrack: null,
      isPlaying: false,
      audio: null
    });
  };

  // Cleanup audio when component unmounts
  React.useEffect(() => {
    return () => {
      if (audioPlayer.audio) {
        audioPlayer.audio.pause();
        audioPlayer.audio = null;
      }
    };
  }, [audioPlayer.audio]);

  const viewAgreement = async (track, agreementType) => {
    try {
      const fieldName = agreementType === 'singer' ? 'singer_agreement_file_path' : 'music_director_agreement_file_path';
      const filenameName = agreementType === 'singer' ? 'singer_agreement_filename' : 'music_director_agreement_filename';
      
      if (!track[fieldName]) {
        toast.error(`No ${agreementType} agreement available for this track`);
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const fileUrl = `${backendUrl}/api/files/${track[filenameName]}`;
      const fileName = track[filenameName] || 'agreement';
      
      setAgreementModal({
        isOpen: true,
        track: track,
        agreementType: agreementType,
        fileUrl: fileUrl,
        fileName: fileName
      });
      
    } catch (error) {
      console.error('Error viewing agreement:', error);
      toast.error('Failed to load agreement');
    }
  };

  const closeAgreementModal = () => {
    setAgreementModal({
      isOpen: false,
      track: null,
      agreementType: null,
      fileUrl: null,
      fileName: null
    });
  };

  const isImageFile = (filename) => {
    if (!filename) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const deleteManager = async (managerId) => {
    if (window.confirm('Are you sure you want to delete this manager?')) {
      try {
        await apiClient.delete(`/managers/${managerId}`);
        toast.success('Manager deleted successfully!');
        fetchManagers();
      } catch (error) {
        console.error('Error deleting manager:', error);
        toast.error('Failed to delete manager');
      }
    }
  };

  const downloadFile = async (trackId, fileType, filename) => {
    try {
      const response = await apiClient.get(`/tracks/${trackId}/download/${fileType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${fileType === 'mp3' ? 'Audio' : fileType === 'session' ? 'Session' : 'Lyrics'} file downloaded successfully`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const viewLyrics = async (track) => {
    setLyricsModal({
      isOpen: true,
      content: '',
      title: track.title,
      filename: '',
      loading: true
    });

    try {
      const response = await apiClient.get(`/tracks/${track.id}/lyrics-content`);
      setLyricsModal({
        isOpen: true,
        content: response.data.content,
        title: track.title,
        filename: response.data.filename,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      toast.error('Failed to load lyrics');
      setLyricsModal({
        isOpen: false,
        content: '',
        title: '',
        filename: '',
        loading: false
      });
    }
  };

  if (loading && tracks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto w-8 h-8 border-orange-500"></div>
          <p className="text-gray-400">Loading your music inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 fade-in">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold gradient-text">
          {user?.user_type === 'manager' ? 'My Music Library' : 'Music Inventory'}
        </h1>
        <p className="text-lg text-gray-400">
          {user?.user_type === 'manager' 
            ? `Manage your ${user.manager_details?.assigned_language || ''} music uploads` 
            : 'Manage and organize your music production assets'
          }
        </p>
      </div>

      {/* Now Playing Bar */}
      {audioPlayer.currentTrack && (
        <Card className="glass border-orange-500/30 bg-orange-500/5 slide-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Music className="h-5 w-5 text-orange-400" />
                  <span className="text-white font-medium">Now Playing:</span>
                  <span className="text-orange-400">{audioPlayer.currentTrack.title}</span>
                  <span className="text-gray-400">by {audioPlayer.currentTrack.singer_name}</span>
                </div>
                {audioPlayer.isPlaying && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-4 bg-orange-400 animate-pulse rounded"></div>
                    <div className="w-1 h-6 bg-orange-400 animate-pulse rounded animation-delay-75"></div>
                    <div className="w-1 h-4 bg-orange-400 animate-pulse rounded animation-delay-150"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => playTrack(audioPlayer.currentTrack)}
                  className="text-orange-400 hover:text-orange-300 h-8 w-8 p-0"
                  data-testid="now-playing-toggle"
                >
                  {audioPlayer.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={stopAudio}
                  className="text-gray-400 hover:text-white h-8 w-8 p-0"
                  title="Stop"
                  data-testid="now-playing-stop"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className={`grid w-full ${user?.user_type === 'admin' ? 'grid-cols-2' : 'grid-cols-1'} bg-gray-800/50 mb-6`}>
          <TabsTrigger 
            value="tracks" 
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex items-center space-x-2"
            data-testid="tracks-main-tab"
          >
            <Music className="h-4 w-4" />
            <span>Music Tracks</span>
          </TabsTrigger>
          {user?.user_type === 'admin' && (
            <TabsTrigger 
              value="managers" 
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex items-center space-x-2"
              data-testid="managers-main-tab"
            >
              <Users className="h-4 w-4" />
              <span>Managers</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tracks Tab Content */}
        <TabsContent value="tracks">
          {/* Search and Filters */}
          <Card className="glass border-gray-700 slide-in" data-testid="search-filters-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search & Filter</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Link to="/bulk-upload">
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  data-testid="bulk-upload-btn"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </Link>
              <Link to="/upload">
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  data-testid="add-track-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Track
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search by title, composer, singer, or album..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                data-testid="search-input"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              className="bg-orange-500 hover:bg-orange-600 text-white px-6"
              data-testid="search-btn"
            >
              Search
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Filter by composer"
              value={filters.composer}
              onChange={(e) => setFilters({ ...filters, composer: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
              data-testid="composer-filter"
            />
            <Input
              placeholder="Filter by singer"
              value={filters.singer}
              onChange={(e) => setFilters({ ...filters, singer: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
              data-testid="singer-filter"
            />
            <Input
              placeholder="Filter by album"
              value={filters.album}
              onChange={(e) => setFilters({ ...filters, album: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
              data-testid="album-filter"
            />
            <Select
              value={filters.language}
              onValueChange={(value) => setFilters({ ...filters, language: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white" data-testid="language-filter">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Languages</SelectItem>
                {getUniqueLanguages().map((language) => (
                  <SelectItem key={language} value={language} className="text-white">
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
              data-testid="clear-filters-btn"
            >
              Clear Filters
            </Button>
            <span className="text-sm text-gray-400">{tracks.length} track(s) found</span>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
          <TabsTrigger 
            value="cards" 
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex items-center space-x-2"
            data-testid="cards-tab"
          >
            <Grid className="h-4 w-4" />
            <span>Cards View</span>
          </TabsTrigger>
          <TabsTrigger 
            value="table" 
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex items-center space-x-2"
            data-testid="table-tab"
          >
            <List className="h-4 w-4" />
            <span>Table View</span>
          </TabsTrigger>
        </TabsList>

        {/* Cards View */}
        <TabsContent value="cards" className="mt-6">
          {/* Add New Track */}
          {tracks.length === 0 && !loading && (
            <Card className="glass border-gray-700 text-center py-12 fade-in">
              <CardContent className="space-y-4">
                <Music className="h-16 w-16 text-gray-500 mx-auto" />
                <h3 className="text-xl font-semibold text-white">No tracks found</h3>
                <p className="text-gray-400">Start building your music inventory by adding your first track</p>
                <Link to="/upload">
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" data-testid="add-first-track-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Track
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Tracks Grid */}
          {tracks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(tracks || []).map((track) => (
                <Card 
                  key={track.id} 
                  className="glass border-gray-700 track-card hover-glow transition-all duration-300 fade-in"
                  data-testid={`track-card-${track.id}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1">
                        {/* Unique Code and Serial Number Badges */}
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-mono text-xs">
                            #{track.unique_code}
                          </Badge>
                          {track.serial_number && (
                            <Badge className={`font-mono text-xs ${
                              track.serial_number?.startsWith('OC') 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                              {track.serial_number}
                            </Badge>
                          )}
                          {track.rights_type && (
                            <Badge className={`text-xs ${
                              track.rights_type === 'original'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            }`}>
                              {track.rights_type === 'original' ? 'Original Track' : 'Multi Rights'}
                            </Badge>
                          )}
                          {track.rights_details && (
                            <Badge className={`text-xs ${
                              track.rights_details === 'own_rights'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {track.rights_details === 'own_rights' ? 'Own Rights' : 'Multi Rights'}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-white text-lg font-semibold line-clamp-2">
                          {track.title}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {track.album_name && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Album className="h-3 w-3" />
                              <span>{track.album_name}</span>
                            </div>
                          )}
                        </CardDescription>
                      </div>
                      <Link to={`/track/${track.id}`}>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-gray-400 hover:text-white p-2"
                          data-testid={`view-track-${track.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Artist Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-gray-300">
                        <User className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Composer:</span>
                        <span>{track.music_composer}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300">
                        <Mic className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Singer:</span>
                        <span>{track.singer_name}</span>
                      </div>
                    </div>

                    {/* Track Category for Original Tracks */}
                    {track.track_category && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                        {track.track_category === 'original_composition' ? (
                          <>
                            <Music className="h-3 w-3 text-purple-400" />
                            <span className="text-purple-400">Original Composition</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3 w-3 text-orange-400" />
                            <span className="text-orange-400">Cover Song</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2">
                      {track.tempo && (
                        <Badge variant="secondary" className="bg-gray-800/50 text-gray-300">
                          {track.tempo}
                        </Badge>
                      )}
                      {track.scale && (
                        <Badge variant="secondary" className="bg-gray-800/50 text-gray-300">
                          {track.scale}
                        </Badge>
                      )}
                      {track.audio_language && (
                        <Badge variant="secondary" className="bg-gray-800/50 text-gray-300">
                          {track.audio_language}
                        </Badge>
                      )}
                    </div>

                    {/* Audio Preview */}
                    {track.mp3_file_path && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-gray-400 text-sm">
                          <Play className="h-3 w-3" />
                          <span>Audio Preview</span>
                        </div>
                        <audio 
                          controls 
                          className="w-full h-8" 
                          preload="metadata"
                          data-testid={`audio-preview-${track.id}`}
                          src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${track.mp3_filename}`}
                        >
                          <source src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${track.mp3_filename}`} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {track.mp3_file_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(track.id, 'mp3', `${track.title}.mp3`)}
                          className="flex-1 min-w-[70px] border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                          data-testid={`download-mp3-${track.id}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          MP3
                        </Button>
                      )}
                      {track.lyrics_file_path && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewLyrics(track)}
                            className="flex-1 min-w-[80px] border-blue-600 text-blue-400 hover:text-blue-300 hover:border-blue-500"
                            data-testid={`view-lyrics-${track.id}`}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadFile(track.id, 'lyrics', `${track.title}_lyrics.txt`)}
                            className="flex-1 min-w-[70px] border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                            data-testid={`download-lyrics-${track.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Lyrics
                          </Button>
                        </>
                      )}
                      {track.session_file_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(track.id, 'session', `${track.title}_session`)}
                          className="flex-1 min-w-[80px] border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                          data-testid={`download-session-${track.id}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Session
                        </Button>
                      )}
                      {/* Singer Agreement */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => track.singer_agreement_file_path ? viewAgreement(track, 'singer') : null}
                        className={`flex-1 min-w-[90px] ${
                          track.singer_agreement_file_path 
                            ? 'border-yellow-600 text-yellow-400 hover:text-yellow-300 hover:border-yellow-500'
                            : 'border-red-600 text-red-400 hover:text-red-300 hover:border-red-500'
                        } ${!track.singer_agreement_file_path ? 'cursor-not-allowed opacity-75' : ''}`}
                        title={track.singer_agreement_file_path ? 'View Singer Agreement' : 'No Singer Agreement'}
                        data-testid={`view-singer-agreement-${track.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Singer Agr.
                      </Button>
                      
                      {/* Music Director Agreement */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => track.music_director_agreement_file_path ? viewAgreement(track, 'music_director') : null}
                        className={`flex-1 min-w-[90px] ${
                          track.music_director_agreement_file_path 
                            ? 'border-pink-600 text-pink-400 hover:text-pink-300 hover:border-pink-500'
                            : 'border-red-600 text-red-400 hover:text-red-300 hover:border-red-500'
                        } ${!track.music_director_agreement_file_path ? 'cursor-not-allowed opacity-75' : ''}`}
                        title={track.music_director_agreement_file_path ? 'View Music Director Agreement' : 'No Music Director Agreement'}
                        data-testid={`view-director-agreement-${track.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Dir. Agr.
                      </Button>
                    </div>

                    {/* Creation Date */}
                    <div className="flex items-center space-x-2 text-xs text-gray-500 pt-2 border-t border-gray-700">
                      <Clock className="h-3 w-3" />
                      <span>Added {formatDate(track.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table" className="mt-6">
          {/* Add New Track */}
          {tracks.length === 0 && !loading && (
            <Card className="glass border-gray-700 text-center py-12 fade-in">
              <CardContent className="space-y-4">
                <Music className="h-16 w-16 text-gray-500 mx-auto" />
                <h3 className="text-xl font-semibold text-white">No tracks found</h3>
                <p className="text-gray-400">Start building your music inventory by adding your first track</p>
                <Link to="/upload">
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" data-testid="add-first-track-btn-table">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Track
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Tracks Table */}
          {tracks.length > 0 && (
            <Card className="glass border-gray-700 fade-in">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800/50">
                        <TableHead className="text-gray-300 font-semibold">Code</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Serial</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Title</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Album</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Composer</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Singer</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Language</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Tempo</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Scale</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Added</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Files</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tracks || []).map((track) => (
                        <TableRow 
                          key={track.id} 
                          className="border-gray-700 hover:bg-gray-800/30 transition-colors"
                          data-testid={`table-row-${track.id}`}
                        >
                          <TableCell className="text-orange-400 font-mono text-sm">#{track.unique_code}</TableCell>
                          <TableCell className={`font-mono text-sm ${
                            track.serial_number?.startsWith('OC') 
                              ? 'text-green-400' 
                              : 'text-blue-400'
                          }`}>
                            {track.serial_number || 'N/A'}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            <div className="flex flex-col">
                              <span>{track.title}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {track.track_category && (
                                  <span className={`text-xs ${
                                    track.track_category === 'original_composition' 
                                      ? 'text-purple-400' 
                                      : 'text-orange-400'
                                  }`}>
                                    {track.track_category === 'original_composition' ? '♪ Original' : '♫ Cover'}
                                  </span>
                                )}
                                {track.rights_details && (
                                  <span className={`text-xs ${
                                    track.rights_details === 'own_rights'
                                      ? 'text-emerald-400'
                                      : 'text-amber-400'
                                  }`}>
                                    {track.rights_details === 'own_rights' ? '🔒 Own' : '🤝 Multi'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {track.album_name || <span className="text-gray-500 italic">—</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">{track.music_composer}</TableCell>
                          <TableCell className="text-gray-300">{track.singer_name}</TableCell>
                          <TableCell className="text-gray-300">{track.audio_language}</TableCell>
                          <TableCell className="text-gray-300">
                            {track.tempo || <span className="text-gray-500 italic">—</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {track.scale || <span className="text-gray-500 italic">—</span>}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {formatDate(track.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {track.mp3_file_path && (
                                <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                                  MP3
                                </Badge>
                              )}
                              {track.lyrics_file_path && (
                                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
                                  Lyrics
                                </Badge>
                              )}
                              {track.session_file_path && (
                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                                  Session
                                </Badge>
                              )}
                              {track.singer_agreement_file_path && (
                                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
                                  Singer Agr.
                                </Badge>
                              )}
                              {track.music_director_agreement_file_path && (
                                <Badge variant="secondary" className="bg-pink-500/20 text-pink-400 text-xs">
                                  Dir. Agr.
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {track.mp3_file_path && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => playTrack(track)}
                                  className={`h-8 w-8 p-0 ${
                                    audioPlayer.currentTrack?.id === track.id && audioPlayer.isPlaying
                                      ? 'text-orange-400 hover:text-orange-300' 
                                      : 'text-gray-400 hover:text-orange-400'
                                  }`}
                                  title={
                                    audioPlayer.currentTrack?.id === track.id && audioPlayer.isPlaying
                                      ? 'Pause' 
                                      : 'Play'
                                  }
                                  data-testid={`table-play-${track.id}`}
                                >
                                  {audioPlayer.currentTrack?.id === track.id && audioPlayer.isPlaying ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Link to={`/track/${track.id}`}>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-gray-400 hover:text-white h-8 w-8 p-0"
                                  title="View Details"
                                  data-testid={`table-view-${track.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              {track.mp3_file_path && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadFile(track.id, 'mp3', `${track.title}.mp3`)}
                                  className="text-gray-400 hover:text-green-400 h-8 w-8 p-0"
                                  title="Download MP3"
                                  data-testid={`table-download-mp3-${track.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Singer Agreement View */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => track.singer_agreement_file_path ? viewAgreement(track, 'singer') : null}
                                className={`h-8 w-8 p-0 ${
                                  track.singer_agreement_file_path 
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : 'text-red-400 hover:text-red-300 opacity-75 cursor-not-allowed'
                                }`}
                                title={track.singer_agreement_file_path ? 'View Singer Agreement' : 'No Singer Agreement'}
                                data-testid={`table-view-singer-agreement-${track.id}`}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              
                              {/* Music Director Agreement View */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => track.music_director_agreement_file_path ? viewAgreement(track, 'music_director') : null}
                                className={`h-8 w-8 p-0 ${
                                  track.music_director_agreement_file_path 
                                    ? 'text-pink-400 hover:text-pink-300'
                                    : 'text-red-400 hover:text-red-300 opacity-75 cursor-not-allowed'
                                }`}
                                title={track.music_director_agreement_file_path ? 'View Music Director Agreement' : 'No Music Director Agreement'}
                                data-testid={`table-view-director-agreement-${track.id}`}
                              >
                                <User className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
        </TabsContent>

        {/* Managers Tab Content - Admin Only */}
        {user?.user_type === 'admin' && (
          <TabsContent value="managers">
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Music Managers</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage team members and assign languages for content creation
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openManagerModal()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  data-testid="add-manager-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manager
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {managers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No managers found</h3>
                  <p className="text-gray-400 mb-4">Start by adding your first manager to organize music production</p>
                  <Button
                    onClick={() => openManagerModal()}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Manager
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800/50">
                        <TableHead className="text-gray-300 font-semibold">Full Name</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Email</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Mobile</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Assigned Language</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Added</TableHead>
                        <TableHead className="text-gray-300 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map((manager) => (
                        <TableRow 
                          key={manager.id} 
                          className="border-gray-700 hover:bg-gray-800/30 transition-colors"
                          data-testid={`manager-row-${manager.id}`}
                        >
                          <TableCell className="text-white font-medium">{manager.name}</TableCell>
                          <TableCell className="text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{manager.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {manager.phone ? (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{manager.phone}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-orange-500" />
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                {manager.assigned_language}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={manager.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                              {manager.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {formatDate(manager.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => viewManagerCredentials(manager)}
                                className="text-green-400 hover:text-green-300 h-8 w-8 p-0"
                                title="View Login Credentials"
                                data-testid={`view-credentials-${manager.id}`}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openManagerModal(manager)}
                                className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0"
                                title="Edit Manager"
                                data-testid={`edit-manager-${manager.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteManager(manager.id)}
                                className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                title="Delete Manager"
                                data-testid={`delete-manager-${manager.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Agreement Modal */}
      <Dialog open={agreementModal.isOpen} onOpenChange={closeAgreementModal}>
        <DialogContent className="glass bg-gray-900/95 border-gray-700 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {agreementModal.agreementType === 'singer' ? 'Singer Agreement' : 'Music Director Agreement'}
            </DialogTitle>
            <div className="text-gray-400 text-sm">
              <span className="font-medium">{agreementModal.track?.title}</span>
              {agreementModal.track?.unique_code && (
                <Badge className="ml-2 bg-orange-500/20 text-orange-400 border-orange-500/30">
                  #{agreementModal.track.unique_code}
                </Badge>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 max-h-[70vh] overflow-hidden">
            {agreementModal.fileUrl && (
              <div className="flex-1 overflow-hidden rounded-lg border border-gray-600">
                {isImageFile(agreementModal.fileName) ? (
                  // Display images directly
                  <div className="w-full h-full flex items-center justify-center bg-gray-800/50 p-4">
                    <img 
                      src={agreementModal.fileUrl} 
                      alt="Agreement" 
                      className="max-w-full max-h-[60vh] object-contain rounded"
                      onError={(e) => {
                        console.error('Failed to load agreement image');
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  // Display documents in iframe
                  <iframe
                    src={agreementModal.fileUrl}
                    className="w-full h-[60vh] bg-white rounded"
                    title={`${agreementModal.agreementType} Agreement`}
                    onError={() => {
                      console.error('Failed to load agreement document');
                    }}
                  />
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                <FileText className="h-4 w-4 inline mr-2" />
                {agreementModal.fileName}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const agreementType = agreementModal.agreementType === 'singer' ? 'singer_agreement' : 'music_director_agreement';
                    downloadFile(agreementModal.track.id, agreementType, `${agreementModal.track.title}_${agreementType}`);
                  }}
                  className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  onClick={closeAgreementModal}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Track FAB */}
      <Link to="/upload" className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full p-4 shadow-2xl hover-glow"
          data-testid="floating-add-track-btn"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>

      {/* Lyrics Modal - Temporarily removed for testing */}

      {/* Manager Modal */}
      <Dialog open={managerModal.isOpen} onOpenChange={(open) => !open && closeManagerModal()}>
        <DialogContent className="glass border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>{managerModal.editing ? "Edit Manager" : "Add New Manager"}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {managerModal.editing ? "Update manager information and language assignment" : "Create a new manager and assign a language for content management"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleManagerSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager-name" className="text-gray-300">Full Name *</Label>
                <Input
                  id="manager-name"
                  type="text"
                  value={managerForm.name}
                  onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                  required
                  placeholder="Enter full name"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  data-testid="manager-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manager-email" className="text-gray-300">Email ID *</Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={managerForm.email}
                  onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                  required
                  placeholder="manager@example.com"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  data-testid="manager-email-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manager-phone" className="text-gray-300">Mobile Number *</Label>
                <Input
                  id="manager-phone"
                  type="tel"
                  value={managerForm.phone}
                  onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })}
                  required
                  placeholder="+1 (555) 123-4567"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                  data-testid="manager-phone-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manager-language" className="text-gray-300">Assigned Language *</Label>
                <Select
                  value={managerForm.assigned_language}
                  onValueChange={(value) => setManagerForm({ ...managerForm, assigned_language: value })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white" data-testid="manager-language-select">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="English">🌍 English</SelectItem>
                    <SelectItem value="Telugu">🎭 Telugu</SelectItem>
                    <SelectItem value="Kannada">🎨 Kannada</SelectItem>
                    <SelectItem value="Tamil">🎪 Tamil</SelectItem>
                    <SelectItem value="Hindi">🇮🇳 Hindi</SelectItem>
                    <SelectItem value="Malayalam">🌴 Malayalam</SelectItem>
                    <SelectItem value="Bengali">🎵 Bengali</SelectItem>
                    <SelectItem value="Sanskrit">📿 Sanskrit</SelectItem>
                    <SelectItem value="Punjabi">🎺 Punjabi</SelectItem>
                    <SelectItem value="Bhojpuri">🎶 Bhojpuri</SelectItem>
                    <SelectItem value="Urdu">📖 Urdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!managerModal.editing && (
                <div className="space-y-2">
                  <Label htmlFor="manager-password" className="text-gray-300">Custom Password (Optional)</Label>
                  <Input
                    id="manager-password"
                    type="password"
                    value={managerForm.custom_password}
                    onChange={(e) => setManagerForm({ ...managerForm, custom_password: e.target.value })}
                    placeholder="Leave blank for auto-generated password"
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                    data-testid="manager-password-input"
                  />
                  <p className="text-xs text-gray-500">
                    💡 If left blank, a secure 12-character password will be auto-generated
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Manager Login Access</span>
              </h4>
              <p className="text-gray-300 text-sm">
                A manager account will be created with login credentials. {managerModal.editing ? 'Update the manager information as needed.' : 'You can set a custom password above, or let the system generate a secure one automatically. The credentials will be logged for you to share with the manager.'}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeManagerModal}
                className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                data-testid="save-manager-btn"
              >
                {managerModal.editing ? "Update Manager" : "Create Manager"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
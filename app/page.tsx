'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// Types
interface Project {
  id: string;
  name: string;
  githubRepo: string; // format: owner/repo
  driveFolderId: string;
  branch: string;
  createdAt: string;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha?: string;
  content?: string;
}

interface PushStatus {
  status: 'idle' | 'pushing' | 'success' | 'error';
  message: string;
}

// Icons
const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const UploadZipIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Helper to get file language for Monaco
function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
    'py': 'python',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return langMap[ext || ''] || 'plaintext';
}

export default function Home() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [pushStatus, setPushStatus] = useState<PushStatus>({ status: 'idle', message: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [newProject, setNewProject] = useState({ name: '', githubRepo: '', driveFolderId: '', branch: 'main' });
  const [modifiedFiles, setModifiedFiles] = useState<Map<string, string>>(new Map());
  const [downloadingProject, setDownloadingProject] = useState<string | null>(null);
  const [uploadingProject, setUploadingProject] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetProject, setUploadTargetProject] = useState<Project | null>(null);

  // Load projects and token from localStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem('pusher_projects');
    const savedToken = localStorage.getItem('pusher_github_token');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
    if (savedToken) {
      setGithubToken(savedToken);
    }
  }, []);

  // Save projects to localStorage
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('pusher_projects', JSON.stringify(projects));
    }
  }, [projects]);

  // Save token to localStorage
  useEffect(() => {
    if (githubToken) {
      localStorage.setItem('pusher_github_token', githubToken);
    }
  }, [githubToken]);

  // Fetch files from GitHub
  const fetchFiles = useCallback(async (project: Project, path: string = '') => {
    if (!githubToken) {
      alert('Please set your GitHub token in Settings first');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    try {
      const [owner, repo] = project.githubRepo.split('/');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${project.branch}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle both single file and directory responses
      const items: FileItem[] = Array.isArray(data) 
        ? data.map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'dir' : 'file',
            sha: item.sha,
          }))
        : [{
            name: data.name,
            path: data.path,
            type: 'file',
            sha: data.sha,
            content: atob(data.content),
          }];

      // Sort: folders first, then files
      items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      setFiles(items);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [githubToken]);

  // Fetch single file content
  const fetchFileContent = async (file: FileItem) => {
    if (!selectedProject || !githubToken) return;

    setLoading(true);
    try {
      const [owner, repo] = selectedProject.githubRepo.split('/');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${selectedProject.branch}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const content = atob(data.content);
      
      // Check if we have unsaved changes for this file
      const savedContent = modifiedFiles.get(file.path);
      
      setSelectedFile({ ...file, sha: data.sha });
      setOriginalContent(content);
      setEditorContent(savedContent || content);
    } catch (error: any) {
      console.error('Error fetching file:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileClick = (file: FileItem) => {
    if (file.type === 'dir') {
      fetchFiles(selectedProject!, file.path);
    } else {
      fetchFileContent(file);
    }
  };

  // Track modified files
  const handleEditorChange = (value: string | undefined) => {
    if (!selectedFile || value === undefined) return;
    setEditorContent(value);
    
    if (value !== originalContent) {
      setModifiedFiles(prev => new Map(prev).set(selectedFile.path, value));
    } else {
      setModifiedFiles(prev => {
        const next = new Map(prev);
        next.delete(selectedFile.path);
        return next;
      });
    }
  };

  // Push changes to GitHub
  const pushToGitHub = async () => {
    if (!selectedProject || !githubToken || modifiedFiles.size === 0) {
      alert('No changes to push');
      return;
    }

    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    setPushStatus({ status: 'pushing', message: 'Pushing changes...' });

    try {
      const [owner, repo] = selectedProject.githubRepo.split('/');
      
      for (const [filePath, content] of modifiedFiles) {
        // Get current file SHA
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${selectedProject.branch}`;
        const getResponse = await fetch(getUrl, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        let sha = '';
        if (getResponse.ok) {
          const data = await getResponse.json();
          sha = data.sha;
        }

        // Update file
        const updateUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(content))),
            sha: sha || undefined,
            branch: selectedProject.branch,
          }),
        });

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          throw new Error(error.message || 'Failed to push');
        }
      }

      setPushStatus({ status: 'success', message: `Successfully pushed ${modifiedFiles.size} file(s)!` });
      setModifiedFiles(new Map());
      setOriginalContent(editorContent);
      setCommitMessage('');

      // Auto-clear success message
      setTimeout(() => {
        setPushStatus({ status: 'idle', message: '' });
      }, 5000);

    } catch (error: any) {
      console.error('Push error:', error);
      setPushStatus({ status: 'error', message: error.message });
    }
  };

  // Add new project
  const addProject = () => {
    if (!newProject.name || !newProject.githubRepo) {
      alert('Please fill in project name and GitHub repo');
      return;
    }

    const project: Project = {
      id: Date.now().toString(),
      name: newProject.name,
      githubRepo: newProject.githubRepo,
      driveFolderId: newProject.driveFolderId,
      branch: newProject.branch || 'main',
      createdAt: new Date().toISOString(),
    };

    setProjects([...projects, project]);
    setNewProject({ name: '', githubRepo: '', driveFolderId: '', branch: 'main' });
    setShowAddProject(false);
  };

  // Delete project
  const deleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
        setFiles([]);
        setSelectedFile(null);
      }
    }
  };

  // Download repo as ZIP
  const downloadRepo = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!githubToken) {
      alert('Please set your GitHub token in Settings first');
      setShowSettings(true);
      return;
    }

    setDownloadingProject(project.id);

    try {
      const [owner, repo] = project.githubRepo.split('/');
      const response = await fetch(
        `/api/download?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(project.branch)}`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`Downloaded ${project.name}.zip to your Downloads folder!`);
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
    } finally {
      setDownloadingProject(null);
    }
  };

  // Trigger file input for upload
  const triggerUpload = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!githubToken) {
      alert('Please set your GitHub token in Settings first');
      setShowSettings(true);
      return;
    }
    setUploadTargetProject(project);
    fileInputRef.current?.click();
  };

  // Handle ZIP file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetProject) return;

    setUploadingProject(uploadTargetProject.id);

    try {
      const [owner, repo] = uploadTargetProject.githubRepo.split('/');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner', owner);
      formData.append('repo', repo);
      formData.append('branch', uploadTargetProject.branch);
      formData.append('commitMessage', `Update from ZIP upload - ${new Date().toLocaleString()}`);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      alert(`Success! ${result.message}`);
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploadingProject(null);
      setUploadTargetProject(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Select project
  const selectProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedFile(null);
    setEditorContent('');
    setModifiedFiles(new Map());
    fetchFiles(project);
  };

  // Navigate up
  const navigateUp = () => {
    if (!selectedFile) return;
    const parts = selectedFile.path.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    if (selectedProject) {
      fetchFiles(selectedProject, parentPath);
    }
  };

  const hasChanges = modifiedFiles.size > 0;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <UploadIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold">GitHub Pusher <span className="text-sm font-normal text-zinc-500">v1.1.0</span></h1>
              <p className="text-xs text-zinc-500">Push to GitHub from anywhere</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg">
              <span className={`status-dot ${githubToken ? 'connected' : 'disconnected'}`}></span>
              <span className="text-sm text-zinc-400">
                {githubToken ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar - Projects */}
        <aside className="w-72 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-zinc-300">Projects</h2>
              <button
                onClick={() => setShowAddProject(true)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-emerald-500"
              >
                <PlusIcon />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="text-sm">No projects yet</p>
                <button
                  onClick={() => setShowAddProject(true)}
                  className="mt-2 text-emerald-500 text-sm hover:underline"
                >
                  Add your first project
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map(project => (
                  <div
                    key={project.id}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      selectedProject?.id === project.id
                        ? 'bg-emerald-600/20 border border-emerald-600/50'
                        : 'hover:bg-zinc-800 border border-transparent'
                    }`}
                    onClick={() => selectProject(project)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{project.githubRepo}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => downloadRepo(project, e)}
                        disabled={downloadingProject === project.id}
                        className="p-1.5 hover:bg-blue-600/20 rounded transition-all text-blue-400 hover:text-blue-300"
                        title="Download ZIP"
                      >
                        {downloadingProject === project.id ? (
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <DownloadIcon />
                        )}
                      </button>
                      <button
                        onClick={(e) => triggerUpload(project, e)}
                        disabled={uploadingProject === project.id}
                        className="p-1.5 hover:bg-emerald-600/20 rounded transition-all text-emerald-400 hover:text-emerald-300"
                        title="Upload ZIP to GitHub"
                      >
                        {uploadingProject === project.id ? (
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <UploadZipIcon />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-all text-red-500"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {!selectedProject ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-zinc-800 flex items-center justify-center">
                  <FolderIcon />
                </div>
                <h3 className="text-xl font-semibold text-zinc-400">Select a Project</h3>
                <p className="text-zinc-500 mt-1">Choose a project from the sidebar to get started</p>
              </div>
            </div>
          ) : (
            <>
              {/* File Browser */}
              <div className="h-48 border-b border-zinc-800 flex flex-col">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{selectedProject.name}</h3>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                      {selectedProject.branch}
                    </span>
                  </div>
                  <button
                    onClick={() => fetchFiles(selectedProject)}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    disabled={loading}
                  >
                    <RefreshIcon />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {loading && files.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1">
                      {files.map(file => (
                        <button
                          key={file.path}
                          onClick={() => handleFileClick(file)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                            selectedFile?.path === file.path
                              ? 'bg-emerald-600/20 text-emerald-400'
                              : 'hover:bg-zinc-800'
                          } ${modifiedFiles.has(file.path) ? 'ring-1 ring-amber-500/50' : ''}`}
                        >
                          {file.type === 'dir' ? <FolderIcon /> : <FileIcon />}
                          <span className="text-sm truncate">{file.name}</span>
                          {modifiedFiles.has(file.path) && (
                            <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col min-h-0">
                {selectedFile ? (
                  <>
                    <div className="p-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-2">
                        <FileIcon />
                        <span className="text-sm font-medium">{selectedFile.path}</span>
                        {modifiedFiles.has(selectedFile.path) && (
                          <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                            Modified
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Editor
                        height="100%"
                        language={getLanguage(selectedFile.name)}
                        value={editorContent}
                        onChange={handleEditorChange}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: { top: 16 },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500">
                    <p>Select a file to edit</p>
                  </div>
                )}
              </div>

              {/* Push Bar */}
              <div className="border-t border-zinc-800 p-4 bg-zinc-900/80">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Commit message..."
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    onClick={pushToGitHub}
                    disabled={!hasChanges || pushStatus.status === 'pushing'}
                    className={`btn-primary flex items-center gap-2 ${
                      !hasChanges ? 'opacity-50 cursor-not-allowed' : 'animate-pulse-glow'
                    }`}
                  >
                    {pushStatus.status === 'pushing' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Pushing...
                      </>
                    ) : (
                      <>
                        <UploadIcon />
                        Push to GitHub
                        {hasChanges && (
                          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                            {modifiedFiles.size}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </div>

                {/* Status Messages */}
                {pushStatus.status !== 'idle' && pushStatus.status !== 'pushing' && (
                  <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 animate-fade-in ${
                    pushStatus.status === 'success' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                  }`}>
                    {pushStatus.status === 'success' ? <CheckIcon /> : <XIcon />}
                    {pushStatus.message}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg"
              >
                <XIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="input"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Create a token at{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:underline"
                  >
                    github.com/settings/tokens
                  </a>
                  {' '}with "repo" scope
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowSettings(false)} className="btn-primary">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Project</h2>
              <button
                onClick={() => setShowAddProject(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg"
              >
                <XIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Awesome Project"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  GitHub Repository
                </label>
                <input
                  type="text"
                  value={newProject.githubRepo}
                  onChange={(e) => setNewProject({ ...newProject, githubRepo: e.target.value })}
                  placeholder="username/repo-name"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Branch
                </label>
                <input
                  type="text"
                  value={newProject.branch}
                  onChange={(e) => setNewProject({ ...newProject, branch: e.target.value })}
                  placeholder="main"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Google Drive Folder ID (Optional)
                </label>
                <input
                  type="text"
                  value={newProject.driveFolderId}
                  onChange={(e) => setNewProject({ ...newProject, driveFolderId: e.target.value })}
                  placeholder="1abc123xyz..."
                  className="input"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Find this in the folder URL after /folders/
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddProject(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={addProject} className="btn-primary">
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for ZIP upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".zip"
        className="hidden"
      />
    </main>
  );
}

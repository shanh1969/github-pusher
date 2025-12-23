'use client';

import React, { useState, useEffect, useRef } from 'react';

// Types
interface Project {
  id: string;
  name: string;
  githubRepo: string;
  branch: string;
  createdAt: string;
}

// Icons
const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [newProject, setNewProject] = useState({ name: '', githubRepo: '', branch: 'main' });
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
      branch: newProject.branch || 'main',
      createdAt: new Date().toISOString(),
    };

    setProjects([...projects, project]);
    setNewProject({ name: '', githubRepo: '', branch: 'main' });
    setShowAddProject(false);
  };

  // Delete project
  const deleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  // Download repo as ZIP
  const downloadRepo = async (project: Project) => {
    if (!githubToken) {
      alert('Please set your GitHub token in Settings first');
      setShowSettings(true);
      return;
    }

    setDownloadingProject(project.id);

    try {
      const [owner, repo] = project.githubRepo.split('/');
      
      // Try to fetch package.json to get version number
      let version = '';
      try {
        const packageResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${project.branch}`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );
        if (packageResponse.ok) {
          const packageData = await packageResponse.json();
          const packageContent = JSON.parse(atob(packageData.content));
          if (packageContent.version) {
            version = `_v${packageContent.version}`;
          }
        }
      } catch (versionError) {
        console.log('Could not fetch version:', versionError);
      }
      
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
      const filename = `${project.name}${version}.zip`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`✅ Downloaded ${filename}`);
    } catch (error: any) {
      alert(`❌ Download failed: ${error.message}`);
    } finally {
      setDownloadingProject(null);
    }
  };

  // Trigger file input for upload
  const triggerUpload = (project: Project) => {
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('repo', uploadTargetProject.githubRepo);
      formData.append('branch', uploadTargetProject.branch);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      alert(`✅ Successfully uploaded to ${uploadTargetProject.name}!`);
    } catch (error: any) {
      alert(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploadingProject(null);
      setUploadTargetProject(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GitHubIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GitHub Pusher <span className="text-base font-normal text-zinc-500">v1.3.0</span></h1>
              <p className="text-sm text-zinc-500">Download & Upload ZIP files to GitHub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg">
              <span className={`w-3 h-3 rounded-full ${githubToken ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-zinc-400">
                {githubToken ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Add Project Button */}
        <button
          onClick={() => setShowAddProject(true)}
          className="w-full mb-6 p-4 border-2 border-dashed border-zinc-700 rounded-xl hover:border-emerald-500 hover:bg-zinc-900/50 transition-all flex items-center justify-center gap-3 text-zinc-400 hover:text-emerald-400"
        >
          <PlusIcon />
          <span className="text-lg font-medium">Add New Project</span>
        </button>

        {/* Projects List */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <GitHubIcon />
            <h3 className="text-xl font-semibold text-zinc-400 mt-4">No Projects Yet</h3>
            <p className="text-zinc-500 mt-2">Add your first GitHub project to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                    <p className="text-sm text-zinc-500">{project.githubRepo} • {project.branch}</p>
                  </div>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-2 hover:bg-red-600/20 rounded-lg transition-all text-red-500"
                    title="Delete Project"
                  >
                    <TrashIcon />
                  </button>
                </div>

                <div className="flex gap-4">
                  {/* Download Button */}
                  <button
                    onClick={() => downloadRepo(project)}
                    disabled={downloadingProject === project.id}
                    className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all"
                  >
                    {downloadingProject === project.id ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <DownloadIcon />
                        Download ZIP
                      </>
                    )}
                  </button>

                  {/* Upload Button */}
                  <button
                    onClick={() => triggerUpload(project)}
                    disabled={uploadingProject === project.id}
                    className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all"
                  >
                    {uploadingProject === project.id ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon />
                        Upload ZIP
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg"
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
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-lg"
                />
                <p className="text-sm text-zinc-500 mt-2">
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
              <button 
                onClick={() => setShowSettings(false)} 
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold transition-all"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Project</h2>
              <button
                onClick={() => setShowAddProject(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg"
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
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-lg"
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
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-lg"
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
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 text-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowAddProject(false)} 
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={addProject} 
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold transition-all"
              >
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

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface Project {
  id: string;
  name: string;
  repo: string;
  branch: string;
}

export default function GitHubPusher() {
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Update from mobile');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token') || '';
    const savedProjects = JSON.parse(localStorage.getItem('gh_projects') || '[]');
    setToken(savedToken);
    setProjects(savedProjects);
    if (savedProjects.length > 0) setActiveProject(savedProjects[0]);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('gh_token', token);
    setIsSettingsOpen(false);
    setStatus({ type: 'success', message: 'Settings saved!' });
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const addProject = () => {
    const name = prompt('Project Name:');
    const repo = prompt('Repo (owner/name):');
    const branch = prompt('Branch:', 'main');
    
    if (name && repo && branch) {
      const newProjects = [...projects, { id: Date.now().toString(), name, repo, branch }];
      setProjects(newProjects);
      localStorage.setItem('gh_projects', JSON.stringify(newProjects));
      setActiveProject(newProjects[newProjects.length - 1]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeProject) return;

    setIsUploading(true);
    setStatus({ type: 'pending', message: `Uploading ${files.length} file(s)...` });

    const formData = new FormData();
    const [owner, repo] = activeProject.repo.split('/');
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('owner', owner);
    formData.append('repo', repo);
    formData.append('branch', activeProject.branch);
    formData.append('commitMessage', commitMessage);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `token ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', message: 'Successfully pushed to GitHub!' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Upload failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error occurred' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold">GP</div>
          <h1 className="font-bold hidden sm:block">GitHub Pusher</h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            ⚙️
          </button>
          <button 
            onClick={addProject}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <span>+</span> <span className="hidden sm:inline">Project</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 sm:w-64 border-r border-zinc-800 bg-zinc-950 p-2 overflow-y-auto">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={`w-full text-left p-3 mb-1 rounded-lg transition-all truncate ${
                activeProject?.id === p.id ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' : 'hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              <div className="font-semibold text-sm sm:block hidden">{p.name}</div>
              <div className="text-[10px] opacity-60 sm:block hidden">{p.repo}</div>
              <div className="sm:hidden text-center font-bold">{p.name[0]}</div>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
          {activeProject ? (
            <div className="max-w-2xl mx-auto w-full space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">{activeProject.name}</h2>
                <p className="text-zinc-500 text-sm">Target: {activeProject.repo} ({activeProject.branch})</p>
              </div>

              {status.message && (
                <div className={`p-4 rounded-lg border animate-fade-in ${
                  status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 
                  status.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 
                  'bg-amber-500/10 border-amber-500/50 text-amber-400'
                }`}>
                  {status.message}
                </div>
              )}

              <div className="card space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Commit Message</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer group"
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📸</div>
                    <p className="font-medium">Add Photos or Files</p>
                    <p className="text-sm text-zinc-500">Tap to select from your device</p>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                    />
                  </div>

                  <button 
                    disabled={isUploading || !token}
                    onClick={() => fileInputRef.current?.click()}
                    className={`btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 ${isUploading ? 'opacity-50' : ''}`}
                  >
                    {isUploading ? (
                      <span className="animate-spin text-xl">⏳</span>
                    ) : (
                      '🚀 Push to GitHub'
                    )}
                  </button>
                </div>
              </div>

              {!token && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-500 text-sm">
                  ⚠️ You need to set your GitHub Token in settings before you can push.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <div className="text-6xl mb-4">👈</div>
              <p>Select or add a project to get started</p>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">GitHub Personal Access Token</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="text-[10px] text-zinc-500">Token needs "repo" scope. Stored locally in your browser.</p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button onClick={saveSettings} className="btn-primary flex-1">Save Changes</button>
                <button onClick={() => setIsSettingsOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
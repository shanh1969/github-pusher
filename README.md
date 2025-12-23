# GitHub Pusher

Push your code to GitHub from anywhere - mobile or desktop.

![GitHub Pusher](https://img.shields.io/badge/GitHub-Pusher-emerald)

## Features

- 📱 **Mobile-friendly** - Works great on phones and tablets
- 📁 **Multi-project support** - Manage up to 10+ projects
- ✏️ **Built-in code editor** - Syntax highlighting for all major languages
- 🚀 **One-click push** - Commit and push with a single tap
- 💾 **Track changes** - See which files you've modified
- 🔐 **Secure** - Your GitHub token stays in your browser

## Quick Start

### 1. Deploy to Vercel (2 minutes)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/github-pusher)

Or manually:

1. Fork/clone this repo to your GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your github-pusher repo
5. Click "Deploy"

### 2. Create a GitHub Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Name it "GitHub Pusher"
4. Check the **"repo"** scope (full control of repositories)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)

### 3. Configure the App

1. Open your deployed app
2. Click the ⚙️ Settings icon
3. Paste your GitHub token
4. Click "Save & Close"

### 4. Add Your Projects

1. Click the **"+"** button in the sidebar
2. Enter:
   - **Project Name**: A friendly name (e.g., "Work Order System")
   - **GitHub Repository**: `username/repo-name` format
   - **Branch**: Usually `main` or `master`
   - **Google Drive Folder ID**: (Optional) For future Drive integration
3. Click "Add Project"

## Usage

1. **Select a project** from the sidebar
2. **Browse files** in the file browser
3. **Click a file** to edit it
4. **Make your changes** in the editor
5. **Enter a commit message**
6. **Click "Push to GitHub"**

Done! Vercel will auto-deploy your changes.

## Workflow with Claude

The ideal workflow:

1. 💬 **Chat with Claude** - Tell Claude what changes you want
2. 📋 **Claude gives you code** - Copy the updated code
3. 📱 **Open GitHub Pusher** - On your phone or computer
4. 📄 **Select the file** - Navigate to the file to edit
5. 📝 **Paste the code** - Replace the content
6. 🚀 **Push** - One click to deploy

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save (track changes) | Auto-saved as you type |
| Search in file | Ctrl/Cmd + F |
| Go to line | Ctrl/Cmd + G |

## Troubleshooting

### "Not Connected" status
- Make sure you've entered your GitHub token in Settings
- Check that the token has "repo" scope
- Try generating a new token

### Can't see files
- Verify the repository name is correct (owner/repo format)
- Check the branch name
- Make sure your token has access to this repo

### Push fails
- Check your commit message isn't empty
- Verify you have write access to the repository
- The token might have expired - generate a new one

## Security Notes

- Your GitHub token is stored in your browser's localStorage
- It never leaves your device except to authenticate with GitHub
- Use a token with limited expiration for extra security
- You can revoke the token anytime at github.com/settings/tokens

## Tech Stack

- **Next.js 14** - React framework
- **Monaco Editor** - VS Code's editor
- **Tailwind CSS** - Styling
- **GitHub API** - Repository access
- **Vercel** - Hosting

## Future Features

- [ ] Google Drive integration (sync files to Drive first)
- [ ] Create new files
- [ ] Delete files
- [ ] View git history
- [ ] Branch switching
- [ ] Multiple file push in one commit

## License

MIT - Use it however you want!

---

Made with ❤️ for mobile developers

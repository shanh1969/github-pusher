import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization');

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const owner = formData.get('owner') as string;
    const repo = formData.get('repo') as string;
    const branch = formData.get('branch') as string || 'main';
    const commitMessage = formData.get('commitMessage') as string || 'Update from ZIP upload';

    if (!file || !owner || !repo) {
      return NextResponse.json({ error: 'Missing file, owner, or repo' }, { status: 400 });
    }

    // Read the ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Get all files from ZIP (GitHub ZIP has a root folder like "repo-branch-hash/")
    const files: { path: string; content: string }[] = [];

    // Find the root folder name (GitHub adds one)
    let rootFolder = '';
    for (const path of Object.keys(zip.files)) {
      if (zip.files[path].dir && path.split('/').length === 2) {
        rootFolder = path;
        break;
      }
    }

    // Extract all files
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        // Remove the root folder prefix if it exists
        let cleanPath = path;
        if (rootFolder && path.startsWith(rootFolder)) {
          cleanPath = path.substring(rootFolder.length);
        }

        // Skip if path is empty after removing root folder
        if (!cleanPath) continue;

        // Get file content as string (for text files) or base64 (for binary)
        const content = await zipEntry.async('base64');
        files.push({ path: cleanPath, content });
      }
    }

    // Push each file to GitHub
    const results = [];
    for (const file of files) {
      // Get current file SHA if it exists
      let sha = '';
      try {
        const getResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`,
          {
            headers: {
              'Authorization': token,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'GitHub-Pusher-App',
            },
          }
        );
        if (getResponse.ok) {
          const data = await getResponse.json();
          sha = data.sha;
        }
      } catch (e) {
        // File doesn't exist, that's OK
      }

      // Update/create file
      const updateResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': token,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'GitHub-Pusher-App',
          },
          body: JSON.stringify({
            message: commitMessage,
            content: file.content,
            sha: sha || undefined,
            branch: branch,
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        results.push({ path: file.path, success: false, error: error.message });
      } else {
        results.push({ path: file.path, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Uploaded ${successCount} files, ${failCount} failed`,
      results,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload ZIP' },
      { status: 500 }
    );
  }
}

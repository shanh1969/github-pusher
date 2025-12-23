import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization');

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const uploadedFiles = formData.getAll('files') as File[];
    const zipFile = formData.get('zipFile') as File | null;
    const owner = formData.get('owner') as string;
    const repo = formData.get('repo') as string;
    const branch = formData.get('branch') as string || 'main';
    const commitMessage = formData.get('commitMessage') as string || 'Update from GitHub Pusher';
    const targetPath = formData.get('path') as string || ''; // Optional subfolder

    if ((!uploadedFiles.length && !zipFile) || !owner || !repo) {
      return NextResponse.json({ error: 'Missing files, owner, or repo' }, { status: 400 });
    }

    const headers = {
      'Authorization': token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Pusher-App',
    };

    const filesToPush: { path: string; content: string }[] = [];

    // Handle ZIP file if provided
    if (zipFile) {
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      let rootFolder = '';
      for (const path of Object.keys(zip.files)) {
        if (zip.files[path].dir && path.split('/').length === 2) {
          rootFolder = path;
          break;
        }
      }

      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          let cleanPath = path;
          if (rootFolder && path.startsWith(rootFolder)) {
            cleanPath = path.substring(rootFolder.length);
          }
          if (!cleanPath) continue;
          const content = await zipEntry.async('base64');
          filesToPush.push({ path: cleanPath, content });
        }
      }
    }

    // Handle individual files/photos
    for (const file of uploadedFiles) {
      const buffer = await file.arrayBuffer();
      const base64Content = Buffer.from(buffer).toString('base64');
      const filePath = targetPath 
        ? `${targetPath.replace(/\/$/, '')}/${file.name}` 
        : file.name;
      
      filesToPush.push({ path: filePath, content: base64Content });
    }

    if (filesToPush.length === 0) {
      return NextResponse.json({ error: 'No files to upload' }, { status: 400 });
    }

    // Step 1: Get the current commit SHA of the branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      { headers }
    );

    if (!refResponse.ok) {
      const error = await refResponse.json();
      return NextResponse.json({ error: `Failed to get branch ref: ${error.message}` }, { status: 400 });
    }

    const refData = await refResponse.json();
    const currentCommitSha = refData.object.sha;

    // Step 2: Get the current tree SHA
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${currentCommitSha}`,
      { headers }
    );
    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // Step 3: Create blobs for all files
    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];

    for (const f of filesToPush) {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: f.content,
            encoding: 'base64',
          }),
        }
      );

      if (!blobResponse.ok) continue;

      const blobData = await blobResponse.json();
      treeItems.push({
        path: f.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // Step 4: Create a new tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      }
    );

    const treeData = await treeResponse.json();

    // Step 5: Create a new commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parents: [currentCommitSha],
        }),
      }
    );

    const newCommitData = await newCommitResponse.json();

    // Step 6: Update the branch reference
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false,
        }),
      }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully pushed ${filesToPush.length} files`,
      url: `https://github.com/${owner}/${repo}/commit/${newCommitData.sha}`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
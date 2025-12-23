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

    const headers = {
      'Authorization': token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Pusher-App',
    };

    // Read the ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find the root folder name (GitHub adds one like "repo-branch-hash/")
    let rootFolder = '';
    for (const path of Object.keys(zip.files)) {
      if (zip.files[path].dir && path.split('/').length === 2) {
        rootFolder = path;
        break;
      }
    }

    // Extract all files
    const files: { path: string; content: string }[] = [];
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        let cleanPath = path;
        if (rootFolder && path.startsWith(rootFolder)) {
          cleanPath = path.substring(rootFolder.length);
        }
        if (!cleanPath) continue;

        const content = await zipEntry.async('base64');
        files.push({ path: cleanPath, content });
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found in ZIP' }, { status: 400 });
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

    for (const f of files) {
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

      if (!blobResponse.ok) {
        console.error(`Failed to create blob for ${f.path}`);
        continue;
      }

      const blobData = await blobResponse.json();
      treeItems.push({
        path: f.path,
        mode: '100644', // Regular file
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // Step 4: Create a new tree with all files
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

    if (!treeResponse.ok) {
      const error = await treeResponse.json();
      return NextResponse.json({ error: `Failed to create tree: ${error.message}` }, { status: 500 });
    }

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

    if (!newCommitResponse.ok) {
      const error = await newCommitResponse.json();
      return NextResponse.json({ error: `Failed to create commit: ${error.message}` }, { status: 500 });
    }

    const newCommitData = await newCommitResponse.json();

    // Step 6: Update the branch reference to point to new commit
    const updateRefResponse = await fetch(
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

    if (!updateRefResponse.ok) {
      const error = await updateRefResponse.json();
      return NextResponse.json({ error: `Failed to update branch: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Pushed ${treeItems.length} files in a single commit`,
      commitSha: newCommitData.sha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommitData.sha}`,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload ZIP' },
      { status: 500 }
    );
  }
}

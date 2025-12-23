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
    const repoFullName = formData.get('repo') as string;
    const branch = formData.get('branch') as string || 'main';
    const commitMessage = formData.get('commitMessage') as string || 'Update from GitHub Pusher';

    if (!file || !repoFullName) {
      return NextResponse.json({ error: 'Missing file or repo' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    let rootFolder = '';
    const paths = Object.keys(zip.files);
    
    const firstPath = paths.find(p => !zip.files[p].dir);
    if (firstPath && firstPath.includes('/')) {
      const possibleRoot = firstPath.split('/')[0] + '/';
      const allHaveRoot = paths.every(p => p.startsWith(possibleRoot) || p === possibleRoot.slice(0, -1));
      if (allHaveRoot) {
        rootFolder = possibleRoot;
      }
    }

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

    const headers = {
      'Authorization': token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Pusher-App',
    };

    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      { headers }
    );

    if (!refResponse.ok) {
      const error = await refResponse.json();
      throw new Error(`Failed to get branch ref: ${error.message}`);
    }

    const refData = await refResponse.json();
    const currentCommitSha = refData.object.sha;

    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${currentCommitSha}`,
      { headers }
    );

    if (!commitResponse.ok) {
      throw new Error('Failed to get current commit');
    }

    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];

    for (const file of files) {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: file.content,
            encoding: 'base64',
          }),
        }
      );

      if (!blobResponse.ok) {
        continue;
      }

      const blobData = await blobResponse.json();
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    if (treeItems.length === 0) {
      throw new Error('Failed to create any file blobs');
    }

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
      throw new Error(`Failed to create tree: ${error.message}`);
    }

    const treeData = await treeResponse.json();

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
      throw new Error(`Failed to create commit: ${error.message}`);
    }

    const newCommitData = await newCommitResponse.json();

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
      throw new Error(`Failed to update branch: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${treeItems.length} files in a single commit`,
      commit: newCommitData.sha,
      filesUploaded: treeItems.length,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload ZIP' },
      { status: 500 }
    );
  }
}
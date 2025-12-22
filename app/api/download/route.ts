import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const branch = searchParams.get('branch') || 'main';
  const token = request.headers.get('Authorization');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo parameter' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`,
      {
        headers: {
          'Authorization': token,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Pusher-App',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.status}` },
        { status: response.status }
      );
    }

    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${repo}.zip"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to download from GitHub' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey, model, fileContext, projectName } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Claude API key' }, { status: 401 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Build system prompt with file context if provided
    let systemPrompt = `You are a helpful coding assistant. You help users understand, modify, and improve their code. When providing code changes, be specific about what files to modify and show the exact code. Keep responses concise but thorough.`;

    if (fileContext && projectName) {
      systemPrompt = `You are a helpful coding assistant working on the "${projectName}" project. The user has loaded the following files from their project. You can see all the code and should help them make changes.

When suggesting code changes:
1. Show the complete modified code (not just snippets)
2. Specify which file to modify
3. Explain what you changed and why

PROJECT FILES:
${fileContext}

Help the user make whatever changes they request to this codebase.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5-20251101',
        max_tokens: 4096,
        messages: messages,
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || 'Claude API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to chat with Claude' },
      { status: 500 }
    );
  }
}

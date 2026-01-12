# User Story: Building and Deploying with Shipbox

This document illustrates a typical user journey on the Shipbox platform, demonstrating how autonomous agents in secure sandboxes can build, preview, and deploy modern web applications.

## Meet Alex

Alex is a full-stack developer with a vision for a new "AI-powered task prioritizer." Alex doesn't want to spend hours setting up infrastructure, environment variables, or local development environments. Alex wants to start coding immediately.

## 1. Starting the Session

Alex opens their preferred AI assistant (connected to the Shipbox MCP server) and types:

> "I want to build a simple landing page for my new project, TaskFlow AI. Use Tailwind CSS and make it look professional. Give me a sandbox to work in."

The AI assistant calls `opencode_run_task`, which spins up a new Cloudflare Sandbox. It returns a `sessionId` and a **Web UI URL**. Alex clicks the link and sees the OpenCode environment ready to go.

## 2. Autonomous Development

Within the sandbox, the OpenCode agent gets to work:
- It initializes a new project directory: `/workspace/taskflow-landing`.
- It creates a `package.json` and installs dependencies.
- It writes a modern `index.ts` Worker file that serves a beautiful, responsive HTML page.

Alex watches the agent's progress in real-time through the command logs in the Shipbox dashboard.

## 3. Instant Preview

Once the first draft is ready, the agent says:

> "I've built the initial version of the landing page. I'm starting a preview now."

The agent automatically calls `opencode_preview_worker(workerPath: "/workspace/taskflow-landing/src/index.ts")`. Shipbox starts a Miniflare instance inside the sandbox on port 8787.

Alex receives a preview URL: `https://engine.shipbox.dev/preview/a1b2c3d4/`. Alex clicks it and is instantly looking at the live site, served directly from their isolated sandbox.

## 4. Human-in-the-Loop Refinement

Alex views the preview and notices something:

> "The header looks great, but let's make the 'Get Started' button a vibrant TaskFlow blue (#3b82f6) and add a feature section with some icons."

The agent acknowledges the feedback, updates the code in the sandbox, and Alex simply refreshes the preview tab to see the changes. No `git push`, no CI wait times, no local `npm run dev`.

## 5. Production Deployment

Alex is thrilled with the result:

> "This is perfect. Let's go live!"

The agent calls `opencode_deploy_worker(workerPath: "/workspace/taskflow-landing/src/index.ts")`. 
- Shipbox triggers a production bundle using `esbuild` within the sandbox.
- The bundled code is securely uploaded to the Cloudflare Workers for Platforms dispatch namespace.
- Real credentials (Alex's account tokens) are injected by the Shipbox proxy, so they never touch the sandbox.

The agent responds:

> "TaskFlow AI is now live at https://sandbox-a1b2c3d4.sandbox-preview-workers.workers.dev!"

## 6. Exploring the Platform

Alex now explores the rest of the platform:
- **Observability**: Alex checks the Honeycomb traces for the deployment to see how it performed.
- **Persistence**: Alex closes their laptop. An hour later, they resume the session on their phone. Shipbox has restored the sandbox state from R2, allowing the agent to pick up exactly where it left off.
- **Security**: Alex knows that even if the AI agent tried to access their GitHub tokens or Cloudflare keys directly, it wouldn't find them—they only exist in the zero-trust proxy.

## Conclusion

With Shipbox, Alex went from an idea to a globally deployed, production-ready landing page in minutes, all while staying in the flow of conversation. The platform provided the isolation, the tools, and the secure infrastructure Alex needed to let the AI do the heavy lifting.

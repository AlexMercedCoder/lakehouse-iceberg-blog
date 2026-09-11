---
title: "Hermes Agent with DeepSeek V4 and Slack: Current Setup Guide"
date: "2026-05-25"
pubDatetime: 2026-05-25T12:00:00Z
modDatetime: 2026-09-11T12:00:00Z
description: "Install Hermes Agent, choose a current DeepSeek provider, and connect Slack through Socket Mode with the tokens, scopes, events, and allowlist Hermes requires."
author: "Alex Merced"
category: "AI Tools & Software Development"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI Tools
  - Open Source
  - Hermes Agent
  - DeepSeek
  - Slack
slug: 2026-05-hermes-agent-free-deepseek-setup
draft: false
---

Hermes Agent is an open-source agent harness from Nous Research that can use multiple model providers and messaging platforms. A practical setup is to choose a currently available DeepSeek model, then connect Hermes to Slack with Socket Mode so the agent can run without a public webhook endpoint.

This guide was retested against the official Hermes documentation on September 11, 2026. It no longer promises that DeepSeek V4 or Nous Portal access is free: model names, plan entitlements, and prices change, and the current Nous Portal documentation describes a subscription gateway. Confirm the price shown by your chosen provider before running workloads.

## What You Will Configure

The finished setup has three parts:

1. Hermes Agent installed on a machine you control
2. A model provider selected through Hermes setup, with DeepSeek chosen when it is available to your account
3. A Slack app using Socket Mode, a bot token, an app-level token, and an explicit user allowlist

Hermes stores user configuration under `~/.hermes/`. Do not commit API keys or Slack tokens to a repository.

## Install Hermes Agent

On Linux, macOS, or WSL2, the official installer is:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Windows users can install the desktop application or use the PowerShell installer documented in the [Hermes quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart).

After installation, confirm the available commands on your installed version:

```bash
hermes --help
hermes setup --help
```

## Choose a DeepSeek Provider

There are two supported patterns. They have different billing and credential models.

### Option 1: Nous Portal

Nous Portal is the recommended integrated gateway in the Hermes documentation. It provides one OAuth flow for an inference provider and optional tool-gateway services:

```bash
hermes setup --portal
```

The setup flow opens or prints an authentication URL, lets you choose from models available to your account, and writes the selected provider configuration. Choose the current DeepSeek offering shown in the picker if that is the model you want.

Do not paste an old model identifier into `config.yaml`. The documented Portal catalog has changed over time, and an identifier copied from a dated article can fail even when another DeepSeek model is available. Review the [Nous Portal integration guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/integrations/nous-portal.md) and the plan-management screen for current availability and cost.

### Option 2: Direct DeepSeek API

If you want billing and credentials to come directly from DeepSeek, run the interactive provider setup:

```bash
hermes setup
```

Select a custom or DeepSeek-compatible provider when prompted, supply the API key through the secure setup flow, and use the base URL documented by DeepSeek:

```text
https://api.deepseek.com
```

DeepSeek maintains a dedicated [Hermes integration guide](https://api-docs.deepseek.com/quick_start/agent_integrations/hermes/). Use it to confirm the current model name and API settings rather than relying on a hard-coded example here.

## Verify the Model Before Adding Slack

Start with a local smoke test. The exact chat command can vary by release, so inspect `hermes --help` and start the interactive session offered by your installed version. Ask for a short response, then confirm:

- authentication succeeds;
- the selected provider and model are the ones you intended;
- usage appears in the expected provider account;
- tool calls work only with the permissions you want to grant.

Fix provider authentication before adding a messaging gateway. Otherwise, Slack delivery errors and model errors become difficult to distinguish.

## Configure Slack with Socket Mode

Hermes uses Slack's Bolt SDK and Socket Mode. You need a bot token beginning with `xoxb-` and an app-level token beginning with `xapp-`. Socket Mode uses a WebSocket connection, so the Hermes machine does not need a public HTTP endpoint.

### 1. Generate the Hermes Slack Manifest

Generate a current manifest rather than copying a static list of scopes and slash commands:

```bash
hermes slack manifest --agent-view --write
```

This writes `~/.hermes/slack-manifest.json`. In Slack's app dashboard, create an app **from a manifest**, choose the target workspace, paste the generated JSON, and review it before creation.

### 2. Enable Socket Mode and Create the App Token

In the Slack app settings:

1. Open **Settings > Socket Mode**.
2. Enable Socket Mode.
3. Create an app-level token with the `connections:write` scope.
4. Save the resulting `xapp-` token as `SLACK_APP_TOKEN`.

### 3. Verify Event Subscriptions and App Home

The generated manifest should declare the required events. Verify that the app subscribes to `message.im`, `message.mpim`, `message.channels`, and `app_mention`; add `message.groups` if it must operate in invited private channels.

Under **App Home**, enable the Messages tab and allow users to send messages and slash commands. Without this setting, direct messages can remain disabled even when the tokens and scopes are correct.

### 4. Install the App and Record the Bot Token

Install the app to the workspace and copy the Bot User OAuth Token beginning with `xoxb-`. If you change scopes later, reinstall the app so the new permissions take effect.

### 5. Configure an Explicit User Allowlist

Find your Slack member ID from your profile and add the required values to `~/.hermes/.env`:

```bash
SLACK_BOT_TOKEN=xoxb-replace-with-your-token
SLACK_APP_TOKEN=xapp-replace-with-your-token
SLACK_ALLOWED_USERS=U01REPLACE_WITH_MEMBER_ID
```

Hermes uses member IDs, not display names, for this allowlist. Keep it restrictive unless you have a deliberate multi-user security design.

### 6. Start the Gateway

The interactive path is:

```bash
hermes gateway setup
hermes gateway
```

Select Slack during setup. For a persistent user service, the official documentation also provides:

```bash
hermes gateway install
```

Invite the bot to each channel where it should respond:

```text
/invite @Hermes Agent
```

## Troubleshooting

### Direct Messages Are Disabled

Enable the Messages tab under Slack App Home and reinstall the app if its configuration changed.

### Direct Messages Work but Channels Do Not

Confirm `message.channels` is subscribed, invite the bot to the channel, and add `message.groups` for private channels.

### The Gateway Cannot Connect

Confirm that `SLACK_APP_TOKEN` starts with `xapp-`, has `connections:write`, and belongs to the same Slack app as the `xoxb-` bot token.

### Hermes Ignores a User

Check `SLACK_ALLOWED_USERS`. It must contain the person's Slack member ID, not their username or email address.

### A DeepSeek Model Is Missing or Rejected

Rerun the provider setup and choose a model currently offered to your account. Then confirm plan status, API credits, rate limits, and the provider's current model identifier. Do not assume that a model or free tier mentioned in an older article still exists.

## Security and Cost Checklist

- Store provider and Slack secrets only in protected environment files or a secret manager.
- Restrict `SLACK_ALLOWED_USERS` and invite the bot only to intended channels.
- Review the generated Slack manifest before installing it.
- Start with low usage limits and check the provider dashboard after the smoke test.
- Run Hermes under a dedicated operating-system account for an always-on deployment.
- Review tools that can execute commands, browse, or access private data before exposing the agent through chat.

For current commands and platform details, use the official [Hermes quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart), [configuration guide](https://hermes-agent.nousresearch.com/docs/user-guide/configuration), and [Slack setup guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/messaging/slack.md).

# Linearis

CLI tool for [Linear.app](https://linear.app) with JSON output, smart ID resolution, and optimized GraphQL queries. Designed for LLM agents and humans who prefer structured data.

> Forked from [czottmann/linearis](https://github.com/czottmann/linearis). This is a self-maintained fork — upstream is not synced automatically.

### Fork additions

- `--creator` filter on `issues list` and `issues search` (resolves by name, email, or UUID)
- `--since` filter on `issues list` and `issues search` (relative durations: `3d`, `1w`, `2m`, `1y`)
- `--fields` global flag to limit JSON output to specified fields (supports dot notation)
- `creator` field on all issue responses

## Setup

```bash
git clone https://github.com/j-0rdon/linearis.git
cd linearis
npm install && npm run build && npm link
```

Save a [Linear personal API key](https://linear.app/settings/api) to `~/.linear_api_token`:
```bash
echo "your-token-here" > ~/.linear_api_token
chmod 600 ~/.linear_api_token
```

## Command Examples

### Issues Management

```bash
# Show available tools
linearis

# Show available sub-tools
linearis issues
linearis labels

# List recent issues
linearis issues list -l 10

# Filter by creator (name, email, or UUID)
linearis issues list --creator jordon -l 10

# Filter by creation date (d=days, w=weeks, m=months, y=years)
linearis issues list --since 3d -l 25

# Combine filters
linearis issues list --creator jordon --since 1w -l 50

# Search for bugs in specific team/project
linearis issues search "authentication" --team Platform --project "Auth Service"

# Create new issue with labels and assignment
linearis issues create "Fix login timeout" --team Backend --assignee user123 \
  --labels "Bug,Critical" --priority 1 --description "Users can't stay logged in"

# Read issue details (supports ABC-123 format)  
linearis issues read DEV-456

# Update issue status and priority
linearis issues update ABC-123 --status "In Review" --priority 2

# Add labels to existing issue
linearis issues update DEV-789 --labels "Frontend,UX" --label-by adding

# Set parent-child relationships (output includes parentIssue and subIssues fields)
linearis issues update SUB-001 --parent-ticket EPIC-100

# Clear all labels from issue
linearis issues update ABC-123 --clear-labels
```

### Comments

```bash
# Add comment to issue
linearis comments create ABC-123 --body "Fixed in PR #456"
```

### File Downloads

```bash
# Get issue details including embedded files
linearis issues read ABC-123
# Returns JSON with embeds array containing file URLs and expiration timestamps

# Download a file from Linear storage
linearis embeds download "https://uploads.linear.app/.../file.png?signature=..." --output ./screenshot.png

# Overwrite existing file
linearis embeds download "https://uploads.linear.app/.../file.png?signature=..." --output ./screenshot.png --overwrite
```

### File Uploads

```bash
# Upload a file to Linear storage
linearis embeds upload ./screenshot.png
# Returns: { "success": true, "assetUrl": "https://uploads.linear.app/...", "filename": "screenshot.png" }

# Use with comments
URL=$(linearis embeds upload ./bug.png | jq -r .assetUrl)
linearis comments create ABC-123 --body "See attached: ![$URL]($URL)"
```

### Documents

Linear Documents are standalone markdown files that can be associated with projects or teams. Use `--attach-to` to link documents to issues.

```bash
# Create a document
linearis documents create --title "API Design" --content "# Overview\n\nThis document..."

# Create document in a project and attach to an issue
linearis documents create --title "Bug Analysis" --project "Backend" --attach-to ABC-123

# List all documents
linearis documents list

# List documents selectively
linearis documents list --project "Backend"
linearis documents list --issue ABC-123

# Read a document
linearis documents read <document-id>

# Update a document
linearis documents update <document-id> --title "New Title" --content "Updated content"

# Delete (trash) a document
linearis documents delete <document-id>
```

### Projects & Labels

```bash
# List all projects
linearis projects list

# List labels for specific team
linearis labels list --team Backend
```

### Teams & Users

```bash
# List all teams in the workspace
linearis teams list

# List all users
linearis users list

# List only active users
linearis users list --active
```

### Cycles

You can list and read cycles (sprints) for teams. The CLI exposes simple helpers, but the GraphQL API provides a few cycle-related fields you can use to identify relatives (active, next, previous).

```bash
# List cycles (optionally scope to a team)
linearis cycles list --team Backend --limit 10

# Show only the active cycle(s) for a team
linearis cycles list --team Backend --active

# Read a cycle by ID or by name (optionally scope name lookup with --team)
linearis cycles read "Sprint 2025-10" --team Backend
```

Ordering and getting "active +/- 1"

- The cycles returned by the API include fields `isActive`, `isNext`, `isPrevious` and a numerical `number` field. The CLI will prefer an active/next/previous candidate when resolving ambiguous cycle names.
- To get the active and the next cycle programmatically, do two calls locally:
  1. `linearis cycles list --team Backend --active --limit 1` to get the active cycle and its `number`.
  2. `linearis cycles list --team Backend --limit 10` and pick the cycle with `number = (active.number + 1)` or check `isNext` on the returned nodes.
- If multiple cycles match a name and none is marked active/next/previous, the CLI will return an error listing the candidates so you can use a precise ID or scope with `--team`.

#### Flag Combinations

The `cycles list` command supports several flag combinations:

**Valid combinations:**

- `cycles list` - All cycles across all teams
- `cycles list --team Backend` - All Backend cycles
- `cycles list --active` - Active cycles from all teams
- `cycles list --team Backend --active` - Backend's active cycle only
- `cycles list --team Backend --around-active 3` - Backend's active cycle ± 3 cycles

**Invalid combinations:**

- `cycles list --around-active 3` - ❌ Error: requires `--team`

**Note:** Using `--active --around-active` together works but `--active` is redundant since `--around-active` always includes the active cycle.

### Lean Output with --fields

Use the global `--fields` flag to limit JSON output to specific fields. Supports dot notation for nested fields.

```bash
# Full output (all fields)
linearis issues list -l 5

# Lean output (specific fields only)
linearis --fields identifier,title,creator.name issues list -l 5

# Combine with filters for efficient agent queries
linearis --fields identifier,title,state.name issues list --creator jordon --since 3d
```

### Advanced Usage

```bash
# Show all available commands and options (LLM agents love this!)
linearis usage

# Combine with other tools (pipe JSON output)
linearis issues list -l 5 | jq '.[] | .identifier + ": " + .title'
```

## Installation

### From source

```bash
git clone https://github.com/j-0rdon/linearis.git
cd linearis
npm install
npm run build
npm link
```

### Development setup

```bash
git clone https://github.com/j-0rdon/linearis.git
cd linearis
npm install
npm start  # Development mode using tsx (no compilation needed)
```

## Authentication

You can authenticate by passing in your API token via `--api-token` flag:

```bash
linearis --api-token <token> issues list
```

… OR by storing it in an environment variable `LINEAR_API_TOKEN`:

```bash
LINEAR_API_TOKEN=<token> linearis issues list
```

… OR by storing it in `~/.linear_api_token` once, and then forgetting about it because the tool will check that file automatically:

```bash
# Save token once:
echo "<token>" > ~/.linear_api_token

# Day-to-day, just use the tool
linearis issues list
```

### Getting a Linear API key/token

1. Log in to your Linear account
1. Go to _Settings_ → _Security & Access_ → _Personal API keys_
1. Create a new API key

## Example rule for your LLM agent

```markdown
We track our tickets and projects in Linear (https://linear.app), a project management tool. We use the `linearis` CLI tool for communicating with Linear. Use your Bash tool to call the `linearis` executable. Run `linearis usage` to see usage information.

The ticket numbers follow the format "ABC-<number>". Always reference tickets by their number.

If you create a ticket, and it's not clear which project to assign it to, prompt the user. When creating subtasks, use the project of the parent ticket by default.

When the the status of a task in the ticket description has changed (task → task done), update the description accordingly. When updating a ticket with a progress report that is more than just a checkbox change, add that report as a ticket comment.

The `issues read` command returns an `embeds` array containing files uploaded to Linear (screenshots, documents, etc.) with signed download URLs and expiration timestamps. Use `embeds download` to download these files when needed.
```

## Credits

Originally created by [Carlo Zottmann](https://github.com/czottmann). See [upstream repo](https://github.com/czottmann/linearis) for the original project and its contributors.

## License

[MIT](LICENSE.md)

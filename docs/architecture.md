<!-- Generated: 2025-01-09T12:34:56+00:00 -->

# Architecture

Linearis follows a modular, service-oriented architecture with clear separation of concerns. The application uses a command-based structure with Commander.js, optimized GraphQL service layers for Linear API integration, and utility modules for cross-cutting concerns like authentication and output formatting.

The architecture emphasizes performance through GraphQL batch operations, single-query optimizations, and smart ID resolution for user convenience. All components are fully typed with TypeScript interfaces, ensuring type safety throughout the application. The system uses both direct GraphQL queries and SDK fallbacks for optimal performance.

## Component Map

### Command Layer - CLI Interface

- **src/main.ts** - Main program setup with Commander.js, command routing, and global options
- **src/commands/issues.ts** - Issue management commands (list, search, create, read, update) with creator/date filtering, enhanced label and parent management
- **src/commands/projects.ts** - Project operations commands (list, read)
- **src/commands/comments.ts** - Comment operations (create) with lightweight issue ID resolution
- **src/commands/teams.ts** - Team operations (list) with workspace team discovery
- **src/commands/users.ts** - User operations (list) with active user filtering

### Service Layer - Business Logic

- **src/utils/graphql-service.ts** - GraphQL client wrapper with error handling and batch operation support
- **src/utils/graphql-issues-service.ts** - Optimized GraphQL operations for issues (single queries, batch resolving)
- **src/utils/linear-service.ts** - Complete Linear API service with smart ID resolution and SDK operations
- **src/queries/** - GraphQL query definitions and fragments for optimized operations
- **src/utils/auth.ts** - Authentication handling with multiple token source support
- **src/utils/output.ts** - JSON output formatting, global --fields filtering, and error handling utilities
- **src/utils/date-parser.ts** - Relative date parsing for --since filtering (3d, 1w, 2m, 1y → ISO 8601)

### Type System - Data Contracts

- **src/utils/linear-types.d.ts** - TypeScript interfaces for Linear entities (LinearIssue, LinearProject, etc.)

## Key Files

### Core Architecture Components

**Main Entry Point**

- src/main.ts - Sets up Commander.js program with global options (--api-token, --fields) and subcommand registration. Uses preAction hook to apply --fields filter before command execution.

**GraphQL Service Layer**

- src/utils/graphql-service.ts (lines 8-62) - GraphQLService class with raw GraphQL execution and batch operations
- src/utils/graphql-issues-service.ts (lines 25-604) - GraphQLIssuesService with single-query optimized operations
- src/queries/issues.ts (lines 13-301) - Optimized GraphQL queries and mutations for issue operations

**Legacy Service Layer**

- src/utils/linear-service.ts (lines 11-484) - LinearService class with SDK- based API methods and fallback operations
- src/utils/auth.ts (lines 18-38) - getApiToken function with fallback authentication sources

**Command Handlers**

- src/commands/issues.ts (lines 10-210) - setupIssuesCommands with all issue operations
- src/commands/projects.ts (lines 9-30) - setupProjectsCommands with project operations
- src/commands/teams.ts (lines 8-47) - setupTeamsCommands with team listing operations
- src/commands/users.ts (lines 8-49) - setupUsersCommands with user listing operations

## Data Flow

### Command Execution Flow with File References

1. **Command Parsing** - src/main.ts (lines 23-24) parses CLI arguments via Commander.js
2. **Authentication** - src/utils/auth.ts (lines 18-38) resolves API token from multiple sources
3. **Service Creation** - src/utils/linear-service.ts (lines 479-484) creates authenticated LinearService
4. **API Operations** - Service methods execute optimized GraphQL queries with parallel fetching
5. **Response Formatting** - src/utils/output.ts outputs structured JSON responses, filtered by --fields if set

### Smart ID Resolution Process

Linear API uses UUIDs internally, but users prefer human-readable identifiers:

**Issue Resolution** (src/utils/linear-service.ts lines 193-290)

- Input: "ABC-123" → Parse team key and issue number → Query by team.key + issue.number → Return UUID

**Project Resolution** (lines 398-415)

- Input: "Mobile App" → Query projects by name → Return project UUID

**Team Resolution** (lines 449-473)

- Input: "ABC" → Try team key first, then team name → Return team UUID

### GraphQL Optimization Pattern

**Single Query Strategy** (src/utils/graphql-issues-service.ts lines 32-46)

```typescript
// Replaces 1 + (5 × N) API calls with single GraphQL query
const result = await this.graphQLService.rawRequest(GET_ISSUES_QUERY, {
  first: limit,
  orderBy: "updatedAt" as any,
});
```

**Batch Resolution Pattern** (src/utils/graphql-issues-service.ts lines 149-153)

```typescript
// Single query to resolve all IDs (labels, projects, teams)
const resolveResult = await this.graphQLService.rawRequest(
  BATCH_RESOLVE_FOR_UPDATE_QUERY,
  resolveVariables,
);
```

This eliminates N+1 query problems by using GraphQL's ability to fetch complex relationships in single requests.

**Server-Side Filtering Pattern** (src/utils/graphql-issues-service.ts)

```typescript
// Filters applied at GraphQL level — no over-fetching
const filter: any = {};
if (finalCreatorId) filter.creator = { id: { eq: finalCreatorId } };
if (args.since) filter.createdAt = { gte: args.since };
// Linear returns only matching issues
```

**Lean Output Pattern** (src/utils/output.ts)

The global `--fields` flag filters JSON output to only include specified fields, reducing response size by ~97% for targeted queries. Supports dot notation for nested fields (e.g. `creator.name`).

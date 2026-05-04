#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { commandCenterTools, handleTool } from "./tools.js";

const server = new McpServer({
  name: "command-center",
  version: "0.1.0",
});

for (const tool of commandCenterTools) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    async (args: unknown) => handleTool(tool.name, args),
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Command Center MCP server running on stdio");

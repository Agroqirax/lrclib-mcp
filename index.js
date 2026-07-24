#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.LRCLIB_API_BASE || "https://lrclib.net/api";
const USER_AGENT =
  process.env.LRCLIB_USER_AGENT ||
  "lrclib-mcp/1.0.0 (+https://github.com/agroqirax/lrclib-mcp)";

async function lrclibFetch(path, params) {
  const url = new URL(API_BASE + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "X-User-Agent": USER_AGENT,
      "Lrclib-Client": USER_AGENT,
    },
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message
        : `HTTP ${res.status}`;
    throw new Error(`lrclib.net error (${res.status}): ${message}`);
  }

  return body;
}

function stripLyricsFile(data) {
  if (Array.isArray(data)) {
    return data.map(stripLyricsFile);
  }
  if (data && typeof data === "object") {
    const { lyricsfile, ...rest } = data;
    return rest;
  }
  return data;
}

function textResult(data) {
  return {
    content: [
      { type: "text", text: JSON.stringify(stripLyricsFile(data), null, 2) },
    ],
  };
}

const server = new McpServer({
  name: "lrclib-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_lyrics",
  {
    title: "Get lyrics",
    description:
      "Get the best-matching lyrics record for a track from lrclib.net using exact signature parameters (track name, artist name, and duration). This is the recommended way to fetch lyrics when you know the precise track metadata, since it returns a single exact match rather than a search result list.",
    inputSchema: {
      track_name: z.string().describe("Title of the track"),
      artist_name: z.string().describe("Name of the artist"),
      album_name: z
        .string()
        .optional()
        .describe("Name of the album (optional, improves match accuracy)"),
      duration: z
        .number()
        .optional()
        .describe(
          "Track duration in seconds (optional, but recommended for exact match)",
        ),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ track_name, artist_name, album_name, duration }) => {
    const data = await lrclibFetch("/get", {
      track_name,
      artist_name,
      album_name,
      duration,
    });
    return textResult(data);
  },
);

server.registerTool(
  "get_lyrics_by_id",
  {
    title: "Get lyrics by ID",
    description:
      "Get a specific lyrics record from lrclib.net by its numeric record ID, e.g. an ID returned from a previous search_lyrics call.",
    inputSchema: {
      id: z.union([z.string(), z.number()]).describe("The lyrics record ID"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ id }) => {
    const data = await lrclibFetch(`/get/${encodeURIComponent(id)}`);
    return textResult(data);
  },
);

server.registerTool(
  "search_lyrics",
  {
    title: "Search lyrics",
    description:
      "Search lrclib.net for lyrics records matching a query. Provide either a generic 'q' query, or more specific track_name/artist_name/album_name fields. Returns a list of matching records (may be empty).",
    inputSchema: {
      q: z
        .string()
        .optional()
        .describe(
          "Generic search query, matched against track title, artist name, and album name",
        ),
      track_name: z.string().optional().describe("Filter by track title"),
      artist_name: z.string().optional().describe("Filter by artist name"),
      album_name: z.string().optional().describe("Filter by album name"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ q, track_name, artist_name, album_name }) => {
    if (!q && !track_name && !artist_name && !album_name) {
      throw new Error(
        "At least one of q, track_name, artist_name, or album_name must be provided",
      );
    }
    const data = await lrclibFetch("/search", {
      q,
      track_name,
      artist_name,
      album_name,
    });
    return textResult(data);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

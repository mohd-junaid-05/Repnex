"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { ParseResult, ParsedFile } from "@/parser/types";

export interface ToolCallState {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  status: "running" | "completed" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallState[];
  isStreaming?: boolean;
  error?: string;
}

interface AskPanelProps {
  analysisId?: string;
  data: ParseResult;
  selectedFile: string | null;
  selectedNodeId: string | null;
  onSelectFile: (path: string) => void;
  onDeselect: () => void;
}

/** Summarize tool inputs into a compact inline label */
function formatToolCallInput(tool: string, input: Record<string, unknown>): string {
  if (!input || Object.keys(input).length === 0) return "";
  if (tool === "search_files" && typeof input.query === "string") {
    return `query="${input.query}"`;
  }
  if (tool === "file_neighbors" && typeof input.filePath === "string") {
    return `file="${input.filePath}"`;
  }
  if (tool === "transitive_walk") {
    const file = typeof input.filePath === "string" ? input.filePath : "";
    const dir = typeof input.direction === "string" ? input.direction : "";
    return `${file} (${dir})`;
  }
  if (tool === "list_files_by_role" && typeof input.role === "string") {
    return `role="${input.role}"`;
  }
  if (tool === "route_table" && typeof input.filter === "string") {
    return `filter="${input.filter}"`;
  }
  return Object.entries(input)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");
}

/** Summarize tool output into a single short count/status line */
function summarizeToolOutput(tool: string, output?: string): string {
  if (!output) return "Done";
  try {
    const parsed = JSON.parse(output);
    if (tool === "search_files") {
      const count = parsed.totalMatches ?? parsed.count ?? 0;
      return `${count} match${count === 1 ? "" : "es"}`;
    }
    if (tool === "file_neighbors") {
      const fanIn = parsed.fanIn ?? 0;
      const fanOut = parsed.fanOut ?? 0;
      return `${fanIn} dependents, ${fanOut} dependencies`;
    }
    if (tool === "transitive_walk") {
      const count = parsed.totalReachableFiles ?? 0;
      return `${count} reachable files`;
    }
    if (tool === "route_table") {
      const count = parsed.matchedRoutes ?? parsed.totalRoutes ?? 0;
      return `${count} route${count === 1 ? "" : "s"}`;
    }
    if (tool === "list_files_by_role") {
      const count = parsed.files?.length ?? parsed.availableRoles?.length ?? 0;
      return `${count} item${count === 1 ? "" : "s"}`;
    }
    if (tool === "summary") {
      return `${parsed.totalFiles ?? 0} files, ${parsed.totalEdges ?? 0} edges`;
    }
  } catch {
    // fallback if non-JSON
  }
  return "Completed";
}

export function AskPanel({
  analysisId,
  data,
  selectedFile,
  selectedNodeId,
  onSelectFile,
  onDeselect,
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Set of known repository file paths for clickable inline references
  const filePathsSet = useMemo(() => new Set(data.files.map((f: ParsedFile) => f.path)), [data.files]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleToolExpanded = (toolId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || input).trim();
      if (!query || isStreaming) return;

      if (!analysisId) {
        alert("No active analysis ID found for this session.");
        return;
      }

      setInput("");

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: query,
      };

      const initialAssistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        toolCalls: [],
        isStreaming: true,
      };

      const updatedHistory = [...messages, userMessage];
      setMessages([...updatedHistory, initialAssistantMessage]);
      setIsStreaming(true);

      const selectedContext = selectedFile
        ? { file: selectedFile }
        : selectedNodeId
        ? { folder: selectedNodeId === "" ? "root" : selectedNodeId }
        : undefined;

      try {
        const response = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisId,
            messages: updatedHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            selectedContext,
          }),
        });

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => "");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    error: `Request failed (${response.status}): ${errText || response.statusText}`,
                  }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            if (!block.trim()) continue;

            let event = "message";
            let eventData = "";

            const rawLines = block.split("\n");
            for (const line of rawLines) {
              if (line.startsWith("event:")) {
                event = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                eventData = line.replace("data:", "").trim();
              }
            }

            if (!eventData) continue;

            let parsedData: {
              tool?: string;
              input?: Record<string, unknown>;
              output?: string;
              text?: string;
              message?: string;
            } = {};
            try {
              parsedData = JSON.parse(eventData);
            } catch {
              parsedData = { text: eventData };
            }

            if (event === "tool_start") {
              const toolName = parsedData.tool || "lookup";
              const toolInput = parsedData.input || {};
              const toolId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  const currentTools = m.toolCalls || [];
                  return {
                    ...m,
                    toolCalls: [
                      ...currentTools,
                      {
                        id: toolId,
                        tool: toolName,
                        input: toolInput,
                        status: "running",
                      },
                    ],
                  };
                })
              );
            } else if (event === "tool_end") {
              const toolName = parsedData.tool;
              const toolOutput = parsedData.output;

              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  const currentTools = m.toolCalls || [];
                  const toolIdx = currentTools.findLastIndex(
                    (tc) => tc.tool === toolName && tc.status === "running"
                  );
                  if (toolIdx === -1) return m;

                  const nextTools = [...currentTools];
                  nextTools[toolIdx] = {
                    ...nextTools[toolIdx],
                    output: toolOutput,
                    status: "completed",
                  };
                  return { ...m, toolCalls: nextTools };
                })
              );
            } else if (event === "chunk") {
              const delta = parsedData.text || "";
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  return {
                    ...m,
                    content: m.content + delta,
                  };
                })
              );
            } else if (event === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                )
              );
            } else if (event === "error") {
              const errorText = parsedData.message || "An error occurred during query execution.";
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        error: errorText,
                      }
                    : m
                )
              );
            }
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  error: `Stream error: ${errorMsg}`,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, analysisId, messages, selectedFile, selectedNodeId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** Render text with clickable monospace file links */
  const renderFormattedText = (text: string) => {
    // Regex matches `inline code`
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        const clean = part.slice(1, -1);
        const isFile = filePathsSet.has(clean);

        if (isFile) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectFile(clean)}
              className="inline-block font-mono text-[11px] px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:underline border border-indigo-200 dark:border-indigo-800 cursor-pointer mx-0.5"
              title="Click to locate on canvas"
            >
              {clean}
            </button>
          );
        }

        return (
          <code
            key={index}
            className="font-mono text-[11px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
          >
            {clean}
          </code>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 text-xs">
      {/* Context Scope Bar */}
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
            Scope
          </span>
          {selectedFile ? (
            <span
              className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold truncate bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700"
              title={selectedFile}
            >
              {selectedFile}
            </span>
          ) : selectedNodeId ? (
            <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold truncate bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
              folder: {selectedNodeId === "" ? "root" : selectedNodeId}
            </span>
          ) : (
            <span className="text-zinc-600 dark:text-zinc-400 font-sans">
              Entire repository
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(selectedFile || selectedNodeId) && (
            <button
              type="button"
              onClick={onDeselect}
              className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-mono cursor-pointer"
              title="Clear selection focus"
            >
              Deselect
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-mono cursor-pointer"
              title="Clear conversation"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Ask anything about the codebase. Every answer queries the real parsed dependency
              graph and streams its tool lookups.
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                Suggested questions
              </span>
              <button
                type="button"
                onClick={() => handleSend("where is authentication handled?")}
                className="text-left px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
              >
                Where is authentication handled?
              </button>
              {selectedFile ? (
                <button
                  type="button"
                  onClick={() => handleSend("what breaks if I change that?")}
                  className="text-left px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
                >
                  What breaks if I change this file?
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleSend("show the route table")}
                className="text-left px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
              >
                Show the route table
              </button>
              <button
                type="button"
                onClick={() => handleSend("list files by role")}
                className="text-left px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
              >
                List files by role
              </button>
              <button
                type="button"
                onClick={() => handleSend("is this code any good?")}
                className="text-left px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
              >
                Is this code any good?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>{msg.role === "user" ? "You" : "Agent"}</span>
              </div>

              {msg.role === "user" ? (
                <div className="max-w-[90%] px-3 py-2 rounded-md bg-indigo-600 text-white font-mono break-words leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  {/* Tool Call Cards */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans font-semibold">
                        Lookups ({msg.toolCalls.length})
                      </div>
                      {msg.toolCalls.map((tc) => {
                        const isExpanded = Boolean(expandedTools[tc.id]);
                        const inputSummary = formatToolCallInput(tc.tool, tc.input);
                        const outputSummary = summarizeToolOutput(tc.tool, tc.output);

                        return (
                          <div
                            key={tc.id}
                            className="flex flex-col rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleToolExpanded(tc.id)}
                              className="px-2 py-1.5 flex items-center justify-between text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {tc.status === "running" ? (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                )}
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {tc.tool}
                                </span>
                                {inputSummary && (
                                  <span className="text-zinc-500 dark:text-zinc-400 truncate text-[10px]">
                                    {inputSummary}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                  {tc.status === "running" ? "running..." : outputSummary}
                                </span>
                                <span className="text-zinc-400 text-[10px]">
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[10px] font-mono flex flex-col gap-1.5 overflow-x-auto">
                                <div>
                                  <span className="text-zinc-400 uppercase tracking-wider block mb-0.5">
                                    Input
                                  </span>
                                  <pre className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                    {JSON.stringify(tc.input, null, 2)}
                                  </pre>
                                </div>
                                {tc.output && (
                                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-1.5">
                                    <span className="text-zinc-400 uppercase tracking-wider block mb-0.5">
                                      Output
                                    </span>
                                    <pre className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                      {tc.output}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && (
                    <div className="px-3 py-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                      {renderFormattedText(msg.content)}
                    </div>
                  )}

                  {/* Error Card */}
                  {msg.error && (
                    <div className="px-3 py-2 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-mono leading-relaxed">
                      {msg.error}
                    </div>
                  )}

                  {/* Streaming indicator */}
                  {msg.isStreaming && !msg.content && (!msg.toolCalls || msg.toolCalls.length === 0) && (
                    <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono">
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                      <span>Running tool lookups...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex flex-col gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedFile
                ? `Ask about ${selectedFile}... (Enter to send)`
                : "Ask about this repository... (Enter to send)"
            }
            rows={2}
            disabled={isStreaming}
            className="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 disabled:opacity-50"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              Shift+Enter for newline
            </span>
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-xs font-medium rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isStreaming ? "Looking up..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

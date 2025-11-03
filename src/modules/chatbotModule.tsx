import { useEffect, useRef, useState } from "react";
import "./../App.css";
import type { ChatGptMessage } from "./../type/ChatGptMessage";

import { IconButton, Tooltip } from "@mui/material";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

const Chatbot = () => {
      const [chatGptMessages, setChatGptMessages] = useState<ChatGptMessage[]>([]);
      const [input, setInput] = useState("");
      const [isEnlarged, setIsEnlarged] = useState(false);
      const bottomRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, [chatGptMessages]);

      const handleNewPrompt = async () => {
            if (!input.trim()) return;

            // Step 1: Add user message to the prompt
            const updatedHistory: ChatGptMessage[] = [
                  ...chatGptMessages,
                  { role: "user", content: input },
            ];
            setChatGptMessages(updatedHistory);

            // Step 2: Send full history to the backend
            const response = await fetch('/chat', {
                  method: 'POST',
                  headers: {
                        'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ prompt: updatedHistory }),
            });

            if (!response.ok || !response.body) {
                  console.error("Stream failed");
                  return;
            }

            // Step 3: Stream assistant response
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let assistantContent = "";
            while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });

                  const chunks = buffer.split("\n");
                  buffer = chunks.pop() || "";

                  for (const chunk of chunks) {
                        if (chunk.startsWith("data:")) {
                              const json = chunk.replace("data:", "").replace("null", "").trim();
                              try {
                                    const parsed = JSON.parse(json);
                                    const chunkText = parsed.content;

                                    assistantContent += chunkText;

                                    // Optional: show streaming in progress (overwrite last assistant message)
                                    setChatGptMessages(prev => {
                                          const temp = [...prev];
                                          const last = temp[temp.length - 1];
                                          if (last?.role === "assistant") {
                                                temp[temp.length - 1] = {
                                                      ...last,
                                                      content: assistantContent
                                                };
                                          } else {
                                                temp.push({ role: "assistant", content: assistantContent });
                                          }
                                          return temp;
                                    });
                              } catch (err) {
                                    console.error("Failed to parse JSON chunk:", json, err);
                              }
                        }
                  }
            }
            setInput("");
      };

      return (
            <div
                  className={`relative transition-all duration-300 ${isEnlarged ? 'fixed inset-0 z-50 bg-white' : ''}`}
            >
                  <div
                        className="sticky top-0 z-50 w-full flex items-center justify-between px-4 py-3 border-b"
                        style={{
                              backgroundColor: 'oklch(64.8% 0.2 131.684)',
                              borderBottomColor: 'oklch(76.8% 0.233 130.85)',
                        }}
                  >
                        <h1 className="text-white text-lg font-semibold">EEA ChatBot</h1>
                        <IconButton
                              onClick={() => setIsEnlarged(!isEnlarged)}
                              size="small"
                              aria-label="enlarge"
                              style={{ color: 'white' }}
                        >
                              <Tooltip title={isEnlarged ? "Minimize" : "Enlarge"}>
                                    <OpenInFullIcon />
                              </Tooltip>
                        </IconButton>
                  </div>

                  <div className={`flex flex-col ${isEnlarged ? 'h-[calc(100vh-60px)]' : 'min-h-[500px]'}`}>
                        {/* Messages Area */}
                        <div
                              className={`flex-grow ${chatGptMessages.length === 0
                                    ? "flex items-center justify-center"
                                    : "overflow-y-auto"
                                    }`}
                              style={{ padding: chatGptMessages.length === 0 ? 0 : "1rem" }}
                        >
                              {chatGptMessages.length === 0 ? (
                                    <div className="w-full flex flex-col items-center justify-center text-center px-4">
                                          <div className="text-xl font-semibold">What can I help with?</div>
                                          <div className="max-w-2xl w-full mb-6">
                                                <div className="relative w-full">
                                                      <textarea
                                                            value={input}
                                                            rows={2}
                                                            onChange={(e) => setInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                  if (e.key === "Enter" && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleNewPrompt();
                                                                  }
                                                            }}
                                                            className="w-full border border-gray-300 rounded-lg p-3 pr-12 focus:outline-none resize-none"
                                                            placeholder="Ask something..."
                                                      />
                                                      <IconButton
                                                            onClick={handleNewPrompt}
                                                            color="success"
                                                            size="small"
                                                            aria-label="run"
                                                            disabled={!input.trim()}
                                                            className="!absolute bottom-2 right-2"
                                                      >
                                                            <Tooltip title="Execute">
                                                                  <ArrowCircleRightIcon fontSize="large" />
                                                            </Tooltip>
                                                      </IconButton>
                                                </div>
                                          </div>

                                    </div>
                              ) : (
                                    <div className="flex flex-col space-y-3 w-full max-w-2xl mx-auto mt-4">
                                          {chatGptMessages.map((m, index) => (
                                                <div
                                                      key={index}
                                                      className={`w-full flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                      <div
                                                            className={`p-3 rounded-lg shadow whitespace-pre-wrap max-w-md
                   ${m.role === "user" ? "bg-blue-100 text-black" : "bg-gray-100 text-black"}`}
                                                      >
                                                            <span>{m.content}</span>
                                                      </div>
                                                </div>
                                          ))}

                                          <div ref={bottomRef} />
                                    </div>
                              )}
                        </div>

                        {/* Sticky input only when messages exist */}
                        {chatGptMessages.length > 0 && (
                              <div className="sticky bottom-0 bg-white pt-3 pb-2 px-4">
                                    <div className="flex items-center gap-2 max-w-2xl mx-auto relative w-full">
                                          <textarea
                                                value={input}
                                                rows={2}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                      if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleNewPrompt();
                                                      }
                                                }}
                                                className="flex-grow border border-gray-300 rounded-lg p-3 pr-12 focus:outline-none resize-none"
                                                placeholder="Ask something..."
                                          />
                                          <IconButton
                                                onClick={handleNewPrompt}
                                                color="success"
                                                size="small"
                                                aria-label="run"
                                                disabled={!input.trim()}
                                                className="!absolute bottom-2 right-2"
                                          >
                                                <Tooltip title="Execute">
                                                      <ArrowCircleRightIcon fontSize="large" />
                                                </Tooltip>
                                          </IconButton>
                                    </div>
                              </div>
                        )}
                  </div>
            </div>
      );
}

export default Chatbot;

export interface ChatGptMessage {
  role: "user" | "assistant";
  content: string;
}
import { useState } from "react";
import "./App.css";
import Chatbot from "./modules/chatbotModule";

import { IconButton, Tooltip } from "@mui/material";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";

function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);

  return (
    <div className="relative h-screen">
      {/* Centered Button */}
      <div className="flex items-center justify-center h-full">
        <Tooltip title="Start Chat">
          <IconButton
            onClick={() => setShowChatbot((prev) => !prev)}
            size="large"
            style={{
              backgroundColor: '#007B6C',
              color: 'white',
            }}
            className="hover:opacity-90 transition"
          >
            <ArrowCircleRightIcon style={{ fontSize: 60 }} />
          </IconButton>
        </Tooltip>
      </div>

      {/* Chatbot Popup */}
      <div
        className={`transition-all duration-500 ${
          isEnlarged
            ? "fixed inset-0 z-50 bg-white"
            : `fixed bottom-4 right-4 w-100 h-[600px] bg-white border border-gray-300 shadow-xl rounded-xl ${showChatbot ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`
        }`}
      >
        <div className="h-full overflow-auto">
          <Chatbot isEnlarged={isEnlarged} setIsEnlarged={setIsEnlarged} />
        </div>
      </div>
    </div>
  );
}

export default App;


import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import type { DisplayMessage } from "./types";

interface ChatMessageBubbleProps {
  message: DisplayMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-5 py-3 rounded-2xl text-[0.92rem] leading-relaxed ${
          isUser
            ? "bg-[#C05621] text-white rounded-br-md"
            : "bg-white border border-[#C05621]/[0.06] text-[#1B2432] rounded-bl-md shadow-sm"
        }`}
      >
        {isUser ? (
          message.text
        ) : (
          <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>strong]:text-[#1B2432]">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {message.images.map((url, imgIdx) => (
              <img
                key={imgIdx}
                src={url}
                alt=""
                className="rounded-lg w-full h-24 object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Streaming message bubble — shows partial content as it arrives.
 */
export function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[80%] px-5 py-3 rounded-2xl rounded-bl-md text-[0.92rem] leading-relaxed bg-white border border-[#C05621]/[0.06] text-[#1B2432] shadow-sm">
        <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
          <ReactMarkdown>{content}</ReactMarkdown>
          <span className="inline-block w-1.5 h-4 bg-[#C05621]/60 animate-pulse ml-0.5 align-text-bottom" />
        </div>
      </div>
    </motion.div>
  );
}

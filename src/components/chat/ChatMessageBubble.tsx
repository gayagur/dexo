import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Pencil } from "lucide-react";
import type { DisplayMessage } from "./types";

interface ChatMessageBubbleProps {
  message: DisplayMessage;
  onRegenerate?: () => void;
  onEditImage?: (url: string) => void;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  onRegenerate,
  onEditImage,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  const renderedMarkdown = useMemo(
    () => <ReactMarkdown>{message.text}</ReactMarkdown>,
    [message.text]
  );

  const hasImages = message.images && message.images.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[82%] text-[0.92rem] leading-relaxed ${
          isUser
            ? "bg-terracotta text-cream rounded-sm rounded-br-none px-5 py-3"
            : "bg-white border border-terracotta/[0.07] text-navy rounded-sm rounded-bl-none shadow-sm"
        } ${hasImages ? "overflow-hidden" : "px-5 py-3"}`}
      >
        {/* Text content */}
        {message.text && (
          <div className={hasImages ? "px-5 pt-3 pb-2" : ""}>
            {isUser ? (
              <span>{message.text}</span>
            ) : (
              <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>strong]:text-navy font-sans">
                {renderedMarkdown}
              </div>
            )}
          </div>
        )}

        {/* Generated images - premium display */}
        {hasImages && (
          <div className="mt-1">
            {message.images!.map((url, imgIdx) => (
              <GeneratedImage
                key={imgIdx}
                url={url}
                index={imgIdx}
                onEdit={onEditImage ? () => onEditImage(url) : undefined}
              />
            ))}

            {/* Action row */}
            {!isUser && (onRegenerate || onEditImage) && (
              <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-stone hover:text-terracotta transition-colors py-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

/** Individual generated image with lazy load + fade-in */
function GeneratedImage({
  url,
  index,
  onEdit,
}: {
  url: string;
  index: number;
  onEdit?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-sm border border-navy/10 mx-3 mb-3 mt-2">
      {/* Blur placeholder */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            className="absolute inset-0 bg-cream-warm animate-pulse"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <motion.img
        src={url}
        alt={`AI generated design ${index + 1}`}
        loading="lazy"
        className="w-full object-contain max-h-[400px]"
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onLoad={() => setLoaded(true)}
      />

      {/* Edit overlay button */}
      {onEdit && loaded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={onEdit}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-navy/80 backdrop-blur-sm text-cream text-xs font-sans font-medium rounded-sm hover:bg-navy transition-colors"
          aria-label="Edit image"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </motion.button>
      )}
    </div>
  );
}

/**
 * Streaming message bubble — shows partial content as it arrives.
 * Not memoized since content changes on every chunk (after debounce).
 */
export function StreamingBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[82%] px-5 py-3 rounded-sm rounded-bl-none text-[0.92rem] leading-relaxed bg-white border border-terracotta/[0.07] text-navy shadow-sm font-sans">
        <div className="prose prose-sm prose-stone max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
          <ReactMarkdown>{content}</ReactMarkdown>
          <span className="inline-block w-1.5 h-4 bg-terracotta/60 animate-pulse ml-0.5 align-text-bottom" />
        </div>
      </div>
    </motion.div>
  );
}


import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

type Props = {
  input: string;
  onInputChange: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  sending: boolean;
  disabled: boolean;
  placeholder?: string;
};

const ChatRoomInput: React.FC<Props> = ({
  input,
  onInputChange,
  onSend,
  sending,
  disabled,
  placeholder,
}) => (
  <footer className="sticky bottom-0 p-4 md:p-6 bg-sidebar border-t border-sidebar-border z-10">
    <form
      className="flex gap-2 md:gap-4 max-w-xl mx-auto"
      onSubmit={onSend}
    >
      <input
        type="text"
        className="flex-1 rounded-full px-3 md:px-4 py-2 md:py-3 bg-card text-foreground placeholder:opacity-60 placeholder:text-muted-foreground outline-none border-none focus:ring-2 focus:ring-accent transition-colors duration-300 text-[15px] md:text-base"
        placeholder={placeholder}
        value={input}
        onChange={e => onInputChange(e.target.value)}
        disabled={sending || disabled}
        autoFocus
      />
      <Button
        type="submit"
        className="bg-accent text-accent-foreground font-bold px-5 md:px-7 py-2 md:py-3 text-base md:text-lg hover:bg-accent/80 transition-colors duration-300 flex items-center"
        disabled={!input.trim() || sending || disabled}
      >
        {sending ? <Loader2Icon className="animate-spin mr-2 text-accent" /> : "Send"}
      </Button>
    </form>
  </footer>
);

export default ChatRoomInput;

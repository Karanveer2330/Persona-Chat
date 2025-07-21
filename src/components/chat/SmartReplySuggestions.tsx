
"use client";
import { Button } from "@/src/components/ui/button";
import { Sparkles } from "lucide-react";

interface SmartReplySuggestionsProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  isLoading?: boolean;
}

export default function SmartReplySuggestions({ suggestions, onSelectSuggestion, isLoading }: SmartReplySuggestionsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 animate-pulse text-primary" />
        <span>Generating smart replies...</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2 pt-1">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Suggested Replies:</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((reply, index) => (
          <Button
            key={index}
            onClick={() => onSelectSuggestion(reply)}
            className="text-xs h-auto py-1 px-2.5 bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent-foreground"
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
}

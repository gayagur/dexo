import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export interface FaqDraft {
  localKey: string;
  question: string;
  answer: string;
}

interface BlogFaqEditorProps {
  items: FaqDraft[];
  onChange: (items: FaqDraft[]) => void;
  disabled?: boolean;
}

export function BlogFaqEditor({ items, onChange, disabled }: BlogFaqEditorProps) {
  const [openKey, setOpenKey] = useState<string | null>(items[0]?.localKey ?? null);

  const add = () => {
    const k = crypto.randomUUID();
    onChange([...items, { localKey: k, question: "", answer: "" }]);
    setOpenKey(k);
  };

  const remove = (key: string) => {
    onChange(items.filter((i) => i.localKey !== key));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const patch = (key: string, field: "question" | "answer", val: string) => {
    onChange(items.map((i) => (i.localKey === key ? { ...i, [field]: val } : i)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">FAQs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Shown on the public post and in FAQ structured data.</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={add} disabled={disabled}>
          <Plus className="w-4 h-4" />
          Add FAQ
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border/70 bg-muted/10">
          No FAQs yet. Add questions your readers might ask.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <Collapsible key={item.localKey} open={openKey === item.localKey} onOpenChange={(o) => setOpenKey(o ? item.localKey : null)}>
              <Card className="border-border/70 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="p-0 border-0">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                    >
                      {openKey === item.localKey ? (
                        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground rotate-180" />
                      )}
                      <span className="text-sm font-medium truncate flex-1">
                        {item.question.trim() || `FAQ ${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={disabled || idx === 0}
                          onClick={() => move(idx, -1)}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={disabled || idx === items.length - 1}
                          onClick={() => move(idx, 1)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          disabled={disabled}
                          onClick={() => remove(item.localKey)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-4 pb-4 space-y-3 border-t border-border/40">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Question</label>
                      <Input
                        value={item.question}
                        onChange={(e) => patch(item.localKey, "question", e.target.value)}
                        disabled={disabled}
                        className="mt-1 rounded-lg"
                        placeholder="What should readers know?"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Answer</label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) => patch(item.localKey, "answer", e.target.value)}
                        disabled={disabled}
                        className="mt-1 rounded-lg min-h-[100px] resize-y"
                        placeholder="Clear, helpful answer…"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}

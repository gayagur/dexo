import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BlogFaq } from "@/lib/database.types";

interface BlogFaqSectionProps {
  faqs: BlogFaq[];
}

export function BlogFaqSection({ faqs }: BlogFaqSectionProps) {
  if (!faqs.length) return null;

  return (
    <section className="mt-16 pt-12 border-t border-border/70" aria-labelledby="blog-faq-heading">
      <h2 id="blog-faq-heading" className="font-serif text-2xl sm:text-3xl font-semibold text-foreground mb-2">
        Questions & answers
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xl">
        Quick answers about this topic. Have more questions? Reach out through DEXO anytime.
      </p>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {faqs.map((f, i) => (
          <AccordionItem
            key={f.id}
            value={f.id}
            className="border border-border/70 rounded-xl px-4 bg-card/50 data-[state=open]:shadow-sm transition-shadow"
          >
            <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4 text-[15px]">
              {f.question || `Question ${i + 1}`}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed pb-4 whitespace-pre-wrap">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

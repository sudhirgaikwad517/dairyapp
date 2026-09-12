import type { ReactNode } from "react";

export function ContentCard({ children }: { children: ReactNode }) {
  return (
    <div className="milk-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">{children}</div>
  );
}

export function ProseContent({ children }: { children: ReactNode }) {
  return <div className="prose-dairy space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">{children}</div>;
}

export function MarkdownText({ text }: { text: string }) {
  const blocks = text.split("\n\n");
  return (
    <ProseContent>
      {blocks.map((block, i) => {
        const isHeading = block.startsWith("**") && block.includes(":**");
        if (isHeading) {
          const [title, ...rest] = block.split(":**");
          return (
            <div key={i}>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">
                {title.replace(/\*\*/g, "")}
              </h2>
              <p>{rest.join(":**").trim()}</p>
            </div>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </ProseContent>
  );
}

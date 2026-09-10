import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/reveal";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("container-page py-16 sm:py-24", className)}>
      <Reveal className="mx-auto mb-12 max-w-2xl text-center">
        {eyebrow ? (
          <p className="text-primary mb-2 text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-3 text-lg text-balance">{description}</p>
        ) : null}
      </Reveal>
      {children}
    </section>
  );
}

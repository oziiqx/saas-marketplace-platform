import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is this a real product?",
    a: "No - Ledgerline is a flagship portfolio project. It is a fully working full-stack application (auth, RBAC, payments abstraction, analytics, an API platform) built to demonstrate production-grade architecture with Next.js, TypeScript and Prisma.",
  },
  {
    q: "How does the payment abstraction work?",
    a: "Every provider (Stripe, PayPal, PayU, plus a built-in Mock) implements the same PaymentProviderAdapter interface - checkout, subscriptions, refunds, and signed webhook verification. The app talks to the interface; swapping providers is a config change.",
  },
  {
    q: "What powers the analytics?",
    a: "A dedicated analytics engine computes MRR/ARR, ARPU, gross and net revenue churn, and net MRR retention from the subscription and invoice tables, with pre-aggregated daily rollups feeding the charts.",
  },
  {
    q: "Can I run it locally?",
    a: "Yes. `docker compose up -d`, copy `.env.example`, then `npm run setup` seeds hundreds of realistic records. Sign in with the demo accounts printed in the README.",
  },
  {
    q: "How is access controlled?",
    a: "Role-based access control (ADMIN, SELLER, CUSTOMER) is enforced at the edge in middleware, again in server actions via permission assertions, and reflected in dynamic per-role layouts and navigation.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="mx-auto w-full max-w-2xl">
      {FAQS.map((faq) => (
        <AccordionItem key={faq.q} value={faq.q}>
          <AccordionTrigger>{faq.q}</AccordionTrigger>
          <AccordionContent>{faq.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

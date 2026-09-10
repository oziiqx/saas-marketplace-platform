"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createProductSchema, WIZARD_STEPS } from "@/lib/validations/product";
import { createProductAction } from "@/server/actions/products";
import { formatMoney, parsePriceToCents } from "@/lib/money";

type WizardValues = z.input<typeof createProductSchema>;

const STEP_META: Record<
  (typeof WIZARD_STEPS)[number],
  { title: string; fields: (keyof WizardValues)[] }
> = {
  basics: { title: "Basics", fields: ["name", "categoryId", "shortDescription", "description"] },
  media: { title: "Media & files", fields: ["thumbnailUrl", "galleryUrls", "assets"] },
  pricing: { title: "Pricing", fields: ["pricingTiers"] },
  seo: { title: "SEO", fields: ["seoTitle", "seoDescription", "seoKeywords", "ogImageUrl"] },
  review: { title: "Review", fields: [] },
};

export function ProductWizard({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const step = WIZARD_STEPS[stepIndex];

  const form = useForm<WizardValues>({
    resolver: zodResolver(createProductSchema) as unknown as Resolver<WizardValues>,
    mode: "onTouched",
    defaultValues: {
      name: "",
      categoryId: "",
      shortDescription: "",
      description: "",
      thumbnailUrl: "",
      galleryUrls: [],
      assets: [],
      pricingTiers: [
        { name: "Standard", description: "", price: "29", currency: "usd", interval: "ONE_TIME", features: [] },
      ],
      seoTitle: "",
      seoDescription: "",
      seoKeywords: [],
      ogImageUrl: "",
      status: "DRAFT",
    },
  });

  const tiers = useFieldArray({ control: form.control, name: "pricingTiers" });
  const assets = useFieldArray({ control: form.control, name: "assets" });

  const next = async () => {
    const valid = await form.trigger(STEP_META[step].fields as never, { shouldFocus: true });
    if (valid) setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  };

  const submit = (status: "DRAFT" | "PUBLISHED") => {
    form.setValue("status", status);
    void form.handleSubmit((values) => {
      startTransition(async () => {
        const result = await createProductAction(values);
        if (result.ok) {
          toast.success(result.message ?? "Product created");
          router.push("/seller/products");
        } else {
          toast.error(result.error);
        }
      });
    })();
  };

  const simulateUpload = () => {
    assets.append({
      fileName: `bundle-v${assets.fields.length + 1}.zip`,
      fileUrl: `https://cdn.ledgerline.dev/uploads/${crypto.randomUUID()}`,
      fileSizeBytes: Math.floor(Math.random() * 80_000_000) + 4_000_000,
      mimeType: "application/zip",
      version: "1.0.0",
    });
  };

  const values = form.watch();

  return (
    <Form {...form}>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <ol className="flex gap-2 lg:flex-col">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => i < stepIndex && setStepIndex(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  i === stepIndex && "bg-accent font-medium",
                  i < stepIndex && "text-muted-foreground hover:bg-accent/60",
                  i > stepIndex && "text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    i < stepIndex && "border-primary bg-primary text-primary-foreground",
                    i === stepIndex && "border-primary",
                  )}
                >
                  {i < stepIndex ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="hidden lg:inline">{STEP_META[s].title}</span>
              </button>
            </li>
          ))}
        </ol>

        <Card>
          <CardHeader>
            <CardTitle>{STEP_META[step].title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === "basics" && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product name</FormLabel>
                      <FormControl>
                        <Input placeholder="Nebula Dashboard UI Kit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short description</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="One line buyers see in the catalog" {...field} />
                      </FormControl>
                      <FormDescription>{field.value?.length ?? 0} / 280</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full description</FormLabel>
                      <FormControl>
                        <Textarea rows={8} placeholder="What's included, formats, licensing…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step === "media" && (
              <>
                <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://…/cover.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>Deliverable files</FormLabel>
                  <div className="space-y-2">
                    {assets.fields.map((asset, i) => (
                      <div key={asset.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                        <UploadCloud className="text-muted-foreground size-4" />
                        <span className="flex-1 truncate font-mono text-xs">
                          {form.watch(`assets.${i}.fileName`)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {(Number(form.watch(`assets.${i}.fileSizeBytes`)) / 1_000_000).toFixed(1)} MB
                        </span>
                        <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => assets.remove(i)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={simulateUpload}>
                    <UploadCloud className="size-4" />
                    Simulate file upload
                  </Button>
                  {form.formState.errors.assets ? (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.assets.message ?? "Upload at least one deliverable"}
                    </p>
                  ) : null}
                </div>
              </>
            )}

            {step === "pricing" && (
              <div className="space-y-4">
                {tiers.fields.map((tier, i) => (
                  <div key={tier.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tier {i + 1}</span>
                      {tiers.fields.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => tiers.remove(i)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`pricingTiers.${i}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pricingTiers.${i}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (USD)</FormLabel>
                            <FormControl>
                              <Input inputMode="decimal" placeholder="29.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pricingTiers.${i}.interval`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ONE_TIME">One-time</SelectItem>
                                <SelectItem value="MONTH">Monthly</SelectItem>
                                <SelectItem value="YEAR">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pricingTiers.${i}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <Input placeholder="For solo makers" {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FeaturesEditor index={i} form={form} />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    tiers.append({
                      name: `Tier ${tiers.fields.length + 1}`,
                      description: "",
                      price: "49",
                      currency: "usd",
                      interval: "ONE_TIME",
                      features: [],
                    })
                  }
                >
                  <Plus className="size-4" />
                  Add tier
                </Button>
                {form.formState.errors.pricingTiers?.message ? (
                  <p className="text-destructive text-sm">{form.formState.errors.pricingTiers.message}</p>
                ) : null}
              </div>
            )}

            {step === "seo" && (
              <>
                <FormField
                  control={form.control}
                  name="seoTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SEO title</FormLabel>
                      <FormControl>
                        <Input placeholder={values.name || "Product - Category"} {...field} />
                      </FormControl>
                      <FormDescription>{field.value?.length ?? 0} / 70</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seoDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta description</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormDescription>{field.value?.length ?? 0} / 320</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <KeywordsEditor form={form} />
                <div className="bg-muted/40 rounded-lg border p-4">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {values.seoTitle || values.name || "Product title"}
                  </p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-500">
                    ledgerline.dev › products › {(values.name || "product").toLowerCase().replace(/\s+/g, "-")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {values.seoDescription || values.shortDescription || "Meta description preview…"}
                  </p>
                </div>
              </>
            )}

            {step === "review" && (
              <div className="space-y-4 text-sm">
                <ReviewRow label="Name" value={values.name} />
                <ReviewRow
                  label="Category"
                  value={categories.find((c) => c.id === values.categoryId)?.name ?? "-"}
                />
                <ReviewRow label="Short description" value={values.shortDescription} />
                <ReviewRow label="Files" value={`${values.assets?.length ?? 0} deliverable(s)`} />
                <div>
                  <p className="text-muted-foreground text-xs">Pricing</p>
                  <div className="mt-1 space-y-1">
                    {values.pricingTiers?.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>{tier.name}</span>
                        <span className="tabular-nums">
                          {formatMoney(parsePriceToCents(tier.price || "0"))}
                          {tier.interval && tier.interval !== "ONE_TIME"
                            ? ` / ${tier.interval.toLowerCase()}`
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg border p-4 text-xs">
                  Publishing sends the product live immediately. Saving as draft keeps it private
                  until you publish it from the products list.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        {step === "review" ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => submit("DRAFT")} disabled={pending}>
              Save draft
            </Button>
            <Button type="button" onClick={() => submit("PUBLISHED")} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish product
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={next}>
            Continue
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </Form>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function FeaturesEditor({ index, form }: { index: number; form: any }) {
  const [draft, setDraft] = useState("");
  const features: string[] = form.watch(`pricingTiers.${index}.features`) ?? [];

  return (
    <div className="space-y-2">
      <FormLabel className="text-xs">Features</FormLabel>
      <div className="flex flex-wrap gap-1.5">
        {features.map((feature, i) => (
          <Badge
            key={`${feature}-${i}`}
            variant="secondary"
            className="cursor-pointer"
            onClick={() =>
              form.setValue(
                `pricingTiers.${index}.features`,
                features.filter((_, fi) => fi !== i),
              )
            }
          >
            {feature} ✕
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a feature and press Enter"
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              form.setValue(`pricingTiers.${index}.features`, [...features, draft.trim()]);
              setDraft("");
            }
          }}
        />
      </div>
    </div>
  );
}

function KeywordsEditor({ form }: { form: any }) {
  const [draft, setDraft] = useState("");
  const keywords: string[] = form.watch("seoKeywords") ?? [];
  return (
    <div className="space-y-2">
      <FormLabel>Keywords</FormLabel>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <Badge
            key={`${kw}-${i}`}
            variant="secondary"
            className="cursor-pointer"
            onClick={() =>
              form.setValue(
                "seoKeywords",
                keywords.filter((_: string, ki: number) => ki !== i),
              )
            }
          >
            {kw} ✕
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a keyword and press Enter"
        className="h-8"
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            form.setValue("seoKeywords", [...keywords, draft.trim()]);
            setDraft("");
          }
        }}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { PreferencesForm } from "@/components/PreferencesForm";

export default function FormPage({ params }: { params: { code: string; slot: string } }) {
  const slot = Number(params.slot);
  if (![1, 2, 3].includes(slot)) notFound();
  return <PreferencesForm code={params.code.toUpperCase()} slot={slot} />;
}

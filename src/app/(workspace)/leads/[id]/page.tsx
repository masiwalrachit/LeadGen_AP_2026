import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ArrowLeft, Globe } from "lucide-react";
import { sourceHost } from "@/lib/format";
import { getRecord } from "@/features/demo/data";
import { LeadEvidence } from "@/components/evidence/lead-evidence";
import { DemoStrip, QualificationStamp } from "@/components/ui/status";
import styles from "./lead.module.css";

export async function generateMetadata({ params }: PageProps<"/leads/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getRecord(id)?.businessName ?? "Lead not found" };
}

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const record = getRecord(id);
  if (!record) notFound();

  return (
    <>
      <header className={styles.header}>
        <Link className={styles.back} href="/leads">
          <ArrowLeft size={16} aria-hidden="true" />
          All leads
        </Link>
        <div className={styles.titleRow}>
          <ViewTransition name={`lead-${record.id}`}>
            <h1>{record.businessName}</h1>
          </ViewTransition>
          <QualificationStamp qualified={record.qualified} />
          <DemoStrip />
        </div>
        <p className={styles.meta}>
          <span>{record.industry} · {record.location}</span>
          {record.website ? (
            <a href={record.website} target="_blank" rel="noreferrer">
              <Globe size={15} aria-hidden="true" />
              {sourceHost(record.website)}
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
          ) : (
            <span>No website</span>
          )}
        </p>
      </header>
      <LeadEvidence record={record} />
    </>
  );
}

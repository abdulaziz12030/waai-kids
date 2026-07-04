"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import styles from "../../components/MultiplicationAdventure.module.css";

type Stage = { table_number: number; status: "locked" | "available" | "completed"; best_score: number };
type Program = {
  id: string;
  from_table: number;
  to_table: number;
  questions_per_stage: number;
  pass_percentage: number;
  status: "active" | "completed";
  current_table: number;
  completed_tables: number;
  total_tables: number;
  due_date: string | null;
  achievement_points: number;
  reward_points: number;
  stages: Stage[];
};

export default function ChildMultiplicationProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const token = localStorage.getItem("namaa_child_token");
      if (!token) {
        router.replace("/child/login");
        return;
      }
      const result = await supabase.rpc("get_child_multiplication_programs", { p_session_token: token });
      if (result.error) {
        if (result.error.message.includes("جلسة")) {
          localStorage.removeItem("namaa_child_token");
          router.replace("/child/login");
          return;
        }
        setError("تعذر تحميل مغامرات جدول الضرب الآن.");
      } else {
        setPrograms((result.data || []) as Program[]);
      }
      setLoading(false);
    }
    void load();
  }, [router]);

  const completed = useMemo(() => programs.filter((program) => program.status === "completed").length, [programs]);

  if (loading) return <main className={styles.loading}>جارٍ تجهيز مغامرة جدول الضرب...</main>;

  return (
    <main className={styles.childPage}>
      <section className={styles.childHero}>
        <div><span className={styles.eyebrow}>مساحتي التعليمية</span><h1>مغامرة جدول الضرب ✖️</h1><p>تأمل البطاقة، ثم ابدأ التحدي وافتح الجداول واحدًا بعد الآخر.</p></div>
        <div className={styles.childHeroMetric}><strong>{completed}</strong><span>مغامرات مكتملة</span></div>
      </section>

      {error && <p className={styles.errorMessage}>{error}</p>}
      {programs.length === 0 ? (
        <section className={styles.emptyState}><span>🧮</span><h3>لا توجد مغامرة مسندة بعد</h3><p>عندما يسند ولي الأمر أو المعلم برنامجًا ستجده هنا.</p><Link className={styles.secondaryButton} href="/child?section=tasks">العودة إلى مهامي</Link></section>
      ) : (
        <section className={styles.childProgramGrid}>
          {programs.map((program) => {
            const progress = Math.round((program.completed_tables / program.total_tables) * 100);
            return (
              <Link className={styles.childProgramCard} href={`/child/multiplication/${program.id}`} key={program.id}>
                <div className={styles.childProgramTop}><span>{program.status === "completed" ? "🏆" : "✖️"}</span><span>{program.status === "completed" ? "مكتملة" : `جدول ${program.current_table}`}</span></div>
                <h2>الجداول من {program.from_table} إلى {program.to_table}</h2>
                <p>{program.questions_per_stage} أسئلة في المرحلة · النجاح من {program.pass_percentage}٪</p>
                <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
                <div className={styles.progressCopy}><strong>{program.completed_tables} من {program.total_tables}</strong><span>{progress}٪</span></div>
                <div className={styles.stageStrip}>{program.stages.map((stage) => <span key={stage.table_number} className={stage.status === "completed" ? styles.stageDone : stage.status === "available" ? styles.stageCurrent : styles.stageLocked}>{stage.status === "completed" ? "✓" : stage.table_number}</span>)}</div>
                <div className={styles.continueButton}>{program.status === "completed" ? "عرض الإنجاز" : "متابعة المغامرة"}</div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./TaskRecognitionPanel.module.css";

type RecognitionTask = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  approved_at: string | null;
  achievement_points: number;
  reward_points: number;
  gift_count: number;
  last_gift_id: string | null;
  last_gift_title: string | null;
  last_gifted_at: string | null;
};

type RecognitionData = {
  student_id: string;
  tasks: RecognitionTask[];
};

const categoryLabels: Record<string, string> = {
  behavior: "سلوكية",
  educational: "تعليمية",
  quran: "قرآن",
  home: "منزلية",
  other: "أخرى"
};

const dateFormat = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" });

function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : "غير محدد";
}

export default function TaskRecognitionPanel({ studentId }: { studentId: string }) {
  const [data, setData] = useState<RecognitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      setLoading(true);
      setError("");
      const result = await supabase.rpc("get_parent_task_recognition_status", {
        p_student_id: studentId
      });
      if (result.error || !result.data) {
        setError("تعذر تحميل مهام التكريم الآن.");
        setLoading(false);
        return;
      }
      setData(result.data as RecognitionData);
      setLoading(false);
    }

    void load();
  }, [studentId]);

  if (loading) {
    return <section className={styles.panel}><div className={styles.empty}>جارٍ تجهيز مهام التكريم...</div></section>;
  }

  if (error) {
    return <section className={styles.panel}><p className={styles.error}>{error}</p></section>;
  }

  const tasks = data?.tasks || [];
  const pendingRecognition = tasks.filter((task) => task.gift_count < 1).length;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <span>التكريم المرتبط بالمهمة</span>
          <h2>كرّم الطفل بعد اعتماد الإنجاز</h2>
          <p>كل مهمة اعتمدتها تظهر هنا، ويمكن اختيار هدية مرتبطة بالمهمة نفسها لتصل إلى الطفل باسم الإنجاز الصحيح.</p>
        </div>
        <strong className={styles.count}>{pendingRecognition}</strong>
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>لا توجد مهام معتمدة بعد. عندما يضغط الطفل «تم الإنجاز» وتعتمد المهمة، ستظهر هنا مباشرة.</div>
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => {
            const gifted = task.gift_count > 0;
            return (
              <article className={styles.card} key={task.id}>
                <div className={styles.top}>
                  <div>
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                  </div>
                  <span className={styles.status}>{gifted ? "تم التكريم" : "جاهزة للتكريم"}</span>
                </div>

                <div className={styles.meta}>
                  <span>{categoryLabels[task.category] || task.category}</span>
                  <span>اعتمدت: {formatDate(task.approved_at)}</span>
                  <span>{task.achievement_points} ⭐</span>
                  <span>{task.reward_points} 💎</span>
                  {gifted && <span className={styles.gifted}>هدايا مرتبطة: {task.gift_count}</span>}
                </div>

                <div className={styles.actions}>
                  <Link className={styles.primary} href={`/children/${studentId}/gifts?task=${task.id}`}>
                    {gifted ? "🎁 إهداء إضافي" : "🎁 تكريم وإهداء"}
                  </Link>
                  {gifted && (
                    <Link className={styles.secondary} href={`/children/${studentId}/gifts`}>
                      عرض سجل الهدايا
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

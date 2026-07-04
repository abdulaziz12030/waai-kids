"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import MultiplicationAssignmentPanel from "../../components/MultiplicationAssignmentPanel";
import styles from "../../components/MultiplicationAdventure.module.css";
import TeacherWorkspaceNav from "../TeacherWorkspaceNav";

type TeacherStudent = { student_id: string; student_name: string; family_name: string };

export default function TeacherMultiplicationPage() {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const result = await supabase.rpc("get_teacher_students");
      if (result.error) setError("تعذر تحميل الطلاب المرتبطين بحساب المعلم.");
      else {
        const next = (result.data || []) as TeacherStudent[];
        setStudents(next);
        setSelectedId(next[0]?.student_id || "");
      }
      setLoading(false);
    }
    void load();
  }, []);

  const selected = students.find((student) => student.student_id === selectedId);

  return (
    <main className="teacher-dashboard-page teacher-role-theme teacher-page-shell">
      <header className="dashboard-header role-aware-header teacher-role-header">
        <Link className="brand" href="/"><span className="brand-mark">و</span><span>واعي كيدز</span></Link>
        <Link className="quiet-button" href="/teacher">لوحة المعلم</Link>
      </header>
      <TeacherWorkspaceNav />
      <section className="teacher-hero teacher-dashboard-hero"><div className="teacher-hero-content"><span className="section-label">البرامج التعليمية</span><h1>إسناد مغامرة جدول الضرب</h1><p>اختر طالبًا مرتبطًا بك، ثم حدد الجداول ونسبة الإتقان.</p></div></section>
      {loading ? <section className={styles.emptyState}>جارٍ تحميل الطلاب...</section> : error ? <p className={styles.errorMessage}>{error}</p> : students.length === 0 ? <section className={styles.emptyState}><span>👥</span><h3>لا يوجد طلاب مرتبطون</h3><p>اربط طالبًا أولًا من خلال رمز المعلم.</p></section> : <><div className={styles.teacherStudentPicker}>{students.map((student) => <button key={student.student_id} type="button" data-active={selectedId === student.student_id} onClick={() => setSelectedId(student.student_id)}>{student.student_name} · {student.family_name}</button>)}</div>{selected && <MultiplicationAssignmentPanel key={selected.student_id} studentId={selected.student_id} studentName={selected.student_name} />}</>}
    </main>
  );
}

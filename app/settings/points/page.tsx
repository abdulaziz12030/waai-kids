"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PointRule = {
  id: string;
  category: string;
  difficulty: string;
  achievement_points: number;
  reward_points: number;
  is_active: boolean;
};

const categoryLabels: Record<string, string> = {
  behavior: "🌟 السلوك",
  educational: "📚 التعليم",
  quran: "📖 القرآن",
  home: "🏠 المنزل",
  other: "✨ أخرى"
};

const difficultyLabels: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  major: "إنجاز كبير"
};

export default function PointSettingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<PointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRules() {
    const client = supabase;
    if (!client) return;

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

    const result = await client.rpc("get_family_point_rules");
    if (result.error) {
      setError("تعذر تحميل سياسات النقاط الآن.");
    } else {
      setRules(result.data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRules();
  }, []);

  const groupedRules = useMemo(() => {
    return Object.entries(categoryLabels).map(([category, label]) => ({
      category,
      label,
      items: rules.filter((rule) => rule.category === category)
    }));
  }, [rules]);

  function updateLocal(category: string, difficulty: string, field: "achievement_points" | "reward_points", value: string) {
    const numberValue = Math.max(0, Number(value || 0));
    setRules((current) => current.map((rule) =>
      rule.category === category && rule.difficulty === difficulty
        ? { ...rule, [field]: numberValue }
        : rule
    ));
  }

  async function saveRule(rule: PointRule) {
    const client = supabase;
    if (!client) return;

    const key = `${rule.category}-${rule.difficulty}`;
    setSavingKey(key);
    setError("");
    setSuccess("");

    const result = await client.rpc("update_family_point_rule", {
      p_category: rule.category,
      p_difficulty: rule.difficulty,
      p_achievement_points: rule.achievement_points,
      p_reward_points: rule.reward_points
    });

    setSavingKey("");

    if (result.error) {
      setError("تعذر حفظ القاعدة. حاول مرة أخرى.");
      return;
    }

    setSuccess(`تم حفظ قاعدة ${categoryLabels[rule.category]} - ${difficultyLabels[rule.difficulty]}.`);
  }

  if (loading) return <main className="dashboard-loading">جارٍ تحميل سياسات النقاط...</main>;

  return (
    <main className="points-settings-page">
      <header className="dashboard-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">ن</span><span>نماء</span></Link>
        <Link className="quiet-button link-submit" href="/dashboard">لوحة الأسرة</Link>
      </header>

      <section className="points-settings-hero">
        <div>
          <span className="section-label">محرك النقاط V2</span>
          <h1>سياسات نقاط الأسرة</h1>
          <p>حدد القواعد مرة واحدة، وسيقترح نماء النقاط تلقائيًا عند إنشاء أي مهمة.</p>
        </div>
        <div className="points-explainer">
          <article><span>⭐</span><strong>نقاط الإنجاز</strong><p>ترفع مستوى الطفل ورتبته.</p></article>
          <article><span>💎</span><strong>نقاط المكافآت</strong><p>تستخدم للأهداف والجوائز.</p></article>
        </div>
      </section>

      {error && <p className="form-message error-message">{error}</p>}
      {success && <p className="form-message success-message">{success}</p>}

      <section className="point-rules-grid">
        {groupedRules.map((group) => (
          <article className="point-rule-category" key={group.category}>
            <div className="point-rule-category-head">
              <h2>{group.label}</h2>
              <span>{group.items.length} مستويات</span>
            </div>

            <div className="point-rule-list">
              {group.items.map((rule) => {
                const key = `${rule.category}-${rule.difficulty}`;
                return (
                  <div className="point-rule-row" key={rule.id}>
                    <div className="rule-difficulty">
                      <strong>{difficultyLabels[rule.difficulty]}</strong>
                      <small>{rule.difficulty === "easy" ? "مهمة خفيفة" : rule.difficulty === "medium" ? "مهمة معتادة" : rule.difficulty === "hard" ? "مهمة تحتاج جهدًا" : "إنجاز استثنائي"}</small>
                    </div>

                    <label>
                      <span>⭐ الإنجاز</span>
                      <input type="number" min="0" value={rule.achievement_points} onChange={(event) => updateLocal(rule.category, rule.difficulty, "achievement_points", event.target.value)} />
                    </label>

                    <label>
                      <span>💎 المكافآت</span>
                      <input type="number" min="0" value={rule.reward_points} onChange={(event) => updateLocal(rule.category, rule.difficulty, "reward_points", event.target.value)} />
                    </label>

                    <button type="button" disabled={savingKey === key} onClick={() => saveRule(rule)}>
                      {savingKey === key ? "جارٍ الحفظ..." : "حفظ"}
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className="levels-preview">
        <div><span className="section-label">مستويات الطفل</span><h2>تتغير تلقائيًا حسب نقاط الإنجاز</h2></div>
        <div className="levels-grid">
          <article><span>🥉</span><strong>مبتدئ</strong><small>0 - 100</small></article>
          <article><span>🥈</span><strong>مجتهد</strong><small>101 - 300</small></article>
          <article><span>🥇</span><strong>متميز</strong><small>301 - 700</small></article>
          <article><span>🏆</span><strong>بطل نماء</strong><small>701+</small></article>
        </div>
      </section>
    </main>
  );
}

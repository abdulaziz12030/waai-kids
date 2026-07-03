"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import styles from "../admin.module.css";

type Goal = {
  id:string; title:string; description:string|null; category:string; goal_type:string; status:string;
  progress:number; due_date:string|null; created_at:string; student_name:string; organization_name:string;
  task_count:number; quran_plan_count:number; is_orphan_quran:boolean;
};
type Data = { admin:{role:string}; metrics:{total:number;active:number;requested:number;completed:number;orphan_quran:number}; goals:Goal[] };

const statuses:Record<string,string>={requested:"طلب جديد",pending:"بانتظار الموافقة",approved:"معتمد",active:"نشط",paused:"متوقف مؤقتًا",completed:"مكتمل",rejected:"مرفوض"};
const types:Record<string,string>={educational:"تعليمي",behavioral:"سلوكي",financial:"مالي",material:"مادي"};
const dateFmt=new Intl.DateTimeFormat("ar-SA",{dateStyle:"medium"});
const showDate=(value:string|null)=>value?dateFmt.format(new Date(value)):"غير محدد";

function friendly(message:string){
  if(message.includes("SUPER_ADMIN_REQUIRED"))return"الحذف النهائي متاح للـSuper Admin فقط.";
  if(message.includes("ADMIN_GOAL_WRITE_DENIED"))return"التعديل متاح للـSuper Admin ومدير العمليات فقط.";
  if(message.includes("CONFIRMATION_MISMATCH"))return"عنوان الهدف المكتوب غير مطابق.";
  if(message.includes("GOAL_NOT_FOUND"))return"الهدف غير موجود أو سبق حذفه.";
  return"تعذر تنفيذ العملية الآن.";
}

export default function AdminGoalsPage(){
  const router=useRouter();
  const[data,setData]=useState<Data|null>(null),[search,setSearch]=useState(""),[status,setStatus]=useState("all");
  const[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[success,setSuccess]=useState("");

  async function load(q=search,s=status){
    if(!supabase)return;
    setLoading(true);setError("");
    const session=await supabase.auth.getSession();
    if(!session.data.session){router.replace("/login?type=family");return}
    const result=await supabase.rpc("get_admin_goals_dashboard",{p_search:q.trim(),p_status:s,p_limit:500});
    if(result.error||!result.data){
      if(result.error?.message.includes("ADMIN_ACCESS_DENIED"))router.replace("/dashboard");
      else setError("تعذر تحميل الأهداف الآن.");
      setLoading(false);return;
    }
    setData(result.data as Data);setLoading(false);
  }

  useEffect(()=>{void load("","all")},[]);

  async function editGoal(goal:Goal){
    if(!supabase)return;
    const title=window.prompt("عنوان الهدف:",goal.title);if(title===null)return;
    const description=window.prompt("وصف الهدف:",goal.description||"");if(description===null)return;
    const goalType=window.prompt("نوع الهدف: educational أو behavioral أو financial أو material",goal.goal_type);if(!goalType||!types[goalType])return setError("نوع الهدف غير صحيح.");
    const nextStatus=window.prompt("الحالة: requested أو pending أو approved أو active أو paused أو completed أو rejected",goal.status);if(!nextStatus||!statuses[nextStatus])return setError("حالة الهدف غير صحيحة.");
    const progressText=window.prompt("نسبة التقدم من 0 إلى 100:",String(goal.progress||0));if(progressText===null)return;
    const progress=Math.max(0,Math.min(100,Number(progressText||0)));if(!Number.isFinite(progress))return setError("نسبة التقدم غير صحيحة.");
    const dueDate=window.prompt("تاريخ الاستحقاق بصيغة YYYY-MM-DD، أو اتركه فارغًا:",goal.due_date||"");if(dueDate===null)return;
    const reason=window.prompt("سبب التعديل:","تعديل إداري للهدف")||"تعديل إداري";

    setBusy(`edit-${goal.id}`);setError("");setSuccess("");
    const result=await supabase.rpc("admin_update_goal",{p_goal_id:goal.id,p_title:title.trim(),p_description:description.trim(),p_goal_type:goalType,p_status:nextStatus,p_progress:progress,p_due_date:dueDate||null,p_reason:reason});
    setBusy("");
    if(result.error)return setError(friendly(result.error.message));
    setSuccess(`تم تحديث هدف «${title.trim()}».`);await load();
  }

  async function removeGoal(goal:Goal){
    if(!supabase)return;
    const linked=`المهام: ${goal.task_count}، خطط الحفظ: ${goal.quran_plan_count}`;
    if(!window.confirm(`سيتم حذف هدف «${goal.title}» نهائيًا مع البيانات المرتبطة (${linked}). لا يمكن التراجع. متابعة؟`))return;
    const confirmation=window.prompt(`اكتب عنوان الهدف حرفيًا:\n${goal.title}`,"");
    if(confirmation!==goal.title)return setError("لم يتم الحذف لأن العنوان غير مطابق.");
    const reason=window.prompt("سبب الحذف:",goal.is_orphan_quran?"تنظيف هدف يتيم بعد حذف خطة الحفظ":"حذف إداري")||"حذف إداري";
    setBusy(`delete-${goal.id}`);setError("");setSuccess("");
    const result=await supabase.rpc("admin_delete_goal_completely",{p_goal_id:goal.id,p_confirmation:confirmation,p_reason:reason});
    setBusy("");
    if(result.error)return setError(friendly(result.error.message));
    setSuccess(`تم حذف هدف «${goal.title}» وبياناته المرتبطة.`);await load();
  }

  function submit(event:FormEvent){event.preventDefault();void load(search,status)}

  if(loading&&!data)return <main className={styles.shell}><div className={styles.loading}>جارٍ تحميل الأهداف...</div></main>;
  if(!data)return <main className={styles.shell}><div className={styles.loading}>{error||"تعذر فتح إدارة الأهداف."}</div></main>;

  const cards=[["🎯",data.metrics.total,"كل الأهداف"],["🚀",data.metrics.active,"نشطة"],["⏳",data.metrics.requested,"بانتظار القرار"],["✅",data.metrics.completed,"مكتملة"],["⚠️",data.metrics.orphan_quran,"أهداف حفظ يتيمة"]];
  const canEdit=["super_admin","operations_admin"].includes(data.admin.role),canDelete=data.admin.role==="super_admin";

  return <main className={styles.shell}><div className={styles.console}>
    <header className={styles.topbar}><div className={styles.identity}><span className={styles.brandMark}>و</span><div><h1>إدارة الأهداف</h1><p>تحكم مركزي في أهداف جميع الأطفال</p></div></div><div className={styles.topActions}><Link className={styles.secondaryButton} href="/admin">لوحة الآدمين</Link><Link className={styles.secondaryButton} href="/admin/accounts">الحسابات</Link></div></header>
    <section className={styles.hero}><div><span>صلاحية: {data.admin.role}</span><h2>الأهداف والربط بالمهام والحفظ</h2><p>راجع الهدف والطفل والجهة، وعدّل الحالة والتقدم، أو احذف الهدف وبياناته المرتبطة بصلاحية Super Admin.</p></div></section>
    <section className={styles.metrics}>{cards.map(([icon,value,label])=><article className={styles.metric} key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>
    <div className={styles.warningBox}><strong>تم إصلاح الربط:</strong> حذف خطة الحفظ المرتبطة بهدف قرآني يحذف الهدف التابع لها تلقائيًا، ولن يبقى هدف يتيم في صفحة الطفل.</div>
    <form className={styles.toolbar} onSubmit={submit}><input className={styles.searchInput} value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالهدف أو الطفل أو الأسرة"/><select className={styles.select} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">كل الحالات</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><button className={styles.primaryButton}>بحث وتحديث</button></form>
    {error&&<p className={styles.error}>{error}</p>}{success&&<p className={styles.success}>{success}</p>}
    <section className={styles.section}><div className={styles.sectionHead}><div><h3>الأهداف المسجلة</h3><p>تظهر المهام وخطط الحفظ المرتبطة بكل هدف.</p></div><span className={styles.countBadge}>{data.goals.length}</span></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الهدف</th><th>الطفل والجهة</th><th>النوع</th><th>الحالة</th><th>التقدم</th><th>الربط</th><th>الإجراءات</th></tr></thead><tbody>{data.goals.map(goal=><tr key={goal.id} className={goal.is_orphan_quran?styles.deletedRow:""}>
        <td className={styles.mainCell}><strong>{goal.title}</strong><small>{goal.description||"لا يوجد وصف"}</small><small>أُنشئ: {showDate(goal.created_at)}</small></td>
        <td className={styles.mainCell}><strong>{goal.student_name}</strong><small>{goal.organization_name}</small></td>
        <td><span className={styles.accountBadge}>{types[goal.goal_type]||goal.goal_type}</span>{goal.category==="quran"&&<span className={styles.protectedBadge}>قرآن</span>}{goal.is_orphan_quran&&<span className={`${styles.status} ${styles.statusDeleted}`}>هدف يتيم</span>}</td>
        <td><span className={styles.status}>{statuses[goal.status]||goal.status}</span><small className={styles.reasonText}>الاستحقاق: {showDate(goal.due_date)}</small></td>
        <td><strong>{goal.progress}%</strong></td>
        <td className={styles.detailsCell}><span>مهام: {goal.task_count}</span><span>خطط حفظ: {goal.quran_plan_count}</span></td>
        <td><div className={styles.rowActions}><button className={styles.primaryButton} type="button" disabled={!canEdit||busy===`edit-${goal.id}`} onClick={()=>void editGoal(goal)}>تعديل</button><button className={styles.dangerButton} type="button" disabled={!canDelete||busy===`delete-${goal.id}`} onClick={()=>void removeGoal(goal)}>{busy===`delete-${goal.id}`?"جارٍ الحذف...":"حذف نهائي"}</button></div></td>
      </tr>)}</tbody></table></div>{data.goals.length===0&&<div className={styles.empty}>لا توجد أهداف حاليًا.</div>}</section>
  </div></main>;
}

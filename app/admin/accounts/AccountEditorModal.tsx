"use client";

import { FormEvent } from "react";
import styles from "../admin.module.css";

export type PrimaryAccountType = "family" | "teacher" | "incomplete";
export type AccountStatus = "active" | "suspended" | "deleted";
export type PlatformAdminRole = "none" | "viewer" | "support_admin" | "operations_admin" | "super_admin";

export type AccountEditorTarget = {
  id: string;
  email: string | null;
  full_name: string | null;
  primary_account_type: PrimaryAccountType;
  students_count: number;
};

export type AccountEditForm = {
  fullName: string;
  organizationName: string;
  accountType: PrimaryAccountType;
  accountStatus: AccountStatus;
  teacherAccessEnabled: boolean;
  platformAdminRole: PlatformAdminRole;
  newPassword: string;
  confirmPassword: string;
  reason: string;
  confirmationEmail: string;
};

type Props = {
  target: AccountEditorTarget;
  form: AccountEditForm;
  busy: boolean;
  onChange: <K extends keyof AccountEditForm>(key: K, value: AccountEditForm[K]) => void;
  onGeneratePassword: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AccountEditorModal({ target, form, busy, onChange, onGeneratePassword, onClose, onSubmit }: Props) {
  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <section className={styles.accountEditorModal} onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="account-editor-title">
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.sectionLabel}>تحكم Super Admin</span>
            <h2 id="account-editor-title">إدارة حساب {target.full_name || target.email}</h2>
            <p>{target.email}</p>
          </div>
          <button className={styles.modalClose} type="button" onClick={onClose} aria-label="إغلاق">×</button>
        </header>

        <form className={styles.accountEditorForm} onSubmit={onSubmit}>
          <div className={styles.formGrid}>
            <label><span>الاسم الكامل</span><input value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)} required /></label>
            <label><span>اسم الأسرة أو الجهة</span><input value={form.organizationName} onChange={(event) => onChange("organizationName", event.target.value)} disabled={form.accountType === "incomplete"} required={form.accountType !== "incomplete"} /></label>

            <label><span>نوع الحساب الأساسي</span><select value={form.accountType} onChange={(event) => onChange("accountType", event.target.value as PrimaryAccountType)}><option value="family">ولي أمر</option><option value="teacher">معلم</option><option value="incomplete">غير مكتمل / بلا دور</option></select></label>
            <label><span>حالة الحساب</span><select value={form.accountStatus} onChange={(event) => onChange("accountStatus", event.target.value as AccountStatus)}><option value="active">نشط</option><option value="suspended">موقوف مؤقتًا</option><option value="deleted">محذوف من الاستخدام</option></select></label>

            <label><span>دور الآدمين</span><select value={form.platformAdminRole} onChange={(event) => onChange("platformAdminRole", event.target.value as PlatformAdminRole)}><option value="none">ليس آدمين</option><option value="viewer">مشاهد</option><option value="support_admin">دعم فني</option><option value="operations_admin">مدير عمليات</option><option value="super_admin">Super Admin</option></select></label>
            <label className={styles.checkboxField}><input type="checkbox" checked={form.teacherAccessEnabled} disabled={form.accountType !== "teacher" || form.accountStatus !== "active"} onChange={(event) => onChange("teacherAccessEnabled", event.target.checked)} /><span>تمكين أدوات المعلم والتسميع</span></label>

            <label><span>كلمة مرور جديدة</span><input type="text" value={form.newPassword} onChange={(event) => onChange("newPassword", event.target.value)} placeholder="اتركها فارغة للإبقاء على الحالية" autoComplete="new-password" /></label>
            <label><span>تأكيد كلمة المرور</span><input type="text" value={form.confirmPassword} onChange={(event) => onChange("confirmPassword", event.target.value)} placeholder="أعد كتابة الكلمة الجديدة" autoComplete="new-password" /></label>

            <div className={styles.passwordTools}><button className={styles.secondaryButton} type="button" onClick={onGeneratePassword}>توليد كلمة مؤقتة قوية</button><small>لا يمكن عرض كلمة المرور الحالية لأنها محفوظة بصورة مشفرة.</small></div>
            <label className={styles.fullField}><span>سبب التعديل</span><textarea value={form.reason} onChange={(event) => onChange("reason", event.target.value)} rows={3} required /></label>
            <label className={styles.fullField}><span>تأكيد البريد الإلكتروني</span><input type="email" value={form.confirmationEmail} onChange={(event) => onChange("confirmationEmail", event.target.value)} placeholder={target.email || ""} required /><small>اكتب البريد كاملًا قبل حفظ أي تغيير حساس.</small></label>
          </div>

          {target.students_count > 0 && form.accountType !== target.primary_account_type && <p className={styles.editorWarning}>هذا الحساب يملك {target.students_count} طفلًا أو طالبًا، ولن يسمح النظام بتغيير نوعه قبل معالجة البيانات المرتبطة.</p>}

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>إلغاء</button>
            <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ جميع التعديلات"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

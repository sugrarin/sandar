"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, X, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { AccentButton } from "@/components/AccentButton";
import { ProfileUser } from "@/components/ProfileUser";
import { StudentStatsView } from "@/components/StudentStatsView";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { ShareAccess } from "@/types";

interface SharedAccessProps {
  onClose: () => void;
  initialCode?: string;
  viewStudentId?: string;
}

type Tab = "student" | "parent";

export function SharedAccess({
  onClose,
  initialCode,
  viewStudentId,
}: SharedAccessProps) {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>(initialCode ? "parent" : "student");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState(initialCode || "");
  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState<ShareAccess[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(
    viewStudentId || null,
  );

  // Fetch share code and viewers when student tab is active
  useEffect(() => {
    if (tab === "student") {
      fetchShareCode();
      fetchViewers();
    } else {
      fetchStudents();
    }
  }, [tab]);

  // Auto-activate code if provided
  useEffect(() => {
    if (initialCode && tab === "parent") {
      setInputCode(initialCode);
      handleActivateCode(initialCode);
    }
  }, [initialCode]);

  // Auto-select student if viewStudentId is provided
  useEffect(() => {
    if (viewStudentId) {
      setSelectedStudent(viewStudentId);
      setTab("parent");
    }
  }, [viewStudentId]);

  const fetchShareCode = async () => {
    try {
      const res = await fetch("/api/share/code");
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
      }
    } catch (err) {
      console.error("Failed to fetch share code:", err);
    }
  };

  const fetchViewers = async () => {
    try {
      const res = await fetch("/api/share/access");
      const data = await res.json();
      if (data.access) {
        setViewers(data.access);
      }
    } catch (err) {
      console.error("Failed to fetch viewers:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/share/viewed");
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/share?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivateCode = async (codeToActivate?: string) => {
    const codeValue = codeToActivate || inputCode;
    if (!codeValue) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/share/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeValue }),
      });
      const data = await res.json();

      if (res.ok) {
        setInputCode("");
        fetchStudents();
      } else {
        setError(t("share.invalidCode"));
      }
    } catch (err) {
      setError(t("share.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    if (!confirm(t("share.revokeConfirm"))) return;

    try {
      const res = await fetch("/api/share/revoke", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessId }),
      });
      if (res.ok) {
        fetchViewers();
      }
    } catch (err) {
      console.error("Failed to revoke access:", err);
    }
  };

  const handleUnlinkStudent = async (accessId: string) => {
    if (!confirm(t("share.unlinkConfirm"))) return;

    try {
      const res = await fetch("/api/share/viewed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessId }),
      });
      if (res.ok) {
        fetchStudents();
      }
    } catch (err) {
      console.error("Failed to unlink student:", err);
    }
  };

  const handleViewStudent = (studentId: string) => {
    setSelectedStudent(studentId);
  };

  const handleCloseStudentView = () => {
    setSelectedStudent(null);
  };

  // If a student is selected for viewing, show their stats
  if (selectedStudent) {
    return (
      <section className="screen screen--active">
        <header className="profile-header">
          <button
            type="button"
            className="icon-button"
            onClick={handleCloseStudentView}
            aria-label={t("profile.back")}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <p className="hero__eyebrow">{t("profile.title")}</p>
        </header>
        <StudentStatsView
          studentId={selectedStudent}
          activatedAt={
            students.find((s) => s.student_id === selectedStudent)?.activated_at
          }
          onUnlink={(accessId: string) => {
            handleUnlinkStudent(accessId);
            setSelectedStudent(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className="screen screen--active">
      <header className="profile-header">
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t("profile.back")}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <p className="hero__eyebrow">{t("share.title")}</p>
      </header>

      <SegmentedControl
        items={[
          { value: "student", label: t("share.studentTab") },
          { value: "parent", label: t("share.parentTab") },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Share access tabs"
      />

      {tab === "student" ? (
        <>
          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("share.studentTitle")}</h2>
          </div>
          <p className="panel__description">{t("share.studentDescription")}</p>

          <div className="panel panel--soft">
            <div className="share-code-display">
              <span className="share-code">{code}</span>
              <AccentButton onClick={handleCopyLink} disabled={!code}>
                <Copy size={16} />
                <span>
                  {copied ? t("share.codeCopied") : t("share.copyLink")}
                </span>
              </AccentButton>
            </div>
          </div>

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">
              {viewers.length > 0
                ? t("share.viewersTitle")
                : t("share.noViewers")}
            </h2>
          </div>

          {viewers.map((viewer) => (
            <ProfileUser
              key={viewer.id}
              avatarUrl={viewer.viewer_avatar_url}
              displayName={viewer.viewer_display_name}
              email={viewer.viewer_email}
              date={viewer.activated_at}
              action={
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => handleRevokeAccess(viewer.id)}
                  title={t("share.revokeAccess")}
                >
                  <X size={16} />
                </button>
              }
            />
          ))}
        </>
      ) : (
        <>
          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("share.parentTitle")}</h2>
          </div>
          <p className="panel__description">{t("share.parentDescription")}</p>

          <div className="panel panel--soft">
            <div className="share-code-input">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder={t("share.enterCode")}
                maxLength={8}
                disabled={loading}
                className="text-input"
              />
              <AccentButton
                onClick={() => handleActivateCode()}
                disabled={!inputCode || loading}
              >
                <Plus size={16} />
                <span>{t("share.add")}</span>
              </AccentButton>
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">
              {students.length > 0
                ? t("share.linkedStudents")
                : t("share.noStudents")}
            </h2>
          </div>

          {students.map((student) => (
            <ProfileUser
              key={student.id}
              avatarUrl={student.student_avatar_url}
              displayName={student.student_display_name}
              email={student.student_email}
              date={student.activated_at}
              onClick={() => handleViewStudent(student.student_id)}
              action={<ChevronRight size={16} />}
            />
          ))}
        </>
      )}
    </section>
  );
}

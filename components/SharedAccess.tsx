"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, X, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { ProfileUser } from "@/components/ProfileUser";
import { StudentStatsView } from "@/components/StudentStatsView";
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
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [timer, setTimer] = useState<number | null>(null);
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
      fetchRateLimit();
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

  // Timer countdown for rate limit
  useEffect(() => {
    if (timer !== null && timer > 0) {
      const interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

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

  const fetchRateLimit = async () => {
    try {
      const res = await fetch("/api/share/rate-limit");
      const data = await res.json();
      setRateLimit(data);

      if (data.locked_until) {
        const lockedUntil = new Date(data.locked_until);
        const now = new Date();
        const diff = Math.floor((lockedUntil.getTime() - now.getTime()) / 1000);
        if (diff > 0) {
          setTimer(diff);
        }
      }
    } catch (err) {
      console.error("Failed to fetch rate limit:", err);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/share?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
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
        fetchRateLimit();
      } else if (
        data.error === "locked_minute" ||
        data.error === "locked_day"
      ) {
        const lockedUntil = new Date(data.locked_until);
        const now = new Date();
        const diff = Math.floor((lockedUntil.getTime() - now.getTime()) / 1000);
        setTimer(diff);
        setError(
          data.error === "locked_day"
            ? t("share.lockedDay")
            : t("share.lockedMinute"),
        );
      } else if (
        data.error === "invalid_code" &&
        rateLimit?.failed_attempts >= 2
      ) {
        setError(t("share.rateLimitWarning"));
      } else {
        setError(t("share.invalidCode"));
        fetchRateLimit();
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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

      <div
        className="difficulty-picker difficulty-picker--plain"
        role="tablist"
        aria-label="Share access tabs"
      >
        <button
          type="button"
          className={`difficulty-picker__option${
            tab === "student" ? " difficulty-picker__option--active" : ""
          }`}
          onClick={() => setTab("student")}
          role="tab"
          aria-selected={tab === "student"}
        >
          <span className="difficulty-picker__label">
            {t("share.studentTab")}
          </span>
        </button>
        <button
          type="button"
          className={`difficulty-picker__option${
            tab === "parent" ? " difficulty-picker__option--active" : ""
          }`}
          onClick={() => setTab("parent")}
          role="tab"
          aria-selected={tab === "parent"}
        >
          <span className="difficulty-picker__label">
            {t("share.parentTab")}
          </span>
        </button>
      </div>

      {tab === "student" ? (
        <>
          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">{t("share.studentTitle")}</h2>
          </div>
          <p className="panel__description">{t("share.studentDescription")}</p>

          <div className="panel panel--soft">
            <div className="share-code-display">
              <span className="share-code">{code}</span>
              <button
                type="button"
                className="action-button action-button--small"
                onClick={handleCopyLink}
                disabled={!code}
              >
                <Copy size={16} />
                <span>
                  {copied ? t("share.codeCopied") : t("share.copyLink")}
                </span>
              </button>
            </div>
          </div>

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">
              {viewers.length > 0 ? t("share.noViewers") : t("share.noViewers")}
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
                disabled={timer !== null || loading}
                className="text-input"
              />
              <button
                type="button"
                className="action-button action-button--small"
                onClick={() => handleActivateCode()}
                disabled={!inputCode || timer !== null || loading}
              >
                <Plus size={16} />
                <span>{t("share.add")}</span>
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            {timer !== null && (
              <p className="timer-message">{formatTimer(timer)}</p>
            )}
          </div>

          <div className="panel__header panel__header--tight">
            <h2 className="panel__title">
              {students.length > 0
                ? "Привязанные ученики"
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

"use client";

import { useEffect, useState, useContext } from "react";
import { Copy, X, ChevronRight, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/lib/translations";
import { AccentButton } from "@/components/AccentButton";
import { ProfileUser } from "@/components/ProfileUser";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Skeleton } from "@/components/Skeleton";
import { NavigationContext } from "@/contexts/NavigationContext";
import type { ShareAccess } from "@/types";

interface SharedAccessProps {
  onClose?: () => void;
  initialCode?: string;
}

type Tab = "student" | "parent";

export function SharedAccess({
  onClose,
  initialCode: initialCodeProp,
}: SharedAccessProps = {}) {
  const t = useTranslations();
  const nav = useContext(NavigationContext);
  const searchParams = useSearchParams();
  const initialCode =
    initialCodeProp ?? (searchParams.get("code") || undefined);

  const [tab, setTab] = useState<Tab>(initialCode ? "parent" : "student");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState(initialCode || "");
  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState<ShareAccess[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(true);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [error, setError] = useState("");

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

  const fetchShareCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await fetch("/api/share/code");
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
      }
    } catch (err) {
      console.error("Failed to fetch share code:", err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const fetchViewers = async () => {
    setIsLoadingConnections(true);
    try {
      const res = await fetch("/api/share/access");
      const data = await res.json();
      if (data.access) {
        setViewers(data.access);
      }
    } catch (err) {
      console.error("Failed to fetch viewers:", err);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const res = await fetch("/api/share/viewed");
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setIsLoadingStudents(false);
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
    const student = students.find((s) => s.student_id === studentId);
    nav?.push({
      name: "studentStats",
      params: {
        studentId,
        activatedAt: student?.activated_at,
      },
    });
  };

  return (
    <>
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
              {isGeneratingCode ? (
                <Skeleton
                  width="8ch"
                  height="1.5rem"
                  radius="var(--radius-button)"
                />
              ) : (
                <span className="share-code">{code}</span>
              )}
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
              {isLoadingConnections
                ? t("share.viewersTitle")
                : viewers.length > 0
                  ? t("share.viewersTitle")
                  : t("share.noViewers")}
            </h2>
          </div>

          {isLoadingConnections
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="panel panel--soft profile-user">
                  <Skeleton circle width="3.4rem" />
                  <div
                    className="profile-user__info"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    <Skeleton width="70%" height="1rem" />
                    <Skeleton width="50%" height="0.85rem" />
                    <Skeleton width="40%" height="0.8rem" />
                  </div>
                </div>
              ))
            : viewers.map((viewer) => (
                <ProfileUser
                  key={viewer.id}
                  avatarUrl={viewer.viewer_avatar_url}
                  displayName={viewer.viewer_display_name}
                  email={viewer.viewer_email}
                  date={viewer.activated_at}
                  dateLabel={t("share.accessSince")}
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
              {isLoadingStudents
                ? t("share.linkedStudents")
                : students.length > 0
                  ? t("share.linkedStudents")
                  : t("share.noStudents")}
            </h2>
          </div>

          {isLoadingStudents
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="panel panel--soft profile-user">
                  <Skeleton circle width="3.4rem" />
                  <div
                    className="profile-user__info"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    <Skeleton width="70%" height="1rem" />
                    <Skeleton width="50%" height="0.85rem" />
                    <Skeleton width="40%" height="0.8rem" />
                  </div>
                  <div className="profile-user__action">
                    <Skeleton circle width="2.35rem" />
                  </div>
                </div>
              ))
            : students.map((student) => (
                <ProfileUser
                  key={student.id}
                  avatarUrl={student.student_avatar_url}
                  displayName={student.student_display_name}
                  email={student.student_email}
                  date={student.activated_at}
                  dateLabel={t("share.accessSince")}
                  onClick={() => handleViewStudent(student.student_id)}
                  action={<ChevronRight size={16} />}
                />
              ))}
        </>
      )}
    </>
  );
}

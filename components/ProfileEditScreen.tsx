"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/lib/translations";
import { useStatsStore } from "@/stores/statsStore";

interface ProfileEditScreenProps {
  onClose: () => void;
}

export function ProfileEditScreen({ onClose }: ProfileEditScreenProps) {
  const t = useTranslations();
  const user = useStatsStore((s) => s.user);
  const updateProfile = useStatsStore((s) => s.updateProfile);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with store updates
  useEffect(() => {
    setDisplayName(user?.displayName || "");
    setAvatarUrl(user?.avatarUrl || "");
  }, [user?.displayName, user?.avatarUrl]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t("profile.avatarTypeError") || "Only images allowed");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(t("profile.avatarSizeError") || "Max 2MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await updateProfile({
      displayName: displayName.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
    });

    setSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Save failed");
    }
  };

  const email = user?.email ?? "";
  const initials = (displayName || email || "?").slice(0, 2).toUpperCase();

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
        <p className="hero__eyebrow">{t("profile.editProfile")}</p>
      </header>

      <div className="profile-edit">
        {/* Avatar Section */}
        <div className="profile-edit__avatar-section">
          <button
            type="button"
            className="profile-edit__avatar"
            onClick={handleAvatarClick}
            disabled={uploading}
            aria-label={t("profile.uploadAvatar")}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="profile-edit__avatar-img"
              />
            ) : (
              <span className="profile-edit__avatar-initials">{initials}</span>
            )}
            <div className="profile-edit__avatar-overlay">
              <Upload size={20} />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="profile-edit__file-input"
            aria-hidden="true"
          />
          <p className="profile-edit__avatar-hint">
            {uploading ? "..." : t("profile.uploadAvatar")}
          </p>
        </div>

        {/* Form Fields */}
        <div className="profile-edit__fields">
          <div className="profile-edit__field">
            <label htmlFor="displayName" className="profile-edit__label">
              {t("profile.displayName")}
            </label>
            <input
              id="displayName"
              type="text"
              className="profile-edit__input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("profile.displayName")}
              maxLength={50}
            />
          </div>

          <div className="profile-edit__field">
            <label htmlFor="email" className="profile-edit__label">
              {t("profile.email")}
            </label>
            <input
              id="email"
              type="email"
              className="profile-edit__input profile-edit__input--readonly"
              value={email}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="profile-edit__error">{error}</p>}

        {/* Actions */}
        <div className="profile-edit__actions">
          <button
            type="button"
            className="action-button action-button--secondary"
            onClick={onClose}
            disabled={saving}
          >
            <span className="action-button__label">{t("profile.cancel")}</span>
          </button>
          <button
            type="button"
            className="action-button"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            <span className="action-button__label">
              {saving ? t("profile.saving") : t("profile.save")}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

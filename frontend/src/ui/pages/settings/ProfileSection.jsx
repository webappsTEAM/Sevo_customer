import { useState, useRef, useEffect } from "react"
import { Save, Camera, User, Globe, Languages, Phone, Link as LinkIcon, Loader2 } from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"
import { Input, Select, TextArea } from "../../components/kit.jsx"
import { resolveImageUrl } from "../../../utils/imageUrl.js"

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Vancouver", "America/Sao_Paulo", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Colombo", "Asia/Dhaka", "Asia/Bangkok",
  "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Asia/Seoul",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
]

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
  { value: "hi", label: "हिन्दी" },
  { value: "ta", label: "தமிழ்" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
]

export default function ProfileSection({ markDirty, showToast, Field, SectionHeader }) {
  const { user, refreshMe, updateUser } = useAuth()
  const fileRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    timezone: "UTC",
    language: "en",
  })

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || user.firstName || "",
        last_name: user.last_name || user.lastName || "",
        email: user.email || "",
        phone: user.phone || user.mobile_number || "",
        timezone: user.timezone || "UTC",
        language: user.language || "en",
      })
      const photo = user.avatar_url || user.avatar || null
      setAvatarPreview(photo)
      setImgError(false)
    }
  }, [user])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    markDirty()
  }

  const handleAvatarChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast("Avatar must be under 5 MB.", "error")
      return
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file)
    setAvatarFile(file)
    setAvatarPreview(previewUrl)
    setImgError(false)
    setUploadingAvatar(true)

    // Upload immediately
    try {
      const body = new FormData()
      body.append("avatar", file)
      const res = await apiRequest("/auth/profile/", { method: "PATCH", body })
      const updatedUser = res?.data || res?.user
      if (updatedUser?.avatar_url) {
        setAvatarPreview(updatedUser.avatar_url)
      }
      if (updateUser && updatedUser?.username) {
        updateUser(updatedUser)
      } else if (refreshMe) {
        await refreshMe()
      }
      showToast("Profile photo updated successfully.")
      setAvatarFile(null)
    } catch (err) {
      setAvatarPreview(user?.avatar_url || user?.avatar || null)
      showToast(err?.body?.message || err?.message || "Failed to save profile picture.", "error")
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    try {
      const res = await apiRequest("/auth/profile/", {
        method: "PATCH",
        json: { avatar: null, remove_avatar: true }
      })
      const updatedUser = res?.data || res?.user
      setAvatarPreview(null)
      setAvatarFile(null)
      setImgError(false)
      if (updateUser && updatedUser?.username) {
        updateUser(updatedUser)
      } else if (refreshMe) {
        await refreshMe()
      }
      showToast("Profile photo removed successfully.")
    } catch (err) {
      showToast(err?.body?.message || err?.message || "Failed to remove profile picture.", "error")
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) body.append(k, v)
      })
      if (avatarFile) body.append("avatar", avatarFile)

      const res = await apiRequest("/auth/profile/", { method: "PATCH", body })
      const updatedUser = res?.data || res?.user
      if (updateUser && updatedUser?.username) {
        updateUser(updatedUser)
      } else if (refreshMe) {
        await refreshMe()
      }
      showToast("Profile saved successfully.")
      setIsEditing(false)
      setAvatarFile(null)
    } catch (err) {
      showToast(err?.body?.message || err?.message || "Failed to save profile.", "error")
    } finally {
      setSaving(false)
    }
  }

  const initials = `${form.first_name?.[0] || ""}${form.last_name?.[0] || ""}`.toUpperCase() || (user?.username?.[0] || "U").toUpperCase()

  return (
    <div className="stPanel">
      <SectionHeader title="Profile" subtitle="Your name, avatar, and personal details visible across the workspace." />

      {/* Avatar */}
      <div className="stCard">
        <div className="flex items-center gap-5">
          <div style={{ position: "relative" }}>
            <div
              className="stIdentityAvatar"
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                fontSize: 26,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {avatarPreview && !imgError ? (
                <img
                  src={resolveImageUrl(avatarPreview)}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={() => setImgError(true)}
                />
              ) : (
                initials
              )}
              {uploadingAvatar && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                  }}
                >
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              title="Upload new photo"
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#1A56DB",
                color: "#fff",
                border: "2.5px solid #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: uploadingAvatar ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              }}
            >
              <Camera size={12} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)" }}>
              {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : user?.username}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {user?.role === "admin"
                ? "Administrator"
                : user?.role === "manager"
                ? "Manager"
                : user?.role === "support" || user?.isCareAgent
                ? "Support"
                : user?.role === "customer"
                ? "Customer"
                : user?.role || "Staff"} · {user?.email}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileRef.current?.click()}
                style={{
                  fontSize: 12,
                  color: "#1A56DB",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: uploadingAvatar ? "not-allowed" : "pointer",
                  padding: 0,
                }}
              >
                Change photo
              </button>
              {(avatarPreview || user?.avatar_url || user?.avatar) && (
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={handleRemoveAvatar}
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                    cursor: uploadingAvatar ? "not-allowed" : "pointer",
                    padding: 0,
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Name & Basic Info */}
      <div className="stCard">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Personal Information</div>
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                // Cancel: restore original values
                setForm(prev => ({
                  ...prev,
                  first_name: user?.first_name || user?.firstName || "",
                  last_name: user?.last_name || user?.lastName || "",
                  email: user?.email || "",
                  phone: user?.phone || user?.mobile_number || "",
                }))
              }
              setIsEditing(!isEditing)
            }}
            style={{
              fontSize: 12,
              color: isEditing ? "#E94560" : "#5d5fef",
              fontWeight: 700,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
        <div className="stFormGrid">
          <Input
            label="First name"
            value={form.first_name}
            placeholder="First name"
            onChange={e => handleChange("first_name", e.target.value)}
            readOnly={!isEditing}
            style={!isEditing ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
          />
          <Input
            label="Last name"
            value={form.last_name}
            placeholder="Last name"
            onChange={e => handleChange("last_name", e.target.value)}
            readOnly={!isEditing}
            style={!isEditing ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
          />
          <Input
            label="Phone number"
            value={form.phone}
            placeholder="+1 (555) 000-0000"
            onChange={e => handleChange("phone", e.target.value)}
            readOnly={!isEditing}
            style={!isEditing ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
          />
          <Input
            label="Email address"
            value={user?.email || ""}
            readOnly
            style={{ opacity: 0.6 }}
            title="To change your email, go to Account & Security"
          />
        </div>
        {isEditing && (
          <div className="stCardActions">
            <button className="stPrimaryBtn" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={13} />}
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        )}
      </div>

      {/* Locale */}
      <div className="stCard">
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 16 }}>Locale & Language</div>
        <div className="stFormGrid">
          <Select
            label="Timezone"
            value={form.timezone}
            onChange={e => handleChange("timezone", e.target.value)}
            options={TIMEZONES.map(tz => ({ label: tz.replace(/_/g, " "), value: tz }))}
          />
          <Select
            label="Language"
            value={form.language}
            onChange={e => handleChange("language", e.target.value)}
            options={LANGUAGES}
          />
        </div>
        <div className="stCardActions">
          <button className="stPrimaryBtn" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={13} />}
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  )
}

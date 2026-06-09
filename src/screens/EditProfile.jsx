import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Loader2, Check } from 'lucide-react'
import { Button, Field, FileUpload, Card, Stagger, Item } from '../components/ui'
import { TopBar } from '../components/nav'
import { ErrorMsg } from './Auth'
import { useAuth } from '../lib/AuthContext'
import { uploadFile, upsertProfile } from '../lib/db'

const moverDocs = [
  { key: 'driving_license_url', label: 'Driving License', prefix: 'license' },
  { key: 'cnic_front_url', label: 'CNIC — Front Side', prefix: 'cnic-front' },
  { key: 'cnic_back_url', label: 'CNIC — Back Side', prefix: 'cnic-back' },
  { key: 'police_clearance_url', label: 'Police Clearance Certificate', prefix: 'police' },
]

export default function EditProfile() {
  const nav = useNavigate()
  const { user, profile, loading, refreshProfile } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [avatar, setAvatar] = useState(null)
  const [docs, setDocs] = useState({}) // key -> new File
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
  }, [profile])

  if (!loading && !user) return <Navigate to="/login" replace />
  const isMover = profile?.role === 'mover'

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setSaved(false)
    if (!form.full_name.trim()) return setErr('Full name is required.')
    setBusy(true)
    try {
      const update = {
        id: user.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      }
      if (avatar) update.avatar_url = await uploadFile('avatars', user.id, avatar, 'avatar')
      if (isMover) {
        for (const d of moverDocs) {
          if (docs[d.key]) update[d.key] = await uploadFile('mover-docs', user.id, docs[d.key], d.prefix)
        }
      }
      await upsertProfile(update)
      await refreshProfile()
      setAvatar(null)
      setDocs({})
      setSaved(true)
    } catch (e2) {
      setErr(e2.message || 'Could not save profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Edit Profile" back />
      <Stagger className="space-y-4 px-5 pb-8">
        <Item>
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-3.5">
              <div className="flex flex-col items-center pb-2">
                <img
                  src={
                    avatar
                      ? URL.createObjectURL(avatar)
                      : profile?.avatar_url || 'https://i.pravatar.cc/120?img=47'
                  }
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow"
                  alt=""
                />
              </div>
              <FileUpload label="Profile Photo" value={avatar} onChange={setAvatar} hint="JPG or PNG" />
              <Field label="Full Name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
              <Field label="Email Address" value={profile?.email || ''} disabled placeholder="—" />
              <Field label="Phone Number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+92 300 0000000" />

              {isMover && (
                <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Documents (re-upload to replace)</p>
                  {moverDocs.map((d) => (
                    <FileUpload
                      key={d.key}
                      label={d.label}
                      accept={d.key === 'police_clearance_url' ? 'image/*,application/pdf' : 'image/*'}
                      value={docs[d.key] || null}
                      onChange={(f) => setDocs((p) => ({ ...p, [d.key]: f }))}
                      hint={profile?.[d.key] ? 'Uploaded' : 'Not uploaded'}
                    />
                  ))}
                </div>
              )}

              <ErrorMsg>{err}</ErrorMsg>
              {saved && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-600">
                  <Check className="h-4 w-4" /> Profile saved.
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="ghost" onClick={() => nav(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </Item>
      </Stagger>
    </div>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, login, signup, logout, resetPassword, subscribeProfile, upsertProfile, getAdminEmails } from '$backend'

const AuthContext = createContext()
export function useAuth() { return useContext(AuthContext) }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub = null
    const authUnsub = onAuthStateChanged((user) => {
      setCurrentUser(user)
      setLoading(false)
      if (profileUnsub) { profileUnsub(); profileUnsub = null }
      if (user) {
        profileUnsub = subscribeProfile(user.uid, (profile) => {
          if (profile) {
            setUserProfile(profile)
          } else {
            const p = { uid: user.uid, email: user.email, name: user.displayName || user.email, role: 'user', createdAt: new Date().toISOString() }
            upsertProfile(user.uid, p).catch(() => {})
            setUserProfile(p)
          }
        })
      } else {
        setUserProfile(null)
      }
    })
    return () => { authUnsub(); if (profileUnsub) profileUnsub() }
  }, [])

  const adminEmails = getAdminEmails()
  const isAdmin = adminEmails.includes(currentUser?.email) || userProfile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isAdmin, login, signup, logout, resetPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

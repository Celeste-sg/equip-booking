import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      email,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
    })
    return result
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  function logout() {
    return signOut(auth)
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  function listenToProfile(uid, delay = 0) {
    const timer = setTimeout(() => {
      const unsub = onSnapshot(
        doc(db, 'users', uid),
        (snap) => { if (snap.exists()) setUserProfile(snap.data()) },
        (err) => {
          console.warn('Profile error, retrying in 2s:', err.message)
          unsub()
          listenToProfile(uid, 2000)
        }
      )
    }, delay)
    return timer
  }

  useEffect(() => {
    let timer = null
    const authUnsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
      if (timer) clearTimeout(timer)
      if (user) {
        timer = listenToProfile(user.uid, 800)
      } else {
        setUserProfile(null)
      }
    })
    return () => { authUnsub(); if (timer) clearTimeout(timer) }
  }, [])

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  const isAdmin = adminEmails.includes(currentUser?.email) || userProfile?.role === 'admin'

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    signup,
    login,
    logout,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

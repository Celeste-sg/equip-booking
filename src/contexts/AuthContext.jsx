import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
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

  async function fetchProfile(uid) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          setUserProfile(snap.data())
          return
        }
      } catch (err) {
        console.warn(`Profile fetch attempt ${attempt + 1} failed:`, err.message)
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500))
      }
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
      if (user) {
        fetchProfile(user.uid)
      } else {
        setUserProfile(null)
      }
    })
    return unsub
  }, [])

  const value = {
    currentUser,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
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

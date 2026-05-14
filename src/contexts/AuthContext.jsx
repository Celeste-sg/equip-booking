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

  useEffect(() => {
    let profileUnsub = null

    const authUnsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false) // show UI immediately, don't wait for profile

      if (profileUnsub) { profileUnsub(); profileUnsub = null }

      if (user) {
        // listen in real-time so role changes reflect instantly
        profileUnsub = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => { if (snap.exists()) setUserProfile(snap.data()) },
          (err) => console.warn('Profile listen error:', err.message)
        )
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      authUnsub()
      if (profileUnsub) profileUnsub()
    }
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

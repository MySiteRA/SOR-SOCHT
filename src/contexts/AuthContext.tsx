import React, { createContext, useContext, useState, ReactNode } from 'react'

interface Student {
  id: string
  name: string
  class_id: string
  redirect_url: string | null
}

interface AuthContextType {
  selectedClass: string | null
  selectedStudent: Student | null
  isAuthenticated: boolean
  setSelectedClass: (classId: string | null) => void
  setSelectedStudent: (student: Student | null) => void
  setAuthenticated: (auth: boolean) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isAuthenticated, setAuthenticated] = useState(false)

  const logout = () => {
    setSelectedClass(null)
    setSelectedStudent(null)
    setAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        selectedClass,
        selectedStudent,
        isAuthenticated,
        setSelectedClass,
        setSelectedStudent,
        setAuthenticated,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
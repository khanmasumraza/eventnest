import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

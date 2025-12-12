'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Calendar, Users, TrendingUp, DollarSign, Clock, Award, Bell, Settings,
  Search, User, BarChart3, PieChart, Home, UserCheck, Scissors,
  ShoppingBag, FileText, LogOut, Menu, Package, Gift
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkUser()

    // Verifica se é desktop e abre sidebar
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (desktop && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }

    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  const checkUser = () => {
    const profissionalData = localStorage.getItem('profissional')
    if (!profissionalData) {
      router.push('/login')
    } else {
      const loginData = JSON.parse(profissionalData)
      setUser(loginData.profissional)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('profissional')
    router.push('/login')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: Home, path: '/dashboard' },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar, path: '/dashboard/agendamentos' },
    { id: 'clientes', label: 'Clientes', icon: Users, path: '/dashboard/clientes' },
    { id: 'servicos', label: 'Serviços', icon: Scissors, path: '/dashboard/servicos' },
    { id: 'produtos', label: 'Produtos', icon: Package, path: '/dashboard/produtos' },
    { id: 'planos', label: 'Planos', icon: Gift, path: '/dashboard/planos' },
    { id: 'profissionais', label: 'Profissionais', icon: UserCheck, path: '/dashboard/profissionais' },
    { id: 'vendas', label: 'Vendas', icon: ShoppingBag, path: '/dashboard/vendas' },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, path: '/dashboard/relatorios' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, path: '/dashboard/configuracoes' }
  ]

  const getActiveMenu = () => {
    if (pathname === '/dashboard') return 'dashboard'
    return pathname.split('/').pop() || 'dashboard'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-zinc-900/95 backdrop-blur-xl border-r border-red-900/30 transition-all duration-300 z-50 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-16 -translate-x-full lg:translate-x-0'
      } lg:${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-transparent flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg">JRato</h1>
                <p className="text-red-500 text-sm">Barber Shop</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu com Scroll */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                router.push(item.path)
                if (!isDesktop) setSidebarOpen(false)
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                getActiveMenu() === item.id
                  ? 'bg-red-600/20 text-red-500 border border-red-600/30'
                  : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 flex-shrink-0 border-t border-zinc-800">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.nome || 'Admin'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center justify-center space-x-1 text-zinc-400 hover:text-white text-xs transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        {/* Top Header */}
        <header className="bg-zinc-900/50 backdrop-blur-xl border-b border-red-900/30 sticky top-0 z-40">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 lg:space-x-4 flex-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/dashboard/clientes?search=${encodeURIComponent(searchQuery)}`)
                      }
                    }}
                    className="pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-600 focus:border-transparent w-full text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 lg:space-x-4">
                <div className="hidden md:block text-xs lg:text-sm text-zinc-400">
                  {new Date().toLocaleDateString('pt-PT', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })} • {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="hidden sm:flex items-center space-x-1 text-zinc-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs lg:text-sm">Online</span>
                </div>
                <div className="relative">
                  <Bell className="w-5 h-5 text-zinc-400 hover:text-white cursor-pointer transition-colors" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
          {children}
        </main>
      </div>
    </div>
  )
}
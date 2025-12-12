'use client'

import { useState } from 'react'
import { loginProfissional } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const loginData = await loginProfissional(email, password)

      if (!loginData) {
        setError('Email ou senha incorretos')
      } else {
        // Salvar dados do profissional no localStorage para usar no dashboard
        localStorage.setItem('profissional', JSON.stringify(loginData))
        router.push('/dashboard')
      }
    } catch {
      setError('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-900/30 p-6 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-transparent flex items-center justify-center mb-4">
              <img src="/logo.jpg" alt="JRato Barber Shop" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">JRATO BARBER SHOP</h1>
            <p className="text-red-500 text-xs sm:text-sm font-medium">PORTUGAL</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all duration-200"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-400 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:from-zinc-600 disabled:to-zinc-700 text-white text-sm sm:text-base font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <Link href="/register" className="text-red-500 hover:text-red-400 text-xs sm:text-sm transition-colors">
              Não tem uma conta? Cadastre-se
            </Link>
          </div>

          <div className="mt-3 sm:mt-4 text-center">
            <p className="text-zinc-500 text-xs">
              Dashboard administrativo • JRato Barber Shop
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
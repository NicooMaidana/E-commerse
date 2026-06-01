import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

export default function AdminLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      toast.error('Credenciales incorrectas')
      setLoading(false)
    } else {
      navigate('/admin/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0904] flex items-center justify-center px-4">
      <Helmet>
        <title>Ingresar | Alta GULA Admin</title>
      </Helmet>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
            rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
            <Lock size={22} className="text-orange-400" />
          </div>
          <div className="text-3xl font-black leading-none">
            <span className="text-orange-500">Alta</span>
            <span className="text-yellow-400">GULA</span>
          </div>
          <p className="text-stone-600 text-xs mt-1.5 font-black uppercase tracking-widest">
            Panel de administración
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@ejemplo.com"
              className={inputClass}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black
              py-3 rounded-xl text-sm uppercase tracking-widest transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelClass = 'block text-[11px] font-black text-stone-500 uppercase tracking-widest'
const inputClass =
  'w-full bg-[#251608] border border-orange-900/25 rounded-xl px-4 py-2.5 ' +
  'text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50 text-sm'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './AuthModal.css'
import { getTranslation, type Language } from '../lib/translations'

interface AuthModalProps {
    onClose: () => void
    onSuccess: () => void
    language: Language
}

export function AuthModal({ onClose, onSuccess, language }: AuthModalProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const t = getTranslation(language);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password
                })
                if (error) throw error
            }
            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal">
                <button className="close-btn" onClick={onClose}>&times;</button>
                <h2>{isLogin ? t.login_title : t.signup_title}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t.email_label}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t.password_label}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? t.processing : (isLogin ? t.login_title : t.signup_title)}
                    </button>
                </form>

                <p className="toggle-mode">
                    {isLogin ? t.no_account : t.have_account}
                    <span onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? t.signup_title : t.login_title}
                    </span>
                </p>
            </div>
        </div>
    )
}
